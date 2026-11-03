/* Gold Desk Journal — shared UI pieces: tiles, charts, tables, insights */
'use strict';

const ICON = {
  dashboard: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 9h8V3h-8z"/>',
  log: '<path d="M12 5v14M5 12h14"/>',
  journal: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  daily: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  diary: '<path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M8 9h8M8 13h6"/>',
  habits: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11"/>',
  weekly: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  monthly: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M7 13h2M11 13h2M15 13h2M7 17h2M11 17h2"/>',
  progress: '<path d="M3 20l6-6 4 4 8-9"/><path d="M15 9h6v6"/>',
  playbook: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5V21h16"/>',
  lessons: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
  study: '<path d="M2 8l10-5 10 5-10 5z"/><path d="M6 10v5c3 2 9 2 12 0v-5"/>',
  setup: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  filter: '<path d="M3 4h18l-7 8v6l-4 2v-8z"/>',
  pin: '<path d="M12 17v5M9 3h6l-1 6 4 4H6l4-4z"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'
};
const icon = (n, size = 18) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n] || ''}</svg>`;

function tile(k, v, cls, s) { return `<div class="tile"><span class="k">${k}</span><span class="v ${cls || ''}">${v}</span>${s ? `<span class="s">${s}</span>` : ''}</div>`; }
function kpiTiles(s, compact) {
  const pf = s.pf === Infinity ? '∞' : fN(s.pf);
  const t = [
    tile('Net result', fR(s.net), tone(s.net), fM(s.pnl)),
    tile('Trades', s.n, '', `${s.w}W · ${s.l}L · ${s.be}BE`),
    tile('Win rate', fP(s.wr), '', 'Break-even ±0.1R not a win'),
    tile('Expectancy', fR(s.exp), tone(s.exp), 'Average R per trade'),
    tile('Profit factor', pf, s.pf == null ? '' : s.pf >= 1.5 ? 'pos' : s.pf < 1 ? 'neg' : '', 'Above 1.5 is solid'),
    tile('Avg win / loss', `${fN(s.avgW)} / ${fN(s.avgL)}`, '', 'In R — losses near 1.0'),
    tile('Max drawdown', s.n ? '−' + s.dd.toFixed(2) + 'R' : '—', s.dd > 0 ? 'neg' : '', 'Peak-to-trough'),
    tile('Rule adherence', fP(s.adh), s.adh == null ? '' : s.adh >= 0.9 ? 'pos' : 'neg', 'A+/A/B — target 90%+')
  ];
  if (!compact) t.push(
    tile('Cost of mistakes', s.mistN ? fR(s.mistR) : '—', tone(s.mistR), `${s.mistN} trade${s.mistN === 1 ? '' : 's'} with a mistake`),
    tile('Streak now', s.curType ? s.curStreak + (s.curType === 'W' ? ' wins' : ' losses') : '—', s.curType === 'W' ? 'pos' : s.curType === 'L' ? 'neg' : '', `Longest: ${s.maxW}W / ${s.maxL}L`),
    tile('Avg planned R:R', fin(s.avgRR) ? '1:' + s.avgRR.toFixed(1) : '—', '', 'What you aimed for'),
    tile('Avg time in trade', fin(s.avgHold) ? fH(s.avgHold) : '—', '', 'Open → close'));
  return `<div class="tiles">${t.join('')}</div>`;
}

function niceTicks(min, max, n) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min; const step0 = span / n; const mag = Math.pow(10, Math.floor(Math.log10(step0))); const f = step0 / mag;
  const step = (f >= 5 ? 10 : f >= 2 ? 5 : f >= 1 ? 2 : 1) * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step; const out = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(+v.toFixed(6));
  return out;
}
const tickLbl = (v, unit) => unit === '%' ? Math.round(v * 100) + '%' : (v > 0 ? '+' : '') + (Math.abs(v) < 10 && v % 1 ? v.toFixed(1) : v) + (unit || '');

function equitySVG(s, h = 230, W = 560) {
  if (!s.curve.length) return '<p class="mut m0">No closed trades in this view yet.</p>';
  const H = h, L = 52, R = 16, T = 14, B = 26;
  const ys = [0, ...s.curve.map((p) => p.y)];
  const ticks = niceTicks(Math.min(...ys), Math.max(...ys), 4);
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const n = s.curve.length;
  const X = (i) => L + (i / n) * (W - L - R);
  const Y = (v) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const pts = [[X(0), Y(0)], ...s.curve.map((p, i) => [X(i + 1), Y(p.y)])];
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = line + ` L${X(n).toFixed(1)} ${Y(0).toFixed(1)} L${X(0).toFixed(1)} ${Y(0).toFixed(1)} Z`;
  const last = pts[pts.length - 1]; const end = s.curve[n - 1].y;
  const col = end >= 0 ? 'var(--pos)' : 'var(--neg)'; const hex = end >= 0 ? '#6CB4EE' : '#F0904A';
  const gid = 'g' + Math.random().toString(36).slice(2, 7);
  const grid = ticks.map((v) => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v === 0 ? 'var(--line2)' : 'var(--line)'}" stroke-width="1"${v === 0 ? '' : ' stroke-dasharray="2 4"'}/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${tickLbl(v, 'R')}</text>`).join('');
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Equity curve in R, ending at ${fR(end)}">
    <defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${hex}" stop-opacity=".28"/><stop offset="1" stop-color="${hex}" stop-opacity="0"/></linearGradient></defs>
    ${grid}<path d="${area}" fill="url(#${gid})"/><path d="${line}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="4.5" fill="${col}" stroke="var(--surface)" stroke-width="2"/>
    <text x="${L}" y="${H - 6}">${fDate(s.curve[0].t.date, { day: 'numeric', month: 'short' })}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${fDate(s.curve[n - 1].t.date, { day: 'numeric', month: 'short' })} · ${n} trades</text>
  </svg></div>`;
}

/* multi-series line chart. series: [{name, color, vals:[number|null]}], labels: [string] */
function lineChart(series, labels, opt = {}) {
  const all = series.flatMap((s) => s.vals).filter(fin);
  if (!all.length) return `<p class="mut m0">${opt.empty || 'Not enough data yet.'}</p>`;
  const W = opt.w || 560, H = opt.h || 220, L = 52, R = 16, T = 14, B = 28;
  let mn = Math.min(...all, opt.zero ? 0 : Infinity), mx = Math.max(...all, opt.zero ? 0 : -Infinity);
  if (opt.min != null) mn = Math.min(mn, opt.min); if (opt.max != null) mx = Math.max(mx, opt.max);
  const ticks = niceTicks(mn, mx, 4); const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const n = labels.length; const X = (i) => L + (n <= 1 ? 0.5 : i / (n - 1)) * (W - L - R);
  const Y = (v) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const grid = ticks.map((v) => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v === 0 ? 'var(--line2)' : 'var(--line)'}"${v === 0 ? '' : ' stroke-dasharray="2 4"'}/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${tickLbl(v, opt.unit)}</text>`).join('');
  const every = Math.max(1, Math.ceil(n / (W > 700 ? 9 : 5)));
  const xl = labels.map((l, i) => (i % every === 0 || i === n - 1) ? `<text x="${X(i)}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>` : '').join('');
  const paths = series.map((s) => {
    let d = '', pen = false; const dots = [];
    s.vals.forEach((v, i) => { if (!fin(v)) { pen = false; return; } d += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1) + ' '; pen = true; dots.push([X(i), Y(v), v]); });
    const last = dots[dots.length - 1];
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" ${s.dash ? 'stroke-dasharray="5 4"' : ''}/>${last ? `<circle cx="${last[0]}" cy="${last[1]}" r="4" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/>` : ''}`;
  }).join('');
  const legend = series.length > 1 ? `<div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>` : '';
  return `<div class="chart">${legend}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.label || series.map((s) => s.name).join(', '))}">${grid}${xl}${paths}</svg></div>`;
}

