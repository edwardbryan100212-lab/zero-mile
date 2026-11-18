// XP, levels, seeds, daily quests, streak chests and achievements (see DESIGN.md). Placeholder until the
// rewards work lands: the API is fixed. award(kind, opts) → { xp, seeds, levelUp, quests, unlocked }.
import { state, save } from './core.js?v=9';
const R = () => (state.rewards ||= { xp: 0, seeds: 0, quests: {}, badges: [], owned: [] });
const subs = new Set();
export const levelNeed = (n) => 50 * n * (n + 1) / 2;
export function level(xp = R().xp) { let n = 0; while (xp >= levelNeed(n + 1)) n++; return { n: n + 1, xp, from: levelNeed(n), to: levelNeed(n + 1) }; }
export function rewards() { return R(); }
export function dailyQuests() { return []; }
export function onReward(cb) { subs.add(cb); return () => subs.delete(cb); }
export function award(kind, opts = {}) { const out = { xp: 0, seeds: 0, levelUp: null, quests: [], unlocked: [] }; subs.forEach((f) => f(out, kind, opts)); return out; }
export function spend() { return false; }
export function _save() { save(); }
