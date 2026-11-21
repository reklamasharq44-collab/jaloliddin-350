/* ================= ROUTE 6 · undersea: through a headland, then 1.7 km in a glass tube on the seabed with fish, back out through rock ================= */
const UND = { a: 380, b: 2180, bore: 45, bed: -9, surf: 28, R: 10, cx: -2.3, cy: 3 };
const UND_GLASS = [UND.a + UND.bore, UND.b - UND.bore];
const inSlot = x => Math.abs(x - UND.cx) < UND.R + .6;
/* height field: green hills on land, a rocky headland at each portal, the seabed in between */
function undY(x, pr){
  const ax = Math.abs(x - UND.cx), n = coastNoise(x, pr), { a, b, bore, bed } = UND;
  const hills = (26 + 10 * n) * sstep(14, 220, ax) + 3 * coastNoise(x * 2.7, pr * 2.7) * sstep(14, 60, ax);
  const ridge = 44 + 2.5 * n;
  const sea = bed + 2 * coastNoise(x * 1.7, pr * 1.7) + 26 * sstep(260, 900, ax) * (.6 + .4 * n);
  const sideOf = (p0, dirIn) => {                 // dirIn = +1: headland lies at pr > p0 (entry), -1: at pr < p0 (exit)
    const u = (pr - p0) * dirIn;                  // metres into the headland
    if (u < -90) return null;
    if (u < 0) { const k = sstep(-90, -4, u); return ax < UND.R + .5 ? 0 : hills + (ridge - hills) * k; }   // cutting
    if (u < bore) return inSlot(x) ? -20 : ridge;                                                          // over the bore (slot hidden under the rock block)
    if (u < bore + 30) { const k = sstep(bore, bore + 30, u); return inSlot(x) ? -20 + (bed - 1 + 20) * sstep(bore, bore + 4, u) : ridge + (sea - ridge) * k; }   // cliff down to the seabed
    return null;
  };
  const e = sideOf(a, 1); if (e !== null && pr < a + bore + 30) return e;
  const x2 = sideOf(b, -1); if (x2 !== null && pr > b - bore - 30) return x2;
  if (pr > a && pr < b) return ax < UND.R + 1 ? bed - 1 : sea;
  return ax < 10 ? 0 : hills;
}
const UCOL = { grass: new THREE.Color('#6a7c3a'), grass2: new THREE.Color('#4c5f2e'), rock: new THREE.Color('#857d70'), sand: new THREE.Color('#d8c79b'), sand2: new THREE.Color('#9fb39a') };
function undColor(x, y, pr){
  if (pr > UND.a + UND.bore + 4 && pr < UND.b - UND.bore - 4 && y < 5) return COL.copy(UCOL.sand).lerp(UCOL.sand2, clamp(.5 + coastNoise(x * 2, pr * 2) * .6, 0, 1));
  const steep = Math.abs(undY(x + 3, pr) - y) / 3 + Math.abs(undY(x, pr + 3) - y) / 3;
  COL.copy(UCOL.grass).lerp(UCOL.grass2, clamp(.5 + coastNoise(x * 3.1, pr * 3.1) * .6, 0, 1));
  if (steep > .6 || y > 36) COL.lerp(UCOL.rock, clamp((steep - .5) * 1.4 + (y - 36) / 10, 0, .95));
  return COL;
}
/* --- sea life models --- */
const FISH_GEO = (() => {                                            // forward = +z, unit length
  const p = [0, 0, .5, .12, 0, 0, 0, .16, 0,  0, 0, .5, 0, .16, 0, -.12, 0, 0,  0, 0, .5, -.12, 0, 0, 0, -.14, 0,  0, 0, .5, 0, -.14, 0, .12, 0, 0,
    .12, 0, 0, 0, .16, 0, 0, 0, -.32,  0, .16, 0, -.12, 0, 0, 0, 0, -.32,  -.12, 0, 0, 0, -.14, 0, 0, 0, -.32,  0, -.14, 0, .12, 0, 0, 0, 0, -.32,
    0, 0, -.28, 0, .16, -.5, 0, -.16, -.5];                         // body (8 faces) + tail fin
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); return g;
})();
const FISH_COLS = ['#ff8a2a', '#ffd23f', '#3fa7ff', '#ff5a8a', '#9b6bff', '#e9f3f7', '#2fd3b0', '#ff6b3d'].map(c => new THREE.Color(c));
function buildUnderScenery(){
  const grp = new THREE.Group(), r = rng(6060), { a, b, bore, R, cx, cy } = UND;
  // terrain sheet, rows denser at the portal faces
  const rows = []; for (let pr = 0; pr <= COAST.END; ) { rows.push(pr); const near = Math.min(Math.abs(pr - a), Math.abs(pr - b), Math.abs(pr - a - bore), Math.abs(pr - b + bore)); pr += near < 12 ? 1.5 : near < 50 ? 4 : 8; }
  const NX = 90, pos = [], cols = [], ids = [];
  const xs = []; for (let ix = 0; ix <= NX; ix++) { const t = ix / NX * 2 - 1; xs.push(Math.sign(t) * Math.pow(Math.abs(t), 1.7) * 1400 + cx); }
  for (const s of [-1, 1]) for (const k of [R + .55, R + .65]) xs.push(cx + s * k);               // columns right at the slot edges keep its walls vertical
  xs.sort((p, q) => p - q);
  const W = xs.length;
  for (const pr of rows) for (const x of xs) { const y = undY(x, pr); pos.push(x, y, -pr); const c = undColor(x, y, pr); cols.push(c.r, c.g, c.b); }
  for (let iz = 0; iz < rows.length - 1; iz++) for (let ix = 0; ix < W - 1; ix++) { const p = iz * W + ix, q = p + 1, s = p + W, t2 = s + 1; ids.push(p, q, s, q, t2, s); }
  let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.setIndex(ids);
  g = g.toNonIndexed(); g.computeVertexNormals();
  grp.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })));
  // land plants
  const pl = [[], [], [], []], rocks = [];
  for (let i = 0; i < 1400; i++) {
    const pr = r() * COAST.END, x = cx + (r() < .5 ? -1 : 1) * (14 + Math.pow(r(), 1.4) * 600);
    if (pr > a - 100 && pr < b + 100) continue;
    const y = undY(x, pr); if (y > 40 && r() < .6) { rocks.push([x, y, -pr, 2 + r() * 4]); continue; }
    pl[Math.floor(r() * 4)].push([x, y, -pr, 8 + r() * 8]);
  }
  pl.forEach((items, k) => { if (!items.length) return; const m = new THREE.InstancedMesh(COAST_TREES[k < 2 ? 'cypress' : 'pine'][k % 2], treeMat, items.length);
    items.forEach(([x, y, z, h], i) => { D.position.set(x, y - .1, z); D.rotation.set(0, r() * 6.3, 0); D.scale.set(h, h, h); D.updateMatrix(); m.setMatrixAt(i, D.matrix); const v = .85 + r() * .3; m.setColorAt(i, COL.setRGB(v, v, v)); }); grp.add(m); });
  // rock blocks over the bores (hide the slot), stone portals, concrete bores
  const rockM = M(0x7d756a), conc = M(0x9a968e), dark = M(0x3a3d42);
  for (const [p0, dir] of [[a, 1], [b, -1]]) {
    const zMid = -(p0 + dir * bore / 2);
    const topM = M(0x5a6c31), blk = new THREE.Mesh(unit, [rockM, rockM, topM, rockM, rockM, rockM]); blk.position.set(cx, (cy + R + .4 + 44.5) / 2, zMid); blk.scale.set(2 * R + 1.6, 44.5 - cy - R - .4, bore); grp.add(blk);
    const bdeck = new THREE.Mesh(unit, M(0x55595f)); bdeck.position.set(cx, -1.2, zMid); bdeck.scale.set(2 * Math.sqrt(R * R - 9), 2.4, bore); grp.add(bdeck);
    const tubeB = new THREE.Mesh(new THREE.CylinderGeometry(R + .3, R + .3, bore, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0x8c8880, roughness: .9, side: THREE.BackSide }));
    tubeB.rotation.x = Math.PI / 2; tubeB.position.set(cx, cy, zMid); grp.add(tubeB);
    for (const pz of [p0, p0 + dir * bore]) {                                     // portal collars at both ends of each bore
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R + .9, 1.1, 8, 40, Math.PI * 1.25), conc); ring.rotation.z = -Math.PI * .125; ring.position.set(cx, cy, -pz); grp.add(ring);
    }
    const face = new THREE.Mesh(unit, conc); face.position.set(cx, cy + R + 3, -p0 + dir * .6); face.scale.set(2 * R + 8, 6, 1.2); grp.add(face);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.2), new THREE.MeshBasicMaterial({ map: canvasTex(512, 80, (x, w, h) => { x.fillStyle = '#123a4a'; x.fillRect(0, 0, w, h); x.fillStyle = '#e8f6fb'; x.font = '800 44px "Segoe UI", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ПОДВОДНЫЙ ТОННЕЛЬ', w / 2, h / 2 + 2); }) }));
    sign.position.set(cx, cy + R + 3, -p0 + dir * 1.3); if (dir < 0) sign.rotation.y = Math.PI; grp.add(sign);
    for (let k = 0; k < 6; k++) { const lp = new THREE.Mesh(unit, new THREE.MeshBasicMaterial({ color: 0xfff1d0 })); lp.position.set(cx + (k % 2 ? 1 : -1) * (R - .4), cy + 4, -(p0 + dir * (6 + Math.floor(k / 2) * 14))); lp.scale.set(.15, .6, 1.4); grp.add(lp); }
  }
  // the glass tube: deck, glass, ribs, LED line, lamps
  const [g0, g1] = UND_GLASS, gl = g1 - g0, zc = -(g0 + g1) / 2;
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(R, R, gl, 48, Math.ceil(gl / 10), true, Math.PI * .62, Math.PI * 1.76),
    new THREE.MeshPhysicalMaterial({ color: 0xbff4ff, metalness: 0, roughness: .05, transparent: true, opacity: .16, side: THREE.DoubleSide, depthWrite: false, envMap: trainEnv, envMapIntensity: .8 }));
  glass.rotation.x = Math.PI / 2; glass.position.set(cx, cy, zc); glass.renderOrder = 3; grp.add(glass);
  const deck = new THREE.Mesh(unit, M(0x55595f)); deck.position.set(cx, -1.2, zc); deck.scale.set(2 * Math.sqrt(R * R - 9) - .4, 2.4, gl); grp.add(deck);
  const keel = new THREE.Mesh(unit, M(0x3f4348)); keel.position.set(cx, -5, zc); keel.scale.set(9, 5, gl); grp.add(keel);
  const ribGeo = new THREE.TorusGeometry(R + .05, .22, 6, 40, Math.PI * 1.76), ribM = M(0xc9d3da), nRib = Math.floor(gl / 15);
  const ribs = new THREE.InstancedMesh(ribGeo, ribM, nRib);
  for (let i = 0; i < nRib; i++) { D.position.set(cx, cy, -(g0 + 7.5 + i * 15)); D.rotation.set(0, 0, -Math.PI * .38); D.scale.set(1, 1, 1); D.updateMatrix(); ribs.setMatrixAt(i, D.matrix); }
  grp.add(ribs);
  for (const s of [-1, 1]) { const led = new THREE.Mesh(unit, new THREE.MeshBasicMaterial({ color: 0x7ff0ff })); led.position.set(cx + s * 2.2, cy + R - .25, zc); led.scale.set(.18, .08, gl); grp.add(led); }
  const legs = new THREE.InstancedMesh(unit, M(0x4a4e54), Math.floor(gl / 30) * 2);
  for (let i = 0, n = 0; i < Math.floor(gl / 30); i++) for (const s of [-1, 1]) { D.rotation.set(0, 0, s * .35); D.position.set(cx + s * 6, -8.5, -(g0 + 15 + i * 30)); D.scale.set(.9, 7, .9); D.updateMatrix(); legs.setMatrixAt(n++, D.matrix); }
  grp.add(legs);
  // water surface overhead (seen from below) and light shafts
  const surfMat = new THREE.MeshBasicMaterial({ color: 0x9fe6f2, transparent: true, opacity: .85, side: THREE.DoubleSide, depthWrite: false, alphaMap: seaNormal });
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(2800, b - a - 2 * bore), surfMat); surf.rotation.x = -Math.PI / 2; surf.position.set(cx, UND.surf, -(a + b) / 2); grp.add(surf);
  const shaftMat = new THREE.MeshBasicMaterial({ color: 0xd8fbff, transparent: true, opacity: .07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const shafts = [];
  for (let i = 0; i < 26; i++) { const sh = new THREE.Mesh(new THREE.PlaneGeometry(5 + r() * 9, 44), shaftMat); const pr = g0 + 20 + r() * (gl - 40), x = cx + (r() < .5 ? -1 : 1) * (14 + r() * 70); sh.position.set(x, 6, -pr); sh.rotation.set(0, r() * 3, .25); grp.add(sh); shafts.push({ sh, ph: r() * 6 }); }
  // seabed life: rocks, corals, kelp, a wreck
  const coralShapes = [new THREE.SphereGeometry(1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.ConeGeometry(.5, 3, 5), new THREE.CylinderGeometry(1.4, .3, .25, 10), new THREE.IcosahedronGeometry(1, 0)];
  const coralCols = ['#ff6f91', '#ff9f43', '#b57bff', '#ffd23f', '#4fd2c1', '#ff4f5e'].map(c => new THREE.Color(c));
  const coralLists = coralShapes.map(() => []), sea = [];
  for (let i = 0; i < 1500; i++) {
    const pr = g0 + r() * gl, x = cx + (r() < .5 ? -1 : 1) * (R + 2 + Math.pow(r(), 1.6) * 160), y = undY(x, pr);
    const k = Math.floor(r() * 4); coralLists[k].push([x, y, -pr, k === 2 ? 1.5 + r() * 2 : 1 + r() * 1.8]);
    if (r() < .25) sea.push([x + (r() - .5) * 6, y, -pr + (r() - .5) * 6, 1 + r() * 3]);
  }
  coralLists.forEach((items, k) => { const m = new THREE.InstancedMesh(coralShapes[k], new THREE.MeshStandardMaterial({ roughness: .8, flatShading: true }), items.length);
    items.forEach(([x, y, z, s], i) => { D.position.set(x, y + (k === 2 ? 1.2 * s : -.2), z); D.rotation.set(k === 2 ? Math.PI / 2 + (r() - .5) * .4 : (r() - .5) * .4, r() * 6.3, k === 2 ? 0 : (r() - .5) * .4); D.scale.setScalar(s); D.updateMatrix(); m.setMatrixAt(i, D.matrix); m.setColorAt(i, coralCols[Math.floor(r() * coralCols.length)]); }); grp.add(m); });
  const rk = new THREE.InstancedMesh(rockGeo, M(0x5f6a6c), sea.length);
  sea.forEach(([x, y, z, s], i) => { D.position.set(x, y, z); D.rotation.set(r() * 3, r() * 3, r() * 3); D.scale.set(s * (1 + r()), s * .7, s * (1 + r())); D.updateMatrix(); rk.setMatrixAt(i, D.matrix); }); grp.add(rk);
  const kelpGeo = new THREE.BoxGeometry(.35, 1, .06, 1, 6, 1); kelpGeo.translate(0, .5, 0);
  { const P = kelpGeo.attributes.position; for (let i = 0; i < P.count; i++) { const y = P.getY(i); P.setX(i, P.getX(i) + Math.sin(y * 3) * .25 * y); } kelpGeo.computeVertexNormals(); }
  const kelpN = 520, kelp = new THREE.InstancedMesh(kelpGeo, new THREE.MeshStandardMaterial({ color: 0x3f8f4a, roughness: .9, side: THREE.DoubleSide }), kelpN), kelpD = [];
  for (let i = 0; i < kelpN; i++) { const c = Math.floor(i / 8), cr = rng(c * 7 + 3), pr = g0 + cr() * gl, x0 = cx + (cr() < .5 ? -1 : 1) * (R + 3 + cr() * 90); const x = x0 + (r() - .5) * 5, z = -pr + (r() - .5) * 5; kelpD.push({ x, y: undY(x, -z), z, h: 6 + r() * 12, ph: r() * 6, ry: r() * 6.3 }); }
  grp.add(kelp);
  { const w = new THREE.Group(), pr = g0 + gl * .45, x = cx + 34; w.position.set(x, undY(x, pr) + 1, -pr); w.rotation.set(.18, .7, .22); grp.add(w);
    const hull = new THREE.Mesh(unit, M(0x6b4a33)); hull.scale.set(9, 6, 34); w.add(hull);
    const deckW = new THREE.Mesh(unit, M(0x4f3a2a)); deckW.position.y = 3.1; deckW.scale.set(8.4, .3, 33); w.add(deckW);
    const mast = new THREE.Mesh(unit, M(0x4a3626)); mast.position.set(0, 9, -4); mast.rotation.z = .5; mast.scale.set(.5, 14, .5); w.add(mast);
    const cab = new THREE.Mesh(unit, M(0x5d4430)); cab.position.set(0, 5, 10); cab.scale.set(6, 4, 7); w.add(cab); }
  // fish schools circling the tube, jellyfish, bubbles
  const SCH = 16, PER = 34, fish = new THREE.InstancedMesh(FISH_GEO, new THREE.MeshStandardMaterial({ roughness: .35, metalness: .15, emissive: 0x2a3a40, side: THREE.DoubleSide }), SCH * PER), schools = [];
  for (let s = 0; s < SCH; s++) {
    const col = FISH_COLS[s % FISH_COLS.length], members = [];
    for (let i = 0; i < PER; i++) { members.push([(r() - .5) * 7, (r() - .5) * 4, (r() - .5) * 9, r() * 6, .6 + r() * .6]); fish.setColorAt(s * PER + i, COL.copy(col).multiplyScalar(.85 + r() * .3)); }
    schools.push({ z0: -(g0 + 40 + r() * (gl - 80)), rho: R + 5 + r() * 18, w: (.12 + r() * .12) * (r() < .5 ? 1 : -1), th: r() * 6.3, zA: 20 + r() * 50, zw: .03 + r() * .05, ph: r() * 6, members, size: s % 5 === 0 ? 1.8 : 1 });
  }
  grp.add(fish);
  const jellyM = new THREE.MeshBasicMaterial({ color: 0xff9ad8, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const jellies = [];
  for (let i = 0; i < 22; i++) {
    const j = new THREE.Group(), bell = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), jellyM); j.add(bell);
    for (let k = 0; k < 4; k++) { const tn = new THREE.Mesh(unit, jellyM); const a2 = k / 4 * 6.3; tn.position.set(Math.cos(a2) * .5, -1.4, Math.sin(a2) * .5); tn.scale.set(.04, 2.6, .04); j.add(tn); }
    const pr = g0 + r() * gl; j.position.set(cx + (r() < .5 ? -1 : 1) * (R + 4 + r() * 30), -2 + r() * 20, -pr); j.scale.setScalar(.8 + r() * .9); grp.add(j); jellies.push({ j, ph: r() * 6, y0: j.position.y });
  }
  const BN = 260, bp = new Float32Array(BN * 3), bub = [];
  for (let i = 0; i < BN; i++) { const pr = g0 + r() * gl, x = cx + (r() < .5 ? -1 : 1) * (R + 1 + r() * 40); bub.push({ x, z: -pr, y: UND.bed + r() * 30, sp: 1.5 + r() * 2 }); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bp, 3));
  const bubbles = new THREE.Points(bg, new THREE.PointsMaterial({ color: 0xe8fcff, size: .25, transparent: true, opacity: .7, depthWrite: false })); bubbles.frustumCulled = false; grp.add(bubbles);
  const tmpV = new THREE.Vector3();
  const whales = [{ g: makeWhale(32, 71), pr: (g0 + g1) / 2, rx: 24, rz: 300, w: .04, ph: 0, y: 20, off: [0, 0, 0] }, { g: makeWhale(13, 72), pr: (g0 + g1) / 2, rx: 24, rz: 300, w: .04, ph: -.06, y: 16, off: [11, 4, 8] }];
  whales.forEach(q => grp.add(q.g));
  grp.userData.tick = (t, dt) => {
    if (seaK < .01 && !viewOut) return;                       // nothing to animate while the train is outside
    for (let s = 0; s < SCH; s++) {
      const q = schools[s], th = q.th + t * q.w, z = q.z0 + Math.sin(t * q.zw + q.ph) * q.zA;
      const ccx = cx + Math.cos(th) * q.rho, ccy = Math.max(UND.bed + 3, cy + Math.sin(th) * q.rho), dirx = -Math.sin(th) * q.w, diry = Math.cos(th) * q.w, dirz = Math.cos(t * q.zw + q.ph) * q.zA * q.zw;
      q.members.forEach(([ox, oy, oz, ph, sc], i) => {
        D.position.set(ccx + ox + Math.sin(t * 1.3 + ph) * .6, ccy + oy + Math.sin(t * 1.7 + ph) * .4, z + oz);
        tmpV.set(D.position.x + dirx, D.position.y + diry, D.position.z + dirz + 1e-4); D.lookAt(tmpV);
        D.rotation.y += Math.sin(t * 9 + ph) * .12; D.scale.setScalar(sc * q.size); D.updateMatrix(); fish.setMatrixAt(s * PER + i, D.matrix);
      });
    }
    fish.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < kelpN; i++) { const k = kelpD[i]; D.position.set(k.x, k.y, k.z); D.rotation.set(Math.sin(t * .8 + k.ph) * .12, k.ry, Math.cos(t * .6 + k.ph) * .1); D.scale.set(1, k.h, 1); D.updateMatrix(); kelp.setMatrixAt(i, D.matrix); }
    kelp.instanceMatrix.needsUpdate = true;
    for (const q of jellies) { const pu = .5 + .5 * Math.sin(t * 1.6 + q.ph); q.j.scale.y = q.j.scale.x * (.75 + .35 * pu); q.j.position.y = q.y0 + Math.sin(t * .25 + q.ph) * 3; }
    for (let i = 0; i < BN; i++) { const q = bub[i]; q.y += q.sp * dt; if (q.y > UND.surf - .5) q.y = UND.bed + 1; bp[i * 3] = q.x + Math.sin(t * 2 + i) * .2; bp[i * 3 + 1] = q.y; bp[i * 3 + 2] = q.z; }
    bg.attributes.position.needsUpdate = true;
    for (const q of shafts) q.sh.rotation.z = .25 + Math.sin(t * .3 + q.ph) * .08;
    // whales: a slow oval over the tube, so the train passes right under them
    for (const q of whales) {
      const th = t * q.w + q.ph, x = cx + Math.cos(th) * q.rx, z = -q.pr + Math.sin(th) * q.rz, dx = -Math.sin(th) * q.rx, dz = Math.cos(th) * q.rz;
      q.g.position.set(x + q.off[0], q.y + Math.sin(th * 2) * 3 + q.off[1], z + q.off[2]); q.g.rotation.y = Math.atan2(-dz, dx); q.g.userData.anim(t, q.ph);
    }
    whales[0].g.getWorldPosition(tmpV);
    if (tmpV.distanceTo(camera.position) < 260 && t - whaleCallT > 22) { whaleCallT = t; whaleCall(); }
    seaNormal.offset.x = t * .012; seaNormal.offset.y = t * .02;
  };
  return grp;
}

