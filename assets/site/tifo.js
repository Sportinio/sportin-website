// The Tifo (page 01). The hero is a stand seen from the pitch: real fans, cut from the crowd footage
// into thousands of cards, slightly uneven like cards held in hands. One card flips, the row around
// it follows, the wave runs through the stand, and the raised cards spell the title. Raised cards
// keep breathing, a few fans drop theirs now and then, and the cards under the pointer turn to show
// the fan behind them. Reduced motion gets the finished tifo on the crowd still.
(() => {
  const hero = document.querySelector('.tifo');
  if (!hero) return;
  const canvas = hero.querySelector('.tifo__wall');
  const video = hero.querySelector('.tifo__crowd');
  const ctx = canvas.getContext('2d', { alpha: false });
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 900px)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);

  // The footage is the source once it plays; the still until then (and always with reduced motion).
  const still = new Image(); still.src = video.getAttribute('poster');
  let src = null;
  still.addEventListener('load', () => { if (!src) src = still; });
  if (!reduced) { video.addEventListener('playing', () => { src = video; }); video.play().catch(() => {}); }

  const LINES = mobile
    ? [[['GIVE', 1]], [['EVERY', 1]], [['FAN', 1]], [['A PART', 1]], [['TO ', 1], ['PLAY.', 2]]]
    : [[['GIVE EVERY FAN', 1]], [['A PART TO ', 1], ['PLAY.', 2]]];
  const WHITE = '#f4f6fb', BLUE = '#2f6bff', BACK = '#0a1020';
  let W = 0, H = 0, cols = 0, rows = 0, pitch = 0, cards = [], gaps = null, raised = null, settledAt = 1e9, t0 = 0, raf = 0, seen = true;
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);

  // Which cards spell the title: text drawn at 4 px per card, then read back as coverage per card.
  function makeMask() {
    const S = 4, mc = document.createElement('canvas'); mc.width = cols * S; mc.height = rows * S;
    const m = mc.getContext('2d'); m.fillStyle = '#000'; m.fillRect(0, 0, mc.width, mc.height);
    if ('fontStretch' in m) m.fontStretch = 'condensed';
    const font = (px) => `900 ${px}px Archivo, "Arial Narrow", Arial, sans-serif`;
    // Fit: the longest line within 90% of the width, the block within the middle of the stand.
    const maxW = cols * S * 0.9, band = rows * S * (mobile ? 0.7 : 0.6), lh = 0.92;
    let px = 10;
    for (;;) { m.font = font(px + 1); const w = Math.max(...LINES.map((l) => m.measureText(l.map((p) => p[0]).join('')).width)); if (w > maxW || (px + 1) * lh * LINES.length > band * 0.92) break; px++; }
    m.font = font(px); m.textBaseline = 'alphabetic';
    const total = px * lh * LINES.length, top = (rows * S - total) / 2 + px * 0.82;
    LINES.forEach((line, i) => {
      const text = line.map((p) => p[0]).join(''); let x = (cols * S - m.measureText(text).width) / 2;
      line.forEach(([t, kind]) => { m.fillStyle = kind === 2 ? '#0000ff' : '#ff0000'; m.fillText(t, x, top + i * px * lh); x += m.measureText(t).width; });
    });
    const d = m.getImageData(0, 0, mc.width, mc.height).data, out = new Uint8Array(cols * rows);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      let red = 0, blue = 0;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const k = (((r * S + y) * mc.width) + c * S + x) * 4; if (d[k] > 128) red++; if (d[k + 2] > 128) blue++; }
      out[r * cols + c] = blue > S * S * 0.34 ? 2 : red > S * S * 0.34 ? 1 : 0;
    }
    return out;
  }

  function build() {
    const r = hero.getBoundingClientRect(); W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    pitch = W / (mobile ? 56 : 124); cols = Math.ceil(W / pitch); rows = Math.ceil(H / pitch);
    const mask = makeMask();
    // The wave starts left of centre in the upper half and reaches the far corner in about 2.4 s.
    const ox = W * 0.36, oy = H * 0.34, far = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy));
    const lineTwoRow = Math.round(rows * 0.5);
    seed = 7; cards = []; raised = null; settledAt = 0;
    for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) {
      const x = (c + 0.5) * pitch + (rnd() - 0.5) * pitch * 0.18, y = (rr + 0.5) * pitch + (rnd() - 0.5) * pitch * 0.18;
      const kind = mask[rr * cols + c];
      const delay = 0.9 + (Math.hypot(x - ox, y - oy) / far) * 2.4 + rnd() * 0.22 + (kind && rr > lineTwoRow ? 0.55 : 0);
      cards.push({ x, y, w: pitch * (kind ? 0.86 : 0.76), h: pitch * (kind ? 0.94 : 0.86), rot: (rnd() - 0.5) * (kind ? 0.08 : 0.14), ph: rnd() * 6.283, kind, delay, drop: -9 });
      if (delay + 0.55 > settledAt) settledAt = delay + 0.55;
    }
    // Everything that is not a card is the dark of the stand: one overlay with a hole per card.
    gaps = document.createElement('canvas'); gaps.width = canvas.width; gaps.height = canvas.height;
    const g = gaps.getContext('2d'); g.fillStyle = '#04060d'; g.fillRect(0, 0, gaps.width, gaps.height); g.globalCompositeOperation = 'destination-out';
    cards.forEach((k) => { const cs = Math.cos(k.rot), sn = Math.sin(k.rot); g.setTransform(DPR * cs, DPR * sn, -DPR * sn, DPR * cs, k.x * DPR, k.y * DPR); g.fillRect(-k.w / 2, -k.h / 2, k.w, k.h); });
  }

  let px = -1e4, py = -1e4;
  if (!mobile && !reduced) {
    hero.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; }, { passive: true });
    hero.addEventListener('pointerleave', () => { px = py = -1e4; });
  }

  function drawSource() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const s = src; if (!s) { ctx.fillStyle = '#0a0d16'; ctx.fillRect(0, 0, W, H); return; }
    const sw = s.videoWidth || s.naturalWidth, sh = s.videoHeight || s.naturalHeight; if (!sw) return;
    const k = Math.max(W / sw, H / sh), dw = sw * k, dh = sh * k;
    ctx.drawImage(s, (W - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.fillStyle = 'rgba(2, 4, 12, 0.42)'; ctx.fillRect(0, 0, W, H);
  }
  // Once the whole stand is up, the plain blue cards are painted once and kept; each frame then only
  // draws the lettering, the cards a fan drops and the cards under the pointer.
  function buildRaised() {
    raised = document.createElement('canvas'); raised.width = canvas.width; raised.height = canvas.height;
    const g = raised.getContext('2d'); g.fillStyle = '#0a1a4e'; g.globalAlpha = 0.84;
    cards.forEach((k) => { if (k.kind) return; const cs = Math.cos(k.rot), sn = Math.sin(k.rot); g.setTransform(DPR * cs, DPR * sn, -DPR * sn, DPR * cs, k.x * DPR, k.y * DPR); g.fillRect(-k.w / 2, -k.h / 2, k.w, k.h); });
  }
  function card(k, up, t) {
    const settled = t > k.delay + 0.5;
    const wob = settled && !reduced ? Math.sin(t * 1.4 + k.ph) * 0.018 : 0;
    const cs = Math.cos(k.rot + wob), sn = Math.sin(k.rot + wob);
    const sx = up < 0.5 ? 1 - up * 2 : up * 2 - 1;
    ctx.setTransform(DPR * cs * sx, DPR * sn * sx, -DPR * sn, DPR * cs, k.x * DPR, k.y * DPR);
    if (up < 0.5) { ctx.fillStyle = BACK; ctx.fillRect(-k.w / 2, -k.h / 2, k.w, k.h); return; }
    const breathe = settled && !reduced ? 0.92 + 0.08 * Math.sin(t * 0.9 + k.ph) : 1;
    if (k.kind === 1) { ctx.globalAlpha = breathe; ctx.fillStyle = WHITE; }
    else if (k.kind === 2) { ctx.globalAlpha = breathe; ctx.fillStyle = BLUE; }
    else { ctx.globalAlpha = 0.84 * breathe; ctx.fillStyle = '#0a1a4e'; }
    ctx.fillRect(-k.w / 2, -k.h / 2, k.w, k.h);
    ctx.globalAlpha = 1;
  }
  // A plain card that is down again after the stand settled: the fan shows through its hole.
  function reveal(k, up, t) {
    const cs = Math.cos(k.rot), sn = Math.sin(k.rot);
    ctx.save();
    ctx.setTransform(DPR * cs, DPR * sn, -DPR * sn, DPR * cs, k.x * DPR, k.y * DPR);
    ctx.beginPath(); ctx.rect(-k.w / 2, -k.h / 2, k.w, k.h); ctx.clip();
    drawSource();
    if (up > 0.01) card(k, up, t);
    ctx.restore();
  }

  let lastDrop = 0;
  function render(t) {
    drawSource();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(gaps, 0, 0);
    const done = reduced || t >= settledAt;
    if (done && !raised) buildRaised();
    if (done) ctx.drawImage(raised, 0, 0);
    // Now and then a fan drops their card for a moment.
    if (!reduced && done && t - lastDrop > 0.35) { lastDrop = t; const k = cards[(Math.random() * cards.length) | 0]; if (t - k.drop > 3) k.drop = t; }
    const R = pitch * 4.5;
    for (let i = 0; i < cards.length; i++) {
      const k = cards[i];
      let up = reduced ? 1 : easeOut(clamp((t - k.delay) / 0.5));
      if (up <= 0) continue;
      let moved = false;
      if (!reduced) {
        const dd = t - k.drop; if (dd > 0 && dd < 1.6) { up *= 1 - Math.sin((dd / 1.6) * Math.PI); moved = true; }
        const d = Math.hypot(k.x - px, k.y - py); if (d < R) { up *= clamp((d - R * 0.3) / (R * 0.7)); moved = true; }
      }
      if (done && !k.kind) { if (moved) reveal(k, up, t); continue; }
      if (up <= 0.01) continue;
      card(k, up, t);
    }
  }

  const frame = (now) => { if (!t0) t0 = now; render((now - t0) / 1000); raf = requestAnimationFrame(frame); };
  const start = () => { if (!raf && !reduced) { raf = requestAnimationFrame(frame); video.play().catch(() => {}); } };
  const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } video.pause(); };

  const ready = Promise.race([document.fonts && document.fonts.load ? document.fonts.load('900 20px Archivo').catch(() => {}) : Promise.resolve(), new Promise((r) => setTimeout(r, 1200))]);
  ready.then(() => {
    build();
    if (reduced) { const paint = () => { if (src) render(10); else still.addEventListener('load', () => render(10), { once: true }); }; paint(); }
    else start();
    let tm = 0; new ResizeObserver(() => { clearTimeout(tm); tm = setTimeout(() => { build(); if (reduced) render(10); }, 120); }).observe(hero);
    new IntersectionObserver(([e]) => { seen = e.isIntersecting; seen && !document.hidden ? start() : stop(); }, { threshold: 0.02 }).observe(hero);
    document.addEventListener('visibilitychange', () => (document.hidden || !seen ? stop() : start()));
  });

  // Crowd sound, on request. Fades in and out.
  const btn = hero.querySelector('.tifo__sound'), audio = hero.querySelector('.tifo__audio');
  if (btn && audio) {
    let fade = 0;
    const to = (v, done) => { clearInterval(fade); fade = setInterval(() => { const d = v - audio.volume; if (Math.abs(d) < 0.03) { audio.volume = v; clearInterval(fade); done && done(); return; } audio.volume += d * 0.2; }, 60); };
    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(on)); btn.setAttribute('aria-label', on ? 'Stop the crowd sound' : 'Play the crowd sound');
      if (on) { audio.volume = 0; audio.play().catch(() => {}); to(0.55); } else to(0, () => audio.pause());
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && !audio.paused) { btn.click(); } });
  }
})();
