/* Gold Desk Journal — app shell: rendering, routing, events, auth, export, coach, boot */
'use strict';

const ROUTES = ['dashboard', 'log', 'journal', 'daily', 'diary', 'habits', 'weekly', 'monthly', 'progress', 'playbook', 'lessons', 'study', 'setup'];
const NAV = [
  ['Trade', [['dashboard', 'Dashboard'], ['log', 'Log trade'], ['journal', 'Trades']]],
  ['Routine', [['daily', 'Daily'], ['habits', 'Habits'], ['diary', 'Diary']]],
  ['Review', [['weekly', 'Weekly'], ['monthly', 'Monthly'], ['progress', 'Progress']]],
  ['Knowledge', [['playbook', 'Playbook'], ['lessons', 'Lessons'], ['study', 'Study']]],
  ['', [['setup', 'Setup']]]
];

function renderNav() {
  $('#nav').innerHTML = NAV.map(([g, items]) => `<div class="nav-group">${g ? `<span class="nav-title">${g}</span>` : ''}${items.map(([k, l]) => `<a href="#${k}" ${S.view === k ? 'aria-current="page"' : ''}>${icon(k)}<span>${l}</span></a>`).join('')}</div>`).join('');
}
function renderMode() {
  const m = $('#mode');
  if (S.demo) m.innerHTML = '<span class="goldc">Example data</span>';
  else if (store.mode === 'cloud' && store.user) m.innerHTML = `<span class="okc">●</span> <span class="ell" title="${esc(store.user.email || '')}">${esc(store.user.email || 'Signed in')}</span><button class="linkbtn" data-act="signout">Sign out</button>`;
  else if (store.mode === 'offline') m.textContent = 'Offline';
  else m.textContent = '';
  const b = $('#banner');
  if (S.demo) b.innerHTML = '<div class="banner demo"><span>You are looking at <b>example trades</b> to see how the analysis works. Nothing here is saved or real.</span><button class="btn small" data-act="demo-off">Back to my journal</button></div>';
  else if (store.mode === 'offline') b.innerHTML = '<div class="banner warn"><span>Can’t reach the journal server. The free Render plan sleeps when idle — wait about a minute, then retry.</span><button class="btn small" data-act="retry">Retry</button></div>';
  else b.innerHTML = '';
  document.body.classList.toggle('signed-out', store.mode === 'signedout' || store.mode === 'misconfigured' || !!S.recovery);
}

function loginView() {
  if (store.mode === 'misconfigured') return `<div class="card empty"><h2>Setup needed</h2><p>This deployment is missing SUPABASE_URL or SUPABASE_ANON_KEY. Add them in Render → your service → Environment, then redeploy.</p></div>`;
  const signup = S.authMode === 'signup';
  return `<div class="auth-wrap"><div class="auth-brand"><span class="brand-mark lg">Au</span><h1>Gold Desk Journal</h1><p>Plan the day. Log every trade. Review, learn, improve.</p>
    <ul><li>${icon('progress', 16)} Learning curve, levels & badges</li><li>${icon('habits', 16)} Habit tracker linked to your results</li><li>${icon('playbook', 16)} Playbook, lessons & study log</li></ul></div>
    <div class="card auth-card">
    <h2 class="fs24">${signup ? 'Create your journal' : 'Sign in'}</h2>
    <p class="guide mb16">${signup ? 'Your trades are private to your account.' : 'Welcome back.'}</p>
    <form id="authForm" class="stack g14" novalidate>
      ${fld('email', 'Email', '<input id="email" name="email" class="in" type="email" autocomplete="email" required>')}
      ${fld('password', 'Password', `<input id="password" name="password" class="in" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="8" required>`)}
      <span class="err" id="authErr" role="alert"></span>
      <button class="btn primary jc" type="submit">${signup ? 'Create account' : 'Sign in'}</button>
      <div class="split fs14"><button type="button" class="linkbtn" data-act="auth-toggle">${signup ? 'I already have an account' : 'Create an account'}</button>${signup ? '' : '<button type="button" class="linkbtn" data-act="auth-reset">Forgot password?</button>'}</div>
    </form></div></div>`;
}
async function handleAuth(f) {
  const email = f.email.value.trim(), password = f.password.value, err = $('#authErr');
  if (!email || password.length < 8) { err.textContent = 'Enter your email and a password of at least 8 characters.'; return; }
  err.textContent = ''; const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
  try {
    if (S.authMode === 'signup') {
      const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin } });
      if (error) throw error;
      if (!data.session) { err.className = 'okc fs14'; err.textContent = 'Check your email and click the confirmation link, then sign in.'; S.authMode = 'signin'; }
    } else { const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; }
  } catch (e) { err.className = 'err'; err.textContent = e.message || 'Sign-in failed'; }
  finally { btn.disabled = false; }
}

