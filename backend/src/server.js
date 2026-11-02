import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';

const {
  PORT = 8080,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  FRONTEND_ORIGIN = '',
  ANTHROPIC_API_KEY = '',
  ANTHROPIC_MODEL = 'claude-sonnet-5-5'
} = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '512kb' }));

// CORS: only the deployed frontend (comma-separated list allowed) and localhost for development
const allowed = FRONTEND_ORIGIN.split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (allowed.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true);
    return cb(new Error('Origin not allowed'));
  },
  methods: ['GET', 'PUT', 'DELETE', 'POST', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type']
}));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: 'draft-7', legacyHeaders: false }));

app.get('/health', (_req, res) => res.json({ ok: true }));

// ---- auth: every /api route needs the Supabase access token of a signed-in user.
// Queries run with that token, so Supabase Row Level Security limits them to the user's own rows.
async function auth(req, res, next) {
  const h = req.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Sign in required' });
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: 'Session expired — sign in again' });
  req.user = data.user;
  req.sb = sb;
  next();
}
app.use('/api', auth);

const ID_RE = /^[A-Za-z0-9_\-.:]{1,120}$/;
const okId = (id) => typeof id === 'string' && ID_RE.test(id);
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const fail = (res, error, status = 500) => { console.error(error); res.status(status).json({ error: status === 500 ? 'Database error' : String(error) }); };

// collections stored as (key column → table)
const KV = {
  days: { table: 'journal_days', key: 'day', re: /^\d{4}-\d{2}-\d{2}$/ },
  weeks: { table: 'journal_weeks', key: 'week', re: /^\d{4}-W\d{2}$/ },
  months: { table: 'journal_months', key: 'month', re: /^\d{4}-\d{2}$/ }
};

// GET everything for the signed-in user in one call
app.get('/api/journal', async (req, res) => {
  const sb = req.sb;
  const [t, d, w, m, s] = await Promise.all([
    sb.from('trades').select('id,data').order('trade_date', { ascending: true }).limit(10000),
    sb.from('journal_days').select('day,data'),
    sb.from('journal_weeks').select('week,data'),
    sb.from('journal_months').select('month,data'),
    sb.from('settings').select('data').maybeSingle()
  ]);
  const err = t.error || d.error || w.error || m.error || s.error;
  if (err) return fail(res, err);
  const toMap = (rows, k) => Object.fromEntries((rows || []).map((r) => [r[k], r.data]));
  res.json({
    trades: (t.data || []).map((r) => ({ ...r.data, id: r.id })),
    days: toMap(d.data, 'day'),
    weeks: toMap(w.data, 'week'),
    months: toMap(m.data, 'month'),
    settings: s.data?.data || null
  });
});

// trades
app.put('/api/trades/:id', async (req, res) => {
  const { id } = req.params; const body = req.body;
  if (!okId(id) || !isObj(body)) return fail(res, 'Invalid trade', 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date || '')) return fail(res, 'Trade needs a date (YYYY-MM-DD)', 400);
  const data = { ...body }; delete data.id; delete data._;
  const { error } = await req.sb.from('trades').upsert({
    id, user_id: req.user.id, trade_date: body.date, data, updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,id' });
  if (error) return fail(res, error);
  res.json({ ok: true, id });
});
app.delete('/api/trades/:id', async (req, res) => {
  if (!okId(req.params.id)) return fail(res, 'Invalid id', 400);
  const { error } = await req.sb.from('trades').delete().eq('user_id', req.user.id).eq('id', req.params.id);
  if (error) return fail(res, error);
  res.json({ ok: true });
});

// days / weeks / months
app.put('/api/:col(days|weeks|months)/:key', async (req, res) => {
  const c = KV[req.params.col]; const key = req.params.key;
  if (!c.re.test(key) || !isObj(req.body)) return fail(res, 'Invalid entry', 400);
  const { error } = await req.sb.from(c.table).upsert({
    user_id: req.user.id, [c.key]: key, data: req.body, updated_at: new Date().toISOString()
  }, { onConflict: `user_id,${c.key}` });
  if (error) return fail(res, error);
  res.json({ ok: true });
});

// settings
app.put('/api/settings', async (req, res) => {
  if (!isObj(req.body)) return fail(res, 'Invalid settings', 400);
  const { error } = await req.sb.from('settings').upsert({
    user_id: req.user.id, data: req.body, updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
  if (error) return fail(res, error);
  res.json({ ok: true });
});

// AI weekly coach — optional, needs ANTHROPIC_API_KEY on the server
const coachLimit = rateLimit({ windowMs: 60 * 60_000, limit: 20, keyGenerator: (req) => req.user?.id || req.ip });
app.get('/api/coach/status', (_req, res) => res.json({ enabled: Boolean(ANTHROPIC_API_KEY) }));
app.post('/api/coach', coachLimit, async (req, res) => {
  if (!ANTHROPIC_API_KEY) return fail(res, 'The coach is not set up on the server (ANTHROPIC_API_KEY missing)', 503);
  const prompt = req.body?.prompt;
  if (typeof prompt !== 'string' || prompt.length < 20 || prompt.length > 60_000) return fail(res, 'Invalid request', 400);
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 1200, messages: [{ role: 'user', content: prompt }] })
    });
    const j = await r.json();
    if (!r.ok) { console.error('Anthropic error', r.status, j?.error?.message); return fail(res, 'The coach could not answer right now', 502); }
    const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    res.json({ text });
  } catch (e) { fail(res, e); }
});

app.use((err, _req, res, _next) => {
  if (err?.message === 'Origin not allowed') return res.status(403).json({ error: 'Origin not allowed' });
  console.error(err); res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, () => console.log(`Gold Desk Journal API on :${PORT}`));
