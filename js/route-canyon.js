/* ================= ROUTE 4 · canyon & long viaduct ================= */
const CAN = { a: 300 * KT, b: 1020 * KT, rimA: 335 * KT, rimB: 985 * KT, dep: 175, river: 660 * KT };   // along-route metres
const desertTex = canvasTex(512, 512, (x, w, h) => {
  const r = rng(44);
  x.fillStyle = '#8b5b3d'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { const v = r(); x.fillStyle = `rgba(${120 + v * 70},${70 + v * 45},${45 + v * 30},.35)`; x.fillRect(r() * w, r() * h, 2, 2); }
  for (let i = 0; i < 18; i++) {
    const cx = r() * w, cy = r() * h, rad = 10 + r() * 40;
    for (const [ox, oy] of [[0,0],[w,0],[-w,0],[0,h],[0,-h]]) {
      const g = x.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, rad);
      g.addColorStop(0, 'rgba(225,215,205,.6)'); g.addColorStop(1, 'rgba(225,215,205,0)');
      x.fillStyle = g; x.fillRect(cx + ox - rad, cy + oy - rad, rad * 2, rad * 2);
    }
  }
});
desertTex.wrapS = desertTex.wrapT = THREE.RepeatWrapping;
const desertMat = new THREE.MeshStandardMaterial({ map: desertTex, roughness: 1 });
const rimWobble = x => 22 * Math.sin(x * .0061 + 1.3) + 9 * Math.sin(x * .021 + .4);
const terr = u => .3 * sstep(0, .22, u) + .32 * sstep(.34, .58, u) + .38 * sstep(.7, 1, u);   // terraced cliff profile 0..1
function canY(x, pr){
  const ra = CAN.rimA + rimWobble(x), rb = CAN.rimB - rimWobble(x * 1.3 + 400), W = 80;
  let y;
  if (pr <= ra) y = -7 * sstep(ra - 120, ra, pr);           // plateau dips toward the lip, so the far wall shows up early
  else if (pr >= rb) y = -7 * (1 - sstep(rb, rb + 120, pr));
  else {
    const uA = (pr - ra) / W, uB = (rb - pr) / W;
    y = -CAN.dep * Math.min(terr(clamp(uA, 0, 1)), terr(clamp(uB, 0, 1)));
    const floor = Math.min(clamp(uA, 0, 1), clamp(uB, 0, 1));
    if (floor >= 1) y += 7 * mNoise(x * .8, pr * .8) - 6 * Math.exp(-Math.pow((pr - CAN.river - 12 * Math.sin(x * .01)) / 14, 2));
  }
  return y;
}
const STRATA = ['#e3c393', '#a3472a', '#d08257', '#6c3022', '#d9b07d', '#8f3d27', '#c46e45'].map(c => new THREE.Color(c));
const HAZE = new THREE.Color('#6f8296'), FLOOR = new THREE.Color('#5a5144');
function strataColor(y, x, pr){
  if (y > -1.5) return COL.setRGB(.55, .37, .25);
  const depth = -y + mNoise(x * .3, pr * .3) * 3, band = STRATA[mod(Math.floor(Math.max(0, depth) / 13), STRATA.length)];
  COL.copy(band);
  if (y < -CAN.dep + 5) COL.copy(FLOOR).lerp(band, .15);                   // canyon floor
  const k = clamp(-y / CAN.dep, 0, 1);
  COL.multiplyScalar(1 - .42 * k); COL.lerp(HAZE, .22 * k);                 // deeper = darker and hazier
  return COL;
}
function buildCanyonScenery(){
  const grp = new THREE.Group(), pa = CAN.rimA - 130, pb = CAN.rimB + 130, r = rng(4242);
  const NX = 76, NZ = Math.ceil((pb - pa) / 6), pos = [], cols = [], ids = [];
  for (let iz = 0; iz <= NZ; iz++) {
    const pr = pa + (pb - pa) * iz / NZ;
    for (let ix = 0; ix <= NX; ix++) {
      const t = ix / NX * 2 - 1, x = Math.sign(t) * Math.pow(Math.abs(t), 1.6) * 1300, y = canY(x, pr);
      pos.push(x, y, -pr); const c = strataColor(y, x, pr); cols.push(c.r, c.g, c.b);
    }
  }
  for (let iz = 0; iz < NZ; iz++) for (let ix = 0; ix < NX; ix++) { const a = iz * (NX + 1) + ix, b = a + 1, c = a + NX + 1, d = c + 1; ids.push(a, c, b, b, c, d); }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.setIndex(ids);
  g = g.toNonIndexed(); g.computeVertexNormals();
  grp.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, side: THREE.DoubleSide })));
  const w = new THREE.Mesh(new THREE.PlaneGeometry(2800, 26), new THREE.MeshPhongMaterial({ color: 0x3f6870, specular: 0x55666a, shininess: 30 }));
  w.rotation.x = -Math.PI / 2; w.position.set(0, -CAN.dep - 3.2, -CAN.river); grp.add(w);
  // mesas and hoodoos in the gorge
  for (let k = 0; k < 34 * KT; k++) {
    const pr = CAN.rimA + 100 + r() * (CAN.rimB - CAN.rimA - 200), side = r() < .5 ? -1 : 1, x = side * (60 + Math.pow(r(), .8) * 900), base = canY(x, pr);
    if (base > -CAN.dep + 20) continue;
    const h = 30 + r() * (CAN.dep - 20), rad = 7 + r() * 28;
    for (let sgm = 0, y = base; sgm < 4; sgm++) {
      const hh = h / 4, m = new THREE.Mesh(new THREE.CylinderGeometry(rad * (1 - sgm * .07), rad * (1 - (sgm - 1) * .07), hh, 7), M(0xffffff));
      m.material.color.copy(STRATA[(k + sgm * 2) % STRATA.length]).multiplyScalar(.8 + sgm * .07); m.position.set(x, y + hh / 2, -pr); m.rotation.y = r() * 3; grp.add(m); y += hh;
    }
  }
  // river: wave-mapped water with white rapids
  const riverMat = new THREE.MeshPhongMaterial({ color: 0x3b7d84, specular: 0xfff0d8, shininess: 90, normalMap: seaNormal, normalScale: new THREE.Vector2(.8, .8) });
  w.material = riverMat;
  const rapidMat = new THREE.MeshBasicMaterial({ color: 0xf4efe6, transparent: true, opacity: .6, depthWrite: false });
  for (let i = 0; i < 70; i++) { const x = (r() - .5) * 1600, l = 6 + r() * 22, fm = new THREE.Mesh(new THREE.PlaneGeometry(l, 1 + r() * 2.5), rapidMat); fm.rotation.x = -Math.PI / 2; fm.rotation.z = (r() - .5) * .3; fm.position.set(x, -CAN.dep - 3.1, -CAN.river + (r() - .5) * 18); grp.add(fm); }
  // a natural stone arch and slender hoodoos with cap stones, near the viaduct where they are seen best
  for (const [ax, apr, R, tube] of [[-330, CAN.river + 260, 48, 12], [520, CAN.river - 380, 34, 9]]) {
    const base = canY(ax, apr), arch = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 7, 22, Math.PI), M(0xffffff));
    arch.material.color.copy(STRATA[1]).lerp(STRATA[2], .4); arch.position.set(ax, base - 2, -apr); arch.rotation.y = .4; grp.add(arch);
    for (const s of [-1, 1]) { const foot = new THREE.Mesh(new THREE.CylinderGeometry(tube * 1.1, tube * 1.6, 14, 7), arch.material); foot.position.set(ax + Math.cos(.4) * R * s, base + 3, -apr - Math.sin(.4) * R * s); grp.add(foot); }
  }
  for (let k = 0; k < 26; k++) {
    const pr = CAN.rimA + 140 + r() * (CAN.rimB - CAN.rimA - 280), x = (r() < .5 ? -1 : 1) * (45 + r() * 260), base = canY(x, pr);
    if (base > -CAN.dep + 25) continue;
    const h = 45 + r() * 70, g = new THREE.Group(); g.position.set(x, base, -pr); grp.add(g);
    for (let s = 0; s < 3; s++) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(3.2 - s * .7, 4.6 - s * .7, h / 3, 6), M(0xffffff)); seg.material.color.copy(STRATA[(k + s) % STRATA.length]).multiplyScalar(.85); seg.position.y = h / 3 * (s + .5); seg.rotation.y = r() * 3; g.add(seg); }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 4.2, 4, 6), M(0x6c3022)); cap.position.y = h + 1.6; g.add(cap);
  }
  // eagles circling down in the gorge and above the rim
  const eagles = makeBirds(5, 0x4a3426, 3.4, -120, -CAN.river, -95, 240, 33), eagles2 = makeBirds(3, 0x3d2b20, 3.8, 200, -CAN.river - 300, 25, 200, 34);
  grp.add(eagles, eagles2);
  grp.userData.tick = t => { eagles.userData.tick(t); eagles2.userData.tick(t); };
  // the viaduct, whole span
  const len = CAN.b - CAN.a, mid = -(CAN.a + CAN.b) / 2, conc = M(0x9b968c), dark = M(0x6f6b64), steel = M(0x3c4248);
  const deck = new THREE.Mesh(unit, conc); deck.position.set(-2.3, -1.6, mid); deck.scale.set(12, 3.2, len); grp.add(deck);
  const under = new THREE.Mesh(unit, dark); under.position.set(-2.3, -3.6, mid); under.scale.set(8, 1, len); grp.add(under);
  for (const s of [-1, 1]) {
    const curb = new THREE.Mesh(unit, conc); curb.position.set(-2.3 + s * 5.85, .25, mid); curb.scale.set(.3, .5, len); grp.add(curb);
    const rail = new THREE.Mesh(unit, steel); rail.position.set(-2.3 + s * 5.9, 1.15, mid); rail.scale.set(.08, .08, len); grp.add(rail);
    const n = Math.floor(len / 3), posts = new THREE.InstancedMesh(unit, steel, n);
    for (let i = 0; i < n; i++) { D.rotation.set(0, 0, 0); D.position.set(-2.3 + s * 5.9, .8, -CAN.a - 1.5 - i * 3); D.scale.set(.07, .7, .07); D.updateMatrix(); posts.setMatrixAt(i, D.matrix); }
    grp.add(posts);
  }
  for (let pr = Math.ceil(CAN.a / 60) * 60; pr <= CAN.b; pr += 60) {
    const base = Math.min(canY(0, pr), canY(-8, pr), canY(4, pr)), hgt = -3.6 - base;
    if (hgt < 2) continue;
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3 + hgt * .02, hgt, 8), conc);
    pier.position.set(-2.3, base + hgt / 2, -pr); pier.scale.set(2.3, 1, 1); grp.add(pier);
    const cap = new THREE.Mesh(unit, conc); cap.position.set(-2.3, -4.6, -pr); cap.scale.set(13, 1.6, 4); grp.add(cap);
  }
  for (const pr of [CAN.a + 6, CAN.b - 6]) { const ab = new THREE.Mesh(unit, conc); ab.position.set(-2.3, -8, -pr); ab.scale.set(15.5, 16, 12); grp.add(ab); }
  // embankments carrying the track across the dip before and after the gorge
  const emb = M(0x7a6a58);
  for (const [z0, z1] of [[CAN.rimA - 130, CAN.a], [CAN.b, CAN.rimB + 130]]) {
    const e = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 6.5, 8, 4, 1), emb); e.rotation.y = Math.PI / 4;
    const box = new THREE.Group(); box.add(e); e.scale.set(1, 1, 1);
    const m = new THREE.Mesh(unit, emb); m.position.set(-2.3, -4, -(z0 + z1) / 2); m.scale.set(11.2, 8, z1 - z0); grp.add(m);
    for (const s of [-1, 1]) { const sl = new THREE.Mesh(unit, emb); sl.position.set(-2.3 + s * 6.95, -4.6, -(z0 + z1) / 2); sl.rotation.z = s * .55; sl.scale.set(3.4, 6.4, z1 - z0); grp.add(sl); }
  }
  return grp;
}
function canyonTile(idx){
  const r = rng(1301 + idx * 71), grp = new THREE.Group(), p0 = idx * TILE;
  // plateau ground only outside the gorge
  const ga = clamp(CAN.rimA - 128 - p0, 0, TILE), gb = clamp(CAN.rimB + 128 - p0, 0, TILE);
  if (ga > 0) addGround(grp, 0, -ga, desertMat);
  if (gb < TILE) addGround(grp, -gb, -TILE, desertMat);
  addTrack(grp, 0);
  // desert shrubs + stones on the plateau
  const sh = [], n = 120 * KT;
  for (let i = 0; i < n; i++) {
    const z = r() * TILE, pr = p0 + z; if (pr > CAN.rimA - 50 && pr < CAN.rimB + 50) continue;
    const side = r() < .5 ? -1 : 1, x = side * ((side > 0 ? rightMin(idx, -z, 6) : leftMin(idx, -z, 9.5)) + Math.pow(r(), 1.4) * 160);
    sh.push([x, -z, .5 + r() * 1.3]);
  }
  if (sh.length) {
    const bush = new THREE.InstancedMesh(crownGeo, matCrown, sh.length);
    sh.forEach(([x, z, s], i) => { D.position.set(x, s * .4, z); D.rotation.set(0, r() * 3, 0); D.scale.set(s, s * .6, s); D.updateMatrix(); bush.setMatrixAt(i, D.matrix); COL.setRGB(.33 + r() * .08, .36 + r() * .06, .22); bush.setColorAt(i, COL); });
    grp.add(bush);
  }
  if (idx === 0 || idx === 5) for (let k = 0; k < 4 * KT; k++) addBox(grp, null, 2.5, 0, -(30 + k * 60), .18, 1.1, .18, 0xcccbc2);
  if (idx === 5) addJunction(grp);
  return grp;
}
