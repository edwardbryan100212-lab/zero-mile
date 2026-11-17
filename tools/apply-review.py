#!/usr/bin/env python3
"""One-off: apply the 2026-11-17 design/accessibility review fixes."""
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))

def sub(p, pairs):
    s = open(p).read()
    for a, b in pairs:
        assert a in s, (p, a[:80])
        s = s.replace(a, b)
    open(p, 'w').write(s)

# router: skip link, page titles, focus on route change, photo deletion helper
sub('js/app.js', [
    ("async function route() {\n", "let routed = false;\nasync function route() {\n  if (location.hash && !location.hash.startsWith('#/')) return; // in-page anchors such as #main\n"),
    ("  main.firstElementChild?.classList.add('view-enter');\n  if (!location.hash.includes('#top')) window.scrollTo({ top: 0, behavior: 'instant' });",
     "  main.firstElementChild?.classList.add('view-enter');\n  window.scrollTo({ top: 0, behavior: 'instant' });\n  document.title = (key ? (main.querySelector('h1')?.textContent || 'Zero Mile') + ' · Zero Mile' : 'Zero Mile · grow your own food');\n  if (routed) main.focus({ preventScroll: true });\n  routed = true;"),
    ("addEventListener('hashchange', route);", "addEventListener('hashchange', route);\n$('.skip').addEventListener('click', (e) => { e.preventDefault(); $('#main').focus(); });"),
    ("export async function getPhoto(key)", "export async function delPhoto(key) { const d = await db(); return new Promise((res) => { const t = d.transaction('photos', 'readwrite'); t.objectStore('photos').delete(key); t.oncomplete = res; t.onerror = res; }); }\nexport async function getPhoto(key)"),
])

s = open('css/app.css').read()
s = s.replace("  .story-step { grid-area: auto; visibility: visible; opacity: 1; transform: none; margin-top: 24px; }",
              "  .story-step { grid-area: auto; visibility: visible; opacity: 1; transform: none; margin-top: 24px; }\n  .story-pin { align-items: start; }\n  .story-stage { position: sticky; top: 88px; }")
s += """
/* review fixes */
.bar :focus-visible, .tabs :focus-visible, .foot-sec :focus-visible, .ritual :focus-visible, .pot-stage :focus-visible, .menu-sec :focus-visible { outline-color: var(--sun); }
.snap:has(#photo:focus-visible) #snap-btn { outline: 3px solid var(--ink); outline-offset: 3px; }
.row span:only-child { white-space: normal; }
.link, .foot-legal a { display: inline-block; padding-block: 10px; }
.sheet li a { padding: 10px 0; }
.blank input, .blank button { height: max(44px, 1.08em); }
.empty { overflow-wrap: anywhere; }
"""
open('css/app.css', 'w').write(s)

sub('js/viewer.js', [
    ("    orbit.enableDamping = true; orbit.enablePan = false; orbit.dampingFactor = .08;",
     "    orbit.enableDamping = true; orbit.enablePan = false; orbit.dampingFactor = .08;\n    // let the page scroll: one finger turns the plant sideways only, the wheel zooms only with ctrl/cmd held\n    renderer.domElement.style.touchAction = 'pan-y'; orbit.enableZoom = false;\n    renderer.domElement.addEventListener('wheel', (e) => { orbit.enableZoom = e.ctrlKey || e.metaKey; }, { capture: true });"),
])

sub('js/home.js', [
    ("  hero.setPlant('tomato', 1);\n", "  hero.setPlant('tomato', 1);\n  const stopSpin = setTimeout(() => hero.setSpin(false), 9000); // one slow turn, then rest\n"),
    ("const q = $('#blank-in').value.trim().toLowerCase();\n    const hit = D.plants.find(", "const q = $('#blank-in').value.trim().toLowerCase();\n    if (!q) { $('#blank-in').focus(); return; }\n    const hit = D.plants.find("),
    ("return { unmount() { removeEventListener('scroll', onScroll);", "return { unmount() { clearTimeout(stopSpin); removeEventListener('scroll', onScroll);"),
])

sub('js/find.js', [
    ('<div class="packets" id="list" aria-live="polite"></div>', '<p class="vh" role="status" id="count"></p>\n    <div class="packets" id="list"></div>'),
    ("  function render() {\n    const q = norm($('#q').value);", "  let countT;\n  function render() {\n    const q = norm($('#q').value);"),
    ("    if (!hits.length) { list.innerHTML = `<p class=\"empty\">No plant called “${esc($('#q').value)}” yet. Try a vegetable, fruit, herb or tree.</p>`; return; }",
     "    clearTimeout(countT); countT = setTimeout(() => { $('#count').textContent = `${hits.length} plant${hits.length === 1 ? '' : 's'}`; }, 300);\n    if (!hits.length) { const lab = GROUPS.find(([k]) => k === group)[1].toLowerCase(); list.innerHTML = group === 'all' ? `<p class=\"empty\">No plant called “${esc($('#q').value)}” yet. Try a vegetable, fruit, herb or tree.</p>` : `<p class=\"empty\">No ${esc(lab)} match “${esc($('#q').value)}”. Try All.</p>`; return; }"),
])

