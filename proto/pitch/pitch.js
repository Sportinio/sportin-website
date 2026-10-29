// Pitch mode: the deck plays itself. A Pitch button in the menu goes full screen and, page by
// page, scrolls the deck while a voice tells the pitch (proto/pitch/audio/NN.mp3) and captions show
// the words. The words come from proto/pitch/script.md, the one source for the script; a page with
// no clip runs on the script's estimate. No controls on screen: Esc ends the pitch; Space pauses and
// the arrow keys skip, for whoever presents; scrolling by hand pauses.
// The scroll follows the words: each paragraph (or sentence) of a page has its own resting place,
// so the engine (04), the problem (02) and delivery (14) hold on the step being spoken and glide to
// the next one only when the voice moves on. Each frame is painted from the page's clock.
(() => {
  const root = document.documentElement;
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s) => document.querySelector(s);
  const topOf = (el) => el.getBoundingClientRect().top + window.scrollY;
  const centre = (el) => topOf(el) + el.offsetHeight / 2 - window.innerHeight / 2;
  const stepAt = (el, k) => topOf(el) + (k / (Number(el.dataset.steps) + 0.6)) * (el.offsetHeight - window.innerHeight);
  const seg = () => Math.max(360, window.innerHeight * 0.7); // the problem's stage height (problem-scroll.js)

  // Where each page rests. { to } holds one place for the whole page. { para: [...] } gives one
  // place per paragraph of the script, { sent: [...] } one per sentence (the last value repeats).
  const PLACES = {
    '01': () => ({ to: 0 }),
    // 02: the reached fans, the drop to fans you know, then all four stages as the line lands.
    '02': () => { const p = topOf($('#problemPin')); return { para: [0, 1.4, 3].map((k) => p + k * seg() + 2) }; },
    '03': () => { const e = $('.jelly-end'); return { to: e ? topOf(e) : centre($('#evidence')) }; },
    // 04, in the order the voice tells it: intro, competition, challenges, leaderboards, rewards,
    // then the connections (the integration steps start at the scene's data-int-from).
    '04': () => { const s = $('#engine'); const i = Number(s.dataset.intFrom || 6); return { para: [0.2, 1, 2, 3, 4, i + 1.6].map((k) => stepAt(s, k)) }; },
    '05': () => ({ to: centre($('#formats')) }),
    '06': () => ({ to: stepAt($('#features'), 0) }),
    '07': () => ({ to: stepAt($('#features'), 1) }),
    '08': () => ({ to: stepAt($('#features'), 2) }),
    '09': () => ({ to: centre($('#ugc')) }),
    '10': () => ({ to: centre($('#technology')) }),
    '11': () => ({ to: centre($('#season')) }),
    '12': () => ({ to: centre($('#pay')) }),
    '13': () => ({ to: centre($('#fandata')) }),
    // 14: "Launch it your way. In the SportIn app. With your crest on top. Or inside your own app…"
    '14': () => { const s = $('#delivery'); return { sent: [0, 0, 1, 2].map((k) => stepAt(s, k)) }; },
    '15': () => ({ to: centre($('#demo')) }),
    '16': () => ({ to: centre($('#film')) }),
  };

  // ---- The script: "## NN · Title (about X s)" blocks; [tags] are for the voice, not the captions.
  async function loadScript() {
    const md = await (await fetch('/proto/pitch/script.md?v=4')).text();
    const pages = [];
    md.split(/^## /m).slice(1).forEach((block) => {
      const m = block.match(/^(\d\d) · (.+?) \(about (\d+) s\)\s*\n([\s\S]*)$/);
      if (!m || !PLACES[m[1]]) return;
      const lines = []; const paraOf = [];
      m[4].split(/\n\s*\n/).map((p) => p.replace(/\[[^\]]+\]\s*/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean).forEach((p, pi) => {
        p.split(/(?<=[.?!])\s+/).filter(Boolean).forEach((l) => { lines.push(l); paraOf.push(pi); });
      });
      pages.push({ n: m[1], title: m[2], est: Number(m[3]), lines, paraOf });
    });
    return pages;
  }

  // ---- UI: a Pitch button in the menu; on screen only the captions and, at first, an Esc hint.
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'deck-nav-btn pitch-open';
  btn.innerHTML = '<span class="pitch-open__dot" aria-hidden="true"></span>Pitch';
  btn.setAttribute('aria-label', 'Play the pitch: the deck scrolls itself with a voice. Esc ends it.');
  const ui = document.createElement('div'); ui.className = 'pitch'; ui.hidden = true;
  ui.innerHTML = '<p class="pitch__cap" aria-live="polite"></p><p class="pitch__hint">Press <kbd>Esc</kbd> to exit</p>';
  document.body.appendChild(ui);
  const cap = ui.querySelector('.pitch__cap'); const hint = ui.querySelector('.pitch__hint');
  const placeBtn = () => { const present = document.querySelector('#nav .deck-nav-btn:not(.pitch-open)'); const t = present || document.getElementById('themeToggle'); if (t) t.after(btn); };

  // ---- Playback
  let pages = []; let k = 0; let playing = false; let on = false;
  let audio = null; let hasAudio = false; let dur = 0; let clock = 0; let last = 0; let raf = 0;
  let place = null; let ending = 0;
  let glideFrom = 0; let glideTo = 0; let glideAt = 0; // the current glide: from, to, and its start on the clock
  const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const GAP = 0.7; // seconds of quiet between pages
  const GLIDE = 1.1; // seconds to glide from one resting place to the next

  function loadPage(i) {
    k = i; const pg = pages[k];
    if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
    audio = new Audio(`/proto/pitch/audio/${pg.n}.mp3?v=1`); audio.preload = 'auto';
    hasAudio = false; dur = pg.est; clock = 0; ending = 0;
    place = PLACES[pg.n]();
    glideFrom = window.scrollY; glideTo = targetFor(0); glideAt = 0;
    if (playing) audio.play().catch(() => {});
  }

  // The sentence being spoken: each holds for a share of the clip in proportion to its length.
  function lineAt(pg, c) {
    const total = pg.lines.reduce((s, l) => s + l.length, 0); const at = clamp(c / dur) * total; let acc = 0;
    for (let i = 0; i < pg.lines.length; i++) { acc += pg.lines[i].length; if (acc >= at) return i; }
    return pg.lines.length - 1;
  }
  function targetFor(i) {
    const pg = pages[k];
    if (place.to != null) return place.to;
    if (place.para) return place.para[Math.min(place.para.length - 1, pg.paraOf[i] || 0)];
    return place.sent[Math.min(place.sent.length - 1, i)];
  }

  function paint() {
    const pg = pages[k]; if (!pg) return;
    const i = lineAt(pg, clock);
    const tgt = targetFor(i);
    if (tgt !== glideTo) { glideFrom = window.scrollY; glideTo = tgt; glideAt = clock; } // the voice moved on
    const u = RM ? 1 : ease(clamp((clock - glideAt) / GLIDE));
    window.scrollTo(0, Math.round(glideFrom + (glideTo - glideFrom) * u));
    if (cap.textContent !== pg.lines[i]) cap.textContent = pg.lines[i];
  }

  function frame(now) {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    if (playing) {
      // Follow the clip as soon as its length is known (read every frame: a load event can be missed).
      if (!hasAudio && audio && Number.isFinite(audio.duration) && audio.duration > 0) { hasAudio = true; dur = audio.duration; }
      clock = hasAudio ? (audio.ended ? dur : audio.paused ? clock : audio.currentTime) : clock + dt;
      if (clock >= dur) {
        ending += dt; clock = dur;
        if (ending >= GAP) { if (k < pages.length - 1) loadPage(k + 1); else finish(); }
      }
    }
    if (!done) paint();
    raf = requestAnimationFrame(frame);
  }

  // After the last page: a thank-you, then the pitch closes by itself and leaves the reader on the film.
  let done = false;
  function finish() {
    setPlaying(false); done = true; cap.textContent = 'Thanks for watching.';
    setTimeout(stop, 2500);
  }

  function setPlaying(p) {
    playing = p; ui.classList.toggle('is-paused', !p);
    if (!audio) return;
    if (p && hasAudio && clock < dur) { audio.currentTime = clock; audio.play().catch(() => {}); } else if (p) audio.play().catch(() => {}); else audio.pause();
  }

  async function start() {
    if (on) return; on = true;
    if (!pages.length) pages = await loadScript();
    if (!pages.length) { on = false; return; }
    root.classList.add('is-pitch'); ui.hidden = false; last = 0; done = false;
    if (root.requestFullscreen && !document.fullscreenElement) root.requestFullscreen().catch(() => {});
    playing = true; loadPage(0); ui.classList.remove('is-paused');
    hint.classList.remove('is-gone'); clearTimeout(hint.t); hint.t = setTimeout(() => hint.classList.add('is-gone'), 3000);
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
  window.addEventListener('keydown', (e) => {
    if (!on) return;
    if (e.key === 'Escape') { e.preventDefault(); stop(); }
    else if (e.key === ' ') { e.preventDefault(); setPlaying(!playing); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
  }, true); // capture: the deck's own arrow keys stay out of it while the pitch runs
  // Taking the scroll by hand pauses the pitch; Space picks up on the page it was on.
  ['wheel', 'touchmove'].forEach((ev) => window.addEventListener(ev, () => { if (on && playing) setPlaying(false); }, { passive: true }));
  // Leaving full screen (the browser's own Esc) ends the pitch too.
  document.addEventListener('fullscreenchange', () => { if (on && !document.fullscreenElement && root.requestFullscreen) stop(); });

  // The deck adds its Present button on load; sit right after it.
  if (document.readyState === 'complete') placeBtn(); else window.addEventListener('load', placeBtn);
  window.pitch = { start, stop, go: (i) => loadPage(i), state: () => ({ page: pages[k] && pages[k].n, clock, dur, hasAudio, line: cap.textContent }) }; // debugging
})();
