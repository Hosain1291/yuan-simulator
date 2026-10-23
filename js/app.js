/* 화면: 1 선거 고르기 → 2 분야 중요도 → 3 질문(막대) → 4 분야별 의석 발표 → 5 결과
   결과: 반원 의석 → 입법원장 선거 → 선거 결과 인포박스 → 선거구 지도 → 분야별 의석 → 스펙트럼 → 정족수 → 연대·내각(가상) → 일치도 → 질문별 표결
   문구는 모두 window.I18N.ui(i18n/ko.js 등)에서 가져옵니다. 중의원 시뮬레이터(jp-parliament-simulator)의 화면 구성을 바탕으로 했습니다. */
(function () {
'use strict';
const E = window.TWEngine, { lr, sum, clamp, maj, two3, pos } = E;
const I = window.I18N, T = I.ui, LANG = I.lang;

const ICON_CAM = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
const FIELD_COL = { pol: '#5b6fa8', cs: '#3f7fa8', def: '#9a4a4a', eco: '#3e8a6e', wel: '#b0753a', soc: '#9a5fa0', reg: '#7a8a3a' };
const FK = Object.keys(FIELD_COL), fld = k => ({ k, n: T.fields[k][0], d: T.fields[k][1], c: FIELD_COL[k] });

// 행정원 부처(시기별). 분야와 연결해 연대 정당이 강한 분야의 부처를 먼저 고릅니다.
const MINS = {
  m1969: '행정원장 부원장 내정부 외교부 국방부 재정부 교육부 법무부 경제부 교통부 몽장위원회 교무위원회 신문국 주계처',
  m1989: '행정원장 부원장 내정부 외교부 국방부 재정부 교육부 법무부 경제부 교통부 몽장위원회 교무위원회 경제건설위원회 노공위원회 농업위원회 위생서 환경보호서 신문국 주계처',
  m1992: '행정원장 부원장 내정부 외교부 국방부 재정부 교육부 법무부 경제부 교통부 몽장위원회 교무위원회 대륙위원회 경제건설위원회 노공위원회 농업위원회 위생서 환경보호서 신문국 주계처',
  m2001: '행정원장 부원장 내정부 외교부 국방부 재정부 교육부 법무부 경제부 교통부 몽장위원회 교무위원회 대륙위원회 경제건설위원회 노공위원회 농업위원회 위생서 환경보호서 원주민족위원회 객가위원회 해순서 신문국 주계처',
  m2012: '행정원장 부원장 내정부 외교부 국방부 재정부 교육부 법무부 경제부 교통부 문화부 국가과학위원회 대륙위원회 경제건설위원회 금융감독관리위원회 노공위원회 농업위원회 위생서 환경보호서 원주민족위원회 객가위원회 몽장위원회 교무위원회 주계처',
  m2016: '행정원장 부원장 내정부 외교부 국방부 재정부 교육부 법무부 경제부 교통부 노동부 위생복리부 문화부 과기부 대륙위원회 국가발전위원회 금융감독관리위원회 해양위원회 농업위원회 환경보호서 원주민족위원회 객가위원회 교무위원회 주계총처',
  m2024: '행정원장 부원장 내정부 외교부 국방부 재정부 교육부 법무부 경제부 교통부 노동부 농업부 위생복리부 환경부 문화부 디지털발전부 국가과학기술위원회 대륙위원회 국가발전위원회 금융감독관리위원회 해양위원회 원주민족위원회 객가위원회 교무위원회 주계총처'
};
const PMIN = '행정원장';
const MINF = m => /행정원장|부원장|내정|주계|신문/.test(m) ? 'pol' : /외교|대륙|교무|몽장/.test(m) ? 'cs' : /국방|해양|해순/.test(m) ? 'def'
  : /재정|경제|금융|국가발전|디지털|과기|과학/.test(m) ? 'eco' : /노공|노동|위생/.test(m) ? 'wel' : /교육|법무|문화|원주민|객가/.test(m) ? 'soc' : 'reg';
const minName = m => T.mins[m] || m;

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app'), toHome = $('#toHome');
const ld = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
const sv = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

const S = { ai: DATA.length - 1, ans: [], fimp: {}, fcnt: {}, order: [], seq: [], qi: 0, prior: true, view: 'mine', plan: null, runoff: {}, pick: [], cab: null, cabSt: null, sel: null, pickTouched: false };
{ const v = +ld('tw-sel', -1); if (v >= 0 && v < DATA.length) S.ai = v; }

let A = null, M = null;
function load() {
  const d = DATA[S.ai];
  A = Object.assign({}, d, { Q: (QSET[d.n] || []).map(([t, L, R, Aa, B, p, ax, f, w]) => ({ t, L, R, A: Aa, B, p, ax, f, w })) });
  M = E.make(A, { fimp: S.fimp, prior: S.prior, FK });
  S.plan = null; S.runoff = {}; S.pick = []; S.cab = null; S.cabSt = null; S.pickTouched = false;
}
const remake = () => { M = E.make(A, { fimp: S.fimp, prior: S.prior, FK }); };
const party = k => A.P.find(p => p.k === k);
const actual = () => A.P.map(p => p.s);
const plain = st => ({ dist: A.P.map(p => p.sd), list: A.P.map(p => p.sp), fix: A.P.map(p => p.sf), tot: st });
const PA = { n: T.A, c: 'var(--pa)' }, PB = { n: T.B, c: 'var(--pb)' };
const leanOrder = () => A.P.map((p, f) => f).sort((x, y) => A.P[x].l - A.P[y].l || x - y);
const mark = (p, sz) => '<i class="dot" style="background:' + p.c + (sz ? ';width:' + sz + 'px;height:' + sz + 'px' : '') + '"></i>';
const govNames = () => A.gov.map(k => party(k).n).join('·');
function whenTxt(q) {
  if (!q.w) return T.whenNone;
  const [y, m] = q.w.split('.').map(Number), [ey, em] = A.date.split('.').map(Number);
  return T.when(y, m, (ey - y) * 12 + (em - (m || em)));
}
const three4 = N => Math.ceil(N * 3 / 4);

/* ── 테마 */
function setSkin(v) {
  if (v === 'auto') document.documentElement.removeAttribute('data-skin'); else document.documentElement.setAttribute('data-skin', v);
  $$('#skin button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.skin === v))); sv('tw-skin', v);
}
$('#skin').addEventListener('click', e => { const b = e.target.closest('button[data-skin]'); if (b) setSkin(b.dataset.skin); });
setSkin(ld('tw-skin', 'auto'));
toHome.addEventListener('click', () => viewHome());
document.body.insertAdjacentHTML('beforeend', '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><filter id="tw-sketch" x="-3%" y="-3%" width="106%" height="106%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="1.6"/></filter></defs></svg><div class="tip" id="tip" hidden></div>');

/* ── 반원 부채꼴 의석: 동심원 줄에 좌석을 놓고 각도 순으로 정렬해 정당마다 부채꼴 조각이 되게 합니다 */
function layout(N) {
  const inner = 0.36, cap = R => { let s = 0; const sp = (1 - inner) / R; for (let i = 0; i < R; i++) s += Math.floor(Math.PI * (inner + sp * (i + 0.5)) / sp); return s; };
  let R = 1; while (cap(R) < N && R < 60) R++;
  const sp = (1 - inner) / R, radii = [...Array(R)].map((_, i) => inner + sp * (i + 0.5)), counts = lr(radii, N), seats = [];
  radii.forEach((r, i) => { const n = counts[i]; for (let j = 0; j < n; j++) seats.push({ t: n === 1 ? Math.PI / 2 : Math.PI * (1 - j / (n - 1)), r }); });
  seats.sort((a, b) => b.t - a.t || a.r - b.r);
  return { seats, rad: sp * 0.4 };
}
function hemiSvg(N) {
  const L = layout(N), K = 290, r = K * L.rad;
  return '<svg viewBox="0 0 600 312" role="img" aria-label="' + esc(T.lgSmd) + '" data-rw="' + (r * 0.2).toFixed(2) + '"><g class="seatg">' +
    L.seats.map(s => '<circle class="seat" cx="' + (300 + K * s.r * Math.cos(s.t)).toFixed(1) + '" cy="' + (302 - K * s.r * Math.sin(s.t)).toFixed(1) + '" r="' + r.toFixed(2) + '" fill="var(--line)"/>').join('') + '</g>' +
    '<line class="mj" x1="300" y1="' + (302 - K * 0.33) + '" x2="300" y2="6"/>' +
    '<text class="big" x="300" y="268" text-anchor="middle">' + N + '</text><text class="sm" x="300" y="296" text-anchor="middle">' + esc(T.seatUnit) + '</text></svg>';
}
const SEATPREV = {};
const noMo = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return true; } };
const ringFill = c => 'color-mix(in srgb, ' + c + ' 24%, var(--surface))';
function seatAnim(el, keys) {
  const id = el.id || '', prev = SEATPREV[id], same = prev && prev.length === keys.length, seats = $$('.seat', el), ch = [];
  SEATPREV[id] = keys; seats.forEach(c => { c.classList.remove('s-in', 's-out', 's-sw'); c.style.animationDelay = ''; });
  if (noMo()) return;
  const fillOf = k => { const [c, r] = k.split('|'); return r ? ringFill(c) : c; };
  keys.forEach((k, i) => { const p = same ? prev[i] : ''; if (k && p && k !== p) ch.push([i, 's-sw', p]); else if (k && k !== p) ch.push([i, 's-in']); else if (!k && p) ch.push([i, 's-out']); });
  if (!ch.length) return; void el.getBoundingClientRect();
  const span = Math.min(750, ch.length * 18);
  ch.forEach(([i, cl, p], j) => { const c = seats[i]; if (p) { c.style.setProperty('--old', fillOf(p)); c.style.setProperty('--new', fillOf(keys[i])); } c.style.animationDelay = (ch.length > 1 ? Math.round(j / (ch.length - 1) * span) : 0) + 'ms'; c.classList.add(cl); });
}
function paint(el, R, label, big) {
  const seq = []; leanOrder().forEach(f => { const c = A.P[f].c; for (let k = 0; k < R.dist[f]; k++) seq.push({ c, ring: false }); for (let k = 0; k < R.list[f]; k++) seq.push({ c, ring: true }); for (let k = 0; k < ((R.fix || [])[f] || 0); k++) seq.push({ c, ring: false, fx: true }); });
  const rw = $('svg', el).dataset.rw;
  $$('.seat', el).forEach((c, i) => {
    const s = seq[i];
    if (!s) { c.setAttribute('fill', 'var(--line)'); c.setAttribute('stroke', 'none'); return; }
    c.classList.toggle('fx', !!s.fx);
    if (s.ring) { c.setAttribute('fill', ringFill(s.c)); c.setAttribute('stroke', s.c); c.setAttribute('stroke-width', rw * 2.4); }
    else if (s.fx) { c.setAttribute('fill', s.c); c.setAttribute('stroke', 'var(--gold)'); c.setAttribute('stroke-width', rw * 3); }
    else { c.setAttribute('fill', s.c); c.setAttribute('stroke', 'var(--seat-edge)'); c.setAttribute('stroke-width', rw); }
  });
  seatAnim(el, $$('.seat', el).map((c, i) => seq[i] ? seq[i].c + (seq[i].ring ? '|r' : '') : ''));
  if (label != null) $('.sm', el).textContent = label;
  if (big != null) $('.big', el).textContent = big;
}
function tweenNum(n, from, to) {
  if (!n) return; if (from === to || noMo()) { n.textContent = to; return; }
  const t0 = performance.now(), D = 900; n.textContent = from;
  const step = t => { const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3); n.textContent = Math.round(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
const legend = extra => '<div class="hlg"><span><i class="dot" style="background:var(--ink2)"></i>' + esc(T.lgSmd) + '</span>' + (A.L ? '<span><i class="ring"></i>' + esc(T.lgPr) + '</span>' : '') + (A.F ? '<span><i class="dot" style="background:var(--ink2);box-shadow:0 0 0 2px var(--gold)"></i>' + esc(T.lgFix) + '</span>' : '') + (extra ? '<span>' + esc(extra) + '</span>' : '') + '</div>';

/* ── 1. 총선 고르기 */
function sysBar(a) {
  const seg = [[a.D, 'var(--ink2)', T.sysD(a)]].concat(a.L ? [[a.L, 'var(--accent)', T.sysL(a)]] : [], a.F ? [[a.F, 'var(--gold)', T.sysF]] : []);
  return '<div class="sysbar">' + seg.map(s => '<span style="width:' + (s[0] / a.N * 100) + '%;background:' + s[1] + '"></span>').join('') + '</div><div class="syslg">' + seg.map(s => '<span><i class="dot" style="background:' + s[1] + '"></i>' + esc(s[2]) + ' <b class="num">' + s[0] + '</b></span>').join('') + '</div>';
}
function viewHome() {
  toHome.hidden = true; window.scrollTo(0, 0);
  app.innerHTML = '<div class="stack">' +
    '<div class="intro"><h1>' + esc(T.introH1) + '</h1><p>' + esc(T.introP) + '</p></div>' +
    '<section class="box"><div class="eras">' + ERAS.map(([nm, ns]) => '<div class="era"><span>' + esc(nm) + '</span><div class="row">' + ns.map(n => { const i = DATA.findIndex(d => d.n === n), d = DATA[i]; return '<button type="button" class="asm" data-ai="' + i + '" aria-pressed="' + (i === S.ai) + '"><b>' + esc(T.nth(d)) + '</b><small>' + esc(T.nthSub(d)) + '</small></button>'; }).join('') + '</div></div>').join('') + '</div></section>' +
    '<section class="box detail" id="detail"></section></div>';
  $$('.asm', app).forEach(b => b.addEventListener('click', () => { S.ai = +b.dataset.ai; sv('tw-sel', S.ai); load(); $$('.asm', app).forEach(x => x.setAttribute('aria-pressed', String(x === b))); detail(); }));
  detail();
}
function detail() {
  const a = A, el = $('#detail'), sorted = a.P.map((p, f) => f).sort((x, y) => a.P[y].s - a.P[x].s), ax = E.partyAx(a);
  el.innerHTML = '<span class="eyebrow">' + esc(a.era) + '</span><h2>' + esc(T.elecTitle(a)) + '</h2>' +
    '<dl class="facts"><div><dt>' + T.fDate + '</dt><dd class="num">' + a.date + '</dd></div><div><dt>' + T.fTerm + '</dt><dd class="num">' + esc(a.term) + '</dd></div><div><dt>' + T.fPres + '</dt><dd>' + esc(a.pres) + '</dd></div><div><dt>' + T.fPrem + '</dt><dd>' + esc(a.prem) + '</dd></div><div><dt>' + T.fN + '</dt><dd>' + esc(T.seatsMaj(a.N, maj(a.N))) + '</dd></div></dl>' +
    '<p class="desc">' + esc(a.desc) + '</p>' +
    '<h3 style="margin-top:18px">' + T.leanH + '</h3><p class="hint sub">' + T.leanHint + '</p>' +
    '<div class="plist">' + sorted.map(f => { const p = a.P[f], x = (ax[f].e + ax[f].s) / 2;
      return '<div class="prow">' + mark(p) + '<div><b>' + esc(p.n) + '</b>' + (LANG !== 'zh' ? '<span class="ja">' + esc(p.zh) + '</span>' : '') + (p.ldk ? ' <span class="hint">' + esc(T.leaderP + p.ldk) + '</span>' : '') + (p.d ? '<small>' + esc(p.d) + '</small>' : '') +
        (p.k !== 'ind' && p.k !== 'etc' ? '<div class="lean"><i style="left:' + ((clamp(x, -1, 1) + 1) / 2 * 100) + '%;background:' + p.c + '"></i></div>' : '') + '</div><span class="num">' + p.s + (p.s && (a.L || a.F) && (p.sp || p.sf) ? ' <small style="display:inline">(' + [p.sd, a.L ? p.sp : null, a.F ? p.sf : null].filter(x => x != null).join('+') + ')</small>' : '') + '</span></div>'; }).join('') + '</div>' +
    '<h3 style="margin-top:18px">' + T.sysH + '</h3>' + sysBar(a) +
    '<p class="hint" style="margin-top:8px">' + esc(T.sysHint(a)) + '</p>' +
    '<div class="hemi" id="dh" style="margin-top:12px">' + hemiSvg(a.N) + '</div>' + legend() +
    '<div class="opts" style="margin-top:16px"><label class="chk"><input type="checkbox" id="opt-prior"' + (S.prior ? ' checked' : '') + '><span>' + T.priorL + '<small>' + T.priorH + '</small></span></label></div>' +
    '<div class="launch" style="margin-top:16px"><button type="button" class="cta" id="start">' + T.startBtn + '</button><span>' + T.qInfo(a.Q.length, M.fieldsOf().length) + '</span></div>';
  paint($('#dh'), plain(actual()), T.realLbl, a.N);
  $('#opt-prior').addEventListener('change', e => { S.prior = e.target.checked; remake(); });
  $('#start').addEventListener('click', () => { FK.forEach(k => { S.fimp[k] = 2; }); viewPrio(); });
}

/* ── 2. 분야별 중요도 */
const segHtml = (k, lv, mini) => '<div class="seg5' + (mini ? ' mini' : '') + '" role="radiogroup" aria-label="' + esc(fld(k).n) + '">' + T.lv.map((n, j) => '<button type="button" role="radio" data-f="' + k + '" data-l="' + j + '" aria-checked="' + (j === lv) + '">' + esc(n) + '</button>').join('') + '</div>';
const QR = [0, 0.4, 0.6, 0.8, 1];
function autoCount() { FK.forEach(k => { const max = M.qsOf(k).length, r = QR[S.fimp[k]] || 0; S.fcnt[k] = r ? Math.min(max, Math.max(1, Math.round(max * r))) : 0; }); }
const seatTxt = c => T.seatTxt(c, A);
function viewPrio() {
  toHome.hidden = false; window.scrollTo(0, 0); remake();
  const a = A, fs = M.fieldsOf(); FK.forEach(k => { if (S.fimp[k] == null) S.fimp[k] = 2; });
  app.innerHTML = '<section class="stack"><div><span class="eyebrow">' + esc(T.asmName(a)) + ' · ' + a.y + '</span><h2 style="font-size:clamp(24px,6vw,30px);margin-top:4px">' + T.prioH + '</h2>' +
    '<p class="lead">' + T.prioLead + '</p></div>' +
    '<div class="box"><div style="display:flex;justify-content:space-between;gap:8px;font-size:13px;color:var(--ink2)"><span>' + T.allot(a.N) + '</span><span class="num" id="ptot"></span></div><div class="fbar" id="pbar"></div><div class="syslg" id="plg"></div></div>' +
    '<div class="box" id="frows">' + fs.map(k => '<div class="frow" data-k="' + k + '"><div class="fh"><div><span class="fchip"><i class="dot" style="background:' + fld(k).c + '"></i>' + esc(fld(k).n) + '</span><small>' + esc(fld(k).d) + '</small></div><div class="fseats" data-s="' + k + '"></div></div>' + segHtml(k, S.fimp[k]) +
      '<div class="hint">' + T.qLbl + ' <b class="num" data-n="' + k + '"></b> <span>' + T.qAuto + '</span></div></div>').join('') + '</div>' +
    '<div class="launch"><button type="button" class="cta" id="go">' + T.goBtn + '</button><span id="goinfo"></span></div></section>';
  const upd = () => {
    remake(); autoCount(); const act = fs.filter(k => M.fw(k) > 0 && S.fcnt[k] > 0), C2 = M.chunks(act), nq = sum(act.map(k => S.fcnt[k]));
    fs.forEach(k => { const on = act.includes(k); $('.frow[data-k="' + k + '"]', app).classList.toggle('off', !on);
      $('[data-s="' + k + '"]', app).innerHTML = on ? C2[k].t + T.seatUnit + '<small>' + esc(seatTxt(C2[k])) + '</small>' : '0' + T.seatUnit + '<small>' + T.skipped + '</small>';
      $('[data-n="' + k + '"]', app).textContent = on ? T.nQ(S.fcnt[k]) : T.noneQ;
      $$('[data-f="' + k + '"]', app).forEach(b => b.setAttribute('aria-checked', String(+b.dataset.l === S.fimp[k]))); });
    const segs = act.map(k => [C2[k].t, fld(k).c, fld(k).n]);
    $('#pbar').innerHTML = segs.map(s => '<span style="width:' + (s[0] / a.N * 100) + '%;background:' + s[1] + '"></span>').join('');
    $('#plg').innerHTML = segs.map(s => '<span><i class="dot" style="background:' + s[1] + '"></i>' + esc(s[2]) + ' <b class="num">' + s[0] + '</b></span>').join('');
    $('#ptot').textContent = act.length ? T.fq(act.length, nq) : '';
    $('#go').disabled = !act.length; $('#goinfo').textContent = act.length ? T.goInfo(nq) : T.goNone;
  };
  $('#frows').addEventListener('click', e => { const b = e.target.closest('button[data-f]'); if (!b) return; S.fimp[b.dataset.f] = +b.dataset.l; upd(); });
  $('#go').addEventListener('click', () => {
    autoCount(); const act = fs.filter(k => M.fw(k) > 0 && S.fcnt[k] > 0);
    FK.forEach(k => { if (!act.includes(k)) S.fimp[k] = 0; }); remake();
    S.order = act.slice().sort((x, y) => M.fw(x) - M.fw(y) || FK.indexOf(x) - FK.indexOf(y));
    S.seq = []; S.order.forEach(k => M.qsOf(k, S.fcnt[k]).forEach(i => S.seq.push(i)));
    S.ans = a.Q.map(() => undefined); S.qi = 0; S.plan = null; S.runoff = {}; S.pick = []; S.cab = null; S.cabSt = null; S.pickTouched = false; viewQuiz();
  });
  upd();
}

/* ── 3. 질문 */
const ICON = { prev: '<svg viewBox="0 0 24 24"><path d="M6 5h2v14H6zM20 5v14L9.5 12z"/></svg>', next: '<svg viewBox="0 0 24 24"><path d="M7 5v14l11-7z"/></svg>', end: '<svg viewBox="0 0 24 24"><path d="M4 5v14l9.5-7zM16 5h2v14h-2z"/></svg>' };
function chgHtml(B, R2) {
  const ord = A.P.map((p, f) => f).filter(f => R2.tot[f] || B.tot[f]).sort((x, y) => R2.tot[y] - R2.tot[x]);
  return ord.map(f => { const d = R2.tot[f] - B.tot[f]; return '<span>' + mark(A.P[f]) + esc(A.P[f].n) + ' <b>' + R2.tot[f] + '</b>' + (d ? '<em class="' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '+' : '−') + Math.abs(d) + '</em>' : '') + '</span>'; }).join('');
}
function viewQuiz() {
  toHome.hidden = false; window.scrollTo(0, 0);
  const a = A, i = S.seq[S.qi], q = a.Q[i], k = q.f, F = fld(k);
  const fq = S.seq.filter(j => a.Q[j].f === k), n = fq.indexOf(i), C2 = M.chunks(S.order)[k];
  const nxt = S.seq[S.qi + 1], endField = nxt == null || a.Q[nxt].f !== k, fi = S.order.indexOf(k);
  let cur = S.ans[i] == null ? null : S.ans[i], drag = false;
  app.innerHTML = '<section>' +
    '<div class="qhead"><span class="eyebrow">' + esc(T.asmName(a)) + ' · ' + T.fieldOf(fi + 1, S.order.length) + '</span><span class="eyebrow num">' + (S.qi + 1) + ' / ' + S.seq.length + '</span></div>' +
    '<div class="prog" aria-hidden="true">' + S.seq.map((j, x) => '<i class="' + (x === S.qi ? 'cur' : S.ans[j] === null ? 'skip' : S.ans[j] !== undefined ? 'done' : '') + '"' + (x && a.Q[S.seq[x - 1]].f !== a.Q[j].f ? ' style="margin-left:6px"' : '') + '></i>').join('') + '</div>' +
    '<div class="stakebox"><span class="fchip"><i class="dot" style="background:' + F.c + '"></i>' + esc(F.n) + '</span><span>' + T.stake(C2.t, esc(seatTxt(C2))) + '</span><span>' + T.fieldQ(n + 1, fq.length) + '</span></div>' +
    '<div class="qmeta" style="margin-top:12px"><b>' + T.qNum(S.qi + 1) + '</b><span>' + esc(whenTxt(q)) + '</span></div>' +
    '<h2 class="qtitle">' + esc(q.t) + '</h2>' +
    '<div class="poles"><button type="button" class="pole l" style="--pc:' + PA.c + '" data-v="-1"><span class="pn"><i></i>' + T.A + '</span><span class="ps">' + esc(q.A) + '</span><em>' + T.leftEnd + '</em></button>' +
    '<button type="button" class="pole r" style="--pc:' + PB.c + '" data-v="1"><span class="pn">' + T.B + '<i></i></span><span class="ps">' + esc(q.B) + '</span><em>' + T.rightEnd + '</em></button></div>' +
    '<div class="player"><div class="track" id="track"><div class="rail"></div>' + [-1, -0.5, 0, 0.5, 1].map(t => '<div class="tick' + (t === 0 ? ' c' : '') + '" style="left:' + ((t + 1) / 2 * 100) + '%"></div>').join('') +
    '<div class="fill"></div><div class="bubble"></div><div class="thumb" role="slider" tabindex="0" aria-valuemin="-100" aria-valuemax="100" aria-valuenow="0" aria-label="' + esc(T.sliderAria(q.t)) + '"></div></div>' +
    '<div class="time"><span>' + T.A + '</span><span>' + T.neutral + '</span><span>' + T.B + '</span></div><p class="read" id="read" aria-live="polite"></p>' +
    '<div class="controls"><button type="button" class="ic" id="prev" aria-label="' + T.prevAria + '"' + (S.qi ? '' : ' disabled') + '>' + ICON.prev + '</button>' +
    '<button type="button" class="play" id="next">' + (endField ? ICON.end + esc(T.fieldRes(F.n)) : ICON.next + T.nextQ) + '</button>' +
    '<button type="button" class="ic" id="skip" aria-label="' + T.skipAria + '" title="' + T.skipTitle + '">?</button></div>' +
    '<div class="kbd">' + T.kbd + '</div></div></section>';
  const tr = $('#track'), th = $('.thumb', tr), fill = $('.fill', tr), bub = $('.bubble', tr), lp = $('.pole.l', app), rp = $('.pole.r', app);
  const draw = anim => {
    const v = cur === null ? 0 : cur, x = (v + 1) / 2 * 100, col = cur === null || Math.abs(v) < 0.08 ? 'var(--ink3)' : (v < 0 ? PA.c : PB.c);
    tr.classList.toggle('anim', !!anim); tr.classList.toggle('set', cur !== null); tr.style.setProperty('--fc', col);
    th.style.left = x + '%'; bub.style.left = x + '%'; fill.style.left = Math.min(50, x) + '%'; fill.style.width = Math.abs(x - 50) + '%';
    bub.textContent = cur === null ? '' : (Math.abs(v) < 0.08 ? '0' : (v < 0 ? '◂ ' : '') + Math.round(Math.abs(v) * 100) + (v > 0 ? ' ▸' : ''));
    th.setAttribute('aria-valuenow', Math.round(v * 100)); th.setAttribute('aria-valuetext', T.read(cur)); $('#read').textContent = T.read(cur);
    lp.style.setProperty('--o', cur === null || v <= 0.08 ? 1 : Math.max(0.5, 1 - v * 0.55)); rp.style.setProperty('--o', cur === null || v >= -0.08 ? 1 : Math.max(0.5, 1 + v * 0.55));
    lp.classList.toggle('on', cur !== null && v <= -0.08); rp.classList.toggle('on', cur !== null && v >= 0.08);
    $('#next').disabled = cur === null;
  };
  const set = (v, anim) => { v = clamp(v, -1, 1); if (Math.abs(v) < 0.04) v = 0; cur = Math.round(v * 100) / 100; draw(anim); };
  const fromX = cx => { const b = tr.getBoundingClientRect(); return (cx - b.left) / b.width * 2 - 1; };
  tr.addEventListener('pointerdown', e => { drag = true; try { tr.setPointerCapture(e.pointerId); } catch (_) {} set(fromX(e.clientX), e.target !== th); th.focus({ preventScroll: true }); e.preventDefault(); });
  tr.addEventListener('pointermove', e => { if (drag) set(fromX(e.clientX), false); });
  const end = () => { drag = false; }; tr.addEventListener('pointerup', end); tr.addEventListener('pointercancel', end);
  th.addEventListener('keydown', e => { const v = cur === null ? 0 : cur, st = e.shiftKey ? 0.25 : 0.1;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); set(v - st, true); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); set(v + st, true); }
    else if (e.key === 'Home') { e.preventDefault(); set(-1, true); } else if (e.key === 'End') { e.preventDefault(); set(1, true); }
    else if (e.key === 'Enter' && cur !== null) { e.preventDefault(); go(cur); } });
  [lp, rp].forEach(b => b.addEventListener('click', () => set(+b.dataset.v * 0.85, true)));
  const go = v => { S.ans[i] = v; if (endField) viewBoard(k); else { S.qi++; viewQuiz(); } };
  $('#next').addEventListener('click', () => { if (cur !== null) go(cur); });
  $('#skip').addEventListener('click', () => go(null));
  $('#prev').addEventListener('click', () => { if (cur !== null) S.ans[i] = cur; S.qi--; viewQuiz(); });
  draw(false); th.focus({ preventScroll: true });
}

