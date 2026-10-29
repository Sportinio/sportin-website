// Pitch mode: the deck plays itself. A Pitch button in the menu goes full screen, shows a short
// intro and, once played, scrolls the deck page by page while a voice tells the pitch
// (proto/pitch/audio/NN.mp3) and captions show the words; an end card offers Replay and the pilot.
// The words and timings come from proto/pitch/script.md, the one source for the script; when a
// page's clip is missing the page runs on the script's timing, captions only. Scroll scenes move
// on cue: a stop is keyed to a phrase of the script, so the scene shows a layer as it is spoken.
// Space pauses, arrows skip, Esc ends; scrolling by hand pauses. deck.html#pitch opens the intro.
// Each frame is painted from the page's clock, so pausing freezes scroll and words together.
(() => {
  const root = document.documentElement;
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s) => document.querySelector(s);
  const topOf = (el) => el.getBoundingClientRect().top + window.scrollY;
  // The captions take the bottom band of the screen, so a page centres in the space above it.
  const band = () => ui.querySelector('.pitch__band').offsetHeight;
  const centre = (el) => topOf(el) + el.offsetHeight / 2 - (window.innerHeight - band()) / 2;
  const stepAt = (el, t) => topOf(el) + (t / (Number(el.dataset.steps) + 0.6)) * (el.offsetHeight - window.innerHeight);
  const problemAt = (t) => { // the problem's stage holds still while each step plays (problem-scroll.js)
    const pin = $('#problemPin'); const fig = $('#problem'); const seg = Math.max(360, window.innerHeight * 0.7);
    return topOf(pin) - (parseFloat(fig.style.top) || 0) + t * seg + 2;
  };

  // Where each page sits: a list of [phrase, scroll y]. The first stop is where the page opens; each
  // later one is reached as its phrase is spoken. Phrases are matched against the script's words.
  const PLACES = {
    '01': () => [['', 0]],
    '02': () => [['', problemAt(0)], ['Between matches', problemAt(1)], ['No reason to come back', problemAt(2)], ['And no reason to buy', problemAt(3)]],
    '03': () => { const e = $('.jelly-end'); return [['', e ? topOf(e) : centre($('#evidence'))]]; },
    '04': () => { const s = $('#engine'); const at = (t) => stepAt(s, t); // 0 intro … 4 reward; on to 8 the layers press into the chip and plug into the integrations
      return [['', at(0)], ['Layer one', at(1)], ['For the short run', at(2)], ['Layer two', at(3)], ['Layer three', at(4)], ['And it all connects', at(8)], ['Nothing new to buy', at(10)]]; },
    '05': () => [['', centre($('#formats'))]],
    '06': () => [['', stepAt($('#features'), 0)]],
    '07': () => [['', stepAt($('#features'), 1)]],
    '08': () => [['', stepAt($('#features'), 2)]],
    '09': () => [['', centre($('#ugc'))]],
    '10': () => [['', centre($('#technology'))]],
    '11': () => [['', centre($('#season'))]],
    '12': () => [['', centre($('#pay'))]],
    '13': () => [['', centre($('#fandata'))]],
    '14': () => { const s = $('#delivery'); return [['', stepAt(s, 0)], ['Put your crest', stepAt(s, 1)], ['Or bring', stepAt(s, 2)]]; },
    '15': () => [['', centre($('#demo'))]],
    '16': () => [['', centre($('#film'))]],
  };
  const GLIDE = 1.2; // seconds to glide from one stop to the next
  const LEAD = 0.5; // a scene starts moving this long before its phrase, so it lands on the words
  const GAP = 0.7; // seconds of quiet between pages

  // ---- The script: "## NN · Title (about X s)" blocks; [tags] are for the voice, not the captions.
  // Each caption line gets a share of the clip in proportion to how long it takes to say: its
  // letters, plus a beat for each ellipsis and each full stop.
  const weight = (s) => s.length + 10 * (s.match(/…/g) || []).length + 6;
  async function loadScript() {
    const md = await (await fetch('/proto/pitch/script.md?v=2')).text();
    const pages = [];
    md.split(/^## /m).slice(1).forEach((block) => {
      const m = block.match(/^(\d\d) · (.+?) \(about (\d+) s\)\s*\n([\s\S]*)$/);
      if (!m || !PLACES[m[1]]) return;
      const text = m[4].replace(/\[[^\]]+\]\s*/g, '').replace(/\s+/g, ' ').trim();
      const lines = text.split(/(?<=[.?!])\s+/).filter(Boolean);
      const total = lines.reduce((s, l) => s + weight(l), 0); let acc = 0;
      // u: where a line starts, as a share of the clip (0..1).
      const cues = lines.map((l) => { const c = { text: l, u: acc / total }; acc += weight(l); return c; });
      // A phrase inside a line starts that share of the way through it.
      const at = (phrase) => {
        const i = cues.findIndex((c) => c.text.includes(phrase)); if (!phrase || i < 0) return 0;
        const c = cues[i]; const end = i + 1 < cues.length ? cues[i + 1].u : 1;
        return c.u + (end - c.u) * (c.text.indexOf(phrase) / c.text.length);
      };
      pages.push({ n: m[1], title: m[2], est: Number(m[3]), cues, at });
    });
    return pages;
  }

  // ---- UI
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'deck-nav-btn pitch-open';
  btn.innerHTML = '<span class="pitch-open__dot" aria-hidden="true"></span>Pitch';
  btn.setAttribute('aria-label', 'Play the pitch: the deck scrolls itself with a voice');
  const ui = document.createElement('div'); ui.className = 'pitch'; ui.hidden = true;
  ui.innerHTML = '<div class="pitch__band"><p class="pitch__cap" aria-live="polite"></p></div>'
    + '<div class="pitch__bar"><button class="pitch__b pitch__toggle" type="button" aria-label="Pause"><i></i></button>'
    + '<button class="pitch__b pitch__prev" type="button" aria-label="Previous page">&#8249;</button>'
    + '<button class="pitch__b pitch__next" type="button" aria-label="Next page">&#8250;</button>'
    + '<span class="pitch__where"><b></b><span></span></span>'
    + '<button class="pitch__b pitch__close" type="button" aria-label="End the pitch (Esc)">&times;</button></div>'
    + '<span class="pitch__prog"><i></i></span>'
    + '<div class="pitch__card pitch__intro"><button class="pitch__play" type="button" aria-label="Play the pitch"><i></i></button>'
    + '<p class="pitch__h">Watch the SportIn pitch</p><p class="pitch__sub"><span class="pitch__len"></span> · Sound on</p></div>'
    + '<div class="pitch__card pitch__end"><p class="pitch__h">Let&rsquo;s plan your pilot.</p><div class="pitch__acts">'
    + '<button class="pitch__btn pitch__replay" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5"/></svg>Replay</button>'
    + '<a class="pitch__btn pitch__btn--go" href="https://calendly.com/sportin" target="_blank" rel="noopener">Plan your pilot <span aria-hidden="true">→</span></a></div></div>'
    + '<button class="pitch__b pitch__x" type="button" aria-label="Close the pitch (Esc)">&times;</button>';
  document.body.appendChild(ui);
  const cap = ui.querySelector('.pitch__cap'); const where = ui.querySelector('.pitch__where'); const prog = ui.querySelector('.pitch__prog i');
  const placeBtn = () => { const present = document.querySelector('#nav .deck-nav-btn:not(.pitch-open)'); const t = present || document.getElementById('themeToggle'); if (t) t.after(btn); };
  const show = (state) => { ui.dataset.state = state; }; // intro, play, end

  // The control bar steps aside while the pitch plays; moving the pointer or a key brings it back.
  let idle = 0;
  const wake = () => { ui.classList.add('is-awake'); clearTimeout(idle); idle = setTimeout(() => { if (playing) ui.classList.remove('is-awake'); }, 2200); };

  // ---- Playback
  let pages = []; let k = 0; let playing = false; let on = false;
  let audio = null; let hasAudio = false; let dur = 0; let clock = 0; let last = 0; let raf = 0;
  let stops = []; let from = 0; let ending = 0; let back = null; // back: glide back from a hand scroll
  const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
  const clamp = (v) => Math.max(0, Math.min(1, v));

  function loadPage(i) {
    k = i; const pg = pages[k];
    if (audio) { audio.pause(); audio.src = ''; }
    audio = new Audio(`/proto/pitch/audio/${pg.n}.mp3`); audio.preload = 'auto';
    hasAudio = false; dur = pg.est; clock = 0; ending = 0; back = null;
    audio.addEventListener('loadedmetadata', () => { if (pages[k] === pg && audio.duration) { hasAudio = true; dur = audio.duration; if (playing) audio.play().catch(() => { hasAudio = false; }); } }, { once: true });
    audio.addEventListener('error', () => { hasAudio = false; }, { once: true });
    from = window.scrollY; stops = PLACES[pg.n]().map(([phrase, y]) => ({ u: pg.at(phrase), y }));
    where.querySelector('b').textContent = `${pg.n} / ${String(pages.length).padStart(2, '0')}`;
    where.querySelector('span').textContent = pg.title;
    if (playing) audio.play().catch(() => {});
  }

  function paint() {
    const pg = pages[k]; if (!pg) return;
    // Scroll: glide from the last stop to the one whose phrase is due (the first one at once).
    let i = 0; stops.forEach((s, j) => { if (j && clock >= s.u * dur - LEAD) i = j; });
    const s = stops[i]; const prev = i ? stops[i - 1].y : from; const t0 = i ? s.u * dur - LEAD : 0;
    let y = prev + (s.y - prev) * (RM ? 1 : ease(clamp((clock - t0) / GLIDE)));
    if (back) { const b = RM ? 1 : ease(clamp((clock - back.at) / GLIDE)); y = back.y + (y - back.y) * b; if (b >= 1) back = null; }
    if (playing || !back) window.scrollTo(0, Math.round(y)); // paused by hand: the scroll is the viewer's
    // Captions: the line whose share of the clip has begun.
    const u = clamp(clock / dur); let c = pg.cues[0]; pg.cues.forEach((q) => { if (u >= q.u) c = q; });
    if (cap.textContent !== c.text) { cap.textContent = c.text; cap.classList.remove('is-in'); void cap.offsetWidth; cap.classList.add('is-in'); }
    prog.style.setProperty('--p', ((k + u) / pages.length).toFixed(4));
  }

  function frame(now) {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    if (playing) {
      clock = hasAudio && !audio.paused ? audio.currentTime : clock + dt;
      if (clock >= dur) { ending += dt; clock = dur; if (ending >= GAP) { if (k < pages.length - 1) loadPage(k + 1); else finish(); } }
    }
    if (on && ui.dataset.state === 'play') paint();
    raf = requestAnimationFrame(frame);
  }

  function setPlaying(p) {
    playing = p; ui.classList.toggle('is-paused', !p);
    ui.querySelector('.pitch__toggle').setAttribute('aria-label', p ? 'Pause' : 'Play');
    if (p) wake(); else ui.classList.add('is-awake');
    if (p && back) back = { y: window.scrollY, at: clock };
    if (!audio) return;
    if (p && hasAudio && clock < dur) { audio.currentTime = clock; audio.play().catch(() => { hasAudio = false; }); } else audio.pause();
  }

  // The intro sits over the hero until Play; the end card holds the last page.
  const fmt = (s) => `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, '0')} s`;
  async function open() {
    if (on) return; on = true;
    if (!pages.length) pages = await loadScript();
    if (!pages.length) { on = false; return; }
    root.classList.add('is-pitch'); ui.hidden = false; last = 0;
    if (root.requestFullscreen && !document.fullscreenElement && navigator.userActivation?.isActive) root.requestFullscreen().catch(() => {});
    ui.querySelector('.pitch__len').textContent = fmt(pages.reduce((s, p) => s + p.est + GAP, 0));
    show('intro'); playing = false; cap.textContent = '';
    window.scrollTo(0, 0);
    raf = requestAnimationFrame(frame);
    ui.querySelector('.pitch__play').focus({ preventScroll: true });
  }
  function play() {
    if (root.requestFullscreen && !document.fullscreenElement) root.requestFullscreen().catch(() => {});
    show('play'); loadPage(0); setPlaying(true);
  }
  function finish() {
    setPlaying(false); if (audio) audio.pause(); show('end');
    ui.querySelector('.pitch__replay').focus({ preventScroll: true });
  }
  function stop() {
    if (!on) return; on = false; playing = false;
    cancelAnimationFrame(raf); if (audio) audio.pause();
    root.classList.remove('is-pitch'); ui.hidden = true; delete ui.dataset.state;
    if (location.hash === '#pitch') history.replaceState(null, '', location.pathname + location.search);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  const go = (d) => { const i = Math.max(0, Math.min(pages.length - 1, k + d)); if (i !== k) loadPage(i); wake(); };

  btn.addEventListener('click', open);
  ui.querySelector('.pitch__play').addEventListener('click', play);
  ui.querySelector('.pitch__replay').addEventListener('click', play);
  ui.querySelector('.pitch__toggle').addEventListener('click', () => setPlaying(!playing));
  ui.querySelector('.pitch__prev').addEventListener('click', () => go(-1));
  ui.querySelector('.pitch__next').addEventListener('click', () => go(1));
  ui.querySelector('.pitch__close').addEventListener('click', stop);
  ui.querySelector('.pitch__x').addEventListener('click', stop);
  window.addEventListener('keydown', (e) => {
    if (!on) return;
    const state = ui.dataset.state;
    if (e.key === 'Escape') { e.preventDefault(); stop(); return; }
    if (state !== 'play') { if (e.key === ' ' && state === 'intro') { e.preventDefault(); play(); } return; } // Enter clicks the focused button
    wake();
    if (e.key === ' ') { e.preventDefault(); setPlaying(!playing); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
  }, true); // capture: the deck's own arrow keys stay out of it while the pitch runs
  window.addEventListener('pointermove', () => { if (on && ui.dataset.state === 'play') wake(); }, { passive: true });
  // Taking the scroll by hand pauses the pitch; Play picks up from the page it was on.
  ['wheel', 'touchmove'].forEach((ev) => window.addEventListener(ev, () => { if (on && playing) setPlaying(false); if (on) back = { y: window.scrollY, at: clock }; }, { passive: true }));
  document.addEventListener('fullscreenchange', () => { if (on && !document.fullscreenElement && root.requestFullscreen && ui.dataset.state === 'play') stop(); });

  // The deck adds its Present button on load; sit right after it. A #pitch link opens the intro.
  const ready = () => { placeBtn(); if (location.hash === '#pitch') open(); };
  if (document.readyState === 'complete') ready(); else window.addEventListener('load', ready);
  window.addEventListener('hashchange', () => { if (location.hash === '#pitch') open(); });
  window.pitch = { open, play, stop, go: (i) => { if (ui.dataset.state !== 'play') { show('play'); setPlaying(true); } loadPage(i); }, finish, seek: (s) => { clock = s; if (hasAudio) audio.currentTime = s; }, get cue() { return { page: pages[k].n, clock, dur, stops }; } }; // debugging
})();
