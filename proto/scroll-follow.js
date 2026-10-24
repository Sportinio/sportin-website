// Scroll position to scene time, at a steady, eased pace. A pinned scroll scene maps its scroll
// to t = 0..steps (the last `hold` part of the scroll keeps the final step on screen). The scene
// follows that target: it speeds up gently, holds a calm cruising speed and slows to a soft stop,
// so one step takes about 2 s however fast the scroll or snap jumps; long jumps catch up faster.
// Reduced motion follows the scroll directly. Shared by the engine and integrations scenes.
const ACC = 1.6; // t per second², how gently it speeds up and slows down
const CRUISE = 0.6; // t per second for a single step

// cruise and acc can be lowered for a slower, slow-motion scene (the Competitions pages use this).
export function followScroll(sec, { steps, hold = 0.6, reduced = false, onFrame, keepAlive = () => false, cruise = CRUISE, acc = ACC }) {
  let shown = 0; let target = 0; let raf = 0; let last = 0; let vel = 0;
  function progress() {
    const r = sec.getBoundingClientRect();
    return Math.max(0, Math.min(steps, (-r.top / (r.height - window.innerHeight)) * (steps + hold)));
  }
  function loop(now) {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60); last = now;
    const r = sec.getBoundingClientRect();
    const away = r.bottom <= 0 || r.top >= window.innerHeight; // nobody sees the way there, so skip it
    if (reduced || away) { shown = target; vel = 0; } else if (shown !== target) {
      const d = target - shown; const dist = Math.abs(d);
      const vmax = cruise + 0.5 * Math.max(0, dist - 1);
      const want = Math.sign(d) * Math.min(vmax, Math.sqrt(2 * acc * dist)); // still able to stop in time
      const dv = want - vel; vel += Math.sign(dv) * Math.min(Math.abs(dv), acc * dt);
      shown += vel * dt;
      if (Math.sign(target - shown) !== Math.sign(d)) { shown = target; vel = 0; } // never overshoot
      if (Math.abs(target - shown) < 0.001 && Math.abs(vel) < 0.03) { shown = target; vel = 0; }
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
    sync() { target = shown = progress(); vel = 0; onFrame(shown, performance.now()); },
    jump(v) { target = shown = v; vel = 0; onFrame(v, performance.now()); },
  };
}
