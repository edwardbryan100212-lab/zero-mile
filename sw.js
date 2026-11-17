// Offline support for the ad site (/) and the app (/app/): files are cached on first visit so Zero Mile works without a connection.
const V = 'zeromile-v3';
const SHELL = [
  // ad site (built in the main session)
  './', 'index.html', 'css/site.css?v=3', 'js/site.js?v=3',
  // app
  'app/', 'app/index.html', 'css/app-ui.css?v=3',
  'js/app.js?v=3', 'js/core.js?v=3', 'js/garden.js?v=3', 'js/find.js?v=3', 'js/impact.js?v=3', 'js/sources.js?v=3',
  'js/viewer.js?v=3', 'js/ditherbg.js?v=3', 'js/pot3d.js?v=2', 'js/analyze.js?v=2', 'js/ascii.js?v=2',
  'js/plants3d.js', 'js/plants3d-rng.js', 'js/textures.js',
  'vendor/three/three.module.js', 'vendor/three/addons/controls/OrbitControls.js', 'vendor/three/addons/environments/RoomEnvironment.js',
  'data/data.json?v=2', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png',
  'img/px/herbs.png', 'img/px/seedling.png', 'img/px/birch.png',
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
