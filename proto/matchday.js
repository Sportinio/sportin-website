// Matchday live (matchday.html): the app's Matches screen, played with the commentary. The audio's
// clock drives everything (render(t)): each score reaches the number the voice says at the moment
// it says it, the match being called lights up, and the line being said shows under the header.
// Play and pause, stop to reset; scrolling the matchday out of view pauses it.
(() => {
  const root = document.getElementById('matchday'); if (!root) return;
  const audio = root.querySelector('.mdx__audio') || document.querySelector('.mdx__audio');
  const $ = (s) => root.querySelector(s);
  const LINES = window.MATCHDAY_LINES || [];
  const FT = 177.5; // "And that is full time…"

  // ---- Fan-team crests (placeholders until the app's crests): a shield in the team colour, one mark.
  const MARK = {
    eagle: '<path d="M8 18 20 26 32 18 28 30 20 34 12 30Z"/><circle cx="20" cy="15" r="3"/>',
    wolf: '<path d="M12 31V14l5 5 3-2 3 2 5-5v17l-8 6Z"/>',
    alpine: '<path d="M8 33 16 19l5 7 4-5 8 12Z"/><circle cx="27" cy="13" r="3"/>',
    pine: '<path d="M20 10l7 11h-4l6 9H11l6-9h-4Z"/><rect x="19" y="30" width="2" height="5"/>',
    sun: '<path d="M10 28a10 10 0 0 1 20 0Z"/><rect x="8" y="30" width="24" height="2"/><rect x="11" y="34" width="18" height="2"/>',
    wave: '<path d="M8 22c4-6 8-6 12 0s8 6 12 0M8 30c4-6 8-6 12 0s8 6 12 0" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>',
    maple: '<path d="M20 9l3 8 7-2-4 7 5 4-8 1-1 8h-4l-1-8-8-1 5-4-4-7 7 2Z"/>',
    bolt: '<path d="M23 9 13 25h7l-3 12 11-17h-7Z"/>',
    anchor: '<g fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><circle cx="20" cy="12" r="2.6"/><path d="M20 15v19M15 19h10M10 26c0 6 5 8 10 8s10-2 10-8"/></g>',
    clover: '<circle cx="20" cy="15" r="5"/><circle cx="14.5" cy="23" r="5"/><circle cx="25.5" cy="23" r="5"/><path d="M20 26l2 9" stroke="#fff" stroke-width="2.4"/>',
    stag: '<path d="M16 22h8l-2 12h-4Z"/><path d="M16 22l-4-10m1 3-4-2m15 9 4-10m-1 3 4-2" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>',
    summit: '<path d="M7 34 20 12l13 22Z"/>',
  };
  // [name, colour, mark, flag, members, likes by full time]
  const TEAMS = {
    eagles: ['Riverside Eagles', '#1d3b8f', 'eagle', 'ro', 15, 24], wolves: ['Valley Wolves', '#3b4a63', 'wolf', 'ro', 17, 11],
    alpine: ['Alpine United', '#2a3242', 'alpine', 'fr', 9, 18], pinecrest: ['Pinecrest FC', '#1f6b3a', 'pine', 'es', 15, 9],
    sunset: ['Sunset Athletic', '#d9622b', 'sun', 'es', 17, 31], cedar: ['Cedar Town', '#0e6aa8', 'wave', 'fr', 26, 27],
    maple: ['Maple United', '#c8102e', 'maple', 'ca', 11, 3], hill: ['Sporting Hill', '#1f5bd6', 'bolt', 'us', 10, 12],
    harbor: ['Harbour City', '#13254d', 'anchor', 'ro', 10, 36], green: ['Greenfield Town', '#198754', 'clover', 'fr', 13, 14],
    oxford: ['Oxford Rangers', '#b8860b', 'stag', 'us', 10, 2], summit: ['Summit FC', '#24324f', 'summit', 'ro', 15, 8],
  };
  const crest = (id) => { const [, c, m] = TEAMS[id]; return `<svg viewBox="0 0 40 46" aria-hidden="true"><path d="M20 2 37 8v14c0 11-8 19-17 22C11 41 3 33 3 22V8Z" fill="${c}"/><g fill="#fff">${MARK[m]}</g></svg>`; };

  // ---- The six matches, in the app's order, and each score by audio second: [t, home, away].
  // Every value the commentator reads is hit exactly when it is read.
  const MATCHES = [
    { id: 'eagles', a: 'eagles', b: 'wolves', k: [[0, 3.4, 3.2], [14.6, 4.1, 3.8], [64.2, 5.6, 4.7], [FT, 6.8, 6.2]] },
    { id: 'alpine', a: 'alpine', b: 'pinecrest', k: [[0, 4.0, 4.2], [74.8, 4.9, 5.1], [92.8, 5.3, 5.2], [FT, 5.7, 5.6]] },
    { id: 'sunset', a: 'sunset', b: 'cedar', k: [[0, 4.3, 4.4], [35, 5.2, 5.2], [113, 6.8, 6.6], [114.8, 6.9, 6.6], [159.7, 7.3, 7.3], [171.4, 7.3, 7.3], [171.8, 7.3, 7.4], [FT, 7.3, 7.4]] },
    { id: 'maple', a: 'maple', b: 'hill', k: [[0, 0.1, 3.6], [98, 0.2, 4.8], [FT, 0.2, 5.4]] },
    { id: 'harbor', a: 'harbor', b: 'green', k: [[0, 5.2, 4.1], [21.5, 5.9, 4.5], [28.6, 5.9, 4.7], [135.7, 8.1, 7.2], [151.9, 8.6, 7.3], [FT, 8.6, 7.4]] },
    { id: 'oxford', a: 'oxford', b: 'summit', k: [[0, 0.0, 3.2], [48.9, 0.0, 3.9], [FT, 0.0, 5.2]] },
  ];
  // The day's clock, as the commentary tells it: lunchtime, "not even 2 o'clock", the final hours, the evening run.
  const DAY = [[0, 720], [62, 835], [134, 1080], [FT, 1260]];

  const lerp = (k, t) => {
    if (t <= k[0][0]) return k[0].slice(1);
    for (let i = 1; i < k.length; i++) if (t <= k[i][0]) { const u = (t - k[i - 1][0]) / (k[i][0] - k[i - 1][0]); return k[i].slice(1).map((v, j) => k[i - 1][j + 1] + (v - k[i - 1][j + 1]) * u); }
    return k[k.length - 1].slice(1);
  };
  const ICON_P = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="6" cy="5" r="2.5"/><path d="M1.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5M11 2.8a2.5 2.5 0 0 1 0 4.4M12.5 9.8c1.2.6 2 1.9 2 3.4"/></svg>';
  const ICON_H = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M8 14S1.5 10 1.5 5.6A3.1 3.1 0 0 1 8 4a3.1 3.1 0 0 1 6.5 1.6C14.5 10 8 14 8 14Z"/></svg>';
  const team = (id, side) => { const [n, , , f, m] = TEAMS[id]; return `<span class="mdx__t mdx__t--${side}"><b><img src="/proto/media/app/flag_${f}.png" alt="" />${n}</b><small>${ICON_P}<span>${m}</span>${ICON_H}<span class="mdx__lk">0</span></small></span>`; };

  // ---- Team members (made up), shown when a match is opened: [name, avatar, steps at kick-off, steps at full time].
  // The players the commentary calls get their own curve: [name, avatar, [[t, steps], …]], so their
  // steps jump when the voice says they synced a walk.
  const AV = (g, n) => `default_avatar_${g}_${n}`;
  const MEMBERS = {
    eagles: [['Andre Popper', AV('male', 1), [[0, 1800], [58, 3400], [61.6, 12000], [FT, 16400]]], ['Ioana Dumitru', AV('female', 1), 2900, 13100], ['Radu Marin', AV('male', 2), 3600, 11800], ['Bianca Stan', AV('female', 2), 1500, 10400], ['Vlad Petrescu', AV('male', 3), 2200, 9300]],
    wolves: [['Elena Vasile', AV('female', 3), 3900, 14100], ['Cosmin Rusu', AV('male', 2), 2600, 12700], ['Maria Pop', AV('female', 1), 3100, 11200], ['Andrei Nistor', AV('male', 3), 1200, 9800], ['Diana Toma', AV('female', 2), 2400, 8600]],
    alpine: [['Greta Hoffman', AV('female', 2), [[0, 2500], [85, 6200], [92.8, 9800], [FT, 13200]]], ['Lukas Brandt', AV('male', 1), 3300, 11900], ['Léa Martin', AV('female', 3), 2100, 10200], ['Hugo Bernard', AV('male', 3), 2800, 9100], ['Clara Weiss', AV('female', 1), 1400, 7800]],
    pinecrest: [['Pablo Ruiz', AV('male', 2), 3800, 12600], ['Lucía Gómez', AV('female', 1), 2700, 12100], ['Javier Ortega', AV('male', 1), 3000, 10900], ['Carmen Díaz', AV('female', 3), 1900, 9700], ['Diego Navarro', AV('male', 3), 2500, 8400]],
    sunset: [['Lucia Romero', AV('female', 1), [[0, 3000], [118.9, 18000], [FT, 19400]]], ['Mateo Vidal', AV('male', 3), 3400, 13300], ['Sofía Castro', AV('female', 2), 2200, 12400], ['Álvaro Prieto', AV('male', 1), 2900, 11100], ['Inés Molina', AV('female', 3), 1700, 9900]],
    cedar: [['Elodie Mata', AV('female', 3), [[0, 2100], [166, 7900], [171.6, 15800], [FT, 16100]]], ['Théo Laurent', AV('male', 2), 4100, 15200], ['Camille Roux', AV('female', 2), 3300, 13900], ['Louis Moreau', AV('male', 1), 2600, 12800], ['Chloé Girard', AV('female', 1), 2300, 11600]],
    maple: [['Liam Tremblay', AV('male', 3), 0, 1400], ['Emma Gagnon', AV('female', 2), 200, 900], ['Noah Roy', AV('male', 1), 0, 300], ['Olivia Côté', AV('female', 1), 0, 0], ['Ethan Bouchard', AV('male', 2), 0, 0]],
    hill: [['Tom Fletcher', AV('male', 1), 1500, 14300], ['Harry Wells', AV('male', 3), 1400, 14200], ['Ava Turner', AV('female', 3), 2600, 12500], ['Mia Carter', AV('female', 2), 2900, 11400], ['Jack Hughes', AV('male', 2), 1800, 9600]],
    harbor: [['Mihai Ionescu', AV('male', 2), [[0, 4200], [148.5, 20000], [FT, 21300]]], ['Ana Georgescu', AV('female', 1), 4800, 16900], ['Paul Stoica', AV('male', 1), 3900, 15400], ['Irina Lungu', AV('female', 3), 3200, 14100], ['Dan Munteanu', AV('male', 3), 2700, 12900]],
    green: [['Julia Bianchi', AV('female', 2), [[0, 2600], [140.7, 13500], [FT, 15900]]], ['Marco Rossi', AV('male', 1), 3500, 14800], ['Giulia Conti', AV('female', 1), 2400, 13600], ['Luca Ferrari', AV('male', 3), 3100, 12200], ['Sara Ricci', AV('female', 3), 1900, 10800]],
    oxford: [['James Cole', AV('male', 1), 0, 0], ['Emily Ward', AV('female', 2), 0, 0], ['Oliver Grant', AV('male', 3), 0, 0], ['Lucy Brooks', AV('female', 1), 0, 0], ['Henry Shaw', AV('male', 2), 0, 0]],
    summit: [['Alex Radu', AV('male', 3), 3600, 13800], ['Teodora Ilie', AV('female', 3), 2800, 12600], ['Mihnea Popa', AV('male', 1), 2300, 11900], ['Raluca Enache', AV('female', 2), 3100, 10700], ['Sorin Barbu', AV('male', 2), 1600, 9200]],
  };
  const curve = (mem) => (Array.isArray(mem[2]) ? mem[2] : [[0, mem[2]], [FT, mem[3]]]);
  const fmt = (n) => n.toLocaleString('en-US');
  const squad = (id) => `<div class="mdx__tm"><p class="mdx__tmh"><b>${TEAMS[id][0]}</b><span>Top 5 of ${TEAMS[id][4]} &middot; steps today</span></p><ol class="mdx__ml">${MEMBERS[id].map(([n, av]) => `<li><span class="mdx__mr"></span><img src="/proto/media/app/${av}.png" alt="" /><b>${n}</b><span class="mdx__ms">0</span></li>`).join('')}</ol></div>`;

  // ---- Build the rows
  const rowsEl = $('.mdx__rows');
  rowsEl.innerHTML = MATCHES.map((m) => `<li data-m="${m.id}"><div class="mdx__rw" role="button" tabindex="0" aria-expanded="false" aria-label="${TEAMS[m.a][0]} against ${TEAMS[m.b][0]}: show the players"><span class="mdx__st"></span><span class="mdx__m">${team(m.a, 'a')}<span class="mdx__cr">${crest(m.a)}</span><span class="mdx__sc"><b></b><i>-</i><b></b></span><span class="mdx__cr">${crest(m.b)}</span>${team(m.b, 'b')}</span><span class="mdx__chev"></span></div><div class="mdx__x"><div class="mdx__xi">${squad(m.a)}${squad(m.b)}</div></div></li>`).join('');
  const rows = MATCHES.map((m) => {
    const li = root.querySelector(`[data-m="${m.id}"]`); const [sa, sb] = li.querySelectorAll('.mdx__sc b');
    const people = [m.a, m.b].map((id, k) => [...li.querySelectorAll('.mdx__ml')[k].children].map((el, j) => ({ el, mem: MEMBERS[id][j], k: curve(MEMBERS[id][j]), first: MEMBERS[id][j][0].split(' ')[0], rank: el.querySelector('.mdx__mr'), out: el.querySelector('.mdx__ms') })));
    return { m, li, sa, sb, st: li.querySelector('.mdx__st'), lk: li.querySelectorAll('.mdx__lk'), people };
  });
  // One match open at a time; opening it brings it to the top of the list.
  function toggle(r) {
    const open = !r.li.classList.contains('is-open');
    rows.forEach((o) => { o.li.classList.toggle('is-open', open && o === r); o.li.querySelector('.mdx__rw').setAttribute('aria-expanded', String(open && o === r)); });
    if (open && rowsEl.scrollHeight > rowsEl.clientHeight + 1) rowsEl.scrollTo({ top: r.li.offsetTop - rowsEl.offsetTop, behavior: 'smooth' });
    render(at(), started);
  }
  rows.forEach((r) => { const rw = r.li.querySelector('.mdx__rw'); rw.addEventListener('click', () => toggle(r)); rw.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(r); } }); });
  const line = $('.mdx__line'); const prog = $('.mdx__prog i'); const timeEl = $('.mdx__time');
  const playBtn = $('.mdx__play'); const stopBtn = $('.mdx__stop');

  const setText = (el, v, tick) => { if (el.textContent === v) return; const had = el.textContent !== ''; el.textContent = v; if (tick && had) { el.classList.remove('is-tick'); void el.offsetWidth; el.classList.add('is-tick'); } };
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(Math.floor(min % 60)).padStart(2, '0')}`;

  // ---- Paint one moment of the commentary
  function render(t, started) {
    const live = started && t < FT; const ft = t >= FT;
    root.classList.toggle('is-live', live);
    const [clock] = lerp(DAY, t);
    let cur = null; let said = ''; LINES.forEach(([s, f, txt]) => { if (t >= s) { cur = f; said = txt; } });
    if (!started) said = 'Press Listen live for the commentary.'; else if (!said) said = 'Live from Matchday 3…';
    rows.forEach(({ m, li, sa, sb, st, lk, people }) => {
      const [a, b] = lerp(m.k, t); const A = a.toFixed(1); const B = b.toFixed(1);
      setText(sa, A, started); setText(sb, B, started);
      sa.className = sa.className.replace(/\b[wl]\b/g, '').trim(); sb.className = sb.className.replace(/\b[wl]\b/g, '').trim();
      if (A !== B) { sa.classList.add(a > b ? 'w' : 'l'); sb.classList.add(b > a ? 'w' : 'l'); }
      const stHtml = ft ? 'FT' : started ? `<b>Live</b><span>${hhmm(clock)}</span>` : `<span>12:00</span>`;
      if (st.innerHTML !== stHtml) st.innerHTML = stHtml;
      li.classList.toggle('is-focus', started && cur === m.id);
      const u = Math.min(1, t / FT); [m.a, m.b].forEach((id, i) => setText(lk[i], String(Math.round(TEAMS[id][5] * u)), false));
      if (li.classList.contains('is-open')) people.forEach((side) => { // live steps, re-ranked as players overtake
        side.forEach((p) => { p.v = Math.round(lerp(p.k, t)[0]); setText(p.out, fmt(p.v), false); p.el.classList.toggle('is-called', started && Array.isArray(p.mem[2]) && said.includes(p.first)); });
        [...side].sort((x, y) => y.v - x.v).forEach((p, r) => { p.el.style.setProperty('--r', r); p.rank.textContent = r + 1; });
      });
    });
    if (line.dataset.s !== said) { line.dataset.s = said; line.classList.add('is-swap'); clearTimeout(line.t); line.t = setTimeout(() => { line.textContent = said; line.classList.remove('is-swap'); }, 160); }
    const dur = audio.duration || 230.4;
    prog.style.setProperty('--p', (t / dur).toFixed(4));
    timeEl.textContent = started ? `${mmss(t)} / ${mmss(dur)}` : mmss(dur);
  }

  // ---- Player
  let started = false; let raf = 0; let pinned = null; // pinned: a fixed moment for testing
  const at = () => (pinned ?? audio.currentTime);
  const loop = () => { pinned = null; render(audio.currentTime, started); if (!audio.paused) raf = requestAnimationFrame(loop); };
  const sync = () => { root.classList.toggle('is-playing', !audio.paused); playBtn.querySelector('span').textContent = audio.paused ? (started ? 'Resume' : 'Listen live') : 'Pause'; stopBtn.hidden = !started; };
  playBtn.addEventListener('click', () => { if (audio.paused) { started = true; if (audio.ended) audio.currentTime = 0; audio.play().catch(() => {}); } else audio.pause(); });
  stopBtn.addEventListener('click', () => { audio.pause(); audio.currentTime = 0; started = false; pinned = null; sync(); render(0, false); });
  audio.addEventListener('play', () => { sync(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); });
  ['pause', 'ended'].forEach((ev) => audio.addEventListener(ev, () => { sync(); render(at(), started); }));
  audio.addEventListener('loadedmetadata', () => render(at(), started));
  // Scrolling the matchday away pauses the commentary; Resume picks it up where it stopped.
  new IntersectionObserver(([e]) => { if (!e.isIntersecting && !audio.paused) audio.pause(); }, { threshold: 0.15 }).observe($('.mdx__day.is-open'));
  // The voiced pitch (Present) takes over the sound: the commentary steps aside.
  new MutationObserver(() => { if (document.documentElement.classList.contains('is-pitch') && !audio.paused) audio.pause(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  render(0, false);
  window.matchday = { render: (t) => { audio.pause(); started = true; pinned = t; render(t, true); }, open: (i) => toggle(rows[i]), audio }; // debugging
})();
