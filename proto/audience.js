// 09 Who it's for: a pinned scroll scene. The scene follows the scroll at the Competitions pace
// (scroll-follow.js); t runs 0..4. Steps 1-3 light one audience each (name, a blue rule, the line;
// the previous line dims); step 4 counts the engagement number from 20 to 75 and grows the SportIn
// bar with it. Everything is painted from t, so scrolling back plays it in reverse.
import { followScroll } from '/proto/scroll-follow.js?v=2';

const sec = document.getElementById('who');
if (sec && sec.classList.contains('aud')) {
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rows = [...sec.querySelectorAll('.aud__row')];
  const panel = sec.querySelector('.aud__panel'); const copy = sec.querySelector('.aud__copy');
  const nEl = sec.querySelector('.aud__n'); const vEl = sec.querySelector('.aud__v'); const siFill = sec.querySelector('.aud__bar--si .aud__track i');
  const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  let shown = -1;

  function paint(t) {
    rows.forEach((row, s) => {
      const on = RM ? sm(s + 0.45, s + 0.55, t) : sm(s + 0.1, s + 0.7, t);
      const ln = RM ? on : sm(s + 0.3, s + 0.95, t);
      const dim = RM ? sm(s + 1.45, s + 1.55, t) : sm(s + 1.05, s + 1.45, t);
      row.style.setProperty('--on', on.toFixed(3)); row.style.setProperty('--ln', ln.toFixed(3)); row.style.setProperty('--dim', dim.toFixed(3));
    });
    const k = RM ? sm(3.45, 3.55, t) : sm(3.15, 3.95, t);
    const n = RM ? (k < 0.5 ? 20 : 75) : 20 + 55 * k;
    const fo = RM ? k : sm(3.15, 3.3, t); const sup = RM ? sm(3.45, 3.55, t) : sm(3.6, 4, t);
    panel.style.setProperty('--k', k.toFixed(3)); panel.style.setProperty('--fo', fo.toFixed(3)); panel.style.setProperty('--sup', sup.toFixed(3));
    copy.style.setProperty('--sup', sup.toFixed(3));
    siFill.style.setProperty('--f', RM ? '0.75' : (n / 100).toFixed(3));
    const whole = Math.round(n);
    if (whole !== shown) { shown = whole; nEl.textContent = String(whole); vEl.textContent = `${whole}%`; }
  }

  if (window.matchMedia('(max-width: 900px)').matches) paint(4); // no pinned scene on narrow screens
  else {
    const follow = followScroll(sec, { steps: 4, hold: 0.6, reduced: RM, onFrame: paint, cruise: 0.3, acc: 0.7 });
    follow.sync();
    if (document.fonts) document.fonts.ready.then(() => follow.sync());
    window.audienceAt = (v) => follow.jump(v); // debugging: show any point of the scene
  }
}
