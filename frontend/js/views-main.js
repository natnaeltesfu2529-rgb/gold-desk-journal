/* Gold Desk Journal — main views: dashboard, trade log, trades, daily, weekly, monthly */
'use strict';

/* ---------- form helpers ---------- */
function optList(arr, sel, extra) { return (extra || []).concat(arr).map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(sel ?? '') ? 'selected' : ''}>${esc(l)}</option>`; }).join(''); }
function radios(name, opts, sel, cls) { return `<div class="seg ${cls || ''}" role="radiogroup">${opts.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<label><input type="radio" name="${name}" value="${esc(v)}" ${String(v) === String(sel ?? '') ? 'checked' : ''}><span>${esc(l)}</span></label>`; }).join('')}</div>`; }
function checks(name, opts, selArr, cls) { const sel = new Set(selArr || []); return `<div class="seg ${cls || ''}">${opts.map((v) => `<label><input type="checkbox" name="${name}" value="${esc(v)}" ${sel.has(v) ? 'checked' : ''}><span>${esc(v)}</span></label>`).join('')}</div>`; }
const fld = (id, label, inner, cls) => `<div class="field ${cls || ''}"><label for="${id}">${label}</label>${inner}</div>`;
const inp = (id, v, type = 'text', cls = '', extra = '') => `<input id="${id}" name="${id}" class="in ${cls}" type="${type}" value="${esc(v ?? '')}" ${extra}>`;
const ta = (id, v, ph = '', rows) => `<textarea id="${id}" name="${id}" class="in" placeholder="${esc(ph)}" ${rows ? 'rows="' + rows + '"' : ''}>${esc(v ?? '')}</textarea>`;
const pageHead = (eyebrow, title, guide, right) => `<div class="page-head"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1>${guide ? `<p class="guide">${guide}</p>` : ''}</div>${right ? `<div class="row">${right}</div>` : ''}</div>`;
const knownSetups = () => Array.from(new Set(list(S.settings.setups).concat(S.trades.map((t) => t.setup).filter(Boolean))));

/* ---------- filter bar (dashboard + trades) ---------- */
function filterBar() {
  const f = S.f; const n = activeFilterCount(f);
  const sel = (k, label, opts, allLabel) => fld('f_' + k, label, `<select id="f_${k}" class="in" data-f="${k}">${optList(opts, f[k], [['', allLabel]])}</select>`);
  const chips = [];
  const lab = { market: (v) => MARKETS[v], dir: (v) => v === 'short' ? 'Short' : 'Long', mistake: (v) => v === '__any' ? 'Any mistake' : v === '__none' ? 'No mistakes' : v, tag: (v) => '#' + v, emotion: (v) => v === 'calm' ? 'Calm (1–2)' : 'Emotional (3+)', q: (v) => '“' + v + '”' };
  ['market', 'symbol', 'setup', 'session', 'dir', 'outcome', 'grade', 'mistake', 'tag', 'emotion', 'q'].forEach((k) => { if (f[k]) chips.push(`<button class="chip" data-fclear="${k}" aria-label="Remove filter">${esc((lab[k] || ((v) => v))(f[k]))} ${icon('x', 12)}</button>`); });
  return `<section class="card filters" aria-label="Filters">
    <div class="frow">
      ${fld('f_period', 'Period', `<select id="f_period" class="in" data-f="period">${optList(PERIODS, f.period)}</select>`)}
      ${f.period === 'custom' ? fld('f_from', 'From', `<input id="f_from" class="in num" type="date" data-f="from" value="${esc(f.from)}">`) + fld('f_to', 'To', `<input id="f_to" class="in num" type="date" data-f="to" value="${esc(f.to)}">`) : ''}
      ${fld('f_q', 'Search', `<input id="f_q" class="in" type="search" data-f="q" value="${esc(f.q)}" placeholder="Notes, tags, setups, lessons…">`, 'grow')}
      <div class="field"><span class="lbl">&nbsp;</span><button class="btn" data-act="f-toggle" aria-expanded="${S.fOpen}">${icon('filter', 16)} More filters${n ? ` <span class="count">${n}</span>` : ''}</button></div>
    </div>
    ${S.fOpen ? `<div class="fgrid">
      ${sel('market', 'Market', Object.entries(MARKETS), 'All markets')}
      ${sel('symbol', 'Symbol', allSymbols(), 'All symbols')}
      ${sel('setup', 'Setup', knownSetups(), 'All setups')}
      ${sel('session', 'Session', SESSIONS, 'All sessions')}
      ${sel('dir', 'Direction', [['long', 'Long'], ['short', 'Short']], 'Both')}
      ${sel('outcome', 'Outcome', ['Win', 'Loss', 'BE', 'Open', 'Missed'], 'All outcomes')}
      ${sel('grade', 'Grade', GRADES, 'All grades')}
      ${sel('mistake', 'Mistakes', [['__any', 'Any mistake'], ['__none', 'No mistakes'], ...list(S.settings.mistakes)], 'Any or none')}
      ${sel('tag', 'Tag', allTags().map((t) => [t, '#' + t]), 'All tags')}
      ${sel('emotion', 'Emotional state', [['calm', 'Calm (1–2)'], ['hot', 'Emotional (3+)']], 'Any')}
    </div>` : ''}
    ${chips.length ? `<div class="chips"><span class="mut fs13">${periodLabel(f)} ·</span>${chips.join('')}<button class="linkbtn fs13" data-act="f-clear">Clear all</button></div>` : ''}
  </section>`;
}

