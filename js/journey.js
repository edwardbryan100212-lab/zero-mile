// The cancelled journey (DESIGN.md v3): every plant has a shop twin that really travels from somewhere
// (data.json origins[region], cited). Growing and harvesting at home cancels that trip.
// Shared API used by Today, the plant page, Stickers, Impact and the ad site. Owner of this file: the
// "journey-map" session. The sticker and route drawings below are first stubs; keep the signatures.
import { allPlants, state, plantById, trip, esc, fmt } from './core.js?v=9';

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

// STUB: the produce sticker. kind 'home' = "Grown at home · 0 km", 'shop' = "<place> · <km> km"
export function stickerSvg(id, { kind = 'home', size = 96, day, label } = {}) {
  const p = plantById(id), j = journeyOf(id);
  const top = label || (kind === 'home' ? 'Grown at home' : (j?.from.country || 'Shop'));
  const mid = kind === 'home' ? '0 km' : j ? `${fmt(j.km)} km` : '';
  const fill = kind === 'home' ? '#23774a' : '#c8673d';
  return `<svg class="stk stk-${kind}" viewBox="0 0 120 84" width="${size}" height="${Math.round(size * .7)}" role="img" aria-label="${esc(`${p?.name || ''} sticker: ${top}, ${mid}`)}">
    <ellipse cx="60" cy="42" rx="58" ry="40" fill="${fill}"/><ellipse cx="60" cy="42" rx="52" ry="34" fill="none" stroke="#fff" stroke-width="1.5"/>
    <text x="60" y="34" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">${esc(top)}</text>
    <text x="60" y="54" text-anchor="middle" font-size="18" font-weight="800" fill="#fff">${esc(mid)}</text>
    ${day != null ? `<text x="60" y="68" text-anchor="middle" font-size="8" fill="#fff">Day ${day}</text>` : ''}
  </svg>`;
}

// STUB: the route from the twin's origin to home. progress draws the arc, cancel shrinks it into home.
export function routeSvg(id, { w = 320, h = 180, progress = 1, cancel = 0, region = state.region } = {}) {
  const j = journeyOf(id, region); if (!j) return '';
  const X = (lon) => ((lon + 180) / 360) * w, Y = (lat) => ((90 - lat) / 180) * h;
  const a = [X(j.from.lon), Y(j.from.lat)], b = [X(j.to.lon), Y(j.to.lat)];
  const s = [a[0] + (b[0] - a[0]) * cancel, a[1] + (b[1] - a[1]) * cancel];
  const e = [s[0] + (b[0] - s[0]) * progress, s[1] + (b[1] - s[1]) * progress];
  return `<svg class="route" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(`${j.name}: ${j.from.place}, ${j.from.country} to ${j.to.name}, ${fmt(j.km)} km by ${j.mode}`)}">
    <line x1="${s[0]}" y1="${s[1]}" x2="${e[0]}" y2="${e[1]}" stroke="#17221a" stroke-width="2"/>
    <circle cx="${s[0]}" cy="${s[1]}" r="4" fill="#c8673d"/><circle cx="${b[0]}" cy="${b[1]}" r="5" fill="#23774a"/>
  </svg>`;
}

// STUB: the odometer. Rolling digits; a plain number until the real one lands.
export function odometer(km = kmCancelled(), { digits = 6 } = {}) {
  const s = String(Math.max(0, Math.round(km))).padStart(digits, '0');
  return `<span class="odo" role="img" aria-label="${fmt(km)} km cancelled">${[...s].map((d) => `<i>${d}</i>`).join('')}<small>km</small></span>`;
}
