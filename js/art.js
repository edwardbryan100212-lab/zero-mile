// Illustration kit and the mascot Pip (see DESIGN.md). Chunky, sticker-like layered SVG in the app palette:
// every shape sits on a darker "lip" (the same 3D language as the .b3 buttons), with soft highlights.
// API (fixed, used by the screens): art(name, { size, cls }) and mascot(pose, { size, mood, cls }) return
// inline SVG strings and never throw; unknown names give a neutral placeholder.
import { facePixels, LCD } from './face.js';

export const ART_NAMES = ['streak-sun', 'seed-gem', 'xp-bolt', 'chest', 'chest-open', 'can-freeze', 'quest-photo', 'quest-water', 'quest-learn', 'quest-harvest', 'trophy', 'heart', 'basket', 'lorry', 'plane', 'ship', 'tree', 'cloud-co2', 'camera', 'map-pin', 'calendar', 'lock', 'gift', 'star', 'scene-garden', 'scene-night', 'scene-harvest', 'scene-forest'];
export const POSES = ['wave', 'cheer', 'proud', 'sad', 'sleepy', 'point', 'water', 'think', 'party', 'wow'];
export const BADGES = ['first-photo', 'streak-7', 'streak-30', 'streak-100', 'first-harvest', 'five-plants', 'first-tree', 'ten-trees', 'miles-100', 'miles-1000', 'herb-garden', 'fruit-bowl', 'night-owl', 'early-bird', 'level-5', 'level-10'];

const K = {
  leaf: '#3fae49', leafD: '#2b8a34', leafL: '#7fd65a', leafLL: '#b4ea7e',
  sun: '#ffc531', sunD: '#e0a200', sunL: '#ffe27a', sunO: '#ffab1a',
  tom: '#ff5a4e', tomD: '#d93b30', tomL: '#ff8a7f',
  sky: '#36b4f0', skyD: '#1a8fcc', skyL: '#8fd6ff', skyLL: '#d6f1ff',
  ber: '#a560e8', berD: '#7f3fc4', berL: '#c899f5',
  pot: '#e8865b', potD: '#c4653d', potL: '#f6a983',
  wood: '#c0703c', woodD: '#8a4a26', woodL: '#d98d55',
  ink: '#1d3b24', stone: '#9aa79f', stoneD: '#6f7d74', paper: '#ffffff', paperD: '#d9e2d5', soil: '#6b3a1c',
};
const FONT = `font-family="Nunito, 'Arial Rounded MT Bold', system-ui, sans-serif" font-weight="900"`;