/* ---------- dashboard ---------- */
V.dashboard = () => {
  if (!S.loaded.trades) return `<div class="card empty"><h2>Loading your journal…</h2><p>Your trades, plans and reviews will appear here in a moment.</p></div>`;
  const T = applyF(S.trades, S.f); const s = stats(T);
  const td = today(); const dayDoc = S.days[td] || {};
  const todays = S.trades.filter((t) => t.date === td && !t._.missed); const tS = stats(todays);
  const lastWeek = isoWeek(addDays(weekStart(td), -7)); const lastMonth = addMonths(monthKey(td), -1);
  const hab = habitDaySummary(td);
  const steps = [
    [!!dayDoc.planDone, 'Pre-session plan', 'Bias, zones, news, limits', '#daily'],
    [hab.total > 0 && hab.done === hab.total, 'Habits', hab.total ? `${hab.done} of ${hab.total} done today` : 'Set up your habits', '#habits'],
    [todays.length > 0, 'Log trades', todays.length ? `${todays.length} logged today` : 'None logged today', '#log'],
    [!!dayDoc.recapDone, 'Daily recap', 'After your last trade', '#daily'],
    [!!dayDoc.diary, 'Diary', 'A few lines on your day', '#diary'],
    [!!(S.weeks[lastWeek] || {}).done, 'Weekly review', `Last week · ${lastWeek}`, '#weekly']
  ];
  const st = S.settings; const alerts = [];
  const maxT = num(st.maxTrades), maxL = num(st.maxDailyLoss), maxC = num(st.maxConsec);
  if (maxT && todays.length >= maxT) alerts.push(['bad', `Trade limit reached: ${todays.length} of ${maxT} trades today. You are done for the day.`]);
  if (maxL && tS.net <= -Math.abs(maxL)) alerts.push(['bad', `Daily loss limit hit: ${fR(tS.net)} (limit −${Math.abs(maxL)}R). Close the platform.`]);
  if (maxC && tS.curType === 'L' && tS.curStreak >= maxC) alerts.push(['bad', `${tS.curStreak} losses in a row today. Your rule says stop after ${maxC}.`]);
  if (num(dayDoc.emotion) >= 4) alerts.push(['bad', 'You rated your state 4+ this morning. No new trades today.']);
  if (!alerts.length && todays.length) alerts.push(['good', `Within limits: ${todays.length}${maxT ? '/' + maxT : ''} trades, ${fR(tS.net)} today.`]);
  const focus = (S.days[addDays(td, -1)] || {}).tomorrow || dayDoc.focus || (S.weeks[isoWeek(td)] || {}).focus || (S.weeks[lastWeek] || {}).focus;
  if (focus) alerts.unshift(['info', `<b>Focus:</b> ${esc(focus)}`]);
  if (!(S.months[lastMonth] || {}).done && parseD(td).getDate() <= 7 && S.trades.some((t) => monthKey(t.date) === lastMonth)) alerts.push(['info', `Monthly audit for ${fMonth(lastMonth)} is due. <a href="#monthly">Open it</a>.`]);
  const lv = levelInfo(computeXP());
  const empty = !S.trades.length;
  return `
  ${pageHead(fDate(td, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), 'Dashboard', 'Your routine for today, then how your trading is performing. Every number is in R (1R = the amount you risked), so gold, FX and crypto compare fairly.', '<a class="btn primary" href="#log">+ Log a trade</a>')}
  <div class="stack">
    <div class="grid dash-top">
      <section class="card" aria-labelledby="rt"><div class="card-head"><h2 id="rt">Today’s routine</h2><span class="hint">Tap a step to open it</span></div>
        <div class="routine">${steps.map(([done, t, d, h]) => `<a class="step${done ? ' done' : ''}" href="${h}"><span class="dot" aria-hidden="true"></span><span><span class="t">${t}</span><br><span class="d">${esc(d)}</span><span class="visually-hidden">${done ? ' — done' : ''}</span></span></a>`).join('')}</div>
        ${alerts.length ? `<div class="alerts mt14">${alerts.map(([c, t]) => `<div class="alert ${c}">${t}</div>`).join('')}</div>` : ''}
      </section>
      <a class="card level-card" href="#progress"><span class="eyebrow">Your level</span><span class="lvl-name">${esc(lv.name)}</span><span class="mut fs13">Level ${lv.idx + 1} · ${lv.xp.toLocaleString()} XP</span>${progressBar(lv.frac, 'gold')}<span class="mut fs12">${lv.next ? (lv.next.min - lv.xp).toLocaleString() + ' XP to ' + esc(lv.next.name) : 'Top level reached'}</span></a>
    </div>
    ${empty ? `<div class="card empty"><h2>No trades yet</h2><p>Log your first trade and this page fills with your equity curve, win rate, expectancy and where your edge is. Want to see it working first?</p><div class="row jc"><a class="btn primary" href="#log">Log first trade</a><button class="btn" data-act="demo-on">Show with example trades</button></div></div>` : `
    ${filterBar()}
    <div class="split"><span class="mut fs13">${T.filter((t) => t._.closed).length} closed trades in view</span><span class="mut fs13">${balanceNow() != null ? 'Balance now <b class="num fg">' + fMoney(balanceNow()) + '</b>' : '<a href="#setup">Set your starting balance</a> to track $'}</span></div>
    ${kpiTiles(s)}
    <div class="grid g2">
      <section class="card"><div class="card-head"><h2>Equity curve</h2><span class="hint">Cumulative R, trade by trade</span></div>${equitySVG(s)}</section>
      <section class="card"><div class="card-head"><h2>What the numbers say</h2><span class="hint">Updated as you log</span></div>${insightsHTML(insights(T))}</section>
    </div>
    <div class="grid g3">
      <section class="card"><div class="card-head"><h2>By market</h2></div>${barsBlock(groupBy(T, (t) => MARKETS[t.market] || 'Other'))}</section>
      <section class="card"><div class="card-head"><h2>By setup</h2></div>${barsBlock(groupBy(T, (t) => t.setup || 'No setup'))}</section>
      <section class="card"><div class="card-head"><h2>By session</h2><span class="hint">EAT</span></div>${barsBlock(groupBy(T, (t) => t._.session), null, [...SESSIONS, '—'])}</section>
      <section class="card"><div class="card-head"><h2>By tag</h2></div>${barsBlock(groupBy(T, (t) => t._.tags.map((x) => '#' + x)), 'Add #tags to trades to see this.')}</section>
      <section class="card"><div class="card-head"><h2>By weekday</h2></div>${barsBlock(groupBy(T, (t) => DOW[dowIdx(t.date)]), null, DOW)}</section>
      <section class="card"><div class="card-head"><h2>By emotional state</h2></div>${barsBlock(groupBy(T, (t) => t.emotion ? 'State ' + t.emotion : ''), 'Rate your emotional state on each trade to see this.', ['State 1', 'State 2', 'State 3', 'State 4', 'State 5'])}</section>
      <section class="card"><div class="card-head"><h2>By direction</h2></div>${barsBlock(groupBy(T, (t) => t.dir === 'short' ? 'Short' : 'Long'))}</section>
      <section class="card"><div class="card-head"><h2>By grade</h2></div>${barsBlock(groupBy(T, (t) => t.grade || ''), 'Grade your trades to see this.', GRADES)}</section>
      <section class="card"><div class="card-head"><h2>By hour opened</h2><span class="hint">EAT</span></div>${barsBlock(groupBy(T, (t) => t.openTime ? t.openTime.slice(0, 2) + ':00' : ''), 'Add open times to see this.', Array.from({ length: 24 }, (_, i) => pad(i) + ':00'))}</section>
    </div>
    <div class="grid g2">
      <section class="card"><div class="card-head"><h2>Cost of mistakes</h2></div>${mistakeTable(T)}</section>
      <section class="card"><div class="card-head"><h2>Symbols</h2></div>${groupTable(groupBy(T, (t) => (t.symbol || '—').toUpperCase()), 'Symbol')}</section>
    </div>
    <section class="card"><div class="card-head"><h2>Trades in view</h2><a href="#journal" class="hint">Open in Trades →</a></div>${tradeRows(T.slice().sort(byTime).reverse().slice(0, 10))}</section>`}
  </div>`;
};

