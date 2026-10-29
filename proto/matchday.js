// Matchday live (matchday.html): one fan-league match, then the whole matchday, then the table.
// Everything is painted from one clock, render(t), so the commentary audio can drive it later
// (t = audio.currentTime). States are classes on .mdx; matchday.css animates them.
(() => {
  const root = document.getElementById('matchday'); if (!root) return;
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s) => root.querySelector(s);

  // ---- Fan-team crests: a shield in the team colour with one white mark. Made up for the demo.
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
  const TEAMS = {
    eagles: ['Riverside Eagles', '#1d3b8f', 'eagle'], wolves: ['Valley Wolves', '#3b4a63', 'wolf'],
    alpine: ['Alpine United', '#2a3242', 'alpine'], pinecrest: ['Pinecrest FC', '#1f6b3a', 'pine'],
    sunset: ['Sunset Athletic', '#d9622b', 'sun'], cedar: ['Cedar Town', '#0e6aa8', 'wave'],
    maple: ['Maple United', '#c8102e', 'maple'], hill: ['Sporting Hill', '#1f5bd6', 'bolt'],
    harbor: ['Harbor City', '#13254d', 'anchor'], green: ['Greenfield Town', '#198754', 'clover'],
    oxford: ['Oxford Rangers', '#b8860b', 'stag'], summit: ['Summit FC', '#24324f', 'summit'],
  };
  const crest = (id) => { const [, c, m] = TEAMS[id]; return `<svg viewBox="0 0 40 46" aria-hidden="true"><path d="M20 2 37 8v14c0 11-8 19-17 22C11 41 3 33 3 22V8Z" fill="${c}" stroke="rgba(255,255,255,.85)" stroke-width="1.6"/><g fill="#fff">${MARK[m]}</g></svg>`; };

  // ---- The timeline, in seconds. The match runs 90 minutes between KICK and FT.
  const T = { walk: 0.2, kick: 3.5, ft: 36, dock: 38.6, round: 39.2, table: 41.6, shuffle: 43.2, end: 46, head: 47.2, total: 52 };
  // The score by match minute: Wolves start faster, Eagles level on the hour, Wolves hit back, Eagles win it.
  const SCORE = [[0, 0, 0], [15, 1.1, 1.6], [30, 2.3, 3.1], [45, 3.5, 3.9], [60, 4.8, 4.7], [70, 5.3, 5.5], [80, 6.0, 5.8], [90, 6.8, 6.2]];
  // Placeholder lines until the real commentary arrives; same timing model (match minute).
  const CAPS = [[0, 'And we’re under way… Matchday 3 of the Northside FC Fan League.'], [12, 'Valley Wolves out of the blocks fast… seventeen fans on the move.'],
    [38, 'Wolves still in front as we reach half-time.'], [56, 'Here come the Eagles! Level… and now they’re ahead!'],
    [68, 'But the Wolves answer straight back!'], [79, 'Eagles in front again… every step counts now.'], [88, 'Final whistle on its way…'],
    [90, 'It’s over! Riverside Eagles win it, six point eight to six point two!']];
  const ROUND = [['eagles', 6.8, 6.2, 'wolves'], ['alpine', 5.7, 5.6, 'pinecrest'], ['sunset', 7.3, 7.4, 'cedar'], ['maple', 0.2, 5.4, 'hill'], ['harbor', 8.6, 7.4, 'green'], ['oxford', 0.0, 5.2, 'summit']];
  // The table before and after Matchday 3: [team, position before, points before, position after, points after]
  const TABLE = [['harbor', 0, 6, 0, 9], ['pinecrest', 1, 4, 5, 4], ['eagles', 2, 4, 1, 7], ['cedar', 3, 3, 2, 6], ['hill', 4, 3, 3, 6], ['summit', 5, 3, 4, 6]];

  // ---- Build
  const sideA = $('.mdx__side--a'); const sideB = $('.mdx__side--b');
  [sideA, sideB].forEach((s) => {
    s.querySelector('.mdx__crest').innerHTML = crest(s.dataset.team);
    const n = s.querySelector('.mdx__name'); let i = 0; // letters reveal in turn; words never break
    n.innerHTML = n.textContent.split(' ').map((w) => `<span class="mdx__w">${[...w].map((ch) => `<span style="--i:${i++}">${ch}</span>`).join('')}</span>`).join(' ');
  });
  $('.mdx__fx').innerHTML = ROUND.map(([a, sa, sb, b], i) => `<li class="${i ? '' : 'is-feature'}" style="--i:${i}"><span class="ft">FT</span><span class="tm tm--a">${TEAMS[a][0]}</span><span class="cr">${crest(a)}</span><span class="sc"><b class="${sa > sb ? 'w' : 'l'}">${sa.toFixed(1)}</b><i>-</i><b class="${sb > sa ? 'w' : 'l'}">${sb.toFixed(1)}</b></span><span class="cr">${crest(b)}</span><span class="tm">${TEAMS[b][0]}</span></li>`).join('');
  $('.mdx__tb').innerHTML = TABLE.map(([id]) => `<li class="${id === 'eagles' ? 'is-up' : ''}"><span class="pos"></span><span class="tn">${crest(id)}${TEAMS[id][0]}${id === 'eagles' ? '<em>&#9650; 1</em>' : ''}</span><span class="p"></span><span class="pts"></span></li>`).join('');

  const sA = $('.mdx__s--a'); const sB = $('.mdx__s--b'); const clockEl = $('.mdx__clock'); const mo = $('.mdx__mo i'); const cap = $('.mdx__cap');
  const fansEl = [sideA, sideB].map((s) => s.querySelector('.mdx__fans')); const FANS = [15, 17];
  const rows = [...root.querySelectorAll('.mdx__tb li')];

  const clamp = (v) => Math.max(0, Math.min(1, v));
  function scoreAt(min) {
    for (let i = 1; i < SCORE.length; i++) {
      const [m1, a1, b1] = SCORE[i]; const [m0, a0, b0] = SCORE[i - 1];
      if (min <= m1) { const u = (min - m0) / (m1 - m0); return [a0 + (a1 - a0) * u, b0 + (b1 - b0) * u]; }
    }
    return SCORE[SCORE.length - 1].slice(1);
  }
  const setText = (el, v, tick) => { if (el.textContent === v) return; el.textContent = v; if (tick && !RM) { el.classList.remove('is-tick'); void el.offsetWidth; el.classList.add('is-tick'); } };

  // ---- Paint one moment
  function render(t) {
    const on = (k) => t >= T[k];
    root.classList.toggle('is-walk', on('walk'));
    root.classList.toggle('is-live', on('kick') && !on('ft'));
    ['ft', 'dock', 'round', 'table', 'shuffle', 'end', 'head'].forEach((k) => root.classList.toggle(`is-${k === 'dock' ? 'docked' : k}`, on(k)));

    fansEl.forEach((el, i) => setText(el, String(Math.round(clamp((t - 1.5) / 1.2) * FANS[i]))));
    const min = clamp((t - T.kick) / (T.ft - T.kick)) * 90;
    const [a, b] = scoreAt(min);
    setText(sA, a.toFixed(1), true); setText(sB, b.toFixed(1), true);
    const tie = a.toFixed(1) === b.toFixed(1);
    sA.classList.toggle('is-lead', !tie && a > b); sB.classList.toggle('is-lead', !tie && b > a); sA.classList.toggle('is-tie', tie); sB.classList.toggle('is-tie', tie);
    sideA.classList.toggle('is-lead', a > b); sideB.classList.toggle('is-lead', b > a);
    setText(clockEl, on('ft') ? '90′ · Full time' : `${Math.floor(min)}′`);
    const m = Math.max(-1, Math.min(1, (a - b) / 0.8));
    mo.style.setProperty('--m', Math.abs(m).toFixed(3)); mo.classList.toggle('is-b', m < 0);

    let line = ''; if (on('kick')) CAPS.forEach(([cm, txt]) => { if (min >= cm) line = txt; });
    if (cap.dataset.line !== line) { cap.dataset.line = line; cap.classList.add('is-swap'); clearTimeout(cap.t); cap.t = setTimeout(() => { cap.textContent = line; cap.classList.remove('is-swap'); }, RM ? 0 : 220); }

    const after = on('shuffle');
    rows.forEach((li, i) => { const r = TABLE[i]; li.style.setProperty('--r', after ? r[3] : r[1]); li.querySelector('.pos').textContent = (after ? r[3] : r[1]) + 1; li.querySelector('.p').textContent = after ? 3 : 2; li.querySelector('.pts').textContent = after ? r[4] : r[2]; });
  }

  // ---- Clock: plays once, holds on the headline. Replay starts over. Pauses when off screen.
  let t = 0; let last = 0; let playing = true; let visible = true;
  function frame(now) {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    if (playing && visible && !document.hidden) t = Math.min(T.total, t + dt);
    render(t); requestAnimationFrame(frame);
  }
  $('.mdx__replay').addEventListener('click', () => { t = 0; render(0); playing = true; });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.4 }).observe(root);
  if (RM) t = T.head;
  render(t); requestAnimationFrame(frame);
  window.matchday = { seek: (s) => { t = s; render(t); }, play: () => { playing = true; }, pause: () => { playing = false; }, state: () => ({ t }), T }; // debugging, and the audio hook later
})();
