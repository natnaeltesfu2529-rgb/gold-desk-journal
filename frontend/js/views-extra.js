/* Gold Desk Journal — growth views: habits, diary, playbook, lessons, study, progress, setup */
'use strict';

/* ================= HABITS ================= */
const habits = () => entryList('habit').filter((h) => !h.archived).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(b.name));
function autoHabit(kind, d) {
  const doc = S.days[d] || {}; const T = S.trades.filter((t) => t.date === d && !t._.missed); const st = S.settings;
  if (kind === 'plan') return !!doc.planDone;
  if (kind === 'recap') return !!doc.recapDone;
  if (kind === 'journal') return T.length ? T.every((t) => t.grade && t._.r != null) : null;
  if (kind === 'limits') { const s = stats(T); return T.length ? !((num(st.maxTrades) && T.length > num(st.maxTrades)) || (num(st.maxDailyLoss) && s.net <= -Math.abs(num(st.maxDailyLoss)))) : null; }
  if (kind === 'nomistake') return T.length ? T.every((t) => !(t.mistakes || []).length) : null;
  return null;
}
/* returns {done:bool|null, value} — null = not applicable that day */
function habitValue(h, d) {
  if (h.auto) { const v = autoHabit(h.auto, d); return { done: v, value: v }; }
  const v = ((S.days[d] || {}).habits || {})[h.id];
  if (v == null || v === '') return { done: false, value: v };
  if (h.type === 'number') return { done: num(v) != null && num(v) >= (num(h.target) || 0.0001), value: v };
  return { done: v === true || v === 'true' || v === 1, value: v };
}
function habitDaySummary(d) {
  const H = habits(); let done = 0, total = 0;
  for (const h of H) { if (h.created && d < h.created) continue; const r = habitValue(h, d); if (r.done === null) continue; total++; if (r.done) done++; }
  return { done, total };
}
function habitStreak(h, upto) {
  let cur = 0, best = 0, run = 0, d = upto || today(); const start = h.created || addDays(d, -365);
  // best over last 365 days
  for (let x = start < addDays(d, -365) ? addDays(d, -365) : start; x <= d; x = addDays(x, 1)) { const r = habitValue(h, x); if (r.done === null) continue; if (r.done) { run++; best = Math.max(best, run); } else run = 0; }
  // current: walk back from today (today not yet done doesn't break it)
  let y = d; const r0 = habitValue(h, y); if (!r0.done) y = addDays(y, -1);
  for (let i = 0; i < 400 && y >= start; i++, y = addDays(y, -1)) { const r = habitValue(h, y); if (r.done === null) continue; if (r.done) cur++; else break; }
  return { cur, best };
}
function habitImpact(h) {
  const yes = [], no = [];
  const days = Array.from(new Set(S.trades.filter((t) => t._.closed).map((t) => t.date)));
  for (const d of days) { const r = habitValue(h, d); if (r.done === null) continue; const T = S.trades.filter((t) => t.date === d && t._.closed); (r.done ? yes : no).push(...T); }
  if (yes.length < 3 || no.length < 3) return null;
  return { yes: stats(yes), no: stats(no) };
}
V.habits = () => {
  const d = S.habitDay || today(); const H = habits(); const sum = habitDaySummary(d);
  const last = Array.from({ length: 30 }, (_, i) => addDays(today(), i - 29));
  const pctSeries = last.map((x) => { const s = habitDaySummary(x); return s.total ? s.done / s.total : null; });
  const cats = Object.keys(HABIT_CATS).filter((c) => c !== 'custom');
  const have = new Set(H.map((h) => h.name));
  return `${pageHead('Habits · the routine behind the results', fDate(d, { weekday: 'long', day: 'numeric', month: 'long' }), 'Tick your habits each day. Habits marked “auto” fill themselves from your plan, recap and trades. Streaks, a 30-day grid and the effect of each habit on your trading are below.',
    `<button class="btn small" data-act="hd-prev" aria-label="Previous day">←</button><input id="habitPick" class="in num w170" type="date" value="${d}" aria-label="Choose day"><button class="btn small" data-act="hd-next" aria-label="Next day">→</button><button class="btn small" data-act="hd-today">Today</button>`)}
  <div class="stack">
  ${!H.length ? `<section class="card empty"><h2>Start with a set of habits</h2><p>Add a ready-made set, then add your own below. You can edit or remove any of them later.</p><div class="row jc">${cats.map((c) => `<button class="btn" data-act="habit-starter" data-cat="${c}">+ ${HABIT_CATS[c]}</button>`).join('')}</div></section>` : `
  <div class="grid dash-top">
    <form id="habitCheck" class="card" autocomplete="off"><div class="card-head"><h2>Check in</h2><span class="hint num">${sum.done} / ${sum.total} done</span></div>
      ${progressBar(sum.total ? sum.done / sum.total : 0, 'gold')}
      <div class="hlist mt14">${H.map((h) => {
        const r = habitValue(h, d); const st = habitStreak(h, d);
        const ctl = h.auto ? `<span class="pill ${r.done ? 'win' : r.done === null ? 'miss' : 'loss'}">${r.done ? 'Done' : r.done === null ? 'No trades' : 'Not yet'}</span>`
          : h.type === 'number' ? `<div class="row nw g6"><input class="in num w90" type="number" step="any" name="h_${esc(h.id)}" value="${esc(r.value ?? '')}" aria-label="${esc(h.name)}"><span class="mut fs13">/ ${esc(h.target)} ${esc(h.unit || '')}</span></div>`
          : `<label class="switch"><input type="checkbox" name="h_${esc(h.id)}" ${r.done ? 'checked' : ''} aria-label="${esc(h.name)}"><span></span></label>`;
        return `<div class="hrow${r.done ? ' done' : ''}"><div><b>${esc(h.name)}</b><span class="mut fs12 block">${esc(HABIT_CATS[h.cat] || 'Custom')}${h.auto ? ' · auto ' + esc(AUTO_LABEL[h.auto] || '') : ''}${st.cur ? ` · <span class="goldc">${st.cur}-day streak</span>` : ''}</span></div>${ctl}</div>`;
      }).join('')}</div>
      <div class="row mt14"><button class="btn primary" type="submit">Save check-in</button><span class="mut fs13">Saved to ${fDate(d)}</span></div>
    </form>
    <section class="card"><div class="card-head"><h2>Last 30 days</h2><span class="hint">Share of habits kept each day</span></div>
      ${lineChart([{ name: 'Habits kept', color: 'var(--gold)', vals: pctSeries }], last.map((x) => fDate(x, { day: 'numeric', month: 'short' })), { unit: '%', min: 0, max: 1, h: 230, w: 460, empty: 'Tick habits for a few days to see the trend.' })}
    </section>
  </div>
  <section class="card"><div class="card-head"><h2>Habit grid</h2><span class="hint">Gold = kept · grey = missed · blank = not applicable</span></div>
    <div class="tbl-wrap"><table class="hgrid"><thead><tr><th>Habit</th>${last.map((x) => `<th title="${fDate(x)}">${parseD(x).getDate()}</th>`).join('')}<th class="r">Streak</th><th class="r">Best</th><th class="r">30d</th></tr></thead><tbody>
    ${H.map((h) => { const st = habitStreak(h); let k = 0, t = 0; const cells = last.map((x) => { if (h.created && x < h.created) return '<td></td>'; const r = habitValue(h, x); if (r.done === null) return '<td></td>'; t++; if (r.done) k++; return `<td><i class="${r.done ? 'on' : 'off'}" title="${fDate(x)}: ${r.done ? 'kept' : 'missed'}"></i></td>`; }).join(''); return `<tr><th scope="row">${esc(h.name)}</th>${cells}<td class="r num goldc">${st.cur}</td><td class="r num">${st.best}</td><td class="r num">${t ? fP(k / t) : '—'}</td></tr>`; }).join('')}
    </tbody></table></div></section>
  <section class="card"><div class="card-head"><h2>Do your habits change your trading?</h2><span class="hint">Your R on days you kept a habit vs days you didn’t</span></div>
    ${(() => { const rows = H.map((h) => ({ h, im: habitImpact(h) })).filter((x) => x.im); if (!rows.length) return '<p class="mut m0">Needs at least 3 closed trades on days you kept a habit and 3 on days you didn’t. Keep ticking — this fills in over time.</p>';
      return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Habit</th><th class="r">Kept: trades</th><th class="r">Kept: R/trade</th><th class="r">Missed: trades</th><th class="r">Missed: R/trade</th><th class="r">Difference</th></tr></thead><tbody>${rows.map(({ h, im }) => { const df = im.yes.exp - im.no.exp; return `<tr><td>${esc(h.name)}</td><td class="r num">${im.yes.n}</td><td class="r num ${tone(im.yes.exp)}">${fR(im.yes.exp)}</td><td class="r num">${im.no.n}</td><td class="r num ${tone(im.no.exp)}">${fR(im.no.exp)}</td><td class="r num ${tone(df)}"><b>${fR(df)}</b></td></tr>`; }).join('')}</tbody></table></div><p class="mut fs12 mt8 m0">A positive difference means you trade better on days you keep that habit. Small samples can mislead — trust it more after a few weeks.</p>`; })()}
  </section>`}
  <section class="card"><div class="card-head"><h2>Manage habits</h2><span class="hint">Add your own or a starter set</span></div>
    <form id="habitForm" class="fields" autocomplete="off">
      ${fld('hn_name', 'Habit', inp('hn_name', '', 'text', '', 'placeholder="e.g. No phone during the London open" required'))}
      ${fld('hn_cat', 'Category', `<select id="hn_cat" name="hn_cat" class="in">${optList(Object.entries(HABIT_CATS), 'custom')}</select>`)}
      ${fld('hn_type', 'Type', `<select id="hn_type" name="hn_type" class="in">${optList([['check', 'Yes / no'], ['number', 'Number with a target']], 'check')}</select>`)}
      ${fld('hn_target', 'Target (numbers only)', inp('hn_target', '', 'number', 'num', 'step="any" placeholder="e.g. 30"'))}
      ${fld('hn_unit', 'Unit', inp('hn_unit', '', 'text', '', 'placeholder="min, h, pages"'))}
      <div class="field"><span class="lbl">&nbsp;</span><button class="btn primary" type="submit">Add habit</button></div>
    </form>
    ${H.length ? `<div class="row mt14">${cats.map((c) => HABIT_TEMPLATES[c].some((t) => !have.has(t.name)) ? `<button class="btn small" data-act="habit-starter" data-cat="${c}">+ ${HABIT_CATS[c]} set</button>` : '').join('')}</div>
    <div class="tbl-wrap mt14"><table class="tbl"><thead><tr><th>Habit</th><th>Category</th><th>Type</th><th class="r">Order / remove</th></tr></thead><tbody>${H.map((h, i) => `<tr><td><input class="in" data-hrename="${esc(h.id)}" value="${esc(h.name)}" aria-label="Rename habit"></td><td>${esc(HABIT_CATS[h.cat] || 'Custom')}</td><td>${h.auto ? 'Auto' : h.type === 'number' ? 'Target ' + esc(h.target) + ' ' + esc(h.unit || '') : 'Yes / no'}</td><td class="r nowrap"><button class="icon-btn" data-act="habit-up" data-id="${esc(h.id)}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">${icon('up', 16)}</button><button class="icon-btn" data-act="habit-down" data-id="${esc(h.id)}" ${i === H.length - 1 ? 'disabled' : ''} aria-label="Move down">${icon('down', 16)}</button><button class="icon-btn danger" data-act="habit-del" data-id="${esc(h.id)}" aria-label="Remove habit">${icon('x', 16)}</button></td></tr>`).join('')}</tbody></table></div>` : ''}
  </section>
  </div>`;
};

/* ================= DIARY ================= */
V.diary = () => {
  const d = S.diaryDay || today(); const doc = S.days[d] || {};
  const q = S.dq.q.toLowerCase(); const mood = S.dq.mood;
  const entries = Object.entries(S.days).filter(([, x]) => x.diary).map(([k, x]) => ({ d: k, ...x }))
    .filter((x) => (!mood || String(x.diaryMood) === mood) && (!q || [x.diaryTitle, x.diary, x.gratitude, x.diaryTags].join(' ').toLowerCase().includes(q)))
    .sort((a, b) => b.d.localeCompare(a.d));
  const moodCount = MOODS.map(([v, l]) => [l, Object.values(S.days).filter((x) => x.diary && String(x.diaryMood) === v).length]);
  const T = S.trades.filter((t) => t.date === d && t._.closed); const ds = stats(T);
  return `${pageHead('Diary · free writing', 'Trading diary', 'Write about your day in your own words: mindset, the market story, life outside trading. Your trades for the day sit next to it so you can see how your mood and your results line up.',
    `<button class="btn small" data-act="dd-prev" aria-label="Previous day">←</button><input id="diaryPick" class="in num w170" type="date" value="${d}" aria-label="Choose day"><button class="btn small" data-act="dd-next" aria-label="Next day">→</button><button class="btn small" data-act="dd-today">Today</button>`)}
  <div class="grid diary-grid">
    <form id="diaryForm" class="card stack g14" autocomplete="off">
      <div class="card-head m0"><h2>${fDate(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>${doc.diary ? '<span class="okc fs13">Saved</span>' : ''}</div>
      ${fld('diaryTitle', 'Title', inp('diaryTitle', doc.diaryTitle, 'text', 'fs17', 'placeholder="A headline for the day"'))}
      <div class="field"><span class="lbl">Mood</span>${radios('diaryMood', MOODS, doc.diaryMood)}</div>
      ${fld('diary', 'Today', ta('diary', doc.diary, 'What happened? What did you feel before, during and after your trades? What is on your mind?', 12))}
      <div class="fields wide">${fld('gratitude', 'One thing that went well', inp('gratitude', doc.gratitude))}${fld('diaryTags', 'Tags', inp('diaryTags', doc.diaryTags, 'text', '', 'placeholder="#tired #patient #news-day"'))}</div>
      <div class="row"><button class="btn primary" type="submit">Save entry</button><span class="mut fs13" id="wordCount">${doc.diary ? doc.diary.trim().split(/\s+/).length + ' words' : ''}</span></div>
    </form>
    <div class="stack">
      <section class="card"><div class="card-head"><h2>That day’s trading</h2></div>${T.length ? `<div class="tiles">${tile('Net', fR(ds.net), tone(ds.net))}${tile('Trades', ds.n)}${tile('Rules', fP(ds.adh))}</div>` : '<p class="mut m0">No closed trades that day.</p>'}${(S.days[d] || {}).q_lesson ? `<p class="mt12 m0 soft fs14"><b>Lesson:</b> ${esc(S.days[d].q_lesson)}</p>` : ''}</section>
      <section class="card"><div class="card-head"><h2>Mood log</h2></div><div class="bars">${moodCount.map(([l, n]) => `<div class="mood-row"><span>${l}</span>${progressBar(n / Math.max(1, ...moodCount.map((x) => x[1])), 'gold')}<span class="num mut">${n}</span></div>`).join('')}</div>
        ${(() => { const by = {}; Object.entries(S.days).forEach(([k, x]) => { if (!x.diaryMood) return; const T2 = S.trades.filter((t) => t.date === k && t._.closed); if (!T2.length) return; (by[x.diaryMood] = by[x.diaryMood] || []).push(...T2); }); const rows = MOODS.filter(([v]) => by[v] && by[v].length >= 2).map(([v, l]) => `<div class="flag"><b>${l}</b><span class="soft">${fR(stats(by[v]).exp)} per trade · ${by[v].length} trades</span></div>`); return rows.length ? `<p class="sec-title mt16">Your R by mood</p>${rows.join('')}` : ''; })()}
      </section>
    </div>
  </div>
  <section class="card mt20"><div class="card-head"><h2>All entries</h2><span class="hint">${entries.length} shown</span></div>
    <div class="frow mb12">${fld('dq_q', 'Search', `<input id="dq_q" class="in" type="search" data-dq="q" value="${esc(S.dq.q)}" placeholder="Search your diary">`, 'grow')}${fld('dq_mood', 'Mood', `<select id="dq_mood" class="in" data-dq="mood">${optList(MOODS, S.dq.mood, [['', 'Any mood']])}</select>`)}</div>
    ${entries.length ? `<div class="entries">${entries.slice(0, 60).map((x) => `<button class="entry" data-diary="${x.d}"><span class="split"><b>${esc(x.diaryTitle || 'Untitled')}</b><span class="mut fs12 num">${fDate(x.d, { day: 'numeric', month: 'short', year: 'numeric' })}</span></span><span class="mut fs12">${x.diaryMood ? esc((MOODS.find((m) => m[0] === String(x.diaryMood)) || [])[1] || '') + ' · ' : ''}${x.diary.trim().split(/\s+/).length} words</span><span class="soft fs14 clamp">${esc(x.diary.slice(0, 260))}</span></button>`).join('')}</div>` : '<p class="mut m0">No diary entries yet. Write your first one above.</p>'}
  </section>`;
};

/* ================= PLAYBOOK ================= */
const PB_FIELDS = [['description', 'What is this setup?', 'In one paragraph: the idea behind it and why it works'], ['context', 'When it works — market conditions', 'Trend, session, volatility, HTF structure'], ['entry', 'Entry rule', 'Exactly what must happen before you click'], ['stop', 'Stop-loss rule', 'Where the stop goes and why'], ['target', 'Target / exit rule', 'TP placement, partials, trailing'], ['management', 'Trade management', 'Break-even, partials, what you do while in'], ['invalidation', 'Do NOT trade it when…', 'News, second retest, against HTF, etc.'], ['mistakes', 'Common mistakes with this setup', '']];
V.playbook = () => {
  const P = entryList('playbook').sort((a, b) => String(a.name).localeCompare(b.name));
  const open = S.pbOpen ? (S.pbOpen === 'new' ? { id: 'new', status: 'Active' } : P.find((p) => p.id === S.pbOpen)) : null;
  if (open) return playbookDetail(open);
  const missing = list(S.settings.setups).filter((s) => !P.some((p) => p.name === s));
  return `${pageHead('Playbook · your rule book', 'Playbook', 'Write down every setup you trade: when it works, the exact entry, stop and target, and when not to trade it. Each setup shows its live results and the trades that used it.', '<button class="btn primary" data-act="pb-new">+ New setup</button>')}
  <div class="stack">
  ${missing.length ? `<div class="alert info split"><span>${missing.length} of your setups have no playbook page yet: ${missing.map(esc).join(', ')}.</span><button class="btn small" data-act="pb-seed">Create pages for them</button></div>` : ''}
  ${P.length ? `<div class="grid g3">${P.map((p) => { const T = S.trades.filter((t) => t.setup === p.name); const s = stats(T); const bt = backtestStats(p.name);
    return `<button class="card pb-card" data-pb="${esc(p.id)}"><span class="split"><span class="pill ${p.status === 'Active' ? 'win' : p.status === 'Retired' ? 'miss' : 'open'}">${esc(p.status || 'Active')}</span><span class="mut fs12">${esc([p.markets, p.timeframes].filter(Boolean).join(' · '))}</span></span><h3>${esc(p.name)}</h3><span class="soft fs14 clamp">${esc(p.description || 'No description yet.')}</span>
      <span class="pb-stats"><span><b class="num">${s.n}</b><i>trades</i></span><span><b class="num">${fP(s.wr)}</b><i>win</i></span><span><b class="num ${tone(s.exp)}">${fR(s.exp)}</b><i>per trade</i></span><span><b class="num ${tone(s.net)}">${fR(s.net, 1)}</b><i>total</i></span></span>
      ${bt.n ? `<span class="mut fs12">Backtest: ${bt.n} trades · ${fP(bt.wr)} win · ${fR(bt.exp)}/trade</span>` : ''}</button>`; }).join('')}</div>` : `<section class="card empty"><h2>Your playbook is empty</h2><p>Start by creating a page for each of your setups, then fill in the rules. The trade log will show these rules when you pick the setup.</p><div class="row jc"><button class="btn primary" data-act="pb-seed">Create pages for my setups</button><button class="btn" data-act="pb-new">Write a new setup</button></div></section>`}
  </div>`;
};
function playbookDetail(p) {
  const isNew = p.id === 'new'; const T = isNew ? [] : S.trades.filter((t) => t.setup === p.name); const s = stats(T); const bt = backtestStats(p.name);
  return `${pageHead('Playbook', isNew ? 'New setup' : esc(p.name), isNew ? 'Name it exactly as it appears in your setup list so trades link to it.' : 'Rules on the left, live evidence on the right. Edit and save any time.', '<button class="btn" data-act="pb-back">← All setups</button>')}
  <div class="grid pb-grid">
    <form id="pbForm" class="card stack g14" autocomplete="off" data-id="${esc(p.id)}">
      <div class="fields">${fld('pb_name', 'Setup name', inp('pb_name', p.name, 'text', '', `list="pbSetups" required`) + `<datalist id="pbSetups">${list(S.settings.setups).map((x) => `<option value="${esc(x)}">`).join('')}</datalist>`)}
        ${fld('pb_status', 'Status', `<select id="pb_status" name="pb_status" class="in">${optList(['Active', 'Testing', 'Retired'], p.status)}</select>`)}
        ${fld('pb_markets', 'Markets', inp('pb_markets', p.markets, 'text', '', 'placeholder="XAUUSD, EURUSD"'))}
        ${fld('pb_timeframes', 'Timeframes', inp('pb_timeframes', p.timeframes, 'text', '', 'placeholder="H4 zone · M15 entry"'))}</div>
      ${PB_FIELDS.map(([k, l, ph]) => fld('pb_' + k, l, ta('pb_' + k, p[k], ph, k === 'description' ? 4 : 3))).join('')}
      ${fld('pb_checklist', 'Setup checklist — one item per line', ta('pb_checklist', lines(p.checklist).join('\n'), 'Fresh zone\nHTF trend agrees\nEngulfing candle on M15', 5))}
      ${fld('pb_examples', 'Example charts — one link per line', ta('pb_examples', lines(p.examples).join('\n'), 'https://www.tradingview.com/x/…', 3))}
      <div class="split"><div class="row"><button class="btn primary" type="submit">${isNew ? 'Create setup' : 'Save playbook'}</button></div>${isNew ? '' : '<button class="btn danger" type="button" data-act="pb-del">Delete page</button>'}</div>
    </form>
    <div class="stack">
      ${isNew ? '<section class="card"><p class="mut m0">Live results appear here once the setup is saved and trades use it.</p></section>' : `
      <section class="card"><div class="card-head"><h2>Live results</h2><span class="hint">${s.n} closed trades</span></div>
        <div class="tiles">${tile('Win rate', fP(s.wr))}${tile('Expectancy', fR(s.exp), tone(s.exp))}${tile('Total', fR(s.net), tone(s.net))}${tile('Rules', fP(s.adh))}</div>
        <div class="mt14">${equitySVG(s, 220, 480)}</div></section>
      <section class="card"><div class="card-head"><h2>Backtest vs live</h2><a class="hint" href="#study">Log a backtest →</a></div>${bt.n ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th class="r">Trades</th><th class="r">Win %</th><th class="r">R/trade</th></tr></thead><tbody><tr><td>Backtest</td><td class="r num">${bt.n}</td><td class="r num">${fP(bt.wr)}</td><td class="r num ${tone(bt.exp)}">${fR(bt.exp)}</td></tr><tr><td>Live</td><td class="r num">${s.n}</td><td class="r num">${fP(s.wr)}</td><td class="r num ${tone(s.exp)}">${fR(s.exp)}</td></tr></tbody></table></div>${s.n >= 10 && fin(bt.exp) && fin(s.exp) && s.exp < bt.exp - 0.3 ? '<p class="alert bad mt12 m0">Live results are well below your backtest. That usually points to execution — check the mistake tags on these trades.</p>' : ''}` : '<p class="mut m0">No backtests logged for this setup yet.</p>'}</section>
      <section class="card"><div class="card-head"><h2>By market & session</h2></div>${barsBlock(groupBy(T, (t) => MARKETS[t.market] || 'Other'))}<div class="mt14">${barsBlock(groupBy(T, (t) => t._.session), null, [...SESSIONS, '—'])}</div></section>
      <section class="card"><div class="card-head"><h2>Mistakes on this setup</h2></div>${mistakeTable(T)}</section>
      <section class="card"><div class="card-head"><h2>Trades</h2></div>${tradeRows(T.slice().sort(byTime).reverse().slice(0, 12), { empty: 'No trades with this setup yet.' })}</section>
      ${lines(p.examples).length ? `<section class="card"><div class="card-head"><h2>Examples</h2></div><ul class="links">${lines(p.examples).map((u) => /^https?:\/\//.test(u) ? `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a></li>` : `<li>${esc(u)}</li>`).join('')}</ul></section>` : ''}`}
    </div>
  </div>`;
}
function backtestStats(setup) {
  const B = entryList('study').filter((e) => e.type === 'Backtest' && e.setup === setup);
  const n = B.reduce((a, e) => a + (num(e.btTrades) || 0), 0), w = B.reduce((a, e) => a + (num(e.btWins) || 0), 0), r = B.reduce((a, e) => a + (num(e.btR) || 0), 0);
  return { n, wr: n ? w / n : null, exp: n ? r / n : null, net: r };
}

/* ================= LESSONS ================= */
function allLessons() {
  const out = [];
  for (const t of S.trades) if (t.lesson) out.push({ key: 't:' + t.id, src: 'Trade', text: t.lesson, date: t.date, cat: '', pinned: !!t.lessonPinned, meta: `${t.symbol || ''} · ${t.setup || ''} · ${fR(t._.r)}`, ref: t.id });
  for (const [d, x] of Object.entries(S.days)) if (x.q_lesson) out.push({ key: 'd:' + d, src: 'Daily recap', text: x.q_lesson, date: d, cat: '', pinned: !!x.lessonPinned, meta: 'Daily recap', ref: d });
  for (const [w, x] of Object.entries(S.weeks)) if (x.wq_lesson) out.push({ key: 'w:' + w, src: 'Weekly review', text: x.wq_lesson, date: x.weekStart || '', cat: '', pinned: !!x.lessonPinned, meta: w, ref: w });
  for (const e of entryList('lesson')) out.push({ key: 'l:' + e.id, src: 'My notes', text: e.text, title: e.title, date: e.date, cat: e.cat || '', pinned: !!e.pinned, meta: e.source || '', ref: e.id });
  for (const e of entryList('study')) if (e.takeaways) out.push({ key: 's:' + e.id, src: 'Study', text: e.takeaways, title: e.topic, date: e.date, cat: '', pinned: !!e.pinned, meta: e.type, ref: e.id });
  return out.sort((a, b) => (b.pinned - a.pinned) || String(b.date).localeCompare(String(a.date)));
}
V.lessons = () => {
  const L = allLessons(); const q = S.lq.q.toLowerCase();
  const F = L.filter((l) => (!S.lq.src || l.src === S.lq.src) && (!S.lq.cat || l.cat === S.lq.cat) && (!q || [l.text, l.title, l.meta].join(' ').toLowerCase().includes(q)));
  const pinned = F.filter((l) => l.pinned), rest = F.filter((l) => !l.pinned);
  const ed = S.lessonEdit ? entryList('lesson').find((e) => e.id === S.lessonEdit) : null;
  const card = (l) => `<article class="lesson${l.pinned ? ' pinned' : ''}"><div class="split"><span class="pill">${esc(l.src)}</span><span class="row g6"><span class="mut fs12 num">${l.date ? fDate(l.date, { day: 'numeric', month: 'short', year: '2-digit' }) : ''}</span><button class="icon-btn${l.pinned ? ' on' : ''}" data-act="lesson-pin" data-key="${esc(l.key)}" aria-pressed="${l.pinned}" aria-label="${l.pinned ? 'Unpin' : 'Pin'} lesson">${icon('pin', 16)}</button>${l.src === 'My notes' ? `<button class="icon-btn" data-act="lesson-edit" data-id="${esc(l.ref)}" aria-label="Edit lesson">✎</button>` : ''}</span></div>${l.title ? `<h3>${esc(l.title)}</h3>` : ''}<p>${esc(l.text)}</p><span class="mut fs12">${esc([l.cat, l.meta].filter(Boolean).join(' · '))}${l.src === 'Trade' ? ` · <a href="#log" data-edit="${esc(l.ref)}">open trade</a>` : ''}</span></article>`;
  return `${pageHead('Lessons library', 'Lessons', 'Every lesson you have written — from trades, daily recaps, weekly reviews, study sessions and your own notes — in one searchable place. Pin the ones you want to see every day.', '')}
  <div class="grid pb-grid">
    <div class="stack">
      <section class="card"><div class="frow">${fld('lq_q', 'Search', `<input id="lq_q" class="in" type="search" data-lq="q" value="${esc(S.lq.q)}" placeholder="Search lessons">`, 'grow')}${fld('lq_src', 'Source', `<select id="lq_src" class="in" data-lq="src">${optList(['Trade', 'Daily recap', 'Weekly review', 'Study', 'My notes'], S.lq.src, [['', 'All sources']])}</select>`)}${fld('lq_cat', 'Category', `<select id="lq_cat" class="in" data-lq="cat">${optList(LESSON_CATS, S.lq.cat, [['', 'All categories']])}</select>`)}</div></section>
      ${pinned.length ? `<p class="sec-title">${icon('pin', 14)} Pinned</p><div class="lessons">${pinned.map(card).join('')}</div>` : ''}
      <p class="sec-title">${rest.length} lesson${rest.length === 1 ? '' : 's'}</p>
      ${rest.length ? `<div class="lessons">${rest.map(card).join('')}</div>` : `<p class="mut">${L.length ? 'Nothing matches.' : 'No lessons yet. Write one here, or add a lesson when you log a trade.'}</p>`}
    </div>
    <form id="lessonForm" class="card stack g14 sticky-col" autocomplete="off" data-id="${ed ? esc(ed.id) : ''}">
      <h2>${ed ? 'Edit lesson' : 'Write a lesson'}</h2>
      ${fld('ln_title', 'Title', inp('ln_title', ed && ed.title, 'text', '', 'placeholder="Short and memorable"'))}
      ${fld('ln_text', 'Lesson', ta('ln_text', ed && ed.text, 'What did you learn, and what will you do differently?', 6))}
      <div class="fields">${fld('ln_cat', 'Category', `<select id="ln_cat" name="ln_cat" class="in">${optList(LESSON_CATS, ed ? ed.cat : 'Execution')}</select>`)}${fld('ln_source', 'Source (optional)', inp('ln_source', ed && ed.source, 'text', '', 'placeholder="Video, mentor, trade #…"'))}</div>
      <label class="chk"><input type="checkbox" name="ln_pinned" ${ed && ed.pinned ? 'checked' : ''}><span>Pin to the top</span></label>
      <div class="split"><div class="row"><button class="btn primary" type="submit">${ed ? 'Save' : 'Add lesson'}</button>${ed ? '<button class="btn" type="button" data-act="lesson-cancel">Cancel</button>' : ''}</div>${ed ? '<button class="btn danger" type="button" data-act="lesson-del">Delete</button>' : ''}</div>
    </form>
  </div>`;
};

/* ================= STUDY ================= */
V.study = () => {
  const E = entryList('study').sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const ed = S.studyEdit ? E.find((e) => e.id === S.studyEdit) : null; const e = ed || { date: today(), type: 'Video lesson' };
  const td = today(); const ws = weekStart(td);
  const minIn = (a, b) => E.filter((x) => x.date >= a && x.date <= b).reduce((s, x) => s + (num(x.minutes) || 0), 0);
  const wks = weekBuckets(12);
  const byType = STUDY_TYPES.map((t) => ({ key: t, m: E.filter((x) => x.type === t).reduce((s, x) => s + (num(x.minutes) || 0), 0) })).filter((x) => x.m);
  let streak = 0; for (let d = td; ; d = addDays(d, -1)) { if (E.some((x) => x.date === d)) streak++; else if (d !== td) break; if (streak > 400) break; }
  const setups = Array.from(new Set(E.filter((x) => x.type === 'Backtest' && x.setup).map((x) => x.setup)));
  const shown = S.sq.type ? E.filter((x) => x.type === S.sq.type) : E;
  return `${pageHead('Study tracker · deliberate practice', 'Study', 'Log every video lesson, backtest and chart review. Backtests feed your playbook so you can compare tested results with live ones. Takeaways go to your Lessons library.', '')}
  <div class="stack">
  <div class="tiles">${tile('This week', fH(minIn(ws, addDays(ws, 6))), '', 'Study time')}${tile('This month', fH(minIn(monthKey(td) + '-01', monthEnd(monthKey(td)))), '', 'Study time')}${tile('All time', fH(minIn('0000', '9999')), '', E.length + ' sessions')}${tile('Study streak', streak + ' day' + (streak === 1 ? '' : 's'), streak ? 'goldc' : '', 'Days in a row')}</div>
  <div class="grid pb-grid">
    <form id="studyForm" class="card stack g14" autocomplete="off" data-id="${ed ? esc(ed.id) : ''}">
      <h2>${ed ? 'Edit session' : 'Log a study session'}</h2>
      <div class="fields">${fld('st_date', 'Date', inp('st_date', e.date, 'date', 'num'))}${fld('st_type', 'Type', `<select id="st_type" name="st_type" class="in">${optList(STUDY_TYPES, e.type)}</select>`)}${fld('st_minutes', 'Minutes', inp('st_minutes', e.minutes, 'number', 'num', 'min="0" step="5"'))}</div>
      <div class="fields wide">${fld('st_topic', 'Topic', inp('st_topic', e.topic, 'text', '', 'placeholder="e.g. Part 2 — Fibonacci confluence"'))}${fld('st_setup', 'Setup (optional)', `<select id="st_setup" name="st_setup" class="in">${optList(knownSetups(), e.setup, [['', '—']])}</select>`)}</div>
      <fieldset id="btFields" class="fields" ${e.type === 'Backtest' ? '' : 'hidden'}><legend class="lbl span-all">Backtest results</legend>${fld('st_market', 'Market', inp('st_market', e.market, 'text', 'num', 'placeholder="XAUUSD"'))}${fld('st_btTrades', 'Trades tested', inp('st_btTrades', e.btTrades, 'number', 'num', 'min="0"'))}${fld('st_btWins', 'Wins', inp('st_btWins', e.btWins, 'number', 'num', 'min="0"'))}${fld('st_btR', 'Total R', inp('st_btR', e.btR, 'number', 'num', 'step="any"'))}${fld('st_period', 'Period tested', inp('st_period', e.period, 'text', '', 'placeholder="Jan–Jun 2026"'))}</fieldset>
      ${fld('st_notes', 'Notes', ta('st_notes', e.notes, 'What did you cover?', 4))}
      ${fld('st_takeaways', 'Key takeaway (goes to your Lessons library)', ta('st_takeaways', e.takeaways, 'The one thing to remember', 2))}
      <div class="split"><div class="row"><button class="btn primary" type="submit">${ed ? 'Save' : 'Log session'}</button>${ed ? '<button class="btn" type="button" data-act="study-cancel">Cancel</button>' : ''}</div>${ed ? '<button class="btn danger" type="button" data-act="study-del">Delete</button>' : ''}</div>
    </form>
    <div class="stack">
      <section class="card"><div class="card-head"><h2>Study time per week</h2><span class="hint">Last 12 weeks</span></div>${barChart(wks.map((w) => ({ label: fDate(w, { day: 'numeric', month: 'short' }), y: minIn(w, addDays(w, 6)) / 60 })), { color: 'var(--gold)', unit: 'h', w: 480, fmt: (v) => v.toFixed(1) + 'h', empty: 'Log a session to start the chart.', label: 'Study hours per week' })}</section>
      <section class="card"><div class="card-head"><h2>By type</h2></div>${byType.length ? `<div class="bars">${byType.sort((a, b) => b.m - a.m).map((x) => `<div class="mood-row"><span>${esc(x.key)}</span>${progressBar(x.m / Math.max(...byType.map((y) => y.m)), 'gold')}<span class="num mut">${fH(x.m)}</span></div>`).join('')}</div>` : '<p class="mut m0">Nothing logged yet.</p>'}</section>
    </div>
  </div>
  <section class="card"><div class="card-head"><h2>Backtest vs live</h2><span class="hint">Per setup</span></div>${setups.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Setup</th><th class="r">Backtest trades</th><th class="r">BT win %</th><th class="r">BT R/trade</th><th class="r">Live trades</th><th class="r">Live win %</th><th class="r">Live R/trade</th><th class="r">Gap</th></tr></thead><tbody>${setups.map((su) => { const b = backtestStats(su); const l = stats(S.trades.filter((t) => t.setup === su)); const gap = fin(b.exp) && fin(l.exp) ? l.exp - b.exp : null; return `<tr><td>${esc(su)}</td><td class="r num">${b.n}</td><td class="r num">${fP(b.wr)}</td><td class="r num ${tone(b.exp)}">${fR(b.exp)}</td><td class="r num">${l.n}</td><td class="r num">${fP(l.wr)}</td><td class="r num ${tone(l.exp)}">${fR(l.exp)}</td><td class="r num ${tone(gap)}">${fR(gap)}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="mut m0">Log a session with type “Backtest” and a setup to compare tested and live results.</p>'}</section>
  <section class="card"><div class="card-head"><h2>Sessions</h2><select class="in w200" data-sq="type" aria-label="Filter by type">${optList(STUDY_TYPES, S.sq.type, [['', 'All types']])}</select></div>
    ${shown.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Type</th><th>Topic</th><th>Setup</th><th class="r">Time</th><th>Takeaway</th></tr></thead><tbody>${shown.slice(0, 100).map((x) => `<tr class="click" data-study="${esc(x.id)}" tabindex="0"><td class="num nowrap">${fDate(x.date)}</td><td>${esc(x.type)}</td><td>${esc(x.topic || '—')}</td><td>${esc(x.setup || '—')}</td><td class="r num">${fH(num(x.minutes) || 0)}</td><td class="soft">${esc((x.takeaways || '').slice(0, 90))}</td></tr>`).join('')}</tbody></table></div>` : '<p class="mut m0">No sessions yet.</p>'}
  </section></div>`;
};

/* ================= PROGRESS: learning curve, levels, badges ================= */
const LEVELS = [{ name: 'Novice', min: 0 }, { name: 'Apprentice', min: 200 }, { name: 'Developing', min: 600 }, { name: 'Disciplined', min: 1200 }, { name: 'Consistent', min: 2500 }, { name: 'Professional', min: 5000 }, { name: 'Elite', min: 9000 }, { name: 'Master', min: 15000 }];
function computeXP() {
  const parts = {};
  const add = (k, v) => { parts[k] = (parts[k] || 0) + v; };
  for (const t of S.liveTrades) { if (t._.missed) { add('Missed setups logged', 5); continue; } if (t._.closed) add('Trades logged', 10); if (t.grade === 'A+' || t.grade === 'A') add('A-grade execution', 10); else if (t.grade === 'B') add('A-grade execution', 5); if (t.lesson) add('Lessons written', 3); }
  for (const x of Object.values(S.days)) { if (x.planDone) add('Plans written', 10); if (x.recapDone) add('Recaps written', 10); if (x.diary) add('Diary entries', 5); }
  for (const x of Object.values(S.weeks)) if (x.done) add('Weekly reviews', 40);
  for (const x of Object.values(S.months)) if (x.done) add('Monthly audits', 80);
  const H = habits(); for (const d of Object.keys(S.days)) for (const h of H) { if (h.auto) continue; if (habitValue(h, d).done) add('Habits kept', 3); }
  for (const e of entryList('study')) add('Study time', Math.floor((num(e.minutes) || 0) / 5));
  add('Playbook pages', entryList('playbook').length * 20); add('Lessons written', entryList('lesson').length * 5);
  const xp = Object.values(parts).reduce((a, b) => a + b, 0);
  return { xp, parts };
}
function levelInfo(x) { const xp = x.xp; let idx = 0; LEVELS.forEach((l, i) => { if (xp >= l.min) idx = i; }); const cur = LEVELS[idx], next = LEVELS[idx + 1]; return { xp, idx, name: cur.name, next, frac: next ? (xp - cur.min) / (next.min - cur.min) : 1, parts: x.parts }; }
function weekdayStreak(test) { let best = 0, run = 0; const ds = Object.keys(S.days).sort(); if (!ds.length) return 0; for (let d = ds[0]; d <= today(); d = addDays(d, 1)) { if (!isWeekday(d)) continue; if (test(d)) { run++; best = Math.max(best, run); } else if (d !== today()) run = 0; } return best; }
function badges() {
  const T = S.liveTrades.filter((t) => t._.closed).sort(byTime); const n = T.length;
  let clean = 0, cleanBest = 0; T.forEach((t) => { if (!(t.mistakes || []).length && t.grade && GOOD_GRADES.includes(t.grade)) { clean++; cleanBest = Math.max(cleanBest, clean); } else clean = 0; });
  const months = groupBy(T, (t) => monthKey(t.date));
  const studyMin = entryList('study').reduce((a, e) => a + (num(e.minutes) || 0), 0);
  const habitBest = Math.max(0, ...habits().map((h) => habitStreak(h).best));
  const B = [
    ['First step', 'Log your first trade', Math.min(n, 1), 1],
    ['Getting serious', 'Log 50 trades', n, 50], ['Centurion', 'Log 100 trades', n, 100], ['Veteran', 'Log 250 trades', n, 250],
    ['Planner', '5 weekdays in a row with a pre-session plan', weekdayStreak((d) => (S.days[d] || {}).planDone), 5],
    ['Iron routine', '20 weekdays in a row with a plan', weekdayStreak((d) => (S.days[d] || {}).planDone), 20],
    ['Clean ten', '10 trades in a row graded A+/A/B with no mistakes', cleanBest, 10],
    ['Sniper', '10 A+ trades', T.filter((t) => t.grade === 'A+').length, 10],
    ['Patient', 'Log 10 missed setups instead of chasing them', S.liveTrades.filter((t) => t._.missed).length, 10],
    ['Reviewer', 'Complete 4 weekly reviews', Object.values(S.weeks).filter((w) => w.done).length, 4],
    ['Auditor', 'Complete 3 monthly audits', Object.values(S.months).filter((m) => m.done).length, 3],
    ['Disciplined month', 'A month with 10+ trades and 90%+ rule adherence', months.some((g) => g.s.n >= 10 && g.s.adh >= 0.9) ? 1 : 0, 1],
    ['Green month', 'A month with 10+ trades and positive R', months.some((g) => g.s.n >= 10 && g.s.net > 0) ? 1 : 0, 1],
    ['Student', '10 hours of study logged', Math.floor(studyMin / 60), 10], ['Scholar', '50 hours of study logged', Math.floor(studyMin / 60), 50],
    ['Habit formed', 'Keep any habit 21 days in a row', habitBest, 21],
    ['Writer', '30 diary entries', Object.values(S.days).filter((x) => x.diary).length, 30],
    ['Rule maker', 'Write 3 playbook pages', entryList('playbook').length, 3],
    ['Lesson keeper', 'Collect 25 lessons', allLessons().length, 25]
  ];
  return B.map(([name, desc, cur, goal]) => ({ name, desc, cur: Math.min(cur, goal), goal, done: cur >= goal }));
}
V.progress = () => {
  const lv = levelInfo(computeXP()); const B = badges(); const earned = B.filter((b) => b.done).length;
  const T = S.trades.filter((t) => t._.closed).sort(byTime);
  const W = 20; const roll = T.map((_, i) => i + 1 >= Math.min(W, 5) ? stats(T.slice(Math.max(0, i + 1 - W), i + 1)) : null);
  const rLabels = T.map((t, i) => '#' + (i + 1));
  const wks = weekBuckets(16); const wS = wks.map((w) => stats(S.trades.filter((t) => weekStart(t.date) === w)));
  const wl = wks.map((w) => fDate(w, { day: 'numeric', month: 'short' }));
  const q = Math.floor(T.length / 4); const first = q >= 5 ? stats(T.slice(0, q)) : null, lastQ = q >= 5 ? stats(T.slice(-q)) : null;
  const cmp = first ? [['Win rate', first.wr, lastQ.wr, fP, true], ['Expectancy', first.exp, lastQ.exp, fR, true], ['Rule adherence', first.adh, lastQ.adh, fP, true], ['Trades with mistakes', first.mistRate, lastQ.mistRate, fP, false], ['Average loss', first.avgL, lastQ.avgL, (x) => fN(x) + 'R', false], ['Average emotional state', first.avgEmo, lastQ.avgEmo, (x) => fN(x, 1), false]] : [];
  return `${pageHead('Progress · your learning curve', 'Progress', 'Are you getting better? These charts follow your process and results over time. Levels and badges reward the habits that build a consistent trader, not lucky wins.', '')}
  <div class="stack">
  <div class="grid dash-top">
    <section class="card level-big"><span class="eyebrow">Level ${lv.idx + 1} of ${LEVELS.length}</span><span class="lvl-name xl">${esc(lv.name)}</span><span class="num mut">${lv.xp.toLocaleString()} XP</span>${progressBar(lv.frac, 'gold')}<span class="mut fs13">${lv.next ? `${(lv.next.min - lv.xp).toLocaleString()} XP to <b class="fg">${esc(lv.next.name)}</b>` : 'You reached the top level.'}</span>
      <div class="levels">${LEVELS.map((l, i) => `<span class="${i <= lv.idx ? 'on' : ''}" title="${l.min.toLocaleString()} XP">${esc(l.name)}</span>`).join('')}</div></section>
    <section class="card"><div class="card-head"><h2>Where your XP comes from</h2></div>${Object.keys(lv.parts).length ? `<div class="bars">${Object.entries(lv.parts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="mood-row"><span>${esc(k)}</span>${progressBar(v / Math.max(...Object.values(lv.parts)), 'gold')}<span class="num mut">${v}</span></div>`).join('')}</div>` : '<p class="mut m0">Log trades, plans, habits and study to earn XP.</p>'}<p class="mut fs12 mt12 m0">XP rewards process: +10 per trade logged, +10 for an A grade, +10 per plan and recap, +40 per weekly review, +3 per habit kept, +1 per 5 minutes of study.</p></section>
  </div>
  <section class="card"><div class="card-head"><h2>Badges</h2><span class="hint">${earned} of ${B.length} earned</span></div>
    <div class="badges">${B.map((b) => `<div class="badge${b.done ? ' on' : ''}"><span class="bicon">${icon(b.done ? 'star' : 'lock', 20)}</span><div><b>${esc(b.name)}</b><span class="mut fs12 block">${esc(b.desc)}</span>${b.done ? '' : progressBar(b.cur / b.goal) + `<span class="mut fs12 num">${b.cur} / ${b.goal}</span>`}</div></div>`).join('')}</div></section>
  <section class="card"><div class="card-head"><h2>Learning curve — rolling ${W}-trade expectancy</h2><span class="hint">Above zero and rising = you are improving</span></div>
    ${lineChart([{ name: 'Expectancy (R/trade)', color: 'var(--pos)', vals: roll.map((s) => s ? s.exp : null) }], rLabels, { unit: 'R', zero: true, w: 1000, h: 260, empty: 'Needs at least 5 closed trades.', label: 'Rolling expectancy' })}</section>
  <div class="grid g2">
    <section class="card"><div class="card-head"><h2>Win rate & rule adherence</h2><span class="hint">Rolling ${W} trades</span></div>${lineChart([{ name: 'Rule adherence', color: 'var(--gold)', vals: roll.map((s) => s ? s.adh : null) }, { name: 'Win rate', color: 'var(--pos)', vals: roll.map((s) => s ? s.wr : null) }], rLabels, { unit: '%', min: 0, max: 1, empty: 'Needs at least 5 closed trades.' })}</section>
    <section class="card"><div class="card-head"><h2>Mistake rate</h2><span class="hint">Share of trades with a mistake, rolling ${W}</span></div>${lineChart([{ name: 'Trades with mistakes', color: 'var(--neg)', vals: roll.map((s) => s ? s.mistRate : null) }], rLabels, { unit: '%', min: 0, max: 1, empty: 'Needs at least 5 closed trades.' })}</section>
    <section class="card"><div class="card-head"><h2>Net R per week</h2><span class="hint">Last 16 weeks</span></div>${barChart(wks.map((w, i) => ({ label: wl[i], y: wS[i].n ? wS[i].net : 0 })), { unit: 'R', fmt: (v) => fR(v), label: 'Net R per week' })}</section>
    <section class="card"><div class="card-head"><h2>Process per week</h2><span class="hint">Habits kept & rule adherence</span></div>${lineChart([{ name: 'Habits kept', color: 'var(--gold)', vals: wks.map((w) => { let d = 0, t = 0; for (let i = 0; i < 7; i++) { const s = habitDaySummary(addDays(w, i)); d += s.done; t += s.total; } return t ? d / t : null; }) }, { name: 'Rule adherence', color: 'var(--pos)', vals: wS.map((s) => s.adh) }], wl, { unit: '%', min: 0, max: 1 })}</section>
  </div>
  <section class="card"><div class="card-head"><h2>Then vs now</h2><span class="hint">${first ? `Your first ${q} trades vs your latest ${q}` : 'Needs at least 20 closed trades'}</span></div>
    ${first ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Measure</th><th class="r">First ${q}</th><th class="r">Latest ${q}</th><th class="r">Change</th></tr></thead><tbody>${cmp.map(([l, a, b, f, up]) => { const better = fin(a) && fin(b) ? (up ? b > a : b < a) : null; return `<tr><td>${l}</td><td class="r num mut">${f(a)}</td><td class="r num">${f(b)}</td><td class="r ${better == null || a === b ? '' : better ? 'pos' : 'neg'}">${better == null || a === b ? '—' : better ? '▲ better' : '▼ worse'}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="mut m0">Keep logging. Once you have 20 closed trades, this compares your earliest quarter of trades with your latest.</p>'}</section>
  </div>`;
};

/* ================= SETUP: account, rules, tag list editor ================= */
const TAG_LISTS = [['setups', 'Setups', 'setup', 'Used on every trade and in your playbook'], ['mistakes', 'Mistake tags', 'mistakes', 'Tagged on trades that broke a rule'], ['tags', 'Trade tags', 'tags', 'Your own #tags — suggestions in the trade log'], ['checklist', 'Pre-trade checklist', null, 'Every item must be ticked for a GO verdict']];
function tagEditor(key, title, hint, renamable) {
  const items = list(S.settings[key]);
  const usage = (v) => key === 'setups' ? S.trades.filter((t) => t.setup === v).length : key === 'mistakes' ? S.trades.filter((t) => (t.mistakes || []).includes(v)).length : key === 'tags' ? S.trades.filter((t) => t._.tags.includes(v)).length : null;
  return `<section class="card tl-card"><div class="card-head"><h2>${title}</h2><span class="hint">${hint}</span></div>
    <div class="tl" data-list="${key}">${items.map((v) => { const u = usage(v); return `<div class="tl-row" data-orig="${esc(v)}"><input class="in" value="${esc(v)}" aria-label="${title} item"><span class="mut fs12 num nowrap">${u != null ? u + ' trades' : ''}</span><button type="button" class="icon-btn" data-act="tl-up" aria-label="Move up">${icon('up', 16)}</button><button type="button" class="icon-btn" data-act="tl-down" aria-label="Move down">${icon('down', 16)}</button><button type="button" class="icon-btn danger" data-act="tl-del" aria-label="Remove">${icon('x', 16)}</button></div>`; }).join('')}</div>
    <div class="row mt12"><input class="in grow" data-tladd="${key}" placeholder="Add ${title.toLowerCase().replace(/s$/, '')}…" aria-label="New item"><button type="button" class="btn small" data-act="tl-add" data-key="${key}">Add</button></div>
    ${renamable ? '<p class="mut fs12 mt8 m0">Rename an item here and, when you save, every past trade using the old name is updated too.</p>' : ''}
  </section>`;
}
V.setup = () => {
  const st = S.settings;
  return `${pageHead('Your rules & lists', 'Setup', 'Set your account and risk rules once. Edit, rename, reorder or remove any of your lists — renames update your past trades so your stats stay connected.', '')}
  <form id="setupForm" class="stack" autocomplete="off">
  <section class="card"><div class="card-head"><h2>Account and risk</h2></div><div class="fields">
    ${fld('startBalance', 'Starting balance', inp('startBalance', st.startBalance, 'number', 'num', 'step="any"'))}
    ${fld('currency', 'Currency symbol', inp('currency', st.currency, 'text', 'num', 'maxlength="4"'))}
    ${fld('riskPct', 'Default risk per trade %', inp('riskPct', st.riskPct, 'number', 'num', 'step="0.05"'))}
    ${fld('maxTrades', 'Max trades per day', inp('maxTrades', st.maxTrades, 'number', 'num'))}
    ${fld('maxDailyLoss', 'Max daily loss (R)', inp('maxDailyLoss', st.maxDailyLoss, 'number', 'num', 'step="0.5"'))}
    ${fld('maxConsec', 'Stop after losses in a row', inp('maxConsec', st.maxConsec, 'number', 'num'))}
    ${fld('maxDD', 'Max drawdown before cutting risk (R)', inp('maxDD', st.maxDD, 'number', 'num'))}
  </div></section>
  <div class="grid g2">${TAG_LISTS.map(([k, t, field, h]) => tagEditor(k, t, h, !!field)).join('')}</div>
  <section class="card"><div class="card-head"><h2>Symbols you trade</h2><span class="hint">Comma separated — suggestions in the trade log</span></div><div class="fields wide">
    ${fld('sym_gold', 'Gold', inp('sym_gold', st.symbols.gold))}${fld('sym_fx', 'FX pairs', inp('sym_fx', st.symbols.fx))}${fld('sym_crypto', 'Crypto', inp('sym_crypto', st.symbols.crypto))}
  </div></section>
  <div class="row sticky-save"><button class="btn primary" type="submit">Save setup</button><span class="mut fs13" id="setupMsg"></span></div>
  </form>`;
};
