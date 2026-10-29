// Pitch mode: the deck plays itself. A Pitch button in the menu goes full screen and, page by
// page, scrolls the deck while a voice tells the pitch (proto/pitch/audio/NN.mp3) and captions show
// the words. The words and timings come from proto/pitch/script.md, the one source for the script;
// when a page's clip is missing the page runs on the script's timing, captions only. Scroll scenes
// are walked through while the voice talks. Space pauses, arrows skip, Esc ends; scrolling by hand
// pauses. Each frame is painted from the page's clock, so pausing freezes scroll and words together.
(() => {
  const root = document.documentElement;
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s) => document.querySelector(s);
  const topOf = (el) => el.getBoundingClientRect().top + window.scrollY;
  const centre = (el) => topOf(el) + el.offsetHeight / 2 - window.innerHeight / 2;
  const sceneEnd = (el) => topOf(el) + el.offsetHeight - window.innerHeight;
  const stepAt = (el, k) => topOf(el) + (k / (Number(el.dataset.steps) + 0.6)) * (el.offsetHeight - window.innerHeight);
  const seg = () => Math.max(360, window.innerHeight * 0.7); // the problem's stage height (problem-scroll.js)

  // Where each page sits. "to": scroll there, then hold. "span": walk from a to b while it plays.
  const PLACES = {
    '01': () => ({ to: 0 }),
    '02': () => { const p = $('#problemPin'); return { a: topOf(p), b: topOf(p) + 3 * seg() + 2 }; },
    '03': () => { const e = $('.jelly-end'); return { to: e ? topOf(e) : centre($('#evidence')) }; },
    '04': () => { const s = $('#engine'); return { a: topOf(s), b: sceneEnd(s) }; },
    '05': () => ({ to: centre($('#formats')) }),
    '06': () => ({ to: stepAt($('#features'), 0) }),
    '07': () => ({ to: stepAt($('#features'), 1) }),
    '08': () => ({ to: stepAt($('#features'), 2) }),
    '09': () => ({ to: centre($('#ugc')) }),
    '10': () => ({ to: centre($('#technology')) }),
    '11': () => ({ to: centre($('#season')) }),
    '12': () => ({ to: centre($('#pay')) }),
    '13': () => ({ to: centre($('#fandata')) }),
    '14': () => { const s = $('#delivery'); return { a: topOf(s), b: sceneEnd(s) }; },
    '15': () => ({ to: centre($('#demo')) }),
    '16': () => ({ to: centre($('#film')) }),
  };

  // ---- The script: "## NN · Title (about X s)" blocks; [tags] are for the voice, not the captions.
  async function loadScript() {
    const md = await (await fetch('/proto/pitch/script.md?v=3')).text();
    const pages = [];
    md.split(/^## /m).slice(1).forEach((block) => {
      const m = block.match(/^(\d\d) · (.+?) \(about (\d+) s\)\s*\n([\s\S]*)$/);
      if (!m || !PLACES[m[1]]) return;
      const text = m[4].replace(/\[[^\]]+\]\s*/g, '').replace(/\s+/g, ' ').trim();
      const lines = text.split(/(?<=[.?!])\s+/).filter(Boolean);
      pages.push({ n: m[1], title: m[2], est: Number(m[3]), lines });
    });
    return pages;
  }

  // ---- UI
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'deck-nav-btn pitch-open';
  btn.innerHTML = '<span class="pitch-open__dot" aria-hidden="true"></span>Pitch';
  btn.setAttribute('aria-label', 'Play the pitch: the deck scrolls itself with a voice');
  const ui = document.createElement('div'); ui.className = 'pitch'; ui.hidden = true;
  ui.innerHTML = '<p class="pitch__cap" aria-live="polite"></p>'
    + '<div class="pitch__bar"><button class="pitch__b pitch__toggle" type="button" aria-label="Pause"><i></i></button>'
    + '<button class="pitch__b pitch__prev" type="button" aria-label="Previous page">&#8249;</button>'
    + '<button class="pitch__b pitch__next" type="button" aria-label="Next page">&#8250;</button>'
    + '<span class="pitch__where"><b></b><span></span></span><span class="pitch__prog"><i></i></span>'
    + '<button class="pitch__b pitch__close" type="button" aria-label="End the pitch (Esc)">&times;</button></div>';
  document.body.appendChild(ui);
  const cap = ui.querySelector('.pitch__cap'); const where = ui.querySelector('.pitch__where'); const prog = ui.querySelector('.pitch__prog i');
  const placeBtn = () => { const present = document.querySelector('#nav .deck-nav-btn:not(.pitch-open)'); const t = present || document.getElementById('themeToggle'); if (t) t.after(btn); };

  // ---- Playback
  let pages = []; let k = 0; let playing = false; let on = false;
  let audio = null; let hasAudio = false; let dur = 0; let clock = 0; let last = 0; let raf = 0;
  let place = null; let from = 0; let ending = 0;
  const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const GAP = 0.7; // seconds of quiet between pages

  function loadPage(i) {
    k = i; const pg = pages[k];
    if (audio) { audio.pause(); audio.src = ''; }
    audio = new Audio(`/proto/pitch/audio/${pg.n}.mp3`); audio.preload = 'auto';
    hasAudio = false; dur = pg.est; clock = 0; ending = 0;
    audio.addEventListener('loadedmetadata', () => { if (pages[k] === pg && audio.duration) { hasAudio = true; dur = audio.duration; if (playing) audio.play().catch(() => { hasAudio = false; }); } }, { once: true });
    audio.addEventListener('error', () => { hasAudio = false; }, { once: true });
    from = window.scrollY; place = PLACES[pg.n]();
    where.querySelector('b').textContent = `${pg.n} / ${String(pages.length).padStart(2, '0')}`;
    where.querySelector('span').textContent = pg.title;
    if (playing) audio.play().catch(() => {});
  }

  function paint() {
    const pg = pages[k]; if (!pg) return;
    // Scroll: glide to the place (1.2 s), or walk a scene from its start to its end over the clip.
    let y;
    if (place.to != null) y = from + (place.to - from) * (RM ? 1 : ease(clamp(clock / 1.2)));
    else { const into = RM ? 1 : ease(clamp(clock / 1.0)); const walk = clamp((clock - 1.0) / Math.max(1, dur - 1.6)); y = from + (place.a - from) * into + (place.b - place.a) * (RM ? walk : ease(walk)); }
    window.scrollTo(0, Math.round(y));
    // Captions: each sentence holds for a share of the clip in proportion to its length.
    const total = pg.lines.reduce((s, l) => s + l.length, 0); let acc = 0; const at = clamp(clock / dur) * total;
    const line = pg.lines.find((l) => (acc += l.length) >= at) || pg.lines[pg.lines.length - 1];
    if (cap.textContent !== line) cap.textContent = line;
    prog.style.setProperty('--p', ((k + clamp(clock / dur)) / pages.length).toFixed(4));
  }

  function frame(now) {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    if (playing) {
      clock = hasAudio && !audio.paused ? audio.currentTime : clock + dt;
      if (clock >= dur) { ending += dt; clock = dur; if (ending >= GAP) { if (k < pages.length - 1) loadPage(k + 1); else { setPlaying(false); cap.textContent = 'Thanks for watching.'; } } }
    }
    paint();
    raf = requestAnimationFrame(frame);
  }

  function setPlaying(p) {
    playing = p; ui.classList.toggle('is-paused', !p);
    ui.querySelector('.pitch__toggle').setAttribute('aria-label', p ? 'Pause' : 'Play');
    if (!audio) return;
    if (p && hasAudio && clock < dur) { audio.currentTime = clock; audio.play().catch(() => { hasAudio = false; }); } else audio.pause();
    if (p && k === pages.length - 1 && clock >= dur) loadPage(0);
  }

  async function start() {
    if (on) return; on = true;
    if (!pages.length) pages = await loadScript();
    if (!pages.length) { on = false; return; }
    root.classList.add('is-pitch'); ui.hidden = false; last = 0;
    if (root.requestFullscreen && !document.fullscreenElement) root.requestFullscreen().catch(() => {});
    playing = true; loadPage(0); ui.classList.remove('is-paused');
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (!on) return; on = false; playing = false;
    cancelAnimationFrame(raf); if (audio) audio.pause();
    root.classList.remove('is-pitch'); ui.hidden = true;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  const go = (d) => { const i = Math.max(0, Math.min(pages.length - 1, k + d)); if (i !== k) loadPage(i); };

  btn.addEventListener('click', start);
  ui.querySelector('.pitch__toggle').addEventListener('click', () => setPlaying(!playing));
  ui.querySelector('.pitch__prev').addEventListener('click', () => go(-1));
  ui.querySelector('.pitch__next').addEventListener('click', () => go(1));
  ui.querySelector('.pitch__close').addEventListener('click', stop);
  window.addEventListener('keydown', (e) => {
    if (!on) return;
    if (e.key === 'Escape') { e.preventDefault(); stop(); }
    else if (e.key === ' ') { e.preventDefault(); setPlaying(!playing); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
  }, true); // capture: the deck's own arrow keys stay out of it while the pitch runs
  // Taking the scroll by hand pauses the pitch; Play picks up from the page it was on.
  ['wheel', 'touchmove'].forEach((ev) => window.addEventListener(ev, () => { if (on && playing) { setPlaying(false); from = window.scrollY; } }, { passive: true }));
  document.addEventListener('fullscreenchange', () => { if (on && !document.fullscreenElement && root.requestFullscreen) stop(); });

  // The deck adds its Present button on load; sit right after it.
  if (document.readyState === 'complete') placeBtn(); else window.addEventListener('load', placeBtn);
  window.pitch = { start, stop, go: (i) => loadPage(i) }; // debugging
})();
