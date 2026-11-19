// The cancelled journey (DESIGN.md v3): every plant has a shop twin that really travels from somewhere
// (data.json origins[region], cited). Growing and harvesting at home cancels that trip.
// Shared API used by Today, the plant page, Stickers, Impact and the ad site. Owner of this file: the
// "journey-map" session. Keep the signatures: other screens call them.
//
//   journeyOf(id, region)            the shop twin: from, to, km, mode, share, year, sources
//   kmCancelled(garden)              one shop trip (straight-line km) per harvest logged
//   journeyRanks(region), nextJourney(km)
//   routeSvg(id, { w, h, progress, cancel, region, crop })   one twin route on a dotted world map
//   routesSvg(ids, { w, h, region, crop, progress, cancel, labels })  many routes into home
//   routeAnimate(svgEl, { progress, cancel, ms })            plays a drawn route (draw in, or cancel into home)
//   stickerSvg(id, { kind, size, day, label, tilt })         the PLU-style produce sticker
//   odometer(km, { digits }), odometerRoll(el, from, to)     rolling mechanical digits
//
// The world map's land comes from Natural Earth 110m (public domain), rasterised by tools/build-land.mjs.
import { allPlants, state, plantById, trip, esc, fmt, ROOT } from './core.js?v=9';
import { produceIcon } from './produce.js?v=9';

// ---------- the shop twin ----------

// The shop twin of one plant for a region, or null when there is no origin with coordinates
export function journeyOf(id, region = state.region) {
  const p = plantById(id); const t = p && trip(p, region); if (!t) return null;
  const o = t.o;
  return {
    id, name: p.name,
    from: { place: o.origin_place || o.origin_country, country: o.origin_country, lat: o.origin_lat, lon: o.origin_lon },
    to: { name: t.reg.dest.name, lat: t.reg.dest.lat, lon: t.reg.dest.lon },
    km: Math.round(t.crowKm), routeKm: Math.round(t.routeKm), mode: o.transport_mode || 'road',
    sharePct: o.share_pct, year: o.year, home: o.source_type === 'domestic', confidence: o.confidence,
    co2PerKg: t.co2Transport, sources: o.sources || [],
  };
}

// km cancelled: one shop trip (straight line, like Impact's miles) for every harvest you log
export function kmCancelled(garden = state.garden) {
  let n = 0;
  for (const e of garden) { const j = journeyOf(e.id); if (j) n += j.km * (e.harvests || []).length; }
  return n;
}

// Real journeys as ranks: the next route (from the data) longer than what you have cancelled so far
export function journeyRanks(region = state.region) {
  const seen = new Map();
  for (const p of allPlants()) { const j = journeyOf(p.id, region); if (j && j.km > 0 && !seen.has(j.from.place)) seen.set(j.from.place, j); }
  return [...seen.values()].sort((a, b) => a.km - b.km);
}
export const nextJourney = (km = kmCancelled()) => journeyRanks().find((j) => j.km > km) || null;

// Short names for labels: "Westland, South Holland" + Netherlands -> "Westland, Netherlands";
// "the US centre of population (Hartville, Missouri)" -> "Hartville, Missouri"
export function placeLabel(j) {
  if (!j) return '';
  const first = String(j.from.place || '').replace(/\s*\([^)]*\)/g, '').split(',')[0].trim();
  if (!first || first === j.from.country) return j.from.country || '';
  return `${first}, ${j.from.country}`;
}
export const homeLabel = (j) => { const n = String(j?.to.name || ''); const m = n.match(/\(([^)]+)\)/); return (m ? m[1] : n).replace(/^the /i, ''); };

// ---------- the land mask (data/land.json, made by tools/build-land.mjs) ----------
let LAND = null;
try {
  const L = await fetch(new URL('data/land.json?v=2', ROOT)).then((r) => r.json());
  const g = new Uint8Array(L.cols * L.rows);
  L.r.forEach((runs, r) => { let c = 0, land = false; for (const n of runs) { if (land) g.fill(1, r * L.cols + c, r * L.cols + c + n); c += n; land = !land; } });
  LAND = { cols: L.cols, rows: L.rows, g };
} catch { LAND = null; } // offline and never cached: the routes still draw, on plain paper
const isLand = (lon, lat) => {
  if (!LAND || lat >= 90 || lat <= -90) return false;
  const c = Math.floor((((lon + 180) % 360 + 360) % 360) / 360 * LAND.cols);
  const r = Math.floor((90 - lat) / 180 * LAND.rows);
  return LAND.g[r * LAND.cols + c] === 1;
};

