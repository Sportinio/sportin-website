// 07 Game of Run: teams claim landmarks in turn. Each claim shows in the feed with the city's House
// crest, adds to the team's count and re-ranks the territory table. Runs only while the page is in
// view; the map video plays only then too. Team banners and House crests come from game-of-run.com.
(() => {
  const root = document.getElementById('gameofrun'); if (!root) return;
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const M = '/proto/media/gor/';
  const video = root.querySelector('.gor__video'); const list = root.querySelector('.gor__teams');
  const feed = root.querySelector('.gor__feed'); const ev = feed.querySelector('.gor__ev'); const crest = feed.querySelector('.gor__crest');
  // [id, name, landmarks held]
  const TEAMS = [['iron-wolves', 'Iron Wolves', 412], ['golden-stags', 'Golden Stags', 405], ['nightstride', 'Nightstride', 377], ['carpathian-ravens', 'Carpathian Ravens', 351]];
  // [team, landmark, House]
  const CLAIMS = [
    ['golden-stags', 'the Black Church', 'brasov'], ['iron-wolves', 'the Council Tower', 'sibiu'],
    ['carpathian-ravens', 'Union Square', 'cluj'], ['golden-stags', 'Mount Tâmpa', 'brasov'],
    ['nightstride', 'the Athenaeum', 'bucharest'], ['golden-stags', 'the Bridge of Lies', 'sibiu'],
    ['iron-wolves', 'Central Park', 'cluj'], ['golden-stags', 'the Rope Street', 'brasov'],
    ['nightstride', 'the Arc de Triomphe', 'bucharest'], ['carpathian-ravens', 'St Michael’s Church', 'cluj'],
  ];
  const CITY = { brasov: 'Brașov', sibiu: 'Sibiu', cluj: 'Cluj', bucharest: 'Bucharest' };
  list.innerHTML = TEAMS.map(([id, n]) => `<li><img src="${M}team-${id}.webp?v=1" alt="" /><b>${n}</b><span></span></li>`).join('');
  const rows = TEAMS.map(([id, , v], i) => ({ id, v0: v, v, li: list.children[i], out: list.children[i].querySelector('span') }));
  const place = () => [...rows].sort((a, b) => b.v - a.v).forEach((r, i) => { r.li.style.setProperty('--r', i); r.out.textContent = r.v; });
  const nameOf = (id) => TEAMS.find((t) => t[0] === id)[1];

  let k = 0; let timer = 0; let on = false;
  function show(c, animate) {
    const [team, spot, house] = c;
    const set = () => { ev.innerHTML = `<b>${nameOf(team)}</b> claimed ${spot} &middot; ${CITY[house]}`; crest.src = `${M}house-${house}.webp?v=1`; feed.classList.remove('is-swap'); };
    if (animate && !RM) { feed.classList.add('is-swap'); setTimeout(set, 280); } else set();
  }
  function tick() {
    const c = CLAIMS[k % CLAIMS.length]; k++;
    const r = rows.find((x) => x.id === c[0]); r.v++; rows.forEach((x) => x.li.classList.toggle('is-up', x === r));
    show(c, true); place();
    if (k % CLAIMS.length === 0) rows.forEach((x) => { x.v = x.v0; }); // a quiet reset each round keeps the numbers believable
    timer = setTimeout(tick, 2600);
  }
  function start() { if (on) return; on = true; if (video) video.play().catch(() => {}); if (!RM) timer = setTimeout(tick, 900); }
  function stop() { on = false; clearTimeout(timer); if (video) video.pause(); }
  place(); show(CLAIMS[CLAIMS.length - 1], false);
  new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0.3 }).observe(root);
})();
