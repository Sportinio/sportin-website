// Dust text: a page's kicker, title and description break into dust and the same dust settles
// into the next page's text. Each page's text is drawn word by word onto an offscreen canvas at
// exactly the place the browser lays it out, then sampled into a cloud of points. Moving between
// two pages, point i flies from cloud A to cloud B (both sorted left to right, so the dust
// sweeps instead of crossing), lifting off in a soft arc on the way. Scroll drives it, so it runs
// backwards too. Used by the Competitions section (features.js).
const N = 7000; // points per cloud
const smooth = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const ease = (p) => 0.5 - 0.5 * Math.cos(Math.PI * p); // sine in-out: slow off, slow glide, slow landing

// Text windows within one step (u = 0..1): the old text hands over to dust, the dust travels,
// then hands over to the new text.
export const WIN = { outA: 0.04, outB: 0.12, inA: 0.88, inB: 0.96 };

export function createDust(stage, canvas, pages) {
  const ctx = canvas.getContext('2d');
  const off = document.createElement('canvas'); const octx = off.getContext('2d', { willReadFrequently: true });
  const palette = []; const palIndex = new Map();
  let clouds = []; let W = 0; let H = 0; let dpr = 1; let drawn = false;
  // Per-point randomness, fixed so scrolling back and forth retraces the same paths.
  const rnd = Array.from({ length: N }, () => ({ jit: Math.random() * 0.12, amp: 14 + Math.random() * 46, ang: -Math.PI / 2 + (Math.random() - 0.5) * 2.4, size: 1.2 + Math.random() * 0.9, ph: Math.random() * Math.PI * 2, wob: 3 + Math.random() * 6 }));

  const colorId = (css) => { if (!palIndex.has(css)) { palIndex.set(css, palette.length); palette.push({ css, rgb: (css.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number) }); } return palIndex.get(css); };

  function drawText(el, origin, used) {
    const range = document.createRange();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const cs = getComputedStyle(node.parentElement);
      if (cs.display === 'none') continue; // pages off screen are only hidden, their layout still counts
      octx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      octx.fillStyle = cs.color; used.add(colorId(cs.color));
      for (const m of node.data.matchAll(/\S+/g)) {
        range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length);
        const r = range.getClientRects()[0]; if (!r || !r.width) continue;
        const mt = octx.measureText(m[0]); const asc = mt.fontBoundingBoxAscent; const desc = mt.fontBoundingBoxDescent;
        octx.save();
        octx.translate(r.left - origin.left, r.top - origin.top + (r.height - (asc + desc)) / 2 + asc);
        octx.scale(r.width / mt.width, 1); // absorbs width, letter-spacing and font-stretch differences
        octx.fillText(m[0], 0, 0);
        octx.restore();
      }
    }
  }

  function sample(used) {
    const img = octx.getImageData(0, 0, W, H).data; const xs = []; const ys = []; const cs = [];
    const pal = [...used];
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
      const o = (y * W + x) * 4; if (img[o + 3] < 140) continue;
      let best = pal[0]; let bd = Infinity;
      pal.forEach((id) => { const [r, g, b] = palette[id].rgb; const d = (r - img[o]) ** 2 + (g - img[o + 1]) ** 2 + (b - img[o + 2]) ** 2; if (d < bd) { bd = d; best = id; } });
      xs.push(x); ys.push(y); cs.push(best);
    }
    const pts = [];
    const n = xs.length;
    for (let i = 0; i < N; i++) { const j = n ? Math.floor(Math.random() * n) : 0; pts.push(n ? [xs[j] + Math.random() * 1.5, ys[j] + Math.random() * 1.5, cs[j]] : [W / 2, H / 2, 0]); }
    pts.sort((a, b) => a[0] - b[0]);
    return { x: Float32Array.from(pts, (p) => p[0]), y: Float32Array.from(pts, (p) => p[1]), c: Uint8Array.from(pts, (p) => p[2]) };
  }

  function build() {
    const box = stage.getBoundingClientRect();
    W = Math.max(1, Math.round(box.width)); H = Math.max(1, Math.round(box.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr; canvas.height = H * dpr; off.width = W; off.height = H;
    clouds = pages.map((els) => { octx.clearRect(0, 0, W, H); const used = new Set(); els.forEach((el) => drawText(el, box, used)); return sample(used); });
  }

  // a, b: page indices; u: 0..1 between them. Returns the dust's opacity (0 when off).
  function draw(a, b, u) {
    const alpha = a === b ? 0 : smooth(WIN.outA, WIN.outB, u) * (1 - smooth(WIN.inA, WIN.inB, u));
    if (!alpha) { if (drawn) { ctx.clearRect(0, 0, canvas.width, canvas.height); drawn = false; } return 0; }
    if (!clouds.length) build();
    const A = clouds[a]; const B = clouds[b]; if (!A || !B) return 0;
    const s = Math.min(1, Math.max(0, (u - WIN.outB) / (WIN.inA - WIN.outB)));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.globalAlpha = alpha;
    const px = new Float32Array(N); const py = new Float32Array(N); const pc = new Uint8Array(N); const sz = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const q = rnd[i];
      const delay = (A.x[i] / W) * 0.28 + q.jit; // a slow left-to-right sweep; each grain flies for ~60% of the step
      const p = Math.min(1, Math.max(0, (s - delay) / (1 - 0.4)));
      const e = ease(p); const lift = Math.sin(Math.PI * p);
      const wob = Math.sin(Math.PI * 2 * p + q.ph) * q.wob * lift; // a gentle float while it is in the air
      px[i] = A.x[i] + (B.x[i] - A.x[i]) * e + Math.cos(q.ang) * q.amp * lift + wob;
      py[i] = A.y[i] + (B.y[i] - A.y[i]) * e + Math.sin(q.ang) * q.amp * lift + wob * 0.6;
      pc[i] = p < 0.5 ? A.c[i] : B.c[i];
      sz[i] = q.size * (1 - 0.4 * lift);
    }
    for (let c = 0; c < palette.length; c++) {
      ctx.fillStyle = palette[c].css;
      for (let i = 0; i < N; i++) if (pc[i] === c) ctx.fillRect(px[i], py[i], sz[i], sz[i]);
    }
    drawn = true;
    return alpha;
  }

  return { build, draw, invalidate() { clouds = []; } };
}
