// 10 Delivery: a pinned scroll scene, t runs 0..2 at the Competitions pace (scroll-follow.js).
// At t = 0, 1, 2 the phone shows one option and only that option's text is beside it: the SportIn
// app, white label, then a client's own app. Between steps the 3D phone (delivery-3d.js) makes one
// full turn on its vertical axis: at half way (180 degrees) its back faces the viewer, and the screen
// changes then, so the next screen arrives as the turn completes. Without WebGL
// the flat phone stays still and its screens cross-fade.
import { followScroll } from '/proto/scroll-follow.js?v=2';

const sec = document.getElementById('delivery');
if (sec) {
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rows = [...sec.querySelectorAll('.dl__row')];
  const layers = [...sec.querySelectorAll('.dl__layer')];
  const caps = [...sec.querySelectorAll('.dl__cap span')];
  const last = rows.length - 1;
  const REST_YAW = 0, REST_PITCH = 0; // at rest the screen faces the viewer straight on
  const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  let phone3d = null;

  function paint(t) {
    const i = Math.min(last, Math.floor(t));
    const p = t >= last ? 0 : RM ? (t - i < 0.5 ? 0 : 1) : sm(0.1, 0.9, t - i);
    const shown = p < 0.5 ? i : i + 1;
    // The option text and caption fade out as the turn starts and the next ones fade in as it ends.
    const o = RM ? '1' : Math.abs(Math.cos(p * Math.PI)).toFixed(3);
    rows.forEach((r, k) => r.style.setProperty('--on', k === shown ? o : '0'));
    caps.forEach((c, k) => c.style.setProperty('--o', k === shown ? o : '0'));
    if (phone3d) phone3d.set(REST_YAW + (RM ? 0 : p * Math.PI * 2), REST_PITCH - 0.06 * Math.sin(p * Math.PI), shown);
    else layers.forEach((l, k) => l.style.setProperty('--o', k === shown ? o : '0'));
  }

  let follow = null;
  if (window.matchMedia('(max-width: 900px)').matches) paint(0);
  else {
    follow = followScroll(sec, { steps: last, hold: 0.6, reduced: RM, onFrame: paint, cruise: 0.3, acc: 0.7 });
    follow.sync();
    window.deliveryAt = (v) => follow.jump(v); // debugging: show any point of the scene
  }

  // Swap in the 3D phone once Three.js and the three screens have loaded.
  import('/proto/delivery-3d.js?v=2')
    .then(({ makePhone3D }) => makePhone3D(sec.querySelector('.dl__three'), layers.map((l) => l.getAttribute('src'))))
    .then((p) => { if (!p) return; phone3d = p; sec.classList.add('is-3d'); p.resize(); paint(follow ? follow.t : 0); })
    .catch((e) => console.warn('Delivery 3D phone unavailable, keeping the flat one', e));
}
