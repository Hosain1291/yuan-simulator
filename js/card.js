/* 결과 카드: 반원 의석·요약·총리 지명·정당별 의석을 지금 테마 색과 글꼴로 canvas에 그려 PNG로 저장합니다.
   외부 라이브러리 없이 동작하므로 파일을 바로 열어도 저장됩니다. 데이터는 app.js가 넘겨줍니다(TWCard.save). */
(function (root) {
  'use strict';
  const W = 1080, SCALE = 2, PAD = 48;

  function tokens() {
    const cs = getComputedStyle(document.documentElement), v = k => cs.getPropertyValue(k).trim();
    return {
      bg: v('--bg'), surface: v('--surface'), sunk: v('--sunk'), line: v('--line'), line2: v('--line2'),
      ink: v('--ink'), ink2: v('--ink2'), ink3: v('--ink3'), accent: v('--accent'), accentInk: v('--accent-ink'),
      edge: v('--seat-edge') || 'rgba(0,0,0,.45)', fD: v('--f-display') || 'serif', fB: v('--f-body') || 'sans-serif', fM: v('--f-mono') || 'monospace',
      radius: parseFloat(v('--radius')) || 0, skin: document.documentElement.dataset.skin || 'auto'
    };
  }
  const hex = c => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c).trim()); if (!m) return null; const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  // 비례 의석의 고리 안쪽 색: 정당색 24% + 바탕색 (화면의 color-mix와 같은 값)
  function mix(c, base, t) { const a = hex(c), b = hex(base); if (!a || !b) return c; return 'rgb(' + a.map((x, i) => Math.round(x * t + b[i] * (1 - t))).join(',') + ')'; }
  function rr(ctx, x, y, w, h, r) { r = Math.max(0, Math.min(r, h / 2, w / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function fit(ctx, s, max) { s = String(s); if (ctx.measureText(s).width <= max) return s; while (s.length > 1 && ctx.measureText(s + '…').width > max) s = s.slice(0, -1); return s + '…'; }
  function text(ctx, s, x, y, font, color, align, max) { ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.fillText(max ? fit(ctx, s, max) : s, x, y); }

  function layoutRows(d) { const two = d.rows.length > 8; return { two, perCol: two ? Math.ceil(d.rows.length / 2) : d.rows.length, rowH: 54 }; }

  function draw(d, t) {
    const hemiW = 760, f = hemiW / 600, hemiH = 312 * f, rl = layoutRows(d);
    const mastH = t.skin === 'paper' ? 78 : 58;
    const tileH = 86, tiles = d.tiles.length, tileRows = Math.ceil(tiles / 2);
    const H = mastH + 144 + hemiH + 44 + tileRows * (tileH + 14) + 8 + rl.perCol * rl.rowH + 18 + 35 + 30;
    const cv = document.createElement('canvas'); cv.width = W * SCALE; cv.height = Math.ceil(H) * SCALE;
    const ctx = cv.getContext('2d'); ctx.scale(SCALE, SCALE); ctx.textBaseline = 'alphabetic';
    const win = t.skin === 'win9x', xp = t.skin === 'winxp', gold = t.skin === 'gold', paper = t.skin === 'paper', R = win ? 0 : Math.min(t.radius, 16);

    // 바탕
    ctx.fillStyle = t.surface; ctx.fillRect(0, 0, W, H);
    if (paper) { const g = ctx.createRadialGradient(W * 0.2, 0, 10, W * 0.2, 0, W); g.addColorStop(0, 'rgba(255,250,235,.55)'); g.addColorStop(1, 'rgba(255,250,235,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }

    // 머리띠 (테마별)
    if (win) {
      const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#000080'); g.addColorStop(1, '#1084d0'); ctx.fillStyle = g; ctx.fillRect(6, 6, W - 12, mastH - 12);
      text(ctx, d.mast, 20, mastH / 2 + 7, '700 19px ' + t.fB, '#ffffff', 'left', W - 260);
      [0, 1, 2].forEach(i => { const x = W - 36 - i * 30, y = 15; ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x, y, 24, 22); ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 24, 2); ctx.fillRect(x, y, 2, 22); ctx.fillStyle = '#404040'; ctx.fillRect(x, y + 20, 24, 2); ctx.fillRect(x + 22, y, 2, 22); });
      ctx.font = '700 14px ' + t.fB; ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.fillText('×', W - 24, 31); ctx.fillText('□', W - 54, 31); ctx.fillText('_', W - 84, 29);
    } else if (xp) {
      const g = ctx.createLinearGradient(0, 0, 0, mastH); g.addColorStop(0, '#0997ff'); g.addColorStop(0.15, '#0053ee'); g.addColorStop(0.85, '#0066ff'); g.addColorStop(1, '#003dd7'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, mastH);
      text(ctx, d.mast, PAD, mastH / 2 + 7, '700 20px "Trebuchet MS",' + t.fB, '#ffffff', 'left', W - 2 * PAD - 140);
      ctx.fillStyle = '#d4542f'; rr(ctx, W - 46, 14, 30, 30, 5); ctx.fill(); text(ctx, '✕', W - 31, 36, '700 18px ' + t.fB, '#ffffff', 'center');
    } else if (gold) {
      const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#8a6200'); g.addColorStop(0.5, '#e2b53e'); g.addColorStop(1, '#8a6200'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, mastH);
      text(ctx, d.mast, PAD, mastH / 2 + 7, '700 19px ' + t.fD, '#fffaf0', 'left', W - 2 * PAD - 140);
      text(ctx, d.date, W - PAD, mastH / 2 + 6, '500 15px ' + t.fM, '#fffaf0', 'right');
    } else if (paper) {
      text(ctx, d.mast, W / 2, 46, '800 30px ' + t.fD, t.ink, 'center', W - 2 * PAD);
      ctx.fillStyle = t.ink; ctx.fillRect(PAD, mastH - 12, W - 2 * PAD, 3); ctx.fillRect(PAD, mastH - 6, W - 2 * PAD, 1);
      text(ctx, d.date, W - PAD, 22, '500 13px ' + t.fM, t.ink3, 'right');
    } else {
      ctx.fillStyle = t.accent; ctx.fillRect(0, 0, W, mastH);
      text(ctx, d.mast, PAD, mastH / 2 + 7, '700 19px ' + t.fB, t.accentInk, 'left', W - 2 * PAD - 140);
      text(ctx, d.date, W - PAD, mastH / 2 + 6, '500 15px ' + t.fM, t.accentInk, 'right');
    }

    let y = mastH + 40;
    text(ctx, d.eyebrow, PAD, y, '500 15px ' + t.fM, t.ink3, 'left', W - 2 * PAD); y += 52;
    text(ctx, d.title, PAD, y, '800 44px ' + t.fD, t.ink, 'left', W - 2 * PAD); y += 34;
    text(ctx, d.meta, PAD, y, '400 16px ' + t.fB, t.ink2, 'left', W - 2 * PAD); y += 18;

    // 반원 의석
    const ox = (W - hemiW) / 2, oy = y, rs = d.seatR * f;
    d.seats.forEach(s => {
      const x = ox + s.x * f, yy = oy + s.y * f; ctx.beginPath(); ctx.arc(x, yy, rs, 0, Math.PI * 2);
      if (!s.c) { ctx.fillStyle = t.line; ctx.fill(); return; }
      if (s.ring) { ctx.fillStyle = mix(s.c, t.surface, 0.24); ctx.fill(); ctx.lineWidth = rs * 0.2 * 2.4; ctx.strokeStyle = s.c; ctx.stroke(); }
      else { ctx.fillStyle = s.c; ctx.fill(); ctx.lineWidth = rs * 0.2; ctx.strokeStyle = t.edge; ctx.stroke(); }
    });
    ctx.save(); ctx.globalAlpha = 0.45; ctx.strokeStyle = t.ink; ctx.lineWidth = 1.2; ctx.setLineDash([3 * f, 4 * f]);
    ctx.beginPath(); ctx.moveTo(ox + 300 * f, oy + (302 - 290 * 0.33) * f); ctx.lineTo(ox + 300 * f, oy + 6 * f); ctx.stroke(); ctx.restore();
    text(ctx, String(d.N), ox + 300 * f, oy + 268 * f, '800 ' + Math.round(46 * f) + 'px ' + t.fD, t.ink, 'center');
    text(ctx, d.hemiLabel, ox + 300 * f, oy + 296 * f, '400 ' + Math.round(14 * f) + 'px ' + t.fB, t.ink3, 'center');
    y = oy + hemiH + 22;

    // 범례
    ctx.font = '400 14px ' + t.fB; const items = d.legend.map(l => ({ l, w: ctx.measureText(l.t).width + 22 })), lw = items.reduce((s, x) => s + x.w + 18, -18);
    let lx = (W - lw) / 2;
    items.forEach(({ l, w }) => { ctx.beginPath(); ctx.arc(lx + 6, y - 5, 6, 0, Math.PI * 2);
      if (l.k === 'pr') { ctx.fillStyle = t.surface; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = t.ink2; ctx.stroke(); }
      else if (l.k === 'maj') { ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = t.ink3; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(lx + 6, y - 13); ctx.lineTo(lx + 6, y + 3); ctx.stroke(); ctx.restore(); }
      else { ctx.fillStyle = t.ink2; ctx.fill(); }
      text(ctx, l.t, lx + 18, y, '400 14px ' + t.fB, t.ink3); lx += w + 18; });
    y += 22;

    // 요약 칸
    const tw = (W - 2 * PAD - 14) / 2;
    d.tiles.forEach((tl, i) => {
      const x = PAD + (i % 2) * (tw + 14), ty = y + Math.floor(i / 2) * (tileH + 14);
      if (win) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x, ty, tw, tileH); ctx.fillStyle = '#808080'; ctx.fillRect(x, ty, tw, 2); ctx.fillRect(x, ty, 2, tileH); }
      else { rr(ctx, x, ty, tw, tileH, R); ctx.fillStyle = t.sunk; ctx.fill(); }
      let tx = x + 18;
      if (tl.c) { ctx.beginPath(); ctx.arc(tx + 7, ty + 56, 7, 0, Math.PI * 2); ctx.fillStyle = tl.c; ctx.fill(); tx += 22; }
      text(ctx, tl.label, x + 18, ty + 28, '600 14px ' + t.fB, t.ink3, 'left', tw - 36);
      ctx.font = '700 22px ' + t.fB; const val = fit(ctx, tl.value, tw - (tx - x) - 18 - (tl.sub ? 0 : 0));
      text(ctx, val, tx, ty + 63, '700 22px ' + t.fB, t.ink);
      if (tl.sub) { const vw = ctx.measureText(val).width; text(ctx, tl.sub, tx + vw + 10, ty + 63, '400 15px ' + t.fB, t.ink3, 'left', Math.max(0, x + tw - 18 - (tx + vw + 10))); }
    });
    y += tileRows * (tileH + 14) + 8;

    // 정당별 의석
    const cols = rl.two ? 2 : 1, cw = (W - 2 * PAD - (cols - 1) * 28) / cols, mx = Math.max(1, ...d.rows.map(r => r.m));
    d.rows.forEach((r, i) => {
      const col = rl.two ? Math.floor(i / rl.perCol) : 0, ri = rl.two ? i % rl.perCol : i, x = PAD + col * (cw + 28), ry = y + ri * rl.rowH;
      ctx.fillStyle = t.line; ctx.fillRect(x, ry, cw, 1);
      ctx.beginPath(); ctx.arc(x + 8, ry + 21, 7, 0, Math.PI * 2); ctx.fillStyle = r.c; ctx.fill();
      const numW = 64, barW = rl.two ? 120 : 300, nameW = cw - 24 - barW - numW - 24;
      text(ctx, r.n, x + 24, ry + 26, '700 17px ' + t.fB, t.ink, 'left', nameW);
      text(ctx, r.sub, x + 24, ry + 45, '400 13px ' + t.fB, t.ink3, 'left', nameW);
      const bx = x + 24 + nameW + 12; rr(ctx, bx, ry + 18, barW, 9, 5); ctx.fillStyle = t.sunk; ctx.fill();
      if (r.m) { rr(ctx, bx, ry + 18, Math.max(4, barW * r.m / mx), 9, 5); ctx.fillStyle = r.c; ctx.fill(); }
      text(ctx, String(r.m), x + cw, ry + 30, '600 22px ' + t.fM, t.ink, 'right');
    });
    y += rl.perCol * rl.rowH + 18;

    // 바닥글
    ctx.fillStyle = t.line2; ctx.fillRect(PAD, y, W - 2 * PAD, 1); y += 34;
    text(ctx, d.site, PAD, y, '800 18px ' + t.fD, t.ink2, 'left', W / 2);
    text(ctx, d.url, W - PAD, y, '500 13px ' + t.fM, t.ink3, 'right');
    if (win) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, 2); ctx.fillRect(0, 0, 2, H); ctx.fillStyle = '#404040'; ctx.fillRect(0, H - 2, W, 2); ctx.fillRect(W - 2, 0, 2, H); }
    return cv;
  }

  async function fontsReady(d, t) {
    if (!document.fonts || !document.fonts.load) return;
    const all = [d.mast, d.eyebrow, d.title, d.meta, d.hemiLabel, d.site, d.url, d.date].concat(d.legend.map(l => l.t), d.tiles.map(x => x.label + x.value + (x.sub || '')), d.rows.map(r => r.n + r.sub + r.m)).join(' ') + String(d.N) + '0123456789';
    const fonts = ['800 44px ' + t.fD, '700 17px ' + t.fB, '400 15px ' + t.fB, '600 22px ' + t.fM, '500 15px ' + t.fM];
    try { await Promise.all(fonts.map(fo => document.fonts.load(fo, all))); } catch (_) { }
    try { await document.fonts.ready; } catch (_) { }
  }

  // claude.ai 미리보기에서는 downloads 기능으로, 그 밖(GitHub Pages·파일)에서는 브라우저 내려받기로
  async function give(blob, name) {
    let dl = null; try { dl = root.claude && await root.claude.use('downloads'); } catch (_) { dl = null; }
    if (dl) { try { await dl.save({ filename: name, data: blob }); return 'ok'; } catch (e) { const c = e && e.code; if (c === 'declined') return 'declined'; } }
    try { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); return 'ok'; } catch (_) { return 'fail'; }
  }

  async function save(d, name, btn, msg, L) {
    if (!btn || btn.disabled) return; const m0 = msg ? msg.textContent : '';
    btn.disabled = true; if (msg) msg.textContent = L.making;
    const done = s => { if (msg) msg.textContent = s; setTimeout(() => { btn.disabled = false; if (msg) msg.textContent = m0; }, 2600); };
    try {
      const t = tokens(); await fontsReady(d, t);
      const cv = draw(d, t), blob = await new Promise(ok => cv.toBlob(ok, 'image/png'));
      if (!blob) throw new Error('empty');
      const r = await give(blob, name);
      done(r === 'ok' ? L.saved : r === 'declined' ? L.declined : L.fail);
    } catch (e) { done(L.fail); }
  }

  root.TWCard = { draw: (d) => draw(d, tokens()), save };
})(window);
