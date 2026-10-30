// Shared by the pages that animate when they come into view (05, 11, 12, 13, 15). While scrolling,
// "shown" means the element is on screen. In Present mode every slide is laid over the same
// screen, so there "shown" means its slide is the current one. on() and off() may be called more
// than once; the pages guard against that themselves.
window.whenShown = (el, { slide = el, threshold = 0.3, on, off } = {}) => {
  const root = document.documentElement;
  let inView = false; let was = null;
  const update = () => {
    const shown = root.classList.contains('is-deck') ? slide.classList.contains('is-current') : inView;
    if (shown === was) return; was = shown;
    if (shown) on && on(); else off && off();
  };
  new IntersectionObserver(([en]) => { inView = en.isIntersecting; update(); }, { threshold }).observe(el);
  const watch = new MutationObserver(update);
  watch.observe(slide, { attributes: true, attributeFilter: ['class'] });
  watch.observe(root, { attributes: true, attributeFilter: ['class'] });
};