/* ---------- render ---------- */
function render() {
  const ae = document.activeElement; const keep = ae && ae.id && $('#view').contains(ae) ? { id: ae.id, s: ae.selectionStart, e: ae.selectionEnd } : null;
  renderNav();
  if (S.recovery) { $('#view').innerHTML = `<div class="card auth-card"><h1 class="fs26 mb16">Set a new password</h1><form id="pwForm" class="stack g14">${fld('newpw', 'New password', '<input id="newpw" name="newpw" class="in" type="password" autocomplete="new-password" minlength="8" required>')}<span class="err" id="pwErr" role="alert"></span><button class="btn primary jc" type="submit">Save password</button></form></div>`; renderMode(); return; }
  if (store.mode === 'signedout' || store.mode === 'misconfigured') { $('#view').innerHTML = loginView(); renderMode(); return; }
  const v = V[S.view] || V.dashboard;
  $('#view').innerHTML = v();
  if (S.view === 'log') updateCalc();
  renderMode();
  if (keep) { const el = document.getElementById(keep.id); if (el) { el.focus(); try { if (keep.s != null) el.setSelectionRange(keep.s, keep.e); } catch (e) { /* not a text input */ } } }
}
function refreshLive() {
  const map = { daily: ['#dayLive', () => dayLive(S.day || today())], weekly: ['#weekLive', () => weekLive(S.week || weekStart(today()))], monthly: ['#monthLive', () => monthLive(S.month || monthKey(today()))] };
  const m = map[S.view]; if (m && $(m[0])) $(m[0]).innerHTML = m[1]();
}
function onData() { if (S.dirty) { refreshLive(); return; } render(); }
function route() {
  const h = (location.hash || '').replace('#', '');
  const v = ROUTES.includes(h) ? h : 'dashboard';
  if (!S.editIdKeep) S.editId = null;
  S.editIdKeep = false;
  if (v !== 'playbook') S.pbOpen = null;
  S.view = v; S.dirty = false; document.body.classList.remove('nav-open');
  render(); window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

/* ---------- example data (not saved) ---------- */
function makeDemo() {
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const out = []; let d = addDays(today(), -90);
  const syms = { gold: ['XAUUSD'], fx: ['EURUSD', 'GBPUSD', 'USDJPY'], crypto: ['BTCUSDT', 'ETHUSDT'] };
  for (let i = 0; i < 110; i++) {
    d = addDays(d, rnd() < 0.55 ? 0 : 1); if (dowIdx(d) > 4 && rnd() < 0.8) d = addDays(d, 7 - dowIdx(d));
    if (d > today()) break;
    const learn = i / 110;
    const market = rnd() < 0.6 ? 'gold' : rnd() < 0.6 ? 'fx' : 'crypto';
    const setup = pick(DEF.setups);
    const emotion = 1 + Math.floor(rnd() * (rnd() < 0.8 - learn * 0.3 ? 3 : 5));
    const hasMist = emotion >= 3 ? rnd() < 0.6 - learn * 0.3 : rnd() < 0.2 - learn * 0.12;
    const mistakes = hasMist ? [pick(DEF.mistakes)] : [];
    const edge = (setup.includes('demand') ? 0.58 : 0.46) + learn * 0.08 - (hasMist ? 0.25 : 0) + (market === 'gold' ? 0.05 : market === 'crypto' ? -0.08 : 0);
    const win = rnd() < edge;
    const r = win ? +(1.6 + rnd() * 1.6).toFixed(2) : (rnd() < 0.15 ? 0 : (hasMist && rnd() < 0.4 ? -1.5 : -1));
    const h = 4 + Math.floor(rnd() * 17);
    const grade = hasMist ? (emotion >= 4 ? 'F' : 'C') : pick(['A+', 'A', 'A', 'B']);
    const tags = [pick(DEF.tags)].concat(rnd() < 0.3 ? [pick(DEF.tags)] : []);
    out.push(prep({ id: 'demo' + i, kind: rnd() < 0.06 ? 'missed' : 'taken', date: d, openTime: pad(h) + ':' + pad(Math.floor(rnd() * 60)), closeTime: pad((h + 1 + Math.floor(rnd() * 4)) % 24) + ':' + pad(Math.floor(rnd() * 60)), market, symbol: pick(syms[market]), dir: rnd() < 0.55 ? 'long' : 'short', setup, riskAmt: 100, pnl: String(r * 100), entry: '100', stop: '99', target: String(100 + 2 + rnd()), emotion: String(emotion), grade, mistakes, tags: Array.from(new Set(tags)), checks: [], lesson: i % 9 === 0 ? 'Example lesson: wait for the retest, never enter while the zone is forming.' : '' }));
  }
  return out;
}

/* ---------- helpers for events ---------- */
function arm(b, label, fn) {
  if (b.dataset.armed) { fn(); return; }
  const orig = b.innerHTML; b.dataset.armed = '1'; b.textContent = label;
  setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.innerHTML = orig; } }, 4000);
}
let qTimer = null;

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.f === 'q') { S.f.q = t.value; lsSet('gdj.f', S.f); clearTimeout(qTimer); qTimer = setTimeout(render, 280); return; }
  if (t.dataset.lq) { S.lq[t.dataset.lq] = t.value; clearTimeout(qTimer); qTimer = setTimeout(render, 250); return; }
  if (t.dataset.dq) { S.dq[t.dataset.dq] = t.value; clearTimeout(qTimer); qTimer = setTimeout(render, 250); return; }
  if (t.closest('form')) S.dirty = true;
  if (t.closest('#tradeForm')) updateCalc();
  if (t.id === 'diary') { const w = $('#wordCount'); if (w) w.textContent = t.value.trim() ? t.value.trim().split(/\s+/).length + ' words' : ''; }
});
document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.dataset.f && t.dataset.f !== 'q') { S.f[t.dataset.f] = t.value; lsSet('gdj.f', S.f); render(); return; }
  if (t.dataset.lq && t.tagName === 'SELECT') { S.lq[t.dataset.lq] = t.value; render(); return; }
  if (t.dataset.dq && t.tagName === 'SELECT') { S.dq[t.dataset.dq] = t.value; render(); return; }
  if (t.dataset.sq) { S.sq[t.dataset.sq] = t.value; render(); return; }
  if (t.id === 'dayPick' && t.value) { S.day = t.value; S.dirty = false; render(); return; }
  if (t.id === 'habitPick' && t.value) { S.habitDay = t.value; S.dirty = false; render(); return; }
  if (t.id === 'diaryPick' && t.value) { S.diaryDay = t.value; S.dirty = false; render(); return; }
  if (t.id === 'st_type') { const b = $('#btFields'); if (b) b.hidden = t.value !== 'Backtest'; return; }
  if (t.dataset.hrename) {
    const h = S.entries.habit[t.dataset.hrename]; const v = t.value.trim();
    if (h && v && v !== h.name && await store.saveEntry('habit', t.dataset.hrename, { ...h, name: v })) toast('Habit renamed');
    return;
  }
  if (t.closest('#tradeForm')) {
    if (t.name === 'riskPct') { const b = balanceNow(); const p = num(t.value); if (b != null && p != null) $('#riskAmt').value = (b * p / 100).toFixed(2); }
    if (t.name === 'market') S.lastMarket = t.value;
    updateCalc();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('tr[data-edit],tr[data-study]')) e.target.click();
  if (e.key === 'Enter' && e.target.dataset.tladd) { e.preventDefault(); $(`[data-act="tl-add"][data-key="${e.target.dataset.tladd}"]`).click(); }
  if (e.key === 'Escape' && document.body.classList.contains('nav-open')) document.body.classList.remove('nav-open');
});

