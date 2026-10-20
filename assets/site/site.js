// SportIn homepage motion: scroll reveal, the Why/How/What track,
// the scroll-read sentence and the live game demos.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const fmt = (n) => Math.round(n).toLocaleString('en-US');

  $('#year').textContent = new Date().getFullYear();

  // ---------- Scroll reveal ----------
  // Elements with data-reveal get .is-in once they enter the viewport.
  // Anything that also listens for 'reveal' starts its own motion then.
  const revealIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      e.target.dispatchEvent(new CustomEvent('reveal'));
      revealIO.unobserve(e.target);
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  $$('[data-reveal], #sentenceChips, .steps__line').forEach((el) => revealIO.observe(el));

  // ---------- Nav ----------
  const nav = $('#nav');
  const toggle = $('#navToggle');
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  $$('.nav__link').forEach((a) => a.addEventListener('click', () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }));

  // Highlight the nav link for the section in view. Revenue and impact share one link.
  const navFor = { what: 'what', ecosystem: 'what', revenue: 'revenue', impact: 'revenue', games: 'games', 'how-it-works': 'how-it-works', technology: 'how-it-works', who: 'who', stories: 'stories' };
  const links = new Map($$('.nav__link').map((a) => [a.getAttribute('href').slice(1), a]));
  const spyIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const key = navFor[e.target.id];
      links.forEach((a, id) => a.classList.toggle('is-active', id === key));
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  Object.keys(navFor).forEach((id) => { const s = document.getElementById(id); if (s) spyIO.observe(s); });

  // ---------- Hero pulse ----------
  $$('.pulse__quiet, .pulse__alive').forEach((p) => p.style.setProperty('--len', Math.ceil(p.getTotalLength())));

  // ---------- Scroll-linked scenes ----------
  const track = $('#track');
  const panels = $$('.belief__panel');
  const lanes = $$('.track__lane', track);
  const progress = $$('.track__progress', track);
  const labels = $$('.track__label', track);
  const runner = $('#trackRunner');
  const core = $('#trackCore');
  const laneLen = progress.map((p) => p.getTotalLength());
  progress.forEach((p, i) => { p.style.strokeDasharray = laneLen[i]; p.style.strokeDashoffset = laneLen[i]; });
  const STEP_NAMES = ['Why', 'How', 'What'];
  let lastStep = -1;

  function byLane(list, lane) { return list.find((el) => Number(el.dataset.lane) === lane); }

  function updateTrack() {
    const mid = window.innerHeight * 0.55;
    let step = 0;
    let t = 0;
    panels.forEach((panel, i) => {
      const r = panel.getBoundingClientRect();
      if (r.top <= mid) { step = i; t = clamp((mid - r.top) / r.height, 0, 1); }
    });
    if (panels[0].getBoundingClientRect().top > mid) t = 0;

    [0, 1, 2].forEach((lane) => {
      const prog = byLane(progress, lane);
      const done = lane < step;
      const active = lane === step;
      const len = laneLen[progress.indexOf(prog)];
      prog.classList.toggle('is-done', done);
      prog.classList.toggle('is-active', active);
      prog.style.strokeDashoffset = done ? 0 : active ? len * (1 - t) : len;
      byLane(lanes, lane).classList.toggle('is-active', active);
      byLane(labels, lane).classList.toggle('is-active', active);
    });

    const path = byLane(progress, step);
    const pt = path.getPointAtLength(laneLen[progress.indexOf(path)] * t);
    runner.setAttribute('cx', pt.x);
    runner.setAttribute('cy', pt.y);
    if (step !== lastStep) { core.textContent = STEP_NAMES[step]; lastStep = step; }
  }

  const sentenceSec = $('#what');
  const sentence = $('#sentence');
  // Split the sentence into word spans, keeping key phrases marked.
  const words = [];
  (function splitWords() {
    const frag = document.createDocumentFragment();
    sentence.childNodes.forEach((node) => {
      const isKey = node.nodeType === 1 && node.hasAttribute('data-key');
      node.textContent.split(/\s+/).filter(Boolean).forEach((w) => {
        const s = document.createElement('span');
        s.className = 'sentence__w' + (isKey ? ' sentence__w--key' : '');
        s.textContent = w;
        frag.append(s, ' ');
        words.push(s);
      });
    });
    sentence.textContent = '';
    sentence.append(frag);
  })();

  function updateSentence() {
    const r = sentenceSec.getBoundingClientRect();
    const span = r.height - window.innerHeight;
    const t = clamp(-r.top / (span * 0.8), 0, 1);
    const lit = Math.round(t * words.length);
    words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
  }

  function onScroll() {
    nav.classList.toggle('is-scrolled', window.scrollY > 8);
    if (reduced) return;
    updateTrack();
    updateSentence();
  }
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  if (reduced) words.forEach((w) => w.classList.add('is-lit'));
  onScroll();

  // ---------- Live demos ----------
  // Each demo runs only while its card is on screen.
  function whileVisible(el, start, stop) {
    if (!el) return;
    if (reduced) { start(true); return; }
    new IntersectionObserver(([e]) => (e.isIntersecting ? start(false) : stop()), { threshold: 0.2 }).observe(el);
  }
  function loop(fn, ms) {
    let id = null;
    return { start: () => { if (!id) id = setInterval(fn, ms); }, stop: () => { clearInterval(id); id = null; } };
  }

  // League of Brands: kilometres tick up; every 15 km lead becomes a goal.
  (function lob() {
    const card = $('[data-game="lob"]');
    const km = { home: 412.6, away: 398.1 };
    const goals = { home: 2, away: 1 };
    const banked = { home: 412.6, away: 398.1 };
    let day = 4;
    const tick = loop(() => {
      ['home', 'away'].forEach((side) => {
        km[side] += rand(0.2, 1.6);
        $(`[data-km="${side}"]`, card).textContent = km[side].toFixed(1) + ' km';
        if (km[side] - banked[side] >= 15) {
          banked[side] = km[side];
          goals[side] += 1;
          const g = $(`[data-goals="${side}"]`, card);
          g.textContent = goals[side];
          g.classList.remove('is-bump');
          void g.offsetWidth;
          g.classList.add('is-bump');
        }
      });
      if (Math.random() < 0.06) { day = day >= 7 ? 1 : day + 1; $('[data-clock]', card).textContent = `Day ${day} of 7`; }
    }, 700);
    whileVisible(card, (still) => !still && tick.start(), tick.stop);
  })();

  // Game of Run: hexes get claimed by Houses.
  (function gor() {
    const svg = $('#hexmap');
    const R = 22;
    const W = Math.sqrt(3) * R;
    const hexes = [];
    const pts = (cx, cy) => [0, 1, 2, 3, 4, 5].map((k) => {
      const a = (Math.PI / 180) * (60 * k - 30);
      return `${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)}`;
    }).join(' ');
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 7; col++) {
        const cx = 22 + col * W + (row % 2 ? W / 2 : 0);
        const cy = 24 + row * R * 1.5;
        if (cx > 290) continue;
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        p.setAttribute('points', pts(cx, cy));
        p.setAttribute('class', 'hex');
        svg.appendChild(p);
        hexes.push(p);
      }
    }
    const houses = ['hex--blue', 'hex--tartan', 'hex--ink'];
    const claim = (p, h) => { p.setAttribute('class', `hex ${h}`); };
    hexes.forEach((p) => { if (Math.random() < 0.45) claim(p, houses[Math.floor(Math.random() * 3)]); });
    const tick = loop(() => {
      for (let i = 0; i < 2; i++) claim(hexes[Math.floor(Math.random() * hexes.length)], houses[Math.floor(Math.random() * 3)]);
    }, 650);
    whileVisible(svg, (still) => !still && tick.start(), tick.stop);
  })();

  // Live race: runners move toward the finish; the leader turns blue.
  (function race() {
    const runners = $$('.race__runner');
    let pos = runners.map(() => rand(6, 14));
    const tick = loop(() => {
      if (Math.max(...pos) >= 92) pos = runners.map(() => rand(4, 10));
      else pos = pos.map((p) => Math.min(92, p + rand(1.5, 6)));
      const lead = pos.indexOf(Math.max(...pos));
      runners.forEach((r, i) => { r.style.left = `${pos[i]}%`; r.classList.toggle('is-lead', i === lead); });
    }, 900);
    runners.forEach((r, i) => { r.style.left = `${pos[i]}%`; });
    whileVisible($('#race'), (still) => !still && tick.start(), tick.stop);
  })();

  // Challenge ring: fills to today's steps once.
  (function challenge() {
    const fg = $('#ringFg');
    const num = $('#ringNum');
    const card = $('[data-game="challenge"]');
    const target = 7412;
    let done = false;
    whileVisible(card, () => {
      if (done) return;
      done = true;
      fg.style.strokeDashoffset = String(402 * (1 - target / 10000));
      countUp(num, target, 2000);
    }, () => {});
  })();

  // Season leaderboard: rows overtake each other.
  (function season() {
    const board = $('#board');
    const ROW = 54;
    const teams = [
      { name: 'Harbour Walkers', km: 1824 },
      { name: 'Old Town Runners', km: 1790 },
      { name: 'Riverside Runners', km: 1752 },
      { name: 'Northside Movers', km: 1711 },
      { name: 'Hill Street Club', km: 1668 },
    ];
    teams.forEach((t) => {
      t.el = document.createElement('div');
      t.el.className = 'board__row';
      t.el.innerHTML = '<span class="board__pos"></span><span class="board__name"></span><span class="board__km"></span>';
      t.el.children[1].textContent = t.name;
      board.appendChild(t.el);
    });
    board.style.height = `${teams.length * ROW - 6}px`;
    function render() {
      const order = [...teams].sort((a, b) => b.km - a.km);
      order.forEach((t, i) => {
        const prev = t.rank;
        t.rank = i;
        t.el.style.transform = `translateY(${i * ROW}px)`;
        t.el.children[0].textContent = i + 1;
        t.el.children[2].textContent = `${fmt(t.km)} km`;
        t.el.classList.toggle('is-up', prev !== undefined && i < prev);
      });
    }
    render();
    const tick = loop(() => {
      teams.forEach((t) => { t.km += rand(2, 14); });
      teams[Math.floor(Math.random() * teams.length)].km += rand(20, 46);
      render();
    }, 1800);
    whileVisible(board, (still) => !still && tick.start(), tick.stop);
  })();

  // ---------- Impact report counters ----------
  function countUp(el, to, ms, suffix = '') {
    if (reduced) { el.textContent = fmt(to) + suffix; return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = clamp((now - t0) / ms, 0, 1);
      el.textContent = fmt(to * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  $('#report').addEventListener('reveal', () => {
    $$('[data-count]').forEach((el) => countUp(el, Number(el.dataset.count), 1800, el.dataset.suffix || ''));
  });

  // ---------- Technology ----------
  // Waveform bars for the audio cards.
  $$('.wave').forEach((w) => {
    for (let i = 0; i < 28; i++) {
      const bar = document.createElement('i');
      bar.style.setProperty('--h', `${Math.round(18 + Math.abs(Math.sin(i * 0.7)) * 62 + rand(0, 10))}%`);
      bar.style.setProperty('--d', `${(i * 0.045).toFixed(2)}s`);
      w.appendChild(bar);
    }
  });

  let audio = null;
  let playing = null;
  function stopAudio() {
    if (!playing) return;
    audio.pause();
    playing.classList.remove('is-playing');
    playing.closest('.tech__card').classList.remove('is-playing-card');
    playing = null;
  }
  $$('.play').forEach((btn) => btn.addEventListener('click', () => {
    if (playing === btn) { stopAudio(); return; }
    stopAudio();
    audio = new Audio(btn.dataset.audio);
    audio.addEventListener('ended', stopAudio);
    audio.play().catch(stopAudio);
    playing = btn;
    btn.classList.add('is-playing');
    btn.closest('.tech__card').classList.add('is-playing-card');
  }));

  // Live motion tracking: a dot runs the route; distance counts with it.
  (function gps() {
    const path = $('#gpsPath');
    const dot = $('#gpsDot');
    const pace = $('#gpsPace');
    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    let t = 0;
    let raf = null;
    const frame = () => {
      t = (t + 0.0025) % 1.15;
      const p = Math.min(t, 1);
      const pt = path.getPointAtLength(len * p);
      path.style.strokeDashoffset = len * (1 - p);
      dot.setAttribute('cx', pt.x);
      dot.setAttribute('cy', pt.y);
      pace.textContent = `Pace 5:12 /km · ${(p * 2.4).toFixed(2)} km`;
      raf = requestAnimationFrame(frame);
    };
    whileVisible($('#gps'), (still) => {
      if (still) { path.style.strokeDashoffset = 0; dot.setAttribute('cx', 266); dot.setAttribute('cy', 20); pace.textContent = 'Pace 5:12 /km · 2.40 km'; return; }
      if (!raf) raf = requestAnimationFrame(frame);
    }, () => { cancelAnimationFrame(raf); raf = null; });
  })();
})();
