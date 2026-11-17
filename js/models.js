// Real 3D models (free CC0 / CC-BY packs, listed in models/manifest.json with credits).
// loadModel(id, 'harvest' | 'plant') → a THREE.Group scaled to `size` metres tall, or null when there is no model
// (callers then fall back to the procedural model in plants3d.js / fruit3d.js).
import * as THREE from 'three';
import { ROOT } from './core.js?v=5';

let manifest, loader;
const cache = new Map();

export async function modelManifest() {
  if (manifest === undefined) {
    manifest = await fetch(new URL('models/manifest.json?v=5', ROOT)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  }
  return manifest;
}

export async function hasModel(id, kind) { const m = await modelManifest(); return !!m?.[id]?.[kind]; }

export async function loadModel(id, kind = 'harvest', { size } = {}) {
  const m = await modelManifest();
  const path = m?.[id]?.[kind];
  if (!path) return null;
  if (!cache.has(path)) {
    cache.set(path, (async () => {
      if (!loader) { const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js'); loader = new GLTFLoader(); }
      const gltf = await loader.loadAsync(new URL(path, ROOT).href);
      const g = gltf.scene;
      g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) o.material.side = THREE.FrontSide; } });
      return g;
    })().catch(() => null));
  }
  const src = await cache.get(path);
  if (!src) return null;
  const g = src.clone(true);
  // stand it on the ground, centred, at a sensible size
  const box = new THREE.Box3().setFromObject(g), s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const wrap = new THREE.Group();
  g.position.set(-c.x, -box.min.y, -c.z);
  wrap.add(g);
  if (size) wrap.scale.setScalar(size / Math.max(s.y, s.x, s.z, 1e-6));
  wrap.userData.model = { id, kind, credit: m[id] };
  return wrap;
}
