// Zero Mile: little sounds and buzzes. Every sound is made here with WebAudio (no audio files): short, warm and
// quiet, each one peaking at or under about 0.12. The AudioContext is only made after the first tap or key press,
// so the browser never warns about autoplay. Settings: state.sound and state.haptics, both on by default.
// "Reduce motion" turns off vibration only; sounds follow the Sounds switch in About.
import { state, save } from './core.js?v=9';

if (state.sound === undefined || state.haptics === undefined) { state.sound ??= true; state.haptics ??= true; save(); }

const rm = matchMedia('(prefers-reduced-motion: reduce)');

// ---------- building blocks: a note with a quick envelope, and a burst of filtered noise ----------
// note: oscillator → (lowpass) → gain envelope → out. f2 slides the pitch to f2 over `slide` seconds.
function note(ac, out, t, f, { d = .25, g = .05, type = 'sine', a = .006, f2, slide = .05, lp } = {}) {
  const o = ac.createOscillator(), v = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + slide);
  v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + a); v.gain.exponentialRampToValueAtTime(.0001, t + d);
  let node = o;
  if (lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; fl.Q.value = .5; o.connect(fl); node = fl; }
  node.connect(v); v.connect(out);
  o.start(t); o.stop(t + d + .03);
}
// a soft bell: the note plus a quiet octave, so it rings warm instead of beeping
const bell = (ac, out, t, f, { d = .45, g = .045 } = {}) => { note(ac, out, t, f, { d, g }); note(ac, out, t, f * 2, { d: d * .6, g: g * .22 }); };
const noiseBuf = new WeakMap();
function noise(ac, out, t, { d = .05, g = .08, bp = 1800, q = 3, to, a = .003 } = {}) {
  let buf = noiseBuf.get(ac);
  if (!buf) { buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * .6), ac.sampleRate); const ch = buf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; noiseBuf.set(ac, buf); }
  const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), v = ac.createGain();
  s.buffer = buf; fl.type = 'bandpass'; fl.Q.value = q; fl.frequency.setValueAtTime(bp, t);
  if (to) fl.frequency.exponentialRampToValueAtTime(to, t + d);
  v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + a); v.gain.exponentialRampToValueAtTime(.0001, t + d);
  s.connect(fl); fl.connect(v); v.connect(out);
  s.start(t, Math.random() * .2); s.stop(t + d + .02);
}

// note names used below (Hz)
const N = { C4: 261.6, E4: 329.6, C5: 523.3, D5: 587.3, E5: 659.3, G5: 784, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568, B6: 1975.5, C7: 2093, E7: 2637 };

