/* Gold Desk Journal — core: config, state, helpers, trade maths, filters, storage */
'use strict';

const CFG = window.GDJ_CONFIG || {};
const API = String(CFG.API_URL || '').replace(/\/$/, '');
const sb = (window.supabase && CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY)
  ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

/* ---------- defaults ---------- */
const DEF = {
  startBalance: '', currency: '$', riskPct: 1, maxTrades: 3, maxDailyLoss: 2, maxConsec: 2, maxDD: 10,
  setups: ['RBR demand retest', 'DBR demand retest', 'DBD supply retest', 'RBD supply retest', 'Flip: supply → demand', 'Flip: demand → supply'],
  mistakes: ['Entered during formation', 'Chased — no retest', 'Against HTF bias', 'Moved stop wider', 'Cut winner early', 'Oversized', 'Traded into news', 'Revenge trade', 'Over daily limit', 'Off-watchlist symbol'],
  checklist: ['HTF bias (D1/H4) agrees with my direction', 'Zone is fresh — untested since it formed', 'Price is retesting the zone, not still forming it', 'Planned R:R is at least 1:2', 'No high-impact news within 30 minutes', 'Risk is within plan and daily loss limit not hit', 'Emotional state is 3 or lower'],
  tags: ['liquidity-sweep', 'news-spike', 'london-open', 'ny-open', 'trend-continuation', 'counter-trend', 'fib-61.8', 'volume-spike'],
  symbols: { gold: 'XAUUSD', fx: 'EURUSD, GBPUSD, USDJPY, AUDUSD', crypto: 'BTCUSDT, ETHUSDT, SOLUSDT' }
};
const MARKETS = { gold: 'Gold', fx: 'FX pair', crypto: 'Crypto' };
const SESSIONS = ['Asia', 'London', 'London–NY overlap', 'New York'];
const GRADES = ['A+', 'A', 'B', 'C', 'F'];
const GOOD_GRADES = ['A+', 'A', 'B'];
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MOODS = [['5', 'Great'], ['4', 'Good'], ['3', 'Okay'], ['2', 'Low'], ['1', 'Bad']];
const LESSON_CATS = ['Execution', 'Psychology', 'Risk', 'Strategy', 'Market', 'Routine'];
const STUDY_TYPES = ['Video lesson', 'Backtest', 'Chart review', 'Reading', 'Mentor / course', 'Demo trading'];
const HABIT_CATS = { routine: 'Trading routine', mind: 'Mind & body', learning: 'Learning', custom: 'Custom' };
const HABIT_TEMPLATES = {
  routine: [
    { name: 'Pre-session plan written', type: 'check', auto: 'plan' },
    { name: 'Daily recap written', type: 'check', auto: 'recap' },
    { name: 'Every trade journaled & graded', type: 'check', auto: 'journal' },
    { name: 'Stayed within daily limits', type: 'check', auto: 'limits' },
    { name: 'No rule breaks', type: 'check', auto: 'nomistake' },
    { name: 'No revenge trading', type: 'check' }
  ],
  mind: [
    { name: 'Sleep', type: 'number', target: 7, unit: 'h' },
    { name: 'Exercise', type: 'check' },
    { name: 'Meditation / breathing', type: 'number', target: 10, unit: 'min' },
    { name: 'No trading when tired or emotional', type: 'check' }
  ],
  learning: [
    { name: 'Backtesting', type: 'number', target: 30, unit: 'min' },
    { name: 'Studied a lesson', type: 'check' },
    { name: 'Chart review / replay', type: 'check' },
    { name: 'Read my playbook before the session', type: 'check' }
  ]
};
const AUTO_LABEL = { plan: 'from Daily plan', recap: 'from Daily recap', journal: 'from your trades', limits: 'from your limits', nomistake: 'from mistake tags' };

const S = {
  trades: [], liveTrades: [], days: {}, weeks: {}, months: {}, settings: { ...DEF },
  entries: { playbook: {}, lesson: {}, habit: {}, study: {} },
  loaded: { trades: false }, demo: false, view: 'dashboard',
  editId: null, editIdKeep: false, dirty: false, day: null, week: null, month: null,
  diaryDay: null, habitDay: null, pbOpen: null, studyEdit: null, lessonEdit: null,
  lq: { q: '', src: '', cat: '' }, dq: { q: '', mood: '' }, sq: { type: '' },
  f: null, fOpen: false, navOpen: false, authMode: 'signin', recovery: false
};

