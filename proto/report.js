// 13 Fan data: when the report comes on screen the four numbers count up from zero and the line
// draws (report.css). It plays once; the HTML holds the final figures.
(() => {
  const sec = document.getElementById('fandata');
  if (!sec) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const vals = [...sec.querySelectorAll('.rpt__v')];
  const show = (el, v) => { el.textContent = el.dataset.fmt === 'p' ? `${Math.round(v)}%` : Math.round(v).toLocaleString('en-US'); };
  function count() {
    const t0 = performance.now(); const DUR = 1400;
    const tick = (now) => {
      const u = Math.min(1, (now - t0) / DUR); const e = 1 - (1 - u) ** 3;
      vals.forEach((el) => show(el, Number(el.dataset.to) * e));
      if (u < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  let done = false;
  window.whenShown(sec, { on: () => { if (done) return; done = true; sec.classList.add('is-in'); if (!reduced) count(); } });
})();
