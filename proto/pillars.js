// Pillar mockups: A's tab stage, B's reveal, C's streak. Demo data, fictional names.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Streak: Day 11 becomes Day 12 as the days fill one by one.
  async function playStreak(card) {
    if (!card) return;
    const days = [...card.querySelectorAll('.day')];
    const n = card.querySelector('[data-streak-n]');
    days.forEach((d) => d.classList.remove('is-on', 'is-new'));
    n.textContent = 'Day 11';
    if (reduced) { days.forEach((d) => d.classList.add('is-on')); n.textContent = 'Day 12'; return; }
    for (let i = 0; i < days.length; i++) {
      await wait(280);
      days[i].classList.add('is-on');
      if (i === days.length - 1) { days[i].classList.add('is-new'); n.textContent = 'Day 12'; setTimeout(() => days[i].classList.remove('is-new'), 320); }
    }
  }

  // Season table: rows spring to their new places when someone overtakes.
  function layoutLeague(list) {
    const rows = [...list.querySelectorAll('.lb-row')].sort((a, b) => b.dataset.km - a.dataset.km);
    rows.forEach((r, i) => {
      const was = Number(r.dataset.rank ?? i);
      r.dataset.rank = i;
      r.style.transform = `translateY(${i * 60}px)`;
      r.querySelector('.lb-pos').textContent = i + 1;
      r.querySelector('.lb-val').textContent = `${r.dataset.km} km`;
      r.classList.toggle('is-up', i < was);
    });
    list.style.height = `${rows.length * 60 - 8}px`;
  }
  async function playLeague(list) {
    if (!list) return;
    const rows = [...list.querySelectorAll('.lb-row')];
    const base = [182, 176, 171, 164];
    rows.forEach((r, i) => { r.dataset.km = base[i]; delete r.dataset.rank; });
    layoutLeague(list);
    if (reduced) return;
    await wait(900);
    rows[2].dataset.km = 179; layoutLeague(list);   // third place passes second
    await wait(1500);
    rows[1].dataset.km = 184; layoutLeague(list);   // and second takes the lead
  }

  // Reward: the bar fills, then the label turns to UNLOCKED.
  async function playReward(card) {
    if (!card) return;
    const fill = card.querySelector('[data-reward-fill]');
    const pct = card.querySelector('[data-reward-pct]');
    const label = card.querySelector('[data-reward-label]');
    card.classList.remove('is-unlocked');
    label.textContent = 'NEXT REWARD';
    fill.style.transition = 'none'; fill.style.width = '8%'; pct.textContent = '8%';
    void fill.offsetWidth;
    fill.style.transition = '';
    await wait(reduced ? 0 : 300);
    fill.style.width = '100%';
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / (reduced ? 1 : 1200));
      pct.textContent = `${Math.round(8 + 92 * (1 - Math.pow(1 - p, 4)))}%`;
      if (p < 1) requestAnimationFrame(step); else { label.textContent = 'UNLOCKED'; card.classList.add('is-unlocked'); }
    };
    requestAnimationFrame(step);
  }

  const play = (panel) => {
    if (!panel) return;
    playStreak(panel.querySelector('[data-streak]'));
    playLeague(panel.querySelector('[data-league]'));
    playReward(panel.querySelector('[data-reward]'));
  };

  // ---------- A: product stage with four tabs ----------
  const stage = document.getElementById('stage');
  if (stage) {
    const tabs = [...stage.querySelectorAll('[role="tab"]')];
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    const DURATION = 6000;
    let current = 0;
    let timer = null;
    let paused = false;
    let visible = false;

    const select = (i, focus = false) => {
      current = (i + tabs.length) % tabs.length;
      tabs.forEach((t, k) => {
        const on = k === current;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        panels[k].classList.toggle('is-active', on);
        // Restart the visible timer bar for the newly active tab.
        const bar = t.querySelector('.tab__timer');
        bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
      });
      if (focus) tabs[current].focus();
      play(panels[current]);
      schedule();
    };
    const schedule = () => {
      clearTimeout(timer);
      if (reduced || paused || !visible) return;
      timer = setTimeout(() => select(current + 1), DURATION);
    };
    tabs.forEach((t, i) => t.addEventListener('click', () => select(i)));
    stage.querySelector('[role="tablist"]').addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); select(current + 1, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); select(current - 1, true); }
    });
    // Pause while the visitor is reading or using the stage; the timer bar pauses with it.
    const setPaused = (p) => { paused = p; stage.classList.toggle('is-paused', p); schedule(); };
    stage.addEventListener('pointerenter', () => setPaused(true));
    stage.addEventListener('pointerleave', () => setPaused(false));
    stage.addEventListener('focusin', () => setPaused(true));
    stage.addEventListener('focusout', (e) => { if (!stage.contains(e.relatedTarget)) setPaused(false); });
    new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      stage.classList.toggle('is-paused', !visible || paused);
      if (visible && !was) select(current); else schedule();
    }, { threshold: 0.35 }).observe(stage);
  }

  // ---------- B: the rule draws, the numerals rise ----------
  const pb = document.getElementById('pbHero');
  if (pb) {
    new IntersectionObserver(([e], io) => {
      if (e.isIntersecting) { document.body.classList.add('is-in'); io.disconnect(); }
    }, { threshold: 0.2 }).observe(pb);
  }

  // ---------- C: only the streak moves, on arrival and every 8 seconds ----------
  const tileStreak = document.querySelector('.tile--hero [data-streak]');
  if (tileStreak) {
    let loop = null;
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !loop) { playStreak(tileStreak); if (!reduced) loop = setInterval(() => playStreak(tileStreak), 8000); }
      if (!e.isIntersecting) { clearInterval(loop); loop = null; }
    }, { threshold: 0.4 }).observe(tileStreak);
  }
})();

// Menu bits the mockups share with the homepage: mobile menu, scrolled state, light/dark switch.
(() => {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');
  if (toggle) toggle.addEventListener('click', () => { const open = nav.classList.toggle('is-open'); toggle.setAttribute('aria-expanded', String(open)); });
  const onScroll = () => nav && nav.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : media.matches);
  const label = () => btn.setAttribute('aria-label', isDark() ? 'Switch to light mode' : 'Switch to dark mode');
  btn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('sportin-theme', next); } catch (e) { /* storage blocked */ }
    label();
  });
  label();
})();
