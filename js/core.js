const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MAX_KMH = 500, VMAX = MAX_KMH / 3.6;
const TILE = 480, KT = TILE / 240;   // one world segment; a route is 6 segments = 2880 m
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const mod = (a, n) => ((a % n) + n) % n;
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ---------- renderer / scene ---------- */
const canvas = document.getElementById('gl');
const isMobile = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 500;   // phones: lighter render for a steady framerate
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isMobile ? 1.4 : 2));   // sharper on desktop / high-DPI
const maxAniso = renderer.capabilities.getMaxAnisotropy();                      // crisper textures toward the horizon, no shimmer
const scene = new THREE.Scene();
const HORIZON = 0xc4d0d5;
scene.fog = new THREE.FogExp2(HORIZON, 0.0034);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 4000);
const CAM_Y = 3.4;

/* ---------- bloom (desktop): soft glow on the sun, headlights, HUD and night lights ---------- */
let composer = null, bloomPass = null;
if (!isMobile && THREE.EffectComposer && THREE.UnrealBloomPass) {
  composer = new THREE.EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.addPass(new THREE.RenderPass(scene, camera));
  bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.3, 0.6, 0.9);  // strength, radius, threshold
  composer.addPass(bloomPass);
}
function renderScene(){ if (composer) composer.render(); else renderer.render(scene, camera); }

function canvasTex(w, h, draw){ const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); return t; }
scene.background = canvasTex(4, 256, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#5d8ebf'); g.addColorStop(.3, '#8fb1cf'); g.addColorStop(.5, '#c4d0d5'); g.addColorStop(1, '#c4d0d5');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
});

const hemi = new THREE.HemisphereLight(0xdfe7ee, 0x4f4a3c, 1.05); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d6, .85); sun.position.set(-30, 40, -60); scene.add(sun);

/* ---------- curved world: gentle turns without curved geometry ----------
   every vertex is shifted sideways by the track's offset at its distance ahead/behind the train (sampled every 40 m,
   1600 m ahead … 440 m behind); the camera always rides on the tangent, so the line ahead sweeps left and right */
const BEND_N = 52, BEND_STEP = 40, BEND_Z0 = -1600, BEND_I0 = -BEND_Z0 / BEND_STEP;
const bendU = { value: new Float32Array(BEND_N) };
const BEND_GLSL = `uniform float uBend[${BEND_N}];
float bendX(float z){ float f = clamp((z - (${BEND_Z0}.0)) / ${BEND_STEP}.0, 0.0, ${BEND_N - 1}.0 - 0.001); int i = int(floor(f)); return mix(uBend[i], uBend[i + 1], f - float(i)); }
`;
THREE.Material.prototype.onBeforeCompile = function(sh){
  if (this.userData.noBend) return;
  const vs = sh.vertexShader;
  if (vs.includes('#include <project_vertex>')) {
    sh.uniforms.uBend = bendU;
    sh.vertexShader = BEND_GLSL + vs.replace('#include <project_vertex>', `vec4 bw = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  bw = instanceMatrix * bw;
#endif
  bw = modelMatrix * bw; bw.x += bendX(bw.z);
  vec4 mvPosition = viewMatrix * bw;
  gl_Position = projectionMatrix * mvPosition;`);
  } else if (vs.includes('vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );')) {     // sprites (lamp glows)
    sh.uniforms.uBend = bendU;
    sh.vertexShader = BEND_GLSL + vs.replace('vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );', 'vec4 bw = modelMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ); bw.x += bendX(bw.z); vec4 mvPosition = viewMatrix * bw;');
  }
};
/* long straight pieces (rails, ballast, ground, decks, tunnel tubes) have vertices only at their ends, so the bend
   would leave them straight while everything around them curves; cut every triangle so it spans at most L metres along z */
