// Animated dithered backgrounds in chunky pixel blocks, inspired by Ditherlab's generated scenes.
// One small WebGL canvas per use, rendered at 1/blockSize resolution and scaled up crisp.
// Modes: 'cells' (plant cells, Voronoi flow), 'warp' (soil and water, warped noise),
//        'seeds' (seeds drifting up, metaballs), 'mesh' (soft colour mesh).
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const MODES = { cells: 0, warp: 1, seeds: 2, mesh: 3 };

const FRAG = `
precision mediump float;
uniform vec2 R; uniform float T; uniform int M; uniform vec3 C0, C1, C2, C3, C4; uniform float G; uniform vec2 P;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 h2(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a * n(p); p *= 2.03; a *= .5; } return s; }
// ordered dither threshold from an 8x8 Bayer matrix, computed bit by bit
float b2(vec2 a){ a = floor(a); return fract(a.x / 2. + a.y * a.y * .75); }
float bayer(vec2 a){ return b2(.25 * a) * .0625 + b2(.5 * a) * .25 + b2(a); }
void main(){
  vec2 px = gl_FragCoord.xy, uv = px / R.y; float t = T * .12, v = 0.;
  if (M == 0) { // plant cells: distance to moving seeds, darker at the walls
    vec2 g = uv * 5.5; vec2 i = floor(g), f = fract(g); float d1 = 9., d2 = 9.;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 o = vec2(x, y); vec2 r = h2(i + o);
      r = .5 + .42 * sin(t * 2. + 6.2831 * r); float d = length(o + r - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
    v = smoothstep(0., .5, d2 - d1) * .85 + .15 * fbm(uv * 3. + t);
  } else if (M == 1) { // warped noise: soil, water, wind
    vec2 q = vec2(fbm(uv * 2. + t), fbm(uv * 2. + 5.2 - t)); v = fbm(uv * 2.2 + 3. * q + vec2(t * .6, -t * .3));
  } else if (M == 2) { // seeds drifting upward
    float s = 0.; for (int i = 0; i < 12; i++){ float fi = float(i); vec2 c = vec2(h(vec2(fi, 3.)) * R.x / R.y, mod(h(vec2(fi, 9.)) * 1.4 + t * (.25 + .2 * h(vec2(fi, 1.))), 1.4) - .2);
      c.x += .06 * sin(t * 3. + fi); float r = .05 + .06 * h(vec2(fi, 5.)); s += r * r / max(.0004, dot(uv - c, uv - c)); }
    v = clamp(s * .55, 0., 1.) * .85 + .15 * fbm(uv * 4. + t);
  } else { // soft mesh of colour
    v = .5 + .5 * sin(uv.x * 2.1 + t * 1.3 + fbm(uv * 1.5 + t) * 3.) * cos(uv.y * 1.7 - t);
  }
  v = clamp(v + (G - .5) * .25 + .06 * (1. - length((px / R) - P)), 0., 1.);
  // four steps between five inks, dithered
  float x = v * 4.; float k = floor(x); float fr = x - k; if (fr > bayer(px)) k += 1.;
  vec3 c = k < .5 ? C0 : k < 1.5 ? C1 : k < 2.5 ? C2 : k < 3.5 ? C3 : C4;
  gl_FragColor = vec4(c, 1.);
}`;

const hex = (s) => { const n = parseInt(s.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

export function ditherBg(host, { mode = 'cells', colors = ['#1d4a2b', '#2e6b35', '#5aa83f', '#9fd47f', '#e3f1d3'], block = 6, speed = 1, fps = 12 } = {}) {
  const c = document.createElement('canvas');
  c.className = 'dbg'; c.setAttribute('aria-hidden', 'true');
  host.prepend(c);
  const gl = c.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
  if (!gl) { host.style.background = colors[1]; return { set() {}, dispose() { c.remove(); } }; }
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(pr); gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  const U = (k) => gl.getUniformLocation(pr, k);
  const uR = U('R'), uT = U('T'), uM = U('M'), uG = U('G'), uP = U('P');
  let grow = .5, pointer = [.5, .5], visible = false, raf = 0, t0 = performance.now(), cols = colors;
  const setColors = () => cols.forEach((col, i) => gl.uniform3fv(U('C' + i), hex(col)));
  setColors(); gl.uniform1i(uM, MODES[mode] ?? 0);
  function size() {
    const r = rect = host.getBoundingClientRect();
    c.width = Math.max(1, Math.round(r.width / block)); c.height = Math.max(1, Math.round(r.height / block));
    gl.viewport(0, 0, c.width, c.height); gl.uniform2f(uR, c.width, c.height); draw(performance.now());
  }
  function draw(now) {
    gl.uniform1f(uT, ((now - t0) / 1000) * speed); gl.uniform1f(uG, grow); gl.uniform2f(uP, pointer[0], pointer[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  let last = 0;
  // 12 fps stop-motion: chunky dither looks better stepped, and it keeps phones cool
  function loop(now) { raf = 0; if (now - last >= 1000 / fps) { last = now; draw(now); } if (visible && !reduce.matches && !document.hidden) raf = requestAnimationFrame(loop); }
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); }, { rootMargin: '100px' });
  io.observe(host);
  const ro = new ResizeObserver(size); ro.observe(host);
  let rect = host.getBoundingClientRect();
  const onMove = (e) => { const r = rect; pointer = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height]; };
  host.addEventListener('pointermove', onMove, { passive: true });
  size();
  return {
    set({ g, colors: nc } = {}) { if (g != null) grow = g; if (nc) { cols = nc; setColors(); } if (!raf) draw(performance.now()); },
    dispose() { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); host.removeEventListener('pointermove', onMove); gl.getExtension('WEBGL_lose_context')?.loseContext(); c.remove(); },
  };
}