/* ── 4. 분야별 의석 발표 */
function viewBoard(k) {
  window.scrollTo(0, 0);
  const a = A, fi = S.order.indexOf(k), done = S.order.slice(0, fi + 1), last = fi === S.order.length - 1, F = fld(k);
  const R = M.simAll(S.ans, done), fr = R.fields[k], C2 = R.C[k], given = sum(R.tot), R0 = M.simAll(S.ans, done.slice(0, -1));
  const base = M.simAll(S.ans.map((v, j) => a.Q[j] && a.Q[j].f === k ? undefined : v), done).fields[k];
  const ord = a.P.map((p, f) => f).filter(f => R.tot[f] || fr.tot[f]).sort((x, y) => R.tot[y] - R.tot[x] || fr.tot[y] - fr.tot[x]), mx = Math.max(1, ...ord.map(f => R.tot[f]));
  const up = ord.filter(f => fr.tot[f] > base.tot[f]).sort((x, y) => (fr.tot[y] - base.tot[y]) - (fr.tot[x] - base.tot[x])), dn = ord.filter(f => fr.tot[f] < base.tot[f]).sort((x, y) => (fr.tot[x] - base.tot[x]) - (fr.tot[y] - base.tot[y]));
  const nm = arr => arr.slice(0, 2).map(f => esc(a.P[f].n)).join('·');
  app.innerHTML = '<section class="stack"><div class="box">' +
    '<span class="eyebrow">' + T.fieldOf(fi + 1, S.order.length) + '</span><h2 style="font-size:clamp(22px,5.5vw,28px);margin:4px 0 6px">' + T.boardH(esc(F.n), C2.t) + '</h2>' +
    '<p class="hint">' + (fr.empty ? T.boardEmpty : esc(T.boardHint(seatTxt(C2)))) + '</p>' +
    '<div class="hemi" id="bh" style="margin-top:10px">' + hemiSvg(a.N) + '</div>' +
    '<div>' + ord.map(f => { const p = a.P[f], d = fr.tot[f] - base.tot[f];
      return '<div class="brow">' + mark(p) + '<div><b style="font-weight:600">' + esc(p.n) + '</b><small style="display:block;color:var(--ink3);font-size:12px;line-height:1.3">' + esc(T.thisField(fr.tot[f])) + (d ? ' · ' + esc(T.baseline(base.tot[f])) : '') + '</small><div class="bar"><span data-f="' + f + '" style="width:0;background:' + p.c + '"></span></div></div><span class="add" data-f="' + f + '"></span><span class="cum" data-f="' + f + '">0</span></div>'; }).join('') + '</div>' +
    '<p class="lead" style="margin-top:10px">' + T.upDown(nm(up), nm(dn)) + '</p></div>' +
    '<div class="launch"><button type="button" class="cta" id="cont">' + (last ? T.contFinal : esc(T.contNext(fld(S.order[fi + 1]).n))) + '</button>' + (!last ? '<span>' + esc(T.contInfo(fld(S.order[fi + 1]).n, R.C[S.order[fi + 1]].t)) + '</span>' : '') + '</div></section>';
  const el = $('#bh');
  paint(el, R0, null, null);
  const stage = () => { paint(el, R, T.allotted(given), a.N);
    ord.forEach((f, j) => { const v = fr.tot[f], ad = $('.add[data-f="' + f + '"]', app); $('.bar span[data-f="' + f + '"]', app).style.width = (R.tot[f] / mx * 100) + '%'; tweenNum($('.cum[data-f="' + f + '"]', app), R0.tot[f], R.tot[f]);
      ad.className = 'add' + (v > 0 ? ' popin' : ' zero'); ad.textContent = v > 0 ? '+' + v : '0'; ad.style.animationDelay = (j * 60) + 'ms'; }); };
  if (noMo()) stage(); else requestAnimationFrame(() => requestAnimationFrame(stage));
  $('#cont').addEventListener('click', () => { if (last) viewResult(); else { S.qi++; viewQuiz(); } });
}