sub('js/garden.js', [
    ("streakOf, putPhoto, getPhoto, toast, updateBar } from './app.js?v=1';", "streakOf, putPhoto, getPhoto, delPhoto, toast, updateBar } from './app.js?v=1';"),
    ('<div class="week" id="week" aria-label="This week’s photos"></div>', '<div class="week" id="week" role="list" aria-label="This week’s photos"></div>'),
    ("  async function render() {\n    const p = plantById(entry.id);", "  let renderId = 0;\n  async function render() {\n    const my = ++renderId;\n    const p = plantById(entry.id);"),
    ("    $$('#tabs [data-id]').forEach((b) => b.addEventListener('click', () => { entry = state.garden.find((e) => e.id === b.dataset.id); state.active = entry.id; save(); drawPot(); render(); }));",
     "    $$('#tabs [data-id]').forEach((b) => b.addEventListener('click', async () => { const id = b.dataset.id; entry = state.garden.find((e) => e.id === id); state.active = id; save(); drawPot(); await render(); $(`#tabs [data-id=\"${id}\"]`)?.focus(); }));"),
    ("return `<div class=\"${l ? 'done' : ''}${d === today() ? ' today' : ''}\" data-day=\"${d}\" title=\"${d}\">${l ? '' : dn}</div>`; }).join('');",
     "return `<div role=\"listitem\" aria-label=\"${dn}${l ? ', photo taken' : ', no photo'}${d === today() ? ', today' : ''}\" class=\"${l ? 'done' : ''}${d === today() ? ' today' : ''}\" data-day=\"${d}\" title=\"${d}\">${l ? '' : dn}</div>`; }).join('');"),
    ("if (l) { const b = await getPhoto(l.key); if (b) el.innerHTML", "if (l) { const b = await getPhoto(l.key); if (my !== renderId) return; if (b) el.innerHTML"),
    ("for (const fig of $$('#strip [data-k]')) { const b = await getPhoto(fig.dataset.k); if (b)", "for (const fig of $$('#strip [data-k]')) { const b = await getPhoto(fig.dataset.k); if (my !== renderId) return; if (b)"),
    ("    let i = 0; const spin = setInterval(() => { fb.innerHTML = `<h2>Looking at your leaves ${SPIN[i++ % SPIN.length]}</h2>`; }, 160);",
     "    fb.setAttribute('aria-busy', 'true'); fb.innerHTML = '<h2>Looking at your leaves <span aria-hidden=\"true\" id=\"spin\"></span></h2>';\n    let i = 0, lastPct = -25; const spin = setInterval(() => { const s = $('#spin'); if (s) s.textContent = SPIN[i++ % SPIN.length]; }, 160);"),
    ("if (pr.status === 'progress' && pr.progress) fb.innerHTML = `<h2>Downloading the smart check ${Math.round(pr.progress)}%</h2><p>This happens once. After that it works offline.</p>`;",
     "if (pr.status === 'progress' && pr.progress && pr.progress - lastPct >= 25) { lastPct = Math.floor(pr.progress / 25) * 25; fb.innerHTML = `<h2>Downloading the smart check ${lastPct}%</h2><p>This happens once. After that it works offline.</p>`; }"),
    ("    const fb = $('#feedback'); fb.hidden = false;\n    const m = res.m;", "    const fb = $('#feedback'); fb.hidden = false; fb.removeAttribute('aria-busy');\n    const m = res.m;"),
    ("      clearInterval(spin);\n      fb.innerHTML = `<h2>That photo didn’t work</h2>", "      clearInterval(spin); fb.removeAttribute('aria-busy');\n      fb.innerHTML = `<h2>That photo didn’t work</h2>"),
    ("  $('#remove').addEventListener('click', () => {\n    if (!confirm(`Remove ${plantById(entry.id).name} and its photo diary from this device?`)) return;",
     "  $('#remove').addEventListener('click', async () => {\n    if (!confirm(`Remove ${plantById(entry.id).name} and its photo diary from this device?`)) return;\n    await Promise.all(entry.log.map((l) => delPhoto(l.key)));"),
])
print('applied')
