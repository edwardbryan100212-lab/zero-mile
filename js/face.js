// The pot's face, drawn on a canvas. Shared by the 3D pot (js/pot3d.js) and any 2D place that shows the
// plant's mood (Today dashboard, plant cards). API: drawFace(ctx, w, h, mood, t) where mood is one of
// FACE_MOODS and t is seconds (for blinks and small idle motion). moodWord(mood) gives a short label.
export const FACE_MOODS = ['thriving', 'happy', 'okay', 'thirsty', 'poorly', 'sleepy', 'new'];
const WORDS = { thriving: 'Thriving', happy: 'Happy', okay: 'Doing okay', thirsty: 'A bit droopy', poorly: 'Needs help', sleepy: 'Waiting for a photo', new: 'Just planted' };
export const moodWord = (m) => WORDS[m] || WORDS.okay;
export function drawFace(ctx, w, h, mood = 'okay', t = 0) {
  // placeholder until the redesign lands: simple round eyes and a mouth
  ctx.fillStyle = '#16251c'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#8af5a6';
  const r = h * .1;
  for (const x of [w * .36, w * .64]) { ctx.beginPath(); ctx.arc(x, h * .42, r, 0, 7); ctx.fill(); }
  ctx.lineWidth = h * .05; ctx.strokeStyle = '#8af5a6'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(w / 2, h * .58, h * .14, .2 * Math.PI, .8 * Math.PI); ctx.stroke();
}
