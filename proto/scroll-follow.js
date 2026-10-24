// Scroll position to scene time, at a steady, eased pace. A pinned scroll scene maps its scroll
// to t = 0..steps (the last `hold` part of the scroll keeps the final step on screen). The scene
// follows that target: it speeds up gently, holds a calm cruising speed and slows to a soft stop,
// so one step takes about 2 s however fast the scroll or snap jumps; long jumps catch up faster.
// Reduced motion follows the scroll directly. Shared by the engine and integrations scenes.
//
// Chapters (the engine): `chapters` lists where each chapter ends, e.g. [6, 10]. Each scroll stop
// is one chapter, and the scene plays that chapter by itself, one step at a time with a short
// rest on each so its caption can be read. Going back, or catching up to a chapter's start, moves
// without rests. Until the scene is pinned it waits at the start, so arriving plays it. Every
// scene drawn on the same section shares one timeline, so they never drift apart. Reduced motion
// cuts from step to step instead of moving.
const ACC = 1.6; // t per second², how gently it speeds up and slows down
const CRUISE = 0.6; // t per second for a single step
const STEP_CRUISE = 1; const STEP_ACC = 2.6; const REST = 0.9; // chapters: ~1.4 s per step, then 0.9 s still
const REST_REDUCED = 2.3; // chapters with reduced motion: each step stays this long, no movement

const timelines = new WeakMap(); // chapters: section -> its shared timeline

// cruise and acc can be lowered for a slower, slow-motion scene (the Competitions pages use this).
export function followScroll(sec, { steps, hold = 0.6, reduced = false, onFrame, keepAlive = () => false, cruise = CRUISE, acc = ACC, chapters = null }) {
  if (chapters && timelines.has(sec)) return timelines.get(sec).join(onFrame, keepAlive);
  const scenes = [{ onFrame, keepAlive }];
  const frame = (t, now) => scenes.forEach((s) => s.onFrame(t, now));
  let shown = 0; let target = 0; let raf = 0; let last = 0; let vel = 0; let restUntil = 0; let synced = false;
  function progress() {
    const r = sec.getBoundingClientRect();
    const f = -r.top / (r.height - window.innerHeight);
    if (chapters) {
      if (r.top > window.innerHeight * 0.25) return 0; // not there yet: wait at the start
      if (r.top > 4) return target; // a small nudge above the first stop changes nothing
      return chapters[Math.round(Math.min(1, f) * (chapters.length - 1))];
    }
    return Math.max(0, Math.min(steps, f * (steps + hold)));
  }
  // Chapters: the start of the chapter that ends at `t` (the previous chapter's end).
  const startOf = (t) => chapters.reduce((s, end) => (end < t ? end : s), 0);
  // Chapters: where to head next, and whether to rest on each step on the way.
  function aim() {
    if (!chapters || shown > target) return { to: target, rest: false };
    const start = startOf(target);
    if (shown < start) return { to: start, rest: false };
    return { to: Math.min(target, Math.floor(shown + 1e-6) + 1), rest: true };
  }
  function loop(now) {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60); last = now;
    const r = sec.getBoundingClientRect();
    const away = r.bottom <= 0 || r.top >= window.innerHeight; // nobody sees the way there, so skip it
    if (away || (reduced && !chapters)) { shown = target; vel = 0; restUntil = 0; } else if (shown !== target) {
      const { to, rest } = aim();
      if (rest && vel === 0 && Math.abs(shown - Math.round(shown)) < 1e-6 && !restUntil) restUntil = now + (reduced ? REST_REDUCED : REST) * 1000;
      if (!(rest && restUntil && now < restUntil)) {
        restUntil = 0;
        if (reduced) { shown = to; vel = 0; } else {
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
    }
    frame(shown, now);
    if (shown !== target || scenes.some((s) => s.keepAlive())) raf = requestAnimationFrame(loop); else { raf = 0; last = 0; }
  }
  const run = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const kick = () => { target = progress(); run(); };
  window.addEventListener('scroll', kick, { passive: true });
  const api = {
    kick,
    get t() { return shown; },
    // Jump straight to the scroll position (first paint, fonts loaded) or to any t (debugging).
    // With chapters, the first sync starts at the beginning of the chapter on screen, so a scene
    // that loads late still plays it; later syncs (fonts loaded) only repaint and carry on.
    sync() {
      if (!chapters) { target = shown = progress(); vel = 0; frame(shown, performance.now()); return; }
      target = progress();
      if (!synced) { synced = true; shown = startOf(target); vel = 0; restUntil = 0; }
      frame(shown, performance.now()); run();
    },
    // With chapters, a jump shows that point and the scene then plays on to its chapter's end.
    jump(v) { shown = v; target = chapters ? progress() : v; vel = 0; restUntil = 0; frame(v, performance.now()); if (shown !== target) run(); },
    // Chapters: another scene on the same section follows this timeline instead of its own.
    join(f, k) { scenes.push({ onFrame: f, keepAlive: k }); synced = true; f(shown, performance.now()); run(); return api; },
  };
  if (chapters) timelines.set(sec, api);
  return api;
}