// ---------- the sounds: (ctx, destination, start time) ----------
export const SOUNDS = {
  // a soft tick under a finger
  tap: (ac, o, t) => note(ac, o, t, 1300, { f2: 850, slide: .03, d: .05, g: .05, a: .002 }),
  // a small "pip" up for a switch
  toggle: (ac, o, t) => { note(ac, o, t, 660, { f2: 990, slide: .05, d: .08, g: .06, type: 'triangle' }); note(ac, o, t + .045, 1320, { d: .06, g: .025 }); },
  // done / correct: two notes rising, like a little doorbell
  done: (ac, o, t) => { bell(ac, o, t, N.G5, { d: .3, g: .05 }); bell(ac, o, t + .09, N.C6, { d: .5, g: .055 }); },
  // XP: a quick sparkle up
  xp: (ac, o, t) => { [N.C6, N.E6, N.G6, N.C7].forEach((f, i) => note(ac, o, t + i * .045, f, { d: .2, g: .04 })); note(ac, o, t + .17, 4186, { d: .14, g: .008 }); },
  // a quest done: three steps and a ring
  quest: (ac, o, t) => { [N.G5, N.C6, N.E6].forEach((f, i) => note(ac, o, t + i * .075, f, { d: .16, g: .045, type: 'triangle', lp: 3000 })); bell(ac, o, t + .24, N.G6, { d: .55, g: .045 }); },
  // streak up: a bright little fanfare, done in under a second
  streak: (ac, o, t) => {
    [N.C5, N.E5, N.G5].forEach((f, i) => note(ac, o, t + i * .095, f, { d: .13, g: .07, type: 'sawtooth', lp: 1800, a: .012 }));
    [N.E5, N.G5, N.C6].forEach((f) => note(ac, o, t + .3, f, { d: .55, g: .036, type: 'sawtooth', lp: 2200, a: .02 }));
    bell(ac, o, t + .3, N.C7, { d: .45, g: .03 });
  },
  // the chest shakes: a woody rattle
  shake: (ac, o, t) => { for (let i = 0; i < 6; i++) { noise(ac, o, t + i * .055, { d: .035, g: .2, bp: i % 2 ? 1500 : 2200, q: 5 }); note(ac, o, t + i * .055, i % 2 ? 190 : 230, { d: .04, g: .035, type: 'triangle' }); } },
  // the chest opens: a whoosh, a soft thump and a shower of sparkles
  open: (ac, o, t) => {
    noise(ac, o, t, { d: .3, g: .09, bp: 500, to: 5000, q: 1.2, a: .04 });
    note(ac, o, t, 220, { f2: 80, slide: .1, d: .14, g: .07 });
    [N.C6, N.E6, N.G6, N.C7, N.E7].forEach((f, i) => note(ac, o, t + .1 + i * .04, f, { d: .25, g: .03 }));
  },
  // a new badge: two bright bells
  badge: (ac, o, t) => { bell(ac, o, t, N.E6, { d: .5, g: .045 }); bell(ac, o, t + .13, N.B6, { d: .7, g: .04 }); },
  // level up: a run up the scale, then a ringing chord
  level: (ac, o, t) => {
    [N.C5, N.D5, N.E5, N.G5, N.A5, N.C6].forEach((f, i) => note(ac, o, t + i * .06, f, { d: .14, g: .035, type: 'triangle', lp: 3200 }));
    [N.C6, N.E6, N.G6].forEach((f) => bell(ac, o, t + .4, f, { d: .7, g: .022 }));
    note(ac, o, t + .45, 4186, { d: .2, g: .006 });
  },
  // a shop buy: two quick coin-like chinks
  buy: (ac, o, t) => { bell(ac, o, t, N.B6, { d: .18, g: .04 }); bell(ac, o, t + .07, N.E7, { d: .35, g: .04 }); },
  // water: a gentle drip and a smaller one
  water: (ac, o, t) => { note(ac, o, t, 520, { f2: 1500, slide: .07, d: .13, g: .075, a: .004 }); note(ac, o, t + .13, 700, { f2: 1900, slide: .05, d: .09, g: .035, a: .004 }); },
  // something didn't work: soft, low and short; never harsh
  error: (ac, o, t) => { note(ac, o, t, N.E4, { d: .14, g: .06, type: 'triangle', lp: 900 }); note(ac, o, t + .11, N.C4, { d: .22, g: .06, type: 'triangle', lp: 900 }); },
};
// the same sound again within this many ms is skipped, so taps and repeats never stack up
const COOL = { tap: 70, toggle: 120, error: 400, shake: 500 };
const COOL_DEFAULT = 260;

// ---------- the AudioContext: made on the first gesture, never before ----------
let ac = null, master = null, gestured = false;
const AC = window.AudioContext || window.webkitAudioContext;
function ctx() {
  if (ac) return ac;
  if (!AC || !(gestured || navigator.userActivation?.isActive)) return null;
  try { ac = new AC(); master = ac.createGain(); master.gain.value = 1; master.connect(ac.destination); } catch { ac = null; }
  return ac;
}
// only a real activation counts: Escape and a touch's pointerdown are not one, and an AudioContext made then is blocked
const wake = () => { if (navigator.userActivation && !navigator.userActivation.isActive) return; gestured = true; if (state.sound === false) return; const a = ctx(); if (a && a.state !== 'running') a.resume().catch(() => {}); };
for (const ev of ['pointerdown', 'keydown', 'touchend']) addEventListener(ev, wake, { capture: true, passive: true });

// ---------- play(name): respects the switch, the cooldowns, and stays quiet until there has been a tap ----------
const last = {};
let lastAny = 0;
export const log = []; // the last few calls, for checks: { name, at, played }
const note_ = (name, played) => { log.push({ name, at: Math.round(performance.now()), played }); if (log.length > 60) log.shift(); };
export function play(name, { soft = false } = {}) {
  const def = SOUNDS[name];
  if (!def || state.sound === false) return false;
  const now = performance.now();
  // a soft sound (a floating "+XP") gives way if anything else just played
  if (now - (last[name] ?? -1e9) < (COOL[name] ?? COOL_DEFAULT) || (soft && now - lastAny < 300)) { note_(name, false); return false; }
  const a = ctx(); if (!a) { note_(name, false); return false; }
  if (a.state !== 'running') a.resume().catch(() => {});
  last[name] = now; lastAny = now; note_(name, true);
  try { def(a, master, a.currentTime + .012); } catch { /* never let a sound break a tap */ }
  return true;
}

// ---------- buzz(pattern): navigator.vibrate where it exists; off with the switch or "reduce motion" ----------
export function buzz(pattern = 12) {
  if (state.haptics === false || rm.matches || !navigator.vibrate) return false;
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return false; // the browser would refuse anyway
  try { return navigator.vibrate(pattern); } catch { return false; }
}

export function setSound(on) { state.sound = !!on; save(); if (on) { gestured = true; play('done'); } }
export function setHaptics(on) { state.haptics = !!on; save(); play('toggle'); if (on) buzz(20); }
