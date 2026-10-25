// Desktop step scrolling: one wheel or trackpad swipe moves exactly one page or one step of a
// scroll scene, however hard the swipe. The page's scroll snap already stops on every page for
// a wheel click, a key or a finger flick, but a fast trackpad swipe's momentum carried it past
// several pages at once. Phones and tablets keep their native scrolling (one flick, one page).
// The stops are the page's own snap points (deck.js and the scenes place them), so this only
// decides how far one gesture goes and how the page glides there.
(() => {
  const root = document.documentElement;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const QUIET = 160; // ms without wheel events that ends a gesture (a trackpad's momentum tail counts as the same gesture)
  const MIN = 12; // px of wheel movement a gesture needs before the page moves
  const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);

  // Snap points: every element whose CSS gives it a snap alignment, as page scroll positions.
  let points = null;
  function stops() {
    if (!points) points = [...document.querySelectorAll('main *, body > footer')].filter((el) => { const a = getComputedStyle(el).scrollSnapAlign; return a && a !== 'none'; });
    const vh = window.innerHeight; const max = root.scrollHeight - vh;
    const ys = points.map((el) => {
      const r = el.getBoundingClientRect(); const top = r.top + window.scrollY; const align = getComputedStyle(el).scrollSnapAlign.split(' ').pop();
      const y = align === 'center' ? top + r.height / 2 - vh / 2 : align === 'end' ? top + r.height - vh : top;
      return Math.round(Math.max(0, Math.min(max, y)));
    }).sort((a, b) => a - b);
    return ys.filter((y, i) => i === 0 || y - ys[i - 1] > 4);
  }
  window.addEventListener('resize', () => { points = null; });

  // The glide to a stop. Snapping is paused while it runs, so the page moves smoothly, and it
  // ends exactly on the stop, so snapping has nothing to correct.
  let gliding = false; let raf = 0;
  function glide(to) {
    const from = window.scrollY; const dist = Math.abs(to - from);
    if (dist < 2) return;
    const dur = reduced ? 0 : Math.min(1500, Math.max(650, 450 + (350 * dist) / window.innerHeight));
    gliding = true; root.style.scrollSnapType = 'none';
    const t0 = performance.now();
    const frame = (now) => {
      const u = dur ? Math.min(1, (now - t0) / dur) : 1;
      window.scrollTo(0, from + (to - from) * ease(u));
      if (u < 1) raf = requestAnimationFrame(frame); else { gliding = false; root.style.scrollSnapType = ''; }
    };
    cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
  }

  // Gestures: wheel events that follow each other within QUIET ms are one gesture. A gesture
  // moves one stop once its movement passes MIN; the rest of it (the momentum tail) is
  // swallowed, and so is any gesture that starts while the page is still gliding.
  let lastWheel = 0; let sum = 0; let used = false; let prevAbs = 0;
  const scrollableInside = (el, dy) => {
    for (let n = el; n && n !== document.body && n !== root; n = n.parentElement) {
      const oy = getComputedStyle(n).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1) {
        if ((dy > 0 && n.scrollTop + n.clientHeight < n.scrollHeight - 1) || (dy < 0 && n.scrollTop > 0)) return true;
      }
    }
    return false;
  };
  window.addEventListener('wheel', (e) => {
    if (!root.classList.contains('is-full') || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // present mode, zoom, sideways
    if (scrollableInside(e.target, e.deltaY)) return; // a panel of its own scrolls first
    e.preventDefault();
    const now = performance.now(); const abs = Math.abs(e.deltaY);
    // A new gesture: after a quiet gap, or a fresh swipe rising out of the last one's momentum tail
    // once the glide has ended. One that starts mid-glide is swallowed.
    if (now - lastWheel > QUIET || (used && !gliding && abs > Math.max(20, prevAbs * 2))) { sum = 0; used = gliding; }
    lastWheel = now; prevAbs = abs;
    if (used) return;
    sum += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    if (Math.abs(sum) < MIN) return;
    used = true;
    const y = window.scrollY; const ys = stops();
    const to = sum > 0 ? ys.find((s) => s > y + 4) : [...ys].reverse().find((s) => s < y - 4);
    if (to != null) glide(to);
  }, { passive: false });
})();
