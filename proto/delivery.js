// 10 Delivery: a pinned scroll scene, t runs 0..2 at the Competitions pace (scroll-follow.js).
// At t = 0, 1, 2 one option is lit and the phone shows it: the SportIn app, white label, then a
// client's own app. Between steps the phone turns on its vertical axis; the screen changes while
// it is edge-on, and the turn carries on in the same direction back to face the viewer.
import { followScroll } from '/proto/scroll-follow.js?v=2';

const sec = document.getElementById('delivery');
if (sec) {
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rows = [...sec.querySelectorAll('.dl__row')];
  const phone = sec.querySelector('.dl__phone');
  const layers = [...sec.querySelectorAll('.dl__layer')];
  const caps = [...sec.querySelectorAll('.dl__cap span')];
  const last = rows.length - 1;
  const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  // How much of step i is lit at time t: full at i, gone one step away (narrow for reduced motion).
  const near = (i, t) => { const d = Math.abs(t - i); return RM ? (d < 0.5 ? 1 : 0) : 1 - sm(0.15, 0.85, d); };

  function paint(t) {
    rows.forEach((r, i) => r.style.setProperty('--on', near(i, t).toFixed(3)));
    const i = Math.min(last, Math.floor(t)); const p = t >= last ? 0 : sm(0.1, 0.9, t - i);
    if (RM) { [layers, caps].forEach((set) => set.forEach((el, k) => el.style.setProperty('--o', near(k, t).toFixed(3)))); return; }
    // 0 to 90 degrees on the old screen, then -90 to 0 on the new one: one continuous turn.
    const ry = p < 0.5 ? p * 180 : p * 180 - 180;
    phone.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
    phone.style.setProperty('--sc', (1 - 0.08 * Math.sin(p * Math.PI)).toFixed(4));
    const shown = p < 0.5 ? i : i + 1;
    layers.forEach((l, k) => l.style.setProperty('--o', k === shown ? '1' : '0'));
    // The caption fades out as the turn starts and the next one fades in as it ends.
    const capO = Math.abs(Math.cos(p * Math.PI)).toFixed(3);
    caps.forEach((c, k) => c.style.setProperty('--o', k === shown ? capO : '0'));
  }

  // The client's app is laid out in iOS points; scale it to the phone screen.
  const app = sec.querySelector('.dlapi');
  const fit = () => { const box = app.parentElement; const k = box.clientWidth / 393; if (k) { app.style.transformOrigin = '0 0'; app.style.transform = `scale(${k})`; app.style.height = `${box.clientHeight / k}px`; } };
  fit(); window.addEventListener('resize', fit);

  if (window.matchMedia('(max-width: 900px)').matches) paint(0);
  else {
    const follow = followScroll(sec, { steps: last, hold: 0.6, reduced: RM, onFrame: paint, cruise: 0.3, acc: 0.7 });
    follow.sync();
    if (document.fonts) document.fonts.ready.then(() => { fit(); follow.sync(); });
    window.deliveryAt = (v) => follow.jump(v); // debugging: show any point of the scene
  }
}
