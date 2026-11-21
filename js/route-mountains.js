/* ================= ROUTE 2 · mountains & tunnel ================= */
const TUN = { a: 540 * KT, b: 1080 * KT };     // tunnel span along the route (m)
const mAmp = pr => lerpN([[0, 4], [160, 18], [380, 40], [540, 52], [1080, 52], [1180, 36], [1320, 16], [1440, 6]].map(([a, b]) => [a * KT, b]), pr);
const mClear = pr => lerpN([[0, 18], [240, 10], [1180, 10], [1300, 17], [1440, 19]].map(([a, b]) => [a * KT, b]), pr);
const mNoise = (x, z) => Math.sin(x * .045 + z * .021) * .5 + Math.sin(x * .013 - z * .037 + 1.7) * .35 + Math.sin(x * .11 + z * .07 + 4.1) * .15;
function mH(x, pr){
  const d = Math.abs(x), c = mClear(pr), a = mAmp(pr);
  if (d < c) return -.4;
  return a * (sstep(c, c + 45, d) * .85 + d / 900) + a * .26 * mNoise(x, pr) * sstep(c, c + 25, d) + a * .07 * Math.sin(x * .31 + pr * .17) * Math.sin(pr * .23 - x * .11) * sstep(c, c + 12, d) + (d - c) * .04;
}
function mtnSide(grp, idx, side){
  const NX = 28, NZ = 24 * KT, pos = [], cols = [], idxs = [];
  for (let iz = 0; iz <= NZ; iz++) {
    const lz = iz * TILE / NZ, pr = idx * TILE + lz, c = mClear(pr), a = mAmp(pr);
    for (let ix = 0; ix <= NX; ix++) {
      const d = c - .6 + 340 * Math.pow(ix / NX, 1.7), x = side * d, y = ix === 0 ? -.4 : mH(x, pr);
      pos.push(x, y, -lz);
      const snowLine = a * .78 + mNoise(x * 2, pr * 2) * a * .14, n = (mNoise(x * 3, pr * 3) + 1) * .5;
      if (y > snowLine) COL.setRGB(.86 + n * .06, .88 + n * .05, .89 + n * .05);
      else if (y < 2) COL.setRGB(.36 + n * .05, .33 + n * .04, .27);
      else { const q = .3 + n * .2 + (mNoise(x * 7, pr * 5) * .06); COL.setRGB(q + .03, q + .01, q - .02); }
      cols.push(COL.r, COL.g, COL.b);
    }
  }
  for (let iz = 0; iz < NZ; iz++) for (let ix = 0; ix < NX; ix++) {
    const a = iz * (NX + 1) + ix, b = a + 1, c = a + NX + 1, d = c + 1;
    if (side > 0) idxs.push(a, c, b, b, c, d); else idxs.push(a, b, c, b, d, c);
  }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.setIndex(idxs);
  g = g.toNonIndexed(); g.computeVertexNormals();
  grp.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, side: THREE.DoubleSide })));
}
/* mountain massif above the tunnel: rises from just over the portal to a ridge behind it */
function massifH(x, dz, prF){
  const a = mAmp(prF), d = Math.abs(x);
  const core = 16 + (a * 1.15 - 16) * sstep(0, 110, dz) * (1 - sstep(70, 300, d)) + a * .22 * mNoise(x * 1.3, prF + dz) * sstep(0, 50, dz) + a * .06 * Math.sin(x * .27 + dz * .19);
  return Math.max(core, mH(x, prF + dz));
}
function rockColor(x, y, z, a){
  const n = (mNoise(x * 3, z * 3) + 1) * .5;
  if (y > a * .8 + mNoise(x * 2, z * 2) * a * .15) COL.setRGB(.86 + n * .06, .88 + n * .05, .9 + n * .05);
  else { const q = .29 + n * .2 + mNoise(x * 7, z * 5) * .06; COL.setRGB(q + .03, q + .01, q - .02); }
  return COL;
}
function mtnMassif(grp, prF, zf, depth){
  const NX = 44, NZ = 30, pos = [], cols = [], idxs = [], a = mAmp(prF);
  for (let iz = 0; iz <= NZ; iz++) {
    const dz = depth * Math.pow(iz / NZ, 1.3);
    for (let ix = 0; ix <= NX; ix++) {
      const x = -340 + 680 * ix / NX, y = massifH(x, dz, prF);
      pos.push(x, y, zf - dz); const c = rockColor(x, y, prF + dz, a); cols.push(c.r, c.g, c.b);
    }
  }
  for (let iz = 0; iz < NZ; iz++) for (let ix = 0; ix < NX; ix++) { const p = iz * (NX + 1) + ix, q = p + 1, r2 = p + NX + 1, s2 = r2 + 1; idxs.push(p, q, r2, q, s2, r2); }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.setIndex(idxs);
  g = g.toNonIndexed(); g.computeVertexNormals();
  grp.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, side: THREE.DoubleSide })));
}
function mtnFace(grp, pr, z, frameDir){
  const a = mAmp(pr), sh = new THREE.Shape();
  sh.moveTo(-340, -1);
  for (let x = -340; x <= 340; x += 680 / 44) sh.lineTo(x, frameDir > 0 ? massifH(x, 0, pr) : Math.max(mH(x, pr), 16));
  sh.lineTo(340, -1); sh.lineTo(-340, -1);
  const hole = new THREE.Path(); hole.moveTo(TX - 7.75, 0); hole.lineTo(TX + 7.75, 0); hole.lineTo(TX + 7.75, 4.5); hole.absellipse(TX, 4.5, 7.75, 5.3, 0, Math.PI, false); hole.lineTo(TX - 7.75, 0);
  sh.holes.push(hole);
  const geo = new THREE.ShapeGeometry(sh), P = geo.attributes.position, cl = [];
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), n = (mNoise(x * 4, y * 4) + 1) * .5, q = .3 + n * .16 - Math.max(0, 6 - y) * .01; cl.push(q + .03, q + .01, q - .02); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
  const face = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }));
  face.position.z = z; grp.add(face);
  if (frameDir > 0) mtnMassif(grp, pr, z - .2, 520);
  // concrete portal
  const conc = M(0x8f8a80), fz = z + frameDir * .5, pg0 = grp; grp = new THREE.Group(); grp.position.x = TX; grp.scale.x = TS; pg0.add(grp);
  for (const s of [-1, 1]) addBox(grp, conc, s * 6.1, 0, fz, 1.6, 4.5, 1);
  for (let i = 0; i <= 10; i++) { const t = Math.PI * i / 10, m = new THREE.Mesh(unit, conc); m.position.set(Math.cos(t) * 6.1, 4.5 + Math.sin(t) * 6.1, fz); m.rotation.z = t + Math.PI / 2; m.scale.set(1.9, 1.6, 1); grp.add(m); }
  addBox(grp, conc, 0, 11.4, fz, 15.5, 2.2, 1.2);
  addBox(grp, null, 0, 12.1, fz + frameDir * .62, 4.2, .9, .05, 0x2c2a27);
  for (const s of [-1, 1]) addBox(grp, conc, s * 9.6, 0, fz, 3.5, 12.6, 1.4);     // wing walls
}
const tunMat = new THREE.MeshStandardMaterial({ color: 0x3b3833, roughness: 1, side: THREE.BackSide });
const tunWallMat = new THREE.MeshStandardMaterial({ color: 0x45413b, roughness: 1, side: THREE.DoubleSide });
const lampMat = new THREE.MeshBasicMaterial({ color: 0xffdc9a });
const TX = -2.3, TS = 1.46;     // tunnel centre and horizontal stretch (room for two tracks)
function tunnelPart(grp0, zA, zB){
  const grp = new THREE.Group(); grp.position.x = TX; grp.scale.x = TS; grp0.add(grp);
  const len = zA - zB, mid = (zA + zB) / 2;
  const arch = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, len, 22, 1, true, Math.PI / 2, Math.PI), tunMat);
  arch.rotation.x = Math.PI / 2; arch.position.set(0, 4.5, mid); grp.add(arch);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(len, 4.6), tunWallMat); w.rotation.y = Math.PI / 2; w.position.set(s * 5.2, 2.25, mid); grp.add(w); }
  const nR = Math.floor(len / 8), ribs = new THREE.InstancedMesh(new THREE.TorusGeometry(5.08, .16, 5, 20, Math.PI), M(0x2e2b27), nR), legs = new THREE.InstancedMesh(unit, M(0x2e2b27), nR * 2);
  for (let i = 0; i < nR; i++) {
    const z = zA - 4 - i * 8; D.rotation.set(0, 0, 0); D.scale.set(1, 1, 1); D.position.set(0, 4.5, z); D.updateMatrix(); ribs.setMatrixAt(i, D.matrix);
    [-1, 1].forEach((s, j) => { D.position.set(s * 5.05, 2.25, z); D.scale.set(.3, 4.5, .3); D.updateMatrix(); legs.setMatrixAt(i * 2 + j, D.matrix); });
  }
  grp.add(ribs, legs);
  for (let z = zA - 12, k = 0; z > zB; z -= 24, k++) {
    const s = k % 2 ? 1 : -1, l = new THREE.Mesh(unit, lampMat); l.position.set(s * 4.85, 3.7, z); l.scale.set(.18, .22, .5); grp.add(l);
    const g = new THREE.Sprite(glowMat); g.position.set(s * 4.6, 3.7, z); g.scale.set(3.4 / TS, 3.4, 1); grp.add(g);
  }
  for (const y of [2.5, 2.75, 3.0]) { const c = new THREE.Mesh(unit, M(0x1d1b19)); c.position.set(-5.05, y, mid); c.scale.set(.06, .06, len); grp.add(c); }
}
function mountainTile(idx){
  const r = rng(707 + idx * 37), grp = new THREE.Group();
  addTrack(grp, 0); addGround(grp);
  mtnSide(grp, idx, -1); mtnSide(grp, idx, 1);
  // tunnel pieces in this tile (local p ranges)
  const p0 = idx * TILE, a = clamp(TUN.a - p0, 0, TILE), b = clamp(TUN.b - p0, 0, TILE);
  if (b > a) tunnelPart(grp, -a, -b);
  if (TUN.a >= p0 && TUN.a < p0 + TILE) mtnFace(grp, TUN.a, -(TUN.a - p0), 1);
  if (TUN.b >= p0 && TUN.b < p0 + TILE) mtnFace(grp, TUN.b, -(TUN.b - p0), -1);
  // pines and boulders on the slopes, outside the tunnel
  const trees = [], nT = [150, 70, 30, 0, 40, 130][idx] * KT;
  for (let i = 0; i < nT; i++) {
    const lz = r() * TILE, pr = p0 + lz; if (pr > TUN.a - 30 && pr < TUN.b + 30 && r() < .8) continue;
    const side = r() < .5 ? -1 : 1, base = mClear(pr) + 2, min = side < 0 ? leftMin(idx, -lz, base) : rightMin(idx, -lz, base);
    const x = side * (min + Math.pow(r(), 1.4) * 140), y = mH(x, pr);
    if (y > mAmp(pr) * .55) continue;
    trees.push({ x, z: -lz, y: y - .3, kind: 'pine', h: 7 + r() * 9 });
  }
  plantTrees(grp, r, trees);
  const nB = [20, 50, 30, 0, 30, 20][idx] * KT, rocks = new THREE.InstancedMesh(rockGeo, matRock, Math.max(1, nB));
  for (let i = 0; i < nB; i++) {
    const lz = r() * TILE, pr = p0 + lz, side = r() < .5 ? -1 : 1, x = side * (Math.max(side > 0 ? rightMin(idx, -lz, 0) : leftMin(idx, -lz, 0), mClear(pr) + .5) + r() * 5), s = .5 + r() * 1.8;
    if (pr > TUN.a - 4 && pr < TUN.b + 4) { D.scale.set(0, 0, 0); D.updateMatrix(); rocks.setMatrixAt(i, D.matrix); continue; }
    D.position.set(x, Math.max(0, mH(x, pr)) * .6, -lz); D.rotation.set(r() * 3, r() * 3, r() * 3); D.scale.set(s, s * .7, s * 1.1); D.updateMatrix(); rocks.setMatrixAt(i, D.matrix);
    const v = .4 + r() * .15; COL.setRGB(v, v * .97, v * .93); rocks.setColorAt(i, COL);
  }
  if (nB) grp.add(rocks);
  // km pickets outside the tunnel
  for (let k = 0; k < 4 * KT; k++) { const pr = p0 + 30 + k * 60; if (pr < TUN.a || pr > TUN.b) addBox(grp, null, 2.5, 0, -(30 + k * 60), .18, 1.1, .18, 0xcccbc2); }
  if (idx === 5) addJunction(grp);
  return grp;
}