let uidN = 0;
const uid = (p) => `${p}${(++uidN).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const shadow = (cx = 32, cy = 58, rx = 20) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${(rx * .17).toFixed(1)}" fill="${K.ink}" opacity=".13"/>`;
// a shape on its darker lip: drawn once in the shade, dy lower, then in the main colour
const lip = (shape, main, shade, dy = 3) => `<g transform="translate(0 ${dy})" fill="${shade}">${shape}</g><g fill="${main}">${shape}</g>`;
const shine = (d, w = 4, o = .75) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" opacity="${o}"/>`;
const starPts = (cx, cy, R, r, n = 5, rot = -90) => Array.from({ length: n * 2 }, (_, i) => { const a = (rot + i * 180 / n) * Math.PI / 180, rr = i % 2 ? r : R; return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`; }).join(' ');
const sparkle = (x, y, s = 1, c = '#fff', o = 1) => `<path d="M${x} ${y - 6 * s}C${x + 1 * s} ${y - 1.5 * s} ${x + 1.5 * s} ${y - 1 * s} ${x + 6 * s} ${y}C${x + 1.5 * s} ${y + 1 * s} ${x + 1 * s} ${y + 1.5 * s} ${x} ${y + 6 * s}C${x - 1 * s} ${y + 1.5 * s} ${x - 1.5 * s} ${y + 1 * s} ${x - 6 * s} ${y}C${x - 1.5 * s} ${y - 1 * s} ${x - 1 * s} ${y - 1.5 * s} ${x} ${y - 6 * s}Z" fill="${c}" opacity="${o}"/>`;
const leafShape = (x, y, a, s = 1, c = K.leaf, v = K.leafD) => `<g transform="translate(${x} ${y}) rotate(${a}) scale(${s})"><path d="M0 0C5-8 15-8 21 0C15 8 5 8 0 0Z" fill="${c}"/><path d="M3 0H15" stroke="${v}" stroke-width="1.6" stroke-linecap="round" opacity=".7"/><path d="M6-3.2C9-5 13-5 15-4" stroke="#fff" stroke-width="1.6" stroke-linecap="round" fill="none" opacity=".5"/></g>`;

// ---------- the icons (64 x 64) ----------
const ICONS = {
  'streak-sun': () => {
    const rays = (f, dy) => `<g fill="${f}" transform="translate(0 ${dy})">${Array.from({ length: 8 }, (_, i) => `<rect x="28" y="2" width="8" height="15" rx="4" transform="rotate(${i * 45 + 22.5} 32 33)"/>`).join('')}</g>`;
    return shadow(32, 60, 16) + rays(K.sunD, 2) + rays(K.sunO, 0) + lip(`<circle cx="32" cy="33" r="18"/>`, K.sun, K.sunD) +
      `<circle cx="32" cy="34" r="12" fill="${K.sunL}"/><path d="M26 30a7 7 0 0 1 12 0" fill="none" stroke="${K.sunO}" stroke-width="3" stroke-linecap="round" opacity=".55"/>` + shine('M20 28a13 13 0 0 1 9-10');
  },
  'seed-gem': () => {
    const out = `<path d="M14 26L22 13H42L50 26L32 56Z" stroke-width="4" stroke-linejoin="round"/>`;
    return shadow(32, 61, 15) + `<g stroke="${K.berD}" transform="translate(0 3)" fill="${K.berD}">${out}</g><g stroke="${K.ber}" fill="${K.ber}">${out}</g>` +
      `<path d="M22 13H42L38 26H26Z" fill="${K.berL}"/><path d="M14 26L22 13L26 26Z" fill="#b984f2"/><path d="M42 13L50 26H38Z" fill="#9150d8"/>` +
      `<path d="M14 26H26L32 56Z" fill="#9a58df"/><path d="M38 26H50L32 56Z" fill="${K.berD}"/>` +
      shine('M25 17H33', 3, .8) + shine('M21 29L28 42', 2.5, .45) +
      `<path d="M38 13C38 8 40 5 44 3" fill="none" stroke="${K.leafD}" stroke-width="2.5" stroke-linecap="round"/>${leafShape(42, 5, -20, .55)}` + sparkle(12, 12, .8) + sparkle(54, 40, .55);
  },
  'xp-bolt': () => {
    const d = 'M38 3L13 36H29L24 61L51 25H35L41 3Z';
    return shadow(32, 61, 15) + lip(`<path d="${d}" stroke-linejoin="round"/>`, K.sun, K.sunD) +
      `<path d="M37 7L18 33H23L37 7Z" fill="${K.sunL}"/><path d="M35 25H47L30 50L33 33H35Z" fill="${K.sunO}" opacity=".6"/>` + sparkle(52, 44, .7);
  },
  chest: () => chestArt(false),
  'chest-open': () => chestArt(true),
  'can-freeze': () => shadow(30, 60, 20) +
    `<path d="M17 27C16 13 39 11 40 26" fill="none" stroke="${K.skyD}" stroke-width="6" stroke-linecap="round"/>` +
    `<path d="M41 40L55 19" stroke="${K.skyD}" stroke-width="8" stroke-linecap="round"/><path d="M41 38L54 19" stroke="${K.sky}" stroke-width="5" stroke-linecap="round"/>` +
    `<g transform="rotate(35 56 16)">${lip(`<rect x="49" y="11" width="15" height="10" rx="4"/>`, K.sky, K.skyD, 2)}</g>` +
    lip(`<rect x="8" y="24" width="36" height="31" rx="9"/>`, K.sky, K.skyD) +
    `<path d="M8 33C8 27 12 24 17 24H35C40 24 44 27 44 33C40 36 38 31 34 35C31 38 28 32 25 36C21 39 19 33 15 36C12 38 9 36 8 33Z" fill="${K.skyLL}"/>` +
    `<g stroke="#fff" stroke-width="3" stroke-linecap="round" transform="translate(26 44)"><path d="M0-8V8M-7-4L7 4M-7 4L7-4"/><path d="M-2-6L0-4L2-6M-2 6L0 4L2 6" stroke-width="2"/></g>` + shine('M13 39V49', 3.5, .55) + sparkle(56, 40, .8, K.skyLL),
  'quest-photo': () => shadow(32, 60, 19) + `<g transform="rotate(-7 32 32)">` + lip(`<rect x="11" y="7" width="42" height="48" rx="5"/>`, K.paper, K.paperD) +
    `<rect x="16" y="12" width="32" height="29" rx="3" fill="${K.skyL}"/><circle cx="41" cy="20" r="4.5" fill="${K.sun}"/><path d="M16 34C25 27 36 29 48 33V41H16Z" fill="${K.leaf}"/><path d="M16 37C26 33 36 34 48 37V41H16Z" fill="${K.leafD}"/>` +
    `<path d="M30 34V25" stroke="${K.leafD}" stroke-width="2.5" stroke-linecap="round"/>${leafShape(30, 27, -150, .45)}${leafShape(30, 26, -30, .5)}<rect x="20" y="46" width="16" height="3" rx="1.5" fill="${K.paperD}"/></g>` + sparkle(52, 9, 1, K.sun),
  'quest-water': () => {
    const d = 'M32 5C41 18 50 28 50 40A18 18 0 0 1 14 40C14 28 23 18 32 5Z';
    return shadow(32, 61, 16) + lip(`<path d="${d}"/>`, K.sky, K.skyD) + `<path d="M32 13C38 22 44 30 44 40A12 12 0 0 1 20 40C20 30 26 22 32 13Z" fill="#5cc7f7"/>` +
      shine('M21 40A11 11 0 0 0 29 51', 4) + `<circle cx="22" cy="31" r="2.5" fill="#fff" opacity=".8"/>` + lip(`<circle cx="53" cy="22" r="4"/>`, K.sky, K.skyD, 1.5) + lip(`<circle cx="10" cy="28" r="3"/>`, K.sky, K.skyD, 1.5);
  },
  'quest-learn': () => shadow(32, 60, 24) + lip(`<rect x="4" y="19" width="56" height="36" rx="6"/>`, K.leaf, K.leafD) +
    `<path d="M8 17C17 14 26 15 31 20V51C26 47 17 46 8 48Z" fill="${K.paper}"/><path d="M56 17C47 14 38 15 33 20V51C38 47 47 46 56 48Z" fill="#eef4ea"/>` +
    `<path d="M31 20V51M33 20V51" stroke="${K.paperD}" stroke-width="1.5"/>` +
    `<g stroke="${K.paperD}" stroke-width="2.5" stroke-linecap="round"><path d="M13 26H26M13 32H26M13 38H22M38 26H51M38 32H51M38 38H47"/></g>` +
    `<path d="M32 19V8" stroke="${K.leafD}" stroke-width="3" stroke-linecap="round"/>${leafShape(32, 12, -145, .62)}${leafShape(32, 9, -35, .7)}` + sparkle(52, 9, .8, K.sun),
  'quest-harvest': () => tomato(32, 37, 1) + sparkle(52, 12, .85),
  trophy: () => shadow(32, 60, 16) +
    `<g fill="none" stroke="${K.sunD}" stroke-width="5" stroke-linecap="round"><path d="M17 15C5 15 6 32 20 32M47 15C59 15 58 32 44 32"/></g>` +
    lip(`<path d="M15 9H49V21C49 33 41 40 32 40C23 40 15 33 15 21Z"/>`, K.sun, K.sunD) +
    `<path d="M41 12H47V21C47 29 43 35 37 38C42 32 41 22 41 12Z" fill="${K.sunO}" opacity=".55"/>` +
    `<rect x="13" y="6" width="38" height="7" rx="3.5" fill="${K.sunL}"/>` +
    `<polygon points="${starPts(32, 23, 7, 3.2)}" fill="#fff6c9" stroke="#fff6c9" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<rect x="28" y="39" width="8" height="8" fill="${K.sunD}"/>` + lip(`<rect x="18" y="46" width="28" height="11" rx="3"/>`, K.wood, K.woodD, 2.5) +
    `<rect x="25" y="49" width="14" height="4" rx="2" fill="${K.sun}"/>` + shine('M20 15V22C20 25 21 28 23 30', 3.5),
  heart: () => {
    const d = 'M32 55C19 46 7 37 7 24C7 15 14 8 22 8C27 8 30 11 32 14C34 11 37 8 42 8C50 8 57 15 57 24C57 37 45 46 32 55Z';
    return shadow(32, 61, 16) + lip(`<path d="${d}"/>`, K.tom, K.tomD) + `<path d="M50 18C53 25 50 34 41 41C47 33 49 25 47 17Z" fill="${K.tomD}" opacity=".35"/>` + shine('M15 22C15 17 18 14 22 14', 4.5) + `<circle cx="15" cy="28" r="2" fill="#fff" opacity=".7"/>`;
  },
  basket: () => shadow(32, 61, 24) +
    `<path d="M13 33C13 6 51 6 51 33" fill="none" stroke="${K.woodD}" stroke-width="6" stroke-linecap="round"/><path d="M13 32C13 8 51 8 51 32" fill="none" stroke="${K.woodL}" stroke-width="3" stroke-linecap="round"/>` +
    `<circle cx="40" cy="27" r="9" fill="${K.leafD}"/><circle cx="44" cy="23" r="6" fill="${K.leaf}"/><circle cx="36" cy="22" r="6" fill="${K.leafL}"/>` +
    `<path d="M44 30L52 12" stroke="#ff9a3c" stroke-width="7" stroke-linecap="round"/>${leafShape(52, 12, -60, .45)}` +
    tomato(23, 27, .5, true) +
    lip(`<path d="M7 33H57L52 54C51 57 49 58 46 58H18C15 58 13 57 12 54Z"/>`, '#dc9a52', '#a8692f') +
    `<g stroke="#b8773a" stroke-width="2.5" stroke-linecap="round" fill="none"><path d="M10 42H54M12 50H52"/><path d="M20 35L22 56M32 35V57M44 35L42 56" opacity=".7"/></g>` +
    lip(`<rect x="5" y="30" width="54" height="7" rx="3.5"/>`, '#ecb56c', '#b8773a', 2) + shine('M9 33H22', 2.5, .6),
  lorry: () => shadow(32, 57, 28) +
    lip(`<rect x="3" y="13" width="39" height="30" rx="4"/>`, K.paper, K.paperD) +
    `<rect x="3" y="13" width="39" height="5" rx="2.5" fill="#eef4ea"/>${leafShape(14, 30, -20, .9)}<rect x="27" y="22" width="10" height="3" rx="1.5" fill="${K.paperD}"/><rect x="27" y="28" width="7" height="3" rx="1.5" fill="${K.paperD}"/>` +
    lip(`<path d="M42 21H52C55 21 57 23 58 26L61 34V44H42Z"/>`, K.tom, K.tomD) +
    `<path d="M46 25H52L56 33H46Z" fill="${K.skyL}"/><path d="M47 26H50L49 31H47Z" fill="#fff" opacity=".7"/><rect x="58" y="38" width="4" height="4" rx="1" fill="${K.sun}"/>` +
    `<rect x="3" y="42" width="59" height="5" rx="2" fill="#4c5a51"/>` +
    [15, 29, 51].map((x) => `<circle cx="${x}" cy="48" r="7" fill="${K.ink}"/><circle cx="${x}" cy="48" r="3" fill="${K.stone}"/><circle cx="${x - 1}" cy="47" r="1" fill="#fff" opacity=".7"/>`).join(''),
  plane: () => shadow(32, 60, 18) + `<g transform="rotate(-12 32 34)">` +
    `<path d="M29 29L35 29L31 19H26Z" fill="${K.skyD}"/>` +
    `<path d="M10 28L6 13H13L23 28Z" fill="${K.sky}"/><path d="M8 13H13L18 21H10Z" fill="${K.skyL}" opacity=".6"/>` +
    lip(`<path d="M5 34C5 30 9 28 15 28H47C54 28 60 31 60 34C60 37 54 40 47 40H15C9 40 5 38 5 34Z"/>`, K.paper, K.paperD, 2.5) +
    `<path d="M52 30C56 31 58 32 59 34H51Z" fill="${K.skyD}"/>` +
    [20, 26, 32, 38, 44].map((x) => `<circle cx="${x}" cy="32.5" r="1.8" fill="${K.sky}"/>`).join('') +
    `<rect x="12" y="36" width="36" height="2.2" rx="1.1" fill="${K.sun}"/>` +
    `<path d="M27 35L40 35L30 54H23Z" fill="${K.skyD}"/><path d="M28 35L37 35L29 50H25Z" fill="${K.sky}"/></g>` + sparkle(54, 10, .7, K.skyL),
  ship: () => `<path d="M2 48H62V58C62 60 60 62 58 62H6C4 62 2 60 2 58Z" fill="${K.sky}"/>` +
    lip(`<rect x="9" y="25" width="12" height="11" rx="1.5"/>`, K.sun, K.sunD, 1.5) + lip(`<rect x="22" y="25" width="12" height="11" rx="1.5"/>`, K.sky, K.skyD, 1.5) +
    lip(`<rect x="35" y="25" width="12" height="11" rx="1.5"/>`, K.leaf, K.leafD, 1.5) + lip(`<rect x="15" y="14" width="12" height="11" rx="1.5"/>`, K.ber, K.berD, 1.5) + lip(`<rect x="28" y="14" width="12" height="11" rx="1.5"/>`, K.tom, K.tomD, 1.5) +
    `<g stroke="#000" stroke-opacity=".14" stroke-width="1.5"><path d="M13 27V34M17 27V34M26 27V34M30 27V34M39 27V34M43 27V34M19 16V23M23 16V23M32 16V23M36 16V23"/></g>` +
    lip(`<rect x="48" y="16" width="9" height="21" rx="2"/>`, K.paper, K.paperD, 1.5) + `<rect x="50" y="20" width="5" height="4" rx="1" fill="${K.skyL}"/><rect x="50" y="27" width="5" height="4" rx="1" fill="${K.skyL}"/><rect x="49.5" y="9" width="6" height="8" rx="1.5" fill="${K.tom}"/><rect x="49.5" y="9" width="6" height="2.5" rx="1" fill="${K.ink}"/>` +
    lip(`<path d="M3 37H61L55 52H9Z"/>`, K.tom, K.tomD) + `<rect x="6" y="41" width="52" height="3" fill="#fff" opacity=".85"/>` +
    `<path d="M2 52C7 49 11 49 16 52C21 55 25 55 30 52C35 49 39 49 44 52C49 55 53 55 58 52L62 50V56H2Z" fill="${K.skyL}"/>`,
  tree: () => treeArt(),
  'cloud-co2': () => {
    const cl = `<circle cx="20" cy="37" r="12"/><circle cx="34" cy="28" r="15"/><circle cx="48" cy="37" r="11"/><rect x="10" y="34" width="46" height="16" rx="8"/>`;
    return shadow(32, 59, 22) + lip(cl, '#b9c7bf', '#8b9c92') + `<circle cx="30" cy="22" r="6" fill="#dbe5df"/><circle cx="17" cy="33" r="4" fill="#dbe5df"/>` +
      `<text x="33" y="46" text-anchor="middle" ${FONT} font-size="15" fill="#fff" stroke="#8b9c92" stroke-width="3" paint-order="stroke">CO<tspan font-size="9" dy="3">2</tspan></text>`;
  },
  camera: () => shadow(32, 60, 24) + lip(`<rect x="22" y="12" width="20" height="10" rx="4"/>`, K.skyD, '#137099', 2) +
    lip(`<rect x="5" y="19" width="54" height="36" rx="9"/>`, K.sky, K.skyD) + `<rect x="10" y="23" width="44" height="4" rx="2" fill="${K.skyL}"/>` +
    lip(`<rect x="45" y="23" width="9" height="6" rx="2"/>`, K.sun, K.sunD, 1.5) + `<rect x="10" y="22" width="7" height="4" rx="2" fill="${K.tom}"/>` +
    `<circle cx="32" cy="39" r="14" fill="${K.ink}"/><circle cx="32" cy="39" r="11" fill="#3b5245"/><circle cx="32" cy="39" r="8" fill="#1f6f99"/><circle cx="32" cy="39" r="5" fill="${K.sky}"/>` +
    `<circle cx="28.5" cy="35.5" r="2.6" fill="#fff" opacity=".9"/><circle cx="35" cy="42" r="1.2" fill="#fff" opacity=".6"/>` + shine('M10 33V45', 3.5, .5),
  'map-pin': () => shadow(32, 60, 10) + lip(`<path d="M32 59C24 47 11 37 11 24A21 21 0 0 1 53 24C53 37 40 47 32 59Z"/>`, K.tom, K.tomD) +
    `<circle cx="32" cy="24" r="11" fill="#fff"/>${leafShape(25, 28, -40, .75)}` + shine('M18 18C19 14 22 11 26 9', 3.5),
  calendar: () => shadow(32, 61, 22) + lip(`<rect x="7" y="11" width="50" height="47" rx="8"/>`, K.paper, K.paperD) +
    `<path d="M7 19C7 14.6 10.6 11 15 11H49C53.4 11 57 14.6 57 19V25H7Z" fill="${K.tom}"/><rect x="7" y="23" width="50" height="3" fill="${K.tomD}"/>` +
    `<rect x="17" y="5" width="6" height="13" rx="3" fill="#56645b"/><rect x="41" y="5" width="6" height="13" rx="3" fill="#56645b"/><rect x="18" y="6" width="2" height="6" rx="1" fill="#fff" opacity=".5"/>` +
    [0, 1, 2, 3].flatMap((i) => [0, 1].map((j) => `<rect x="${13 + i * 10}" y="${31 + j * 10}" width="7" height="7" rx="2" fill="#e8eee4"/>`)).join('') +
    `<path d="M20 43L28 50L45 32" fill="none" stroke="${K.leafD}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 2)"/><path d="M20 43L28 50L45 32" fill="none" stroke="${K.leaf}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`,
  lock: () => shadow(32, 61, 18) + `<path d="M20 31V22A12 12 0 0 1 44 22V31" fill="none" stroke="${K.stoneD}" stroke-width="8" stroke-linecap="round"/><path d="M20 30V22A12 12 0 0 1 44 22V30" fill="none" stroke="${K.stone}" stroke-width="5" stroke-linecap="round"/><path d="M23 22A9 9 0 0 1 30 13" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/>` +
    lip(`<rect x="11" y="28" width="42" height="29" rx="9"/>`, K.sun, K.sunD) + `<rect x="15" y="31" width="34" height="4" rx="2" fill="${K.sunL}"/>` +
    `<circle cx="32" cy="42" r="5" fill="${K.ink}"/><rect x="30" y="44" width="4" height="8" rx="2" fill="${K.ink}"/>`,
  gift: () => shadow(32, 61, 22) + `<g transform="translate(0 0)">` +
    `<path d="M32 21C24 8 13 10 15 17C16 21 25 22 32 21Z" fill="${K.sunD}"/><path d="M32 21C40 8 51 10 49 17C48 21 39 22 32 21Z" fill="${K.sunD}"/>` +
    `<path d="M32 20C25 10 17 12 18 16C19 19 26 20 32 20Z" fill="${K.sun}"/><path d="M32 20C39 10 47 12 46 16C45 19 38 20 32 20Z" fill="${K.sun}"/></g>` +
    lip(`<rect x="10" y="30" width="44" height="27" rx="5"/>`, K.ber, K.berD) + `<rect x="10" y="30" width="44" height="5" fill="${K.berD}" opacity=".4"/>` +
    lip(`<rect x="7" y="20" width="50" height="12" rx="4"/>`, K.berL, K.ber, 2.5) +
    `<rect x="28" y="20" width="8" height="37" fill="${K.sun}"/><rect x="28" y="33" width="8" height="3" fill="${K.sunD}"/><circle cx="32" cy="20" r="4.5" fill="${K.sunD}"/><circle cx="32" cy="19.5" r="3.2" fill="${K.sunL}"/>` + shine('M12 25H22', 2.5, .65),
  star: () => {
    const pts = starPts(32, 33, 27, 12.5);
    return shadow(32, 61, 18) + `<polygon points="${pts}" transform="translate(0 3)" fill="${K.sunD}" stroke="${K.sunD}" stroke-width="6" stroke-linejoin="round"/><polygon points="${pts}" fill="${K.sun}" stroke="${K.sun}" stroke-width="6" stroke-linejoin="round"/>` +
      `<polygon points="${starPts(32, 33, 15, 7)}" fill="${K.sunL}" stroke="${K.sunL}" stroke-width="3" stroke-linejoin="round"/>` + shine('M20 25L27 24', 3.5) + sparkle(54, 10, .8);
  },
};

function tomato(cx, cy, s = 1, small = false) {
  const t = (x, y) => `${(cx + x * s).toFixed(1)} ${(cy + y * s).toFixed(1)}`;
  return (small ? '' : shadow(cx, cy + 23 * s, 18 * s)) +
    `<ellipse cx="${cx}" cy="${cy + 3 * s}" rx="${21 * s}" ry="${19 * s}" fill="${K.tomD}"/><ellipse cx="${cx}" cy="${cy}" rx="${21 * s}" ry="${19 * s}" fill="${K.tom}"/>` +
    `<path d="M${t(-6, -16)}C${t(-11, -6)} ${t(-11, 8)} ${t(-6, 17)}M${t(6, -16)}C${t(11, -6)} ${t(11, 8)} ${t(6, 17)}" fill="none" stroke="${K.tomD}" stroke-width="${2 * s}" opacity=".35"/>` +
    `<polygon points="${starPts(cx, cy - 16 * s, 11 * s, 4 * s, 5)}" fill="${K.leaf}" stroke="${K.leaf}" stroke-width="${2 * s}" stroke-linejoin="round"/>` +
    `<rect x="${cx - 2 * s}" y="${cy - 25 * s}" width="${4 * s}" height="${9 * s}" rx="${2 * s}" fill="${K.leafD}"/>` +
    `<ellipse cx="${cx - 9 * s}" cy="${cy - 5 * s}" rx="${5 * s}" ry="${3.4 * s}" transform="rotate(-35 ${cx - 9 * s} ${cy - 5 * s})" fill="#fff" opacity=".75"/>`;
}
function treeArt() {
  const blobs = `<circle cx="21" cy="31" r="13"/><circle cx="43" cy="31" r="13"/><circle cx="32" cy="20" r="15"/><circle cx="32" cy="34" r="14"/>`;
  return shadow(32, 60, 20) + `<path d="M27 59C29 51 29 44 28 37H36C35 44 35 51 37 59Z" fill="${K.wood}"/><path d="M32 59C33 51 33 44 33 37H36C35 44 35 51 37 59Z" fill="${K.woodD}"/>` +
    lip(blobs, K.leaf, K.leafD, 3.5) + `<circle cx="27" cy="16" r="6" fill="${K.leafL}"/><circle cx="18" cy="27" r="4" fill="${K.leafL}"/><circle cx="24" cy="12" r="2.5" fill="${K.leafLL}"/>` +
    `<circle cx="42" cy="27" r="3.2" fill="${K.tom}"/><circle cx="26" cy="37" r="3.2" fill="${K.tom}"/><circle cx="36" cy="40" r="3.2" fill="${K.tom}"/><circle cx="41" cy="26" r="1" fill="#fff"/><circle cx="25" cy="36" r="1" fill="#fff"/>`;
}
function chestArt(open) {
  const body = lip(`<rect x="7" y="29" width="50" height="26" rx="6"/>`, K.wood, K.woodD) + `<path d="M7 41H57" stroke="${K.woodD}" stroke-width="2" opacity=".5"/>` +
    `<rect x="14" y="29" width="7" height="27" fill="${K.sun}"/><rect x="43" y="29" width="7" height="27" fill="${K.sun}"/><rect x="14" y="52" width="7" height="4" fill="${K.sunD}"/><rect x="43" y="52" width="7" height="4" fill="${K.sunD}"/>`;
  if (!open) {
    return shadow(32, 61, 25) + body +
      lip(`<path d="M7 31V22C7 13 16 8 32 8C48 8 57 13 57 22V31Z"/>`, K.woodL, K.woodD, 2) + `<rect x="7" y="27" width="50" height="4" fill="${K.woodD}" opacity=".45"/>` +
      `<path d="M14 11.5C16 10.5 18.5 9.6 21 9V31H14Z" fill="${K.sun}"/><path d="M43 9C45.5 9.6 48 10.5 50 11.5V31H43Z" fill="${K.sun}"/>` +
      lip(`<rect x="25" y="24" width="14" height="15" rx="3.5"/>`, K.sun, K.sunD, 2) + `<circle cx="32" cy="30" r="2.6" fill="${K.ink}"/><rect x="31" y="31" width="2" height="5" rx="1" fill="${K.ink}"/>` +
      shine('M12 19C14 14 20 11 27 10.5', 3, .6);
  }
  const rays = `<circle cx="32" cy="20" r="21" fill="${K.sunL}" opacity=".35"/><circle cx="32" cy="21" r="14" fill="${K.sunL}" opacity=".6"/>`;
  return shadow(32, 61, 25) + rays +
    `<path d="M9 26L13 7C14 4 16 3 19 3H45C48 3 50 4 51 7L55 26Z" fill="${K.woodD}"/><path d="M12 25L15 10C16 8 17 7 19 7H45C47 7 48 8 49 10L52 25Z" fill="#5a2e14"/><rect x="14" y="3" width="7" height="22" fill="${K.sunD}"/><rect x="43" y="3" width="7" height="22" fill="${K.sunD}"/>` +
    `<rect x="7" y="24" width="50" height="9" rx="3" fill="#4a250f"/>` +
    [[20, 26], [44, 26], [32, 22]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="${K.sunD}"/><circle cx="${x}" cy="${y - 1}" r="7" fill="${K.sun}"/><circle cx="${x}" cy="${y - 1}" r="4" fill="none" stroke="${K.sunD}" stroke-width="1.5"/>`).join('') +
    `<path d="M26 18L32 11L38 18L32 26Z" fill="${K.ber}"/><path d="M26 18L32 11L32 26Z" fill="${K.berL}"/>` +
    body + lip(`<rect x="25" y="29" width="14" height="12" rx="3.5"/>`, K.sun, K.sunD, 2) + `<circle cx="32" cy="34" r="2.4" fill="${K.ink}"/>` +
    sparkle(10, 12, .9) + sparkle(54, 10, .7) + sparkle(50, 20, .45);
}

// ---------- badges: a medal on two ribbon tails, with an icon or a number ----------
const MEDAL = {
  sun: [K.sun, K.sunD, '#fff3c4', K.tom, K.tomD],
  leaf: [K.leaf, K.leafD, '#dff6cf', K.sky, K.skyD],
  sky: [K.sky, K.skyD, '#dcf3ff', K.sun, K.sunD],
  ber: [K.ber, K.berD, '#efe2fc', K.sun, K.sunD],
  tom: [K.tom, K.tomD, '#ffe1dd', K.leaf, K.leafD],
  night: [K.ber, K.berD, '#2d3f6b', K.sky, K.skyD],
};
const BADGE = {
  'first-photo': ['tom', 'camera'], 'streak-7': ['sun', 'streak-sun', '7'], 'streak-30': ['sun', 'streak-sun', '30'], 'streak-100': ['sun', 'streak-sun', '100'],
  'first-harvest': ['leaf', 'quest-harvest'], 'five-plants': ['leaf', 'sprout', '5'], 'first-tree': ['leaf', 'tree'], 'ten-trees': ['leaf', 'tree', '10'],
  'miles-100': ['sky', 'map-pin', '100'], 'miles-1000': ['sky', 'map-pin', '1000'], 'herb-garden': ['leaf', 'herbs'], 'fruit-bowl': ['tom', 'basket'],
  'night-owl': ['night', 'moon'], 'early-bird': ['sun', 'sunrise'], 'level-5': ['ber', 'star', '5'], 'level-10': ['ber', 'star', '10'],
};
const MINI = {
  sprout: () => `<path d="M32 56V30" stroke="${K.leafD}" stroke-width="5" stroke-linecap="round"/>${leafShape(32, 38, -150, 1.2)}${leafShape(32, 32, -30, 1.35)}<rect x="16" y="50" width="32" height="10" rx="5" fill="${K.pot}"/>`,
  herbs: () => `${leafShape(32, 56, -90, 1.9)}${leafShape(30, 54, -135, 1.5, K.leafL)}${leafShape(34, 54, -45, 1.5, K.leafD, K.ink)}`,
  moon: () => `<path d="M38 8A24 24 0 1 0 58 42A19 19 0 1 1 38 8Z" fill="#fff3c4"/><circle cx="36" cy="36" r="3" fill="#f0dc96"/><circle cx="26" cy="46" r="2" fill="#f0dc96"/>${sparkle(16, 16, 1, '#fff')}${sparkle(54, 18, .7, '#fff')}`,
  sunrise: () => `<rect x="0" y="40" width="64" height="24" fill="${K.leaf}"/><circle cx="32" cy="42" r="16" fill="${K.sunO}"/><circle cx="32" cy="42" r="11" fill="${K.sunL}"/>${Array.from({ length: 5 }, (_, i) => `<rect x="30" y="8" width="5" height="11" rx="2.5" fill="${K.sunO}" transform="rotate(${-60 + i * 30} 32 42)"/>`).join('')}<rect x="0" y="40" width="64" height="24" fill="${K.leaf}"/><path d="M0 44C20 38 44 38 64 44V64H0Z" fill="${K.leafD}"/>`,
};
function badgeArt(id) {
  const [tone, icon, num] = BADGE[id] || ['sun', 'star'];
  const [main, shade, inner, ra, rb] = MEDAL[tone];
  const content = (MINI[icon] || ICONS[icon] || ICONS.star)();
  const fs = num ? (num.length >= 4 ? 11 : num.length === 3 ? 13 : 17) : 0;
  const cid = uid('bc');
  return shadow(32, 61, 14) +
    `<path d="M21 36L13 58L21 55L25 61L31 42Z" fill="${ra}"/><path d="M21 36L17 47L28 41Z" fill="${rb}" opacity=".5"/><path d="M43 36L51 58L43 55L39 61L33 42Z" fill="${ra}"/><path d="M43 36L47 47L36 41Z" fill="${rb}" opacity=".5"/>` +
    lip(`<circle cx="32" cy="27" r="23"/>`, main, shade) + `<circle cx="32" cy="27" r="23" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2" stroke-dasharray="2 4"/>` +
    `<defs><clipPath id="${cid}"><circle cx="32" cy="27" r="17"/></clipPath></defs><circle cx="32" cy="28.5" r="17" fill="${shade}" opacity=".6"/><circle cx="32" cy="27" r="17" fill="${inner}"/>` +
    `<g clip-path="url(#${cid})"><g transform="translate(${num ? 17 : 15} ${num ? 9 : 10}) scale(${num ? .47 : .53})">${content}</g></g>` +
    (num ? `<text x="32" y="${44 - (fs > 13 ? 2 : 0)}" text-anchor="middle" ${FONT} font-size="${fs}" fill="#fff" stroke="${shade}" stroke-width="4" stroke-linejoin="round" paint-order="stroke">${num}</text>` : '') +
    shine('M16 20A17 17 0 0 1 24 9', 3, .55);
}

// ---------- wide scenes (360 x 160) ----------
const cloud = (x, y, s = 1, c = '#fff') => `<g transform="translate(${x} ${y}) scale(${s})" fill="${c}"><circle cx="0" cy="0" r="11"/><circle cx="14" cy="-6" r="14"/><circle cx="29" cy="0" r="10"/><rect x="-11" y="-2" width="50" height="12" rx="6"/></g>`;
const sproutRow = (x0, x1, y, step, kind) => {
  let s = '';
  for (let x = x0, i = 0; x <= x1; x += step, i++) {
    const k = kind === 'mix' ? ['lettuce', 'tomato', 'carrot'][i % 3] : kind;
    if (k === 'lettuce') s += `<circle cx="${x}" cy="${y - 4}" r="7" fill="${K.leafD}"/><circle cx="${x - 3}" cy="${y - 7}" r="5" fill="${K.leaf}"/><circle cx="${x + 3}" cy="${y - 6}" r="4.5" fill="${K.leafL}"/>`;
    else if (k === 'tomato') s += `<path d="M${x} ${y}V${y - 22}" stroke="${K.leafD}" stroke-width="2.5"/>${leafShape(x, y - 10, -150, .45)}${leafShape(x, y - 15, -30, .45)}<circle cx="${x - 4}" cy="${y - 7}" r="3.6" fill="${K.tom}"/><circle cx="${x + 4}" cy="${y - 17}" r="3.6" fill="${K.tom}"/><circle cx="${x - 5}" cy="${y - 8}" r="1" fill="#fff"/>`;
    else if (k === 'carrot') s += `${leafShape(x, y - 1, -110, .55)}${leafShape(x, y - 1, -70, .55, K.leafL)}${leafShape(x, y - 1, -90, .6, K.leaf)}<path d="M${x - 4} ${y}H${x + 4}L${x} ${y + 3}Z" fill="#ff9a3c"/>`;
    else s += `<path d="M${x} ${y}V${y - 9}" stroke="${K.leafD}" stroke-width="2"/>${leafShape(x, y - 6, -150, .4)}${leafShape(x, y - 8, -30, .45)}`;
  }
  return s;
};
const bed = (x, y, w, kind, step = 22) => `<rect x="${x}" y="${y + 4}" width="${w}" height="20" rx="10" fill="#5a2e14"/><rect x="${x}" y="${y}" width="${w}" height="18" rx="9" fill="${K.woodD}"/><rect x="${x + 6}" y="${y + 3}" width="${w - 12}" height="4" rx="2" fill="#a5602f" opacity=".7"/>` + sproutRow(x + 14, x + w - 12, y + 6, step, kind);
const pine = (x, y, s, c, cd) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-2.5" y="-6" width="5" height="10" fill="${K.woodD}"/><path d="M0-44L16-12H-16Z" fill="${cd}"/><path d="M0-44L16-12H0Z" fill="#000" opacity=".12"/><path d="M0-58L13-30H-13Z" fill="${c}"/><path d="M0-58L13-30H0Z" fill="#000" opacity=".1"/><path d="M0-34L19-4H-19Z" fill="${c}"/><path d="M0-34L19-4H0Z" fill="#000" opacity=".12"/></g>`;
const roundTree = (x, y, s, c, cl) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-3" y="-14" width="6" height="16" rx="2" fill="${K.wood}"/><circle cx="0" cy="-26" r="16" fill="${c}"/><circle cx="-11" cy="-18" r="10" fill="${c}"/><circle cx="11" cy="-18" r="10" fill="${c}"/><circle cx="-5" cy="-31" r="6" fill="${cl}"/></g>`;

const SCENES = {
  'scene-garden': () => {
    const g = uid('sg');
    return `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fdcff"/><stop offset="1" stop-color="#e8f8ff"/></linearGradient></defs><rect width="360" height="160" fill="url(#${g})"/>` +
      `<circle cx="300" cy="38" r="30" fill="${K.sunL}" opacity=".5"/><circle cx="300" cy="38" r="19" fill="${K.sun}"/><circle cx="295" cy="33" r="6" fill="#fff" opacity=".5"/>` +
      cloud(48, 34, 1) + cloud(170, 22, .75) + cloud(236, 52, .55, '#f4fbff') +
      `<path d="M0 92C50 68 110 74 170 86C230 98 290 66 360 80V160H0Z" fill="#a6e07e"/>` + roundTree(318, 86, .7, K.leaf, K.leafL) + roundTree(290, 92, .5, K.leafD, K.leaf) +
      `<path d="M0 108C80 92 160 100 240 97C300 95 330 101 360 105V160H0Z" fill="${K.leaf}"/>` +
      `<g fill="#fff">${Array.from({ length: 7 }, (_, i) => `<rect x="${12 + i * 17}" y="${88 + i * .8}" width="6" height="22" rx="3"/>`).join('')}<rect x="8" y="94" width="116" height="4" rx="2"/><rect x="8" y="102" width="116" height="4" rx="2"/></g>` +
      `<path d="M0 132C100 120 250 124 360 128V160H0Z" fill="${K.leafD}" opacity=".35"/>` +
      bed(22, 120, 150, 'mix', 24) + bed(190, 124, 150, 'lettuce', 20) +
      `<g transform="translate(176 66)"><path d="M0 0C-4-6-10-4-8 1C-6 5-2 3 0 0Z" fill="${K.ber}"/><path d="M0 0C4-6 10-4 8 1C6 5 2 3 0 0Z" fill="${K.berL}"/></g>` + sparkle(250, 86, .6, '#fff', .9);
  },
  'scene-night': () => {
    const g = uid('sn');
    const stars = [[20, 18], [62, 40], [96, 14], [140, 30], [188, 12], [226, 36], [262, 18], [340, 26], [120, 56], [30, 60], [210, 58], [350, 60]];
    return `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#151f45"/><stop offset="1" stop-color="#34497e"/></linearGradient></defs><rect width="360" height="160" fill="url(#${g})"/>` +
      stars.map(([x, y], i) => i % 3 ? `<circle cx="${x}" cy="${y}" r="${1.2 + (i % 2)}" fill="#fff" opacity=".8"/>` : sparkle(x, y, .55, '#fff6c9')).join('') +
      `<circle cx="300" cy="40" r="30" fill="#fff3c4" opacity=".12"/><path d="M296 16A24 24 0 1 0 322 52A19 19 0 1 1 296 16Z" fill="#fff3c4"/><circle cx="292" cy="44" r="3" fill="#ecd88f"/><circle cx="302" cy="54" r="2" fill="#ecd88f"/>` +
      cloud(150, 70, .6, '#3f5590') +
      `<path d="M0 96C60 74 120 82 180 92C240 102 300 76 360 86V160H0Z" fill="#20503a"/>` + pine(330, 96, .7, '#1d4733', '#173b2a') + pine(306, 98, .55, '#1d4733', '#173b2a') +
      `<path d="M0 112C80 98 160 106 240 102C300 99 330 106 360 109V160H0Z" fill="#183f2c"/>` +
      `<rect x="40" y="128" width="130" height="18" rx="9" fill="#3a1d0c"/><rect x="190" y="130" width="130" height="18" rx="9" fill="#3a1d0c"/>` +
      `<g opacity=".75">${sproutRow(54, 160, 132, 22, 'lettuce')}${sproutRow(204, 310, 134, 22, 'sprout')}</g><rect width="360" height="160" fill="#1a2350" opacity=".28"/>` +
      [[70, 100], [130, 86], [236, 92], [276, 118], [178, 120], [26, 120]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="${K.sunL}" opacity=".18"/><circle cx="${x}" cy="${y}" r="2.2" fill="${K.sunL}"/>`).join('');
  },
  'scene-harvest': () => {
    const g = uid('sh');
    const crate = (x, y, fill) => `<rect x="${x}" y="${y + 4}" width="62" height="34" rx="4" fill="${K.woodD}"/><rect x="${x}" y="${y}" width="62" height="32" rx="4" fill="${K.wood}"/><rect x="${x + 4}" y="${y + 13}" width="54" height="3" fill="${K.woodD}" opacity=".5"/><rect x="${x + 4}" y="${y + 23}" width="54" height="3" fill="${K.woodD}" opacity=".5"/>` + fill(x, y);
    return `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd98a"/><stop offset="1" stop-color="#fff4dc"/></linearGradient></defs><rect width="360" height="160" fill="url(#${g})"/>` +
      `<circle cx="96" cy="92" r="50" fill="${K.sunL}" opacity=".45"/><circle cx="96" cy="92" r="34" fill="${K.sunO}"/><circle cx="96" cy="92" r="24" fill="${K.sun}"/>` + cloud(230, 34, .8, '#fffaf0') +
      `<path d="M0 92C80 84 150 88 220 90C280 92 320 86 360 88V160H0Z" fill="#f2c25a"/>` +
      `<g stroke="${K.sunD}" stroke-width="3" opacity=".55">${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 46 - 20} 160L${150 + i * 8} 94"/>`).join('')}</g>` +
      `<path d="M0 128C90 118 250 120 360 126V160H0Z" fill="${K.leaf}"/><path d="M0 140C120 132 250 134 360 138V160H0Z" fill="${K.leafD}"/>` +
      crate(30, 106, (x, y) => [10, 24, 38, 52].map((d, i) => `<circle cx="${x + d}" cy="${y - 2 + (i % 2) * 2}" r="8" fill="${K.tom}"/><circle cx="${x + d - 3}" cy="${y - 5 + (i % 2) * 2}" r="2" fill="#fff" opacity=".7"/>`).join('')) +
      crate(104, 112, (x, y) => [12, 26, 40, 52].map((d) => `<path d="M${x + d} ${y + 2}L${x + d - 4} ${y - 16}" stroke="#ff9a3c" stroke-width="7" stroke-linecap="round"/>${leafShape(x + d - 4, y - 16, -100, .45)}`).join('')) +
      `<ellipse cx="226" cy="128" rx="24" ry="18" fill="#e9781f"/><ellipse cx="226" cy="126" rx="24" ry="18" fill="#ff9a3c"/><path d="M216 112C214 120 214 132 216 142M236 112C238 120 238 132 236 142" stroke="#e9781f" stroke-width="2.5" fill="none"/><rect x="223" y="104" width="6" height="10" rx="2" fill="${K.leafD}"/><ellipse cx="214" cy="120" rx="5" ry="3" fill="#fff" opacity=".5" transform="rotate(-30 214 120)"/>` +
      `<g transform="translate(262 82) scale(1.15)">${ICONS.basket()}</g>` + sparkle(180, 70, .8, '#fff') + sparkle(330, 60, .6, '#fff');
  },
  'scene-forest': () => {
    const g = uid('sf');
    return `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b6e8ff"/><stop offset="1" stop-color="#eefbe8"/></linearGradient></defs><rect width="360" height="160" fill="url(#${g})"/>` +
      `<circle cx="64" cy="36" r="17" fill="${K.sun}"/><circle cx="64" cy="36" r="26" fill="${K.sunL}" opacity=".35"/>` + cloud(150, 30, .7) + cloud(280, 22, .9) +
      [10, 46, 82, 118, 154, 190, 226, 262, 298, 334].map((x, i) => pine(x, 96 + (i % 2) * 4, .8 + (i % 3) * .1, '#a8dc9b', '#94cf88')).join('') +
      `<path d="M0 100C80 92 260 92 360 98V160H0Z" fill="#7cc864"/>` +
      [28, 92, 160, 236, 304].map((x, i) => roundTree(x, 118 + (i % 2) * 3, .95 + (i % 2) * .15, K.leaf, K.leafL)).join('') +
      `<path d="M0 124C100 116 260 116 360 122V160H0Z" fill="${K.leaf}"/>` +
      `<path d="M150 160C160 146 176 138 200 132C214 128 222 124 218 120H232C240 126 232 134 214 140C194 147 182 152 180 160Z" fill="#f0dcae"/>` +
      pine(40, 152, 1.2, K.leafD, '#22722b') + pine(326, 154, 1.3, K.leafD, '#22722b') + pine(292, 150, .9, K.leafD, '#22722b') +
      `<g fill="${K.ink}" opacity=".6"><path d="M210 50Q214 46 218 50Q222 46 226 50" stroke="${K.ink}" stroke-width="2" fill="none"/><path d="M236 62Q239 59 242 62Q245 59 248 62" stroke="${K.ink}" stroke-width="2" fill="none"/></g>` +
      `<circle cx="112" cy="146" r="4" fill="${K.tom}"/><circle cx="124" cy="150" r="3.5" fill="${K.sun}"/><circle cx="252" cy="146" r="3.5" fill="${K.berL}"/>`;
  },
};

const wrap = (inner, name, size, cls, vb = '0 0 64 64') => {
  const [, , vw, vh] = vb.split(' ').map(Number);
  const h = Math.round(size * vh / vw);
  return `<svg class="art ${cls}" width="${size}" height="${h}" viewBox="${vb}" aria-hidden="true" focusable="false" data-art="${name}">${inner}</svg>`;
};
const placeholder = (name, size, cls) => wrap(`${shadow(32, 58, 18)}${lip('<circle cx="32" cy="32" r="22"/>', K.paperD, '#b9c6b4')}<circle cx="32" cy="32" r="13" fill="#eef3eb"/>${shine('M18 26A15 15 0 0 1 26 15', 3.5, .7)}`, String(name), size, cls);

export function art(name, { size = 48, cls = '' } = {}) {
  try {
    name = String(name || '');
    if (SCENES[name]) return wrap(SCENES[name](), name, size, cls, '0 0 360 160');
    if (ICONS[name]) return wrap(ICONS[name](), name, size, cls);
    if (name.startsWith('badge-')) return wrap(badgeArt(name.slice(6)), name, size, cls);
    return placeholder(name, size, cls);
  } catch (e) {
    return placeholder('error', size, cls);
  }
}

// ---------- Pip ----------
const CSS = `
.pip .pip-bob{animation:pipBob 2.6s cubic-bezier(.45,0,.55,1) infinite}
.pip .pip-sway{transform-origin:60px 45px;animation:pipSway 3.2s ease-in-out infinite}
.pip .pip-fa{animation:pipFA 4.8s step-end infinite}
.pip .pip-fb{animation:pipFB 4.8s step-end infinite}
.pip .pip-fk{animation:pipFK 4.8s step-end infinite}
.pip .pip-wave{transform-origin:84px 78px;animation:pipWave .7s ease-in-out infinite alternate}
.pip .pip-twinkle{animation:pipTw 1.6s ease-in-out infinite}
.pip .pip-twinkle.d2{animation-delay:-.8s}
.pip .pip-drip{animation:pipDrip 1.2s linear infinite}
@keyframes pipBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes pipSway{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}
@keyframes pipFA{0%{opacity:1}20%{opacity:0}40%{opacity:1}60%{opacity:0}80%{opacity:1}90%{opacity:0}94%{opacity:1}}
@keyframes pipFB{0%{opacity:0}20%{opacity:1}40%{opacity:0}60%{opacity:1}80%{opacity:0}}
@keyframes pipFK{0%{opacity:0}90%{opacity:1}94%{opacity:0}}
@keyframes pipWave{from{transform:rotate(-10deg)}to{transform:rotate(12deg)}}
@keyframes pipTw{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.7)}}
@keyframes pipDrip{0%{transform:translateY(-4px);opacity:0}25%{opacity:1}100%{transform:translateY(10px);opacity:0}}
.pip .pip-twinkle{transform-box:fill-box;transform-origin:center}
@media (prefers-reduced-motion: reduce){.pip *{animation:none!important}}
`;
let cssDone = false;
function injectCss() {
  if (cssDone || typeof document === 'undefined' || !document.head) return;
  cssDone = true;
  if (document.getElementById('pip-css')) return;
  const st = document.createElement('style'); st.id = 'pip-css'; st.textContent = CSS; document.head.appendChild(st);
}

const POSE_MOOD = { wave: 'happy', cheer: 'thriving', proud: 'happy', sad: 'poorly', sleepy: 'sleepy', point: 'happy', water: 'happy', think: 'okay', party: 'thriving', wow: 'new' };

// the LCD face on Pip's front: screen at (37,62) 46 x 33, 24 x 14 sprite cells of 1.75
function pipScreen(mood) {
  const gid = uid('pg'), fid = uid('pf');
  const c = 1.75, px = 1.42, ox = 39, oy = 66.25;
  const layer = (pix, cls, hidden) => {
    let full = '', half = '';
    for (const [x, y, l] of pix) { const r = `M${(ox + x * c).toFixed(2)} ${(oy + y * c).toFixed(2)}h${px}v${px}h-${px}z`; if (l === 1) full += r; else half += r; }
    return `<g class="${cls}"${hidden ? ' opacity="0"' : ''} filter="url(#${fid})"><path d="${full}" fill="${LCD.on}"/>${half ? `<path d="${half}" fill="${LCD.on}" opacity=".42"/>` : ''}</g>`;
  };
  const A = facePixels(mood, 0, false, { frame: 0, blink: false });
  const B = facePixels(mood, 0, false, { frame: 1, blink: false });
  const Kp = facePixels(mood, 0, false, { frame: 0, blink: true });
  return `<defs><pattern id="${gid}" x="${ox}" y="${oy}" width="${c}" height="${c}" patternUnits="userSpaceOnUse"><rect width="${px}" height="${px}" fill="${LCD.on}" opacity=".08"/></pattern>` +
    `<filter id="${fid}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation=".9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>` +
    `<rect x="33" y="61" width="54" height="40" rx="12" fill="#0c100d"/><rect x="33" y="58.5" width="54" height="40" rx="12" fill="#1d2420"/><rect x="36" y="59.5" width="48" height="3" rx="1.5" fill="#fff" opacity=".12"/>` +
    `<rect x="37" y="62" width="46" height="33" rx="8" fill="${LCD.screen}"/><rect x="37" y="62" width="46" height="33" rx="8" fill="url(#${gid})"/>` +
    layer(A, 'pip-fa') + layer(B, 'pip-fb', true) + layer(Kp, 'pip-fk', true) +
    `<path d="M45 62H66L52 79H37V70C37 65.6 40.6 62 45 62Z" fill="#fff" opacity=".06"/>`;
}

const ARM = K.leafD;
// an arm: a stem from the pot side to the hand, ending in a leaf hand pointing at angle a
const arm = (x1, y1, cx, cy, x2, y2, a, cls = '') => `<g${cls ? ` class="${cls}"` : ''}><path d="M${x1} ${y1}Q${cx} ${cy} ${x2} ${y2}" fill="none" stroke="${ARM}" stroke-width="6" stroke-linecap="round"/>${leafShape(x2, y2, a, .88)}</g>`;
const ARMS = {
  rest: [arm(40, 82, 28, 88, 27, 98, 105), arm(80, 82, 92, 88, 93, 98, 75)],
  wave: [arm(40, 82, 28, 88, 27, 98, 105), arm(80, 80, 100, 74, 100, 54, -75, 'pip-wave')],
  cheer: [arm(40, 78, 22, 66, 20, 46, -110), arm(80, 78, 98, 66, 100, 46, -70)],
  proud: [arm(40, 76, 20, 78, 30, 92, 40), arm(80, 76, 100, 78, 90, 92, 140)],
  sad: [arm(40, 84, 32, 94, 31, 106, 95), arm(80, 84, 88, 94, 89, 106, 85)],
  point: [arm(40, 82, 28, 88, 27, 98, 105), arm(80, 80, 98, 82, 106, 72, -15)],
  water: [arm(40, 82, 28, 88, 27, 98, 105), arm(80, 78, 100, 70, 98, 50, -80)],
  think: [arm(40, 82, 28, 88, 27, 98, 105), ''],
  party: [arm(40, 78, 22, 66, 20, 46, -110), arm(80, 80, 98, 82, 104, 70, -30)],
  wow: [arm(40, 78, 24, 74, 14, 62, -150), arm(80, 78, 96, 74, 106, 62, -30)],
};
const sproutUp = () => `<g class="pip-sway"><path d="M60 46C60 38 61 30 60 21" fill="none" stroke="${K.leafD}" stroke-width="4" stroke-linecap="round"/>${leafShape(60, 31, -155, 1.05)}${leafShape(60, 24, -28, 1.2)}<circle cx="60" cy="20" r="2.6" fill="${K.leafL}"/></g>`;
const sproutDroop = () => `<g class="pip-sway"><path d="M60 46C60 38 62 31 68 27" fill="none" stroke="${K.leafD}" stroke-width="4" stroke-linecap="round"/>${leafShape(61, 35, 160, .95)}${leafShape(68, 27, 60, 1.05)}</g>`;

const EXTRA = {
  wave: () => sparkle(104, 40, .7, K.sun),
  cheer: () => `<g class="pip-twinkle">${sparkle(14, 30, .9, K.sun)}</g><g class="pip-twinkle d2">${sparkle(106, 28, .8, K.sun)}</g>` + `<rect x="30" y="14" width="5" height="5" rx="1" fill="${K.sky}" transform="rotate(20 32 16)"/><rect x="88" y="12" width="5" height="5" rx="1" fill="${K.tom}" transform="rotate(-25 90 14)"/><circle cx="44" cy="8" r="2.5" fill="${K.ber}"/>`,
  proud: () => `<path d="M55 98L52 108L56 106L58 110L60 100Z" fill="${K.tom}"/><path d="M65 98L68 108L64 106L62 110L60 100Z" fill="${K.tomD}"/><circle cx="60" cy="99" r="6" fill="${K.sunD}"/><circle cx="60" cy="98" r="6" fill="${K.sun}"/><polygon points="${starPts(60, 98, 3.6, 1.6)}" fill="#fff6c9"/>` + `<g class="pip-twinkle">${sparkle(20, 36, .8, K.sun)}</g><g class="pip-twinkle d2">${sparkle(100, 30, .7, K.sun)}</g>`,
  sad: () => `<g transform="translate(86 14)">${cloud(0, 0, .55, '#b9c7bf')}<g class="pip-drip"><path d="M4 12C5 14 6 15 6 16.5A2 2 0 0 1 2 16.5C2 15 3 14 4 12Z" fill="${K.sky}"/><path d="M16 12C17 14 18 15 18 16.5A2 2 0 0 1 14 16.5C14 15 15 14 16 12Z" fill="${K.sky}"/></g></g>`,
  sleepy: () => `<path d="M100 10A12 12 0 1 0 112 28A9.5 9.5 0 1 1 100 10Z" fill="${K.sun}"/><g class="pip-twinkle">${sparkle(86, 16, .5, K.sunL)}</g><g class="pip-twinkle d2">${sparkle(16, 22, .55, K.sunL)}</g>` +
    '',
  point: () => `<g stroke="${K.sun}" stroke-width="2.5" stroke-linecap="round"><path d="M112 60L117 56M114 72H119M112 83L117 87"/></g>`,
  water: () => `<g transform="translate(84 32) rotate(-25)"><path d="M6 6C6-2 18-2 18 6" fill="none" stroke="${K.skyD}" stroke-width="3"/><path d="M4 12L-12 4" stroke="${K.skyD}" stroke-width="5" stroke-linecap="round"/><path d="M4 11L-11 4" stroke="${K.sky}" stroke-width="3" stroke-linecap="round"/><rect x="2" y="6" width="22" height="16" rx="5" fill="${K.skyD}"/><rect x="2" y="5" width="22" height="15" rx="5" fill="${K.sky}"/><rect x="5" y="8" width="3" height="8" rx="1.5" fill="#fff" opacity=".6"/></g>` +
    `<g class="pip-drip"><path d="M70 18C71 20 72 21 72 22.5A2 2 0 0 1 68 22.5C68 21 69 20 70 18Z" fill="${K.sky}"/><path d="M64 14C65 16 66 17 66 18.5A2 2 0 0 1 62 18.5C62 17 63 16 64 14Z" fill="${K.sky}"/></g>`,
  think: () => `<g><path d="M84 86Q100 100 80 104" fill="none" stroke="${ARM}" stroke-width="6" stroke-linecap="round"/>${leafShape(80, 104, -160, .88)}</g>` +
    `<circle cx="90" cy="44" r="3" fill="#fff" stroke="${K.paperD}" stroke-width="2"/><circle cx="98" cy="33" r="4.5" fill="#fff" stroke="${K.paperD}" stroke-width="2"/>` +
    `<g transform="translate(96 4)"><rect x="0" y="0" width="22" height="20" rx="10" fill="#fff" stroke="${K.paperD}" stroke-width="2"/><text x="11" y="15.5" text-anchor="middle" ${FONT} font-size="15" fill="${K.ber}">?</text></g>`,
  party: () => `<g transform="rotate(-18 40 40)"><path d="M30 44L40 14L50 44Z" fill="${K.ber}"/><path d="M33 36L47 36L45 30L35 30Z" fill="${K.sun}"/><path d="M37 24L43 24L41.5 19L38.5 19Z" fill="${K.sun}"/><path d="M40 14L50 44H44Z" fill="#000" opacity=".12"/><circle cx="40" cy="13" r="4" fill="${K.tom}"/><rect x="28" y="42" width="24" height="4" rx="2" fill="${K.berD}"/></g>` +
    [[12, 30, K.sun, 20], [100, 18, K.sky, -30], [108, 46, K.tom, 40], [20, 64, K.leaf, -10], [80, 8, K.ber, 15], [64, 6, K.sun, 60]].map(([x, y, f, r], i) => `<rect class="pip-twinkle${i % 2 ? ' d2' : ''}" x="${x}" y="${y}" width="6" height="4" rx="1.2" fill="${f}" transform="rotate(${r} ${x + 3} ${y + 2})"/>`).join('') +
    `<path d="M88 30C94 26 96 34 102 30C108 26 110 34 116 30" fill="none" stroke="${K.tom}" stroke-width="2.5" stroke-linecap="round"/>`,
  wow: () => `<g stroke="${K.sun}" stroke-width="3" stroke-linecap="round"><path d="M34 18L38 26M60 8V16M86 18L82 26"/></g>` + `<g class="pip-twinkle">${sparkle(14, 40, .7, K.sun)}</g><g class="pip-twinkle d2">${sparkle(106, 40, .7, K.sun)}</g>`,
};

export function mascot(pose = 'wave', { size = 120, mood, cls = '' } = {}) {
  try {
    injectCss();
    const p = POSES.includes(pose) ? pose : 'wave';
    const m = mood && POSE_MOOD[p] !== undefined && typeof mood === 'string' ? mood : POSE_MOOD[p];
    const droop = p === 'sad' || p === 'sleepy';
    const [aL, aR] = ARMS[p] || ARMS.rest;
    const body = `<path d="M31 55H89L83 104C82.5 108 80 110 76 110H44C40 110 37.5 108 37 104Z"/>`;
    const svg =
      `<ellipse cx="60" cy="114" rx="30" ry="4.5" fill="${K.ink}" opacity=".14"/>` +
      `<g class="pip-bob">` + aL + aR +
      (droop ? sproutDroop() : sproutUp()) +
      lip(body, K.pot, K.potD) +
      `<path d="M74 55H89L83 104C82.5 108 80 110 76 110H72C77 92 77 70 74 55Z" fill="${K.potD}" opacity=".55"/>` +
      `<path d="M37 60L40 100" stroke="${K.potL}" stroke-width="4" stroke-linecap="round" opacity=".8"/>` +
      lip(`<rect x="24" y="42" width="72" height="15" rx="7"/>`, K.pot, K.potD) +
      `<rect x="28" y="44" width="64" height="4" rx="2" fill="${K.potL}"/><ellipse cx="60" cy="43" rx="30" ry="3.2" fill="${K.soil}"/><path d="M84 45H92" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".35"/>` +
      pipScreen(m) +
      (EXTRA[p] ? EXTRA[p]() : '') +
      `</g>`;
    return `<svg class="pip ${cls}" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true" focusable="false" data-pose="${p}" data-mood="${m}">${svg}</svg>`;
  } catch (e) {
    return placeholder('pip', size, cls);
  }
}
