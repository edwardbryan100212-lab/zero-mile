// Zero Mile: local weather advice from the free Open-Meteo forecast (no key, fetched in the browser).
// Location: the capital of your region by default, or "Use my location" (rounded to 2 decimals, about 1 km,
// before it is stored or sent). The forecast is cached for 3 hours in localStorage; offline it shows the cached
// forecast or nothing. Every function here fails safe: on any error the weather simply isn't shown.
import { state, save, esc, today } from './core.js?v=9';

// ---------- glyphs: one filled family on a 24 grid, currentColor (used by care, sow and the time-lapse too) ----------
const G = {
  sun: '<circle cx="12" cy="12" r="4.6"/><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M5.4 18.6 7 17M17 7l1.6-1.6"/></g>',
  part: '<circle cx="9" cy="8.6" r="3.8"/><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 1.8v1.4M2.2 8.6h1.4M4.2 3.8l1 1M13.8 3.8l-1 1"/></g><path d="M8.5 20.5a4 4 0 0 1-.4-7.98A5.4 5.4 0 0 1 18.4 12a4.25 4.25 0 0 1-.4 8.5z"/>',
  cloud: '<path d="M7 19a4.6 4.6 0 0 1-.55-9.17A6.1 6.1 0 0 1 18 9.4 4.8 4.8 0 0 1 17.6 19z"/>',
  rain: '<path d="M7 15a4.4 4.4 0 0 1-.5-8.77A5.9 5.9 0 0 1 17.7 6a4.5 4.5 0 0 1-.3 9z"/><g fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M8 17.6 7 20.4M12.4 17.6l-1 2.8M16.8 17.6l-1 2.8"/></g>',
  storm: '<path d="M7 14a4.4 4.4 0 0 1-.5-8.77A5.9 5.9 0 0 1 17.7 5a4.5 4.5 0 0 1-.3 9z"/><path d="M12.6 14.4 9.8 18.6h2.6l-1.2 3.6 3.6-5h-2.6l1.4-2.8z"/>',
  snow: '<g fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.6 4.4 12 6.4l2.4-2M9.6 19.6 12 17.6l2.4 2"/></g>',
  fog: '<g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 8h12M7 12h13M4 16h11M9 20h8"/></g>',
  wind: '<g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 9h11.5a3 3 0 1 0-3-3M3 14h15.5a3 3 0 1 1-3 3M3 18.5h7"/></g>',
  frost: '<g fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.6 4.4 12 6.4l2.4-2M9.6 19.6 12 17.6l2.4 2"/></g>',
  heat: '<path d="M10 3.2a2.6 2.6 0 0 1 5.2 0v9.3a5 5 0 1 1-5.2 0z"/><circle cx="12.6" cy="16.8" r="2" fill="var(--glyph-hole, #fff)"/>',
  drop: '<path d="M12 2.6c-.4 0-.8.2-1 .6C9 6.6 5.6 10.9 5.6 14.6a6.4 6.4 0 0 0 12.8 0c0-3.7-3.4-8-5.4-11.4-.2-.4-.6-.6-1-.6z"/>',
  feed: '<path d="M9.5 2.5h5v3l1.6 2.2a3 3 0 0 1 .6 1.8V19a2.5 2.5 0 0 1-2.5 2.5h-4.4A2.5 2.5 0 0 1 7.3 19V9.5a3 3 0 0 1 .6-1.8L9.5 5.5z"/><path d="M12 11.2c1.6 1.4 2 2.6 1.3 3.8-.6 1-2 1-2.6 0-.7-1.2-.3-2.4 1.3-3.8z" fill="var(--glyph-hole, #fff)"/>',
  pinch: '<path d="M5.6 3.4a1.4 1.4 0 0 1 2.3-.2l4.1 5.6 4.1-5.6a1.4 1.4 0 0 1 2.3 1.6l-4.6 7 1.9 2.9a3.6 3.6 0 1 1-2.3 1.6L12 14.1l-1.4 2.2a3.6 3.6 0 1 1-2.3-1.6l1.9-2.9-4.6-7a1.4 1.4 0 0 1 0-1.4zM7.2 16.6a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2zm9.6 0a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z"/>',
  basket: '<path d="M8.4 9.4 11 3.6a1.1 1.1 0 0 1 2 .9L10.8 9.4h2.4L11 4.5a1.1 1.1 0 0 1 2-.9l2.6 5.8H20a1.2 1.2 0 0 1 1.2 1.5l-2 8.2a2.4 2.4 0 0 1-2.3 1.9H7.1a2.4 2.4 0 0 1-2.3-1.9l-2-8.2A1.2 1.2 0 0 1 4 9.4z"/>',
  camera: '<path d="M8.6 4.6A1.6 1.6 0 0 1 10 3.8h4a1.6 1.6 0 0 1 1.4.8l.8 1.4h2.6A2.6 2.6 0 0 1 21.4 8.6v9a2.6 2.6 0 0 1-2.6 2.6H5.2a2.6 2.6 0 0 1-2.6-2.6v-9A2.6 2.6 0 0 1 5.2 6h2.6z"/><circle cx="12" cy="12.8" r="3.6" fill="var(--glyph-hole, #fff)"/>',
  stake: '<rect x="11" y="2.4" width="2.6" height="19.2" rx="1.3"/><path d="M10.6 7.6c-3.4-.4-5.6 1.2-6.2 4 3 .5 5.2-.6 6.2-2.6zM14 12.4c3.4-.4 5.6 1.2 6.2 4-3 .5-5.2-.6-6.2-2.6z"/>',
  shoot: '<path d="M11 21.4V12c0-3.6-2.4-6.6-7-7 .2 4.6 3 7.4 7 7.4M13 21.4v-6.2c0-3 2-5.2 6.4-5.6-.2 3.8-2.6 6-6.4 6"/><rect x="10.8" y="11.4" width="2.4" height="10.2" rx="1.2"/>',
  tree: '<path d="M12 2.4a5.6 5.6 0 0 1 5.4 4.2A4.8 4.8 0 0 1 16.8 16H13.3v4.4a1.3 1.3 0 0 1-2.6 0V16H7.2a4.8 4.8 0 0 1-.6-9.4A5.6 5.6 0 0 1 12 2.4z"/>',
  ring: '<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="3.2"/>',
  check: '<path d="M9.6 17.6a1.3 1.3 0 0 1-.92-.38l-4.4-4.4a1.3 1.3 0 0 1 1.84-1.84l3.48 3.48 8.08-8.08a1.3 1.3 0 0 1 1.84 1.84l-9 9a1.3 1.3 0 0 1-.92.38z"/>',
  chev: '<path d="M8.4 9.4a1.3 1.3 0 0 1 1.84 0L12 11.16l1.76-1.76a1.3 1.3 0 0 1 1.84 1.84l-2.68 2.68a1.3 1.3 0 0 1-1.84 0L8.4 11.24a1.3 1.3 0 0 1 0-1.84z" transform="translate(0 .4) scale(1)"/>',
  play: '<path d="M8.2 4.6a1.4 1.4 0 0 1 2.1-1.2l9.6 7.4a1.5 1.5 0 0 1 0 2.4l-9.6 7.4a1.4 1.4 0 0 1-2.1-1.2z"/>',
  pause: '<rect x="6" y="4" width="4.4" height="16" rx="1.6"/><rect x="13.6" y="4" width="4.4" height="16" rx="1.6"/>',
  layers: '<path d="M12 3.2 21.4 8 12 12.8 2.6 8z"/><path d="M5.2 11.6 12 15.1l6.8-3.5 2.6 1.3-9.4 4.9-9.4-4.9z" opacity=".55"/>',
  video: '<rect x="2.6" y="5.6" width="13.4" height="12.8" rx="2.6"/><path d="M17.4 10.4 21.4 8v8l-4-2.4z"/>',
  pin: '<path d="M12 2.6a7 7 0 0 1 7 7c0 4.6-5 9.6-6.2 11a1.1 1.1 0 0 1-1.6 0C10 19.2 5 14.2 5 9.6a7 7 0 0 1 7-7z"/><circle cx="12" cy="9.6" r="2.6" fill="var(--glyph-hole, #fff)"/>',
  note: '<path d="M15.6 3.4a2.2 2.2 0 0 1 3.1 0l1.9 1.9a2.2 2.2 0 0 1 0 3.1L9.8 19.2l-5.2 1.2 1.2-5.2z"/>',
  close: '<g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></g>',
  seed: '<path d="M12 3c4.2 2.6 6.4 6 6.4 10.2a6.4 6.4 0 0 1-12.8 0C5.6 9 7.8 5.6 12 3z"/><path d="M12 9.4v8.4" fill="none" stroke="var(--glyph-hole, #fff)" stroke-width="1.6" stroke-linecap="round"/>',
  arrowL: '<path d="M14.6 5.4a1.3 1.3 0 0 1 0 1.84L9.84 12l4.76 4.76a1.3 1.3 0 0 1-1.84 1.84l-5.68-5.68a1.3 1.3 0 0 1 0-1.84l5.68-5.68a1.3 1.3 0 0 1 1.84 0z"/>',
  arrowR: '<path d="M9.4 5.4a1.3 1.3 0 0 0 0 1.84L14.16 12 9.4 16.76a1.3 1.3 0 0 0 1.84 1.84l5.68-5.68a1.3 1.3 0 0 0 0-1.84L11.24 5.4a1.3 1.3 0 0 0-1.84 0z"/>',
};
export function glyph(name, size = 20, label = '') {
  const body = G[name] || G.seed;
  return `<svg class="gl" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"'} focusable="false">${body}</svg>`;
}

