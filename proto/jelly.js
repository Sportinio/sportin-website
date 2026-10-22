// Jelly mockup: the transition from the problem page to the evidence, driven only by the scroll.
// The problem card stays pinned while you scroll through it. Each blue member dot splits into a
// few tiny dots; every tiny dot follows its own smooth curve to one exact place in the card, and
// only when it arrives does it melt into the liquid, so the card fills with blue from the top
// down. Then the evidence content pushes up through the blue like jelly. Stop scrolling and it
// stops; scroll back and every dot retraces its path. Loaded before deck.js.
(() => {
  const root = document.documentElement;
  const prob = document.getElementById('problem');
  const pin = document.getElementById('problemPin');
  const evSec = document.getElementById('evidence');
  if (!prob || !pin || !evSec) return;
  root.classList.add('has-jelly');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Move the evidence content onto a layer inside the problem card; the evidence page goes away.
  const layer = document.createElement('div'); layer.className = 'jl-layer';
  layer.appendChild(evSec.querySelector('.wrap')); prob.appendChild(layer); evSec.remove();
  const order = [layer.querySelector('.evidence__eyebrow'), layer.querySelector('.evidence__title'),
    ...layer.querySelectorAll('.ev'), layer.querySelector('.evidence__sources')].filter(Boolean);
  order.forEach((el) => el.classList.add('jl'));

  // Scroll room: L1 for the dots, L2 for the jelly push.
  const seg = () => Math.max(360, window.innerHeight * 0.7);
  const L1 = () => window.innerHeight * 1.5; const L2 = () => window.innerHeight * 0.9;
  window.problemExtra = () => L1() + L2();
  const zone = document.createElement('i'); zone.className = 'jelly-zone'; zone.setAttribute('aria-hidden', 'true');
  const end = document.createElement('i'); end.className = 'jelly-end'; end.setAttribute('aria-hidden', 'true');
  pin.append(zone, end);
  function placeZone() {
    const start = 3 * seg() + 2; const L = L1() + L2();
    zone.style.top = `${start}px`; zone.style.height = `${L + window.innerHeight}px`; end.style.top = `${start + L}px`;
  }

  // ---------- WebGL ----------
  const canvas = document.createElement('canvas'); canvas.className = 'jelly-canvas'; canvas.setAttribute('aria-hidden', 'true');
  prob.appendChild(canvas);
  const gl = reduced ? null : canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true });
  const FIELD = 0.5;
  let W = 0; let H = 0; let FW = 0; let FH = 0; let dpr = 1; let col = [0, 0, 0];
  const P = {};
  function compile(vs, fs) {
    const p = gl.createProgram();
    [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(([t, src]) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); gl.attachShader(p, s); });
    gl.linkProgram(p); return p;
  }
  if (gl) {
    const VS = 'attribute vec4 a; uniform vec2 res; uniform float k; varying float m; void main(){ vec2 c = a.xy / res * 2.0 - 1.0; gl_Position = vec4(c.x, -c.y, 0.0, 1.0); gl_PointSize = a.z * k; m = a.w; }';
    // Liquid field: a soft blob per arriving dot, weighted by how far it has merged.
    P.field = compile(VS, 'precision mediump float; varying float m; void main(){ vec2 d = gl_PointCoord - 0.5; gl_FragColor = vec4(exp(-dot(d, d) * 12.0) * m); }');
    // Crisp dots: a clean disc, never blobby.
    P.disc = compile(VS, 'precision mediump float; uniform vec3 col; varying float m; void main(){ float r = length(gl_PointCoord - 0.5); float a = 1.0 - smoothstep(0.42, 0.5, r); gl_FragColor = vec4(col * a, a); }');
    P.cut = compile('attribute vec2 p; varying vec2 uv; void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }',
      'precision mediump float; uniform sampler2D t; uniform vec3 col; varying vec2 uv; void main(){ float d = texture2D(t, uv).r; float a = smoothstep(0.47, 0.53, d); gl_FragColor = vec4(col * a, a); }');
    P.buf = gl.createBuffer(); P.buf2 = gl.createBuffer();
    P.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, P.quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    P.tex = gl.createTexture(); P.fbo = gl.createFramebuffer();
    [P.field, P.disc, P.cut].forEach((pr) => { pr.res = gl.getUniformLocation(pr, 'res'); pr.k = gl.getUniformLocation(pr, 'k'); pr.col = gl.getUniformLocation(pr, 'col'); pr.t = gl.getUniformLocation(pr, 't'); pr.a = gl.getAttribLocation(pr, 'a'); pr.p = gl.getAttribLocation(pr, 'p'); });
  }
  function readColor() { const h = getComputedStyle(root).getPropertyValue('--blue').trim().replace('#', ''); col = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); }
  function resize() {
    readColor(); built = false;
    if (!gl) return;
    W = prob.offsetWidth; H = prob.offsetHeight; dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    FW = Math.round(W * FIELD); FH = Math.round(H * FIELD);
    gl.bindTexture(gl.TEXTURE_2D, P.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FW, FH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach((f) => gl.texParameteri(gl.TEXTURE_2D, f, gl.LINEAR));
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((f) => gl.texParameteri(gl.TEXTURE_2D, f, gl.CLAMP_TO_EDGE));
    gl.bindFramebuffer(gl.FRAMEBUFFER, P.fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, P.tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // ---------- Paths ----------
  // Every tiny dot gets one target cell. Dots and targets are both ordered top to bottom, so the
  // top of the card fills first, and each tiny dot's start time follows its target's height.
  let parts = []; let built = false;
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const smoother = (u) => u * u * u * (u * (u * 6 - 15) + 10);
  function build() {
    const pr = prob.getBoundingClientRect(); const k = pr.width / W || 1;
    const dots = [...prob.querySelectorAll('.dot.is-on')].map((d) => { const b = d.getBoundingClientRect(); return { x: (b.left + b.width / 2 - pr.left) / k, y: (b.top + b.height / 2 - pr.top) / k, r: b.width / 2 / k }; })
      .sort((a, b) => a.y - b.y || a.x - b.x);
    const step = 40; const targets = [];
    for (let y = step / 2; y < H + step / 2; y += step) for (let x = step / 2; x < W + step / 2; x += step) targets.push({ x, y });
    targets.sort((a, b) => a.y - b.y || a.x - b.x);
    if (!dots.length) return;
    const N = targets.length; const base = Math.floor(N / dots.length); const extra = N - base * dots.length;
    const srcs = [];
    dots.forEach((d, i) => { const c = base + (i < extra ? 1 : 0); for (let n = 0; n < c; n++) srcs.push(d); });
    parts = srcs.map((s, i) => {
      const t = targets[i]; const ang = Math.random() * Math.PI * 2; const fly = 26 + Math.random() * 46;
      return {
        x0: s.x, y0: s.y, r0: s.r,
        x1: s.x + Math.cos(ang) * fly, y1: s.y + Math.sin(ang) * fly - 18,
        x2: t.x + (Math.random() - 0.5) * 50, y2: t.y - 80 - Math.random() * 120,
        x3: t.x, y3: t.y,
        a: 0.03 + 0.5 * (t.y / H) + Math.random() * 0.05,
      };
    });
    built = true;
  }

  let data = new Float32Array(0); let disc = new Float32Array(0);
  function draw(p) {
    if (!gl) return;
    if (!built) build();
    if (data.length !== parts.length * 4) { data = new Float32Array(parts.length * 4); disc = new Float32Array(parts.length * 4); }
    const WIN = 0.44;
    for (let i = 0; i < parts.length; i++) {
      const q = parts[i];
      const t = smoother(clamp((p - q.a) / WIN)); const s = 1 - t;
      // Cubic Bezier: from the dot, out a little, in from above, down into place.
      const x = s * s * s * q.x0 + 3 * s * s * t * q.x1 + 3 * s * t * t * q.x2 + t * t * t * q.x3;
      const y = s * s * s * q.y0 + 3 * s * s * t * q.y1 + 3 * s * t * t * q.y2 + t * t * t * q.y3;
      // Crisp diameter: the full dot, then a tiny dot, then a little larger as it lands.
      const dia = 2 * q.r0 + (3 - 2 * q.r0) * smoother(clamp(t / 0.16)) + 6 * smoother(clamp((t - 0.55) / 0.35));
      const m = smoother(clamp((t - 0.74) / 0.24));
      disc[i * 4] = x; disc[i * 4 + 1] = y; disc[i * 4 + 2] = dia; disc[i * 4 + 3] = 1;
      data[i * 4] = x * FIELD; data[i * 4 + 1] = y * FIELD; data[i * 4 + 2] = (30 + 78 * m) * FIELD; data[i * 4 + 3] = m;
    }
    // Liquid field.
    gl.bindFramebuffer(gl.FRAMEBUFFER, P.fbo); gl.viewport(0, 0, FW, FH);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(P.field); gl.uniform2f(P.field.res, FW, FH); gl.uniform1f(P.field.k, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, P.buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(P.field.a); gl.vertexAttribPointer(P.field.a, 4, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, parts.length);
    // Screen: liquid, then the crisp dots on top (same blue, so they disappear into it).
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(P.cut); gl.bindTexture(gl.TEXTURE_2D, P.tex); gl.uniform1i(P.cut.t, 0); gl.uniform3f(P.cut.col, ...col);
    gl.bindBuffer(gl.ARRAY_BUFFER, P.quad); gl.enableVertexAttribArray(P.cut.p); gl.vertexAttribPointer(P.cut.p, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.useProgram(P.disc); gl.uniform2f(P.disc.res, W, H); gl.uniform1f(P.disc.k, dpr); gl.uniform3f(P.disc.col, ...col);
    gl.bindBuffer(gl.ARRAY_BUFFER, P.buf2); gl.bufferData(gl.ARRAY_BUFFER, disc, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(P.disc.a); gl.vertexAttribPointer(P.disc.a, 4, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, parts.length);
  }

  // ---------- Content reveal (scroll-driven) ----------
  // Each piece rises from under the blue, sharpening from a soft blur, and settles with one gentle
  // overshoot. A light smoothing on top of the scroll keeps trackpad steps buttery. The numbers
  // count up with the same progress, so scrolling back counts them down again.
  const easeOutBack = (u) => { const c = 1.15; const v = u - 1; return 1 + (c + 1) * v * v * v + c * v * v; };
  const nums = order.map((el) => el.querySelector('.ev__count'));
  nums.forEach((c) => { if (c) c.dataset.to = c.dataset.to || c.textContent; });
  let p2Shown = 0; let p2Target = 0; let textRaf = 0; let lastT = 0;
  function paintText(p2) {
    order.forEach((el, n) => {
      const u = clamp((p2 - n * 0.1) / 0.5);
      const e = easeOutBack(u);
      const y = (1 - e) * 46; const blur = 8 * (1 - smoother(clamp(u / 0.6)));
      el.style.opacity = String(smoother(clamp(u / 0.4)));
      el.style.transform = u >= 1 ? 'none' : `translateY(${y.toFixed(2)}px)`;
      el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
      const c = nums[n]; if (c) c.textContent = String(Math.round(Number(c.dataset.to) * (1 - (1 - clamp(u / 0.85)) ** 3)));
    });
  }
  function textLoop(now) {
    const dt = Math.min(0.05, lastT ? (now - lastT) / 1000 : 1 / 60); lastT = now;
    p2Shown += (p2Target - p2Shown) * (1 - Math.exp(-dt / 0.08));
    if (Math.abs(p2Target - p2Shown) < 0.0005) p2Shown = p2Target;
    paintText(p2Shown);
    if (p2Shown !== p2Target) textRaf = requestAnimationFrame(textLoop); else { textRaf = 0; lastT = 0; }
  }
  function push(p2) { p2Target = p2; if (!textRaf) textRaf = requestAnimationFrame(textLoop); }

  // ---------- Driving it ----------
  let q = 0; let present = null; let raf = 0; let tween = 0; let cameBack = false;
  function scrollQ() {
    const off = -pin.getBoundingClientRect().top - (3 * seg() + 2);
    return clamp(off / (L1() + L2()));
  }
  function render() {
    raf = 0;
    if (present === null) {
      q = scrollQ();
      // Inside the transition the page scrolls freely (no snapping), so you can stop anywhere.
      // Leaving it at either end turns snapping back on, which settles on the nearest page.
      const off = -pin.getBoundingClientRect().top - (3 * seg() + 2);
      root.classList.toggle('jelly-free', off >= -2 && off <= L1() + L2() + 2);
    }
    const split = L1() / (L1() + L2());
    const p = clamp(q / split); const p2 = clamp((q - split) / (1 - split));
    if (reduced) { prob.classList.toggle('is-filled', q > 0.3); order.forEach((el) => { el.style.opacity = q > 0.3 ? '1' : '0'; el.style.transform = 'none'; }); return; }
    const filled = p >= 0.995;
    prob.classList.toggle('is-filled', filled);
    const pc = prob.querySelector('.problem__canvas'); if (pc) pc.style.visibility = p > 0 ? 'hidden' : 'visible';
    const drawing = !!gl && p > 0 && !filled;
    canvas.classList.toggle('is-on', drawing);
    if (drawing) draw(p);
    push(p2);
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(render); };

  // Present mode: the problem slide gets a fifth step; the transition plays over 3.6 s.
  function playTo(target, dur) {
    cancelAnimationFrame(tween); const from = q; const t0 = performance.now();
    const tick = (now) => { const u = Math.min(1, (now - t0) / dur); q = from + (target - from) * u; render(); if (u < 1) tween = requestAnimationFrame(tick); };
    tween = requestAnimationFrame(tick);
  }
  window.deckEffects = {
    steps: { problem: 5 },
    onSlide(id, prev) { present = true; cameBack = id === 'problem' && !!prev; if (id !== 'problem') { cancelAnimationFrame(tween); q = 0; render(); } },
    onStep(id, step) {
      if (id !== 'problem') return;
      // Coming back from the next slide shows the finished evidence page straight away.
      if (step >= 4 && cameBack) { cancelAnimationFrame(tween); q = 1; render(); } else if (step >= 4) playTo(1, reduced ? 1 : 3600 * (1 - q) + 1); else if (q > 0) playTo(0, 700);
      cameBack = false;
    },
    onExit() { present = null; cancelAnimationFrame(tween); schedule(); },
  };

  function layout() { placeZone(); resize(); schedule(); }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => setTimeout(layout, 0));
  new MutationObserver(() => { readColor(); schedule(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  setTimeout(layout, 0); setTimeout(layout, 700);
  if (document.fonts) document.fonts.ready.then(layout);
  // Mockup helpers for checking frames.
  window.jellyDebug = () => ({ q, present, parts: parts.length });
  window.jellyFreeze = (v) => { present = true; q = v; render(); };
})();
