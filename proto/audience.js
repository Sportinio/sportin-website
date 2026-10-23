// 14 Who it's for: a pinned scroll scene. The scene follows the scroll at the Competitions pace
// (scroll-follow.js); t runs 0..1. All four audiences are shown from the start; the one scroll
// counts the engagement number from 20 to 75 and grows the SportIn bar with it. Everything is
// painted from t, so scrolling back plays it in reverse.
import { followScroll } from '/proto/scroll-follow.js?v=2';

const sec = document.getElementById('who');
if (sec && sec.classList.contains('aud')) {
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rows = [...sec.querySelectorAll('.aud__row')];
  const panel = sec.querySelector('.aud__panel');
  const nEl = sec.querySelector('.aud__n'); const vEl = sec.querySelector('.aud__v'); const siFill = sec.querySelector('.aud__bar--si .aud__track i');
  const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  let shown = -1;

  function paint(t) {
    // Every audience is shown in its resting state (name, line, no highlight rule).
    rows.forEach((row) => { row.style.setProperty('--on', '1'); row.style.setProperty('--ln', '1'); row.style.setProperty('--dim', '1'); });
    const N = 0; // the number fills on the first scroll
    const k = RM ? sm(N + 0.45, N + 0.55, t) : sm(N + 0.15, N + 0.95, t);
    const n = RM ? (k < 0.5 ? 20 : 75) : 20 + 55 * k;
    const fo = RM ? k : sm(N + 0.15, N + 0.3, t); const sup = RM ? sm(N + 0.45, N + 0.55, t) : sm(N + 0.6, N + 1, t);
    panel.style.setProperty('--k', k.toFixed(3)); panel.style.setProperty('--fo', fo.toFixed(3)); panel.style.setProperty('--sup', sup.toFixed(3));
    siFill.style.setProperty('--f', RM ? '0.75' : (n / 100).toFixed(3));
    const whole = Math.round(n);
    if (whole !== shown) { shown = whole; nEl.textContent = String(whole); vEl.textContent = `${whole}%`; }
  }

  if (window.matchMedia('(max-width: 900px)').matches) paint(1); // no pinned scene on narrow screens
  else {
    const follow = followScroll(sec, { steps: 1, hold: 0.6, reduced: RM, onFrame: paint, cruise: 0.3, acc: 0.7 });
    follow.sync();
    if (document.fonts) document.fonts.ready.then(() => follow.sync());
    window.audienceAt = (v) => follow.jump(v); // debugging: show any point of the scene
  }
}