// ---------- geometry ----------
const R2 = (n) => Math.round(n * 10) / 10;
const rad = Math.PI / 180;
const wrap = (d) => ((d + 540) % 360) - 180;
// points along the great circle from a to b (lon/lat in degrees), longitudes kept continuous
function greatCircle(a, b, n = 64) {
  const v = (p) => [Math.cos(p.lat * rad) * Math.cos(p.lon * rad), Math.cos(p.lat * rad) * Math.sin(p.lon * rad), Math.sin(p.lat * rad)];
  const A = v(a), B = v(b);
  const d = Math.acos(Math.min(1, Math.max(-1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let x, y, z;
    if (d < 1e-6) { x = A[0]; y = A[1]; z = A[2]; } else {
      const s1 = Math.sin((1 - t) * d) / Math.sin(d), s2 = Math.sin(t * d) / Math.sin(d);
      x = s1 * A[0] + s2 * B[0]; y = s1 * A[1] + s2 * B[1]; z = s1 * A[2] + s2 * B[2];
    }
    let lon = Math.atan2(y, x) / rad; const lat = Math.atan2(z, Math.hypot(x, y)) / rad;
    if (out.length) { const pl = out.at(-1).lon; lon = pl + wrap(lon - pl); }
    out.push({ lon, lat });
  }
  return out;
}

// A view: home-centred equirectangular (so every route into home is drawn the short way round),
// with x scaled by cos(latitude) of the crop's middle so close-up crops are not stretched.
// Returns project(lon, lat) -> [x, y] in px and the box in projected degree units.
function makeView(paths, home, { w, h, crop, pad = 0 }) {
  const lon0 = home.lon;
  const pts = paths.flat();
  let k = 1, box;
  const world = { x0: -180, x1: 180, y0: -84, y1: 60 }; // y is -lat: 84N at the top, 60S at the bottom
  if (crop === 'auto' && pts.length) {
    const lats = pts.map((p) => p.lat);
    const mid = (Math.max(...lats) + Math.min(...lats)) / 2;
    k = Math.max(0.35, Math.cos(mid * rad));
    const xs = pts.map((p) => wrap(p.lon - lon0) * k), ys = pts.map((p) => -p.lat);
    let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const r = Math.max(x1 - x0, y1 - y0); const span = r < 3 ? Math.max(r, 7) : Math.max(r, 14, w / 40); // short home-country trips zoom in further
    const m = span * 0.32 + pad;
    x0 -= m; x1 += m; y0 -= m * 1.15; y1 += m * 1.15;
    if (x1 - x0 > 300) { k = 1; box = { ...world }; } else box = { x0, x1, y0, y1 };
  } else box = { ...world };
  // grow the box to the output's aspect ratio (never stretch the map)
  const bw = box.x1 - box.x0, bh = box.y1 - box.y0, want = w / h;
  if (bw / bh < want) { const nw = bh * want, c = (box.x0 + box.x1) / 2; box.x0 = c - nw / 2; box.x1 = c + nw / 2; }
  else { const nh = bw / want, c = (box.y0 + box.y1) / 2; box.y0 = c - nh / 2; box.y1 = c + nh / 2; }
  const s = w / (box.x1 - box.x0);
  const project = (lon, lat) => [((lon - lon0) * k - box.x0) * s, (-lat - box.y0) * s];
  return { project, box, s, k, lon0 };
}

// the dotted land: one path of zero-length round-capped segments, a regular grid on screen
function dotsPath(view, w, h) {
  const { box, s, k, lon0 } = view;
  const across = Math.min(180, Math.max(40, w / 5.2));
  const step = Math.max(0.5, (box.x1 - box.x0) / across); // projected degrees between dots
  const sp = step * s; // px between dots
  let d = '';
  const ox = ((box.x0 % step) + step) % step, oy = ((box.y0 % step) + step) % step;
  for (let gy = box.y0 - oy + step / 2; gy < box.y1; gy += step) {
    const lat = -gy; if (lat < -58) continue; // leave Antarctica off: no shop food comes from there
    for (let gx = box.x0 - ox + step / 2; gx < box.x1; gx += step) {
      if (isLand(lon0 + gx / k, lat)) d += `M${R2((gx - box.x0) * s)} ${R2((gy - box.y0) * s)}h0`;
    }
  }
  return { d, r: Math.max(0.6, sp * 0.28), sp };
}

// a route as projected points with a gentle lift so even a short straight trip reads as a journey arc
function arcPoints(view, from, to) {
  const gc = greatCircle(from, to);
  // unwrap relative to home so the path is continuous and on home's side of the map
  const base = view.lon0 + wrap(gc[0].lon - view.lon0), sh = base - gc[0].lon;
  const P = gc.map((p) => view.project(p.lon + sh, p.lat));
  const [ax, ay] = P[0], [bx, by] = P.at(-1);
  const L = Math.hypot(bx - ax, by - ay) || 1;
  let nx = -(by - ay) / L, ny = (bx - ax) / L; if (ny > 0) { nx = -nx; ny = -ny; } // lift upwards
  return P.map(([x, y], i) => { const t = i / (P.length - 1), b = Math.sin(Math.PI * t) * L * 0.12; return [x + nx * b, y + ny * b]; });
}
const pathD = (P) => 'M' + P.map(([x, y]) => `${R2(x)} ${R2(y)}`).join('L');
// the point a fraction t along a polyline
function along(P, t) {
  const seg = []; let tot = 0;
  for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); seg.push(l); tot += l; }
  let want = Math.min(1, Math.max(0, t)) * tot;
  for (let i = 0; i < seg.length; i++) { if (want <= seg[i] || i === seg.length - 1) { const f = seg[i] ? Math.min(1, want / seg[i]) : 0; return [P[i][0] + (P[i + 1][0] - P[i][0]) * f, P[i][1] + (P[i + 1][1] - P[i][1]) * f]; } want -= seg[i]; }
  return P[0];
}
// the visible part of an arc: from `cancel` (the start shrinks towards home) to `progress` (the end drawn in)
const dash = (progress, cancel) => { const a = Math.min(1, Math.max(0, cancel)), b = Math.max(a, Math.min(1, progress)); return { a, b, arr: `${R2((b - a) * 1000)} 2000`, off: R2(-a * 1000) }; };