// ---------- where: the capital of your region, or your own area rounded to ~1 km ----------
const CAPITALS = {
  IE: { name: 'Dublin', lat: 53.35, lon: -6.26 }, UK: { name: 'London', lat: 51.51, lon: -0.13 }, US: { name: 'Washington, DC', lat: 38.91, lon: -77.04 },
  HK: { name: 'Hong Kong', lat: 22.32, lon: 114.17 }, DE: { name: 'Berlin', lat: 52.52, lon: 13.41 }, AU: { name: 'Canberra', lat: -35.28, lon: 149.13 },
};
const r2 = (n) => Math.round(n * 100) / 100;
export function wxPlace() {
  const own = state.wxLoc;
  if (own && Number.isFinite(own.lat) && Number.isFinite(own.lon)) return { name: 'Your area', lat: r2(own.lat), lon: r2(own.lon), mine: true };
  return { ...(CAPITALS[state.region] || CAPITALS.IE), mine: false };
}
// ask the browser for a position once; only the rounded numbers are kept
export function useMyLocation() {
  return new Promise((res) => {
    if (!('geolocation' in navigator)) return res(false);
    navigator.geolocation.getCurrentPosition(
      (p) => { state.wxLoc = { lat: r2(p.coords.latitude), lon: r2(p.coords.longitude) }; save(); res(true); },
      () => res(false), { maximumAge: 36e5, timeout: 12000, enableHighAccuracy: false });
  });
}
export function forgetLocation() { delete state.wxLoc; save(); }

