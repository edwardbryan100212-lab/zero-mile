// Build data/land.json: the land mask for the dotted world map in js/journey.js.
// Source: Natural Earth 110m land (public domain, naturalearthdata.com) via the world-atlas@2 TopoJSON on jsDelivr.
// Usage: node tools/build-land.mjs            (fetches once, writes data/land.json)
//
// Output: an equirectangular grid of COLS x ROWS cells (1 degree each), row 0 = 89.5N, col 0 = 179.5W.
// Each row is run-length coded: [water, land, water, land, ...] cell counts that add up to COLS.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json';
const COLS = 360, ROWS = 180;
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'land.json');

const topo = await (await fetch(SRC)).json();
const { scale: [sx, sy], translate: [tx, ty] } = topo.transform;
// decode the delta-encoded, quantised arcs into lon/lat points
const arcs = topo.arcs.map((a) => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
const arcPts = (i) => (i < 0 ? arcs[~i].slice().reverse() : arcs[i]);
const ring = (ids) => { const pts = []; for (const i of ids) { const a = arcPts(i); pts.push(...(pts.length ? a.slice(1) : a)); } return pts; };

// Rings that cross the antimeridian (Fiji, Chukotka, Antarctica) jump by 360 degrees: make their longitudes
// continuous, and close a ring that goes all the way round (Antarctica) along the pole.
function unwrap(pts) {
  const o = [pts[0].slice()];
  for (let i = 1; i < pts.length; i++) {
    let x = pts[i][0]; const px = o[i - 1][0];
    while (x - px > 180) x -= 360; while (px - x > 180) x += 360;
    o.push([x, pts[i][1]]);
  }
  const shift = o.at(-1)[0] - o[0][0];
  if (Math.abs(shift) > 180) { const pole = o.reduce((s, p) => s + p[1], 0) < 0 ? -90 : 90; o.push([o.at(-1)[0], pole], [o[0][0], pole]); }
  return o;
}
const rings = [];
for (const g of topo.objects.land.geometries) {
  const polys = g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : [];
  for (const poly of polys) for (const r of poly) rings.push(unwrap(ring(r)));
}

// even-odd point in polygon over every ring (holes such as the Caspian come out as water)
function inside(lon, lat) { return [0, -360, 360].some((s) => parity(lon + s, lat)); }
function parity(lon, lat) {
  let c = false;
  for (const r of rings) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j];
      if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c;
    }
  }
  return c;
}

const rows = [];
let landCells = 0;
for (let r = 0; r < ROWS; r++) {
  const lat = 90 - (r + 0.5) * (180 / ROWS);
  const runs = []; let cur = false, n = 0;
  for (let c = 0; c < COLS; c++) {
    const v = inside(-180 + (c + 0.5) * (360 / COLS), lat);
    if (v) landCells++;
    if (v === cur) n++; else { runs.push(n); cur = v; n = 1; }
  }
  runs.push(n);
  if (!cur) { /* a trailing water run is implied */ runs.pop(); }
  rows.push(runs);
}

const json = {
  source: 'Natural Earth 110m land (public domain), via world-atlas@2.0.2 land-110m.json',
  url: 'https://www.naturalearthdata.com/',
  cols: COLS, rows: ROWS,
  note: 'Equirectangular 1-degree grid. Row 0 is 89.5N, column 0 is 179.5W. Each row: alternating water, land run lengths.',
  r: rows,
};
fs.writeFileSync(out, JSON.stringify(json));
console.log(`wrote ${out}: ${fs.statSync(out).size} bytes, ${landCells} land cells of ${COLS * ROWS}`);