// a label placed above or below a dot, kept inside the box
function label(x, y, text, fs, w, h, where, cls) {
  const tw = text.length * fs * 0.56;
  const tx = Math.min(w - tw / 2 - 4, Math.max(tw / 2 + 4, x));
  const ty = where === 'above' ? y - fs * 0.9 : y + fs * 1.6;
  return `<text class="${cls}" x="${R2(tx)}" y="${R2(Math.min(h - 4, Math.max(fs + 2, ty)))}" text-anchor="middle" font-size="${R2(fs)}">${esc(text)}</text>`;
}

const MODE_WORD = { road: 'by lorry', 'road+ferry': 'by lorry and ferry', sea: 'by ship', 'sea+road': 'by ship and lorry', air: 'by plane', 'rail+road': 'by train and lorry' };
export const modeWord = (m) => MODE_WORD[m] || (m ? `by ${String(m).replace('+', ' and ')}` : '');

// ---------- routeSvg: one twin route ----------
export function routeSvg(id, { w = 320, h = 180, progress = 1, cancel = 0, region = state.region, crop = false } = {}) {
  const j = journeyOf(id, region); if (!j) return '';
  const fs = Math.max(9, Math.min(15, w / 24));
  const from = { lon: j.from.lon, lat: j.from.lat }, to = { lon: j.to.lon, lat: j.to.lat };
  const view = makeView([greatCircle(from, to)], to, { w, h, crop, pad: crop === 'auto' ? 1.5 : 0 });
  const dots = dotsPath(view, w, h);
  const P = arcPoints(view, from, to);
  const [ox, oy] = P[0], [hx, hy] = P.at(-1);
  const dd = dash(progress, cancel);
  const [sx, sy] = along(P, dd.a);
  const sw = Math.max(1.6, w / 200);
  const homeR = Math.max(4, w / 90) * (1 + dd.a * 0.35);
  const fromAbove = oy <= hy;
  const place = placeLabel(j), home = homeLabel(j);
  const aria = `${j.name}: the shop twin comes from ${place} to ${home}, ${fmt(j.km)} km ${modeWord(j.mode)}${dd.a >= 1 ? ', cancelled' : ''}.`;
  return `<svg class="route${dd.a >= 1 ? ' is-cancelled' : ''}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(aria)}" data-id="${esc(id)}" preserveAspectRatio="xMidYMid meet">
    <path class="rt-land" d="${dots.d}" stroke-width="${R2(dots.r * 2)}"/>
    <g class="rt-arc" data-id="${esc(id)}">
      <path class="rt-line" d="${pathD(P)}" pathLength="1000" stroke-width="${R2(sw)}" stroke-dasharray="${dd.arr}" stroke-dashoffset="${dd.off}"/>
      <circle class="rt-from" cx="${R2(sx)}" cy="${R2(sy)}" r="${R2(homeR * 0.8)}" opacity="${dd.a >= 1 ? 0 : 1}"/>
    </g>
    <circle class="rt-home" cx="${R2(hx)}" cy="${R2(hy)}" r="${R2(homeR)}"/>
    <g class="rt-labels">
      <g class="rt-lab-from" opacity="${R2(1 - dd.a * 0.55)}">${label(ox, oy, place, fs, w, h, fromAbove ? 'above' : 'below', 'rt-t rt-t-from')}</g>
      ${label(hx, hy, home, fs, w, h, fromAbove ? 'below' : 'above', 'rt-t rt-t-home')}
    </g>
  </svg>`;
}

