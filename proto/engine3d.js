// Engine 3D mockup: the SportIn gamification engine as real 3D parts, driven by the scroll.
// t runs 0..6 across the pinned section: 0 intro, 1 Competitions, 2 Challenges, 3 Leaderboard,
// 4 Reward, 5 the three layers split apart and connect, 6 they press into one chip that stands up.
// One plate shows the layers in turn by flipping over; at the split it becomes the bottom layer and
// the other two drop in from above. Every payoff (champion, ring, points) lands while its caption
// is on screen. The plates' screens are drawn on canvases, redrawn only when their state changes.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createEngineSound } from '/proto/engine-sound.js?v=2';
import { createChip } from '/proto/chip3d.js?v=2';
import { followScroll } from '/proto/scroll-follow.js?v=3';

const root = document.documentElement;
const sec = document.getElementById('engine');
const stage = sec.querySelector('.engine__stage');
const canvas = document.getElementById('eng3d');
const texts = [...sec.querySelectorAll('.eng-txt[data-c]')]; // the engine's own steps (integration steps use data-ci)
// In the deck the integrations continue in this same section after step 6 (data-steps="10").
const STEPS = Number(sec.dataset.steps || 6);
const cta = sec.querySelector('.eng-cta');
const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const clamp = (v) => Math.max(0, Math.min(1, v));
const sm = (u) => u * u * u * (u * (u * 6 - 15) + 10); // quintic: soft start and end
const sc = (u) => u * u * (3 - 2 * u); // cubic: gentler, used for the flips
const win = (t, a, b) => sm(clamp((t - a) / (b - a)));
const winC = (t, a, b) => sc(clamp((t - a) / (b - a)));
const lerp = (a, b, u) => a + (b - a) * u;
const BLUE = '#0751fb'; const INK = '#0a1020'; const SLATE = '#5a6377'; const MUTE = '#8a93a6';
const GREEN = '#0f9f6e'; const GREEN_SOFT = '#effaf5'; // unlocked rewards

// ---------- Renderer, camera, light ----------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (e) {
  root.classList.add('eng3d-failed'); // the page shows a still chip instead
  throw e;
}
root.classList.remove('eng3d-failed'); // a slow load may have shown the still chip first
root.classList.add('eng3d-ready');
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
// Studio light: a soft key from above and a gentle fill from the front left. No shadows.
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(2.5, 14, 5); scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.45); fill.position.set(-6, 4, 8); scene.add(fill);

// ---------- Screen canvases ----------
// Drawn at twice the size so the text stays sharp on a retina screen.
const SW = 1040; const SH = 680;
function makeScreen() {
  const c = document.createElement('canvas'); c.width = SW * 2; c.height = SH * 2;
  const ctx = c.getContext('2d'); ctx.scale(2, 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return { c, ctx, tex, key: '' };
}
const scr = { glass: makeScreen(), board: makeScreen(), reward: makeScreen() };
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function font(ctx, weight, size, fam = 'Instrument Sans', stretch = 'normal') { ctx.font = `${weight} ${size}px "${fam}", sans-serif`; if ('fontStretch' in ctx) ctx.fontStretch = stretch; }
function card(ctx, x, y, w, h, r = 18, fill = '#fff', line = 'rgba(10,16,32,0.08)', lw = 2) { rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); if (line) { ctx.strokeStyle = line; ctx.lineWidth = lw; ctx.stroke(); } }
// Draws a polyline only up to fraction f of its length (lines that "draw" themselves).
function polyline(ctx, pts, f) {
  const segs = []; let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); total += l; }
  let left = total * f; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && left > 0; i++) {
    const l = segs[i - 1]; const k = Math.min(1, left / l);
    ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)); left -= l;
  }
  ctx.stroke();
}
// Layer label on the left, the client's brand on the right: the engine runs in their brand.
function head(ctx, label) {
  font(ctx, 500, 24, 'IBM Plex Mono'); ctx.fillStyle = MUTE; ctx.fillText(label, 44, 56);
  ctx.textAlign = 'right'; ctx.fillStyle = SLATE; ctx.fillText('Your brand', SW - 44, 56);
  const w = ctx.measureText('Your brand').width; ctx.textAlign = 'left';
  ctx.fillStyle = BLUE; ctx.beginPath(); ctx.arc(SW - 44 - w - 16, 48, 6, 0, Math.PI * 2); ctx.fill();
}
function title(ctx, text, meta, x, y) {
  font(ctx, 700, 30); ctx.fillStyle = INK; ctx.fillText(text, x, y);
  if (meta) { const w = ctx.measureText(text).width; font(ctx, 500, 30); ctx.fillStyle = MUTE; ctx.fillText(` · ${meta}`, x + w, y); }
}

