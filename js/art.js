// Illustration kit and the mascot Pip (see DESIGN.md). Placeholder until the art-kit work lands:
// the API is fixed — art(name, { size, cls }) and mascot(pose, { size, mood }) return inline SVG strings, never throw.
export const ART_NAMES = ['streak-sun', 'seed-gem', 'xp-bolt', 'chest', 'chest-open', 'can-freeze', 'quest-photo', 'quest-water', 'quest-learn', 'quest-harvest', 'trophy', 'heart', 'basket', 'lorry', 'plane', 'ship', 'tree', 'cloud-co2', 'camera', 'map-pin', 'calendar', 'lock', 'gift', 'star', 'scene-garden', 'scene-night', 'scene-harvest', 'scene-forest'];
export const POSES = ['wave', 'cheer', 'proud', 'sad', 'sleepy', 'point', 'water', 'think', 'party', 'wow'];
const C = { 'streak-sun': '#ffc531', 'seed-gem': '#a560e8', 'xp-bolt': '#ffc531', 'heart': '#ff5a4e', 'quest-water': '#36b4f0' };
export function art(name, { size = 48, cls = '' } = {}) {
  const c = C[name] || (name.startsWith('badge-') ? '#ffc531' : '#3fae49');
  return `<svg class="art ${cls}" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true" data-art="${name}"><circle cx="32" cy="32" r="26" fill="${c}"/><circle cx="24" cy="24" r="8" fill="#fff" opacity=".35"/></svg>`;
}
export function mascot(pose = 'wave', { size = 120, mood = 'happy', cls = '' } = {}) {
  return `<svg class="pip ${cls}" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true" data-pose="${pose}" data-mood="${mood}"><path d="M60 30c-2-12 8-20 18-18-2 10-8 16-18 18z" fill="#3fae49"/><path d="M24 44h72l-8 64H32z" fill="#e8865b"/><rect x="20" y="38" width="80" height="14" rx="6" fill="#c4653d"/><rect x="36" y="58" width="48" height="34" rx="8" fill="#0b0f0c"/><rect x="46" y="68" width="6" height="6" fill="#5dff7a"/><rect x="68" y="68" width="6" height="6" fill="#5dff7a"/><rect x="52" y="80" width="16" height="4" fill="#5dff7a"/></svg>`;
}
