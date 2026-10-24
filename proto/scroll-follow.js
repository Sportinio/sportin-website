// Scroll position to scene time, at a steady, eased pace. A pinned scroll scene maps its scroll
// to t = 0..steps (the last `hold` part of the scroll keeps the final step on screen). The scene
// follows that target: it speeds up gently, holds a calm cruising speed and slows to a soft stop,
// so one step takes about 2 s however fast the scroll or snap jumps; long jumps catch up faster.
// Reduced motion follows the scroll directly. Shared by the engine and integrations scenes.
//
// Chapters (the engine): `chapters` lists where each chapter ends, e.g. [6, 10]. Each scroll stop
// is one chapter, and the scene plays that chapter by itself, one step at a time with a short
// rest on each so its caption can be read. Going back, or catching up to a chapter's start, moves
// without rests. Until the scene is pinned it waits at the start, so arriving plays it.
const ACC = 1.6; // t per second², how gently it speeds up and slows down
const CRUISE = 0.6; // t per second for a single step
const STEP_CRUISE = 1; const STEP_ACC = 2.6; const REST = 0.9; // chapters: ~1.4 s per step, then 0.9 s still

// cruise and acc can be lowered for a slower, slow-motion scene (the Competitions pages use this).
export function followScroll(sec, { steps, hold = 0.6, reduced = false, onFrame, keepAlive = () => false, cruise = CRUISE, acc = ACC, chapters = null }) {
  let shown = 0; let target = 0; let raf = 0; let last = 0; let vel = 0; let restUntil = 0;
  function progress() {
    const r = sec.getBoundingClientRect();
    const f = -r.top / (r.height - window.innerHeight);
    if (chapters) return r.top > 4 ? 0 : chapters[Math.round(Math.min(1, f) * (chapters.length - 1))];
    return Math.max(0, Math.min(steps, f * (steps + hold)));
  }
  // Chapters: where to head next, and whether to rest on each step on the way.
  function aim() {
    if (!chapters || shown > target) return { to: target, rest: false };
    const start = chapters.reduce((s, end) => (end < target ? end : s), 0); // the previous chapter's end
    if (shown < start) return { to: start, rest: false };
    return { to: Math.min(target, Math.floor(shown + 1e-6) + 1), rest: true };
  }
  function loop(now) {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60); last = now;
    const r = sec.getBoundingClientRect();
    const away = r.bottom <= 0 || r.top >= window.innerHeight; // nobody sees the way there, so skip it
    if (reduced || away) { shown = target; vel = 0; restUntil = 0; } else if (shown !== target) {
      const { to, rest } = aim();
      if (rest && vel === 0 && Math.abs(shown - Math.round(shown)) < 1e-6 && !restUntil) restUntil = now + REST * 1000;
      if (!(rest && restUntil && now < restUntil)) {
        restUntil = 0;
        const a = rest ? STEP_ACC : acc;
        const d = to - shown; const dist = Math.abs(d);
        const vmax = rest ? STEP_CRUISE : cruise + 0.5 * Math.max(0, dist - 1);
        const want = Math.sign(d) * Math.min(vmax, Math.sqrt(2 * a * dist)); // still able to stop in time
        const dv = want - vel; vel += Math.sign(dv) * Math.min(Math.abs(dv), a * dt);
        shown += vel * dt;
        if (Math.sign(to - shown) !== Math.sign(d)) { shown = to; vel = 0; } // never overshoot
        if (Math.abs(to - shown) < 0.001 && Math.abs(vel) < 0.03) { shown = to; vel = 0; }
      }
    }
    onFrame(shown, now);
    if (shown !== target || keepAlive()) raf = requestAnimationFrame(loop); else { raf = 0; last = 0; }
  }
  const kick = () => { target = progress(); if (!raf) raf = requestAnimationFrame(loop); };
  window.addEventListener('scroll', kick, { passive: true });
  return {
    kick,
    get t() { return shown; },
    // Jump straight to the scroll position (first paint, fonts loaded) or to any t (debugging).
    // With chapters, a jump shows that point and the scene then plays on to its chapter's end.
    sync() { target = shown = progress(); vel = 0; restUntil = 0; onFrame(shown, performance.now()); },
    jump(v) { shown = v; target = chapters ? progress() : v; vel = 0; restUntil = 0; onFrame(v, performance.now()); if (shown !== target && !raf) raf = requestAnimationFrame(loop); },
  };
}
