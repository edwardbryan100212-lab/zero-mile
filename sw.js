// Offline support: the app shell, data and pictures are cached on first visit so Zero Mile works without a connection.
const V = 'zeromile-v2';
const SHELL = [
  './', 'index.html', 'css/app.css?v=2', 'js/app.js?v=2', 'js/home.js?v=2', 'js/find.js?v=2', 'js/garden.js?v=2', 'js/sources.js?v=2',
  'js/viewer.js?v=2', 'js/viewer.js', 'js/plants3d.js', 'js/plants3d-rng.js', 'js/textures.js', 'js/pot3d.js?v=2', 'js/analyze.js?v=2', 'js/ascii.js?v=2', 'js/ascii-photos.js?v=2',
  'vendor/three/three.module.js', 'vendor/three/addons/controls/OrbitControls.js', 'vendor/three/addons/environments/RoomEnvironment.js',
  'data/data.json?v=2', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png',
  'img/hero-sunny.png', 'img/tomatoes-board.png', 'img/seedling-hands.png', 'img/raised-beds.png', 'video/sprout-poster.jpg',
];
self.addEventListener('install', (e) => e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())));
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
  }).catch(() => caches.match('index.html'))));
});
