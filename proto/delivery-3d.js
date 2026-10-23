// 10 Delivery: the phone as a real 3D object (Three.js, from the deck's import map). It is built in
// code, not loaded from a model file: a champagne titanium body with rounded edges and real thickness,
// black front glass, the screen, the Dynamic Island, side buttons, and a frosted glass back with the
// camera. Sizes are in millimetres, close to an iPhone 15 Pro. delivery.js turns it and picks the screen.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 70.6, H = 146.6, D = 8.25, R = 10.6; // body width, height, depth, corner radius
const SW = 65.2, SH = 141.4, SR = 8.4;         // screen (1179 × 2556 px at this size)
const BEVEL = 1.25;                            // the rounded titanium edge

function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// A flat rounded rectangle whose UVs run 0..1 across it, so an image fills it edge to edge.
function plate(w, h, r, segs = 24) {
  const g = new THREE.ShapeGeometry(roundedRect(w, h, r), segs);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h);
  return g;
}

// A slab with rounded corners and rounded edges, centred on z = 0, total size w × h × d.
function slab(w, h, d, r, bevel, segs = 10) {
  const g = new THREE.ExtrudeGeometry(roundedRect(w - 2 * bevel, h - 2 * bevel, r - bevel), {
    depth: d - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segs, curveSegments: 32,
  });
  g.translate(0, 0, -(d - 2 * bevel) / 2);
  return g;
}

export async function makePhone3D(host, urls) {
  const canvas = document.createElement('canvas');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { return null; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(-60, 120, 160); scene.add(key);

  const camera = new THREE.PerspectiveCamera(22, 1, 10, 2000);

  const loader = new THREE.TextureLoader();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const screens = await Promise.all(urls.map((u) => loader.loadAsync(u).then((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; return t; })));

  const phone = new THREE.Group();
  const titanium = new THREE.MeshPhysicalMaterial({ color: 0xbfae94, metalness: 1, roughness: 0.3, clearcoat: 0.3, clearcoatRoughness: 0.25 });
  phone.add(new THREE.Mesh(slab(W, H, D, R, BEVEL), titanium));

  // Front: black glass edge to edge, the screen inside it, the Dynamic Island on top.
  const front = new THREE.Mesh(plate(W - 1.5, H - 1.5, R - 0.75), new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }));
  front.position.z = D / 2 + 0.02; phone.add(front);
  const screenMat = new THREE.MeshBasicMaterial({ map: screens[0], toneMapped: false });
  const screen = new THREE.Mesh(plate(SW, SH, SR, 32), screenMat);
  screen.position.z = D / 2 + 0.04; phone.add(screen);
  // A faint sheen on the glass over the screen, so it reads as glass when the light moves across it.
  const sheen = new THREE.Mesh(plate(SW, SH, SR, 32), new THREE.MeshPhysicalMaterial({ color: 0x000000, transparent: true, opacity: 0.04, roughness: 0.05, clearcoat: 1, metalness: 0, depthWrite: false }));
  sheen.position.z = D / 2 + 0.06; phone.add(sheen);
  const island = new THREE.Mesh(plate(20.8, 6.1, 3.05), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  island.position.set(0, SH / 2 - 1.85 - 3.05, D / 2 + 0.08); phone.add(island);

  // Back: frosted glass in the same champagne, with the camera plateau and three lenses.
  const backMat = new THREE.MeshPhysicalMaterial({ color: 0xcdbfaa, metalness: 0.15, roughness: 0.55, clearcoat: 0.4, clearcoatRoughness: 0.6 });
  const back = new THREE.Mesh(plate(W - 1.5, H - 1.5, R - 0.75), backMat);
  back.rotation.y = Math.PI; back.position.z = -D / 2 - 0.02; phone.add(back);
  const cam = new THREE.Group(); cam.rotation.y = Math.PI; cam.position.set(W / 2 - 4.2 - 16.5, H / 2 - 4.2 - 17.5, -D / 2 - 0.02);
  const plateau = new THREE.Mesh(slab(33, 35, 1.6, 7.4, 0.55, 6), new THREE.MeshPhysicalMaterial({ color: 0xc9baa3, metalness: 0.2, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 }));
  plateau.position.z = 0.25; cam.add(plateau);
  const ring = new THREE.MeshPhysicalMaterial({ color: 0xb6a588, metalness: 1, roughness: 0.25 });
  const lensGlass = new THREE.MeshPhysicalMaterial({ color: 0x0a0c12, metalness: 0, roughness: 0.05, clearcoat: 1 });
  [[-8.4, 8.6], [-8.4, -8.6], [8.6, 0]].forEach(([x, y]) => {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.6, 2.4, 48), ring); body.rotation.x = Math.PI / 2; body.position.set(x, y, 1.6); cam.add(body);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(5.1, 48), lensGlass); glass.position.set(x, y, 2.82); cam.add(glass);
  });
  const flash = new THREE.Mesh(new THREE.CircleGeometry(2, 24), new THREE.MeshPhysicalMaterial({ color: 0xf2eee6, roughness: 0.4 })); flash.position.set(9.4, 11.2, 1.07); cam.add(flash);
  phone.add(cam);

  // Side buttons: the action button and volume on the left, the side button on the right.
  const button = (y, len, side) => {
    const g = new THREE.CapsuleGeometry(1.35, len - 2.7, 6, 16);
    const m = new THREE.Mesh(g, titanium); m.scale.set(0.42, 1, 1); m.position.set(side * (W / 2 - 0.05), y, 0); phone.add(m);
  };
  button(H / 2 - 32, 7, -1); button(H / 2 - 46, 11, -1); button(H / 2 - 60, 11, -1); button(H / 2 - 50, 17, 1);

  scene.add(phone);
  host.appendChild(canvas);

  let w = 0, h = 0;
  function resize() {
    w = host.clientWidth; h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    camera.aspect = w / h;
    // Fit the phone's height (with a margin for the turn and the tilt) to the canvas.
    const fitH = H * 1.08, fitW = (W + 28) * 1.1;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(0, 0, Math.max(fitH / 2 / t, fitW / 2 / t / camera.aspect) + D);
    camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
    draw();
  }
  let queued = false;
  function draw() { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; renderer.render(scene, camera); }); }

  window.addEventListener('resize', resize);
  resize();

  return {
    canvas,
    // yaw/pitch in radians; which screen to show (0, 1 or 2).
    set(yaw, pitch, which) {
      phone.rotation.set(pitch, yaw, 0);
      if (screenMat.map !== screens[which]) screenMat.map = screens[which];
      draw();
    },
    resize,
  };
}
