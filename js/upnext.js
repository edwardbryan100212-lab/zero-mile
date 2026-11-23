// Today's "Up next": once today's photo is taken, the hero names the one next thing to do, with one button.
// Order: a plant ready to pick (its harvest cancels a real shop trip), a weather job or tip, the first open care
// job, then "That's everything for today". Jobs come from js/care.js (todayJobs), so the rules match Care today.
import { $, $$, esc, plantById, state, today } from './core.js?v=9';
import { journeyOf } from './journey.js?v=1';
import { placeShort } from './rewards.js?v=9';
import { produceIcon } from './produce.js?v=9';
import { glyph } from './weather.js?v=10';

const fmt = (n) => Number(n).toLocaleString('en-IE');
const tickable = (j) => j.act === 'water' || j.act === 'tick';

function pickNext({ jobs, lines }) {
  const open = jobs.filter((j) => !j.done);
  // a plant picked today is done for today, even if its Care today job wasn't ticked
  const pickedToday = (id) => (state.garden.find((e) => e.id === id)?.harvests || []).some((h) => h.date === today());
  const pick = open.find((j) => j.key.endsWith(':pick') && !pickedToday(j.key.split(':')[0]));
  if (pick) return { kind: 'pick', j: pick };
  const wxJob = open.find((j) => j.wx && tickable(j));
  if (wxJob) return { kind: 'job', j: wxJob };
  if (lines[0]) return { kind: 'tip', j: lines[0] };
  const job = open.find(tickable);
  if (job) return { kind: 'job', j: job };
  return { kind: 'done' };
}

function html(n) {
  const id = n.j?.key.split(':')[0], p = id && plantById(id);
  const sym = p ? produceIcon(p.id, { size: 36, cls: 'un-sym', group: p.group }) : `<span class="un-gl" aria-hidden="true">${glyph(n.j?.icon || 'check', 22)}</span>`;
  if (n.kind === 'pick') {
    const j = journeyOf(p.id);
    const sub = j ? `Logging it cancels ${fmt(j.km)} km from ${esc(placeShort(j.from.place))}.` : 'Log what you picked.';
    return { sym, title: esc(n.j.title), sub, btn: `<button class="b3 b3-sm" type="button" data-un="pick" data-id="${esc(p.id)}">Log a harvest</button>` };
  }
  if (n.kind === 'job') return { sym, title: esc(n.j.title), sub: esc(n.j.why.find(Boolean) || ''), btn: `<button class="b3 b3-sm" type="button" data-un="tick" data-key="${esc(n.j.key)}">Done</button>` };
  if (n.kind === 'tip') return { sym, title: esc(n.j.title), sub: esc(n.j.why[1] || n.j.why[0] || ''), btn: `<button class="b3 b3-sm b3-white" type="button" data-un="care">Care today</button>` };
  return { sym: `<span class="un-gl un-ok" aria-hidden="true">${glyph('check', 22)}</span>`, title: 'That’s everything for today', sub: 'Pip will be ready for tomorrow’s photo.', btn: '' };
}

export async function mountUpNext(el) {
  if (!el) return;
  const { todayJobs } = await import('./care.js?v=10');
  const draw = async () => {
    if (!el.isConnected) { removeEventListener('zm:care', redraw); removeEventListener('zm:garden', redraw); return; }
    let r; try { r = await todayJobs(); } catch { return; }
    const v = html(pickNext(r));
    el.innerHTML = `<p class="un-k">Up next</p>
      <div class="un-row">${v.sym}<p class="un-t"><b>${v.title}</b>${v.sub ? `<span>${v.sub}</span>` : ''}</p>${v.btn}</div>`;
    el.hidden = false;
  };
  const redraw = () => { draw(); };
  addEventListener('zm:care', redraw); addEventListener('zm:garden', redraw);
  el.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-un]'); if (!b) return;
    const main = el.closest('main') || document;
    if (b.dataset.un === 'pick') {
      // open the plant tile's own harvest picker, so there is one way to log a harvest
      const log = $$('.pst', main).find((li) => li.dataset.id === b.dataset.id)?.querySelector('.pst-log');
      if (log) { log.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); if (log.getAttribute('aria-expanded') !== 'true') log.click(); log.focus({ preventScroll: true }); }
      else location.hash = `#/plant/${b.dataset.id}`;
      return;
    }
    if (b.dataset.un === 'tick') {
      // tick the same job in Care today (it saves, plays the sound and updates the count), then this redraws
      const t = $$('#care-slot .care-tick[data-care]', main).find((x) => x.dataset.care === b.dataset.key);
      if (t) { t.click(); return; }
    }
    const care = $('#care-slot', main);
    care?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    care?.querySelector('h2')?.setAttribute('tabindex', '-1'); care?.querySelector('h2')?.focus({ preventScroll: true });
  });
  await draw();
}