function drawGlass(s) {
  const { ctx } = scr.glass;
  ctx.clearRect(0, 0, SW, SH);
  const g = ctx.createLinearGradient(0, 0, SW, SH); g.addColorStop(0, 'rgba(255,255,255,0.97)'); g.addColorStop(1, 'rgba(240,244,252,0.94)');
  card(ctx, 0, 0, SW, SH, 28, g, 'rgba(7,81,251,0.16)');
  head(ctx, 'L1 · Competition');
  // Competitions: a knockout, four teams to one champion.
  ctx.globalAlpha = s.za; card(ctx, 40, 80, 600, 560);
  title(ctx, 'Competitions', 'knockout', 68, 132);
  const X0 = 68; const Y0 = 172; const BW = 544; const BH = 440;
  const pill = (x, w, cy, label, on, alpha, solid) => {
    if (alpha <= 0.01) return; ctx.save(); ctx.globalAlpha *= alpha;
    card(ctx, x, cy - 32, w, 64, 14, solid ? BLUE : '#fff', solid ? null : (on ? BLUE : 'rgba(10,16,32,0.12)'), on ? 3 : 2);
    font(ctx, solid ? 700 : 600, 28); ctx.fillStyle = solid ? '#fff' : (on ? BLUE : SLATE); ctx.fillText(label, x + 18, cy + 10); ctx.restore();
  };
  ctx.strokeStyle = BLUE; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  const r1x = X0; const r1w = BW * 0.33; const r2x = X0 + BW * 0.41; const r2w = BW * 0.28; const r3x = X0 + BW * 0.72; const r3w = BW * 0.28;
  const y = (f) => Y0 + BH * f; const jx = X0 + BW * 0.37; const kx = X0 + BW * 0.70;
  polyline(ctx, [[r1x + r1w, y(0.12)], [jx, y(0.12)], [jx, y(0.23)], [r2x, y(0.23)]], s.k1);
  polyline(ctx, [[r1x + r1w, y(0.34)], [jx, y(0.34)], [jx, y(0.23)]], s.k1);
  polyline(ctx, [[r1x + r1w, y(0.66)], [jx, y(0.66)], [jx, y(0.77)], [r2x, y(0.77)]], s.k1);
  polyline(ctx, [[r1x + r1w, y(0.88)], [jx, y(0.88)], [jx, y(0.77)]], s.k1);
  polyline(ctx, [[r2x + r2w, y(0.23)], [kx, y(0.23)], [kx, y(0.5)], [r3x, y(0.5)]], s.k2);
  polyline(ctx, [[r2x + r2w, y(0.77)], [kx, y(0.77)], [kx, y(0.5)]], s.k2);
  pill(r1x, r1w, y(0.12), 'Team A', s.r1, s.o1); pill(r1x, r1w, y(0.34), 'Team B', false, s.o1);
  pill(r1x, r1w, y(0.66), 'Team C', s.r1, s.o1); pill(r1x, r1w, y(0.88), 'Team D', false, s.o1);
  pill(r2x, r2w, y(0.23), 'Team A', s.r2, s.o2); pill(r2x, r2w, y(0.77), 'Team C', false, s.o2);
  pill(r3x, r3w, y(0.5), 'Team A', false, s.o3, true);
  if (s.o3 > 0.01) { ctx.save(); ctx.globalAlpha *= s.o3; font(ctx, 500, 24, 'IBM Plex Mono'); ctx.fillStyle = BLUE; ctx.fillText('Champion', r3x, y(0.5) - 46); ctx.restore(); }
  ctx.globalAlpha = 1;
  // Challenges: a short goal, the ring fills fast.
  ctx.globalAlpha = s.zb; card(ctx, 660, 80, 340, 560);
  title(ctx, 'Challenges', null, 688, 132);
  font(ctx, 500, 26, 'IBM Plex Mono'); ctx.fillStyle = MUTE; ctx.fillText('3 days', 688, 172);
  const cx = 830; const cy = 370; ctx.lineWidth = 22; ctx.lineCap = 'round';
  ctx.strokeStyle = '#e9edf4'; ctx.beginPath(); ctx.arc(cx, cy, 100, 0, Math.PI * 2); ctx.stroke();
  if (s.rp > 0.001) { ctx.strokeStyle = BLUE; ctx.beginPath(); ctx.arc(cx, cy, 100, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.74 * s.rp); ctx.stroke(); }
  font(ctx, 800, 58, 'Archivo', 'semi-expanded'); ctx.fillStyle = INK; ctx.textAlign = 'center';
  ctx.fillText(Math.round(7412 * s.rp).toLocaleString('en-US'), cx, cy + 20);
  font(ctx, 500, 26); ctx.fillStyle = SLATE; ctx.fillText('of 10,000 steps', cx, 560); ctx.textAlign = 'left';
  ctx.globalAlpha = 1; ctx.lineCap = 'butt';
}

