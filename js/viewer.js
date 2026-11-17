// A small three.js stage: one canvas, soft daylight, draws only while on screen and moving.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildPlant, disposeTree, ground, LOOKS } from './plants3d.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)');

export function createViewer(host, { controls = false, spin = true, background = null, groundKind = 'soil', fov = 32 } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: !background, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  if (background) scene.background = new THREE.Color(background);
  const cam = new THREE.PerspectiveCamera(fov, 1, .01, 200);
  // soft studio reflections so leaves, fruit skins and pots read as real materials
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .55;
  scene.add(new THREE.HemisphereLight('#f4f8ff', '#5a4a3a', 1.0));
  const sun = new THREE.DirectionalLight('#fff3df', 2.4);
  sun.position.set(2, 4, 3); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0005;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#cfe3ff', .7); fill.position.set(-3, 2, -2); scene.add(fill);

  const stage = new THREE.Group(); scene.add(stage);
  let plant = null, base = null, extra = null;
  let orbit = null;
  if (controls) {
    orbit = new OrbitControls(cam, renderer.domElement);
    orbit.enableDamping = true; orbit.enablePan = false; orbit.dampingFactor = .08;
    // let the page scroll: one finger turns the plant sideways only, the wheel zooms only with ctrl/cmd held
    renderer.domElement.style.touchAction = 'pan-y'; orbit.enableZoom = false;
    renderer.domElement.addEventListener('wheel', (e) => { orbit.enableZoom = e.ctrlKey || e.metaKey; }, { capture: true });
    orbit.addEventListener('change', () => kick());
    orbit.addEventListener('start', () => { userTouched = true; });
  }
  let userTouched = false;

  let visible = false, raf = 0, idleUntil = 0, W = 0, H = 0;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }, { rootMargin: '200px' });
  io.observe(host);
  const ro = new ResizeObserver(() => resize()); ro.observe(host);

  function resize() {
    const r = host.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
    cam.aspect = W / H; cam.updateProjectionMatrix();
    kick();
  }

  // Frame the camera on whatever is in the stage
  let target = new THREE.Vector3(), dist = 1;
  function frame(obj, { pad = 1.15 } = {}) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
    const r = Math.max(size.y * .55, Math.hypot(size.x, size.z) * .5 / Math.min(1, Math.max(.6, cam.aspect)));
    dist = (r * pad) / Math.tan(THREE.MathUtils.degToRad(fov / 2));
    target.copy(centre);
    const ang = .35;
    cam.position.set(centre.x + Math.sin(.6) * dist * Math.cos(ang), centre.y + dist * Math.sin(ang), centre.z + Math.cos(.6) * dist * Math.cos(ang));
    cam.near = dist / 100; cam.far = dist * 10; cam.updateProjectionMatrix();
    cam.lookAt(target);
    if (orbit) { orbit.target.copy(target); orbit.minDistance = dist * .4; orbit.maxDistance = dist * 2.5; orbit.update(); }
    sun.position.copy(centre).add(new THREE.Vector3(dist * .6, dist * 1.2, dist * .8));
    sun.target.position.copy(centre);
    const sc = sun.shadow.camera; const s = Math.max(size.x, size.y, size.z) * .8; sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s; sc.near = .01; sc.far = dist * 4; sc.updateProjectionMatrix();
  }

  function setPlant(id, t = 1, { keepCamera = false, extraObject = null } = {}) {
    if (plant) { stage.remove(plant); disposeTree(plant); }
    if (base) { stage.remove(base); disposeTree(base); base = null; }
    if (extra) { stage.remove(extra); extra = null; }
    plant = buildPlant(id, t);
    stage.add(plant);
    if (extraObject) { extra = typeof extraObject === 'function' ? extraObject(new THREE.Box3().setFromObject(plant)) : extraObject; stage.add(extra); }
    else {
      const box = new THREE.Box3().setFromObject(plant); const sz = box.getSize(new THREE.Vector3());
      const radius = Math.max(.12, Math.max(sz.x, sz.z) * .62);
      base = ground(LOOKS[id]?.habit === 'tree' ? 'grass' : groundKind, radius); stage.add(base);
    }
    if (!keepCamera) frame(stage);
    kick();
  }

  function kick() { idleUntil = performance.now() + 1500; if (!raf) raf = requestAnimationFrame(loop); }
  let last = performance.now();
  function loop(now) {
    raf = 0;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const spinning = spin && !reduce.matches && !userTouched;
    if (spinning) stage.rotation.y += dt * .35;
    if (orbit) orbit.update();
    if (visible) renderer.render(scene, cam);
    if (visible && (spinning || now < idleUntil || (api.onFrame && !reduce.matches))) { api.onFrame?.(dt); raf = requestAnimationFrame(loop); }
  }

  const api = {
    scene, stage, camera: cam, renderer, setPlant, frame: () => frame(stage), kick, onFrame: null,
    setSpin(v) { spin = v; kick(); },
    dispose() { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); if (plant) disposeTree(plant); orbit?.dispose(); pmrem.dispose(); renderer.dispose(); renderer.domElement.remove(); },
  };
  resize();
  return api;
}

// One shared offscreen renderer makes still thumbnails for the plant list (so the list needs no live canvases)
let thumbR, thumbV;
const thumbs = new Map();
export async function plantThumb(id, size = 360) {
  if (thumbs.has(id)) return thumbs.get(id);
  if (!thumbV) {
    const host = document.createElement('div');
    host.style.cssText = `position:fixed;left:-9999px;top:0;width:${size}px;height:${size}px`;
    document.body.appendChild(host);
    thumbV = createViewer(host, { spin: false, fov: 30 });
    thumbV.renderer.setPixelRatio(1.5);
    thumbR = host;
  }
  thumbV.setPlant(id, 1);
  thumbV.stage.rotation.y = .5;
  thumbV.renderer.render(thumbV.scene, thumbV.camera);
  const url = thumbV.renderer.domElement.toDataURL('image/webp', .85);
  thumbs.set(id, url);
  return url;
}