document.addEventListener('click', async (e) => {
  const ed = e.target.closest('[data-edit]');
  if (ed) { e.preventDefault(); S.editId = ed.dataset.edit; S.editIdKeep = true; if (location.hash === '#log') route(); else location.hash = 'log'; return; }
  const fc = e.target.closest('[data-fclear]'); if (fc) { S.f[fc.dataset.fclear] = ''; lsSet('gdj.f', S.f); render(); return; }
  const at = e.target.closest('[data-addtag]');
  if (at) { const i = $('#tags'); const cur = parseTags(i.value); const tg = at.dataset.addtag; i.value = (cur.includes(tg) ? cur.filter((x) => x !== tg) : cur.concat(tg)).map((x) => '#' + x).join(' '); S.dirty = true; updateCalc(); return; }
  const dy = e.target.closest('[data-diary]'); if (dy) { S.diaryDay = dy.dataset.diary; render(); window.scrollTo(0, 0); return; }
  const pb = e.target.closest('[data-pb]'); if (pb) { S.pbOpen = pb.dataset.pb; render(); window.scrollTo(0, 0); return; }
  const sr = e.target.closest('[data-study]'); if (sr) { S.studyEdit = sr.dataset.study; render(); window.scrollTo(0, 0); return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  switch (a) {
    case 'nav-toggle': document.body.classList.toggle('nav-open'); break;
    case 'demo-on': S.demo = true; S.trades = makeDemo(); S.f = { ...FDEF, period: 'all' }; render(); toast('Showing example trades'); break;
    case 'demo-off': S.demo = false; S.trades = S.liveTrades || []; render(); break;
    case 'f-toggle': S.fOpen = !S.fOpen; render(); break;
    case 'f-clear': S.f = { ...FDEF, period: S.f.period, from: S.f.from, to: S.f.to }; lsSet('gdj.f', S.f); render(); break;
    case 'new-trade': S.editId = null; render(); break;
    case 'day-prev': S.day = addDays(S.day || today(), -1); S.dirty = false; render(); break;
    case 'day-next': S.day = addDays(S.day || today(), 1); S.dirty = false; render(); break;
    case 'day-today': S.day = today(); S.dirty = false; render(); break;
    case 'hd-prev': S.habitDay = addDays(S.habitDay || today(), -1); render(); break;
    case 'hd-next': S.habitDay = addDays(S.habitDay || today(), 1); render(); break;
    case 'hd-today': S.habitDay = today(); render(); break;
    case 'dd-prev': S.diaryDay = addDays(S.diaryDay || today(), -1); render(); break;
    case 'dd-next': S.diaryDay = addDays(S.diaryDay || today(), 1); render(); break;
    case 'dd-today': S.diaryDay = today(); render(); break;
    case 'wk-prev': S.week = addDays(S.week || weekStart(today()), -7); S.dirty = false; render(); break;
    case 'wk-next': S.week = addDays(S.week || weekStart(today()), 7); S.dirty = false; render(); break;
    case 'wk-now': S.week = weekStart(today()); S.dirty = false; render(); break;
    case 'mo-prev': S.month = addMonths(S.month || monthKey(today()), -1); S.dirty = false; render(); break;
    case 'mo-next': S.month = addMonths(S.month || monthKey(today()), 1); S.dirty = false; render(); break;
    case 'mo-now': S.month = monthKey(today()); S.dirty = false; render(); break;
    case 'del-trade': arm(b, 'Tap again to delete', async () => { if (await store.remove('trades', S.editId)) { toast('Trade deleted'); S.editId = null; S.dirty = false; location.hash = 'journal'; } }); break;
    case 'export': exportCSV(); break;
    case 'coach': runCoach(b); break;
    case 'signout': await sb.auth.signOut(); location.hash = 'dashboard'; break;
    case 'auth-toggle': S.authMode = S.authMode === 'signup' ? 'signin' : 'signup'; render(); break;
    case 'auth-reset': {
      const email = ($('#email') || {}).value || ''; const err = $('#authErr');
      if (!email) { err.textContent = 'Type your email first, then tap “Forgot password?”.'; return; }
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
      err.className = error ? 'err' : 'okc fs14'; err.textContent = error ? error.message : 'Password reset email sent.'; break;
    }
    case 'retry': store.load(); break;
    /* habits */
    case 'habit-starter': {
      const cat = b.dataset.cat; const have = new Set(habits().map((h) => h.name)); let order = Math.max(0, ...habits().map((h) => h.order || 0));
      const add = HABIT_TEMPLATES[cat].filter((t) => !have.has(t.name)); b.disabled = true;
      for (const t of add) await store.saveEntry('habit', 'h' + uid(), { ...t, cat, order: ++order, created: today() });
      toast(add.length + ' habits added'); render(); break;
    }
    case 'habit-up': case 'habit-down': {
      const H = habits(); const i = H.findIndex((h) => h.id === b.dataset.id); const j = a === 'habit-up' ? i - 1 : i + 1; if (i < 0 || j < 0 || j >= H.length) return;
      const A = H[i], B = H[j]; const ao = A.order ?? i, bo = B.order ?? j;
      const sa = { ...A, order: bo === ao ? j : bo }; const sb2 = { ...B, order: bo === ao ? i : ao }; delete sa.id; delete sb2.id;
      await store.saveEntry('habit', A.id, sa); await store.saveEntry('habit', B.id, sb2); render(); break;
    }
    case 'habit-del': arm(b, 'Remove?', async () => { if (await store.removeEntry('habit', b.dataset.id)) { toast('Habit removed'); render(); } }); break;
    /* playbook */
    case 'pb-new': S.pbOpen = 'new'; render(); window.scrollTo(0, 0); break;
    case 'pb-back': S.pbOpen = null; render(); break;
    case 'pb-seed': {
      const have = new Set(entryList('playbook').map((p) => p.name)); const miss = list(S.settings.setups).filter((x) => !have.has(x)); b.disabled = true;
      for (const n of miss) await store.saveEntry('playbook', 'p' + uid(), { name: n, status: 'Active', created: today() });
      toast(miss.length + ' playbook pages created'); render(); break;
    }
    case 'pb-del': arm(b, 'Tap again to delete', async () => { if (await store.removeEntry('playbook', S.pbOpen)) { S.pbOpen = null; toast('Playbook page deleted'); render(); } }); break;
    /* lessons */
    case 'lesson-pin': togglePin(b.dataset.key); break;
    case 'lesson-edit': S.lessonEdit = b.dataset.id; render(); break;
    case 'lesson-cancel': S.lessonEdit = null; render(); break;
    case 'lesson-del': arm(b, 'Tap again to delete', async () => { if (await store.removeEntry('lesson', S.lessonEdit)) { S.lessonEdit = null; toast('Lesson deleted'); render(); } }); break;
    /* study */
    case 'study-cancel': S.studyEdit = null; render(); break;
    case 'study-del': arm(b, 'Tap again to delete', async () => { if (await store.removeEntry('study', S.studyEdit)) { S.studyEdit = null; toast('Session deleted'); render(); } }); break;
    /* tag list editor */
    case 'tl-up': { const r = b.closest('.tl-row'); if (r.previousElementSibling) r.parentNode.insertBefore(r, r.previousElementSibling); S.dirty = true; break; }
    case 'tl-down': { const r = b.closest('.tl-row'); if (r.nextElementSibling) r.parentNode.insertBefore(r.nextElementSibling, r); S.dirty = true; break; }
    case 'tl-del': b.closest('.tl-row').remove(); S.dirty = true; break;
    case 'tl-add': {
      const k = b.dataset.key; const i = $(`[data-tladd="${k}"]`); const v = (k === 'tags' ? cleanTag(i.value) : i.value.trim()); if (!v) return;
      const row = document.createElement('div'); row.className = 'tl-row'; row.dataset.orig = '';
      row.innerHTML = `<input class="in" value="${esc(v)}" aria-label="Item"><span class="mut fs12">new</span><button type="button" class="icon-btn" data-act="tl-up" aria-label="Move up">${icon('up', 16)}</button><button type="button" class="icon-btn" data-act="tl-down" aria-label="Move down">${icon('down', 16)}</button><button type="button" class="icon-btn danger" data-act="tl-del" aria-label="Remove">${icon('x', 16)}</button>`;
      $(`.tl[data-list="${k}"]`).appendChild(row); i.value = ''; i.focus(); S.dirty = true; break;
    }
  }
});

async function togglePin(key) {
  const [k, ref] = [key.slice(0, 1), key.slice(2)];
  let ok = false;
  if (k === 't') { const t = S.trades.find((x) => x.id === ref); if (t) ok = await store.save('trades', ref, { ...strip(t), lessonPinned: !t.lessonPinned }); }
  else if (k === 'd') { const x = S.days[ref] || {}; ok = await store.save('days', ref, { ...x, lessonPinned: !x.lessonPinned }); }
  else if (k === 'w') { const x = S.weeks[ref] || {}; ok = await store.save('weeks', ref, { ...x, lessonPinned: !x.lessonPinned }); }
  else if (k === 'l' || k === 's') { const kind = k === 'l' ? 'lesson' : 'study'; const x = { ...(S.entries[kind][ref] || {}) }; x.pinned = !x.pinned; ok = await store.saveEntry(kind, ref, x); }
  if (ok) render();
}

/* ---------- form submits ---------- */
document.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target; const fd = new FormData(f); const now = new Date().toISOString();
  const btn = f.querySelector('button[type=submit]');
  switch (f.id) {
    case 'authForm': handleAuth(f); return;
    case 'pwForm': { const pw = f.newpw.value; if (pw.length < 8) { $('#pwErr').textContent = 'Use at least 8 characters.'; return; } const { error } = await sb.auth.updateUser({ password: pw }); if (error) { $('#pwErr').textContent = error.message; return; } S.recovery = false; toast('Password updated'); store.load(); return; }
    case 'tradeForm': {
      const o = readTradeForm(f); const err = $('#formErr');
      if (!o.date) { err.textContent = 'Add the trade date.'; return; }
      if (!o.symbol) { err.textContent = 'Add the symbol.'; $('#symbol').focus(); return; }
      o.symbol = o.symbol.toUpperCase().trim(); err.textContent = '';
      const id = S.editId || (o.date + '-' + uid());
      const prev = S.editId ? S.trades.find((t) => t.id === S.editId) : null;
      const body = { ...(prev ? strip(prev) : {}), ...o, updatedAt: now }; if (!prev) body.createdAt = now;
      if (btn) btn.disabled = true;
      if (await store.save('trades', id, body)) { S.dirty = false; S.editId = id; toast(prev ? 'Trade updated' : 'Trade saved'); render(); }
      if (btn && btn.isConnected) btn.disabled = false; return;
    }
    case 'dayForm': {
      const d = S.day || today(); const o = { ...(S.days[d] || {}) };
      for (const [k, v] of fd.entries()) if (!k.startsWith('w_')) o[k] = v;
      o.watch = [0, 1, 2, 3].map((i) => ({ sym: fd.get('w_sym_' + i) || '', bias: fd.get('w_bias_' + i) || '', zone: fd.get('w_zone_' + i) || '', plan: fd.get('w_plan_' + i) || '', inv: fd.get('w_inv_' + i) || '' }));
      const part = e.submitter && e.submitter.dataset.part; if (part === 'plan') o.planDone = true; if (part === 'recap') o.recapDone = true; o.updatedAt = now;
      if (await store.save('days', d, o)) { S.dirty = false; toast(part === 'recap' ? 'Recap saved' : 'Plan saved'); render(); } return;
    }
    case 'diaryForm': {
      const d = S.diaryDay || today(); const o = { ...(S.days[d] || {}) };
      ['diaryTitle', 'diaryMood', 'diary', 'gratitude', 'diaryTags'].forEach((k) => { o[k] = fd.get(k) || ''; }); o.updatedAt = now;
      if (await store.save('days', d, o)) { S.dirty = false; toast('Diary saved'); render(); } return;
    }
    case 'habitCheck': {
      const d = S.habitDay || today(); const o = { ...(S.days[d] || {}) }; const hv = { ...(o.habits || {}) };
      for (const h of habits()) { if (h.auto) continue; const el = f.querySelector(`[name="h_${CSS.escape(h.id)}"]`); if (!el) continue; hv[h.id] = el.type === 'checkbox' ? el.checked : el.value; }
      o.habits = hv; o.updatedAt = now;
      if (await store.save('days', d, o)) { S.dirty = false; const s = habitDaySummary(d); toast(`Check-in saved · ${s.done}/${s.total}`); render(); } return;
    }
    case 'habitForm': {
      const name = (fd.get('hn_name') || '').trim(); if (!name) { $('#hn_name').focus(); return; }
      const type = fd.get('hn_type'); const order = Math.max(0, ...habits().map((h) => h.order || 0)) + 1;
      const h = { name, cat: fd.get('hn_cat'), type, order, created: today() };
      if (type === 'number') { h.target = num(fd.get('hn_target')) || 1; h.unit = fd.get('hn_unit') || ''; }
      if (await store.saveEntry('habit', 'h' + uid(), h)) { S.dirty = false; toast('Habit added'); render(); } return;
    }
    case 'pbForm': {
      const id = f.dataset.id === 'new' ? 'p' + uid() : f.dataset.id; const prev = S.entries.playbook[id] || {};
      const name = (fd.get('pb_name') || '').trim(); if (!name) { $('#pb_name').focus(); return; }
      const o = { ...prev, name, status: fd.get('pb_status'), markets: fd.get('pb_markets'), timeframes: fd.get('pb_timeframes'), checklist: lines(fd.get('pb_checklist')), examples: lines(fd.get('pb_examples')), updatedAt: now };
      PB_FIELDS.forEach(([k]) => { o[k] = fd.get('pb_' + k) || ''; }); if (!prev.created) o.created = today();
      if (await store.saveEntry('playbook', id, o)) {
        if (!list(S.settings.setups).includes(name)) { const st = { ...S.settings, setups: list(S.settings.setups).concat(name) }; delete st.undefined; await store.save('config', 'settings', st); }
        S.dirty = false; S.pbOpen = id; toast('Playbook saved'); render();
      } return;
    }
    case 'lessonForm': {
      const text = (fd.get('ln_text') || '').trim(); if (!text) { $('#ln_text').focus(); return; }
      const id = f.dataset.id || 'l' + uid(); const prev = S.entries.lesson[id] || {};
      const o = { ...prev, title: fd.get('ln_title') || '', text, cat: fd.get('ln_cat'), source: fd.get('ln_source') || '', pinned: !!fd.get('ln_pinned'), date: prev.date || today(), updatedAt: now };
      if (await store.saveEntry('lesson', id, o)) { S.dirty = false; S.lessonEdit = null; toast('Lesson saved'); render(); } return;
    }
    case 'studyForm': {
      const id = f.dataset.id || 's' + uid(); const prev = S.entries.study[id] || {};
      const o = { ...prev, date: fd.get('st_date') || today(), type: fd.get('st_type'), minutes: num(fd.get('st_minutes')) || 0, topic: fd.get('st_topic') || '', setup: fd.get('st_setup') || '', notes: fd.get('st_notes') || '', takeaways: fd.get('st_takeaways') || '', updatedAt: now };
      if (o.type === 'Backtest') Object.assign(o, { market: fd.get('st_market') || '', btTrades: num(fd.get('st_btTrades')), btWins: num(fd.get('st_btWins')), btR: num(fd.get('st_btR')), period: fd.get('st_period') || '' });
      if (o.type === 'Backtest' && o.btWins != null && o.btTrades != null && o.btWins > o.btTrades) { toast('Wins can’t be more than trades tested'); return; }
      if (await store.saveEntry('study', id, o)) { S.dirty = false; S.studyEdit = null; toast('Study session saved'); render(); } return;
    }
    case 'weekForm': {
      const wk = isoWeek(S.week || weekStart(today())); const o = { ...(S.weeks[wk] || {}) };
      for (const [k, v] of fd.entries()) o[k] = v; o.done = true; o.weekStart = S.week || weekStart(today()); o.updatedAt = now;
      if (await store.save('weeks', wk, o)) { S.dirty = false; toast('Weekly review saved'); render(); } return;
    }
    case 'monthForm': {
      const mk = S.month || monthKey(today()); const o = { ...(S.months[mk] || {}) };
      for (const [k, v] of fd.entries()) o[k] = v; o.done = true; o.updatedAt = now;
      if (await store.save('months', mk, o)) { S.dirty = false; toast('Monthly audit saved'); render(); } return;
    }
    case 'setupForm': {
      const o = {}; ['startBalance', 'currency', 'riskPct', 'maxTrades', 'maxDailyLoss', 'maxConsec', 'maxDD'].forEach((k) => { o[k] = fd.get(k); });
      const renames = [];
      $$('.tl', f).forEach((el) => {
        const key = el.dataset.list; const vals = [];
        $$('.tl-row', el).forEach((r) => { let v = r.querySelector('input').value.trim(); if (key === 'tags') v = cleanTag(v); if (!v || vals.includes(v)) return; vals.push(v); const orig = r.dataset.orig; if (orig && orig !== v && key !== 'checklist') renames.push([key, orig, v]); });
        o[key] = vals.length ? vals : DEF[key];
      });
      o.symbols = { gold: fd.get('sym_gold'), fx: fd.get('sym_fx'), crypto: fd.get('sym_crypto') };
      if (btn) btn.disabled = true; const msg = $('#setupMsg');
      if (await store.save('config', 'settings', o)) {
        let n = 0; const field = { setups: 'setup', mistakes: 'mistakes', tags: 'tags' };
        for (const [key, from, to] of renames) {
          try { if (msg) msg.textContent = `Updating trades: “${from}” → “${to}”…`; n += await store.renameTag(field[key], from, to); } catch (err) { toast('Rename failed for “' + from + '”: ' + err.message); }
          if (key === 'setups') for (const p of entryList('playbook').filter((p) => p.name === from)) { const x = { ...p, name: to }; delete x.id; await store.saveEntry('playbook', p.id, x); }
        }
        S.dirty = false; toast(renames.length ? `Setup saved · ${n} past trade${n === 1 ? '' : 's'} updated` : 'Setup saved'); render();
      } else if (btn) btn.disabled = false;
      return;
    }
  }
});