// [initials, name, values per lane, slot before, slot after the overtake]
const ROWS = [
  ['AM', 'Ana M.', ['14,210', '42 km', '128 km'], 0, 0],
  ['RP', 'Radu P.', ['13,880', '39 km', '121 km'], 1, 2],
  ['IC', 'Ioana C.', ['12,940', '35 km', '117 km'], 2, 3],
  ['MD', 'Mihai D.', ['12,105', '37 km', '124 km'], 3, 1],
];
const MOVER = 3;
function drawBoard(s) {
  const { ctx } = scr.board;
  ctx.clearRect(0, 0, SW, SH);
  card(ctx, 0, 0, SW, SH, 28, '#eceff4', 'rgba(10,16,32,0.12)');
  // Etched traces, like a logic board.
  ctx.strokeStyle = '#d4dae5'; ctx.lineWidth = 2;
  [[[0, 150], [230, 150], [230, 60], [520, 60]], [[1040, 230], [800, 230], [800, 120], [600, 120]], [[0, 600], [180, 600], [180, 520], [420, 520], [420, 640], [680, 640]], [[1040, 560], [860, 560], [860, 640]]].forEach((p) => polyline(ctx, p, 1));
  head(ctx, 'L2 · Leaderboard');
  card(ctx, 40, 80, 960, 72, 16);
  const lw = (960 - 12) / 3;
  if (s.lo > 0.01) { ctx.save(); ctx.globalAlpha = s.lo; card(ctx, 46 + s.ln * lw, 86, lw, 60, 12, BLUE, null); ctx.restore(); }
  ['Walking', 'Running', 'Cycling'].forEach((l, k) => { font(ctx, 600, 28); ctx.textAlign = 'center'; ctx.fillStyle = s.lo > 0.5 && Math.round(s.ln) === k ? '#fff' : MUTE; ctx.fillText(l, 46 + lw * k + lw / 2, 126); });
  ctx.textAlign = 'left';
  // Values roll like an odometer between lanes instead of jumping.
  const a = Math.min(2, Math.floor(s.ln + 1e-6)); const u = s.ln - a;
  [0, 1, 2, MOVER].forEach((i) => { // the mover is drawn last, on top
    const [ini, name, vals, from, to] = ROWS[i];
    const slot = lerp(from, to, s.ov); const y = 176 + slot * 116; const rank = Math.round(slot);
    const mover = i === MOVER && s.ov > 0.001;
    card(ctx, 40, y, 960, 96, 16, mover ? '#f2f6ff' : '#fff', rank === 0 ? BLUE : (mover ? 'rgba(7,81,251,0.35)' : 'rgba(10,16,32,0.07)'), rank === 0 ? 3 : 2);
    font(ctx, 500, 26, 'IBM Plex Mono'); ctx.fillStyle = MUTE; ctx.fillText(String(rank + 1), 72, y + 58);
    ctx.fillStyle = '#e8eeff'; ctx.beginPath(); ctx.arc(144, y + 48, 28, 0, Math.PI * 2); ctx.fill();
    font(ctx, 700, 22); ctx.fillStyle = BLUE; ctx.textAlign = 'center'; ctx.fillText(ini, 144, y + 56); ctx.textAlign = 'left';
    font(ctx, 600, 30); ctx.fillStyle = INK; ctx.fillText(name, 196, y + 59);
    if (mover && s.ov > 0.5) { const nw = ctx.measureText(name).width; ctx.save(); ctx.globalAlpha = clamp((s.ov - 0.5) * 4); font(ctx, 600, 24, 'IBM Plex Mono'); ctx.fillStyle = BLUE; ctx.fillText('▲ 2', 196 + nw + 18, y + 58); ctx.restore(); }
    ctx.save(); rr(ctx, 700, y + 8, 290, 80, 10); ctx.clip();
    font(ctx, 500, 28, 'IBM Plex Mono'); ctx.fillStyle = SLATE; ctx.textAlign = 'right';
    if (u < 0.001) ctx.fillText(vals[a], 968, y + 58);
    else {
      ctx.globalAlpha = 1 - u; ctx.fillText(vals[a], 968, y + 58 - u * 40);
      ctx.globalAlpha = u; ctx.fillText(vals[a + 1], 968, y + 58 + (1 - u) * 40);
    }
    ctx.restore(); ctx.textAlign = 'left';
  });
}

