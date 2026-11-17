// A terracotta pot with a little screen on the front that shows an ASCII robot face.
import * as THREE from 'three';
import { FACES } from './ascii.js?v=2';
import { soilTexture } from './textures.js';

export function makePot(radius = .14) {
  const R = radius, H = R * 1.25;
  const g = new THREE.Group();
  const clay = new THREE.MeshStandardMaterial({ color: '#c8693f', roughness: .82 });
  const prof = [[0, -H], [R * .74, -H], [R * .78, -H + .01], [R * .96, -H * .12], [R * 1.0, -H * .1], [R * 1.08, -H * .1], [R * 1.1, 0], [R * 1.02, .002], [R * .98, -H * .05]];
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 64), clay);
  body.castShadow = body.receiveShadow = true; g.add(body);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(R * .98, 48), new THREE.MeshStandardMaterial({ map: soilTexture(), roughness: 1 }));
  soil.rotation.x = -Math.PI / 2; soil.position.y = -H * .06; g.add(soil);

  // the face screen: a curved panel hugging the front of the pot
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const theta = Math.PI * .62;
  const scr = new THREE.Mesh(new THREE.CylinderGeometry(R * .95, R * .82, H * .56, 32, 1, true, -theta / 2, theta), new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: .55, roughness: .35 }));
  scr.position.y = -H * .5; // faces +Z
  g.add(scr);
  // a shallow bezel behind the screen
  const bez = new THREE.Mesh(new THREE.CylinderGeometry(R * .945, R * .815, H * .62, 32, 1, true, -theta * .54, theta * 1.08), new THREE.MeshStandardMaterial({ color: '#1d2a22', roughness: .5, side: THREE.DoubleSide }));
  bez.position.copy(scr.position); g.add(bez);
  // a saucer
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(R * .95, R * .85, R * .08, 48), clay);
  saucer.position.y = -H - R * .04; saucer.receiveShadow = true; g.add(saucer);

  let mood = 'new', blink = false;
  function draw() {
    const x = c.getContext('2d');
    x.fillStyle = '#16251c'; x.fillRect(0, 0, 512, 256);
    // faint scanlines, like a tiny LCD
    x.fillStyle = 'rgba(120,255,160,.05)'; for (let y = 0; y < 256; y += 4) x.fillRect(0, y, 512, 2);
    const f = FACES[mood] || FACES.okay;
    x.fillStyle = mood === 'poorly' ? '#ff8a6b' : mood === 'thirsty' ? '#ffd166' : '#8af5a6';
    x.font = 'bold 76px ui-monospace, Menlo, monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(`[${blink ? '-   -' : f.eyes}]`, 256, 98);
    x.font = 'bold 62px ui-monospace, Menlo, monospace';
    x.fillText(f.mouth, 256, 176);
    if (mood === 'sleepy') { x.font = 'bold 40px ui-monospace, Menlo, monospace'; x.fillText('z z', 420, 50); }
    if (mood === 'thirsty') { x.font = 'bold 40px ui-monospace, Menlo, monospace'; x.fillText('~', 420, 70); }
    tex.needsUpdate = true;
  }
  draw();
  let t = 0, next = 2.5;
  return {
    group: g, height: H,
    setMood(m) { mood = m; draw(); },
    tick(dt) { // blink now and then
      t += dt;
      if (!blink && t > next && mood !== 'sleepy') { blink = true; draw(); }
      if (blink && t > next + .14) { blink = false; draw(); t = 0; next = 2.5 + Math.random() * 3; }
    },
  };
}
