// Hero pixels mockup: the bottom band of the gray hero block turns into a grid of pixels, then
// pixels lift out of the grid and gather into one benefit word after another while the rest
// sink back into the background. The title's audience word changes on the same beat.
(() => {
  const hero = document.getElementById('why');
  const stage = document.getElementById('stage');
  const title = document.getElementById('heroTitle');
  const rot = document.querySelector('.rot__word');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PAIRS = [['member', 'Engagement'], ['fan', 'Belonging'], ['employee', 'Retention'], ['client', 'Revenue']];
  const CYCLE = 4800;
  const root = document.documentElement;

  // Title word: letters slide out together, the new word's letters slide in one after another.
  const letters = (w) => [...w].map((ch, n) => `<span class="rot__ch" style="--n:${n}">${ch}</span>`).join('');
  rot.innerHTML = letters(PAIRS[0][0]);
  function setAudience(w) {
    rot.classList.add('is-out');
    setTimeout(() => {
      rot.innerHTML = letters(w);
      rot.classList.remove('is-out'); rot.classList.add('is-in');
      requestAnimationFrame(() => requestAnimationFrame(() => rot.classList.remove('is-in')));
    }, 320);
  }

  // Colours: background gray, the "off" pixel (slate mixed into the gray), and the active blue.
  const hex = (name) => { const h = getComputedStyle(root).getPropertyValue(name).trim().replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
  let bg; let off; let blue;
  const recolor = () => { bg = hex('--infield'); blue = hex('--blue'); const s = hex('--slate'); off = bg.map((v, i) => v + (s[i] - v) * 0.22); };
  recolor();
  new MutationObserver(recolor).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', recolor);

  let canvas; let ctx; let W = 0; let H = 0; let pitch = 8; let px = []; let words = []; let visible = true;
  const mouse = { x: -1e4, y: -1e4 };

  // Lay the grid, then render each word once at one shared size and keep the grid cells inside its letters.
  function layout() {
    const r = canvas.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.round(r.width); H = Math.round(r.height);
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pitch = W < 600 ? 5 : W < 1000 ? 6 : 8;
    const left = title.getBoundingClientRect().left - r.left;
    const x0 = left - Math.floor(left / pitch) * pitch + pitch / 2;
    const old = px; px = [];
    for (let y = pitch / 2; y < H; y += pitch) for (let x = x0; x < W; x += pitch) {
      const prev = old[px.length];
      px.push(prev ? Object.assign(prev, { hx: x, hy: y }) : { hx: x, hy: y, x, y, vx: 0, vy: 0, tx: x, ty: y, vis: 0, act: 0, word: false, go: 0, show: 0 });
    }
    const off2 = document.createElement('canvas'); off2.width = W; off2.height = H;
    const o = off2.getContext('2d');
    if ('fontStretch' in o) o.fontStretch = 'semi-expanded';
    o.font = '800 100px Archivo, sans-serif';
    const widest = Math.max(...PAIRS.map((p) => o.measureText(p[1]).width));
    const size = Math.min((W - left * 2) / widest * 100, H * 1.05);
    o.font = `800 ${size}px Archivo, sans-serif`;
    o.textBaseline = 'alphabetic';
    const base = H - Math.max(pitch * 3, H * 0.16) - size * 0.2;
    words = PAIRS.map((p) => {
      o.clearRect(0, 0, W, H); o.fillText(p[1], left, base);
      const data = o.getImageData(0, 0, W, H).data;
      return px.filter((q) => data[(Math.floor(q.hy) * W + Math.floor(q.hx)) * 4 + 3] > 140);
    });
  }

  // Pixels for the word lift out of the grid (paired left to right); every other pixel goes home and fades.
  function formWord(i, now) {
    const cells = words[i];
    const pool = px.slice().sort(() => Math.random() - 0.5).slice(0, cells.length).sort((a, b) => a.hx - b.hx);
    const targets = cells.slice().sort((a, b) => a.hx - b.hx);
    px.forEach((q) => { q.word = false; q.tx = q.hx; q.ty = q.hy; q.go = now; });
    pool.forEach((q, k) => { q.word = true; q.tx = targets[k].hx; q.ty = targets[k].hy; q.go = now + 280 + (targets[k].hx / W) * 600 + Math.random() * 80; });
  }

  function step(now, dt) {
    for (const q of px) {
      if (now > q.show) q.vis = Math.min(1, q.vis + dt * 3);
      if (now > q.go) {
        q.vx += ((q.tx - q.x) * 170 - q.vx * 22) * dt; q.vy += ((q.ty - q.y) * 170 - q.vy * 22) * dt;
      }
      const dx = q.x - mouse.x; const dy = q.y - mouse.y; const d = Math.hypot(dx, dy);
      if (d < 90 && d > 0.1) { const f = 1800 * (1 - d / 90) ** 2 * dt; q.vx += (dx / d) * f; q.vy += (dy / d) * f; }
      q.x += q.vx * dt; q.y += q.vy * dt;
      const dist = Math.hypot(q.tx - q.x, q.ty - q.y);
      q.act = q.word && now > q.go ? Math.max(q.act, 1 - dist / 40) : Math.max(0, q.act - dt / 0.28);
    }
  }

  // Word pixels are blue squares that breathe a little; the rest settle to a faint grid on the gray.
  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    const s = pitch * 0.74;
    // Background pixels first, word pixels on top, so a home pixel never covers a letter.
    for (const q of [...px.filter((p) => !p.word), ...px.filter((p) => p.word)]) {
      const v = q.word ? q.vis : q.vis * Math.min(1, Math.max(0.35, 1 - (now - q.go) / 900));
      const c = [0, 1, 2].map((i) => { const g = bg[i] + (off[i] - bg[i]) * v; return g + (blue[i] - g) * q.act | 0; });
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      const z = q.word ? s * (1 + 0.05 * Math.sin(now / 4000 * Math.PI * 2 - q.hx / W * Math.PI * 2) * q.act) : s * (0.6 + 0.4 * q.vis);
      ctx.fillRect(q.x - z / 2, q.y - z / 2, z, z);
    }
  }

  async function start() {
    await document.fonts.load('800 100px Archivo');
    canvas = document.createElement('canvas'); canvas.className = 'hero__canvas';
    stage.appendChild(canvas); ctx = canvas.getContext('2d'); layout();
    if (reduced) {
      px.forEach((q) => { q.vis = 1; }); formWord(0, 0);
      px.forEach((q) => { q.x = q.tx; q.y = q.ty; q.act = q.word ? 1 : 0; q.go = -1e4; });
      draw(0); return;
    }
    const t0 = performance.now();
    // The gray turns into pixels in a wave from left to right, then the first word gathers.
    px.forEach((q) => { q.show = t0 + 300 + (q.hx / W) * 1300 + Math.random() * 300; q.go = Infinity; });
    let i = 0; let beats = 0;
    setTimeout(() => {
      formWord(0, performance.now());
      const timer = setInterval(() => {
        if (!visible) return;
        i = (i + 1) % PAIRS.length; beats++;
        setAudience(PAIRS[i][0]);
        setTimeout(() => formWord(i, performance.now()), 200);
        if (beats >= PAIRS.length) clearInterval(timer); // one full loop, then rest on member + engagement
      }, CYCLE);
    }, 2000);
    let last = t0;
    const loop = (now) => {
      if (!visible) { last = now; return; }
      step(now, Math.min(1 / 30, (now - last) / 1000)); last = now;
      draw(now);
      requestAnimationFrame(loop);
    };
    new IntersectionObserver((e) => { const was = visible; visible = e[0].isIntersecting; if (visible && !was) requestAnimationFrame(loop); }).observe(stage);
    hero.addEventListener('pointermove', (e) => { const b = canvas.getBoundingClientRect(); mouse.x = e.clientX - b.left; mouse.y = e.clientY - b.top; }, { passive: true });
    hero.addEventListener('pointerleave', () => { mouse.x = -1e4; mouse.y = -1e4; });
    window.addEventListener('resize', () => { layout(); formWord(i, performance.now()); });
    requestAnimationFrame(loop);
  }

  setTimeout(start, 300);
})();
