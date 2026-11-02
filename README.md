# Gold Desk Journal

A trading journal for gold (XAUUSD), FX pairs and crypto. You plan each day, log every trade before, during and after it, and review your results each week and month. All numbers are in R (1R = the amount you risked), so different markets and position sizes compare fairly.

| Part | What it is | Hosted on |
|---|---|---|
| `frontend/` | The journal itself, a single static page (HTML/CSS/JS) with Supabase sign-in | **Vercel** |
| `backend/` | Node + Express API. It checks the signed-in user, reads and writes the journal, and runs the optional AI coach | **Render** |
| `supabase/` | Postgres tables, with Row Level Security so each user only sees their own data | **Supabase** |

```
Browser ──(Supabase login)──► Supabase Auth
   │
   └──(Bearer token)──► Render API ──(same token, RLS)──► Supabase Postgres
                              └──► Anthropic API (weekly coach, optional)
```

## Features

- **Dashboard:** today's routine checklist and warnings when you hit a daily limit. Net R and $, win rate, expectancy, profit factor, max drawdown, rule adherence, cost of mistakes and streaks. An equity curve, results split by market, setup, session (East Africa Time), weekday, direction, emotional state and symbol, and automatic insights.
- **Trade log:** works out position size for gold (100 oz per lot), USD-quoted FX pairs and crypto, plus planned R:R. A pre-trade checklist gives a GO or NO TRADE verdict. Extra fields for each market, screenshot links, an A+ to F process grade, mistake tags, and a place to log missed setups.
- **Daily:** a morning plan (news, context, a watchlist with if/then plans, limits, emotional state) and an evening recap that pulls in the day's trades automatically.
- **Weekly:** stats compared with last week, breakdown tables, cost of mistakes, trades to replay, review questions and one focus rule for next week. Includes an AI coach.
- **Monthly:** a calendar of green and red days, this month against last month, week-by-week results, and keep / pause / drop / scale flags.
- **Setup:** your starting balance, risk %, limits, setups, mistake tags, checklist and symbols.
- Export all trades to CSV.

---

## Deploy

Do the steps in this order. Each step needs a value from the one before it.

### 1. Supabase (database and login)

1. Create a project at [supabase.com](https://supabase.com). Pick a region close to you and save the database password somewhere safe.
2. Go to **SQL Editor → New query**, paste in all of `supabase/schema.sql` and click **Run**.
3. Go to **Project Settings → API** and copy:
   - **Project URL**, which is your `SUPABASE_URL`
   - the **anon public** key, which is your `SUPABASE_ANON_KEY`. Never use the `service_role` key anywhere in this project.
4. Go to **Authentication → Providers → Email** and make sure Email is turned on. You'll set the Site URL in step 4.

### 2. Render (backend API)

1. Go to [render.com](https://render.com) → **New → Blueprint** and connect this GitHub repo. Render reads `render.yaml`.
2. Fill in the environment variables:
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY` from step 1
   - `FRONTEND_ORIGIN`: put `http://localhost:5173` for now and replace it in step 4
   - `ANTHROPIC_API_KEY` (optional): turns on the AI weekly coach. Get a key at console.anthropic.com.
3. Deploy, then open `https://<your-service>.onrender.com/health`. It should show `{"ok":true}`. That address without `/health` is your `API_URL`.

> The free Render plan sleeps after about 15 minutes idle, so the first request after that takes 30–60 seconds. If that happens the journal shows a **Retry** button.

### 3. Vercel (frontend)

1. Go to [vercel.com](https://vercel.com) → **Add New → Project** and import this repo.
2. Set **Root Directory** to `frontend`. The build settings come from `frontend/vercel.json`.
3. Add these environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `API_URL` (your Render address, with no slash at the end).
4. Deploy. Your site is at something like `https://gold-desk-journal.vercel.app`.

### 4. Connect them

1. **Render → Environment:** set `FRONTEND_ORIGIN` to your Vercel URL, then save so Render redeploys.
2. **Supabase → Authentication → URL Configuration:** set **Site URL** to your Vercel URL and add it under **Redirect URLs**. Confirmation and password-reset emails link back there.
3. Open the site, create an account, confirm your email, then fill in the **Setup** page first.

---

## Run it locally

```bash
# backend
cd backend && cp .env.example .env   # fill in values; FRONTEND_ORIGIN can stay as-is for localhost
npm install && npm run dev            # http://localhost:8080

# frontend (another terminal)
cd frontend && cp config.local.example.js config.local.js   # fill in values
npm run dev                           # http://localhost:5173
```

## Security notes

- The Supabase **anon** key is meant to be public. Your data is protected by Row Level Security, and the API runs every query with the signed-in user's own token.
- The API only accepts requests from `FRONTEND_ORIGIN`, limits how often it can be called, and limits the coach to 20 runs per user per hour.
- `ANTHROPIC_API_KEY` stays on the server and is never sent to the browser.
