/* ---------- train body geometry: cross-sections, loft, nose, skin patches, nose details ---------- */
const BODY = { top: 4.65, bot: 1.23, a: 1.6, flat: .85 };
const bodyB = (top, bot) => (top - bot) / (1 + BODY.flat);
function ringPts(a, b, cy, n, M){
  const pts = [];
  for (let i = 0; i < M; i++) {
    const f = i / M * Math.PI * 2, c = Math.cos(f), s = Math.sin(f);
    const x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), y = Math.max(b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n), -BODY.flat * b);
    pts.push([x, cy + y]);
  }
  return pts;
}
/* secs: [{z, a, top, bot, n, t}] → smooth indexed mesh; colorFn(x, y, sec, u) gives per-vertex colour */
function loft(secs, M, colorFn, capA, capB){
  const pos = [], col = [], idx = [];
  secs.forEach(sc => {
    const b = bodyB(sc.top, sc.bot), cy = sc.top - b;
    for (const [x, y] of ringPts(sc.a, b, cy, sc.n, M)) { pos.push(x, y, sc.z); const c = colorFn ? colorFn(x, y, sc, (y - sc.bot) / (sc.top - sc.bot)) : [1, 1, 1]; col.push(...c); }
  });
  for (let k = 0; k < secs.length - 1; k++) for (let i = 0; i < M; i++) {
    const a = k * M + i, b = k * M + (i + 1) % M, c = (k + 1) * M + (i + 1) % M, d = (k + 1) * M + i;
    idx.push(a, b, c, a, c, d);
  }
  const cap = (k, tipZ) => {
    const sc = secs[k], ci = pos.length / 3; pos.push(0, (sc.top + sc.bot) / 2, tipZ ?? sc.z); col.push(...(colorFn ? colorFn(0, (sc.top + sc.bot) / 2, sc, .5) : [1, 1, 1]));
    for (let i = 0; i < M; i++) idx.push(ci, k * M + i, k * M + (i + 1) % M);
  };
  if (capA !== undefined) cap(0, capA);
  if (capB !== undefined) cap(secs.length - 1, capB);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  g.computeVertexNormals(); return g;
}
const NOSE_L = 16;
/* one cross-section of the nose at t (0 = joins the car, 1 = tip): steep over the windscreen, then a long flat "duckbill" snout */
function noseSec(t, dir){
  const e = Math.pow(t, 1.12), bot = BODY.bot + .2 * Math.pow(t, 2.2);
  const prof = .55 * sstep(0, 1, Math.pow(t, .8)) + .45 * Math.pow(t, 1.45), top = Math.max(BODY.top - 2.45 * prof - .12 * Math.pow(t, 3), bot + .68);
  return { z: dir * NOSE_L * e, a: BODY.a * (1 - .46 * Math.pow(t, 2.1)), top, bot, n: 4 - 1.6 * t, t };
}
function noseGeo(dir){
  const secs = []; for (let k = 0; k <= 44; k++) secs.push(noseSec(k / 44, dir));
  const e = secs[44], cy = (e.top + e.bot) / 2, h = (e.top - e.bot) / 2, RT = 1.1;          // rounded tip: an elliptical cap instead of a flat end
  for (let j = 1; j <= 9; j++) { const th = j / 10 * Math.PI / 2, k = Math.cos(th); secs.push({ z: dir * (NOSE_L + RT * Math.sin(th)), a: e.a * Math.max(k, .05), top: cy + h * Math.max(k, .05), bot: cy - h * Math.max(k, .05) - (1 - k) * .1, n: e.n, t: 1 }); }
  return loft(secs, 72, null, undefined, dir * (NOSE_L + RT));
}
/* angle on a section where the surface sits at relative height u (0 bottom … 1 top), on the right-hand side */
function phiAt(sc, u){
  const b = bodyB(sc.top, sc.bot), cy = sc.top - b, y = sc.bot + u * (sc.top - sc.bot), v = clamp((y - cy) / b, -1, 1);
  return Math.asin(Math.sign(v) * Math.pow(Math.abs(v), sc.n / 2));
}
function surfPt(sc, f, off){
  const b = bodyB(sc.top, sc.bot), cy = sc.top - b, c = Math.cos(f), s = Math.sin(f);
  const x = sc.a * Math.sign(c) * Math.pow(Math.abs(c), 2 / sc.n), y = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / sc.n);
  return [x * (1 + off), cy + y * (1 + off), sc.z];
}
/* a smooth skin patch lying on the nose: rows along t, columns along the section arc between two angles */
function nosePatch(dir, t0, t1, arcFn, off, mat, NT = 22, NK = 18){
  const pos = [], idx = [];
  for (let i = 0; i <= NT; i++) {
    const t = t0 + (t1 - t0) * i / NT, sc = noseSec(t, dir), [f0, f1] = arcFn(sc, (t - t0) / (t1 - t0));
    for (let k = 0; k <= NK; k++) pos.push(...surfPt(sc, f0 + (f1 - f0) * k / NK, off));
  }
  for (let i = 0; i < NT; i++) for (let k = 0; k < NK; k++) { const a = i * (NK + 1) + k, b = a + 1, c = a + NK + 2, d = a + NK + 1; idx.push(a, b, c, a, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}
const NOSE_FRONT = noseGeo(-1), NOSE_TAIL = noseGeo(1);
/* windscreen outline: lower edge rises toward the tip, sides pull in; rounded ends */
const wsArc = (sc, q) => { const u = .5 + .1 * q + .12 * Math.pow(Math.abs(q - .5) * 2, 3); const f = phiAt(sc, u); return [f, Math.PI - f]; };
const wsFrameArc = (sc, q) => { const u = .47 + .1 * q + .12 * Math.pow(Math.abs(q - .5) * 2, 3); const f = phiAt(sc, u); return [f, Math.PI - f]; };
const bodySc = { a: BODY.a, top: BODY.top, bot: BODY.bot, n: 4, z: 0 };
const sideArc = (sc, u0, u1, side) => { const lo = phiAt(sc, u0), hi = phiAt(sc, u1); return side > 0 ? [lo, hi] : [Math.PI - hi, Math.PI - lo]; };
function bodyPatch(z0, z1, f0, f1, off, mat, NK = 12){
  const pos = [], idx = [];
  for (const z of [z0, z1]) for (let k = 0; k <= NK; k++) { const p = surfPt(bodySc, f0 + (f1 - f0) * k / NK, off); pos.push(p[0], p[1], z); }
  for (let k = 0; k < NK; k++) idx.push(k, k + 1, NK + 2 + k, k, NK + 2 + k, NK + 1 + k);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}
/* skin patch along a car side: rows along z, the arc between relative heights uFn(q) → [u0, u1]; uv runs so text reads front-to-back on both sides */
function carPatch(z0, z1, uFn, side, off, mat, NZ = 1, NK = 4){
  const pos = [], uvs = [], idx = [];
  for (let i = 0; i <= NZ; i++) {
    const q = i / NZ, z = z0 + (z1 - z0) * q, [u0, u1] = typeof uFn === 'function' ? uFn(q) : uFn, [f0, f1] = sideArc(bodySc, u0, u1, side);
    for (let k = 0; k <= NK; k++) { const p = surfPt(bodySc, f0 + (f1 - f0) * k / NK, off); pos.push(p[0], p[1], z); uvs.push(side > 0 ? 1 - q : q, side > 0 ? k / NK : 1 - k / NK); }
  }
  for (let i = 0; i < NZ; i++) for (let k = 0; k < NK; k++) { const a = i * (NK + 1) + k, b = a + 1, c = a + NK + 2, d = a + NK + 1; idx.push(a, b, c, a, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}
const U_WIN = [.485, .755], U_ACC = [.127, .177], U_SKIRT = .09, U_ROOF = .9;
const U_BAND = [.115, .3];
/* hero livery on the nose: the crimson band sweeps up toward the windscreen and narrows to a point on the snout */
const bandLo = t => U_BAND[0] + .26 * sstep(.05, .8, t), bandHi = t => U_BAND[1] + .22 * sstep(.02, .45, t) - .1 * sstep(.5, .88, t);
function noseDetails(dir, accent = TM.cyan, hero = false){
  const g = new THREE.Group();
  if (dir < 0) {
    g.add(nosePatch(dir, .155, .555, wsFrameArc, .006, TM.graphite));
    g.add(nosePatch(dir, .17, .54, wsArc, .011, hero ? TM.wsGlass : TM.glass));
    // (chrome rim removed: its 22 facets along the curved windscreen edge read as grey-blue stair-step stripes; the glossy glass now gives a smooth highlight→dark gradient)
    for (const side of [1, -1]) {                                            // side glass band sweeping up into the windscreen
      g.add(nosePatch(dir, 0, .2, (sc, q) => sideArc(sc, U_WIN[0] + (.6 - U_WIN[0]) * sstep(0, 1, q), U_WIN[1] + (.93 - U_WIN[1]) * sstep(.2, 1, q), side), .01, TM.glass, 16, 10));
      g.add(nosePatch(dir, .04, .17, (sc, q) => sideArc(sc, U_WIN[0] - .03 + (.57 - U_WIN[0]) * sstep(0, 1, q), U_WIN[0] - .005 + (.6 - U_WIN[0]) * sstep(0, 1, q), side), .007, TM.graphite, 12, 3));
      if (!hero) {
      g.add(nosePatch(dir, .7, .865, (sc, q) => sideArc(sc, .27 + .03 * q, .31 + .025 * q, side), .009, TM.head, 10, 3));     // LED light strip
      g.add(nosePatch(dir, .6, .7, (sc, q) => sideArc(sc, .3 + .02 * q, .305 + .02 * q, side), .008, TM.chrome, 6, 2));
      }
    }
  }
  if (hero) for (const side of [1, -1]) {
    const sa = (lo, hi) => (sc, q) => sideArc(sc, lo(sc.t), hi(sc.t), side);
    g.add(nosePatch(dir, 0, .88, sa(bandLo, bandHi), .007, TM.livery, 40, 8));
    g.add(nosePatch(dir, 0, .5, sa(t => bandHi(t) + .006, t => bandHi(t) + .026 - .018 * sstep(.3, .5, t)), .0075, TM.led, 30, 2));     // neon edge
    g.add(nosePatch(dir, 0, .62, sa(t => bandLo(t) - .012, t => bandLo(t) - .004), .0072, TM.chrome, 24, 2));                        // chrome underline
    // lamp "eyes": dark glossy housing, light bar inside, chrome lid
    g.add(nosePatch(dir, .68, .9, (sc, q) => sideArc(sc, .245 + .02 * q, .36 - .015 * Math.pow(Math.abs(q - .45) * 2, 2), side), .0085, TM.plate, 14, 6));
    g.add(nosePatch(dir, .73, .87, (sc, q) => sideArc(sc, .272 + .015 * q, .335 - .012 * Math.pow(Math.abs(q - .5) * 2, 2), side), .0095, dir < 0 ? TM.head : TM.tail, 10, 4));
    g.add(nosePatch(dir, .7, .88, (sc, q) => sideArc(sc, .362 - .015 * Math.pow(Math.abs(q - .45) * 2, 2), .372 - .015 * Math.pow(Math.abs(q - .45) * 2, 2), side), .009, TM.chrome, 12, 1));
  }
  else for (const side of [1, -1]) {                                              // the stripe sweeping into the nose
    const arc = (sc, q) => { const w = .035 * (1 - q * .4), c = .18 + q * .02, lo = phiAt(sc, c - w), hi = phiAt(sc, c + w); return side > 0 ? [lo, hi] : [Math.PI - hi, Math.PI - lo]; };
    g.add(nosePatch(dir, 0, .8, arc, .007, accent, 26, 4));
    const arc2 = (sc, q) => { const c = .225 + q * .03, w = .006, lo = phiAt(sc, c - w), hi = phiAt(sc, c + w); return side > 0 ? [lo, hi] : [Math.PI - hi, Math.PI - lo]; };
    g.add(nosePatch(dir, 0, .62, arc2, .007, accent, 20, 2));
  }
  g.add(nosePatch(dir, 0, .8, (sc, q) => { const f = phiAt(sc, U_SKIRT + .3 * Math.pow(q, 1.6)); return [Math.PI - f, 2 * Math.PI + f]; }, .005, TM.graphite, 24, 24));   // lower band into the chin

  g.add(nosePatch(dir, .8, .985, sc => { const f = phiAt(sc, .42); return [Math.PI - f, 2 * Math.PI + f]; }, .006, TM.graphite, 10, 24));   // chin
  return g;
}
const sideX = y => { const b = bodyB(BODY.top, BODY.bot), cy = BODY.top - b; return BODY.a * Math.pow(Math.max(0, 1 - Math.pow(Math.abs((y - cy) / b), 4)), .25); };
const nameTex = canvasTex(512, 96, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#26303a'; x.font = '800 60px "Segoe UI", Arial, sans-serif'; x.textBaseline = 'middle'; x.font = '800 50px "Segoe UI", Arial, sans-serif'; x.fillText(TRAIN_NAME, 8, h / 2 + 2); const nw = x.measureText(TRAIN_NAME).width; x.fillStyle = '#2fb8ea'; x.font = '700 36px "Segoe UI", Arial, sans-serif'; x.fillText('350', nw + 22, h / 2 + 6); });
const numTexFor = n => canvasTex(128, 64, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#4a5560'; x.font = '700 34px Consolas, monospace'; x.textBaseline = 'middle'; x.fillText(n, 6, h / 2); });
