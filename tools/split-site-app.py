#!/usr/bin/env python3
"""One-off: split Zero Mile into an ad site (/) and an app (/app/).
js/core.js  = data, state, photo store, helpers (shared)
js/app.js   = the app's router (garden, find, plant, impact, sources)
js/site.js  = the ad site (mounts home.js)"""
import os, re
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
src = open('js/app.js').read()
cut = src.index('// ---------- router ----------')
core = src[:cut]
core = core.replace("document.documentElement.classList.add('js');", "document.documentElement.classList.add('js');\n// the folder above js/, so pages in / and /app/ find the same files\nexport const ROOT = new URL('../', import.meta.url);")
core = core.replace("fetch('data/data.json?v=2')", "fetch(new URL('data/data.json?v=2', ROOT))")
core = core.replace("// Zero Mile: router, saved state and shared helpers.", "// Zero Mile: saved state and shared helpers, used by the ad site and the app.")
# the bar updater lives in core so garden/find can call it on either page
router = src[cut:]
m = re.search(r"export function updateBar\(\) \{.*?\n\}\n", router, re.S)
core += "\n" + m.group(0)
router = router.replace(m.group(0), '')
core = core.replace("  const btn = $('#bar-streak');\n", "  const btn = $('#bar-streak');\n  if (!btn) return;\n")
open('js/core.js', 'w').write(core)

app = "// Zero Mile app: the router for the daily-use screens.\nimport { $, $$, data, state, rise, updateBar, ROOT } from './core.js?v=2';\n\n" + router
app = app.replace("  '': () => import('./home.js?v=2'),\n", "  '': () => import('./garden.js?v=2'),\n  impact: () => import('./impact.js?v=2'),\n")
app = app.replace("  const navKey = key === 'plant' ? 'find' : key || 'home';", "  const navKey = key === 'plant' ? 'find' : key || 'garden';")
app = app.replace("  document.body.dataset.view = key || 'home';", "  document.body.dataset.view = key || 'garden';")
app = app.replace("document.title = (key ? (main.querySelector('h1')?.textContent || 'Zero Mile') + ' · Zero Mile' : 'Zero Mile · grow your own food');", "document.title = (main.querySelector('h1')?.textContent || 'My garden') + ' · Zero Mile';")
app = app.replace("navigator.serviceWorker.register('sw.js')", "navigator.serviceWorker.register(new URL('sw.js', ROOT), { scope: ROOT.pathname })")
app = app.replace("addEventListener('scroll', () => $('#bar').classList.toggle('solid', scrollY > innerHeight * .6), { passive: true });\n", '')
open('js/app.js', 'w').write(app)

for f in ['js/home.js', 'js/find.js', 'js/garden.js', 'js/sources.js']:
    s = open(f).read().replace("from './app.js?v=2'", "from './core.js?v=2'")
    open(f, 'w').write(s)
print('split ok')
