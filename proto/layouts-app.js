// Layout mockup: scale the app screens into their phones, draw option A's label lines to the
// app points they describe, and step option B's tour (click a step, or it advances every 3.5 s).
(function () {
  const fit = () => document.querySelectorAll('.phone .ios').forEach((c) => {
    const box = c.parentElement; const k = box.clientWidth / Number(c.dataset.w || 393);
    if (!k) return; c.style.setProperty('--k', String(k)); c.style.height = `${box.clientHeight / k}px`;
  });

  // A: a point given in app points (x,y on the 393-wide canvas) to page coordinates in the stage.
  function lines() {
    const stage = document.querySelector('.a__stage'); const phone = document.getElementById('phoneA'); if (!stage || !phone) return;
    const svg = stage.querySelector('.a__lines'); const sr = stage.getBoundingClientRect();
    const scr = phone.querySelector('.phone__screen').getBoundingClientRect(); const k = scr.width / 393;
    const pr = phone.getBoundingClientRect();
    let html = '';
    const notes = [...stage.querySelectorAll('.a__note')]; const left = notes.filter((n) => n.dataset.side === 'left'); const right = notes.filter((n) => n.dataset.side === 'right');
    const place = (list, side) => list.forEach((n, i) => {
      const [x, y] = n.dataset.pt.split(',').map(Number);
      const px = scr.left - sr.left + x * k; const py = scr.top - sr.top + y * k;
      const top = pr.top - sr.top + pr.height * (0.22 + i * 0.3);
      n.style.top = `${top}px`;
      if (side === 'left') { n.style.right = `${sr.right - pr.left + 56}px`; n.style.left = 'auto'; } else { n.style.left = `${pr.right - sr.left + 56}px`; }
      const nr = n.getBoundingClientRect(); const ny = nr.top - sr.top + 10;
      const nx = side === 'left' ? nr.right - sr.left + 12 : nr.left - sr.left - 12;
      html += `<path d="M${nx},${ny} H${side === 'left' ? px - 28 : px + 28} L${px},${py}"/><circle cx="${px}" cy="${py}" r="4"/>`;
    });
    place(left, 'left'); place(right, 'right');
    svg.innerHTML = html;
  }

  // B: move the spotlight over the active step's area (app points: x, y, w, h).
  const steps = [...document.querySelectorAll('.b__steps li')]; const spot = document.querySelector('.b__spot');
  let cur = 0; let timer = 0;
  function show(i) {
    cur = i; steps.forEach((s, j) => s.classList.toggle('is-on', j === i));
    const [x, y, w, h] = steps[i].dataset.spot.split(',').map(Number);
    Object.assign(spot.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
  }
  if (spot) {
    // The spotlight sits inside the app canvas (.ios), so its numbers are app points.
    steps.forEach((s, i) => s.addEventListener('click', () => { show(i); clearInterval(timer); timer = setInterval(() => show((cur + 1) % steps.length), 3500); }));
    show(0); timer = setInterval(() => show((cur + 1) % steps.length), 3500);
  }

  const all = () => { fit(); lines(); };
  window.addEventListener('resize', all); window.addEventListener('load', all);
  if (document.fonts) document.fonts.ready.then(all);
  all();
})();