/* vertical bar chart: vals [{label, y}] — diverging around 0 */
function barChart(vals, opt = {}) {
  if (!vals.some((v) => fin(v.y) && v.y !== 0)) return `<p class="mut m0">${opt.empty || 'Not enough data yet.'}</p>`;
  const W = opt.w || 560, H = opt.h || 200, L = 52, R = 16, T = 14, B = 28;
  const ys = vals.map((v) => v.y || 0); const ticks = niceTicks(Math.min(0, ...ys), Math.max(0, ...ys), 4);
  const y0 = ticks[0], y1 = ticks[ticks.length - 1]; const Y = (v) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const n = vals.length; const bw = (W - L - R) / n; const every = Math.max(1, Math.ceil(n / (W > 700 ? 9 : 5)));
  const grid = ticks.map((v) => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v === 0 ? 'var(--line2)' : 'var(--line)'}"${v === 0 ? '' : ' stroke-dasharray="2 4"'}/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${tickLbl(v, opt.unit)}</text>`).join('');
  const bars = vals.map((v, i) => {
    const y = v.y || 0; const x = L + i * bw + bw * 0.18; const w = bw * 0.64; const top = Y(Math.max(0, y)); const hgt = Math.abs(Y(y) - Y(0));
    const col = opt.color || (y >= 0 ? 'var(--pos)' : 'var(--neg)');
    return `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(hgt, y ? 1.5 : 0).toFixed(1)}" rx="3" fill="${col}"><title>${esc(v.label)}: ${opt.fmt ? opt.fmt(y) : y}</title></rect>${(i % every === 0 || i === n - 1) ? `<text x="${(L + i * bw + bw / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(v.label)}</text>` : ''}`;
  }).join('');
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.label || 'Bar chart')}">${grid}${bars}</svg></div>`;
}

