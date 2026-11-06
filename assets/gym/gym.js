/* SportIn for gyms: scroll stories. Motion rules live in /DESIGN.md.
   Without GSAP or with reduced motion, every section renders its final state. */
(function () {
  'use strict';
  var root = document.documentElement;

  // Footer year
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  // Nav background once the page has scrolled
  var nav = document.getElementById('nav');
  var onScroll = function () { nav.classList.toggle('is-scrolled', window.scrollY > 40); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // App tour: phones under 900px get their own screen inside each step
  var steps = Array.prototype.slice.call(document.querySelectorAll('.tour__steps .step'));
  var screens = Array.prototype.slice.call(document.querySelectorAll('.tour__device .screen'));
  steps.forEach(function (step, i) {
    if (!screens[i]) return;
    var holder = document.createElement('div');
    holder.className = 'step__phone';
    holder.setAttribute('aria-hidden', 'true');
    holder.innerHTML = '<div class="phone"><div class="phone__screen"></div></div>';
    var clone = screens[i].cloneNode(true);
    clone.classList.add('is-on');
    holder.querySelector('.phone__screen').appendChild(clone);
    step.insertBefore(holder, step.firstChild);
  });

  // App tour: the step in the middle of the viewport drives the sticky phone
  function setStep(i) {
    steps.forEach(function (s, n) { s.classList.toggle('is-on', n === i); });
    screens.forEach(function (s, n) { s.classList.toggle('is-on', n === i); });
  }
  setStep(0);
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) setStep(steps.indexOf(e.target)); });
    }, { rootMargin: '-50% 0px -50% 0px' });
    steps.forEach(function (s) { io.observe(s); });
  }

  // Scroll stories need GSAP + ScrollTrigger
  if (!window.gsap || !window.ScrollTrigger) return;
  var gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);

  var mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', function () {
    root.classList.add('motion');

    // Hero: the phone drifts up a little as the page starts to move
    gsap.to('#heroPhone', {
      yPercent: -7, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 }
    });

    // The day: 60 minutes lit, the rest dark, then the rest of the day fills in
    var lines = gsap.utils.toArray('.day__line');
    var acts = gsap.utils.toArray('.clock__act');
    var feed = gsap.utils.toArray('.feed li');
    var tallyEl = document.getElementById('tally');
    var points = [21, 30, 52, 40];
    var tally = { v: 0 };

    gsap.set(lines, { autoAlpha: 0, y: 24 });
    gsap.set(lines[0], { autoAlpha: 1, y: 0 });
    gsap.set('.clock__dark', { autoAlpha: 0 });
    gsap.set(acts, { scaleX: 0 });
    gsap.set(feed, { autoAlpha: 0, y: 12 });
    gsap.set('.tally', { autoAlpha: 0 });
    gsap.set('.tally__rank', { autoAlpha: 0, y: 8 });
    tallyEl.textContent = '0';

    var day = gsap.timeline({
      defaults: { ease: 'power2.inOut', duration: 1 },
      scrollTrigger: {
        trigger: '.day', start: 'top top', end: '+=340%',
        pin: true, scrub: 0.6, anticipatePin: 1
      }
    });
    day
      .to({}, { duration: 1.2 })
      .to(lines[0], { autoAlpha: 0, y: -24, duration: 0.6 })
      .to(lines[1], { autoAlpha: 1, y: 0 }, '>-0.1')
      .to('.clock__dark', { autoAlpha: 1 }, '<')
      .to({}, { duration: 1.2 })
      .to(lines[1], { autoAlpha: 0, y: -24, duration: 0.6 })
      .to(lines[2], { autoAlpha: 1, y: 0 }, '>-0.1')
      .to('.clock__dark', { autoAlpha: 0 }, '<0.4')
      .to('.tally', { autoAlpha: 1, duration: 0.6 }, '<');

    acts.forEach(function (act, i) {
      var at = i === 0 ? '>-0.2' : '>0.1';
      day.to(act, { scaleX: 1, duration: 0.8, ease: 'power2.out' }, at)
        .to(feed[i], { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }, '<0.1')
        .to(tally, {
          v: tally.v + points[i], duration: 0.6, ease: 'none',
          onUpdate: function () { tallyEl.textContent = String(Math.round(tally.v)); }
        }, '<');
      tally.v += points[i];
    });
    tally.v = 0;

    day.to('.tally__rank', { autoAlpha: 1, y: 0, duration: 0.6 }, '>0.1')
      .to({}, { duration: 1.2 });

    return function () { root.classList.remove('motion'); tallyEl.textContent = '143'; };
  });

  // Games: pinned horizontal run on wider screens; phones keep a native swipe row
  mm.add('(min-width: 761px) and (prefers-reduced-motion: no-preference)', function () {
    var section = document.querySelector('.games');
    var track = document.querySelector('.games__track');
    var viewport = document.querySelector('.games__viewport');
    // Layout-only maths (ignores the current transform): slide until the last card
    // sits one gutter from the right edge.
    var distance = function () {
      var cs = getComputedStyle(viewport);
      var left = parseFloat(cs.paddingLeft) || 0;
      var gutter = parseFloat(cs.paddingRight) || 24;
      return Math.max(0, left + track.scrollWidth + gutter - viewport.clientWidth);
    };
    section.classList.add('is-pinned');
    if (distance() < 40) { section.classList.remove('is-pinned'); return; }

    gsap.to(track, {
      x: function () { return -distance(); }, ease: 'none',
      scrollTrigger: {
        trigger: section, start: 'top top', end: function () { return '+=' + distance(); },
        pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1
      }
    });
    return function () { section.classList.remove('is-pinned'); };
  });
})();
