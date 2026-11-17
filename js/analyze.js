// On-device plant photo check. Nothing is uploaded and no account is used:
// 1. colour analysis of the leaves (always on, instant);
// 2. optional "smart check": a CLIP vision model downloaded once into the browser (Transformers.js),
//    which compares the photo with descriptions like "a wilted plant".

export async function shrink(file, max = 720) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', .82));
  return { blob, canvas: c };
}

function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx];
}

// Count leaf-coloured pixels: healthy green, yellowing, and dry brown (only near green, so soil is not counted)
export function colours(canvas) {
  const W = 160, H = Math.round(canvas.height / canvas.width * 160);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.drawImage(canvas, 0, 0, W, H);
  const px = x.getImageData(0, 0, W, H).data;
  const cls = new Uint8Array(W * H); // 0 other, 1 green, 2 yellow, 3 brown candidate
  let bright = 0;
  for (let i = 0; i < W * H; i++) {
    const [h, s, v] = hsv(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
    bright += v;
    if (h >= 65 && h <= 170 && s > .18 && v > .14) cls[i] = 1;
    else if (h >= 42 && h < 65 && s > .3 && v > .38) cls[i] = 2;
    else if (h >= 15 && h < 42 && s > .35 && v > .28 && v < .75) cls[i] = 3;
  }
  let green = 0, yellow = 0, brown = 0;
  const near = (i) => { const xx = i % W, yy = (i / W) | 0; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const j = (yy + dy) * W + xx + dx; if (j >= 0 && j < W * H && cls[j] === 1) return true; } return false; };
  for (let i = 0; i < W * H; i++) {
    if (cls[i] === 1) green++;
    else if (cls[i] === 2 && near(i)) yellow++;
    else if (cls[i] === 3 && near(i)) brown++;
  }
  const leaf = green + yellow + brown || 1;
  return { cover: green / (W * H), green: green / leaf, yellow: yellow / leaf, brown: brown / leaf, brightness: bright / (W * H) };
}

// ---- optional smart check ----
const LABELS = {
  healthy: 'a photo of a healthy green plant with fresh leaves',
  wilted: 'a photo of a wilted drooping plant',
  yellow: 'a photo of a plant with yellow leaves',
  dry: 'a photo of a plant with dry brown crispy leaves',
  pests: 'a close-up photo of insects or pests on plant leaves',
  fruit: 'a photo of a plant with ripe fruit or vegetables',
  noplant: 'a photo with no plant in it',
};
let clip;
export async function loadSmart(onProgress) {
  if (!clip) {
    clip = (async () => {
      const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2');
      env.allowLocalModels = false;
      return pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32', { dtype: 'q8', progress_callback: onProgress });
    })();
    clip.catch(() => { clip = null; });
  }
  return clip;
}
export async function smart(canvas, onProgress) {
  const pipe = await loadSmart(onProgress);
  const url = canvas.toDataURL('image/jpeg', .8);
  const out = await pipe(url, Object.values(LABELS));
  const keys = Object.keys(LABELS);
  const res = {}; out.forEach((o) => { res[keys[Object.values(LABELS).indexOf(o.label)]] = o.score; });
  return res;
}

// Turn the measurements into a score, a mood for the robot pot, and friendly notes
export function judge(m, s, plant, prev) {
  const notes = [];
  if (m.brightness < .22) notes.push('The photo is quite dark. Try snapping near a window tomorrow so the check can see the leaves.');
  let score = Math.round(100 * (m.green - m.yellow * .9 - m.brown * 1.2) + 8);
  if (s) score = Math.round(score * .6 + 100 * (s.healthy + s.fruit * .8 + (1 - s.wilted - s.pests - s.dry - s.yellow) * .3) * .4);
  score = Math.max(5, Math.min(100, score));
  let mood = score >= 85 ? 'thriving' : score >= 70 ? 'happy' : score >= 55 ? 'okay' : score >= 40 ? 'thirsty' : 'poorly';
  if (m.cover < .02 && !(s && s.noplant < .3)) { notes.push('We couldn’t see many leaves. Get a bit closer so the plant fills most of the photo.'); mood = mood === 'thriving' ? 'happy' : mood; }
  if (s?.noplant > .45) notes.push('This doesn’t look like a plant to the smart check. Your streak still counts, but try to snap the plant itself.');
  if (m.yellow > .12) notes.push('Some leaves are turning yellow. This often means too much water or hungry soil: let the top of the compost dry a little, and feed it every couple of weeks.');
  if (m.brown > .1 || s?.dry > .3) notes.push('Some leaf edges look brown and dry. Give it a good drink and move it out of hot midday sun for a few days.');
  if (s?.wilted > .3) notes.push('It looks a bit droopy. Check the soil with your finger: if it’s dry, water slowly until it drips from the bottom.');
  if (s?.pests > .3) notes.push('Look under the leaves for tiny bugs. A gentle spray of water knocks most of them off.');
  if (s?.fruit > .35) notes.push('Is something ripe? Pick it while it’s at its best and taste the zero-mile difference.');
  if (prev?.cover && m.cover > prev.cover * 1.15) notes.push('Your plant looks bigger than in your last photo. Nice growing!');
  if (!notes.length || score >= 80) notes.unshift(score >= 85 ? 'Lovely, healthy green leaves. Keep doing what you’re doing!' : score >= 70 ? 'Looking good! Mostly fresh green leaves.' : 'Hanging in there.');
  if (plant?.grow?.tips?.length) notes.push(`Tip for ${plant.name.toLowerCase()}: ${plant.grow.tips[new Date().getDate() % plant.grow.tips.length]}`);
  return { score, mood, notes };
}
