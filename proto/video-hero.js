// Video hero mockup: the title's audience word and the background clip change together.
// One word per clip, in page order; a clip's data-label overrides its data-word in the title.
// A pause button stops both.
(() => {
  const CYCLE = 4800;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rot = document.querySelector('.rot__word');
  const clips = [...document.querySelectorAll('.hv__clip')];
  const AUDIENCE = clips.map((v) => v.dataset.label || v.dataset.word);
  const pauseBtn = document.getElementById('hvPause');
  if (!rot || !clips.length) return;

  // Title word: letters slide out together, the new word's letters slide in one after another.
  const letters = (w) => [...w].map((ch, n) => `<span class="rot__ch" style="--n:${n}">${ch}</span>`).join('');
  rot.innerHTML = letters(AUDIENCE[0]);
  function setAudience(w) {
    rot.classList.add('is-out');
    setTimeout(() => {
      rot.innerHTML = letters(w);
      rot.classList.remove('is-out'); rot.classList.add('is-in');
      requestAnimationFrame(() => requestAnimationFrame(() => rot.classList.remove('is-in')));
    }, 320);
  }

  // Slower playback reads calmer and more cinematic behind the copy.
  clips.forEach((v) => { v.defaultPlaybackRate = 0.6; v.playbackRate = 0.6; });
  // Pixel change: freeze the old scene (footage + its colour wash) on a canvas over the new one,
  // then knock it out block by block so the new video shows through.
  const layer = document.querySelector('.hv');
  const px = document.createElement('canvas'); px.className = 'hv__px'; px.setAttribute('aria-hidden', 'true');
  layer.insertBefore(px, layer.querySelector('.hv__dots'));
  const pctx = px.getContext('2d');

  function freeze(v) {
    const r = layer.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(r.width); const H = Math.round(r.height);
    px.width = W * dpr; px.height = H * dpr; pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // object-fit: cover, as the video is shown.
    const s = Math.max(W / v.videoWidth, H / v.videoHeight); const dw = v.videoWidth * s; const dh = v.videoHeight * s;
    pctx.filter = 'saturate(1.25) contrast(1.12)';
    pctx.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh);
    pctx.filter = 'none';
    const cs = getComputedStyle(v.parentElement); const a = cs.getPropertyValue('--a').trim(); const b = cs.getPropertyValue('--b').trim();
    const dx = Math.cos(28 * Math.PI / 180) * W; const dy = Math.sin(28 * Math.PI / 180) * H;
    const g = pctx.createLinearGradient(0, 0, dx, dy); g.addColorStop(0, a); g.addColorStop(0.38, a); g.addColorStop(1, b);
    pctx.globalCompositeOperation = 'multiply'; pctx.globalAlpha = 0.82; pctx.fillStyle = g; pctx.fillRect(0, 0, W, H);
    pctx.globalCompositeOperation = 'source-over'; pctx.globalAlpha = 1;
    return { W, H };
  }

  function dissolve({ W, H }) {
    const size = Math.max(18, Math.round(W / 40));
    const blocks = [];
    for (let y = 0; y < H; y += size) for (let x = 0; x < W; x += size) blocks.push([x, y]);
    for (let k = blocks.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [blocks[k], blocks[j]] = [blocks[j], blocks[k]]; }
    const start = performance.now(); const DUR = 760; let done = 0;
    px.style.opacity = '1';
    const frame = (now) => {
      const p = Math.min(1, (now - start) / DUR);
      const target = Math.floor(blocks.length * (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2));
      for (; done < target; done++) pctx.clearRect(blocks[done][0], blocks[done][1], size, size);
      if (p < 1) requestAnimationFrame(frame); else px.style.opacity = '0';
    };
    requestAnimationFrame(frame);
  }

  function show(i, withPixels) {
    const old = clips.find((v) => v.parentElement.classList.contains('is-active'));
    const pixels = withPixels && !reduced && old && old.readyState >= 2;
    const box = pixels ? freeze(old) : null;
    if (pixels) layer.classList.add('is-px');
    clips.forEach((v, k) => {
      const s = v.parentElement;
      if (k === i) { v.currentTime = 0; v.playbackRate = 0.6; s.classList.add('is-active'); if (!paused) v.play().catch(() => {}); } else { s.classList.remove('is-active'); setTimeout(() => { if (!s.classList.contains('is-active')) v.pause(); }, 900); }
    });
    if (pixels) { requestAnimationFrame(() => layer.classList.remove('is-px')); dissolve(box); }
    // Warm the next clip so the change never shows a blank frame.
    clips[(i + 1) % clips.length].preload = 'auto';
  }

  let i = 0; let paused = reduced; let timer = 0;
  const tick = () => { i = (i + 1) % AUDIENCE.length; setAudience(AUDIENCE[i]); show(i, true); };
  const run = () => { clearInterval(timer); timer = setInterval(tick, CYCLE); };

  function setPaused(p) {
    paused = p;
    pauseBtn.classList.toggle('is-paused', p);
    pauseBtn.setAttribute('aria-label', p ? 'Play background video' : 'Pause background video');
    if (p) { clearInterval(timer); clips.forEach((v) => v.pause()); } else { clips[i].play().catch(() => {}); run(); }
  }
  pauseBtn.addEventListener('click', () => setPaused(!paused));

  // Stop when the hero is off screen; resume when it comes back (unless the visitor paused it).
  let userPaused = false;
  pauseBtn.addEventListener('click', () => { userPaused = paused; });
  new IntersectionObserver(([e]) => {
    if (userPaused || reduced) return;
    if (e.isIntersecting) setPaused(false); else { clearInterval(timer); clips[i].pause(); }
  }, { threshold: 0.15 }).observe(document.getElementById('why'));

  if (reduced) setPaused(true); else show(0);
})();