// ---------- routesSvg: many twin routes flying into home ----------
export function routesSvg(ids, { w = 640, h = 320, region = state.region, crop = 'auto', progress = 1, cancel = 0, labels = true } = {}) {
  const js = [...new Set(ids)].map((id) => journeyOf(id, region)).filter(Boolean);
  if (!js.length) return '';
  const to = { lon: js[0].to.lon, lat: js[0].to.lat };
  const gcs = js.map((j) => greatCircle({ lon: j.from.lon, lat: j.from.lat }, to));
  const view = makeView(gcs, to, { w, h, crop, pad: 2 });
  const dots = dotsPath(view, w, h);
  const fs = Math.max(9, Math.min(15, w / 34));
  const sw = Math.max(1.2, w / 320);
  const dd = dash(progress, cancel);
  const homeR = Math.max(4.5, w / 100);
  let hx = 0, hy = 0, arcs = '', below = 0; // below: origins under home, so the home label goes on top
  js.forEach((j, i) => {
    const P = arcPoints(view, { lon: j.from.lon, lat: j.from.lat }, to);
    [hx, hy] = P.at(-1); if (P[0][1] > hy) below++;
    const [sx, sy] = along(P, dd.a);
    arcs += `<g class="rt-arc" data-id="${esc(j.id)}" style="--i:${i}"><title>${esc(`${j.name}: ${placeLabel(j)}, ${fmt(j.km)} km`)}</title>
      <path class="rt-line" d="${pathD(P)}" pathLength="1000" stroke-width="${R2(sw)}" stroke-dasharray="${dd.arr}" stroke-dashoffset="${dd.off}"/>
      <circle class="rt-from" cx="${R2(sx)}" cy="${R2(sy)}" r="${R2(homeR * 0.62)}" opacity="${dd.a >= 1 ? 0 : 1}"/></g>`;
  });
  const total = js.reduce((s, j) => s + j.km, 0);
  const aria = `${js.length} shop journeys into ${homeLabel(js[0])}, ${fmt(total)} km in all: ${js.map((j) => `${j.name} from ${placeLabel(j)}, ${fmt(j.km)} km`).join('; ')}.`;
  return `<svg class="route routes" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(aria)}" preserveAspectRatio="xMidYMid meet">
    <path class="rt-land" d="${dots.d}" stroke-width="${R2(dots.r * 2)}"/>
    ${arcs}
    <circle class="rt-home" cx="${R2(hx)}" cy="${R2(hy)}" r="${R2(homeR)}"/>
    ${labels ? `<g class="rt-labels">${label(hx, hy, homeLabel(js[0]), fs, w, h, below > js.length / 2 ? 'above' : 'below', 'rt-t rt-t-home')}</g>` : ''}
  </svg>`;
}

