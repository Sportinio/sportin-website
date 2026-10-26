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

  // Snap points: the elements the CSS gives a snap alignment, as page scroll positions.
  let points = null;
  const SNAPPERS = '.page, .snap-mark, .jelly-end, .belief__panel, #what, body > footer';
  const findPoints = () => [...document.querySelectorAll(SNAPPERS)].filter((el) => { const a = getComputedStyle(el).scrollSnapAlign; return a && a !== 'none'; });
  function stops() {
    if (!points) points = findPoints();
    const vh = window.innerHeight; const max = root.scrollHeight - vh;
    const ys = points.map((el) => {
      const r = el.getBoundingClientRect(); const top = r.top + window.scrollY;
      const align = getComputedStyle(el).scrollSnapAlign.split(' ')[0]; // the block axis comes first
      const y = align === 'center' ? top + r.height / 2 - vh / 2 : align === 'end' ? top + r.height - vh : top;
      return Math.round(Math.max(0, Math.min(max, y)));
    }).sort((a, b) => a - b);
    return ys.filter((y, i) => i === 0 || y - ys[i - 1] > 4);
  }
  window.addEventListener('resize', () => { points = null; });
  if ('requestIdleCallback' in window) requestIdleCallback(() => { points = points || findPoints(); });

  // The glide to a stop. Snapping is paused while it runs, so the page moves smoothly, and it
  // ends exactly on the stop, so snapping has nothing to correct. Anything else that scrolls the
  // page meanwhile (a menu link, a key, the formats rail) ends the glide and keeps its scroll.
  let gliding = false; let raf = 0; let queued = 0; // stops waiting for the glide to end (signed count)
  function stopGlide() { cancelAnimationFrame(raf); gliding = false; queued = 0; root.style.scrollSnapType = ''; }
  // Returns whether the page started moving (false at the first or last stop).
  function step(dir) {
    const y = window.scrollY; const ys = stops();
    const to = dir > 0 ? ys.find((s) => s > y + 4) : [...ys].reverse().find((s) => s < y - 4);
    return to != null && glide(to);
  }
  function glide(to) {
    const from = window.scrollY; const dist = Math.abs(to - from);
    if (dist < 2) return false;
    const dur = reduced ? 0 : Math.min(1500, Math.max(650, 450 + (350 * dist) / window.innerHeight));
    cancelAnimationFrame(raf);
    gliding = true; root.style.scrollSnapType = 'none';
    const t0 = performance.now(); let wrote = from;
    const frame = (now) => {
      if (Math.abs(window.scrollY - wrote) > 2) { stopGlide(); return; } // someone else scrolled
      const u = dur ? Math.min(1, (now - t0) / dur) : 1;
      wrote = Math.round(from + (to - from) * ease(u)); window.scrollTo(0, wrote);
      if (u < 1) { raf = requestAnimationFrame(frame); return; }
      gliding = false; root.style.scrollSnapType = '';
      // Wheel clicks that came during the glide; at the end of the page the rest are dropped.
      if (queued) { const d = Math.sign(queued); queued -= d; if (!step(d)) queued = 0; }
    };
    raf = requestAnimationFrame(frame);
    return true;
  }
  window.addEventListener('keydown', () => { if (gliding) stopGlide(); });
  window.addEventListener('pointerdown', () => { if (gliding) stopGlide(); });

  // Gestures. Wheel events less than QUIET ms apart are one gesture. A gesture moves one stop once
  // its movement passes MIN; the rest of it (a trackpad's momentum tail) is swallowed, and so is
  // a trackpad gesture that starts mid-glide. A new gesture also starts when the direction flips,
  // or when a fresh swipe rises well above the tail's recent floor for two events in a row once
  // the glide has ended (one jump alone is a coalesced tail event, not a new swipe). A mouse
  // wheel (whose gestures start with a big click, not a small ramp) moves one stop per click,
  // with at most one click waiting while the page glides; a lone click too small to pass MIN
  // still moves the page when its gesture ends.
  let lastWheel = 0; let sum = 0; let used = false; const recent = []; let rising = 0; let dir = 0; let clicks = false; let clickSize = 0; let prevAbs = 0; let count = 0; let endTimer = 0; let total = 0; let midGlide = false;
  const pxOf = (e) => (e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY);
  const scrollableInside = (el, dy) => {
    for (let n = el; n && n !== document.body && n !== root; n = n.parentElement) {
      const oy = getComputedStyle(n).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1) {
        if ((dy > 0 && n.scrollTop + n.clientHeight < n.scrollHeight - 1) || (dy < 0 && n.scrollTop > 0)) return true;
      }
    }
    return false;
  };
  // A separate wheel click during a glide waits for it; up to two can wait.
  const wait = (d) => { queued = Math.sign(queued) === d ? Math.max(-2, Math.min(2, queued + d)) : d; };
  // At a gesture's end: a lone tick (one or two events) still moves the page, even a small one or
  // one that came while the page was gliding (it waits its turn). A longer swipe that started
  // mid-glide stays swallowed.
  function endGesture() {
    if (count > 2 || Math.abs(total) < 3 || (used && !midGlide)) return;
    used = true; midGlide = false; const d = Math.sign(total);
    if (gliding) wait(d); else step(d);
  }
  window.addEventListener('wheel', (e) => {
    if (!e.cancelable) return; // the browser already scrolls this sequence itself
    if (!root.classList.contains('is-full') || e.ctrlKey) return; // present mode, zoom
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 2) return; // sideways
    if (scrollableInside(e.target, e.deltaY)) return; // a panel of its own scrolls first
    e.preventDefault();
    const now = performance.now(); const px = pxOf(e); const abs = Math.abs(px); const sign = Math.sign(px);
    const rise = used && !gliding && !clicks && recent.length >= 3 && abs >= Math.max(25, 3 * Math.min(...recent));
    rising = rise ? rising + 1 : 0;
    // A pause in a trackpad's momentum (the page was busy) that resumes at about the same size is
    // the same gesture, not a new one. A flip counts only from a real movement (4px), not a
    // lift-off wobble of 1-3px.
    const gap = now - lastWheel;
    const resumed = gap < 600 && !clicks && count >= 6 && sign === dir && prevAbs >= 8 && abs >= prevAbs * 0.5 && abs <= prevAbs * 1.3;
    const fresh = (gap > QUIET && !resumed) || (sign && dir && sign !== dir && abs >= 4) || rising >= 2;
    prevAbs = abs;
    // A swipe rising out of a tail is a trackpad, not wheel clicks.
    if (fresh) { sum = 0; total = 0; count = 0; clicks = rising < 2 && abs >= 40; clickSize = abs; used = !clicks && gliding; midGlide = used; recent.length = 0; rising = 0; }
    total += px;
    // The tail's floor stays put while a rise is being checked; empty events do not lower it.
    lastWheel = now;
    if (!rising && abs >= 1) { recent.push(abs); if (recent.length > 6) recent.shift(); }
    if (sign && abs >= 4) dir = sign;
    count += 1;
    clearTimeout(endTimer); endTimer = setTimeout(endGesture, QUIET);
    if (clicks && !fresh) {
      // Wheel clicks repeat one exact size and come at least 25ms apart. A dense stream, or one of
      // changing sizes, is a trackpad after all (a big first event after a pause or a busy
      // moment), and its one move already happened.
      if (gap < 25 || Math.abs(abs - clickSize) > Math.max(1, clickSize * 0.02)) { clicks = false; used = true; return; }
      if (!gliding) step(sign); else if (!queued) queued = sign; // one spin: at most one waits
      return;
    }
    if (used) return;
    sum += px;
    if (Math.abs(sum) < MIN) return;
    used = true;
    if (gliding) { wait(Math.sign(sum)); return; }
    step(Math.sign(sum));
  }, { passive: false });
})();
