// Impact: what your own harvests have saved, worked out from the cited data (every figure links to Sources).
import { $, esc, fmt, data, plantById, trip, state, save } from './core.js?v=3';

// round goals that move on as you pass them
const goalFor = (v, steps) => steps.find((s) => s > v) ?? Math.ceil((v + 1) / steps.at(-1)) * steps.at(-1);

export default async function impact(main) {
  const D = await data();
  const rows = state.garden.map((e) => {
    const p = plantById(e.id); if (!p) return null;
    const kg = (e.harvests || []).reduce((s, h) => s + h.g, 0) / 1000;
    const picks = (e.harvests || []).length;
    const tr = trip(p, state.region);
    return { p, kg, picks, miles: tr ? tr.crowMi * picks : 0, co2g: tr ? tr.co2Transport * kg * 1000 : 0, tr };
  }).filter(Boolean);
  const tot = rows.reduce((a, r) => ({ kg: a.kg + r.kg, miles: a.miles + r.miles, co2g: a.co2g + r.co2g, picks: a.picks + r.picks }), { kg: 0, miles: 0, co2g: 0, picks: 0 });
  // shown totals are sums of the shown, rounded rows
  const shownMiles = rows.reduce((s, r) => s + Math.round(r.miles), 0);
  const shownCo2 = rows.reduce((s, r) => s + Math.round(r.co2g), 0);
  const shownKg = rows.reduce((s, r) => s + Math.round(r.kg * 100) / 100, 0);
  const gM = goalFor(shownMiles, [100, 500, 1000, 5000, 10000]), gC = goalFor(shownCo2, [100, 500, 1000, 5000]), gK = goalFor(shownKg, [1, 5, 10, 25, 50]);
  const facts = [...(D.home_facts || []), ...(D.context_facts || [])].slice(0, 4);

  main.innerHTML = `
  <section class="impact-hero" id="ihero" aria-labelledby="i-title">
    <div class="plate">
      <h1 id="i-title">Your impact</h1>
      <p class="muted" style="margin-top:6px">${tot.picks ? `From ${tot.picks} harvest${tot.picks === 1 ? '' : 's'} you logged, compared with the shop version in ${esc(D.regions[state.region]?.name || 'your country')}.` : 'Log a harvest from your garden with “Picked some” and your savings show up here.'}</p>
    </div>
  </section>
  <div style="margin-top:14px"><label class="select"><span class="vh">Where you live</span><select id="region">${Object.entries(D.regions).map(([k, r]) => `<option value="${k}"${k === state.region ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label></div>
  <div class="bars">
    <div class="bigbar"><span class="label">Food miles skipped</span><span class="n">${fmt(shownMiles)} mi</span><div class="track" role="img" aria-label="${fmt(shownMiles)} of ${fmt(gM)} miles"><i style="width:${Math.min(100, shownMiles / gM * 100)}%;background:var(--leaf-2)"></i></div><p>Next goal ${fmt(gM)} mi. One shop trip per harvest, straight-line air miles. <a href="#/sources">How</a></p></div>
    <div class="bigbar"><span class="label">Transport CO2e skipped</span><span class="n">${fmt(shownCo2)} g</span><div class="track" role="img" aria-label="${fmt(shownCo2)} of ${fmt(gC)} grams"><i style="width:${Math.min(100, shownCo2 / gC * 100)}%;background:var(--sun)"></i></div><p>Next goal ${fmt(gC)} g. Per kilo picked, using UK government freight factors. <a href="#/sources">How</a></p></div>
    <div class="bigbar"><span class="label">Food you grew</span><span class="n">${fmt(shownKg, 2)} kg</span><div class="track" role="img" aria-label="${fmt(shownKg, 2)} of ${fmt(gK)} kilos"><i style="width:${Math.min(100, shownKg / gK * 100)}%;background:var(--deep)"></i></div><p>Next goal ${fmt(gK)} kg. From the amounts you logged.</p></div>
  </div>
  ${rows.length ? `<div class="section-title" style="margin-top:22px"><h2>By plant</h2></div><div class="rows">${rows.map((r) => `
    <div class="row"><b>${esc(r.p.name)}</b><span>${fmt(Math.round(r.kg * 100) / 100, 2)} kg</span>
      <small>${r.tr ? `${fmt(Math.round(r.miles))} mi and ${fmt(Math.round(r.co2g))} g CO2e skipped · shop supply from ${esc(r.tr.o.origin_place || r.tr.o.origin_country)}` : 'No reliable source yet for where the shop one comes from'}</small></div>`).join('')}</div>` : ''}
  <div class="section-title" style="margin-top:22px"><h2>Good to know</h2></div>
  <div class="rows">${facts.map((f) => `<div class="row"><span style="font-weight:400">${esc(f.text)}</span><span></span><small>${[...new Map((f.sources || []).map((s) => [s.publisher || s.title, s])).values()].map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.publisher || s.title)}</a>`).join(', ')}</small></div>`).join('')}</div>`;

  console.assert(Math.abs(shownMiles - rows.reduce((s, r) => s + Math.round(r.miles), 0)) < 1, 'miles total must equal its rows');
  const { ditherBg } = await import('./ditherbg.js?v=3');
  const bg = ditherBg($('#ihero'), { mode: 'warp', colors: ['#3d8f3a', '#5aa83f', '#9fd47f', '#f6c935', '#fdf1c4'], block: 8, speed: .7 });
  $('#region').addEventListener('change', (e) => { state.region = e.target.value; save(); dispatchEvent(new HashChangeEvent('hashchange')); });
  return { unmount() { bg.dispose(); } };
}
