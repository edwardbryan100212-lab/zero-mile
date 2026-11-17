// The look of the trees added in round 3 (research/trees-round3.json), drawn by the same procedural engine as the
// other trees. It only registers looks in plants3d.js's LOOKS table, so the engine itself is unchanged.
// Sizes are metres at full growth; leaf, bark and fruit kinds are the engine's own.
import { LOOKS } from './plants3d.js';

const F = (kind, r, color, extra = {}) => ({ kind, r, color, ...extra });
const NEW = {
  // hazel: several stems, round soft leaves and nuts
  hazel: { habit: 'tree', h: 6, leaf: 'oval', leafSize: .17, leafColor: '#4f8a35', bark: '#7a5a3e', fruit: F('sphere', .04, '#a77b45', { count: 30 }), depth: 4, wide: true, dense: true },
  // hawthorn: small lobed leaves, white may blossom, red haws
  hawthorn: { habit: 'tree', h: 8, leaf: 'oak', leafSize: .24, leafColor: '#3f7a33', bark: 'oak', fruit: F('sphere', .05, '#a3191b', { count: 70 }), flower: '#ffffff', depth: 4, dense: true },
  // holly: glossy dark evergreen leaves and red berries
  holly: { habit: 'tree', glossy: true, h: 10, leaf: 'oval', leafSize: .27, leafColor: '#1f4a24', bark: 'apple', fruit: F('sphere', .055, '#c4141c', { count: 60 }), depth: 4, dense: true },
  // alder: dark green round leaves and small woody cones
  alder: { habit: 'tree', h: 20, leaf: 'oval', leafSize: .55, leafColor: '#355f2c', bark: 'oak', fruit: F('cone', .1, '#4a3523', { count: 30 }), depth: 5, dense: true },
  // red maple: hand-shaped leaves that turn red
  'red-maple': { habit: 'tree', h: 18, leaf: 'palm', leafSize: .55, leafK: 1.1, leafColor: '#b5462a', bark: 'apple', depth: 5, wide: true, dense: true },
  // golden wattle: narrow grey-green leaves and fluffy golden flower balls
  'golden-wattle': { habit: 'tree', h: 8, leaf: 'lance', leafSize: .3, leafColor: '#5d7f48', bark: '#5a4a3a', fruit: F('sphere', .075, '#f2c21b', { count: 120 }), depth: 4, dense: true },
  // schima (Hong Kong): glossy evergreen leaves and white flowers
  schima: { habit: 'tree', glossy: true, h: 12, leaf: 'oval', leafSize: .32, leafColor: '#2f6a2c', bark: 'oak', fruit: F('sphere', .07, '#fbf7ea', { count: 70 }), depth: 5, dense: true },
};
for (const [id, look] of Object.entries(NEW)) LOOKS[id] ||= look;
export const TREE_LOOKS = Object.keys(NEW);