const PERKS = [['Free coffee', 500], ['20% off running gear', 1500], ['Spa day pass', 2500]];
function drawReward(s) {
  const { ctx } = scr.reward;
  ctx.clearRect(0, 0, SW, SH);
  card(ctx, 0, 0, SW, SH, 28, '#e4e8ef', 'rgba(10,16,32,0.16)');
  head(ctx, 'L3 · Reward');
  card(ctx, 40, 80, 440, 560);
  title(ctx, 'Earned', 'this week', 68, 132);
  font(ctx, 800, 104, 'Archivo', 'semi-expanded'); ctx.fillStyle = INK; const pts = Math.round(2500 * s.pr).toLocaleString('en-US'); ctx.fillText(pts, 64, 290);
  const pw = ctx.measureText(pts).width; font(ctx, 500, 30, 'IBM Plex Mono'); ctx.fillStyle = BLUE; ctx.fillText('pts', 78 + pw, 288);
  const tx = 72; const tw = 376; const ty = 500;
  card(ctx, tx, ty - 6, tw, 12, 6, '#e9edf4', null);
  if (s.pr > 0.001) card(ctx, tx, ty - 6, tw * s.pr, 12, 6, BLUE, null);
  [[0.2, '500'], [0.6, '1,500'], [1, '2,500']].forEach(([f, l]) => {
    ctx.beginPath(); ctx.arc(tx + tw * f, ty, 12, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = s.pr >= f - 0.001 ? BLUE : '#cfd6e2'; ctx.stroke();
    font(ctx, 500, 24, 'IBM Plex Mono'); ctx.fillStyle = MUTE; ctx.textAlign = f === 1 ? 'right' : 'center'; ctx.fillText(l, tx + tw * f + (f === 1 ? 12 : 0), ty + 54); ctx.textAlign = 'left';
  });
  PERKS.forEach(([name, cost], k) => {
    const on = s.pr >= [0.2, 0.6, 1][k] - 0.001; const redeem = k === 2 && s.pr >= 0.999;
    const y = 80 + k * 196 - (on ? 8 : 0);
    // Unlocked rewards turn green; the top reward, fully earned, becomes a green Redeem card.
    card(ctx, 500, y, 500, 168, 18, redeem ? GREEN : (on ? GREEN_SOFT : '#fff'), redeem ? null : (on ? GREEN : 'rgba(10,16,32,0.09)'), on ? 3 : 2);
    font(ctx, 700, 30); ctx.fillStyle = redeem ? '#fff' : INK; ctx.fillText(name, 530, y + 70);
    font(ctx, 500, 26, 'IBM Plex Mono'); ctx.fillStyle = redeem ? 'rgba(255,255,255,0.85)' : SLATE; ctx.fillText(`${cost.toLocaleString('en-US')} pts`, 530, y + 134);
    font(ctx, 700, 26); ctx.textAlign = 'right'; ctx.fillStyle = redeem ? '#fff' : (on ? GREEN : '#a3abbb'); ctx.fillText(redeem ? 'Redeem' : on ? 'Unlocked' : 'Locked', 972, y + 134); ctx.textAlign = 'left';
  });
}

// ---------- The three plates ----------
// Each layer has its own edge tone so they read apart on a white page: cool blue glass,
// light grey board, darker brushed metal.
const PW = 5.2; const PD = 3.4; const PT = 0.14;
const plateGeo = new RoundedBoxGeometry(PW, PT, PD, 4, 0.08);
const screenGeo = new THREE.PlaneGeometry(PW - 0.16, PD - 0.16); screenGeo.rotateX(-Math.PI / 2);
function plate(bodyMat, screen) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(plateGeo, bodyMat); g.add(body);
  const face = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: screen.tex, transparent: true, toneMapped: false })); face.position.y = PT / 2 + 0.003; g.add(face);
  g.userData = { body, face }; return g;
}
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xdfe9ff, metalness: 0, roughness: 0.1, transmission: 0.55, thickness: 0.14, ior: 1.5, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true });
const boardMat = new THREE.MeshPhysicalMaterial({ color: 0xe3e7ee, metalness: 0.15, roughness: 0.55, clearcoat: 0.4, clearcoatRoughness: 0.4, transparent: true });
const metalMat = new THREE.MeshPhysicalMaterial({ color: 0xc9d0da, metalness: 0.9, roughness: 0.3, transparent: true });
const stack = new THREE.Group(); scene.add(stack);
const pGlass = plate(glassMat, scr.glass); const pBoard = plate(boardMat, scr.board); const pReward = plate(metalMat, scr.reward);
stack.add(pReward, pBoard, pGlass);

