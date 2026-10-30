// Engine mockup: scroll drives everything. t runs from 0 to 5 across the pinned section:
// 0 intro, 1 Competitions, 2 Challenges, 3 Leaderboard, 4 Reward, 5 the chip.
// Layer 1 comes down from above; a line runs down to layer 2, which rises into place; the line
// continues to layer 3; then the three press together into one chip. A light smoothing keeps
// trackpad steps soft; scrolling back plays it in reverse.
(() => {
  const sec = document.getElementById('engine');
  if (!sec) return;
  const stage = sec.querySelector('.engine__stage');
  const stack = document.getElementById('stack');
  const glass = document.getElementById('plGlass'); const board = document.getElementById('plBoard'); const reward = document.getElementById('plReward');
  const texts = [...sec.querySelectorAll('.eng-txt')];
  const zoneA = sec.querySelector('.zone--comp'); const zoneB = sec.querySelector('.zone--chal');
  const lanes = [...sec.querySelectorAll('.lanes span')]; const laneBar = sec.querySelector('.lane-bar');
  const vals = [...sec.querySelectorAll('.rows em')];
  const perks = [...sec.querySelectorAll('.perk-card')];
  const pts = document.getElementById('pts'); const km = document.getElementById('km');
  const steps = document.getElementById('steps');

  const pins = document.getElementById('pins');

  // Pins around the chip base.
  const W = 520; const H = 340; const PAD = 18;
  for (let i = 0; i < 14; i++) {
    const x = PAD + 40 + i * ((W - 80) / 13);
    [[x, 2, 4, 12], [x, H + 2 * PAD - 14, 4, 12]].forEach(([l, t, w, h]) => { const p = document.createElement('i'); p.className = 'pin'; Object.assign(p.style, { left: `${l}px`, top: `${t}px`, width: `${w}px`, height: `${h}px` }); pins.appendChild(p); });
  }
  for (let i = 0; i < 9; i++) {
    const y = PAD + 36 + i * ((H - 72) / 8);
    [[2, y, 12, 4], [W + 2 * PAD - 14, y, 12, 4]].forEach(([l, t, w, h]) => { const p = document.createElement('i'); p.className = 'pin'; Object.assign(p.style, { left: `${l}px`, top: `${t}px`, width: `${w}px`, height: `${h}px` }); pins.appendChild(p); });
  }

  const GAP = 270; // space between layers in the exploded view
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const sm = (u) => u * u * u * (u * (u * 6 - 15) + 10);
  const win = (t, a, b) => sm(clamp((t - a) / (b - a)));
  const lerp = (a, b, u) => a + (b - a) * u;
  const set = (el, k, v) => el.style.setProperty(k, v);

  let baseSc = 1;
  function fit() {
    const r = stage.getBoundingClientRect();
    const sc = Math.min(1.3, r.width / (r.width < 600 ? 860 : 620), r.height / 760);
    baseSc = Math.max(0.35, sc);
  }

  function paint(t) {
    // Copy: one block at a time.
    texts.forEach((el, k) => {
      const d = Math.abs(t - k); const o = 1 - sm(clamp((d - 0.28) / 0.22));
      el.style.opacity = String(o);
      el.style.transform = `translateY(${((t - k) * -18).toFixed(1)}px)`;
      el.style.filter = o < 0.98 ? `blur(${((1 - o) * 6).toFixed(2)}px)` : 'none';
      el.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
    });

    // Layer 1 comes down from above.
    const p1 = win(t, 0.15, 0.95);
    // Layers 2 and 3 rise into place as the line reaches them.
    const d1 = win(t, 2.05, 2.55); const p2 = win(t, 2.35, 2.95);
    const d2 = win(t, 3.05, 3.55); const p3 = win(t, 3.35, 3.95);
    // The merge into a chip.
    const m = win(t, 4.25, 4.95);

    set(glass, '--z', `${lerp(lerp(1000, GAP, p1), 26, m).toFixed(1)}px`); set(glass, '--o', String(p1));
    set(board, '--z', `${lerp(lerp(-150, 0, p2), 13, m).toFixed(1)}px`); set(board, '--o', String(p2));
    set(reward, '--z', `${lerp(lerp(-GAP - 150, -GAP, p3), 0, m).toFixed(1)}px`); set(reward, '--o', String(p3));
    set(stack, '--d1', String(d1)); set(stack, '--d2', String(d2)); set(stack, '--to', String(1 - m));
    [glass, board, reward].forEach((pl) => set(pl, '--b', String(1 - m)));
    set(glass, '--cf', String(win(t, 4.55, 5)));
    set(stack, '--pn', String(win(t, 4.6, 5)));
    // Camera: close on layer 1 while it is the only one, then pull back as the stack grows.
    const out = win(t, 2.0, 2.7);
    set(stack, '--sc', String(baseSc * lerp(1.2, 1, out) * lerp(1, 1.08, m)));
    set(stack, '--ty', `${lerp(130, 0, out).toFixed(1)}px`);
    set(stack, '--tx', `${lerp(10, 0, out).toFixed(1)}px`);
    set(stack, '--rx', `${lerp(60, 52, m).toFixed(2)}deg`); set(stack, '--rz', `${lerp(-34, -28, m).toFixed(2)}deg`);
    set(stack, '--sh', String(0.25 + 0.45 * Math.max(p1, m)));

    // Competitions: groups decide two qualifiers each, then the knockout plays to a champion.
    // Challenges: the ring fills fast.
    const a = win(t, 0.6, 1.0) * (1 - win(t, 1.45, 1.65)); const b = win(t, 1.5, 1.8);
    set(zoneA, '--a', String(t < 0.6 ? 1 : 0.4 + 0.6 * Math.max(a, t > 2.6 ? 1 : 0)));
    set(zoneB, '--a', String(t < 1.5 ? (t < 0.6 ? 1 : 0.4) : 0.4 + 0.6 * Math.max(b, t > 2.6 ? 1 : 0)));
    // Knockout: four teams appear, each pair sends one winner on, the final crowns a champion.
    set(zoneA, '--o1', String(win(t, 0.6, 0.78)));
    zoneA.classList.toggle('is-r1', t > 0.86);
    set(zoneA, '--k1', String(win(t, 0.88, 1.05)));
    set(zoneA, '--o2', String(win(t, 1.0, 1.1)));
    zoneA.classList.toggle('is-r2', t > 1.16);
    set(zoneA, '--k2', String(win(t, 1.18, 1.3)));
    set(zoneA, '--o3', String(win(t, 1.28, 1.4)));
    const rp = win(t, 1.55, 2.4); set(zoneB, '--rp', rp.toFixed(3)); steps.textContent = Math.round(7412 * rp).toLocaleString('en-US');

    // Leaderboard: walking, running, cycling light up in turn.
    const ln = t < 2.95 ? 0 : t < 3.25 ? 1 : 2; const lo = win(t, 2.7, 2.9);
    set(laneBar, '--ln', String(lerp(0, 1, win(t, 2.95, 3.1)) + lerp(0, 1, win(t, 3.25, 3.4))));
    set(laneBar, '--lo', String(lo));
    lanes.forEach((s, k) => s.classList.toggle('is-on', lo > 0.5 && k === ln));
    vals.forEach((v) => { v.textContent = v.dataset.v.split('|')[ln]; });

    // Reward: effort turns into points; each perk unlocks as the points pass its mark.
    const pr = win(t, 3.55, 4.25);
    set(reward, '--pp', pr.toFixed(4));
    pts.textContent = Math.round(2500 * pr).toLocaleString('en-US');
    km.textContent = String(Math.round(31 * pr));
    perks.forEach((c, k) => {
      const on = pr >= [0.2, 0.6, 1][k] - 0.001;
      c.classList.toggle('is-on', on);
      c.classList.toggle('is-redeem', k === 2 && pr >= 0.999);
    });
  }

  let shown = 0; let target = 0; let raf = 0; let last = 0;
  function progress() {
    const r = sec.getBoundingClientRect(); const span = r.height - window.innerHeight;
    return Math.max(0, Math.min(5, (-r.top / span) * 5));
  }
  function loop(now) {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60); last = now;
    shown += (target - shown) * (1 - Math.exp(-dt / 0.09));
    if (Math.abs(target - shown) < 0.0008) shown = target;
    paint(shown);
    if (shown !== target) raf = requestAnimationFrame(loop); else { raf = 0; last = 0; }
  }
  const kick = () => { target = progress(); if (!raf) raf = requestAnimationFrame(loop); };
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', () => { fit(); kick(); });
  fit(); target = shown = progress(); paint(shown);
  // Mockup helper for checking frames.
  window.engineAt = (v) => { target = shown = v; paint(v); };
})();
