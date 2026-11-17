// A terracotta pot with a little rounded screen on the front. The screen shows a friendly face
// (drawn by js/face.js) that blinks, looks around and changes with the plant's mood.
import * as THREE from 'three';
import { drawFace } from './face.js';
import { soilTexture } from './textures.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
// better moods hop, worse ones droop
const RANK = { poorly: 0, thirsty: 1, sleepy: 2, okay: 2, new: 2, happy: 3, thriving: 4 };
const LIGHT = { thriving: '#7dff9e', happy: '#7dff9e', okay: '#5fe08a', new: '#4fd67e', sleepy: '#9fb8ff', thirsty: '#ffd25e', poorly: '#ff8a6b' };

function roundRect(x, X, Y, w, h, r) {
  x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r);
  x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath();
}

export function makePot(radius = .14) {
  const R = radius, H = R * 1.25;
  const g = new THREE.Group();
  const clay = new THREE.MeshStandardMaterial({ color: '#c8693f', roughness: .82 });
  const prof = [[0, -H], [R * .74, -H], [R * .78, -H + .01], [R * .96, -H * .12], [R * 1.0, -H * .1], [R * 1.08, -H * .1], [R * 1.1, 0], [R * 1.02, .002], [R * .98, -H * .05]];
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 64), clay);
  body.castShadow = body.receiveShadow = true; g.add(body);
  const soilY = -H * .06;
  const soil = new THREE.Mesh(new THREE.CircleGeometry(R * .98, 48), new THREE.MeshStandardMaterial({ map: soilTexture(), roughness: 1 }));
  soil.rotation.x = -Math.PI / 2; soil.position.y = soilY; g.add(soil);

  // radius of the pot wall at height y, so the screen hugs the slope
  const y0 = -H + .01, y1 = -H * .12;
  const wall = (y) => R * .78 + (y - y0) / (y1 - y0) * R * .18;
  // a curved strip on the pot wall, centred on the front (+Z)
  const strip = (h, theta, lift) => {
    const top = -H * .5 + h / 2, bot = -H * .5 - h / 2;
    return new THREE.CylinderGeometry(wall(top) + lift, wall(bot) + lift, h, 40, 1, true, -theta / 2, theta).translate(0, -H * .5, 0);
  };

  // soft cream bezel: a rounded frame with a gentle bevel, drawn once
  const bc = document.createElement('canvas'); bc.width = 512; bc.height = 248;
  {
    const x = bc.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 0, bc.height);
    gr.addColorStop(0, '#fbf7ee'); gr.addColorStop(1, '#ddd3c1');
    x.fillStyle = gr; roundRect(x, 2, 2, bc.width - 4, bc.height - 4, 64); x.fill();
    x.fillStyle = '#c9bea9'; roundRect(x, 20, 20, bc.width - 40, bc.height - 40, 50); x.fill(); // inner lip in shade
  }
  const bezTex = new THREE.CanvasTexture(bc); bezTex.colorSpace = THREE.SRGBColorSpace; bezTex.anisotropy = 4;
  const bez = new THREE.Mesh(strip(H * .64, Math.PI * .6, R * .008), new THREE.MeshStandardMaterial({ map: bezTex, alphaTest: .5, roughness: .5 }));
  g.add(bez);

  // the screen itself: the face canvas, clipped to a rounded rectangle, glowing a little
  const c = document.createElement('canvas'); c.width = 512; c.height = 232;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const scr = new THREE.Mesh(strip(H * .53, Math.PI * .53, R * .016), new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: .6, roughness: .28, alphaTest: .5 }));
  g.add(scr);

  // a little antenna on the rim with a light that shows the mood
  const ant = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(R * .016, R * .022, R * .4, 10), new THREE.MeshStandardMaterial({ color: '#33443a', roughness: .5 }));
  stem.position.y = R * .2; ant.add(stem);
  const bulbMat = new THREE.MeshStandardMaterial({ color: LIGHT.new, emissive: LIGHT.new, emissiveIntensity: .9, roughness: .3 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(R * .065, 20, 14), bulbMat);
  bulb.position.y = R * .42; ant.add(bulb);
  const aa = 1.15; // around the rim, to the right of the face
  ant.position.set(Math.sin(aa) * R * 1.04, -H * .02, Math.cos(aa) * R * 1.04);
  ant.rotation.set(Math.cos(aa) * .22, 0, -Math.sin(aa) * .22); // leans out a little
  g.add(ant);

  // a saucer
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(R * .95, R * .85, R * .08, 48), clay);
  saucer.position.y = -H - R * .04; saucer.receiveShadow = true; g.add(saucer);
  const bottom = -H - R * .08;

  let mood = 'new', t = 0, since = 0;
  function draw() {
    const x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    x.save(); roundRect(x, 0, 0, c.width, c.height, 46); x.clip();
    drawFace(x, c.width, c.height, mood, t);
    // a thin inner shadow so the glass sits inside the bezel
    x.lineWidth = 10; x.strokeStyle = 'rgba(0,0,0,.28)'; roundRect(x, 0, 0, c.width, c.height, 46); x.stroke();
    x.restore();
    tex.needsUpdate = true;
  }
  draw();

  // the react animation: a hop for a better mood, a droop for a worse one (600 ms, one overshoot at most)
  let react = null, moved = 0;
  const bump = (p, a, b) => (p > a && p < b ? Math.sin(Math.PI * (p - a) / (b - a)) : 0);
  function animate(dt) {
    if (!react) return;
    react.p = Math.min(1, react.p + dt / .6);
    const p = react.p, s0 = react.s, up = react.up;
    let sy, dy;
    if (up) { // crouch, hop with a stretch, land with a squash, settle
      sy = 1 - .1 * bump(p, 0, .18) + .06 * bump(p, .18, .62) - .07 * bump(p, .62, .82);
      dy = R * .28 * bump(p, .18, .66);
    } else { // sag down, then one small lift back
      sy = 1 - .09 * bump(p, 0, .62) + .025 * bump(p, .62, 1);
      dy = 0;
    }
    const sx = 1 / Math.sqrt(sy);
    g.scale.set(s0 * sx, s0 * sy, s0 * sx);
    g.position.y = react.y + s0 * (dy + bottom * (1 - sy)); // squash about the saucer, not the rim
    // the plant sits in the soil, so it rides along with the hop and the squash
    const lift = s0 * (dy + (sy - 1) * (soilY - bottom));
    for (const o of g.parent?.children || []) if (o !== g) o.position.y += lift - moved;
    moved = lift;
    if (p >= 1) { g.scale.setScalar(s0); g.position.y = react.y; react = null; moved = 0; }
  }

  return {
    group: g, height: H,
    setMood(m) {
      if (m === mood) return;
      const prev = mood; mood = m;
      bulbMat.color.set(LIGHT[m] || LIGHT.okay); bulbMat.emissive.set(LIGHT[m] || LIGHT.okay);
      draw();
      if (reduce.matches || (RANK[m] ?? 2) === (RANK[prev] ?? 2)) return;
      if (react) { g.scale.setScalar(react.s); g.position.y = react.y; for (const o of g.parent?.children || []) if (o !== g) o.position.y -= moved; moved = 0; }
      react = { p: 0, up: (RANK[m] ?? 2) > (RANK[prev] ?? 2), s: g.scale.y, y: g.position.y };
    },
    tick(dt) { // idle life at about 16 fps, only while the viewer is rendering
      t += dt; since += dt;
      animate(dt);
      bulb.position.y = R * (.42 + Math.sin(t * 2.4) * .015);
      if (since >= 1 / 16) { since = 0; draw(); }
    },
  };
}
