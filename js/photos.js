// Real photos of each plant (open-licence pictures from Wikimedia Commons / Openverse), stored in img/real/.
// img/real/credits.json: { "<plant id>": [{ file, kind, title, author, license, licenseUrl, url }] }.
// Every picture is optional: pages must work when a plant has none.
import { ROOT } from './core.js?v=9';

let all = null;
export function loadPhotos() {
  if (!all) all = fetch(new URL('img/real/credits.json', ROOT)).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  return all;
}

const withSrc = (id, p) => ({ ...p, id, src: new URL(`img/real/${p.file}`, ROOT).href });

// all photos of one plant, in display order (growing plant first, then the harvest / leaf / flower)
export async function photosFor(id) {
  const m = await loadPhotos();
  return (m[id] || []).map((p) => withSrc(id, p));
}

// the first photo of a kind ('plant', 'harvest', 'leaf', 'flower', 'tree'), or null
export async function photoOf(id, kind) {
  const list = await photosFor(id);
  return list.find((p) => p.kind === kind) || null;
}

// id → src of its main photo, for lists (synchronous once loadPhotos() has resolved)
export async function photoThumbs() {
  const m = await loadPhotos();
  const out = {};
  for (const [id, list] of Object.entries(m)) if (list[0]) out[id] = withSrc(id, list[0]).src;
  return out;
}

// One-line credit, e.g. "Tomato flower" by Jane Doe, CC BY-SA 4.0
export const creditLine = (p) => `“${p.title}” by ${p.author || 'unknown'}, ${p.license}`;

// Flat list of every photo credit, for the About / Sources screen:
// [{ id, file, src, kind, title, author, license, licenseUrl, url, line }]
export async function photoCredits() {
  const m = await loadPhotos();
  return Object.entries(m).flatMap(([id, list]) => list.map((p) => ({ ...withSrc(id, p), line: creditLine(p) })));
}