/* --- humpback whale: lofted body (dark back, pale belly), long white flippers, a tail stock and fluke that beat slowly --- */
function makeWhale(len, seed){
  const r = rng(seed), g = new THREE.Group(), body = new THREE.Group(), tail = new THREE.Group(), fluke = new THREE.Group();
  const back = new THREE.Color('#25384a'), belly = new THREE.Color('#d3dcdf');
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .55, metalness: .05, flatShading: true });
  const prof = u => {                                            // u: 0 = snout … 1 = tail stock; returns [half-height, half-width, centre y]
    const head = sstep(0, .2, u), taper = 1 - .86 * Math.pow(sstep(.38, 1, u), 1.15);
    return [.13 * len * (.45 + .55 * head) * taper, .14 * len * (.5 + .5 * head) * taper, -.02 * len * (1 - head)];
  };
  const loftPart = (u0, u1, xOff) => {
    const NU = 14, NA = 18, pos = [], col = [], idx = [];
    for (let i = 0; i <= NU; i++) {
      const u = u0 + (u1 - u0) * i / NU, [hh, hw, yc] = prof(u), x = -u * len + xOff;
      for (let k = 0; k <= NA; k++) {
        const a = k / NA * Math.PI * 2, y = yc + Math.sin(a) * hh * (Math.sin(a) < 0 ? .85 : 1), z = Math.cos(a) * hw;
        pos.push(x, y, z); const c = COL.copy(belly).lerp(back, sstep(-.35, .25, Math.sin(a))); if (Math.sin(a) < -.3 && (k % 2)) c.multiplyScalar(.9); col.push(c.r, c.g, c.b);   // grooved pale throat
      }
    }
    for (let i = 0; i < NU; i++) for (let k = 0; k < NA; k++) { const p = i * (NA + 1) + k, q = p + NA + 1; idx.push(p, q, p + 1, p + 1, q, q + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    return new THREE.Mesh(geo, mat);
  };
  const UP = .58;                                                // the tail hinges here
  body.add(loftPart(0, UP, 0)); g.add(body);
  tail.position.x = -UP * len; tail.add(loftPart(UP, 1, UP * len)); body.add(tail);
  fluke.position.x = -(1 - UP) * len; tail.add(fluke);
  const fs = new THREE.Shape(), W = .23 * len, Lf = .13 * len;     // two swept-back lobes with a notch
  fs.moveTo(.02 * len, 0); fs.quadraticCurveTo(-.02 * len, W * .7, -Lf, W); fs.quadraticCurveTo(-Lf * .62, W * .4, -Lf * .5, .05 * len);
  fs.quadraticCurveTo(-Lf * .72, 0, -Lf * .5, -.05 * len); fs.quadraticCurveTo(-Lf * .62, -W * .4, -Lf, -W); fs.quadraticCurveTo(-.02 * len, -W * .7, .02 * len, 0);   // smooth rounded median notch (was a sharp V with kinked corners)
  const fg = new THREE.ExtrudeGeometry(fs, { depth: .012 * len, bevelEnabled: false }); fg.rotateX(Math.PI / 2); fg.translate(0, .006 * len, 0);
  fluke.add(new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ color: 0x24364a, roughness: .6, flatShading: true, side: THREE.DoubleSide })));
  const finM = new THREE.MeshStandardMaterial({ color: 0xe7edef, roughness: .6, flatShading: true }), fins = [];
  for (const s of [-1, 1]) {                                      // humpback flippers: long, pale, knobbly leading edge, drooping from the flank
    const piv = new THREE.Group(); piv.position.set(-.27 * len, -.07 * len, s * .11 * len); body.add(piv);
    const flen = .34 * len;                                      // flippers run about a third of the body
    const fin = new THREE.Mesh(new THREE.BoxGeometry(.055 * len, .016 * len, flen, 1, 1, 8), finM);
    const P = fin.geometry.attributes.position; for (let i = 0; i < P.count; i++) { const u = P.getZ(i) / flen + .5; P.setX(i, P.getX(i) * (1 - .55 * u) - u * u * .05 * len); }   // taper + sweep back toward the tip
    fin.geometry.computeVertexNormals(); fin.position.z = s * flen * .5; piv.add(fin);
    for (let kk = 0; kk < 5; kk++) { const u = kk / 5, kn = new THREE.Mesh(new THREE.SphereGeometry(.013 * len * (1 - u * .4), 6, 4), finM); kn.position.set(-.02 * len - u * .03 * len, 0, s * (flen * .12 + u * flen * .78)); piv.add(kn); }   // knobbly leading edge
    piv.rotation.x = s * .12; piv.rotation.y = -s * .12; fins.push([piv, s]);
  }
  for (const s of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(.007 * len, 8, 6), M(0x0b0d10)); eye.position.set(-.16 * len, -.01 * len, s * .118 * len); body.add(eye); }
  for (let i = 0; i < 15; i++) { const u = i / 15, k = new THREE.Mesh(new THREE.SphereGeometry((.005 + r() * .005) * len, 6, 4), M(0x33495e)); k.position.set(-.008 * len - u * .14 * len, (.055 - .025 * u) * len + r() * .008 * len, (r() - .5) * .1 * len * (1 - u * .4)); body.add(k); }   // tubercles scattered along the top of the rostrum
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const k = new THREE.Mesh(new THREE.SphereGeometry(.005 * len, 6, 4), M(0x33495e)); k.position.set(-.02 * len - i * .035 * len, -.055 * len, s * (.05 + i * .005) * len); body.add(k); }   // a few on the lower jaw
  g.userData.anim = (t, ph = 0) => {
    const w = .55;
    tail.rotation.z = Math.sin(t * w + ph) * .16; fluke.rotation.z = Math.sin(t * w + ph - .9) * .32;
    body.rotation.z = Math.sin(t * w + ph + 1.4) * .035;
    for (const [piv, s] of fins) piv.rotation.x = s * (.12 + Math.sin(t * w * .7 + ph) * .12);
  };
  return g;
}
let whaleCallT = -99;
function whaleCall(){
  if (!ac || ac.state !== 'running') return;
  const t0 = ac.currentTime, o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter(), vib = ac.createOscillator(), vg = ac.createGain();
  o.type = 'sine'; o2.type = 'triangle'; lp.type = 'lowpass'; lp.frequency.value = 700;
  for (const [os, k] of [[o, 1], [o2, 1.5]]) { os.frequency.setValueAtTime(170 * k, t0); os.frequency.exponentialRampToValueAtTime(95 * k, t0 + 1.8); os.frequency.exponentialRampToValueAtTime(260 * k, t0 + 3.4); os.frequency.exponentialRampToValueAtTime(120 * k, t0 + 5); }
  vib.frequency.value = 5; vg.gain.value = 6; vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
  g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.12, t0 + .9); g.gain.setValueAtTime(.12, t0 + 3.8); g.gain.exponentialRampToValueAtTime(.0001, t0 + 5.2);
  const dl = ac.createDelay(1), fb = ac.createGain(); dl.delayTime.value = .42; fb.gain.value = .35; g.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(master);
  o.connect(lp); o2.connect(lp); lp.connect(g).connect(master); for (const n of [o, o2, vib]) { n.start(t0); n.stop(t0 + 5.4); }
}
let seaK = 0;
function underTile(idx){
  const grp = new THREE.Group();
  addTrack(grp, 0);
  for (let k = 0; k < 4 * KT; k++) { const pr = idx * TILE + 30 + k * 60; if (pr < UND.a - 20 || pr > UND.b + 20) addBox(grp, null, 2.5, 0, -(30 + k * 60), .18, 1.1, .18, 0xcccbc2); }
  if (idx === 5) addJunction(grp);
  return grp;
}