/* ── 5. 결과 */
function bills(q, st) { let l = 0, r = 0, ab = 0; A.P.forEach((p, f) => { const x = pos(q, p); if (x <= -0.25) l += st[f]; else if (x >= 0.25) r += st[f]; else ab += st[f]; }); return { l, r, ab }; }
// 청천백일만지홍기: 붉은 바탕, 왼쪽 위 남색 칸에 12갈래 흰 해
const flagSvg = () => '<svg class="wb-flag" viewBox="0 0 90 60" role="img" aria-label="' + esc(T.flagAria) + '"><rect width="90" height="60" fill="#FE0000"/><rect width="45" height="30" fill="#000095"/>' +
  Array.from({ length: 12 }, (_, k) => { const t = k * Math.PI / 6, q = (r, d) => (22.5 + r * Math.cos(t + d)).toFixed(2) + ',' + (15 + r * Math.sin(t + d)).toFixed(2); return '<polygon fill="#fff" points="' + q(11.2, 0) + ' ' + q(5.6, 0.27) + ' ' + q(5.6, -0.27) + '"/>'; }).join('') +
  '<circle cx="22.5" cy="15" r="6.2" fill="#000095"/><circle cx="22.5" cy="15" r="5.3" fill="#fff"/></svg>';
// 기본 투표 방침: 같은 진영(남·녹)의 가장 큰 정당 후보에게, 그 밖은 자당 후보 또는 기권
function defaultPlan(st) {
  const pl = {}, big = {};
  A.P.forEach((p, f) => { if (!p.spc || !['blue', 'green'].includes(p.bloc)) return; if (big[p.bloc] == null || st[f] > st[big[p.bloc]]) big[p.bloc] = f; });
  A.P.forEach(p => { const b = big[p.bloc]; pl[p.k] = b != null ? A.P[b].k : p.spc ? p.k : 'blank'; });
  return pl;
}
function viewResult(keep) {
  const sy = window.scrollY; toHome.hidden = false;
  const a = A, R = M.simAll(S.ans), mine = R.tot, real = actual(), asked = a.Q.map((q, i) => i).filter(i => S.ans[i] !== undefined), answered = asked.filter(i => S.ans[i] != null).length, Mj = maj(a.N);
  if (!S.plan) S.plan = defaultPlan(real);
  const order = a.P.map((p, f) => f).sort((x, y) => mine[y] - mine[x] || real[y] - real[x]), L = order[0];
  const govF = a.gov.map(k => a.P.findIndex(p => p.k === k)).filter(f => f >= 0), govSeats = sum(govF.map(f => mine[f])), gN = govNames();
  const appoint = a.spMode === 'virtual';
  app.innerHTML = '<section class="stack">' +
    '<div class="rhead"><div class="pills"><span class="pill strong">' + a.y + '</span><span class="pill">' + esc(T.sysPill(a)) + '</span><span class="pill">' + (govSeats >= Mj ? T.govMaj : T.govMin) + '</span><span class="pill">' + T.answered(answered, asked.length) + '</span></div>' +
    '<h2>' + esc(T.resultH(a)) + '</h2><p class="lead" id="lead"></p>' +
    '<div class="cardsave"><button type="button" class="cta" id="cardgo">' + ICON_CAM + esc(T.card.btn) + '</button><span class="hint" id="cardmsg">' + esc(T.card.hint) + '</span></div></div>' +
    '<div class="box"><div style="display:flex;justify-content:center;margin-bottom:6px"><div class="seg" role="group" aria-label="' + T.viewAria + '"><button type="button" data-v="mine" aria-pressed="true">' + T.vMine + '</button><button type="button" data-v="real" aria-pressed="false">' + T.vReal + '</button></div></div>' +
    '<div class="hemi" id="rh">' + hemiSvg(a.N) + '</div>' + legend(T.lgMaj(Mj)) +
    '<div class="tw"><table class="tbl"><thead><tr><th>' + T.th[0] + '</th><th>' + T.th[1] + '</th>' + (a.L ? '<th>' + T.th[2] + '</th>' : '') + (a.F ? '<th>' + T.th[3] + '</th>' : '') + '<th>' + T.th[4] + '</th><th>' + T.th[5] + '</th><th>' + T.th[6] + '</th></tr></thead><tbody id="tb"></tbody></table></div></div>' +
    '<div class="box" id="pmbox"><h3>' + (appoint ? T.pmHAppoint : T.pmH) + '</h3>' + (appoint ? '<p class="hint" style="margin:4px 0 0">' + esc(T.pmAppoint) + '</p>' : '') + '<p class="hint sub" id="pmhint"></p><div class="tw"><table class="pm"><thead id="pmh"></thead><tbody id="pmb"></tbody></table></div><p class="vote" id="pmres"></p><p class="hint" id="pmreal" style="margin-top:4px"></p>' +
    '<details class="mv" style="margin-top:12px" open><summary>' + T.planH + '</summary><p class="hint" style="margin-top:6px">' + T.planHint + '</p><div class="plan" id="plan"></div><div id="ro"></div></details>' +
    '<p class="hint" style="margin-top:10px">' + esc(T.art67(a)) + '</p></div>' +
    '<div class="box" id="prbox"><h3>' + T.prH + '</h3><p class="hint sub" id="prhint"></p><div class="tw"><table class="pm"><thead><tr><th>' + T.thPR[0] + '</th><th>' + T.thPR[1] + '</th><th class="r">' + T.thPR[2] + '</th><th class="r">' + T.thPR[3] + '</th><th style="width:30%">' + T.thPR[4] + '</th></tr></thead><tbody id="prb"></tbody></table></div><p class="vote" id="prres"></p><p class="hint" id="prgov" style="margin-top:6px"></p></div>' +
    '<div class="box"><h3>' + T.wbH + '</h3><p class="hint sub">' + T.wbHint + '</p><div class="wb-wrap" id="wb"></div></div>' +
    '<div class="box"><h3>' + T.mapH + '</h3><p class="hint sub">' + esc(T.mapHint(a)) + '</p><div class="mapw"><div class="map" id="map"><p class="hint">' + esc(T.mapLoading) + '</p></div><div class="pd" id="pd"></div></div><div id="offmap"></div></div>' +
    '<div class="box"><h3>' + T.fH + '</h3><p class="hint sub">' + T.fHint + '</p><div class="fbar" id="fsum"></div><div class="syslg" id="fslg"></div><div id="fres" style="margin-top:10px"></div></div>' +
    '<div class="box"><h3>' + T.cmpH + '</h3><p class="hint sub">' + T.cmpHint + '</p><div id="cmp"></div></div>' +
    '<div class="box"><h3>' + T.thrH + '</h3><p class="hint sub">' + esc(T.thrHint(a)) + '</p><div class="thr" id="thr"></div></div>' +
    '<div class="box" id="cobox"><h3>' + T.coH + '</h3><p class="hint sub">' + esc(T.coHint(Mj)) + '</p><div class="coal" id="coal"></div><span class="hint" style="display:block;margin:14px 0 6px">' + T.coPick + '</span><div class="chips" id="copick"></div><div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:8px" id="cogo"></div><div id="cab"></div></div>' +
    '<div class="box"><h3>' + T.matchH + '</h3><p class="hint sub">' + T.matchHint + '</p><div class="match" id="match"></div></div>' +
    '<div class="box"><h3>' + T.billH + '</h3><p class="hint sub">' + T.billHint + '</p><div id="bills"></div></div>' +
    '<div class="acts"><button type="button" class="cta" id="cardgo2">' + ICON_CAM + esc(T.card.btn) + '</button><button type="button" class="cta" id="again">' + T.again + '</button><button type="button" class="cta ghost" id="other">' + T.other + '</button><span class="hint" id="cardmsg2" aria-live="polite"></span></div>' +
    '<details class="box how"><summary>' + T.howH + '</summary>' + T.how(a).map(p => '<p>' + esc(p) + '</p>').join('') + '</details></section>';

  // 반원 + 표
  const show = v => { S.view = v; const st = v === 'mine' ? mine : real; paint($('#rh'), v === 'mine' ? R : plain(real), v === 'mine' ? T.mineLbl : T.realLbl, a.N);
    $$('.seg button[data-v]', app).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v))); drawPM(st); drawPres(v === 'mine'); drawMap(v === 'mine' ? R.dist : a.P.map(p => p.sd), v === 'real'); };
  $$('.seg button[data-v]', app).forEach(b => b.addEventListener('click', () => show(b.dataset.v)));
  $('#tb').innerHTML = order.filter(f => mine[f] || real[f]).map(f => { const p = a.P[f], d = mine[f] - real[f];
    return '<tr><td><span>' + mark(p) + esc(p.n) + '</span></td><td>' + R.dist[f] + '</td>' + (a.L ? '<td>' + R.list[f] + '</td>' : '') + (a.F ? '<td>' + R.fix[f] + '</td>' : '') + '<td><b>' + mine[f] + '</b></td><td>' + real[f] + '</td><td class="' + (d > 0 ? 'up' : d < 0 ? 'down' : '') + '">' + (d > 0 ? '+' : '') + d + '</td></tr>'; }).join('');
  $('#lead').innerHTML = T.lead({ name: esc(a.P[L].n), seats: mine[L], L: a.L, d: R.dist[L], l: R.list[L], two3: mine[L] >= two3(a.N), maj: mine[L] >= Mj, short: Mj - mine[L], gov: esc(gN), govN: govF.length, old: a.y < 1990 });

  // 결과 카드 (PNG) — 그리기는 js/card.js
  const doCard = (btn, msg) => {
    const C = T.card, pm = E.pmVote(a, mine, S.plan, S.runoff), w = pm.win >= 0 ? a.P[pm.win] : null;
    const Lay = layout(a.N), K = 290, seq = [];
    leanOrder().forEach(f => { const c = a.P[f].c; for (let k = 0; k < R.dist[f] + R.fix[f]; k++) seq.push({ c, ring: false }); for (let k = 0; k < R.list[f]; k++) seq.push({ c, ring: true }); });
    const seats = Lay.seats.map((s, i) => ({ x: 300 + K * s.r * Math.cos(s.t), y: 302 - K * s.r * Math.sin(s.t), c: seq[i] ? seq[i].c : null, ring: !!(seq[i] && seq[i].ring) }));
    const top = a.P[L], dt = new Date(), pad = n => String(n).padStart(2, '0');
    const tiles = [
      { label: C.first, value: top.n, sub: C.seats(mine[L]), c: top.c },
      { label: C.status, value: mine[L] >= two3(a.N) ? C.two3 : mine[L] >= Mj ? C.soloMaj : C.noMaj },
      { label: appoint ? C.pmA : C.pm, value: w ? w.spc[0] : C.pmNone, sub: w ? (LANG === 'zh' ? w.n : w.spc[1]) : '', c: w ? w.c : '' }
    ];
    if (govF.length) tiles.push({ label: C.gov, value: C.seats(govSeats), sub: (govSeats >= Mj ? C.govMaj : C.govMin) + ' · ' + gN });
    const rows = order.filter(f => mine[f] || real[f]).map(f => { const p = a.P[f], d = mine[f] - real[f];
      return { n: p.n, c: p.c, m: mine[f], sub: (a.L ? C.dist + ' ' + R.dist[f] + ' · ' + C.pr + ' ' + R.list[f] + ' · ' : '') + (a.F ? C.fix + ' ' + R.fix[f] + ' · ' : '') + C.real + ' ' + real[f] + (d ? ' (' + (d > 0 ? '+' : '−') + Math.abs(d) + ')' : '') }; });
    const legend = [{ k: 'smd', t: T.lgSmd }].concat(a.L ? [{ k: 'pr', t: T.lgPr }] : [], [{ k: 'maj', t: T.lgMaj(Mj) }]);
    const skin = document.documentElement.dataset.skin;
    TWCard.save({
      mast: skin === 'paper' ? C.mastPaper : C.mast, date: dt.getFullYear() + '.' + pad(dt.getMonth() + 1) + '.' + pad(dt.getDate()),
      eyebrow: a.y + ' · ' + T.sysPill(a), title: T.resultH(a), meta: C.meta(answered, asked.length, a.N, Mj),
      seats, seatR: K * Lay.rad, N: a.N, hemiLabel: T.mineLbl, legend, tiles, rows,
      site: document.title, url: 'hosain1291.github.io/yuan-simulator'
    }, C.file(a.y), btn, msg, C);
  };
  $('#cardgo').addEventListener('click', () => doCard($('#cardgo'), $('#cardmsg')));
  $('#cardgo2').addEventListener('click', () => doCard($('#cardgo2'), $('#cardmsg2')));

  // 총리 지명선거
  const sub = p => LANG === 'zh' ? '' : p.spc[1];
  const cname = c => LANG === 'zh' ? c.spc[0] : c.spc[1];
  function drawPM(st) {
    const pm = E.pmVote(a, st, S.plan, S.runoff), r1 = pm.r1, r2 = pm.r2;
    $('#pmhint').textContent = T.pmHint(S.view === 'mine', r1.cast, r1.need);
    $('#pmh').innerHTML = '<tr><th>' + T.thPM[0] + '</th><th>' + T.thPM[1] + '</th><th class="r">' + T.thPM[2] + '</th>' + (r2 ? '<th class="r">' + T.thPM[3] + '</th>' : '') + '<th style="width:30%">' + T.thPM[4] + '</th></tr>';
    $('#pmb').innerHTML = r1.order.map(f => { const p = a.P[f], v1 = r1.tally[f], v2 = r2 && r2.tally[f] != null ? r2.tally[f] : null, shown = v2 != null ? v2 : v1, back = (r1.voters[f] || []).filter(x => x !== f).map(x => a.P[x].n);
      return '<tr class="' + (pm.win === f ? 'win' : '') + '"><td><div class="who"><span class="ph" style="background:' + p.c + '">' + esc(p.spc[0].slice(0, 1)) + '</span><div><div class="jn">' + esc(p.spc[0]) + (pm.win === f ? ' <span class="badge">' + T.badge + '</span>' : '') + '</div>' + (sub(p) ? '<div class="kn">' + esc(sub(p)) + '</div>' : '') + '</div></div></td>' +
        '<td>' + esc(p.n) + (back.length ? '<div class="bk">+ ' + back.map(esc).join('·') + '</div>' : '') + '</td><td class="r num">' + v1 + '</td>' + (r2 ? '<td class="r num">' + (v2 == null ? '—' : v2) + '</td>' : '') +
        '<td><div class="vb"><span style="width:' + (shown / r1.cast * 100).toFixed(1) + '%;background:' + p.c + '"></span><em style="left:' + (r1.need / r1.cast * 100).toFixed(1) + '%"></em></div></td></tr>'; }).join('') +
      '<tr><td colspan="2" class="hint">' + T.blankRow + '</td><td class="r num">' + r1.blank + '</td>' + (r2 ? '<td class="r num">' + r2.blank + '</td>' : '') + '<td></td></tr>';
    if (pm.win >= 0) { const w = a.P[pm.win]; $('#pmres').innerHTML = T.pmWin({ ja: esc(w.spc[0]), sub: esc(sub(w)), party: esc(w.n), r2: !!r2, v: r2 ? r2.tally[pm.win] : r1.tally[pm.win], v2: r2 ? r2.tally[r2.fin.find(x => x !== pm.win)] : 0, need: r1.need }); }
    else $('#pmres').textContent = T.pmNone;
    $('#pmreal').textContent = T.realP + a.spReal;
    const cands = a.P.filter(p => p.spc && p.k !== 'ind');
    $('#plan').innerHTML = a.P.map((p, f) => st[f] ? '<label>' + mark(p) + '<span>' + esc(p.n) + ' <span class="num hint">' + st[f] + '</span></span><select class="in" data-pl="' + p.k + '">' +
      cands.map(c => '<option value="' + c.k + '"' + (S.plan[p.k] === c.k ? ' selected' : '') + '>' + (c.k === p.k ? esc(T.own) : '') + esc(cname(c)) + (c.k === p.k ? '' : ' (' + esc(c.n) + ')') + '</option>').join('') +
      '<option value="blank"' + (S.plan[p.k] === 'blank' ? ' selected' : '') + '>' + T.blankVote + '</option></select></label>' : '').join('');
    if (r2) { const fin = r2.fin;
      $('#ro').innerHTML = '<p class="hint" style="margin:12px 0 0">' + T.roHint + '</p><div class="plan">' + a.P.map((p, f) => { if (!st[f]) return ''; const t = a.P.findIndex(x => x.k === S.plan[p.k]); if (fin.includes(t)) return '';
        return '<label>' + mark(p) + '<span>' + esc(p.n) + '</span><select class="in" data-ro="' + p.k + '">' + fin.map(x => '<option value="' + a.P[x].k + '"' + (S.runoff[p.k] === a.P[x].k ? ' selected' : '') + '>' + esc(cname(a.P[x])) + '</option>').join('') + '<option value="blank"' + (!S.runoff[p.k] || S.runoff[p.k] === 'blank' ? ' selected' : '') + '>' + T.blankVote + '</option></select></label>'; }).join('') + '</div>'; }
    else $('#ro').innerHTML = '';
  }
  $('#pmbox').addEventListener('change', e => { const t = e.target; if (t.dataset.pl) { S.plan[t.dataset.pl] = t.value; S.runoff = {}; } else if (t.dataset.ro) S.runoff[t.dataset.ro] = t.value; else return;
    drawPM(S.view === 'mine' ? mine : real); });

  // 총통 선거: 실제 득표율에 정당 득표 변화를 비례 스윙으로 얹어 계산
  const PR = (window.PRES || {})[a.y], baseVs = M.simAll(a.Q.map(() => undefined)).vs;
  function presSim(vs) {
    const sup = c => sum(Object.keys(c[3]).map(k => { const f = a.P.findIndex(p => p.k === k); return f >= 0 ? c[3][k] * (vs[f] || 0) : 0; }));
    const raw = PR.C.map(c => { const bs = baseSup(c); return c[4] != null ? (bs > 0 ? c[4] * sup(c) / bs : c[4]) : sup(c) * 100; });
    const t = sum(raw) || 1; return raw.map(x => x / t * 100);
  }
  const baseSup = c => sum(Object.keys(c[3]).map(k => { const f = a.P.findIndex(p => p.k === k); return f >= 0 ? c[3][k] * (baseVs[f] || 0) : 0; }));
  function drawPres(mineView) {
    if (!PR) { $('#prbox').hidden = true; return; }
    const sim = presSim(R.vs), show = mineView || PR.mode === 'indirect' ? sim : PR.C.map(c => c[4]), win = show.indexOf(Math.max(...show));
    const lab = c => { const p = a.P.find(x => x.k === c[2]); return p ? { n: p.n, c: p.c } : c[2] === 'opp' ? { n: T.prOpp, c: 'var(--pa)' } : { n: T.prInd, c: 'var(--ink3)' }; };
    const cn = c => LANG === 'zh' ? c[0] : ((I.data && I.data.people && I.data.people[c[0]]) || c[1]);
    $('#prhint').textContent = T.prHint(PR, a);
    $('#prb').innerHTML = PR.C.map((c, j) => { const L2 = lab(c); return '<tr class="' + (j === win ? 'win' : '') + '"><td><div class="who"><span class="ph" style="background:' + L2.c + '">' + esc(c[0].slice(0, 1)) + '</span><div><div class="jn">' + esc(c[0]) + (j === win ? ' <span class="badge">' + T.badge + '</span>' : '') + '</div>' + (LANG !== 'zh' ? '<div class="kn">' + esc(cn(c)) + '</div>' : '') + '</div></div></td>' +
      '<td>' + esc(L2.n) + '</td><td class="r num">' + sim[j].toFixed(1) + '%</td><td class="r num">' + (c[4] != null ? c[4].toFixed(1) + '%' : '—') + '</td><td><div class="vb"><span style="width:' + Math.min(100, show[j]).toFixed(1) + '%;background:' + L2.c + '"></span><em style="left:50%"></em></div></td></tr>'; }).join('');
    const W2 = PR.C[win], wp = a.P.find(x => x.k === W2[2]);
    $('#prres').innerHTML = T.prWin(esc(W2[0]), esc(cn(W2)), esc(lab(W2).n), show[win].toFixed(1), mineView, PR);
    const st = mineView ? mine : real, ws = wp ? (a.P.filter(p => p.bloc === wp.bloc && wp.bloc !== 'ind' && wp.bloc !== 'oth' || p === wp).reduce((t, p) => t + st[a.P.indexOf(p)], 0)) : 0;
    $('#prgov').textContent = T.prGov(lab(W2).n, ws, Mj, !!wp, PR);
  }

  // 인포박스
  const pct = v => (v * 100).toFixed(1) + '%';
  (function () {
    const st = mine, ord = order.filter(f => st[f] > 0), top = ord.slice(0, 6), rest = ord.slice(6), i = DATA.findIndex(d => d.n === a.n), prv = DATA[i - 1], nxt = DATA[i + 1];
    let rows = '';
    for (let k = 0; k < top.length; k += 3) { const g = top.slice(k, k + 3), pad = '<td></td>'.repeat(3 - g.length), row = (th, fn) => '<tr><th scope="row">' + th + '</th>' + g.map(f => '<td>' + fn(f, a.P[f]) + '</td>').join('') + pad + '</tr>';
      rows += row('', (f, p) => '<div class="wb-ph" style="--c:' + p.c + '"><span>' + esc((p.ld || p.zh).slice(0, 1)) + '</span></div>') +
        row(T.wbLeader, (f, p) => p.ldk ? (f === ord[0] ? '<b>' + esc(p.ldk) + '</b>' : esc(p.ldk)) : '—') +
        row(T.wbParty, (f, p) => '<span style="color:var(--link)">' + esc(p.n) + '</span>') +
        row(T.wbVote(a), f => pct(R.vs[f])) +
        row(T.wbSeats, f => f === ord[0] ? '<b>' + st[f] + '</b>' : String(st[f])) +
        (a.L ? row(T.wbSplit, f => R.dist[f] + ' / ' + R.list[f]) : '') +
        row(T.wbReal, (f, p) => { const d = st[f] - p.s; return p.s + ' <small class="' + (d > 0 ? 'up' : d < 0 ? 'down' : '') + '">(' + (d > 0 ? '▲' + d : d < 0 ? '▼' + (-d) : '±0') + ')</small>'; }) +
        '<tr><td colspan="4" class="wb-hr"></td></tr>'; }
    $('#wb').innerHTML = '<table class="wb"><tbody><tr><th colspan="4" class="wb-title">' + esc(T.elecTitle(a)) + '<div>' + T.wbSub + '</div></th></tr>' +
      '<tr><td colspan="4">' + flagSvg() + '</td></tr>' +
      '<tr><td colspan="4"><div class="wb-nav"><span>' + (prv ? '<button type="button" class="wb-a" data-go="' + (i - 1) + '">← ' + prv.y + '</button>' : '') + '</span><b>' + esc(T.date(a.date)) + '</b><span>' + (nxt ? '<button type="button" class="wb-a" data-go="' + (i + 1) + '">' + nxt.y + ' →</button>' : '') + '</span></div></td></tr>' +
      '<tr><th scope="row">' + T.wbN + '</th><td colspan="3" class="wb-r">' + esc(T.wbNv(a)) + '</td></tr>' +
      '<tr><th scope="row">' + T.wbMaj + '</th><td colspan="3" class="wb-r">' + esc(T.wbMajv(Mj, two3(a.N))) + '</td></tr><tr><td colspan="4" class="wb-hr"></td></tr>' + rows +
      '<tr><td colspan="4"><div class="hemi" id="wbh">' + hemiSvg(a.N) + '</div><div class="wb-cap">' + T.wbCap + '</div></td></tr>' +
      (rest.length ? '<tr><th scope="row">' + T.wbEtc + '</th><td colspan="3" class="wb-r">' + rest.map(f => esc(a.P[f].n) + ' ' + st[f]).join(', ') + '</td></tr>' : '') +
      '<tr><th scope="row">' + T.wbFirst + '</th><td colspan="3" class="wb-r">' + esc(T.wbFirstV(a.P[L].n, st[L], st[L] >= Mj)) + '</td></tr>' +
      '<tr><th scope="row">' + T.wbGov + '</th><td colspan="3" class="wb-r">' + esc(T.wbGovV(gN, govSeats, govSeats >= Mj)) + '</td></tr>' +
      '<tr><th scope="row">' + T.wbPM + '</th><td colspan="3" class="wb-r">' + esc(a.pres) + '<br>' + esc(a.prem) + '</td></tr></tbody></table>';
    paint($('#wbh'), R, '', ''); $('#wbh .big').textContent = ''; $('#wbh .sm').textContent = '';
    $('#wb').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (!b) return; S.ai = +b.dataset.go; sv('tw-sel', S.ai); load(); viewHome(); });
  })();

  // 선거구 지도: maps/YYYY.svg(라벨을 지운 지도)를 불러와 data-k(선거구 키)마다 색칠
  const DM = window.DISTRICTS[a.y], rows = DM.rows, onMap = rows.filter(r => !r[5]), offRows = rows.filter(r => r[5]), tip = $('#tip');
  const rname = r => LANG === 'zh' ? r[0] : ((I.data && I.data.dn && I.data.dn[r[0]]) || r[1]);
  let place = {}, mapReady = false, pending = null;
  if (!S.sel || !rows.some(r => r[0] === S.sel)) S.sel = onMap[0][0];
  fetch('maps/' + DM.map + '.svg').then(r => { if (!r.ok) throw 0; return r.text(); }).then(txt => {
    const m = $('#map'); if (!m || !m.isConnected) return;
    m.innerHTML = txt.replace(/<\?xml[^>]*>/, '');
    const svg = $('svg', m); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', T.mapAria);
    if (+DM.map >= 2008) [['T', 3, 10], ['K', 103, 10], ['KM', 3, 110], ['MT', 58, 110]].forEach(([k, x, y]) => svg.insertAdjacentHTML('beforeend', '<text class="lab" x="' + x + '" y="' + y + '">' + esc(T.inset[k]) + '</text>'));
    else svg.classList.add('mmd');
    $$('path[data-k]', svg).forEach(p => p.setAttribute('tabindex', '0'));
    mapReady = true; if (pending) drawMap(...pending);
  }).catch(() => { const m = $('#map'); if (m) m.innerHTML = '<p class="hint">' + esc(T.mapFail) + '</p>'; });
  function drawMap(dist, realView) {
    pending = [dist, realView];
    place = E.placeSeats(a, dist, rows);
    // 소선거구 ‘실제 결과’는 지도 원본 색에서 읽은 실제 당선 정당
    if (realView && a.sys === 'smd') onMap.forEach(r => { const f = a.P.findIndex(p => p.k === r[4]); if (f >= 0 && place[r[0]]) place[r[0]].won = a.P.map((_, g) => g === f ? 1 : 0); });
    if (mapReady) onMap.forEach(r => { const res = place[r[0]]; if (!res) return; const top = res.won.indexOf(Math.max(...res.won));
      $$('#map path[data-k="' + CSS.escape(r[0]) + '"]').forEach(el => { el.style.fill = a.P[top].c; el.style.fillOpacity = (0.4 + 0.6 * res.won[top] / Math.max(1, res.n)).toFixed(2); el.classList.toggle('sel', r[0] === S.sel); }); });
    $('#offmap').innerHTML = offRows.length ? '<p class="hint" style="margin-top:12px">' + esc(T.offH) + '</p><div class="offmap">' + offRows.map(r => { const res = place[r[0]]; if (!res) return ''; const fs = a.P.map((_, f) => f).filter(f => res.won[f]).sort((x, y) => res.won[y] - res.won[x]);
      return '<button type="button" data-k="' + esc(r[0]) + '" class="' + (r[0] === S.sel ? 'sel' : '') + '"><b>' + esc(rname(r)) + ' <span class="num hint">' + r[2] + '</span></b><span class="wbar">' + fs.map(f => '<span style="width:' + (res.won[f] / res.n * 100) + '%;background:' + a.P[f].c + '"></span>').join('') + '</span></button>'; }).join('') + '</div>' : '';
    drawPref();
  }
  function drawPref() {
    const r = rows.find(x => x[0] === S.sel) || onMap[0], res = place[r[0]]; if (!res) return;
    const fs = a.P.map((_, f) => f).filter(f => res.won[f]).sort((x, y) => res.won[y] - res.won[x]);
    $('#pd').innerHTML = '<h4>' + esc(rname(r)) + '</h4>' + (LANG !== 'zh' ? '<p class="meta" style="margin:0">' + esc(r[0]) + '</p>' : '') + '<p class="meta">' + esc(T.prefMeta(res.n, S.view === 'mine')) + '</p>' +
      '<div class="wbar">' + fs.map(f => '<span style="width:' + (res.won[f] / res.n * 100) + '%;background:' + a.P[f].c + '"></span>').join('') + '</div>' +
      '<div class="syslg" style="flex-direction:column;gap:4px">' + fs.map(f => '<span>' + mark(a.P[f]) + esc(a.P[f].n) + ' <b class="num">' + res.won[f] + '</b></span>').join('') + '</div>' +
      '<p class="hint" style="margin-top:8px">' + esc(T.mapNote(a)) + '</p>';
  }
  const pick = k => { S.sel = k; $$('#map path[data-k]').forEach(x => x.classList.toggle('sel', x.dataset.k === k)); $$('#offmap button').forEach(x => x.classList.toggle('sel', x.dataset.k === k)); drawPref(); };
  $('#map').addEventListener('click', e => { const c = e.target.closest('path[data-k]'); if (c) pick(c.dataset.k); });
  $('#offmap').addEventListener('click', e => { const c = e.target.closest('button[data-k]'); if (c) pick(c.dataset.k); });
  $('#map').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.k) pick(e.target.dataset.k); });
  $('#map').addEventListener('mousemove', e => { const c = e.target.closest('path[data-k]'); if (!c) { tip.hidden = true; return; } const r = rows.find(x => x[0] === c.dataset.k), res = r && place[r[0]]; if (!res) return;
    tip.textContent = rname(r) + ' · ' + a.P.map((x, f) => [x, res.won[f]]).filter(x => x[1]).sort((x, y) => y[1] - x[1]).map(x => x[0].n + ' ' + x[1]).join(', ');
    tip.hidden = false; tip.style.left = Math.min(e.clientX + 12, innerWidth - 250) + 'px'; tip.style.top = (e.clientY + 14) + 'px'; });
  $('#map').addEventListener('mouseleave', () => { tip.hidden = true; });

  // 분야별
  const lean = leanOrder(), fsAll = M.fieldsOf();
  $('#fsum').innerHTML = R.act.map(k => '<span style="width:' + (R.C[k].t / a.N * 100) + '%;background:' + fld(k).c + '"></span>').join('');
  $('#fslg').innerHTML = R.act.map(k => '<span><i class="dot" style="background:' + fld(k).c + '"></i>' + esc(fld(k).n) + ' <b class="num">' + R.C[k].t + '</b></span>').join('');
  $('#fres').innerHTML = fsAll.map(k => { const on = R.act.includes(k), fr = R.fields[k], C2 = R.C[k], nq = asked.filter(i => a.Q[i].f === k).length, top = on ? a.P.map((p, f) => f).filter(f => fr.tot[f] > 0).sort((x, y) => fr.tot[y] - fr.tot[x]).slice(0, 4) : [];
    return '<div class="frow' + (on ? '' : ' off') + '"><div class="fh"><div><span class="fchip"><i class="dot" style="background:' + fld(k).c + '"></i>' + esc(fld(k).n) + '</span><small>' + T.fAns(nq) + (on && fr.empty ? T.fEmpty : '') + '</small></div><div class="fseats">' + (on ? C2.t + T.seatUnit + '<small>' + esc(seatTxt(C2)) + '</small>' : '0' + T.seatUnit + '<small>' + T.fOff + '</small>') + '</div></div>' + segHtml(k, S.fimp[k] || 0, true) +
      (on ? '<div class="fbar">' + lean.map(f => '<span style="width:' + (fr.tot[f] / Math.max(1, C2.t) * 100) + '%;background:' + a.P[f].c + '" title="' + esc(a.P[f].n) + ' ' + fr.tot[f] + '"></span>').join('') + '</div><div class="syslg">' + top.map(f => '<span>' + mark(a.P[f]) + esc(a.P[f].n) + ' <b class="num">' + fr.tot[f] + '</b></span>').join('') + '</div>' : '') + '</div>'; }).join('');
  $('#fres').addEventListener('click', e => { const b = e.target.closest('button[data-f]'); if (!b) return; S.fimp[b.dataset.f] = +b.dataset.l; remake(); S.cab = null; S.cabSt = null; viewResult(true); });

  // 스펙트럼 맵
  (function () {
    const W = 380, p0 = 40, p1 = W - 40, sc = v => p0 + (clamp(v, -1, 1) + 1) / 2 * (p1 - p0), mid = W / 2, xy = E.partyAx(a);
    const pts = a.P.map((p, f) => ({ x: sc(xy[f].e), y: sc(-xy[f].s), c: p.c, n: p.n, r: mine[f] ? 4 + 13 * Math.sqrt(mine[f] / a.N) : 3, o: mine[f] ? 1 : 0.35 })).filter((_, f) => a.P[f].k !== 'ind' && a.P[f].k !== 'etc');
    const o = [0, 0], w = [0, 0]; a.Q.forEach((q, i) => { const v = S.ans[i]; if (v == null || !q.ax) return; const k = q.ax === 'e' ? 0 : 1, ww = Math.max(1, M.fw(q.f)); o[k] += v * ww; w[k] += ww; });
    if (w[0] + w[1]) pts.push({ x: sc(w[0] ? o[0] / w[0] : 0), y: sc(-(w[1] ? o[1] / w[1] : 0)), you: true, n: T.me, r: 7 });
    let g = '<rect x="' + p0 + '" y="' + p0 + '" width="' + (p1 - p0) + '" height="' + (p1 - p0) + '" fill="var(--sunk)" stroke="var(--line2)"/><line x1="' + mid + '" y1="' + p0 + '" x2="' + mid + '" y2="' + p1 + '" stroke="var(--line2)"/><line x1="' + p0 + '" y1="' + mid + '" x2="' + p1 + '" y2="' + mid + '" stroke="var(--line2)"/>' +
      '<text x="' + mid + '" y="' + (p0 - 12) + '" text-anchor="middle" class="ax">' + esc(T.cmpAx[0]) + '</text><text x="' + mid + '" y="' + (p1 + 22) + '" text-anchor="middle" class="ax">' + esc(T.cmpAx[1]) + '</text>' +
      '<text x="' + (p0 - 14) + '" y="' + mid + '" text-anchor="middle" class="ax" transform="rotate(-90 ' + (p0 - 14) + ' ' + mid + ')">' + esc(T.cmpAx[2]) + '</text><text x="' + (p1 + 14) + '" y="' + mid + '" text-anchor="middle" class="ax" transform="rotate(90 ' + (p1 + 14) + ' ' + mid + ')">' + esc(T.cmpAx[3]) + '</text>';
    pts.slice().sort((x, y) => y.r - x.r).forEach(p => { g += p.you ? '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="7" fill="var(--surface)" stroke="var(--ink)" stroke-width="3"/>' : '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + p.r.toFixed(1) + '" fill="' + p.c + '" fill-opacity="' + (0.85 * p.o) + '" stroke="var(--surface)"/>'; });
    const placed = []; let lab = '';
    pts.slice().sort((x, y) => x.y - y.y).forEach(p => { const t = p.n.length > 14 ? p.n.slice(0, 13) + '…' : p.n, wd = t.length * (LANG === 'en' ? 6 : 10) + 4, left = p.x > W * 0.62, gap = p.r + 4, x0 = left ? p.x - gap - wd : p.x + gap; let y = p.y + 4;
      for (let k = 0; k < 8 && placed.some(b => Math.abs(b.y - y) < 12 && x0 < b.x1 && x0 + wd > b.x0); k++) y += 12;
      placed.push({ x0, x1: x0 + wd, y }); lab += '<text x="' + (left ? p.x - gap : p.x + gap).toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="' + (left ? 'end' : 'start') + '" class="lb' + (p.you ? ' you' : '') + '">' + esc(t) + '</text>'; });
    $('#cmp').innerHTML = '<div class="cmp"><svg viewBox="0 0 ' + W + ' ' + (W + 6) + '" role="img" aria-label="' + esc(T.cmpAria) + '">' + g + lab + '</svg></div>';
  })();

  // 정족수: 과반 · 3분의 2 · 4분의 3
  (function () {
    const N = a.N, T2 = two3(N), T3 = three4(N);
    const row = (lab, need, hint) => '<div class="t"><b>' + lab + '</b><span class="num">' + need + T.seatUnit + '</span><small>' + esc(T.thrRow({ hint, first: a.P[L].n, ok: mine[L] >= need, short: need - mine[L], gov: gN, okg: govSeats >= need, shortg: need - govSeats })) + '</small></div>';
    let h = '<div><div class="meter">' + lean.map(f => '<span style="width:' + (mine[f] / N * 100) + '%;background:' + a.P[f].c + '"></span>').join('') + '<i class="mk" style="left:' + (Mj / N * 100) + '%"></i><i class="mk l2" style="left:' + (T2 / N * 100) + '%"></i><i class="mk l2" style="left:' + (T3 / N * 100) + '%"></i></div>' +
      '<div class="mlab"><span style="left:' + (Mj / N * 100) + '%">' + Mj + '</span><span style="left:' + (T2 / N * 100) + '%">' + T2 + '</span><span style="left:' + (T3 / N * 100) + '%">' + T3 + '</span></div></div>';
    h += row(T.thrMaj, Mj, T.thrMajH(a)) + row(T.thr23, T2, T.thr23H(a)) + row(T.thr34, T3, T.thr34H(a));
    $('#thr').innerHTML = h;
  })();

  // 연립·내각
  const coBar = m => '<div class="vbar">' + m.map(f => '<span style="width:' + (mine[f] / a.N * 100) + '%;background:' + a.P[f].c + '"></span>').join('') + '<em style="left:' + (Mj / a.N * 100) + '%"></em></div>';
  const coRow = (m, label) => '<div class="co"><div class="t"><span>' + (label ? '<b>' + esc(label) + '</b> ' : '') + m.map(f => esc(a.P[f].n)).join(' + ') + '</span><em class="num">' + sum(m.map(f => mine[f])) + T.seatUnit + '</em></div>' + coBar(m) + '<div style="margin-top:6px"><button type="button" class="chip" data-co="' + m.join(',') + '">' + T.coCab + '</button></div></div>';
  const cos = mine[L] >= Mj ? [] : E.coalitions(a, mine, true);
  $('#coal').innerHTML = (mine[L] >= Mj ? coRow([L], T.coSingle) : '') + (govF.length && govSeats >= Mj && !(govF.length === 1 && govF[0] === L) ? coRow(govF, T.coActual) : '') + cos.map(c => coRow(c.m)).join('') +
    (!cos.length && mine[L] < Mj ? '<p class="hint">' + T.coNone + '</p>' : '');
  if (!S.pick.length && !S.pickTouched) S.pick = govF.filter(f => mine[f] > 0);
  const drawPick = () => { S.pick = S.pick.filter(f => mine[f] > 0); const t = sum(S.pick.map(f => mine[f]));
    $('#copick').innerHTML = a.P.map((p, f) => mine[f] && p.k !== 'ind' ? '<button type="button" class="chip" data-pk="' + f + '" aria-pressed="' + S.pick.includes(f) + '">' + mark(p, 9) + esc(p.n) + ' · ' + mine[f] + '</button>' : '').join('');
    $('#cogo').innerHTML = '<button type="button" class="chip" data-co="' + S.pick.join(',') + '"' + (S.pick.length ? '' : ' disabled') + '>' + T.coCab + '</button><button type="button" class="chip" id="toPM"' + (S.pick.length ? '' : ' disabled') + '>' + T.coPM + '</button><span class="hint">' + esc(T.coSum(t, Mj)) + '</span>'; };
  const drawCab = () => {
    if (!S.cab) { $('#cab').innerHTML = ''; return; } const m = S.cab.filter(f => mine[f] > 0); if (!m.length) { $('#cab').innerHTML = ''; return; }
    const lead = m.slice().sort((x, y) => mine[y] - mine[x]), key = lead.join(','), ML = MINS[a.mins].split(' ');
    if (!S.cabSt || S.cabSt.key !== key) {
      const k = {}, out = [], left = ML.slice(); lead.forEach(f => { k[f] = 0; });
      for (let n = 0; left.length; n++) { let f = lead[0]; if (n > 0) lead.forEach(x => { if (mine[x] / (k[x] + 1) > mine[f] / (k[f] + 1) + 1e-9) f = x; });
        let pick = left[0]; if (n > 0) { const aff = mn => { const fk = MINF(mn); return R.fields[fk] && R.C[fk] && R.C[fk].t ? R.fields[fk].tot[f] / R.C[fk].t : 0; }; pick = left.slice().sort((x, y) => aff(y) - aff(x) || ML.indexOf(x) - ML.indexOf(y))[0]; }
        out.push({ min: pick, f }); left.splice(left.indexOf(pick), 1); k[f]++; }
      out.sort((x, y) => ML.indexOf(x.min) - ML.indexOf(y.min)); S.cabSt = { key, list: out };
    }
    const st = S.cabSt, t = sum(m.map(f => mine[f])), cnt = {}; st.list.forEach(x => { cnt[x.f] = (cnt[x.f] || 0) + 1; });
    const PMp = a.P[lead[0]], pmName = PMp.ld ? (LANG === 'zh' ? PMp.ld : PMp.ldk) : PMp.n, pmJa = PMp.ld && LANG !== 'zh' ? PMp.ld : '';
    $('#cab').innerHTML = '<div class="cabbox"><h4>' + esc(T.cabTitle(m.map(f => a.P[f].n).join('·'), m.length === 1, t)) + '</h4>' +
      '<p class="vote">' + T.cabPM(esc(pmName), esc(pmJa), t, Mj) + '</p>' +
      '<div class="syslg" style="margin:6px 0 4px">' + m.filter(f => cnt[f]).map(f => '<span>' + mark(a.P[f]) + esc(a.P[f].n) + T.cabN(cnt[f]) + '</span>').join('') + '</div>' +
      '<p class="hint">' + esc(T.cabHint(a.y, st.list.length)) + '</p><div class="cabg">' +
      st.list.map((x, j) => { const p = a.P[x.f]; return '<div class="cabr" style="--c:' + p.c + '"><span class="num">' + (j + 1) + '</span><b>' + esc(minName(x.min)) + '</b>' +
        (m.length > 1 && x.min !== PMIN ? '<select class="in" data-cp="' + j + '" aria-label="' + esc(T.cabSel(minName(x.min))) + '">' + m.map(f => '<option value="' + f + '"' + (f === x.f ? ' selected' : '') + '>' + esc(a.P[f].n) + '</option>').join('') + '</select>' : '<span class="hint">' + esc(p.n) + (x.min === PMIN ? ' · ' + esc(pmName) : '') + '</span>') + '</div>'; }).join('') + '</div></div>';
  };
  $('#cobox').addEventListener('click', e => {
    const pk = e.target.closest('[data-pk]'); if (pk) { S.pickTouched = true; const f = +pk.dataset.pk, i = S.pick.indexOf(f); if (i >= 0) S.pick.splice(i, 1); else S.pick.push(f); drawPick(); return; }
    if (e.target.closest('#toPM')) { const m = S.pick.filter(f => a.P[f].spc).sort((x, y) => mine[y] - mine[x]); if (!m.length) return; const lk = a.P[m[0]].k; a.P.forEach((p, f) => { if (S.pick.includes(f)) S.plan[p.k] = lk; else if (S.plan[p.k] === lk) S.plan[p.k] = p.spc ? p.k : 'blank'; }); S.runoff = {}; drawPM(S.view === 'mine' ? mine : real); $('#pmbox').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const b = e.target.closest('[data-co]'); if (b && b.dataset.co && !b.disabled) { S.cab = b.dataset.co.split(',').map(Number); S.cabSt = null; drawCab(); $('#cab').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  });
  $('#cab').addEventListener('change', e => { const t = e.target; if (t.dataset.cp == null || !S.cabSt) return; S.cabSt.list[+t.dataset.cp].f = +t.value; drawCab(); });
  drawPick(); drawCab();

  // 일치도
  const done = asked.filter(i => S.ans[i] != null);
  if (!done.length) $('#match').innerHTML = '<p class="hint">' + T.matchNone + '</p>';
  else { const m = a.P.filter(p => p.k !== 'ind' && p.k !== 'etc').map(p => { let s = 0, w = 0; done.forEach(i => { const k = Math.max(0.5, M.fw(a.Q[i].f)); s += k * (1 - Math.abs(S.ans[i] - pos(a.Q[i], p)) / 2); w += k; }); return { p, v: s / w }; }).sort((x, y) => y.v - x.v);
    $('#match').innerHTML = m.map(x => '<div class="m">' + mark(x.p) + '<div><div style="font-size:14px;font-weight:600">' + esc(x.p.n) + '</div><div class="bar"><span style="width:' + (x.v * 100) + '%;background:' + x.p.c + '"></span></div></div><span class="num" style="text-align:right">' + Math.round(x.v * 100) + '%</span></div>').join(''); }

  // 질문별
  const seqAll = FK.flatMap(k => asked.filter(i => a.Q[i].f === k));
  $('#bills').innerHTML = seqAll.length ? seqAll.map(i => { const q = a.Q[i], Lp = party(q.L) || PA, Rp = party(q.R) || PB, v = S.ans[i], fr = R.fields[q.f], pr = fr && !fr.empty ? fr.per[i] : null;
    let st = ''; if (!R.act.includes(q.f)) st = '<span>' + T.stOff + '</span>'; else if (v == null) st = '<span>' + T.stSkip + '</span>';
    else if (pr) { const win = pr.d.map((x, f) => f).filter(f => pr.d[f] > 0).sort((x, y) => pr.d[y] - pr.d[x]).slice(0, 3); st = '<span>' + T.stSeats(pr.seats) + '</span>' + (win.length ? '<span>' + win.map(f => mark(a.P[f]) + ' ' + esc(a.P[f].n) + ' ' + pr.d[f]).join(' · ') + '</span>' : ''); }
    const row = (lab, s) => { const b = bills(q, s);
      return '<div class="vrow"><span>' + lab + '</span><div class="vbar"><span style="width:' + (b.l / a.N * 100) + '%;background:var(--pa)"></span><span style="width:' + (b.ab / a.N * 100) + '%;background:var(--line2)"></span><span style="width:' + (b.r / a.N * 100) + '%;background:var(--pb)"></span><em style="left:' + (Mj / a.N * 100) + '%"></em></div><span></span><div class="vnum"><span>A ' + b.l + '</span><span class="verdict">' + esc(T.verdict(b, Mj, Lp.n, Rp.n)) + '</span><span>B ' + b.r + '</span></div></div>'; };
    return '<div class="bill"><h4>' + esc(q.t) + ' <span class="tag">' + esc(fld(q.f).n) + '</span> <span class="tag">' + esc(whenTxt(q)) + '</span></h4><p class="hint" style="margin:0 0 6px">' + esc(T.sideA(Lp.n)) + ': ' + esc(q.A) + '<br>' + esc(T.sideB(Rp.n)) + ': ' + esc(q.B) + '</p><p class="you">' + T.myAns + ': <b>' + esc(T.ansTxt(v)) + '</b></p><div class="stake">' + st + '</div>' + row(T.rowMine, mine) + row(T.rowReal, real) + '</div>'; }).join('') : '<p class="hint">' + T.billNone + '</p>';

  $('#again').addEventListener('click', () => viewPrio());
  $('#other').addEventListener('click', () => viewHome());
  show(keep ? S.view : 'mine');
  window.scrollTo(0, keep ? sy : 0);
}

load(); viewHome();
})();