function barsBlock(groups, emptyMsg, order) {
  if (!groups.length) return `<p class="mut m0">${emptyMsg || 'Not enough closed trades yet.'}</p>`;
  if (order) groups.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key)); else groups.sort((a, b) => b.s.net - a.s.net);
  const max = Math.max(1, ...groups.map((g) => Math.abs(g.s.net)));
  const rows = groups.map((g) => {
    const w = Math.abs(g.s.net) / max * 50; const pos = g.s.net >= 0;
    const fill = `<span class="bar-fill" style="${pos ? 'left:50%' : 'right:50%'};width:${w}%;background:${pos ? 'var(--pos)' : 'var(--neg)'}"></span>`;
    return `<div class="bar-row"><span class="lab" title="${esc(g.key)}">${esc(g.key)}</span><span class="num mut">${g.s.n}</span><span class="num">${fP(g.s.wr)}</span><span class="bar-track" aria-hidden="true">${fill}</span><span class="num ${tone(g.s.net)}" style="text-align:right">${fR(g.s.net, 1)}</span></div>`;
  }).join('');
  return `<div class="bars"><div class="bar-row bar-head"><span>Group</span><span>n</span><span>Win</span><span>Net R</span><span style="text-align:right">Total</span></div>${rows}</div>`;
}
function groupTable(groups, label, order) {
  if (!groups.length) return '<p class="mut m0">No closed trades yet.</p>';
  if (order) groups.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key)); else groups.sort((a, b) => b.s.n - a.s.n);
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${label}</th><th class="r">Trades</th><th class="r">Win %</th><th class="r">Net R</th><th class="r">Expectancy</th><th class="r">PF</th><th class="r">Rules</th></tr></thead><tbody>${groups.map((g) => `<tr><td>${esc(g.key)}</td><td class="r num">${g.s.n}</td><td class="r num">${fP(g.s.wr)}</td><td class="r num ${tone(g.s.net)}">${fR(g.s.net)}</td><td class="r num ${tone(g.s.exp)}">${fR(g.s.exp)}</td><td class="r num">${g.s.pf === Infinity ? '∞' : fN(g.s.pf)}</td><td class="r num">${fP(g.s.adh)}</td></tr>`).join('')}</tbody></table></div>`;
}
function mistakeTable(trades) {
  const m = new Map();
  for (const t of closedOf(trades)) for (const k of t.mistakes || []) { const o = m.get(k) || { n: 0, r: 0 }; o.n++; o.r += t._.r; m.set(k, o); }
  if (!m.size) return '<p class="mut m0">No mistake tags here. Keep it that way.</p>';
  const rows = Array.from(m).sort((a, b) => a[1].r - b[1].r);
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Mistake</th><th class="r">Times</th><th class="r">Net R on those trades</th></tr></thead><tbody>${rows.map(([k, o]) => `<tr><td class="negc">${esc(k)}</td><td class="r num">${o.n}</td><td class="r num ${tone(o.r)}">${fR(o.r)}</td></tr>`).join('')}</tbody></table></div>`;
}