// One plate that shows the layers one after another: it flips 180° to reveal the next layer on
// its back. The body material switches while the plate is edge-on, so the change is never seen.
const flipper = new THREE.Group(); stack.add(flipper);
const fMats = { glass: glassMat.clone(), board: boardMat.clone(), metal: metalMat.clone() };
const fBody = new THREE.Mesh(plateGeo, fMats.glass); flipper.add(fBody);
const fTopMat = new THREE.MeshBasicMaterial({ map: scr.glass.tex, transparent: true, toneMapped: false });
const fBotMat = new THREE.MeshBasicMaterial({ map: scr.board.tex, transparent: true, toneMapped: false });
const fTop = new THREE.Mesh(screenGeo, fTopMat); fTop.position.y = PT / 2 + 0.003; flipper.add(fTop);
const backGeo = screenGeo.clone(); backGeo.rotateX(Math.PI);
const fBot = new THREE.Mesh(backGeo, fBotMat); fBot.position.y = -PT / 2 - 0.003; flipper.add(fBot);

// Connections: blue rods at the two outer corners (the left and right tips of the stack as you see
// it), outside the screens, with a small pad where each rod meets a plate and a dot that runs down.
const CORNERS = [[PW / 2 - 0.08, -(PD / 2 - 0.08)], [-(PW / 2 - 0.08), PD / 2 - 0.08]];
const rodGeo = new THREE.CylinderGeometry(0.022, 0.022, 1, 14); rodGeo.translate(0, -0.5, 0);
const padGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.012, 24);
const dotGeo = new THREE.SphereGeometry(0.055, 20, 14);
const rodMat = new THREE.MeshBasicMaterial({ color: 0xbfd2ff, transparent: true }); // very light blue
const links = CORNERS.map(([x, z]) => {
  const mk = (geo) => { const m = new THREE.Mesh(geo, rodMat); m.position.set(x, 0, z); stack.add(m); return m; };
  return { r1: mk(rodGeo), r2: mk(rodGeo), pads: [mk(padGeo), mk(padGeo), mk(padGeo), mk(padGeo)], dot: mk(dotGeo) };
});

// ---------- The chip ----------
// Built in chip3d.js (shared with the integrations scene). It has the same footprint as the
// layers, which press into it.
const chipKit = createChip(renderer, { PW, PD });
const chip = chipKit.group; scene.add(chip);

