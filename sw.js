// Offline support for the ad site (/) and the app (/app/): files are cached on first visit so Zero Mile works without a connection.
const V = 'zeromile-v16';
const SHELL = [
  // ad site
  './', 'index.html', 'css/site.css?v=13', 'css/scene.css?v=11', 'js/site.js?v=12', 'js/scene.js?v=11', 'css/journey.css?v=2', 'js/journey.js?v=1', 'data/land.json?v=2',
  // app shell and styles
  'app/', 'app/index.html', 'css/tokens.css?v=12', 'css/app-ui.css?v=12', 'css/screens.css?v=12', 'css/dash.css?v=12', 'css/features.css?v=12', 'css/onboard.css?v=12',
  'css/plantpics.css?v=12', 'css/polish-today.css?v=3', 'css/polish-plant.css?v=2', 'css/polish-more.css?v=2', 'css/polish-ui.css?v=1',
  // every screen's code (the router imports these on demand, so offline they must already be here)
  'js/app.js?v=12', 'js/core.js?v=9', 'js/core.js?v=5', 'js/fun.js?v=10', 'js/sound.js?v=10', 'js/art.js?v=9', 'js/face.js', 'js/face.js?v=9', 'js/produce.js?v=9',
  'js/rewards.js?v=9', 'js/rewards-view.js?v=9', 'js/onboard.js?v=9', 'js/garden.js?v=10', 'js/find.js?v=10', 'js/impact.js?v=10', 'js/sources.js?v=9',
  'js/admin.js?v=9', 'js/sow.js?v=9', 'js/timelapse.js?v=9', 'js/care.js?v=10', 'js/weather.js?v=10', 'js/photos.js?v=9', 'js/analyze.js?v=2',
  'js/viewer.js?v=9', 'js/models.js?v=9', 'js/trees3d.js?v=9', 'js/fluted.js?v=9', 'js/herbs3d.js?v=6', 'js/pot3d.js?v=2', 'js/ascii.js?v=2',
  'js/plants3d.js', 'js/plants3d-rng.js', 'js/textures.js', 'js/fruit3d.js',
  'bg/fluted.html', 'bg/base.png', 'models/manifest.json?v=6', 'models/tomato-harvest.glb', 'img/real/credits.json',
  'vendor/three/three.module.min.js', 'vendor/three/addons/controls/OrbitControls.js', 'vendor/three/addons/environments/RoomEnvironment.js',
  'vendor/three/addons/loaders/GLTFLoader.js', 'vendor/three/addons/utils/BufferGeometryUtils.js',
  'data/data.json?v=9', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'img/plants/tomato.webp', 'img/plants/basil.webp', 'img/plants/lettuce.webp', 'img/plants/strawberry.webp',
];
self.addEventListener('install', (e) => e.waitUntil(caches.open(V).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // the optional smart-check model is cached by Transformers.js itself
  if (u.hostname.includes('huggingface') || u.hostname.includes('hf.co')) return;
  const keep = (res) => {
    if (res.ok && (u.origin === location.origin || u.hostname.endsWith('gstatic.com') || u.hostname.endsWith('googleapis.com') || u.hostname.endsWith('jsdelivr.net'))) {
      const copy = res.clone(); caches.open(V).then((c) => c.put(e.request, copy));
    }
    return res;
  };
  // only a page falls back to the app or the ad site; a script or picture that was never saved fails as a network
  // error (an HTML page served as a module is a MIME error, and as a picture a broken image)
  const offline = () => caches.match(e.request).then((hit) => hit || (e.request.mode === 'navigate' ? caches.match(u.pathname.includes('/app/') ? 'app/index.html' : 'index.html') : Response.error()));
  // pages, code, styles and data: always try the network first so a new version shows up at once; the cache is for offline
  const fresh = e.request.mode === 'navigate' || /\.(html|js|css|json|webmanifest)$/.test(u.pathname) || u.pathname.endsWith('/');
  // always revalidate code and pages with the server (the host lets browsers reuse files for 10 minutes otherwise),
  // so a new version shows on the next load; an unchanged file costs only a 304
  if (fresh) { e.respondWith((u.origin === location.origin ? fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(e.request)).then(keep).catch(offline)); return; }
  // pictures, models, fonts: cache first, they rarely change and are versioned
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then(keep)).catch(offline));
});
