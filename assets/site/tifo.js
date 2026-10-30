// The Tifo. Real fans, cut from the crowd footage into thousands of cards, slightly uneven like
// cards held in hands. One engine (a "stand") draws a section's cards; each page runs its own
// programme on it.
//   01 Hero: one card flips, the wave runs through the stand and the raised cards spell the title.
//   02 Problem lives in city.js (three.js) and shares the crowd sound below.
// Reduced motion gets finished pictures on the crowd still.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 900px)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const easeIO = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const WHITE = '#f4f6fb', BLUE = '#2f6bff', NAVY = '#0a1a4e', BACK = '#0a1020', DARK = '#06080f';

  // ---------- The crowd: one footage element feeds every stand; the still until it plays. ----------
  const video = document.querySelector('.tifo__crowd');
  if (!video) return;
  const still = new Image(); still.src = video.getAttribute('poster');
  let src = null; const onSrc = [];
  still.addEventListener('load', () => { if (!src) { src = still; onSrc.forEach((f) => f()); } });
  if (!reduced) { video.addEventListener('playing', () => { src = video; }); }
  let users = 0;
  const useVideo = (on) => { users += on ? 1 : -1; if (reduced) return; if (users > 0) video.play().catch(() => {}); else video.pause(); };

  // ---------- A stand: the card grid of one section, with the shared drawing. ----------
  function makeStand(section, canvas, cols) {
    const ctx = canvas.getContext('2d', { alpha: false });
    const S = { section, canvas, ctx, W: 0, H: 0, cols: 0, rows: 0, pitch: 0, cards: [], gaps: null, px: -1e4, py: -1e4 };
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    S.rnd = rnd;
    S.build = (decorate) => {
      const r = section.getBoundingClientRect(); S.W = Math.max(1, Math.round(r.width)); S.H = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(S.W * DPR); canvas.height = Math.round(S.H * DPR);
      S.pitch = S.W / cols; S.cols = Math.ceil(S.W / S.pitch); S.rows = Math.ceil(S.H / S.pitch);
      seed = 7; S.cards = [];
      for (let rr = 0; rr < S.rows; rr++) for (let c = 0; c < S.cols; c++) {
        const x = (c + 0.5) * S.pitch + (rnd() - 0.5) * S.pitch * 0.18, y = (rr + 0.5) * S.pitch + (rnd() - 0.5) * S.pitch * 0.18;
        const k = { x, y, c, r: rr, w: S.pitch * 0.76, h: S.pitch * 0.86, rot: (rnd() - 0.5) * 0.14, ph: rnd() * 6.283, n: rnd(), kind: 0 };
        if (decorate) decorate(k);
        S.cards.push(k);
      }
      // Everything that is not a card is the dark of the stand: one overlay with a hole per card.
      const g = (S.gaps = document.createElement('canvas')); g.width = canvas.width; g.height = canvas.height;
      const gc = g.getContext('2d'); gc.fillStyle = '#04060d'; gc.fillRect(0, 0, g.width, g.height); gc.globalCompositeOperation = 'destination-out';
      S.cards.forEach((k) => { const cs = Math.cos(k.rot), sn = Math.sin(k.rot); gc.setTransform(DPR * cs, DPR * sn, -DPR * sn, DPR * cs, k.x * DPR, k.y * DPR); gc.fillRect(-k.w / 2, -k.h / 2, k.w, k.h); });
    };
    S.source = () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const s = src; if (!s) { ctx.fillStyle = '#0a0d16'; ctx.fillRect(0, 0, S.W, S.H); return; }
      const sw = s.videoWidth || s.naturalWidth, sh = s.videoHeight || s.naturalHeight; if (!sw) return;
      const k = Math.max(S.W / sw, S.H / sh), dw = sw * k, dh = sh * k;
      ctx.drawImage(s, (S.W - dw) / 2, (S.H - dh) / 2, dw, dh);
      ctx.fillStyle = 'rgba(2, 4, 12, 0.42)'; ctx.fillRect(0, 0, S.W, S.H);
    };
    S.base = () => { S.source(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(S.gaps, 0, 0); };
    // One card, raised by `up` (0 down, 1 up): the back shows while it turns, then the face.
    S.card = (k, up, fill, alpha, wob) => {
      const cs = Math.cos(k.rot + (wob || 0)), sn = Math.sin(k.rot + (wob || 0));
      const sx = up < 0.5 ? 1 - up * 2 : up * 2 - 1;
      ctx.setTransform(DPR * cs * sx, DPR * sn * sx, -DPR * sn, DPR * cs, k.x * DPR, k.y * DPR);
      ctx.globalAlpha = up < 0.5 ? 1 : alpha == null ? 1 : alpha;
      ctx.fillStyle = up < 0.5 ? BACK : fill;
      ctx.fillRect(-k.w / 2, -k.h / 2, k.w, k.h);
      ctx.globalAlpha = 1;
    };
    // A layer of cards painted once (the settled picture), drawn under the moving ones.
    S.layer = (fill, alpha, pick) => {
      const L = document.createElement('canvas'); L.width = canvas.width; L.height = canvas.height;
      const g = L.getContext('2d'); g.fillStyle = fill; g.globalAlpha = alpha;
      S.cards.forEach((k) => { if (!pick(k)) return; const cs = Math.cos(k.rot), sn = Math.sin(k.rot); g.setTransform(DPR * cs, DPR * sn, -DPR * sn, DPR * cs, k.x * DPR, k.y * DPR); g.fillRect(-k.w / 2, -k.h / 2, k.w, k.h); });
      return L;
    };
    // The fan behind one card of a painted layer: the hole is redrawn with the crowd, then the card.
    S.reveal = (k, draw) => {
      const cs = Math.cos(k.rot), sn = Math.sin(k.rot);
      ctx.save(); ctx.setTransform(DPR * cs, DPR * sn, -DPR * sn, DPR * cs, k.x * DPR, k.y * DPR);
      ctx.beginPath(); ctx.rect(-k.w / 2, -k.h / 2, k.w, k.h); ctx.clip(); S.source(); draw(); ctx.restore();
    };
    if (!mobile && !reduced) {
      section.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); S.px = e.clientX - r.left; S.py = e.clientY - r.top; }, { passive: true });
      section.addEventListener('pointerleave', () => { S.px = S.py = -1e4; });
    }
    // Runs `frame(t)` only while the section is on screen and the tab is visible.
    S.run = (frame, onResize) => {
      let raf = 0, t0 = 0, seen = false;
      const loop = (now) => { if (!t0) t0 = now; frame((now - t0) / 1000); raf = requestAnimationFrame(loop); };
      const start = () => { if (!raf && !reduced) { raf = requestAnimationFrame(loop); useVideo(true); } };
      const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; useVideo(false); } };
      new IntersectionObserver(([e]) => { seen = e.isIntersecting; seen && !document.hidden ? start() : stop(); }, { threshold: 0.02 }).observe(section);
      document.addEventListener('visibilitychange', () => (document.hidden || !seen ? stop() : start()));
      let tm = 0; new ResizeObserver(() => { clearTimeout(tm); tm = setTimeout(onResize, 120); }).observe(section);
    };
    return S;
  }

  // Which cards spell a text: lines drawn at 4 px per card, read back as coverage per card.
  function textMask(S, lines, band) {
    const Q = 4, mc = document.createElement('canvas'); mc.width = S.cols * Q; mc.height = S.rows * Q;
    const m = mc.getContext('2d'); m.fillStyle = '#000'; m.fillRect(0, 0, mc.width, mc.height);
    if ('fontStretch' in m) m.fontStretch = 'condensed';
    const font = (px) => `900 ${px}px Archivo, "Arial Narrow", Arial, sans-serif`;
    const maxW = mc.width * 0.9, lh = 0.92; let px = 10;
    for (;;) { m.font = font(px + 1); const w = Math.max(...lines.map((l) => m.measureText(l.map((p) => p[0]).join('')).width)); if (w > maxW || (px + 1) * lh * lines.length > mc.height * band) break; px++; }
    m.font = font(px); m.textBaseline = 'alphabetic';
    const total = px * lh * lines.length, top = (mc.height - total) / 2 + px * 0.82;
    lines.forEach((line, i) => {
      const text = line.map((p) => p[0]).join(''); let x = (mc.width - m.measureText(text).width) / 2;
      line.forEach(([t, kind]) => { m.fillStyle = kind === 2 ? '#0000ff' : '#ff0000'; m.fillText(t, x, top + i * px * lh); x += m.measureText(t).width; });
    });
    const d = m.getImageData(0, 0, mc.width, mc.height).data, out = new Uint8Array(S.cols * S.rows);
    for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) {
      let red = 0, blue = 0;
      for (let y = 0; y < Q; y++) for (let x = 0; x < Q; x++) { const k = (((r * Q + y) * mc.width) + c * Q + x) * 4; if (d[k] > 128) red++; if (d[k + 2] > 128) blue++; }
      out[r * S.cols + c] = blue > Q * Q * 0.34 ? 2 : red > Q * Q * 0.34 ? 1 : 0;
    }
    return out;
  }

  const fontsReady = Promise.race([document.fonts && document.fonts.load ? document.fonts.load('900 20px Archivo').catch(() => {}) : Promise.resolve(), new Promise((r) => setTimeout(r, 1200))]);

  // ---------- 01 Hero ----------
  (() => {
    const section = document.querySelector('.tifo'); const canvas = section && section.querySelector('.tifo__wall');
    if (!canvas) return;
    const S = makeStand(section, canvas, mobile ? 56 : 124);
    const LINES = mobile
      ? [[['GIVE', 1]], [['EVERY', 1]], [['FAN', 1]], [['A PART', 1]], [['TO ', 1], ['PLAY.', 2]]]
      : [[['GIVE EVERY FAN', 1]], [['A PART TO ', 1], ['PLAY.', 2]]];
    let raised = null, settledAt = 0, lastDrop = 0;
    function build() {
      let mask = null;
      S.build(null); mask = textMask(S, LINES, mobile ? 0.7 : 0.6);
      S.build((k) => {
        k.kind = mask[k.r * S.cols + k.c];
        if (k.kind) { k.w = S.pitch * 0.86; k.h = S.pitch * 0.94; k.rot *= 0.55; }
      });
      // The wave starts left of centre in the upper half and reaches the far corner in about 2.4 s;
      // the second half of the stand goes up a beat after the first.
      const ox = S.W * 0.36, oy = S.H * 0.34, far = Math.hypot(Math.max(ox, S.W - ox), Math.max(oy, S.H - oy));
      settledAt = 0; raised = null;
      S.cards.forEach((k) => { k.delay = 0.9 + (Math.hypot(k.x - ox, k.y - oy) / far) * 2.4 + k.n * 0.22 + (k.kind && k.r > S.rows / 2 ? 0.55 : 0); if (k.delay + 0.55 > settledAt) settledAt = k.delay + 0.55; });
    }
    function frame(t) {
      if (window.tifoCrowd) window.tifoCrowd.level(1);
      S.base();
      const done = reduced || t >= settledAt;
      if (done && !raised) raised = S.layer(NAVY, 0.84, (k) => !k.kind);
      if (done) S.ctx.drawImage(raised, 0, 0);
      if (!reduced && done && t - lastDrop > 0.35) { lastDrop = t; const k = S.cards[(Math.random() * S.cards.length) | 0]; if (t - (k.drop || -9) > 3) k.drop = t; }
      const R = S.pitch * 4.5;
      for (let i = 0; i < S.cards.length; i++) {
        const k = S.cards[i];
        let up = reduced ? 1 : easeOut(clamp((t - k.delay) / 0.5));
        if (up <= 0) continue;
        let moved = false;
        if (!reduced) {
          const dd = t - (k.drop || -9); if (dd > 0 && dd < 1.6) { up *= 1 - Math.sin((dd / 1.6) * Math.PI); moved = true; }
          const d = Math.hypot(k.x - S.px, k.y - S.py); if (d < R) { up *= clamp((d - R * 0.3) / (R * 0.7)); moved = true; }
        }
        const settled = t > k.delay + 0.5;
        const wob = settled && !reduced ? Math.sin(t * 1.4 + k.ph) * 0.018 : 0;
        const breathe = settled && !reduced ? 0.92 + 0.08 * Math.sin(t * 0.9 + k.ph) : 1;
        const fill = k.kind === 1 ? WHITE : k.kind === 2 ? BLUE : NAVY, alpha = k.kind ? breathe : 0.84 * breathe;
        if (done && !k.kind) { if (moved) S.reveal(k, () => { if (up > 0.01) S.card(k, up, fill, alpha, 0); }); continue; }
        if (up <= 0.01) continue;
        S.card(k, up, fill, alpha, wob);
      }
    }
    fontsReady.then(() => {
      build();
      if (reduced) { const paint = () => frame(10); src ? paint() : onSrc.push(paint); }
      S.run(frame, () => { build(); if (reduced) frame(10); });
    });
  })();

  // ---------- 02 Problem: the night city from above, in city.js (three.js). ----------

  // ---------- Crowd sound, on request. The real stadium recording, as full as the stand. ----------
  // One recording, nothing synthesised. A full stand is the roar as recorded. As fans leave, the
  // same crowd steps back: quieter, muffled, as if heard from outside the ground. With only a few
  // left it is a faint murmur in the distance. `level` is the share of the stand still lit.
  (() => {
    const btns = [...document.querySelectorAll('.tifo__sound')];
    if (!btns.length) return;
    let ac = null, master = null, gain = null, lp = null, on = false, level = 1, ready = false;
    const ramp = (p, v, t) => { p.cancelScheduledValues(ac.currentTime); p.setTargetAtTime(v, ac.currentTime, t); };
    async function setup() {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
      lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 18000; lp.Q.value = 0.5;
      gain = ac.createGain(); gain.gain.value = 1; gain.connect(lp).connect(master);
      const buf = await ac.decodeAudioData(await (await fetch('/assets/site/crowd-loop.mp3?v=1')).arrayBuffer());
      const bed = ac.createBufferSource(); bed.buffer = buf; bed.loop = true; bed.loopStart = 1.5; bed.loopEnd = buf.duration - 1.5;
      bed.connect(gain); bed.start();
      ready = true;
    }
    function apply() {
      if (!ready) return;
      // Loudness falls with the crowd, and the top end goes first, the way a stadium sounds from far away.
      const l = clamp(level);
      ramp(gain.gain, 0.08 + 0.92 * Math.pow(l, 0.8), 0.5);
      ramp(lp.frequency, 300 + 17700 * Math.pow(l, 1.6), 0.5);
    }
    window.tifoCrowd = { level(v) { if (Math.abs(v - level) > 0.01) { level = v; if (on) apply(); } }, debug: () => ({ on, level: +level.toFixed(2), gain: ready ? +gain.gain.value.toFixed(2) : null, cutoff: ready ? Math.round(lp.frequency.value) : null }) };
    btns.forEach((btn) => btn.addEventListener('click', async () => {
      on = !on;
      btns.forEach((b) => { b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Stop the crowd sound' : 'Play the crowd sound'); });
      if (on) { if (!ac) { await setup(); } else if (ac.state === 'suspended') ac.resume(); apply(); ramp(master.gain, 0.8, 0.5); }
      else if (ac) ramp(master.gain, 0, 0.4);
    }));
    document.addEventListener('visibilitychange', () => { if (document.hidden && on) btns[0].click(); });
  })();
})();
