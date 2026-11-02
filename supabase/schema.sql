-- Gold Desk Journal — Supabase schema
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Every row belongs to one user (auth.users). Row Level Security makes sure a
-- user can only ever read or write their own rows, even with the public anon key.

create extension if not exists "pgcrypto";

-- One row per trade. The trade fields live in `data` (jsonb) so new journal
-- fields never need a migration; the columns below are the ones we filter on.
create table if not exists public.trades (
  id          text        not null,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  trade_date  date        not null,
  data        jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists trades_user_date_idx on public.trades (user_id, trade_date);

-- Daily plan + recap, keyed by date (YYYY-MM-DD)
create table if not exists public.journal_days (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  day        text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- Weekly review, keyed by ISO week (YYYY-Www)
create table if not exists public.journal_weeks (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  week       text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, week)
);

-- Monthly audit, keyed by month (YYYY-MM)
create table if not exists public.journal_months (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  month      text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);

-- Account + rules (balance, risk %, limits, tags, checklist)
create table if not exists public.settings (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row Level Security: owner-only access on every table
alter table public.trades         enable row level security;
alter table public.journal_days   enable row level security;
alter table public.journal_weeks  enable row level security;
alter table public.journal_months enable row level security;
alter table public.settings       enable row level security;

do $$
declare t text;
begin
  foreach t in array array['trades','journal_days','journal_weeks','journal_months','settings'] loop
    execute format('drop policy if exists "owner select" on public.%I', t);
    execute format('drop policy if exists "owner insert" on public.%I', t);
    execute format('drop policy if exists "owner update" on public.%I', t);
    execute format('drop policy if exists "owner delete" on public.%I', t);
    execute format('create policy "owner select" on public.%I for select using (auth.uid() = user_id)', t);
    execute format('create policy "owner insert" on public.%I for insert with check (auth.uid() = user_id)', t);
    execute format('create policy "owner update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('create policy "owner delete" on public.%I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;