// Play a route drawn by routeSvg/routesSvg (or one .rt-arc inside it): animate `progress` and/or `cancel`
// between [from, to] values over ms. Uses stroke-dashoffset and the origin dot only; resolves when done.
export function routeAnimate(el, { progress, cancel, ms = 1200, ease = (t) => 1 - Math.pow(1 - t, 3) } = {}) {
  const arcs = el?.matches?.('.rt-arc') ? [el] : [...(el?.querySelectorAll?.('.rt-arc') || [])];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const P = Array.isArray(progress) ? progress : [progress ?? 1, progress ?? 1];
  const C = Array.isArray(cancel) ? cancel : [cancel ?? 0, cancel ?? 0];
  const svg = el?.closest?.('svg') || el;
  const set = (t) => {
    const p = P[0] + (P[1] - P[0]) * t, c = C[0] + (C[1] - C[0]) * t, d = dash(p, c);
    for (const g of arcs) {
      const line = g.querySelector('.rt-line'), dot = g.querySelector('.rt-from');
      line.setAttribute('stroke-dasharray', d.arr); line.setAttribute('stroke-dashoffset', d.off);
      if (dot && line.getTotalLength) {
        const L = line.getTotalLength(), pt = line.getPointAtLength(L * d.a);
        dot.setAttribute('cx', R2(pt.x)); dot.setAttribute('cy', R2(pt.y)); dot.setAttribute('opacity', d.a >= 0.999 ? 0 : 1);
      }
    }
    const lab = svg?.querySelector?.('.rt-lab-from'); if (lab) lab.setAttribute('opacity', R2(1 - d.a * 0.55));
    svg?.classList?.toggle('is-cancelled', d.a >= 0.999);
  };
  if (reduce || ms <= 0) { set(1); return Promise.resolve(); }
  return new Promise((res) => {
    const t0 = performance.now();
    const tick = (now) => { const t = Math.min(1, (now - t0) / ms); set(ease(t)); if (t < 1) requestAnimationFrame(tick); else res(); };
    requestAnimationFrame(tick);
  });
}

// ---------- stickerSvg: the PLU-style produce sticker ----------
const hash = (s) => { let x = 2166136261; for (const ch of String(s)) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };
const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const isGreen = (hex) => { const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return g > r && g > b; };
const darken = (hex, f) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0')).join('');
const COLOUR = new Map();
// The plant's produce colour: the body fill of its symbol in js/produce.js (its first non-leaf, non-highlight
// colour), darkened until white text on it has at least 3:1 contrast (bold sticker text).
export function produceColour(id) {
  if (COLOUR.has(id)) return COLOUR.get(id);
  const p = plantById(id);
  const fills = [...produceIcon(id, { group: p?.group }).matchAll(/fill="(#[0-9a-fA-F]{6})"/g)].map((m) => m[1].toLowerCase()).filter((c) => c !== '#ffffff');
  let c = fills.find((x) => !isGreen(x)) || fills[0] || '#23774a';
  if (p?.group === 'tree' && !fills.some((x) => !isGreen(x) && x !== '#7a5638' && x !== '#a07650')) c = fills.find(isGreen) || '#23774a'; // woodland trees: their leaf
  for (let i = 0; i < 12 && (1.05 / (lum(c) + 0.05)) < 3; i++) c = darken(c, 0.88);
  COLOUR.set(id, c);
  return c;
}
const shortCountry = (s) => ({ 'United Kingdom': 'UK', 'United States': 'USA', 'Netherlands': 'NL', 'Dominican Republic': 'Dominican Rep.' }[s] || s);
// a stable 4-digit code for a plant's shop sticker (a Zero Mile serial, not a real PLU number)
export const stickerCode = (id) => String(1000 + (hash('zm' + id) % 9000));
let SID = 0;