function tessellateLong(root, L = 10){
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), M4 = new THREE.Matrix4();
  const todo = [];
  root.traverse(o => { if (o.isMesh && !o.isInstancedMesh && !Array.isArray(o.material) && !(o.material && o.material.userData && o.material.userData.noBend)) todo.push(o); });
  for (const mesh of todo) {
    const g = mesh.geometry, P = g.attributes.position; if (!P) continue;
    M4.multiplyMatrices(inv, mesh.matrixWorld);
    const e = M4.elements, pa = P.array, ps = P.itemSize, zOf = i => e[2] * pa[i * ps] + e[6] * pa[i * ps + 1] + e[10] * pa[i * ps + 2] + e[14];
    const ix = g.index ? g.index.array : null, nV = P.count, nT = (ix ? ix.length : nV) / 3;
    const z0 = new Float32Array(nV); for (let i = 0; i < nV; i++) z0[i] = zOf(i);
    let need = false;
    for (let t = 0; t < nT && !need; t++) { const a = z0[ix ? ix[t * 3] : t * 3], b = z0[ix ? ix[t * 3 + 1] : t * 3 + 1], c = z0[ix ? ix[t * 3 + 2] : t * 3 + 2]; if (Math.max(a, b, c) - Math.min(a, b, c) > L) need = true; }
    if (!need) continue;
    // vertex pool starts as a copy of the original vertices; midpoints are appended and shared per edge
    const names = Object.keys(g.attributes), srcA = names.map(n => g.attributes[n]), sizes = srcA.map(a => a.itemSize);
    const pool = srcA.map(a => Array.from(a.array)), zs = Array.from(z0), midCache = new Map(), out = [];
    const mid = (a, b) => {
      const key = a < b ? a * 4194304 + b : b * 4194304 + a; let m = midCache.get(key);
      if (m !== undefined) return m;
      m = zs.length; zs.push((zs[a] + zs[b]) / 2);
      for (let j = 0; j < pool.length; j++) { const s = sizes[j], p = pool[j]; for (let k = 0; k < s; k++) p.push((p[a * s + k] + p[b * s + k]) / 2); }
      midCache.set(key, m); return m;
    };
    const stack = [];
    for (let t = 0; t < nT; t++) stack.push(ix ? ix[t * 3] : t * 3, ix ? ix[t * 3 + 1] : t * 3 + 1, ix ? ix[t * 3 + 2] : t * 3 + 2);
    while (stack.length) {
      const c = stack.pop(), b = stack.pop(), a = stack.pop();
      const ab = Math.abs(zs[a] - zs[b]), bc = Math.abs(zs[b] - zs[c]), ca = Math.abs(zs[c] - zs[a]), m = Math.max(ab, bc, ca);
      if (m <= L) { out.push(a, b, c); continue; }
      if (m === ab) { const k = mid(a, b); stack.push(a, k, c, k, b, c); }
      else if (m === bc) { const k = mid(b, c); stack.push(a, b, k, a, k, c); }
      else { const k = mid(c, a); stack.push(a, b, k, k, b, c); }
    }
    const ng = new THREE.BufferGeometry();
    names.forEach((n, j) => ng.setAttribute(n, new THREE.Float32BufferAttribute(pool[j], sizes[j])));
    ng.setIndex(zs.length > 65535 ? new THREE.Uint32BufferAttribute(out, 1) : new THREE.Uint16BufferAttribute(out, 1));
    const N = ng.attributes.normal;
    if (N) for (let i = nV; i < N.count; i++) { const x = N.getX(i), y = N.getY(i), z = N.getZ(i), l = Math.hypot(x, y, z) || 1; N.setXYZ(i, x / l, y / l, z / l); }
    mesh.geometry = ng;                               // shared geometries (unit boxes) are replaced only on this mesh
  }
}
const bendAtZ = z => { const a = bendU.value, f = clamp((z - BEND_Z0) / BEND_STEP, 0, BEND_N - 1.001), i = Math.floor(f); return a[i] + (a[i + 1] - a[i]) * (f - i); };

/* ---------- world root: everything track-bound lives here and slides sideways at switches ---------- */
const worldRoot = new THREE.Group(); scene.add(worldRoot);
scene.add(camera);

const headlight = new THREE.SpotLight(0xfff1d6, 0, 190, .62, .6, 1);
const cabSpill = new THREE.PointLight(0xffe2b0, 0, 26, 1.4); cabSpill.position.set(0, .4, -3); camera.add(cabSpill);
headlight.position.set(0, -.6, 0); camera.add(headlight);
const hlTarget = new THREE.Object3D(); hlTarget.position.set(0, -2.2, -30); camera.add(hlTarget); headlight.target = hlTarget;
const trainBeam = new THREE.SpotLight(0xfff0d0, 0, 300, .52, .55, 1); scene.add(trainBeam);   // forward beam from the train nose, used at night in the outside view
const trainBeamT = new THREE.Object3D(); scene.add(trainBeamT); trainBeam.target = trainBeamT;