const V = {}; /* view renderers, filled by views-*.js */

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => { if (v === '' || v == null) return null; const x = parseFloat(String(v).replace(/,/g, '')); return isFinite(x) ? x : null; };
const fin = (x) => x != null && isFinite(x);
const sign = (x) => x > 0 ? '+' : x < 0 ? '−' : '';
const fR = (x, d = 2) => fin(x) ? sign(x) + Math.abs(x).toFixed(d) + 'R' : '—';
const fM = (x) => fin(x) ? sign(x) + S.settings.currency + Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
const fMoney = (x) => fin(x) ? S.settings.currency + x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
const fP = (x) => fin(x) ? (x * 100).toFixed(0) + '%' : '—';
const fN = (x, d = 2) => fin(x) ? x.toFixed(d) : '—';
const fH = (min) => fin(min) ? (min >= 60 ? Math.floor(min / 60) + 'h ' + (Math.round(min % 60) ? Math.round(min % 60) + 'm' : '') : Math.round(min) + 'm').trim() : '—';
const tone = (x) => !fin(x) ? '' : x > 0 ? 'pos' : x < 0 ? 'neg' : '';
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const parseD = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const today = () => ymd(new Date());
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return ymd(d); };
const weekStart = (s) => { const d = parseD(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); };
const isoWeek = (s) => { const d = parseD(s); const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = t.getUTCFullYear(); const wk = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7); return y + '-W' + pad(wk); };
const monthKey = (s) => String(s).slice(0, 7);
const addMonths = (mk, n) => { const [y, m] = mk.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
const monthEnd = (mk) => { const [y, m] = mk.split('-').map(Number); return ymd(new Date(y, m, 0)); };
const fDate = (s, o) => parseD(s).toLocaleDateString('en-GB', o || { weekday: 'short', day: 'numeric', month: 'short' });
const fMonth = (mk) => parseD(mk + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const dowIdx = (s) => (parseD(s).getDay() + 6) % 7;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const list = (v) => Array.isArray(v) ? v.filter(Boolean) : String(v || '').split(/\n|,/).map((x) => x.trim()).filter(Boolean);
const lines = (v) => Array.isArray(v) ? v : String(v || '').split('\n').map((x) => x.trim()).filter(Boolean);
const cleanTag = (t) => String(t || '').trim().replace(/^#+/, '').replace(/\s+/g, '-').slice(0, 40);
const parseTags = (v) => Array.from(new Set(String(v || '').split(/[,\s]+/).map(cleanTag).filter(Boolean)));
const isWeekday = (s) => dowIdx(s) < 5;

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2800);
}
function lsGet(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }

/* session from open time, East Africa Time (UTC+3), Nov–Mar hours */
function autoSession(time) {
  if (!time) return '';
  const h = parseInt(time.split(':')[0], 10);
  if (h < 3 || h >= 20) return 'New York';
  if (h < 11) return 'Asia';
  if (h < 16) return 'London';
  return 'London–NY overlap';
}

/* ---------- trade maths ---------- */
function calc(t) {
  const long = t.dir !== 'short';
  const pe = num(t.entry), st = num(t.stop), tg = num(t.target), ex = num(t.exit);
  const fill = num(t.fill) ?? pe;
  const dist = pe != null && st != null && pe !== st ? Math.abs(pe - st) : null;
  const rr = dist && tg != null ? Math.abs(tg - pe) / dist : null;
  const risk = num(t.riskAmt);
  const pnlIn = num(t.pnl);
  let r = null;
  if (pnlIn != null && risk) r = pnlIn / risk;
  else if (ex != null && fill != null && st != null && fill !== st) { const d = Math.abs(fill - st); r = long ? (ex - fill) / d : (fill - ex) / d; }
  const pnl = pnlIn != null ? pnlIn : (r != null && risk != null ? r * risk : null);
  const missed = t.kind === 'missed';
  const closed = !missed && r != null;
  const outcome = missed ? 'Missed' : r == null ? 'Open' : r > 0.1 ? 'Win' : r < -0.1 ? 'Loss' : 'BE';
  let hold = null;
  if (t.openTime && t.closeTime) { const [a, b] = t.openTime.split(':').map(Number), [c, d] = t.closeTime.split(':').map(Number); hold = (c * 60 + d) - (a * 60 + b); if (hold < 0) hold += 1440; }
  const session = t.session && t.session !== 'Auto' ? t.session : autoSession(t.openTime) || '—';
  const tags = Array.isArray(t.tags) ? t.tags : parseTags(t.tags);
  return { dist, rr, r, pnl, risk, closed, outcome, missed, hold, session, tags };
}
const byTime = (a, b) => (a.date + (a.openTime || '')).localeCompare(b.date + (b.openTime || ''));
function prep(t) { t._ = calc(t); return t; }
function strip(t) { const o = { ...t }; delete o._; delete o.id; return o; }

function stats(trades) {
  const L = trades.filter((t) => t._.closed).slice().sort(byTime);
  const s = { n: L.length, w: 0, l: 0, be: 0, gw: 0, gl: 0, net: 0, pnl: 0, graded: 0, good: 0, mistR: 0, mistN: 0, dd: 0, best: null, worst: null, curStreak: 0, curType: '', maxW: 0, maxL: 0, rrSum: 0, rrN: 0, curve: [], holdSum: 0, holdN: 0, emoSum: 0, emoN: 0 };
  let cum = 0, peak = 0, run = 0, runType = '';
  for (const t of L) {
    const r = t._.r;
    if (r > 0.1) { s.w++; s.gw += r; } else if (r < -0.1) { s.l++; s.gl += -r; } else { s.be++; if (r > 0) s.gw += r; else s.gl += -r; }
    if (fin(t._.pnl)) s.pnl += t._.pnl;
    if (t.grade) { s.graded++; if (GOOD_GRADES.includes(t.grade)) s.good++; }
    if ((t.mistakes || []).length) { s.mistR += r; s.mistN++; }
    if (fin(t._.rr)) { s.rrSum += t._.rr; s.rrN++; }
    if (fin(t._.hold)) { s.holdSum += t._.hold; s.holdN++; }
    if (num(t.emotion) != null) { s.emoSum += num(t.emotion); s.emoN++; }
    cum += r; peak = Math.max(peak, cum); s.dd = Math.max(s.dd, peak - cum);
    s.curve.push({ y: cum, t });
    if (!s.best || r > s.best._.r) s.best = t;
    if (!s.worst || r < s.worst._.r) s.worst = t;
    const ty = r > 0.1 ? 'W' : r < -0.1 ? 'L' : '';
    if (ty && ty === runType) run++; else if (ty) { run = 1; runType = ty; }
    if (runType === 'W') s.maxW = Math.max(s.maxW, run); if (runType === 'L') s.maxL = Math.max(s.maxL, run);
  }
  s.curStreak = run; s.curType = runType;
  s.net = s.gw - s.gl;
  s.wr = s.n ? s.w / s.n : null;
  s.avgW = s.w ? s.gw / s.w : null;
  s.avgL = s.l ? s.gl / s.l : null;
  s.exp = s.n ? s.net / s.n : null;
  s.pf = s.gl > 0 ? s.gw / s.gl : (s.gw > 0 ? Infinity : null);
  s.adh = s.graded ? s.good / s.graded : null;
  s.avgRR = s.rrN ? s.rrSum / s.rrN : null;
  s.avgHold = s.holdN ? s.holdSum / s.holdN : null;
  s.avgEmo = s.emoN ? s.emoSum / s.emoN : null;
  s.mistRate = s.n ? s.mistN / s.n : null;
  s.cleanNet = s.net - s.mistR;
  return s;
}
function groupBy(trades, keyFn) {
  const m = new Map();
  for (const t of trades) { if (!t._.closed) continue; const ks = [].concat(keyFn(t)); for (const k of ks) { if (k == null || k === '') continue; if (!m.has(k)) m.set(k, []); m.get(k).push(t); } }
  return Array.from(m, ([k, v]) => ({ key: k, s: stats(v) }));
}
const closedOf = (arr) => arr.filter((t) => t._.closed);
const balanceNow = () => { const b = num(S.settings.startBalance); if (b == null) return null; return b + S.trades.reduce((a, t) => a + (t._.closed && fin(t._.pnl) ? t._.pnl : 0), 0); };
const allTags = () => Array.from(new Set(list(S.settings.tags).concat(...S.trades.map((t) => t._.tags)))).sort((a, b) => a.localeCompare(b));
const allSymbols = () => Array.from(new Set(S.trades.map((t) => (t.symbol || '').toUpperCase()).filter(Boolean))).sort();

/* ---------- filters ---------- */
const FDEF = { period: 'month', from: '', to: '', market: '', symbol: '', setup: '', session: '', dir: '', outcome: '', grade: '', mistake: '', tag: '', emotion: '', q: '' };
const PERIODS = [['today', 'Today'], ['week', 'This week'], ['lastweek', 'Last week'], ['month', 'This month'], ['lastmonth', 'Last month'], ['quarter', 'Last 90 days'], ['year', 'This year'], ['all', 'All time'], ['custom', 'Custom range']];
S.f = { ...FDEF, ...lsGet('gdj.f', {}) };
function periodRange(f) {
  const td = today(), ws = weekStart(td), mk = monthKey(td);
  switch (f.period) {
    case 'today': return [td, td];
    case 'week': return [ws, addDays(ws, 6)];
    case 'lastweek': return [addDays(ws, -7), addDays(ws, -1)];
    case 'month': return [mk + '-01', monthEnd(mk)];
    case 'lastmonth': { const p = addMonths(mk, -1); return [p + '-01', monthEnd(p)]; }
    case 'quarter': return [addDays(td, -89), td];
    case 'year': return [td.slice(0, 4) + '-01-01', td.slice(0, 4) + '-12-31'];
    case 'custom': return [f.from || '0000-01-01', f.to || '9999-12-31'];
    default: return ['0000-01-01', '9999-12-31'];
  }
}
function applyF(trades, f) {
  const [a, b] = periodRange(f); const q = (f.q || '').toLowerCase().trim();
  return trades.filter((t) => {
    if (t.date < a || t.date > b) return false;
    if (f.market && t.market !== f.market) return false;
    if (f.symbol && (t.symbol || '').toUpperCase() !== f.symbol) return false;
    if (f.setup && t.setup !== f.setup) return false;
    if (f.session && t._.session !== f.session) return false;
    if (f.dir && (t.dir || 'long') !== f.dir) return false;
    if (f.outcome && t._.outcome !== f.outcome) return false;
    if (f.grade && t.grade !== f.grade) return false;
    if (f.mistake === '__none' && (t.mistakes || []).length) return false;
    if (f.mistake === '__any' && !(t.mistakes || []).length) return false;
    if (f.mistake && f.mistake[0] !== '_' && !(t.mistakes || []).includes(f.mistake)) return false;
    if (f.tag && !t._.tags.includes(f.tag)) return false;
    if (f.emotion === 'calm' && !(num(t.emotion) <= 2)) return false;
    if (f.emotion === 'hot' && !(num(t.emotion) >= 3)) return false;
    if (q) { const hay = [t.symbol, t.setup, t.why, t.notes, t.lesson, t.good, t.diff, t.during, t._.tags.join(' '), (t.mistakes || []).join(' ')].join(' ').toLowerCase(); if (!hay.includes(q)) return false; }
    return true;
  });
}
function activeFilterCount(f) { return ['market', 'symbol', 'setup', 'session', 'dir', 'outcome', 'grade', 'mistake', 'tag', 'emotion', 'q'].filter((k) => f[k]).length; }
function periodLabel(f) { const p = PERIODS.find((x) => x[0] === f.period); if (f.period === 'custom') return (f.from ? fDate(f.from, { day: 'numeric', month: 'short', year: '2-digit' }) : 'start') + ' – ' + (f.to ? fDate(f.to, { day: 'numeric', month: 'short', year: '2-digit' }) : 'today'); return p ? p[1] : 'All time'; }

/* ---------- storage (Render API → Supabase) ---------- */
const store = {
  mode: 'loading', user: null, coachEnabled: false,
  async token() { const { data } = await sb.auth.getSession(); return data.session ? data.session.access_token : null; },
  async api(path, opts = {}) {
    const tok = await this.token();
    if (!tok) { this.mode = 'signedout'; render(); throw new Error('Sign in required'); }
    const r = await fetch(API + path, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok, ...(opts.headers || {}) } });
    let j = null; try { j = await r.json(); } catch (e) { j = null; }
    if (r.status === 401) { this.mode = 'signedout'; render(); }
    if (!r.ok) throw new Error((j && j.error) || 'Request failed (' + r.status + ')');
    return j;
  },
  async init() {
    if (!sb) { this.mode = 'misconfigured'; render(); return; }
    const { data } = await sb.auth.getSession();
    sb.auth.onAuthStateChange((evt, session) => {
      if (evt === 'PASSWORD_RECOVERY') { S.recovery = true; render(); return; }
      if (evt === 'SIGNED_OUT') { this.user = null; this.mode = 'signedout'; S.liveTrades = []; S.trades = []; S.days = {}; S.weeks = {}; S.months = {}; S.entries = { playbook: {}, lesson: {}, habit: {}, study: {} }; S.settings = { ...DEF }; render(); }
      else if (evt === 'SIGNED_IN' && session && (!this.user || this.user.id !== session.user.id)) { this.user = session.user; this.load(); }
    });
    if (data.session) { this.user = data.session.user; await this.load(); }
    else { this.mode = 'signedout'; S.loaded.trades = true; render(); }
  },
  async load() {
    this.mode = 'cloud'; S.loaded.trades = false; render();
    try {
      const j = await this.api('/api/journal');
      S.liveTrades = (j.trades || []).map(prep); if (!S.demo) S.trades = S.liveTrades;
      S.days = j.days || {}; S.weeks = j.weeks || {}; S.months = j.months || {};
      S.entries = { playbook: {}, lesson: {}, habit: {}, study: {}, ...(j.entries || {}) };
      if (j.settings) S.settings = { ...DEF, ...j.settings, symbols: { ...DEF.symbols, ...(j.settings.symbols || {}) } };
      S.loaded.trades = true; onData();
      this.api('/api/coach/status').then((s) => { this.coachEnabled = !!(s && s.enabled); }).catch(() => {});
    } catch (e) {
      S.loaded.trades = true;
      if (this.mode !== 'signedout') { toast('Could not load your journal — ' + e.message); this.mode = 'offline'; render(); }
    }
  },
  async save(col, id, data) {
    if (S.demo) { toast('Example mode — exit it to save your own data'); return false; }
    try {
      if (col === 'config') await this.api('/api/settings', { method: 'PUT', body: JSON.stringify(data) });
      else if (col === 'trades') await this.api('/api/trades/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(data) });
      else await this.api('/api/' + col + '/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(data) });
      if (col === 'trades') { const t = prep({ ...data, id }); const i = S.liveTrades.findIndex((x) => x.id === id); if (i >= 0) S.liveTrades[i] = t; else S.liveTrades.push(t); S.trades = S.liveTrades; }
      else if (col === 'config') S.settings = { ...DEF, ...data };
      else S[col][id] = data;
      return true;
    } catch (e) { toast('Save failed — ' + e.message); return false; }
  },
  async remove(col, id) {
    if (S.demo) { toast('Example mode — nothing to delete'); return false; }
    try {
      await this.api('/api/trades/' + encodeURIComponent(id), { method: 'DELETE' });
      S.liveTrades = S.liveTrades.filter((t) => t.id !== id); S.trades = S.liveTrades; return true;
    } catch (e) { toast('Delete failed — ' + e.message); return false; }
  },
  async saveEntry(kind, id, data) {
    if (S.demo) { toast('Example mode — exit it to save your own data'); return false; }
    try {
      await this.api('/api/entries/' + kind + '/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(data) });
      S.entries[kind] = { ...S.entries[kind], [id]: data }; return true;
    } catch (e) { toast('Save failed — ' + e.message); return false; }
  },
  async removeEntry(kind, id) {
    if (S.demo) { toast('Example mode — nothing to delete'); return false; }
    try {
      await this.api('/api/entries/' + kind + '/' + encodeURIComponent(id), { method: 'DELETE' });
      const o = { ...S.entries[kind] }; delete o[id]; S.entries[kind] = o; return true;
    } catch (e) { toast('Delete failed — ' + e.message); return false; }
  },
  async renameTag(field, from, to) {
    if (S.demo) return 0;
    const j = await this.api('/api/trades/rename', { method: 'POST', body: JSON.stringify({ field, from, to }) });
    for (const t of S.liveTrades) {
      if ((field === 'setup' || field === 'symbol') && t[field] === from) t[field] = to || '';
      else if (Array.isArray(t[field]) && t[field].includes(from)) t[field] = Array.from(new Set(t[field].map((x) => (x === from ? to : x)).filter(Boolean)));
      prep(t);
    }
    return j.updated || 0;
  }
};
const entryList = (kind) => Object.entries(S.entries[kind] || {}).map(([id, d]) => ({ id, ...d }));
