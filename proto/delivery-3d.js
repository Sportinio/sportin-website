// 10 Delivery: the 3D phone (phone3d.js) live on the page, with a screen on both faces so a half
// turn brings the next screen round. delivery.js turns it and picks the screens.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PHONE, buildPhone } from '/proto/phone3d.js?v=2';

const { W, H, D } = PHONE;

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

  const faceMats = [0, 1].map((side) => new THREE.MeshBasicMaterial({ map: screens[side], toneMapped: false }));
  const phone = buildPhone(faceMats);

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
    // yaw/pitch in radians; which screen each face shows (0, 1 or 2).
    set(yaw, pitch, front, back) {
      phone.rotation.set(pitch, yaw, 0);
      [front, back].forEach((k, side) => { if (faceMats[side].map !== screens[k]) faceMats[side].map = screens[k]; });
      draw();
    },
    resize,
  };
}
