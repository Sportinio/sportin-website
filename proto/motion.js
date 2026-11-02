// Motion toolkit for the scroll scenes: GSAP with ScrollTrigger, vendored in assets/vendor
// (gsap.min.js and ScrollTrigger.min.js load before this file, deferred, so they are globals here).
// Lenis (smooth scrolling) is vendored too, but stays off: the deck snaps page by page with CSS
// scroll snap, which Lenis does not support. Set data-smooth="on" on <html> to try it; it is then
// kept in step with ScrollTrigger, and the CSS snapping would have to be replaced by Lenis's own.
(() => {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  gsap.defaults({ ease: 'power2.out', duration: 0.6 });
  ScrollTrigger.config({ ignoreMobileResize: true });
  let lenis = null;
  if (!RM && window.Lenis && document.documentElement.dataset.smooth === 'on') {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  // Pinned scenes (the engine, the features rail) change the page's height after load.
  window.addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.motion = { gsap, ScrollTrigger, lenis, reduced: RM };
})();
