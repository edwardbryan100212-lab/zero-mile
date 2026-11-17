// Offline support for the ad site (/) and the app (/app/): files are cached on first visit so Zero Mile works without a connection.
const V = 'zeromile-v6';
const SHELL = [
  // ad site (built in the main session)
  './', 'index.html', 'css/site.css?v=5', 'js/site.js?v=5',
  // app
  'app/', 'app/index.html', 'css/app-ui.css?v=5',
  'js/app.js?v=5', 'js/core.js?v=5', 'js/garden.js?v=5', 'js/find.js?v=5', 'js/impact.js?v=5', 'js/sources.js?v=5',
  'js/viewer.js?v=5', 'js/fluted.js?v=5', 'js/models.js?v=5', 'js/pot3d.js?v=2', 'js/analyze.js?v=2', 'js/ascii.js?v=2', 'js/fruit3d.js',
  'bg/fluted.html', 'bg/base.png', 'models/manifest.json?v=5', 'models/tomato-harvest.glb', 'vendor/three/addons/loaders/GLTFLoader.js', 'vendor/three/addons/utils/BufferGeometryUtils.js',
  'js/plants3d.js', 'js/plants3d-rng.js', 'js/textures.js',
  'vendor/three/three.module.min.js', 'vendor/three/addons/controls/OrbitControls.js', 'vendor/three/addons/environments/RoomEnvironment.js',
  'data/data.json?v=5', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png',
  'img/plants/tomato.webp', 'img/plants/basil.webp', 'img/plants/lettuce.webp', 'img/plants/strawberry.webp',
];
self.addEventListener('install', (e) => e.waitUntil(caches.open(V).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // the optional smart-check model is cached by Transformers.js itself
  if (u.hostname.includes('huggingface') || u.hostname.includes('hf.co')) return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    if (res.ok && (u.origin === location.origin || u.hostname.endsWith('gstatic.com') || u.hostname.endsWith('googleapis.com') || u.hostname.endsWith('jsdelivr.net'))) {
      const copy = res.clone(); caches.open(V).then((c) => c.put(e.request, copy));
    }
    return res;
  }).catch(() => caches.match(u.pathname.includes('/app/') ? 'app/index.html' : 'index.html'))));
});