export function stickerSvg(id, { kind = 'home', size = 96, day, label, tilt = false } = {}) {
  const p = plantById(id), j = kind === 'shop' ? journeyOf(id) : null;
  const tree = p?.group === 'tree';
  const name = p?.name || label || '';
  // the sticker shape in a padded box so a tilt never clips: oval 120x84 (round 96x96 for trees)
  const W = tree ? 108 : 132, H = tree ? 108 : 96, cx = W / 2, cy = H / 2, rx = tree ? 48 : 60, ry = tree ? 48 : 42;
  const rot = tilt ? ((hash(`${id}|${kind}|${day ?? ''}`) % 1300) / 100 - 6.5) : 0;
  const small = size < 72;
  const height = Math.round(size * H / W);
  const g = rot ? ` transform="rotate(${R2(rot)} ${cx} ${cy})"` : '';
  if (kind === 'empty') {
    const aria = label ? `Empty sticker space: ${label}` : `Empty sticker space${name ? ` for ${name}` : ''}`;
    return `<svg class="stk stk-empty${tree ? ' stk-round' : ''}" viewBox="0 0 ${W} ${H}" width="${size}" height="${height}" role="img" aria-label="${esc(aria)}"><g${g}>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="currentColor" stroke-width="${small ? 2.6 : 1.8}" stroke-dasharray="${small ? '5 4' : '4 3.5'}" stroke-linecap="round" opacity=".42"/>
      ${!small && name ? `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="11" font-weight="800" fill="currentColor" opacity=".45" font-family="var(--f-ui, Nunito, sans-serif)">${esc(fit(name, tree ? 13 : 16))}</text>` : ''}
    </g></svg>`;
  }
  const fill = produceColour(id);
  const home = kind !== 'shop';
  const big = home ? '0 km' : j ? `${fmt(j.km)} km` : '? km';
  const top = home ? 'GROWN AT HOME' : j ? (placeLabel(j).split(',')[0] || j.from.country).toUpperCase() : 'SHOP';
  const sub = home ? name.toUpperCase() : j ? shortCountry(j.from.country).toUpperCase() : name.toUpperCase();
  const foot = home ? (day != null ? `DAY ${day}` : 'ZERO MILE') : `#${stickerCode(id)}`;
  const aria = home
    ? `${name} sticker: grown at home, 0 km${day != null ? `, day ${day}` : ''}`
    : `${name} shop sticker: ${j ? `${placeLabel(j)}, ${fmt(j.km)} km` : 'origin unknown'}, code ${stickerCode(id)}`;
  const ring = `<ellipse cx="${cx}" cy="${cy}" rx="${rx - (small ? 6 : 5)}" ry="${ry - (small ? 6 : 5)}" fill="none" stroke="#fff" stroke-width="${small ? 2.2 : 1.3}"/>`;
  const head = `font-family="var(--f-head, 'Bricolage Grotesque', sans-serif)"`, ui = `font-family="var(--f-ui, Nunito, sans-serif)"`;
  let inner;
  if (small) {
    // 48 to 71px: one big line and the ring, nothing too small to read
    inner = `<text x="${cx}" y="${cy + 9}" text-anchor="middle" font-size="${tree ? (big.length > 6 ? 16 : big.length > 4 ? 20 : 24) : (big.length > 6 ? 19 : 27)}" font-weight="800" fill="#fff" ${head}>${esc(big)}</text>`;
  } else {
    const id1 = `stk-a${++SID}`, id2 = `stk-b${SID}`;
    const ar = rx - (tree ? 12 : 16), br = ry - (tree ? 12 : 16), cr = rx - 11, dr = ry - 10; // the curves the top and bottom words sit on
    const topArc = `M${cx - ar} ${cy}A${ar} ${br} 0 0 1 ${cx + ar} ${cy}`;
    const botArc = `M${cx - cr} ${cy}A${cr} ${dr} 0 0 0 ${cx + cr} ${cy}`;
    const topT = fit(top, tree ? 16 : 18);
    const bigFs = tree ? (big.length > 7 ? 15 : big.length > 5 ? 18 : 22) : big.length > 7 ? 20 : big.length > 5 ? 23 : 27;
    const subT = fit(sub, tree ? 12 : 15);
    inner = `<defs><path id="${id1}" d="${topArc}"/><path id="${id2}" d="${botArc}"/></defs>
      <text font-size="${tree ? (topT.length > 12 ? 7.4 : 8.2) : topT.length > 14 ? 8.6 : 9.6}" font-weight="800" fill="#fff" letter-spacing=".6" ${ui}><textPath href="#${id1}" startOffset="50%" text-anchor="middle">${esc(topT)}</textPath></text>
      <text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="${bigFs}" font-weight="700" fill="#fff" ${head}>${esc(big)}</text>
      <text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="${subT.length > 11 ? 8 : 9}" font-weight="800" fill="#fff" letter-spacing=".4" ${ui}>${esc(subT)}</text>
      <text font-size="8" font-weight="800" fill="#fff" letter-spacing=".8" ${ui}><textPath href="#${id2}" startOffset="50%" text-anchor="middle">${esc(foot)}</textPath></text>`;
  }
  return `<svg class="stk stk-${home ? 'home' : 'shop'}${tree ? ' stk-round' : ''}" viewBox="0 0 ${W} ${H}" width="${size}" height="${height}" role="img" aria-label="${esc(aria)}"><g${g}>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"/>${ring}${inner}
  </g></svg>`;
}
// shorten to n characters on a word boundary, with an ellipsis
function fit(s, n) { s = String(s); if (s.length <= n) return s; const cut = s.slice(0, n - 1); const sp = cut.lastIndexOf(' '); return (sp > n * 0.5 ? cut.slice(0, sp) : cut).trim() + '…'; }