/* ---------- trade log ---------- */
V.log = () => {
  const ed = S.editId ? S.trades.find((t) => t.id === S.editId) : null;
  const st = S.settings; const bal = balanceNow();
  const t = ed || { kind: 'taken', date: today(), market: S.lastMarket || 'gold', dir: 'long', riskPct: st.riskPct, session: 'Auto', checks: [], mistakes: [], tags: [] };
  const riskAmt = t.riskAmt ?? (bal != null && num(t.riskPct) != null ? (bal * num(t.riskPct) / 100).toFixed(2) : '');
  const syms = list(st.symbols[t.market] || ''); const cl = list(st.checklist);
  const tagStr = (Array.isArray(t.tags) ? t.tags : parseTags(t.tags)).map((x) => '#' + x).join(' ');
  return `
  ${pageHead(ed ? 'Editing trade' : 'New trade', ed ? esc((ed.symbol || 'Trade') + ' · ' + fDate(ed.date)) : 'Log a trade', 'Fill part 1 before you enter — the checklist must say GO. Fill part 2 while in the trade and part 3 within 15 minutes of closing. Save at any stage; open trades can be finished later.', ed ? '<button class="btn" data-act="new-trade">+ New trade instead</button>' : '')}
  <form id="tradeForm" class="stack" novalidate autocomplete="off">
    <section class="card">
      <div class="phase"><span class="n">01</span><h2>Before — the plan</h2><span class="hint">Before you click buy or sell</span></div>
      <div class="stack g18">
        <div class="row" style="gap:24px;align-items:flex-start">
          <div class="field"><span class="lbl">Entry type</span>${radios('kind', [['taken', 'Trade taken'], ['missed', 'Missed setup']], t.kind)}</div>
          <div class="field"><span class="lbl">Market</span>${radios('market', Object.entries(MARKETS), t.market)}</div>
          <div class="field"><span class="lbl">Direction</span>${radios('dir', [['long', 'Long'], ['short', 'Short']], t.dir)}</div>
        </div>
        <div class="fields">
          ${fld('date', 'Date', inp('date', t.date, 'date', 'num', 'required'))}
          ${fld('openTime', 'Open time (EAT)', inp('openTime', t.openTime, 'time', 'num'))}
          ${fld('symbol', 'Symbol', inp('symbol', t.symbol, 'text', 'num', `list="symlist" placeholder="${esc(syms[0] || '')}"`) + `<datalist id="symlist">${syms.map((s) => `<option value="${esc(s)}">`).join('')}</datalist>`)}
          ${fld('setup', 'Setup', `<select id="setup" name="setup" class="in">${optList(list(st.setups).concat('Other'), t.setup)}</select>`)}
          ${fld('session', 'Session', `<select id="session" name="session" class="in">${optList(SESSIONS, t.session, [['Auto', 'Auto from open time']])}</select>`)}
          ${fld('htf', 'HTF bias (D1/H4)', `<select id="htf" name="htf" class="in">${optList(['Bullish', 'Bearish', 'Range'], t.htf)}</select>`)}
          ${fld('tf', 'Entry timeframe', `<select id="tf" name="tf" class="in">${optList(['M1', 'M5', 'M15', 'M30', 'H1', 'H4'], t.tf || 'M15')}</select>`)}
        </div>
        <div id="pbHint"></div>
        <div class="fields">
          ${fld('entry', 'Entry price', inp('entry', t.entry, 'number', 'num', 'step="any" inputmode="decimal"'))}
          ${fld('stop', 'Stop loss', inp('stop', t.stop, 'number', 'num', 'step="any" inputmode="decimal"'))}
          ${fld('target', 'Take profit', inp('target', t.target, 'number', 'num', 'step="any" inputmode="decimal"'))}
          ${fld('riskPct', 'Risk %', inp('riskPct', t.riskPct, 'number', 'num', 'step="0.05" inputmode="decimal"'))}
          ${fld('riskAmt', `Risk in ${esc(st.currency)} (1R)`, inp('riskAmt', riskAmt, 'number', 'num', `step="any" inputmode="decimal" placeholder="${bal == null ? 'set balance in Setup' : ''}"`))}
        </div>
        <div id="calcOut"></div>
        ${fld('why', 'Why this trade? Zone, confluence, trigger', ta('why', t.why, 'e.g. Fresh H4 DBR demand, first retest, 61.8% fib inside zone, bullish engulfing on M15'))}
        <div class="field"><label for="tags">Tags — type with # or spaces, tap a suggestion to add</label>${inp('tags', tagStr, 'text', '', 'placeholder="#liquidity-sweep #london-open"')}
          <div class="seg sm" id="tagSugg">${allTags().map((x) => `<button type="button" class="chip" data-addtag="${esc(x)}">#${esc(x)}</button>`).join('')}</div></div>
        <div class="grid g2 g24">
          <fieldset><legend class="split w100 pb6"><span class="lbl">Pre-trade checklist</span><span class="num mut" id="chkScore"></span></legend>
            ${cl.map((c, i) => `<label class="chk"><input type="checkbox" name="checks" value="${i}" ${(t.checks || []).map(String).includes(String(i)) ? 'checked' : ''}><span>${esc(c)}</span></label>`).join('')}
          </fieldset>
          <div class="stack g16"><div id="verdict"></div>
            <div class="field"><span class="lbl">Emotional state before entry</span>${radios('emotion', ['1', '2', '3', '4', '5'], t.emotion)}<span class="mut fs13">1 calm · 3 impatient · 5 tilted — at 4+ no new trades</span></div>
          </div>
        </div>
        <fieldset data-market="gold" class="fields" ${t.market === 'gold' ? '' : 'hidden'}><legend class="lbl span-all">Gold details</legend>
          ${fld('g_news', 'USD news within 30 min', `<select id="g_news" name="g_news" class="in">${optList(['None', 'CPI', 'NFP', 'FOMC', 'PPI', 'Retail sales', 'Fed speaker', 'Other high impact'], t.g_news)}</select>`)}
          ${fld('g_dxy', 'DXY direction today', `<select id="g_dxy" name="g_dxy" class="in">${optList(['Up', 'Down', 'Flat'], t.g_dxy)}</select>`)}
          ${fld('g_spread', 'Spread at entry', inp('g_spread', t.g_spread, 'text', 'num'))}
        </fieldset>
        <fieldset data-market="fx" class="fields" ${t.market === 'fx' ? '' : 'hidden'}><legend class="lbl span-all">FX details</legend>
          ${fld('f_corr', 'Correlated open positions', inp('f_corr', t.f_corr, 'text', '', 'placeholder="none / long GBPUSD"'))}
          ${fld('f_news', 'News for both currencies', inp('f_news', t.f_news))}
          ${fld('f_spread', 'Spread (pips)', inp('f_spread', t.f_spread, 'text', 'num'))}
        </fieldset>
        <fieldset data-market="crypto" class="fields" ${t.market === 'crypto' ? '' : 'hidden'}><legend class="lbl span-all">Crypto details</legend>
          ${fld('c_ex', 'Exchange · contract', inp('c_ex', t.c_ex, 'text', '', 'placeholder="Binance · perpetual"'))}
          ${fld('c_lev', 'Leverage', inp('c_lev', t.c_lev, 'text', 'num', 'placeholder="5x"'))}
          ${fld('c_liq', 'Liquidation price', inp('c_liq', t.c_liq, 'text', 'num'))}
          ${fld('c_fund', 'Funding rate', inp('c_fund', t.c_fund, 'text', 'num', 'placeholder="0.01%"'))}
          ${fld('c_btc', 'BTC direction', `<select id="c_btc" name="c_btc" class="in">${optList(['Up', 'Down', 'Range', 'Trading BTC itself'], t.c_btc)}</select>`)}
        </fieldset>
        <div class="fields wide">
          ${fld('shot1', 'Screenshot 1 · HTF with zones (link)', inp('shot1', t.shot1, 'url', '', 'placeholder="TradingView snapshot link"'))}
          ${fld('shot2', 'Screenshot 2 · entry timeframe (link)', inp('shot2', t.shot2, 'url', '', 'placeholder="TradingView snapshot link"'))}
        </div>
      </div>
    </section>

    <section class="card" data-taken ${t.kind === 'missed' ? 'hidden' : ''}>
      <div class="phase"><span class="n">02</span><h2>During — management</h2><span class="hint">Only what you actually did</span></div>
      <div class="stack g16">
        <div class="fields">
          ${fld('fill', 'Actual fill price', inp('fill', t.fill, 'number', 'num', 'step="any" placeholder="if different from entry"'))}
          ${fld('size', 'Position size (lots / coins)', inp('size', t.size, 'text', 'num'))}
          ${fld('be', 'Moved stop to break-even?', `<select id="be" name="be" class="in">${optList(['No', 'Yes — by plan', 'Yes — out of fear'], t.be)}</select>`)}
          ${fld('widen', 'Widened the stop?', `<select id="widen" name="widen" class="in">${optList(['No', 'Yes'], t.widen)}</select>`)}
          ${fld('partial', 'Partial close', inp('partial', t.partial, 'text', '', 'placeholder="50% at 1R"'))}
        </div>
        ${fld('during', 'What I felt and did while in the trade', ta('during', t.during))}
      </div>
    </section>

    <section class="card">
      <div class="phase"><span class="n">03</span><h2>After — the review</h2><span class="hint" id="afterHint">${t.kind === 'missed' ? 'Where would it have exited? Optional' : 'Within 15 minutes of closing'}</span></div>
      <div class="stack g16">
        <div class="fields">
          ${fld('exit', 'Exit price', inp('exit', t.exit, 'number', 'num', 'step="any" inputmode="decimal"'))}
          ${fld('closeTime', 'Close time', inp('closeTime', t.closeTime, 'time', 'num'))}
          ${fld('pnl', `Actual P&amp;L ${esc(st.currency)} (after fees, optional)`, inp('pnl', t.pnl, 'number', 'num', 'step="any" placeholder="use for partial closes"'))}
          ${fld('exitReason', 'Exit reason', `<select id="exitReason" name="exitReason" class="in">${optList(['Take profit hit', 'Stop loss hit', 'Manual — by plan', 'Manual — emotional', 'Break-even stop', 'Trailing stop'], t.exitReason)}</select>`)}
          ${fld('mfe', 'Best point reached (R)', inp('mfe', t.mfe, 'number', 'num', 'step="0.1"'))}
          ${fld('mae', 'Worst point reached (R)', inp('mae', t.mae, 'number', 'num', 'step="0.1"'))}
        </div>
        <div id="resultOut"></div>
        <div class="field" data-taken ${t.kind === 'missed' ? 'hidden' : ''}><span class="lbl">Process grade — how you traded, not whether you won</span>${radios('grade', GRADES, t.grade)}<span class="mut fs13">A+ every rule, top setup · A every rule · B one minor slip · C a rule broken · F impulsive</span></div>
        <div class="field" data-taken ${t.kind === 'missed' ? 'hidden' : ''}><span class="lbl">Mistake tags — tap all that apply</span>${checks('mistakes', list(st.mistakes), t.mistakes, 'bad')}</div>
        <div class="fields wide">
          ${fld('good', 'What I did well', ta('good', t.good))}
          ${fld('diff', t.kind === 'missed' ? 'Why I didn’t take it' : 'What I would do differently', ta('diff', t.diff))}
        </div>
        ${fld('lesson', 'Lesson — one sentence (goes to your Lessons library)', inp('lesson', t.lesson, 'text', '', 'placeholder="e.g. Second retest of a zone is weaker — only trade the first touch"'))}
        ${fld('notes', 'Notes — anything else, as long as you like', ta('notes', t.notes, 'Market story, what you saw on other timeframes, how the news played out, ideas to test…', 6))}
        ${fld('shot3', 'Screenshot 3 · after exit (link)', inp('shot3', t.shot3, 'url', '', 'placeholder="TradingView snapshot link"'))}
      </div>
    </section>
    <div class="split"><div class="row"><button class="btn primary" type="submit">${ed ? 'Save changes' : 'Save trade'}</button><a class="btn" href="#journal">Cancel</a><span class="err" id="formErr" role="alert"></span></div>
    ${ed ? '<button class="btn danger" type="button" data-act="del-trade">Delete trade</button>' : ''}</div>
  </form>`;
};

function readTradeForm(f) {
  const fd = new FormData(f); const o = {};
  for (const [k, v] of fd.entries()) { if (k === 'checks' || k === 'mistakes') (o[k] = o[k] || []).push(v); else o[k] = v; }
  o.checks = o.checks || []; o.mistakes = o.mistakes || []; o.tags = parseTags(o.tags);
  return o;
}
function updateCalc() {
  const f = $('#tradeForm'); if (!f) return;
  const o = readTradeForm(f); const c = calc(o); const st = S.settings;
  const risk = num(o.riskAmt);
  let sizeL = 'Lots (100 oz/lot)', size = null, note = 'Gold: lots = risk ÷ (stop distance × 100). Check your broker’s contract size.';
  if (o.market === 'fx') { sizeL = 'Lots (100k units)'; note = 'For pairs quoted in USD (EURUSD, GBPUSD, AUDUSD). For JPY and crosses use your broker’s pip value.'; }
  if (o.market === 'crypto') { sizeL = 'Position (coins)'; note = 'Coins = risk ÷ stop distance. Leverage changes margin, not risk — keep liquidation beyond the stop.'; }
  if (c.dist && risk != null) size = o.market === 'gold' ? risk / (c.dist * 100) : o.market === 'fx' ? risk / c.dist / 100000 : risk / c.dist;
  const long = o.dir !== 'short'; const pe = num(o.entry), sp = num(o.stop);
  const wrong = pe != null && sp != null && (long ? sp >= pe : sp <= pe);
  $('#calcOut').innerHTML = `${wrong ? `<p class="alert bad m0 mb10">Stop is on the wrong side of entry for a ${long ? 'long' : 'short'}.</p>` : ''}<div class="calc">${tile('Risk (1R)', risk != null ? fMoney(risk) : '—')}${tile('Stop distance', fN(c.dist, o.market === 'fx' ? 5 : 2))}${tile('Planned R:R', fin(c.rr) ? '1 : ' + c.rr.toFixed(2) : '—', !fin(c.rr) ? '' : c.rr >= 2 ? 'pos' : 'neg')}${tile(sizeL, fN(size, o.market === 'crypto' ? 4 : 2))}${tile('Potential profit', fin(c.rr) && risk != null ? fMoney(c.rr * risk) : '—', 'pos')}</div><p class="mut fs12 mt8 m0">${note}</p>`;
  const cl = list(st.checklist); const n = o.checks.length; const emo = num(o.emotion);
  $('#chkScore').textContent = n + ' / ' + cl.length;
  const go = n === cl.length && !(emo >= 4) && !wrong;
  $('#verdict').innerHTML = o.kind === 'missed' ? `<div class="verdict info"><span class="lbl">Missed setup</span><span class="big">LOGGED ONLY</span><span class="mut fs14">Missed setups are tracked separately and don’t count in your stats.</span></div>`
    : go ? `<div class="verdict go"><span class="lbl okc">Verdict</span><span class="big">GO</span><span class="fs14 soft">Every box ticked. Screenshot the chart, then place the order.</span></div>`
    : `<div class="verdict no"><span class="lbl negc">Verdict</span><span class="big">NO TRADE</span><span class="fs14 soft">${emo >= 4 ? 'Emotional state is 4 or higher. ' : ''}Every box must be ticked. If you still want in, log it as a missed setup.</span></div>`;
  const res = c.r;
  $('#resultOut').innerHTML = res == null ? '' : `<div class="calc">${tile(o.kind === 'missed' ? 'Would have made' : 'Result', fR(res), tone(res))}${o.kind === 'missed' ? '' : tile('P&L', fM(c.pnl), tone(c.pnl))}${tile('Outcome', c.outcome === 'Missed' ? (res > 0.1 ? 'Win' : res < -0.1 ? 'Loss' : 'BE') : c.outcome, tone(res))}${fin(c.hold) ? tile('Time in trade', fH(c.hold)) : ''}</div>`;
  $$('fieldset[data-market]', f).forEach((fs) => { fs.hidden = fs.dataset.market !== o.market; });
  $$('[data-taken]', f).forEach((el) => { el.hidden = o.kind === 'missed'; });
  $('#afterHint').textContent = o.kind === 'missed' ? 'Where would it have exited? Optional' : 'Within 15 minutes of closing';
  const sl = $('#symlist'); if (sl && sl.dataset.m !== o.market) { sl.dataset.m = o.market; sl.innerHTML = list(st.symbols[o.market] || '').map((s) => `<option value="${esc(s)}">`).join(''); $('#symbol').placeholder = list(st.symbols[o.market] || '')[0] || ''; }
  const pb = entryList('playbook').find((p) => p.name === o.setup);
  const ss = stats(S.trades.filter((t) => t.setup === o.setup));
  $('#pbHint').innerHTML = pb ? `<div class="pb-hint"><div class="split"><b>${icon('playbook', 16)} Playbook · ${esc(pb.name)}</b><span class="mut fs13">${ss.n ? `${ss.n} trades · ${fP(ss.wr)} win · ${fR(ss.exp)}/trade` : 'No trades yet'}</span></div><div class="pb-rules">${pb.entry ? `<div><span class="lbl">Entry</span>${esc(pb.entry)}</div>` : ''}${pb.stop ? `<div><span class="lbl">Stop</span>${esc(pb.stop)}</div>` : ''}${pb.target ? `<div><span class="lbl">Target</span>${esc(pb.target)}</div>` : ''}${pb.invalidation ? `<div><span class="lbl">Invalid if</span>${esc(pb.invalidation)}</div>` : ''}</div></div>`
    : (o.setup && o.setup !== 'Other' ? `<p class="mut fs13 m0">No playbook written for “${esc(o.setup)}” yet. <a href="#playbook">Write one</a> so its rules show here.</p>` : '');
  const tg = new Set(o.tags); $$('#tagSugg [data-addtag]').forEach((b) => b.classList.toggle('on', tg.has(b.dataset.addtag)));
}

/* ---------- trades ---------- */
V.journal = () => {
  let T = applyF(S.trades, S.f); T.sort(byTime).reverse();
  const s = stats(T);
  return `${pageHead('Every trade, newest first', 'Trades', 'Filter to study one market, setup, tag or outcome. Search looks through your notes and lessons too. Tap a row to open, finish or edit it.', '<button class="btn" data-act="export">Export CSV</button><a class="btn primary" href="#log">+ Log a trade</a>')}
  <div class="stack">${filterBar()}
  ${kpiTiles(s, true)}
  <section class="card"><div class="card-head"><h2>${T.length} entr${T.length === 1 ? 'y' : 'ies'}</h2><span class="hint">${T.filter((t) => t._.outcome === 'Open').length} open · ${T.filter((t) => t._.missed).length} missed setups</span></div>${tradeRows(T, { empty: S.trades.length ? 'No trades match these filters.' : 'No trades yet — log your first one.' })}</section>
  </div>`;
};

/* ---------- daily ---------- */
V.daily = () => {
  const d = S.day || today(); const doc = S.days[d] || {}; const st = S.settings;
  const wl = doc.watch || [{ sym: 'XAUUSD' }, {}, {}, {}];
  const prevFocus = (S.days[addDays(d, -1)] || {}).tomorrow;
  const hab = habitDaySummary(d);
  return `${pageHead('Daily · plan in the morning, recap at night', fDate(d, { weekday: 'long', day: 'numeric', month: 'long' }), 'Part one takes 10 minutes before your first session. Part two takes 10 minutes after your last trade. Your trades for the day appear automatically.',
    `<button class="btn small" data-act="day-prev" aria-label="Previous day">←</button><input id="dayPick" class="in num w170" type="date" value="${d}" aria-label="Choose day"><button class="btn small" data-act="day-next" aria-label="Next day">→</button><button class="btn small" data-act="day-today">Today</button>`)}
  <form id="dayForm" class="stack" autocomplete="off">
  ${prevFocus ? `<div class="alert info"><b>Yesterday you wrote:</b> ${esc(prevFocus)}</div>` : ''}
  <div class="grid g3">
    <a class="card mini-link" href="#habits"><span class="eyebrow">Habits</span><b class="num fs22">${hab.done} / ${hab.total}</b>${progressBar(hab.total ? hab.done / hab.total : 0)}<span class="mut fs13">${hab.total ? 'Tick them off →' : 'Set up your habits →'}</span></a>
    <a class="card mini-link" href="#diary"><span class="eyebrow">Diary</span><b class="fs16">${doc.diary ? esc(doc.diaryTitle || 'Written') : 'Not written yet'}</b><span class="mut fs13">${doc.diary ? (doc.diary.split(/\s+/).length + ' words →') : 'Write a few lines →'}</span></a>
    <a class="card mini-link" href="#playbook"><span class="eyebrow">Playbook</span><b class="fs16">${entryList('playbook').length} setups written</b><span class="mut fs13">Read it before the session →</span></a>
  </div>
  <section class="card">
    <div class="phase"><span class="n">AM</span><h2>Pre-session plan</h2><span class="hint">Before your first session</span></div>
    <div class="stack g16">
      <div class="tiles">${[['Asia (Tokyo)', '03:00–12:00'], ['London', '11:00–20:00'], ['London–NY overlap', '16:00–20:00'], ['New York', '16:00–01:00']].map(([a, b]) => tile(a, b, '', 'EAT')).join('')}</div>
      <p class="mut fs13 m0">East Africa Time, November–March. From late March London and New York open one hour earlier.</p>
      <div class="fields wide">
        ${fld('news', 'High-impact news today (time · event)', ta('news', doc.news, 'e.g. 16:30 US CPI — no gold trades 16:00–17:00'))}
        ${fld('context', 'Market context — DXY, yields, BTC, risk mood', ta('context', doc.context))}
      </div>
      <div class="field"><span class="lbl">Watchlist — maximum 4 symbols</span>
        <div class="tbl-wrap"><table class="tbl" style="min-width:820px"><thead><tr><th style="width:14%">Symbol</th><th style="width:12%">HTF bias</th><th style="width:22%">Key zones</th><th>If … then …</th><th style="width:20%">Invalidation</th></tr></thead><tbody>
        ${[0, 1, 2, 3].map((i) => { const w = wl[i] || {}; return `<tr><td><input class="in num" name="w_sym_${i}" aria-label="Symbol ${i + 1}" value="${esc(w.sym)}"></td><td><select class="in" name="w_bias_${i}" aria-label="Bias ${i + 1}">${optList(['', 'Bull', 'Bear', 'Range'], w.bias)}</select></td><td><input class="in num" name="w_zone_${i}" aria-label="Zones ${i + 1}" value="${esc(w.zone)}"></td><td><input class="in" name="w_plan_${i}" aria-label="Plan ${i + 1}" value="${esc(w.plan)}" placeholder="${i === 0 ? 'If price retests demand and M15 confirms → long' : ''}"></td><td><input class="in" name="w_inv_${i}" aria-label="Invalidation ${i + 1}" value="${esc(w.inv)}"></td></tr>`; }).join('')}
        </tbody></table></div></div>
      <div class="fields">
        ${fld('emotion', 'Emotional state now (1–5)', `<select id="emotion" name="emotion" class="in">${optList([['', '—'], '1', '2', '3', ['4', '4 — no trading today'], ['5', '5 — no trading today']], doc.emotion)}</select>`)}
        ${fld('sleep', 'Sleep last night (hours)', inp('sleep', doc.sleep, 'number', 'num', 'step="0.5"'))}
        ${fld('focus', 'Today’s focus rule', inp('focus', doc.focus ?? prevFocus ?? ''))}
      </div>
      <p class="mut fs13 m0">Limits from Setup: max ${esc(st.maxTrades)} trades · max −${esc(st.maxDailyLoss)}R · stop after ${esc(st.maxConsec)} losses in a row.</p>
      <div class="row"><button class="btn primary" type="submit" data-part="plan">Save plan</button>${doc.planDone ? '<span class="okc fs14">Plan saved</span>' : ''}</div>
    </div>
  </section>
  <section class="card">
    <div class="phase"><span class="n">PM</span><h2>End-of-day recap</h2><span class="hint">After your last trade closes</span></div>
    <div class="stack g16">
      <div id="dayLive">${dayLive(d)}</div>
      <div class="fields wide">
        ${fld('q_plan', 'Did I follow my plan?', ta('q_plan', doc.q_plan, 'Where did I stick to it, where did I drift?'))}
        ${fld('q_best', 'Best decision today', ta('q_best', doc.q_best, 'Judge the process, not the profit'))}
        ${fld('q_worst', 'Worst decision today', ta('q_worst', doc.q_worst, 'Which rule, and what triggered it?'))}
        ${fld('q_missed', 'Missed setups', ta('q_missed', doc.q_missed, 'Valid setups I didn’t take — and why'))}
        ${fld('q_feel', 'How did I feel through the day?', ta('q_feel', doc.q_feel, 'Energy, focus, frustration, overconfidence'))}
        ${fld('q_lesson', 'One lesson (goes to your Lessons library)', ta('q_lesson', doc.q_lesson))}
      </div>
      ${fld('tomorrow', 'Tomorrow I will … (one sentence)', inp('tomorrow', doc.tomorrow, 'text', '', 'placeholder="e.g. Wait for the M15 confirmation candle before entering any gold zone"'))}
      <div class="row"><button class="btn primary" type="submit" data-part="recap">Save recap</button>${doc.recapDone ? '<span class="okc fs14">Recap saved</span>' : ''}</div>
    </div>
  </section></form>`;
};
function dayLive(d) {
  const T = S.trades.filter((t) => t.date === d); const s = stats(T); const st = S.settings;
  const taken = T.filter((t) => !t._.missed).length; const lim = [];
  if (num(st.maxTrades)) lim.push(taken <= num(st.maxTrades) ? ['good', `Trades: ${taken} of ${st.maxTrades}`] : ['bad', `Trades: ${taken} — over your limit of ${st.maxTrades}`]);
  if (num(st.maxDailyLoss)) lim.push(s.net > -Math.abs(num(st.maxDailyLoss)) ? ['good', `Day result ${fR(s.net)} — inside the −${st.maxDailyLoss}R limit`] : ['bad', `Day result ${fR(s.net)} — daily loss limit broken`]);
  return `<div class="tiles">${tile('Net result', fR(s.net), tone(s.net), fM(s.pnl))}${tile('Trades', taken, '', `${s.w}W · ${s.l}L · ${s.be}BE`)}${tile('Rule adherence', fP(s.adh), s.adh == null ? '' : s.adh >= 0.9 ? 'pos' : 'neg')}${tile('Mistakes', s.mistN, s.mistN ? 'neg' : '', s.mistN ? fR(s.mistR) + ' on those trades' : 'Clean day')}</div>
  ${lim.length && taken ? `<div class="alerts mt12">${lim.map(([c, t]) => `<div class="alert ${c}">${t}</div>`).join('')}</div>` : ''}
  <div class="mt14">${tradeRows(T.sort(byTime), { empty: 'No trades logged for this day. <a href="#log">Log a trade</a>.' })}</div>`;
}

/* ---------- weekly ---------- */
V.weekly = () => {
  const ws = S.week || weekStart(today()); const wk = isoWeek(ws); const doc = S.weeks[wk] || {};
  const prevDoc = S.weeks[isoWeek(addDays(ws, -7))] || {};
  return `${pageHead('Weekly review · ' + wk, 'Week of ' + fDate(ws, { day: 'numeric', month: 'long', year: 'numeric' }), '45 minutes at the weekend. The numbers fill in from your trades, habits and study; you answer the questions and set one focus rule for next week.',
    `<button class="btn small" data-act="wk-prev" aria-label="Previous week">←</button><span class="cur">${fDate(ws, { day: 'numeric', month: 'short' })} – ${fDate(addDays(ws, 6), { day: 'numeric', month: 'short' })}</span><button class="btn small" data-act="wk-next" aria-label="Next week">→</button><button class="btn small" data-act="wk-now">This week</button>`)}
  <form id="weekForm" class="stack" autocomplete="off">
  <div id="weekLive">${weekLive(ws)}</div>
  <section class="card"><div class="phase"><span class="n">05</span><h2>Replay the week</h2><span class="hint">Open the screenshots side by side</span></div>
    <div class="stack g16">
    ${prevDoc.focus ? `<div class="field"><span class="lbl">Last week’s focus rule: “${esc(prevDoc.focus)}” — did you keep it?</span>${radios('keptFocus', ['Yes, every time', 'Mostly', 'No'], doc.keptFocus)}</div>` : ''}
    <div class="fields wide">
      ${fld('wq_pattern', 'Which pattern repeated this week?', ta('wq_pattern', doc.wq_pattern, 'Good or bad — what happened more than once?'))}
      ${fld('wq_edge', 'Where is my edge right now?', ta('wq_edge', doc.wq_edge, 'Best market, setup and session from the tables above'))}
      ${fld('wq_leak', 'Where am I leaking?', ta('wq_leak', doc.wq_leak, 'Worst market, setup, session or mistake'))}
      ${fld('wq_emotion', 'Emotional pattern', ta('wq_emotion', doc.wq_emotion, 'Which days or situations pushed me to 3+?'))}
      ${fld('wq_strategy', 'Strategy notes to test (not change yet)', ta('wq_strategy', doc.wq_strategy))}
      ${fld('wq_missed', 'Missed setups review', ta('wq_missed', doc.wq_missed, 'Were they valid? What stopped me?'))}
      ${fld('wq_habits', 'Habits: what helped, what slipped?', ta('wq_habits', doc.wq_habits))}
      ${fld('wq_lesson', 'Lesson of the week (goes to your Lessons library)', ta('wq_lesson', doc.wq_lesson))}
    </div>
    <div class="fields">${fld('stop', 'Stop doing', inp('stop', doc.stop))}${fld('start', 'Start doing', inp('start', doc.start))}${fld('keep', 'Keep doing', inp('keep', doc.keep))}</div>
    <div class="focus-box"><label class="lbl goldc" for="focus">Next week’s one focus rule</label>${inp('focus', doc.focus, 'text', 'fs17', 'placeholder="e.g. No gold entries in the 30 minutes around US data"')}<span class="mut fs13">It shows on your dashboard every day next week.</span></div>
    <div class="row"><button class="btn primary" type="submit">Save weekly review</button>${doc.done ? '<span class="okc fs14">Review saved</span>' : ''}</div>
    </div></section>
  <section class="card"><div class="card-head"><h2>Coach review</h2><span class="hint">Optional — needs an Anthropic key on the server</span></div>
    <div class="stack g12"><p class="mut m0 fs14">A written second opinion on the week: what worked, what leaked, and one rule to focus on. Save your answers first so they are included.</p>
    <div class="row"><button class="btn" type="button" data-act="coach">${doc.coach ? 'Run the coach again' : 'Ask the coach'}</button><span id="coachState" class="mut fs13"></span></div>
    <div id="coachOut" class="coach" ${doc.coach ? '' : 'hidden'}>${esc(doc.coach || '')}</div></div></section>
  </form>`;
};
function weekLive(ws) {
  const T = S.trades.filter((t) => weekStart(t.date) === ws); const s = stats(T);
  const prev = stats(S.trades.filter((t) => weekStart(t.date) === addDays(ws, -7)));
  const delta = (a, b, f) => fin(a) && fin(b) ? `<span class="${a - b >= 0 ? 'pos' : 'neg'}">${a - b >= 0 ? '▲' : '▼'} ${f(Math.abs(a - b))}</span> vs last week` : '';
  const C = closedOf(T).sort((a, b) => b._.r - a._.r);
  const graded = C.filter((t) => t.grade).sort((a, b) => GRADES.indexOf(a.grade) - GRADES.indexOf(b.grade));
  const missed = T.filter((t) => t._.missed);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const hd = days.map(habitDaySummary); const hT = hd.reduce((a, x) => a + x.total, 0), hD = hd.reduce((a, x) => a + x.done, 0);
  const studyMin = entryList('study').filter((e) => e.date >= ws && e.date <= addDays(ws, 6)).reduce((a, e) => a + (num(e.minutes) || 0), 0);
  const diaryN = days.filter((d) => (S.days[d] || {}).diary).length; const planN = days.filter((d) => (S.days[d] || {}).planDone).length;
  return `<div class="stack">
  <section class="card"><div class="phase"><span class="n">01</span><h2>The numbers</h2><span class="hint">${delta(s.net, prev.net, (x) => x.toFixed(2) + 'R')}</span></div>${T.length ? kpiTiles(s) : '<p class="mut m0">No trades logged in this week.</p>'}
  ${T.length ? `<div class="mt16">${equitySVG(s, 240, 1000)}</div>` : ''}${s.mistN ? `<div class="alert bad mt14">Rule breaks cost ${fR(s.mistR)} this week. Trading only your rules, your result would have been ${fR(s.cleanNet)}.</div>` : ''}</section>
  <section class="card"><div class="phase"><span class="n">02</span><h2>Routine & growth</h2></div>
    <div class="tiles">${tile('Habits kept', hT ? fP(hD / hT) : '—', hT ? (hD / hT >= 0.8 ? 'pos' : 'neg') : '', `${hD} of ${hT} ticks`)}${tile('Plans written', planN + ' / 5', planN >= 5 ? 'pos' : '', 'Weekdays')}${tile('Diary entries', diaryN, '', 'This week')}${tile('Study time', fH(studyMin), '', '<a href="#study">Study log</a>')}</div></section>
  <section class="card"><div class="phase"><span class="n">03</span><h2>Where is my edge?</h2></div>
    <div class="stack g18"><div><p class="sec-title">By market</p>${groupTable(groupBy(T, (t) => MARKETS[t.market] || 'Other'), 'Market')}</div>
    <div><p class="sec-title">By setup</p>${groupTable(groupBy(T, (t) => t.setup || 'No setup'), 'Setup')}</div>
    <div><p class="sec-title">By session</p>${groupTable(groupBy(T, (t) => t._.session), 'Session', [...SESSIONS, '—'])}</div>
    <div><p class="sec-title">By tag</p>${groupTable(groupBy(T, (t) => t._.tags.map((x) => '#' + x)), 'Tag')}</div>
    <div><p class="sec-title">By day</p>${groupTable(groupBy(T, (t) => DOW[dowIdx(t.date)]), 'Day', DOW)}</div>
    <div>${insightsHTML(insights(T))}</div></div></section>
  <section class="card"><div class="phase"><span class="n">04</span><h2>Cost of mistakes</h2></div>${mistakeTable(T)}</section>
  <section class="card"><div class="card-head"><h2>Trades to replay</h2><span class="hint">Tap to open with screenshots</span></div>
    <div class="grid g3">
      <div><p class="sec-title mb8">Best by result</p>${C.slice(0, 3).map(mini).join('') || '<p class="mut">—</p>'}</div>
      <div><p class="sec-title mb8">Best by process</p>${graded.slice(0, 3).map(mini).join('') || '<p class="mut">—</p>'}</div>
      <div><p class="sec-title mb8">Worst by process</p>${graded.slice(-3).reverse().filter((t) => !GOOD_GRADES.includes(t.grade)).map(mini).join('') || '<p class="mut">No C or F trades. Good week.</p>'}</div>
    </div>${missed.length ? `<p class="mut fs13 mt12 m0">${missed.length} missed setup${missed.length === 1 ? '' : 's'} logged this week — would have netted ${fR(missed.reduce((a, t) => a + (t._.r || 0), 0))}.</p>` : ''}</section></div>`;
}
const mini = (t) => `<a class="step mb8 aic" href="#log" data-edit="${esc(t.id)}"><span class="num ${tone(t._.r)} w64">${fR(t._.r)}</span><span><span class="t">${esc(t.symbol || '—')} · ${esc(t.grade || '—')}</span><br><span class="d">${fDate(t.date)} · ${esc(t.setup || '')}</span></span></a>`;

/* ---------- monthly ---------- */
V.monthly = () => {
  const mk = S.month || monthKey(today()); const doc = S.months[mk] || {};
  return `${pageHead('Monthly audit', fMonth(mk), '90 minutes on the first weekend of the month. Compare with last month, read the decision flags, then write down what you will keep, pause or scale.',
    `<button class="btn small" data-act="mo-prev" aria-label="Previous month">←</button><span class="cur">${mk}</span><button class="btn small" data-act="mo-next" aria-label="Next month">→</button><button class="btn small" data-act="mo-now">This month</button>`)}
  <form id="monthForm" class="stack" autocomplete="off">
  <div id="monthLive">${monthLive(mk)}</div>
  <section class="card"><div class="card-head"><h2>Decisions for next month</h2></div><div class="stack g14">
    <div class="fields wide">${fld('m_keep', 'Keep', ta('m_keep', doc.m_keep, 'Setups, markets, habits that are working'))}${fld('m_pause', 'Pause or drop', ta('m_pause', doc.m_pause))}${fld('m_scale', 'Risk change', ta('m_scale', doc.m_scale, 'Same / cut / raise — and why'))}</div>
    <div class="fields wide">${fld('m_goal', 'Process goal for next month', inp('m_goal', doc.m_goal, 'text', '', 'placeholder="e.g. 90%+ rule adherence, zero revenge trades"'))}${fld('m_study', 'Study goal for next month', inp('m_study', doc.m_study, 'text', '', 'placeholder="e.g. 8 hours backtesting DBR on gold"'))}</div>
    ${fld('m_notes', 'Notes on the month', ta('m_notes', doc.m_notes, '', 5))}
    <div class="row"><button class="btn primary" type="submit">Save monthly audit</button>${doc.done ? '<span class="okc fs14">Audit saved</span>' : ''}</div></div></section>
  </form>`;
};
function monthLive(mk) {
  const T = S.trades.filter((t) => monthKey(t.date) === mk); const s = stats(T);
  const pT = S.trades.filter((t) => monthKey(t.date) === addMonths(mk, -1)); const p = stats(pT);
  const rows = [['Net R', s.net, p.net, fR], ['Trades', s.n, p.n, (x) => String(x)], ['Win rate', s.wr, p.wr, fP], ['Expectancy', s.exp, p.exp, fR], ['Profit factor', s.pf, p.pf, (x) => x === Infinity ? '∞' : fN(x)], ['Max drawdown', s.n ? -s.dd : null, p.n ? -p.dd : null, fR], ['Rule adherence', s.adh, p.adh, fP], ['Cost of mistakes', s.mistR, p.mistR, fR]];
  const weeks = []; let w = weekStart(mk + '-01'); while (w <= monthEnd(mk)) { weeks.push(w); w = addDays(w, 7); }
  const wk = weeks.map((ws) => ({ key: fDate(ws, { day: 'numeric', month: 'short' }) + ' · ' + isoWeek(ws).slice(5), s: stats(T.filter((t) => weekStart(t.date) === ws)) })).filter((g) => g.s.n);
  const allSetups = groupBy(S.trades.filter((t) => t.date <= monthEnd(mk)), (t) => t.setup || 'No setup');
  const flags = [];
  allSetups.forEach((g) => {
    if (g.s.n < 20) flags.push(['WAIT', 'mut', `${g.key}: ${g.s.n} trades — not enough data yet. Keep logging.`]);
    else if (g.s.n >= 30 && g.s.exp < 0) flags.push(['PAUSE', 'negc', `${g.key}: ${fR(g.s.exp)} per trade over ${g.s.n} trades. Stop trading it and re-test it.`]);
    else if (g.s.exp > 0) flags.push(['KEEP', 'pos', `${g.key}: ${fR(g.s.exp)} per trade over ${g.s.n} trades.`]);
    else flags.push(['WATCH', 'goldc', `${g.key}: ${fR(g.s.exp)} per trade over ${g.s.n} trades. Review at 30.`]);
  });
  Object.entries(MARKETS).forEach(([k, l]) => { const a = stats(T.filter((t) => t.market === k)), b = stats(pT.filter((t) => t.market === k)); if (a.n && b.n && a.net < 0 && b.net < 0) flags.push(['DROP', 'negc', `${l}: negative two months in a row (${fR(b.net)}, ${fR(a.net)}). Take it off the watchlist for a month.`]); });
  const maxDD = num(S.settings.maxDD);
  if (maxDD && s.dd >= maxDD) flags.push(['CUT RISK', 'negc', `Drawdown reached ${s.dd.toFixed(2)}R (limit ${maxDD}R). Halve risk until a new equity high.`]);
  if (s.n >= 10 && s.exp > 0 && s.adh >= 0.9) flags.push(['SCALE', 'pos', `Positive expectancy and ${fP(s.adh)} rule adherence. You may raise risk by a small step (at most 0.25%).`]);
  else if (s.n >= 10) flags.push(['HOLD RISK', 'goldc', `Keep risk the same: scaling needs positive expectancy and 90%+ adherence (now ${fR(s.exp)}, ${fP(s.adh)}).`]);
  const days = []; for (let d = mk + '-01'; d <= monthEnd(mk); d = addDays(d, 1)) days.push(d);
  const hd = days.map(habitDaySummary); const hT = hd.reduce((a, x) => a + x.total, 0), hD = hd.reduce((a, x) => a + x.done, 0);
  const studyMin = entryList('study').filter((e) => monthKey(e.date || '') === mk).reduce((a, e) => a + (num(e.minutes) || 0), 0);
  return `<div class="stack">
  ${T.length ? kpiTiles(s) : '<div class="card"><p class="mut m0">No trades logged in this month.</p></div>'}
  <div class="tiles">${tile('Habits kept', hT ? fP(hD / hT) : '—', hT ? (hD / hT >= 0.8 ? 'pos' : 'neg') : '', `${hD} of ${hT} ticks`)}${tile('Plans written', days.filter((d) => (S.days[d] || {}).planDone).length, '', 'Days')}${tile('Diary entries', days.filter((d) => (S.days[d] || {}).diary).length, '', 'Days')}${tile('Study time', fH(studyMin), '', 'This month')}</div>
  <div class="grid g2">
    <section class="card"><div class="card-head"><h2>Daily results</h2><span class="hint">Blue = green day, orange = red day</span></div>${calendar(mk, T)}</section>
    <section class="card"><div class="card-head"><h2>Equity curve</h2></div>${equitySVG(s, 220)}</section>
  </div>
  <div class="grid g2">
    <section class="card"><div class="card-head"><h2>This month vs last</h2></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Metric</th><th class="r">${addMonths(mk, -1)}</th><th class="r">${mk}</th><th class="r">Change</th></tr></thead><tbody>${rows.map(([l, a, b, f]) => { const ch = fin(a) && fin(b) && a !== Infinity && b !== Infinity ? a - b : null; return `<tr><td>${l}</td><td class="r num mut">${f(b)}</td><td class="r num">${f(a)}</td><td class="r num ${ch == null || ch === 0 ? '' : ch > 0 ? 'pos' : 'neg'}">${ch == null ? '—' : (ch > 0 ? '▲ ' : ch < 0 ? '▼ ' : '') + (l === 'Trades' ? Math.abs(ch) : l === 'Win rate' || l === 'Rule adherence' ? (Math.abs(ch) * 100).toFixed(0) + ' pts' : Math.abs(ch).toFixed(2))}</td></tr>`; }).join('')}</tbody></table></div></section>
    <section class="card"><div class="card-head"><h2>Decision flags</h2><span class="hint">Setups judged on all trades to date</span></div>${flags.length ? `<div>${flags.map(([a, c, t]) => `<div class="flag"><b class="num ${c}">${a}</b><span class="soft">${esc(t)}</span></div>`).join('')}</div>` : '<p class="mut m0">Flags appear once you have logged trades.</p>'}</section>
  </div>
  <div class="grid g2">
    <section class="card"><div class="card-head"><h2>Week by week</h2></div>${groupTable(wk.map((g) => ({ key: g.key, s: g.s })), 'Week', wk.map((g) => g.key))}</section>
    <section class="card"><div class="card-head"><h2>By setup</h2></div>${barsBlock(groupBy(T, (t) => t.setup || 'No setup'))}<h2 class="fs18 mt16 mb12">By tag</h2>${barsBlock(groupBy(T, (t) => t._.tags.map((x) => '#' + x)), 'No tagged trades this month.')}</section>
  </div>
  <section class="card"><div class="card-head"><h2>Cost of mistakes</h2></div>${mistakeTable(T)}</section>
  <section class="card"><div class="card-head"><h2>What the numbers say</h2></div>${insightsHTML(insights(T))}</section>
  </div>`;
}