// ---------- the forecast (3 days), cached for 3 hours ----------
const CACHE = 'zeromile:wx';
const TTL = 3 * 36e5;
const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE) || 'null'); } catch { return null; } };
const writeCache = (c) => { try { localStorage.setItem(CACHE, JSON.stringify(c)); } catch { /* full or private: fine */ } };
let inflight = null;
export async function forecast({ force = false } = {}) {
  try {
    const at = wxPlace(), c = readCache();
    const same = c && c.lat === at.lat && c.lon === at.lon;
    const fresh = same && Date.now() - c.at < TTL;
    const usable = (x) => x && x.days?.filter((d) => d.date >= today()).length ? { ...x, days: x.days.filter((d) => d.date >= today()).slice(0, 3) } : null;
    if (fresh && !force) return { ...usable(c), place: at, cached: true };
    if (!navigator.onLine) return same ? (usable(c) && { ...usable(c), place: at, stale: true }) : null;
    inflight ||= (async () => {
      const u = new URL('https://api.open-meteo.com/v1/forecast');
      u.search = new URLSearchParams({ latitude: at.lat, longitude: at.lon, timezone: 'auto', forecast_days: 3,
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max' });
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
      try {
        const r = await fetch(u, { signal: ctl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (!r.ok) throw new Error('wx ' + r.status);
        const j = await r.json(), d = j.daily || {};
        const days = (d.time || []).map((date, i) => ({ date, code: d.weather_code?.[i] ?? null, max: d.temperature_2m_max?.[i] ?? null, min: d.temperature_2m_min?.[i] ?? null,
          rain: d.precipitation_sum?.[i] ?? 0, prob: d.precipitation_probability_max?.[i] ?? null, gust: d.wind_gusts_10m_max?.[i] ?? null }));
        if (!days.length) throw new Error('wx empty');
        const out = { lat: at.lat, lon: at.lon, at: Date.now(), days };
        writeCache(out);
        return out;
      } finally { clearTimeout(t); }
    })();
    const got = await inflight.finally(() => { inflight = null; });
    return { ...usable(got), place: at };
  } catch {
    const c = readCache(), at = wxPlace();
    if (c && c.lat === at.lat && c.lon === at.lon) { const days = c.days.filter((d) => d.date >= today()).slice(0, 3); if (days.length) return { ...c, days, place: at, stale: true }; }
    return null;
  }
}

// ---------- reading the forecast ----------
// WMO weather codes, as Open-Meteo documents them
export function sky(code) {
  if (code == null) return { g: 'cloud', w: 'Weather' };
  if (code === 0) return { g: 'sun', w: 'Clear' };
  if (code <= 2) return { g: 'part', w: 'Some sun' };
  if (code === 3) return { g: 'cloud', w: 'Cloudy' };
  if (code === 45 || code === 48) return { g: 'fog', w: 'Fog' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { g: 'snow', w: 'Snow' };
  if (code >= 95) return { g: 'storm', w: 'Thunder' };
  return { g: 'rain', w: code <= 57 ? 'Drizzle' : 'Rain' };
}
// The thresholds Zero Mile uses to turn numbers into advice. They are the app's own rules of thumb, shown with the
// forecast numbers so you can judge for yourself: frost when the low is 2 °C or less (air frost is 0 °C; ground
// frost often comes a little above it), rain when 5 mm or more is forecast, hot at 27 °C, windy at gusts of 50 km/h.
export const WX_RULES = { frost: 2, rain: 5, hot: 27, gust: 50 };
export function conditions(fc) {
  const [d0, d1] = fc?.days || [];
  if (!d0 || d0.date !== today()) return null;
  return {
    rainToday: d0.rain >= WX_RULES.rain,
    frostTonight: d1 ? d1.min != null && d1.min <= WX_RULES.frost : d0.min != null && d0.min <= WX_RULES.frost,
    low: d1?.min ?? d0.min,
    hotDry: d0.max != null && d0.max >= WX_RULES.hot && d0.rain < 1,
    windy: d0.gust != null && d0.gust >= WX_RULES.gust,
    d0, d1,
  };
}
const t = (n) => (n == null ? '–' : `${Math.round(n)}°`);
const DAY = (iso, i) => (i === 0 ? 'Today' : i === 1 ? 'Tmrw' : new Date(iso + 'T12:00').toLocaleDateString('en-IE', { weekday: 'short' }));

// the small 3-day strip; LCD only for the numbers
export function stripHtml(fc) {
  if (!fc?.days?.length) return '';
  return `<ol class="wx-strip" aria-label="3-day forecast for ${esc(fc.place?.name || '')}">${fc.days.map((d, i) => {
    const s = sky(d.code);
    return `<li class="wx-day"><span class="wx-d">${DAY(d.date, i)}</span>${glyph(s.g, 22)}<span class="wx-t lcd-num" aria-label="${s.w}, high ${t(d.max)}, low ${t(d.min)}${d.rain >= 1 ? `, ${Math.round(d.rain)} millimetres of rain` : ''}"><b>${t(d.max)}</b><i>${t(d.min)}</i></span></li>`;
  }).join('')}</ol>`;
}
// the line at the foot: where, how fresh, the location toggle and the privacy note
export function placeHtml(fc) {
  const at = wxPlace();
  const when = fc?.stale ? ' · offline, saved forecast' : '';
  return `<div class="wx-foot"><span class="wx-place">${glyph('pin', 16)}${esc(at.name)}${when}</span>
    ${at.mine ? '<button class="wx-loc" type="button" data-wx="forget">Use capital</button>' : '<button class="wx-loc" type="button" data-wx="locate">Use my location</button>'}
    <p class="wx-privacy">Only rounded coordinates (about 1 km) go to <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>.</p></div>`;
}
export const WX_SOURCE = { publisher: 'Open-Meteo', title: 'Weather forecast API', url: 'https://open-meteo.com/' };