function insights(trades) {
  const out = []; const C = closedOf(trades);
  if (C.length < 5) return out;
  const s = stats(C);
  const best = (groups, min) => groups.filter((g) => g.s.n >= min).sort((a, b) => b.s.exp - a.s.exp);
  const setups = best(groupBy(C, (t) => t.setup), 3);
  if (setups.length) { const g = setups[0]; if (g.s.exp > 0) out.push(['good', `Best setup: <b>${esc(g.key)}</b> — ${fR(g.s.exp)} per trade over ${g.s.n} trades (${fP(g.s.wr)} win rate).`]); const w = setups[setups.length - 1]; if (setups.length > 1 && w.s.exp < 0) out.push(['bad', `Weakest setup: <b>${esc(w.key)}</b> — ${fR(w.s.exp)} per trade over ${w.s.n} trades.${w.s.n >= 30 ? ' With 30+ trades, pause it and re-test.' : ''}`]); }
  const sess = best(groupBy(C, (t) => t._.session), 3);
  if (sess.length > 1) { const g = sess[0], w = sess[sess.length - 1]; out.push(['gold', `Session edge: <b>${esc(g.key)}</b> ${fR(g.s.exp)}/trade vs <b>${esc(w.key)}</b> ${fR(w.s.exp)}/trade.`]); }
  const tags = best(groupBy(C, (t) => t._.tags), 3);
  if (tags.length) { const g = tags[0]; if (g.s.exp > 0) out.push(['good', `Strongest tag: <b>#${esc(g.key)}</b> at ${fR(g.s.exp)}/trade (${g.s.n} trades).`]); }
  const calm = C.filter((t) => num(t.emotion) != null && num(t.emotion) <= 2), hot = C.filter((t) => num(t.emotion) >= 3);
  if (calm.length >= 3 && hot.length >= 3) { const a = stats(calm), b = stats(hot); out.push([b.exp < a.exp ? 'bad' : 'good', `Emotion matters: at state 1–2 you average ${fR(a.exp)}/trade; at 3+ you average ${fR(b.exp)}/trade (${hot.length} trades).`]); }
  if (s.mistN) out.push(['bad', `Rule breaks: ${s.mistN} trades with mistakes netted ${fR(s.mistR)}. Trading your rules only, the result would be ${fR(s.cleanNet)}.`]);
  if (fin(s.avgL) && s.avgL > 1.1) out.push(['bad', `Average loss is ${fN(s.avgL)}R — above 1R means stops are being widened or entries slipped.`]);
  if (fin(s.avgRR) && fin(s.avgW) && s.avgW < s.avgRR * 0.7) out.push(['gold', `You plan for 1:${fN(s.avgRR, 1)} on average but winners average ${fN(s.avgW)}R. Check if you are cutting winners early.`]);
  const dows = best(groupBy(C, (t) => DOW[dowIdx(t.date)]), 3);
  if (dows.length > 2 && dows[dows.length - 1].s.exp < 0) out.push(['bad', `Weakest day: <b>${dows[dows.length - 1].key}</b> at ${fR(dows[dows.length - 1].s.exp)}/trade.`]);
  return out.slice(0, 7);
}
const insightsHTML = (arr) => arr.length ? `<div class="insights">${arr.map(([c, t]) => `<div class="ins ${c}"><i></i><span>${t}</span></div>`).join('')}</div>` : '<p class="mut m0">Insights appear once there are at least 5 closed trades in this view.</p>';

