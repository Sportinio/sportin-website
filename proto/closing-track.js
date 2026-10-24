// 16 Start with a pilot: three track lanes drawn around the page's content, in the page's own
// pixels, so every oval stays whole at any screen size (the old fixed drawing was cropped to
// fill the page). The inner lane keeps clear of the content; the outer lanes keep clear of the
// menu bar and the page edges, and the gap between lanes shrinks when space is short.
(() => {
  const sec = document.getElementById('demo');
  const svg = sec && sec.querySelector('.closing__lanes');
  if (!svg) return;
  const lanes = [...svg.querySelectorAll('rect')];
  const inner = sec.querySelector('.closing__inner');
  const nav = document.getElementById('nav');
  const EDGE = 20; // clear space to the page edge and the menu bar
  const SCALE = 1.2;

  // Position of an element in the svg's coordinates, from layout offsets: the page's entrance
  // animations move the text with transforms, and the lanes must follow where it rests.
  // The svg fills the same positioned box the content is laid out in (inset: 0), so offsets
  // from that box are svg coordinates. (An svg has no offsetLeft of its own.)
  const base = (el) => {
    const host = inner.offsetParent; let x = 0, y = 0;
    for (let e = el; e && e !== host; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; }
    return { x, y };
  };

  function draw() {
    // On phones the stacked text is too tall and narrow for a track to go round it cleanly.
    svg.style.display = window.innerWidth < 600 ? 'none' : '';
    if (window.innerWidth < 600) return;
    const W = svg.clientWidth, H = svg.clientHeight;
    if (!W || !H) return;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    // The content: the union of the stacked lines.
    const boxes = [...inner.children].filter((el) => el.offsetWidth).map((el) => { const p = base(el); return { l: p.x, t: p.y, r: p.x + el.offsetWidth, b: p.y + el.offsetHeight }; });
    if (!boxes.length) return;
    const L = Math.min(...boxes.map((r) => r.l)), R = Math.max(...boxes.map((r) => r.r));
    const T = Math.min(...boxes.map((r) => r.t)), B = Math.max(...boxes.map((r) => r.b));
    // Room the lanes may use: below the menu bar, inside the page.
    // The menu bar is fixed; the page rests with its top at its own top margin (the inset), so
    // keep clear of where the bar will be then, whatever the scroll is right now.
    const restTop = parseFloat(getComputedStyle(sec).marginTop) || 0;
    const navB = nav ? nav.getBoundingClientRect().bottom - restTop : 0;
    const area = { l: EDGE, r: W - EDGE, t: Math.max(EDGE, navB + EDGE), b: H - EDGE };
    const narrow = W < 600;
    const want = (narrow ? 22 : 52) * SCALE, least = narrow ? 14 : 26;
    // Padding around the content shrinks first, so the lanes keep a clear gap between them.
    const spare = Math.min(L - area.l, area.r - R, T - area.t, area.b - B);
    const pad = Math.max(narrow ? 10 : 14, Math.min(narrow ? 24 : 44, spare - 2 * least));
    let box = { l: L - pad * (narrow ? 0.75 : 1.5), r: R + pad * (narrow ? 0.75 : 1.5), t: T - pad, b: B + pad };
    // The track is drawn 20% larger than the tight fit round the content.
    const cx = (box.l + box.r) / 2, cy = (box.t + box.b) / 2, hw = (box.r - box.l) / 2 * SCALE, hh = (box.b - box.t) / 2 * SCALE;
    box = { l: cx - hw, r: cx + hw, t: cy - hh, b: cy + hh };
    box = { l: Math.max(area.l, box.l), r: Math.min(area.r, box.r), t: Math.max(area.t, box.t), b: Math.min(area.b, box.b) };
    const room = Math.min(box.l - area.l, area.r - box.r, box.t - area.t, area.b - box.b);
    const gap = Math.max(0, Math.min(want, room / 2));
    lanes.forEach((rect, i) => {
      const g = gap * i;
      const x = box.l - g, y = box.t - g, w = box.r - box.l + 2 * g, h = box.b - box.t + 2 * g;
      const rr = Math.min(w, h) / 2;
      Object.entries({ x, y, width: w, height: h, rx: rr, ry: rr }).forEach(([n, v]) => rect.setAttribute(n, v.toFixed(1)));
      rect.style.display = i && gap < 8 ? 'none' : '';
    });
  }
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; draw(); }); };
  window.addEventListener('resize', later);
  if (document.fonts) document.fonts.ready.then(later);
  new ResizeObserver(later).observe(sec);
  window.addEventListener('load', later);
  later();
})();