// ---------- Layout ----------
// The canvas covers the whole pinned screen, so nothing can ever be cut off at its edge. The camera
// is still framed on the stage area below the text: the projection is widened to the full canvas.
let W = 1; let H = 1;
const stick = sec.querySelector('.engine__stick'); stick.prepend(canvas);
let view = { x: 0, y: 0, w: 1, h: 1 }; // the camera's base framing, in canvas pixels
let chipShift = 0; // extra vertical shift so the finished chip sits exactly mid-way (see measureChip)
function frame(shift) { camera.setViewOffset(W, H, view.x, view.y + shift, view.w, view.h); camera.updateProjectionMatrix(); }
function resize() {
  const r = stage.getBoundingClientRect(); const f = stick.getBoundingClientRect();
  W = Math.max(1, r.width); H = Math.max(1, r.height);
  renderer.setSize(f.width, f.height, false); camera.aspect = W / H;
  // Framed a little above the stage centre, so the near edge of a tilted layer never reaches the screen bottom.
  view = { x: f.left - r.left, y: f.top - r.top + H * 0.07, w: f.width, h: f.height };
  frame(0);
  measureChip();
}
// The finished chip is centred on the screen's middle line and sits exactly half-way between the
// last line of the title block (the Book a demo button) and the caption below it, with equal space
// above and below. It puts the chip and camera in their final pose, projects the chip's outline and
// works out how far the framing has to move. Re-run on resize and once the fonts have loaded.
const _box = new THREE.Box3(); const _v = new THREE.Vector3();
function measureChip() {
  const block = sec.querySelector('.eng-txt[data-c="6"]'); const capEl = sec.querySelector('.eng-caption');
  const copy = sec.querySelector('.engine__copy'); if (!block || !capEl || !copy) return;
  const f = stick.getBoundingClientRect(); const last = block.lastElementChild;
  // Layout positions without the text's scroll transforms.
  const textBottom = copy.getBoundingClientRect().top + last.offsetTop + last.offsetHeight - f.top;
  const capTop = capEl.getBoundingClientRect().top - f.top;
  const targetY = (textBottom + capTop) / 2;
  const aspectK = Math.max(1, 1.45 / (W / H)) ** 0.8; // on tall phone screens the board may fill more of the width const dist = 11 * aspectK; const ey = 0.1;
  chip.position.set(0, 0.55, 0); chip.rotation.set(Math.PI / 2, 0, 0, 'YXZ'); chip.updateMatrixWorld(true);
  camera.position.set(0, 0.55 + dist * ey, dist * Math.sqrt(1 - ey * ey)); camera.lookAt(0, 0.55, 0); camera.updateMatrixWorld(true);
  frame(0);
  _box.setFromObject(chip); let top = Infinity; let bottom = -Infinity;
  for (let i = 0; i < 8; i++) {
    _v.set(i & 1 ? _box.max.x : _box.min.x, i & 2 ? _box.max.y : _box.min.y, i & 4 ? _box.max.z : _box.min.z).project(camera);
    const y = ((1 - _v.y) / 2) * view.h; top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  chipShift = (top + bottom) / 2 - targetY;
  window.sportinChipShift = chipShift; // the integrations scene starts from the same framing
}

// ---------- Choreography ----------
const GAP = 2.4;
function setOpacity(g, o) { g.userData.body.material.opacity = o; g.userData.face.material.opacity = o; g.visible = o > 0.004; }
const chipOpacity = (o) => chipKit.setOpacity(o);

function paint(T) {
  // T runs over the whole section; the engine's own scene ends at 6 and hands over to the
  // integrations scene, which starts from this exact finished chip.
  const t = Math.min(T, 6);
  // Copy: one block at a time. Reduced motion: a plain cross-fade, no blur or slide.
  texts.forEach((el, k) => {
    const d = Math.abs(T - k); const o = 1 - sm(clamp((d - 0.28) / 0.22));
    el.style.opacity = String(o);
    el.style.transform = RM ? 'none' : `translateY(${((T - k) * -18).toFixed(1)}px)`;
    el.style.filter = !RM && o < 0.98 ? `blur(${((1 - o) * 6).toFixed(2)}px)` : 'none';
  });

  // Timeline. In the deck the scroll rests on whole steps (t = 1, 2 ... 6), so each step's
  // motion uses the whole stretch before it and its payoff has landed by the time it rests.
  const p1 = win(t, 0, 0.45); // the plate settles in
  // Flips: gentler cubic curve; with reduced motion the screen simply changes.
  const f1 = RM ? (t > 2.3 ? 1 : 0) : winC(t, 2.05, 2.55);
  const f2 = RM ? (t > 3.3 ? 1 : 0) : winC(t, 3.05, 3.55);
  const split = win(t, 4.05, 4.6); const fin = win(t, 4.05, 4.3);
  const d1 = win(t, 4.5, 4.7); const d2 = win(t, 4.62, 4.82);
  // The press into the chip: the gaps close, the block cross-fades into the chip, the chip stands up.
  const m = win(t, 5.05, 5.45); const c = win(t, 5.38, 5.62); const up = win(t, 5.55, 6);
  const bob = RM ? 0 : Math.sin(Math.PI * f1) + Math.sin(Math.PI * f2); // 1 at mid-flip

  // The flipping plate. It is already partly in view on the intro, and dips while it turns so it
  // never swings up into the text.
  const ang = Math.PI * (f1 + f2); // 0 to 2π
  flipper.position.y = lerp(-0.6, 0, p1) - 0.4 * bob; // rises gently from just below, never into the headline
  flipper.rotation.x = ang;
  const deg = (ang * 180) / Math.PI;
  fBody.material = deg < 90 ? fMats.glass : deg < 270 ? fMats.board : fMats.metal;
  fTopMat.map = deg < 180 ? scr.glass.tex : scr.reward.tex;
  const fo = lerp(0.3, 1, p1) * (split > 0.001 ? 0 : 1);
  [fMats.glass, fMats.board, fMats.metal, fTopMat, fBotMat].forEach((mt) => { mt.opacity = fo; });
  flipper.visible = fo > 0.004;

  // The split: the Reward plate takes the flipper's exact place and sinks to the bottom; the
  // Competition and Leaderboard plates drop in from above. Then the gaps close to zero (a press)
  // and only then the solid block cross-fades into the chip.
  pReward.position.y = lerp(lerp(0, -GAP, split), 0, m);
  pBoard.position.y = lerp(lerp(1.0, 0, split), 0.15, m);
  pGlass.position.y = lerp(lerp(GAP + 1.2, GAP, split), 0.3, m);
  const on = split > 0.001 ? 1 : 0;
  setOpacity(pReward, on * (1 - c)); setOpacity(pBoard, fin * (1 - c)); setOpacity(pGlass, fin * (1 - c));

  // Rods span exactly the live gap between neighbouring plates.
  const gTop = pGlass.position.y - PT / 2; const bTop = pBoard.position.y + PT / 2;
  const bBot = pBoard.position.y - PT / 2; const rTop = pReward.position.y + PT / 2;
  const dotU = RM ? -1 : clamp((t - 4.82) / 0.18); // a pulse runs down once the rods are in
  links.forEach((L) => {
    L.r1.position.y = gTop; L.r1.scale.y = Math.max(0.0001, (gTop - bTop) * d1);
    L.r2.position.y = bBot; L.r2.scale.y = Math.max(0.0001, (bBot - rTop) * d2);
    L.r1.visible = d1 > 0.002 && m < 1; L.r2.visible = d2 > 0.002 && m < 1;
    const pv = [d1 > 0.002, d1 > 0.98, d2 > 0.002, d2 > 0.98];
    [gTop - 0.006, bTop + 0.006, bBot - 0.006, rTop + 0.006].forEach((py, i) => { L.pads[i].position.y = py; L.pads[i].visible = pv[i] && m < 1; });
    const live = dotU > 0 && dotU < 1 && m < 0.01;
    L.dot.visible = live; if (live) L.dot.position.y = lerp(gTop, rTop, dotU);
  });
  rodMat.opacity = 1 - m;

  // Whole stack turned for the teardown angle; the chip turns to face you as it stands up.
  stack.rotation.y = -0.6;
  chip.position.y = lerp(0.15, 0.55, up);
  chip.rotation.set(lerp(0, Math.PI / 2, up), lerp(-0.6, 0, up), 0, 'YXZ'); // fully upright at the end
  chipOpacity(c);

  // Camera: close on the single plate (pulling back a little mid-flip), out for the split stack,
  // and at eye level for the standing chip, so it reads truly vertical.
  const aspectK = Math.max(1, 1.45 / (W / H)) ** 0.8; // on tall phone screens the board may fill more of the width
  const dist = (lerp(lerp(10.4, 18, split), 11, up) + 1.4 * bob) * aspectK;
  const look = new THREE.Vector3(0, lerp(lerp(0, 0.05, split), chip.position.y, up), 0);
  const ey = lerp(0.62, 0.1, up); const ez = Math.sqrt(1 - ey * ey);
  camera.position.set(look.x + dist * 0.05 * (1 - up), look.y + dist * ey, look.z + dist * ez);
  camera.lookAt(look);
  frame(chipShift * up); // the standing chip settles exactly mid-way between title and caption

  // Screens: redraw only when their state changes.
  const za = t < 0.4 ? 1 : 0.4 + 0.6 * Math.max(win(t, 0.4, 0.55) * (1 - win(t, 1.1, 1.3)), t > 4.05 ? 1 : 0);
  const zb = t < 1.1 ? (t < 0.4 ? 1 : 0.4) : 0.4 + 0.6 * Math.max(win(t, 1.1, 1.3), t > 4.05 ? 1 : 0);
  const gs = { za, zb, o1: win(t, 0.4, 0.55), r1: t > 0.55, k1: win(t, 0.55, 0.7), o2: win(t, 0.68, 0.78), r2: t > 0.78, k2: win(t, 0.78, 0.9), o3: win(t, 0.88, 1.0), rp: win(t, 1.3, 2.0) };
  const bs = { lo: win(t, 2.55, 2.65), ln: win(t, 2.65, 2.8) + win(t, 2.82, 2.97), ov: win(t, 2.65, 2.97) };
  const rs = { pr: win(t, 3.55, 4.0) };
  [[scr.glass, gs, drawGlass], [scr.board, bs, drawBoard], [scr.reward, rs, drawReward]].forEach(([s, st, fn]) => {
    const k = JSON.stringify(st, (_, v) => (typeof v === 'number' ? Math.round(v * 400) / 400 : v));
    if (k !== s.key) { s.key = k; fn(st); s.tex.needsUpdate = true; }
  });

  // Caption and the demo button arrive with the finished chip.
  const cap = win(t, 5.8, 6);
  sec.style.setProperty('--cap', String(cap * (1 - win(T, 6.1, 6.4)))); // gone once the integrations begin
  if (cta) cta.classList.toggle('is-on', cap > 0.5 && T < 6.5);
  canvas.style.visibility = T > 6.02 ? 'hidden' : 'visible';
  if (T > 6.02) return; // the integrations scene has taken over
  renderer.render(scene, camera);
}

// ---------- Sound ----------
// Transformer-style cues on the flips, the split and the press into the chip. Off by default;
// the button sits in the bottom right corner of the engine card.
const sound = createEngineSound();
if (sound) {
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'eng-sound'; btn.setAttribute('aria-pressed', 'false');
  const label = (v) => { btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Z"/>${v ? '<path class="w" d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>' : '<path class="w" d="M16.5 9.5l5 5M21.5 9.5l-5 5"/>'}</svg><span>${v ? 'Sound on' : 'Sound off'}</span>`; btn.setAttribute('aria-pressed', String(v)); };
  label(false);
  btn.addEventListener('click', async () => { label(await sound.toggle()); });
  sec.querySelector('.engine__stick').appendChild(btn);
}

// ---------- Scroll ----------
// The scene follows the scroll at a steady, eased pace (scroll-follow.js); the last part of the
// scroll holds the finished chip.
const follow = followScroll(sec, { steps: STEPS, reduced: RM, onFrame: (t) => { paint(t); if (sound) sound.update(t); } });
window.addEventListener('resize', () => { resize(); paint(follow.t); });
resize();
document.fonts.ready.then(() => { measureChip(); chipKit.drawEngraving(); [scr.glass, scr.board, scr.reward].forEach((s) => { s.key = ''; }); follow.sync(); });
follow.sync();
window.engineAt = (v) => follow.jump(v);