function tradeRows(trades, opts = {}) {
  if (!trades.length) return `<p class="mut m0">${opts.empty || 'No trades.'}</p>`;
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Symbol</th><th>Side</th><th>Setup</th><th>Session</th><th class="r">R</th><th class="r">P&amp;L</th><th>Grade</th><th>Status</th><th>Tags &amp; mistakes</th></tr></thead><tbody>${trades.map((t) => {
    const o = t._.outcome; const cls = o === 'Win' ? 'win' : o === 'Loss' ? 'loss' : o === 'Open' ? 'open' : o === 'Missed' ? 'miss' : '';
    const tg = t._.tags.map((x) => `<span class="tagc">#${esc(x)}</span>`).join('') + (t.mistakes || []).map((m) => `<span class="tag">${esc(m)}</span>`).join('');
    return `<tr class="click" data-edit="${esc(t.id)}" tabindex="0"><td class="num nowrap">${fDate(t.date)}${t.openTime ? ' <span class="mut">' + esc(t.openTime) + '</span>' : ''}</td><td><b>${esc(t.symbol || '—')}</b></td><td>${t.dir === 'short' ? 'Short' : 'Long'}</td><td>${esc(t.setup || '—')}</td><td class="nowrap">${esc(t._.session)}</td><td class="r num ${tone(t._.r)}">${fR(t._.r)}</td><td class="r num ${tone(t._.pnl)}">${t._.missed ? '—' : fM(t._.pnl)}</td><td class="num">${esc(t.grade || '—')}</td><td><span class="pill ${cls}">${o}</span></td><td>${tg || '<span class="mut">—</span>'}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function calendar(mk, trades) {
  const start = addDays(mk + '-01', -dowIdx(mk + '-01'));
  const byDay = {}; closedOf(trades).forEach((t) => { (byDay[t.date] = byDay[t.date] || []).push(t); });
  const max = Math.max(1, ...Object.values(byDay).map((a) => Math.abs(a.reduce((x, t) => x + t._.r, 0))));
  let cells = DOW.map((d) => `<div class="dow">${d}</div>`).join('');
  const td = today();
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i); if (i >= 35 && monthKey(d) !== mk) break;
    const arr = byDay[d] || []; const r = arr.reduce((x, t) => x + t._.r, 0);
    const a = arr.length ? 0.12 + 0.5 * Math.abs(r) / max : 0;
    const bg = arr.length ? (r >= 0 ? `rgba(108,180,238,${a.toFixed(2)})` : `rgba(240,144,74,${a.toFixed(2)})`) : '';
    cells += `<div class="day${monthKey(d) !== mk ? ' out' : ''}${d === td ? ' today' : ''}" style="${bg ? 'background:' + bg : ''}" title="${fDate(d)}${arr.length ? ': ' + fR(r) + ', ' + arr.length + ' trades' : ''}"><span>${parseD(d).getDate()}</span>${arr.length ? `<b>${fR(r, 1)}</b>` : ''}</div>`;
  }
  return `<div class="cal">${cells}</div>`;
}
const progressBar = (frac, cls) => `<div class="pbar ${cls || ''}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(Math.min(1, Math.max(0, frac || 0)) * 100)}"><i style="width:${(Math.min(1, Math.max(0, frac || 0)) * 100).toFixed(1)}%"></i></div>`;

/* weekly buckets for the last n weeks */
function weekBuckets(n) {
  const out = []; let ws = weekStart(today());
  for (let i = n - 1; i >= 0; i--) out.push(addDays(ws, -7 * i));
  return out;
}
