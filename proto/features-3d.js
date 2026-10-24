// Formats 09 to 11: the 3D phone (phone3d.js) used for the turn between app pages, the same phone
// and half turn as 10 Delivery. At rest the page shows the live HTML screens in the flat phone
// (phone-frame-3d.png, a face-on render of this same phone); during a turn features.js hides the
// flat phone and shows this one. The camera is placed so the 3D phone's face lands exactly on the
// flat phone, so the swap does not show. Screens are still images of the live ones
// (media/features/screen-*.jpg, captured at rest).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PHONE, buildPhone } from '/proto/phone3d.js?v=2';

const { D } = PHONE;
const FRAME_H = PHONE.H + 1; // phone-frame-3d.png spans the phone plus 0.5 mm top and bottom (render-phone-frame.html)
const FOV = 22; // as on 10 Delivery
const MARGIN = { x: 0.35, y: 0.08 }; // room around the phone for the turn and the tilt, as a share of its size

export async function makeFeatPhone3D(stick, urls) {
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
  const camera = new THREE.PerspectiveCamera(FOV, 1, 10, 4000);

  const loader = new THREE.TextureLoader();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const screens = await Promise.all(urls.map((u) => loader.loadAsync(u).then((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; return t; })));
  const faceMats = [0, 1].map((side) => new THREE.MeshBasicMaterial({ map: screens[side] || screens[0], toneMapped: false }));
  const phone = buildPhone(faceMats);
  scene.add(phone);

  const host = document.createElement('div');
  host.className = 'feat__three';
  host.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  stick.appendChild(host);

  let queued = false;
  const draw = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; renderer.render(scene, camera); }); };

  // Lay the canvas over a flat phone (its box relative to the stick) and aim the camera so the
  // phone's face fills that box exactly.
  function place(box) {
    if (!box || !box.height) return;
    const mx = box.width * MARGIN.x, my = box.height * MARGIN.y;
    const w = box.width + 2 * mx, h = box.height + 2 * my;
    Object.assign(host.style, { left: `${box.left - mx}px`, top: `${box.top - my}px`, width: `${w}px`, height: `${h}px` });
    renderer.setSize(w, h, false); canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    camera.aspect = w / h;
    const mmTall = h / (box.height / FRAME_H); // the canvas height in millimetres at the phone's face
    const dist = mmTall / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    camera.position.set(0, 0, dist + D / 2); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
    draw();
  }

  return {
    place,
    // yaw/pitch in radians; which screen each face shows.
    set(yaw, pitch, front, back) {
      phone.rotation.set(pitch, yaw, 0);
      [front, back].forEach((k, side) => { const t = screens[k] || screens[0]; if (faceMats[side].map !== t) faceMats[side].map = t; });
      draw();
    },
    show(on) { host.style.visibility = on ? 'visible' : 'hidden'; },
  };
}
