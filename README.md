# Gold Desk Journal

A trading journal for gold (XAUUSD), FX pairs and crypto. You plan each day, log every trade before, during and after it, and review your results each week and month. All numbers are in R (1R = the amount you risked), so different markets and position sizes compare fairly.

| Part | What it is | Hosted on |
|---|---|---|
| `frontend/` | The journal pages (HTML/CSS/JS) with sign-in | **Render**, in one web service |
| `backend/` | Node + Express. It serves the site and the API, and runs the optional AI coach | **Render**, the same service |
| `supabase/` | Postgres tables and user accounts, with Row Level Security so each user only sees their own data | **Supabase** (free) |

```
Browser ──► Render web service  ──(user's token, RLS)──►  Supabase Postgres
   │          ├─ /           journal site                      ▲
   │          ├─ /api/*      journal API                       │
   │          └─ /api/coach  ──► Anthropic API (optional)      │
   └──────────(sign in / sign up)──────────────► Supabase Auth ┘
```

## Features

- **Dashboard:** today's routine checklist and warnings when you hit a daily limit. Net R and $, win rate, expectancy, profit factor, max drawdown, rule adherence, cost of mistakes and streaks. An equity curve, results split by market, setup, session (East Africa Time), weekday, direction, emotional state and symbol, and automatic insights.
- **Trade log:** works out position size for gold (100 oz per lot), USD-quoted FX pairs and crypto, plus planned R:R. A pre-trade checklist gives a GO or NO TRADE verdict. Extra fields for each market, screenshot links, an A+ to F process grade, mistake tags, and a place to log missed setups.
- **Daily:** a morning plan (news, context, a watchlist with if/then plans, limits, emotional state) and an evening recap that pulls in the day's trades automatically.
- **Weekly:** stats compared with last week, breakdown tables, cost of mistakes, trades to replay, review questions and one focus rule for next week. Includes an AI coach.
- **Monthly:** a calendar of green and red days, this month against last month, week-by-week results, and keep / pause / drop / scale flags.
- **Setup:** your starting balance, risk %, limits, setups, mistake tags, checklist and symbols.
- Export all trades to CSV.
- **Filters:** narrow the Dashboard and Trades pages by date range, market, symbol, setup, session, direction, outcome, grade, mistake, #tag or emotional state, or search all your notes.
- **Habits:** starter habits for your trading routine, mind & body and learning, or your own. Some tick themselves from your trades. Includes streaks, a 30-day grid, and your R on days you kept each habit compared with days you didn't.
- **Diary:** a free-writing entry for each day with title, mood and tags, all searchable, plus your results by mood.
- **Playbook:** written rules for each setup, with live stats, backtest vs live results, and the trades that used it. The rules show in the trade log when you pick that setup.
- **Lessons:** every lesson from trades, recaps, weekly reviews, study sessions and your own notes in one place, searchable and pinnable.
- **Study:** log lessons, backtests and chart reviews, with study time per week.
- **Progress:** learning-curve charts (rolling expectancy, win rate, rule adherence, mistake rate), your first trades against your latest, plus XP levels and badges.
- **Setup lists:** add, rename, reorder or remove setups, mistakes, tags and checklist items. Renames update your past trades.

---

## Deploy

### 1. Supabase (database and login)

1. Create a project at [supabase.com](https://supabase.com). Pick a region close to you and save the database password somewhere safe.
2. Go to **SQL Editor → New query**, paste in all of `supabase/schema.sql` and click **Run**. Then do the same for each file in `supabase/migrations/`, in number order.
3. Go to **Project Settings → API** and copy:
   - **Project URL**, which is your `SUPABASE_URL`
   - the **anon public** key, which is your `SUPABASE_ANON_KEY`. Never use the `service_role` key anywhere in this project.
4. Go to **Authentication → Providers → Email** and make sure Email is turned on.

### 2. Render (site and API)

1. Go to [render.com](https://render.com) → **New → Blueprint** and connect this GitHub repo. Render reads `render.yaml` and creates one web service.
2. Fill in the environment variables:
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY` from step 1
   - `ANTHROPIC_API_KEY` (optional): turns on the AI weekly coach. Get a key at console.anthropic.com.
3. Deploy. Open `https://<your-service>.onrender.com/health` and check it shows `{"ok":true}`. Then open `https://<your-service>.onrender.com`, which is your journal.

> The free Render plan sleeps after 15 minutes with no visits, so the first load after that takes about a minute.

### 3. Connect the login emails

In **Supabase → Authentication → URL Configuration**, set **Site URL** to `https://<your-service>.onrender.com` and add it under **Redirect URLs**. Confirmation and password-reset emails link back there.

Then open the site, create an account, confirm your email, and fill in the **Setup** page first.

---

## Run it locally

```bash
cd backend
cp .env.example .env        # fill in SUPABASE_URL and SUPABASE_ANON_KEY
npm install
npm run dev                 # open http://localhost:8080
```

## Security notes

- The Supabase **anon** key is meant to be public. Your data is protected by Row Level Security, and the API runs every query with the signed-in user's own token.
- The site and API share one origin, with a strict Content Security Policy and rate limits. The coach is limited to 20 runs per user per hour.
- `ANTHROPIC_API_KEY` stays on the server and is never sent to the browser.