/* ---------- export ---------- */
function exportCSV() {
  const cols = ['date', 'openTime', 'closeTime', 'kind', 'market', 'symbol', 'dir', 'setup', 'session', 'htf', 'tf', 'entry', 'stop', 'target', 'fill', 'exit', 'riskPct', 'riskAmt', 'R', 'pnl', 'outcome', 'grade', 'emotion', 'mistakes', 'tags', 'exitReason', 'mfe', 'mae', 'why', 'lesson', 'notes', 'shot1', 'shot2', 'shot3'];
  const q = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const T = applyF(S.trades, S.f).sort(byTime);
  const rows = T.map((t) => cols.map((c) => q(c === 'R' ? (fin(t._.r) ? t._.r.toFixed(3) : '') : c === 'pnl' ? (fin(t._.pnl) ? t._.pnl.toFixed(2) : '') : c === 'outcome' ? t._.outcome : c === 'session' ? t._.session : c === 'mistakes' ? (t.mistakes || []).join('; ') : c === 'tags' ? t._.tags.join('; ') : t[c])).join(','));
  const blob = new Blob(['﻿' + [cols.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'trade-journal-' + today() + '.csv';
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast(`CSV downloaded · ${T.length} trades (current filters)`);
}

/* ---------- coach ---------- */
async function runCoach(btn) {
  const ws = S.week || weekStart(today()); const wk = isoWeek(ws);
  const T = S.trades.filter((t) => weekStart(t.date) === ws);
  const out = $('#coachOut'), stEl = $('#coachState');
  if (!T.length) { stEl.textContent = 'Log some trades for this week first.'; return; }
  if (S.demo) { stEl.textContent = 'The coach reviews your real trades — exit example mode first.'; return; }
  if (!store.coachEnabled) { stEl.textContent = 'The coach is off. It only turns on if an Anthropic API key is added to the server.'; return; }
  const s = stats(T); const doc = S.weeks[wk] || {}; const allS = stats(S.trades);
  const trades = T.slice().sort(byTime).map((t) => ({ date: t.date, time: t.openTime, market: t.market, symbol: t.symbol, dir: t.dir, setup: t.setup, session: t._.session, tags: t._.tags, plannedRR: fin(t._.rr) ? +t._.rr.toFixed(2) : null, R: fin(t._.r) ? +t._.r.toFixed(2) : null, status: t._.outcome, grade: t.grade, emotion: t.emotion, mistakes: t.mistakes, exitReason: t.exitReason, why: t.why, lesson: t.lesson }));
  const summary = { trades: s.n, net: +s.net.toFixed(2), winRate: s.wr, expectancy: s.exp, profitFactor: s.pf === Infinity ? 'inf' : s.pf, avgWin: s.avgW, avgLoss: s.avgL, maxDrawdownR: s.dd, ruleAdherence: s.adh, mistakeTrades: s.mistN, netOnMistakeTrades: s.mistR, allTimeExpectancy: allS.exp, allTimeTrades: allS.n };
  const answers = ['wq_pattern', 'wq_edge', 'wq_leak', 'wq_emotion', 'wq_strategy', 'wq_missed', 'wq_habits', 'stop', 'start', 'keep', 'focus', 'keptFocus'].reduce((o, k) => { if (doc[k]) o[k] = doc[k]; return o; }, {});
  const prompt = `You are a strict but supportive trading performance coach reviewing one week of a retail trader's journal. They trade mainly gold (XAUUSD) with a supply-and-demand zone strategy (RBR/DBR/DBD/RBD zones, entries only on retest), plus some FX pairs and crypto. Results are in R multiples (1R = risk per trade). Process grades: A+/A/B = rules followed, C = rule broken, F = impulsive.

Week ${wk}. Summary: ${JSON.stringify(summary)}
Trades: ${JSON.stringify(trades)}
Trader's own review answers: ${JSON.stringify(answers)}

Write a plain-text review (no markdown symbols like # or *; use short headings in capitals and hyphen bullets), at most 300 words, with these sections:
WHAT WORKED - 2-3 points citing specific trades or numbers.
WHAT LEAKED - 2-3 points, focusing on process (mistake tags, emotion, grades, cut winners, oversized losses) more than outcomes.
PATTERNS - anything about sessions, markets, setups, tags or emotional state that the data supports; say plainly if the sample is too small to conclude.
NEXT WEEK - one focus rule, written as a concrete testable rule.
Base everything on the data given. Do not invent trades. Do not give financial advice about specific future trades.`;
  btn.disabled = true; stEl.textContent = 'Reading your week… (about 20 seconds)'; out.hidden = false; out.textContent = '';
  try {
    const r = await store.api('/api/coach', { method: 'POST', body: JSON.stringify({ prompt }) });
    out.textContent = r.text || ''; stEl.textContent = '';
    const o = { ...(S.weeks[wk] || {}), coach: r.text, weekStart: ws };
    if (await store.save('weeks', wk, o)) stEl.textContent = 'Saved with this week’s review';
  } catch (e) { stEl.textContent = e.message; if (!out.textContent) out.hidden = true; }
  finally { btn.disabled = false; }
}

/* ---------- boot ---------- */
route();
store.init();