// ---------- the odometer ----------
// Mechanical rolling digits: each digit is a column of 0-9 moved with transform only (see css/journey.css).
const COL = '<span class="odo-col" aria-hidden="true">' + [...'0123456789'].map((d) => `<span>${d}</span>`).join('') + '</span>';
export function odometer(km = kmCancelled(), { digits = 6 } = {}) {
  const v = Math.max(0, Math.round(km));
  const s = String(v).padStart(digits, '0');
  const lead = s.length - String(v).length;
  return `<span class="odo" role="img" aria-label="${fmt(v)} km cancelled" data-km="${v}" data-digits="${s.length}"><span class="odo-win">${[...s].map((d, i) => `<span class="odo-d${i < lead ? ' lead' : ''}" style="--d:${d}">${COL}</span>`).join('')}</span><small class="odo-u">km</small></span>`;
}
// Roll an odometer element (the .odo span, or anything containing one) from one value to another.
// With reduced motion it jumps to the value. Resolves when the digits have settled.
export function odometerRoll(el, from, to) {
  const o = el?.classList?.contains('odo') ? el : el?.querySelector?.('.odo'); if (!o) return Promise.resolve();
  const n = +o.dataset.digits || 6;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const put = (v) => {
    const s = String(Math.max(0, Math.round(v))).padStart(n, '0').slice(-n), lead = n - String(Math.max(0, Math.round(v))).length;
    [...o.querySelectorAll('.odo-d')].forEach((d, i) => { d.style.setProperty('--d', s[i]); d.classList.toggle('lead', i < lead); });
  };
  o.classList.add('odo-still'); put(from); void o.offsetWidth; o.classList.remove('odo-still');
  o.setAttribute('aria-label', `${fmt(Math.round(to))} km cancelled`); o.dataset.km = Math.round(to);
  if (reduce) { o.classList.add('odo-still'); put(to); return Promise.resolve(); }
  o.classList.add('odo-rolling'); put(to);
  return new Promise((res) => setTimeout(() => { o.classList.remove('odo-rolling'); res(); }, 1500));
}