/* ---------- ground (global, scrolls under the camera) ---------- */
const groundTex = canvasTex(512, 512, (x, w, h) => {
  const r = rng(3);
  x.fillStyle = '#5c5647'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { const v = 70 + r() * 50; x.fillStyle = `rgba(${v},${v - 6},${v - 22},.35)`; x.fillRect(r() * w, r() * h, 2, 2); }
  for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${90 + r() * 30},${92 + r() * 30},60,.25)`; x.fillRect(r() * w, r() * h, 1 + r() * 2, 4 + r() * 6); }
  for (let i = 0; i < 26; i++) {
    const cx = r() * w, cy = r() * h, rad = 14 + r() * 60;
    for (const [ox, oy] of [[0,0],[w,0],[-w,0],[0,h],[0,-h]]) {
      const g = x.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, rad);
      g.addColorStop(0, 'rgba(214,216,212,.85)'); g.addColorStop(.6, 'rgba(200,203,199,.45)'); g.addColorStop(1, 'rgba(200,203,199,0)');
      x.fillStyle = g; x.fillRect(cx + ox - rad, cy + oy - rad, rad * 2, rad * 2);
    }
  }
});
groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping; groundTex.anisotropy = maxAniso;
const G_W = 1400, G_M = 40;
const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 });

/* ---------- shared materials & geometry ---------- */
const ballastTex = canvasTex(128, 256, (x, w, h) => {
  const r = rng(9); x.fillStyle = '#6e6a63'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { const v = 60 + r() * 90; x.fillStyle = `rgb(${v},${v - 3},${v - 9})`; x.beginPath(); x.arc(r() * w, r() * h, .8 + r() * 2.2, 0, 7); x.fill(); }
  const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(70,58,44,.55)'); g.addColorStop(.5, 'rgba(70,58,44,.15)'); g.addColorStop(1, 'rgba(70,58,44,.55)');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
});
ballastTex.wrapS = ballastTex.wrapT = THREE.RepeatWrapping; ballastTex.repeat.set(1, TILE / 4); ballastTex.anisotropy = maxAniso;
const ballastMat = new THREE.MeshStandardMaterial({ map: ballastTex, roughness: 1 });
const railMat = new THREE.MeshStandardMaterial({ color: 0x8a8681, metalness: .7, roughness: .35 });
const rustRailMat = new THREE.MeshStandardMaterial({ color: 0x5e4232, metalness: .3, roughness: .8 });
const SLEEP = .7;
const sleeperGeo = new THREE.BoxGeometry(2.6, .14, .24);
const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x3a2d22, roughness: 1 });
const sleeperOldMat = new THREE.MeshStandardMaterial({ color: 0x33302b, roughness: 1 });
const unit = new THREE.BoxGeometry(1, 1, 1);                       // centred
const boxGeo = new THREE.BoxGeometry(1, 1, 1); boxGeo.translate(0, .5, 0); // base at y=0
const trunkGeo = new THREE.CylinderGeometry(.6, 1, 1, 6); trunkGeo.translate(0, .5, 0);
const coneGeo = new THREE.ConeGeometry(1, 1, 7); coneGeo.translate(0, .5, 0);
const crownGeo = new THREE.IcosahedronGeometry(1, 0);
const rockGeo = new THREE.IcosahedronGeometry(1, 0);
const poleGeo = new THREE.CylinderGeometry(.1, .14, 1, 6); poleGeo.translate(0, .5, 0);
const M = c => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true });
const matNeedles = M(0xffffff), matBirch = M(0xd9d6cc), matCrown = M(0xffffff), matWood = M(0x3b3127),
      matWhite = M(0xffffff), matHole = M(0x15140f), matRock = M(0x77706a), matSteel = new THREE.MeshStandardMaterial({ color: 0x5a524a, metalness: .45, roughness: .65 });
const wireMat = new THREE.LineBasicMaterial({ color: 0x24221e });
const glowTex = canvasTex(64, 64, (x, w, h) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
const glowMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffcf86, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
const D = new THREE.Object3D(), COL = new THREE.Color();
const SH = 7;                          // lateral distance of the diverging track
const lerpN = (pts, x) => { for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [a, va] = pts[i - 1], [b, vb] = pts[i]; return va + (vb - va) * clamp((x - a) / (b - a), 0, 1); } return pts[pts.length - 1][1]; };
const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
