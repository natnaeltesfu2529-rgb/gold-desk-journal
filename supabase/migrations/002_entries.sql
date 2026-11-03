-- 002: generic per-user entries — playbook setups, lessons, habits, study logs.
-- Each entry is (kind, id) → jsonb data, owner-only via Row Level Security.
create table if not exists public.entries (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  kind       text        not null check (kind in ('playbook','lesson','habit','study')),
  id         text        not null,
  data       jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);

alter table public.entries enable row level security;

drop policy if exists "owner select" on public.entries;
drop policy if exists "owner insert" on public.entries;
drop policy if exists "owner update" on public.entries;
drop policy if exists "owner delete" on public.entries;
create policy "owner select" on public.entries for select using ((select auth.uid()) = user_id);
create policy "owner insert" on public.entries for insert with check ((select auth.uid()) = user_id);
create policy "owner update" on public.entries for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "owner delete" on public.entries for delete using ((select auth.uid()) = user_id);
