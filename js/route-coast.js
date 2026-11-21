/* ================= ROUTE 5 · sea coast: beach, lighthouse cape, long cable-stayed bridge over the bay, harbour town ================= */
const COAST = { cape: 700, bay: [1060, 1980], town: [2050, 2760], pier: 2380, END: 6 * TILE };
const coastNoise = (x, z) => Math.sin(x * .021 + z * .013) * .5 + Math.sin(x * .057 - z * .031 + 2.1) * .3 + Math.sin(x * .13 + z * .09 + .7) * .2;
const bayK = pr => sstep(COAST.bay[0] - 80, COAST.bay[0] + 170, pr) * (1 - sstep(COAST.bay[1] - 170, COAST.bay[1] + 80, pr));
/* x of the shoreline on the right of the line; sea lies beyond it. The sea opens in after the route starts and closes before it ends */
function seaEdge(pr){
  let se = 48 + 12 * Math.sin(pr * .0037 + 1) + 6 * Math.sin(pr * .011 + .3);
  se += 190 * Math.exp(-Math.pow((pr - COAST.cape) / 75, 2));                       // the lighthouse cape
  se -= 12 * Math.exp(-Math.pow((pr - COAST.pier) / 160, 2));                       // harbour cove
  se = se + (-600 - se) * bayK(pr);                                                  // the bay: water on both sides of the line
  const open = sstep(0, 320, pr) * (1 - sstep(COAST.END - 320, COAST.END, pr));
  return 760 + (se - 760) * open;
}
const SEA_Y = -.9;
function coastY(x, pr){
  const se = seaEdge(pr);
  let y;
  if (x < se) {
    const d = se - x, amp = (40 + 25 * Math.exp(-Math.pow((pr - COAST.cape - 120) / 260, 2))) * sstep(0, 300, pr) * (1 - sstep(COAST.END - 300, COAST.END, pr));
    y = -1.7 + 2.2 * sstep(0, 24, d);                                                 // beach
    y += amp * sstep(28, 300, d) * (.6 + .4 * coastNoise(x, pr)) + 4 * coastNoise(x * 2.3, pr * 2.3) * sstep(30, 90, d);
  } else y = -1.7 - Math.min(32, (x - se) * .1) - 1.5 * (coastNoise(x * .5, pr * .5) + 1);
  const w = sstep(8, 18, se) * (1 - sstep(9, 22, Math.abs(x + 2.3)));                // flat bed for both tracks while on land
  return y + (0 - y) * w;
}
const BAY_BRIDGE = (() => { let a = null, b = null; for (let pr = COAST.bay[0] - 250; pr <= COAST.bay[1] + 250; pr += 2) { if (seaEdge(pr) < 17) { if (a === null) a = pr; b = pr; } } return { a: a - 16, b: b + 16, mid: (a + b) / 2 }; })();
const SAND = new THREE.Color('#cdb688'), WETSAND = new THREE.Color('#a89470'), GRASS = new THREE.Color('#6a7c3a'), GRASS2 = new THREE.Color('#4c5f2e'), ROCK = new THREE.Color('#8d867a'), SEABED = new THREE.Color('#2f7480'), SHALLOW = new THREE.Color('#c9c29a');
function coastColor(x, y, pr){
  const se = seaEdge(pr), d = se - x;
  if (y < SEA_Y - .2) return COL.copy(SHALLOW).lerp(SEABED, clamp((SEA_Y - y) / 7, 0, 1));
  if (d < 30 && y < 2) return COL.copy(WETSAND).lerp(SAND, clamp((y - SEA_Y) / 1.4, 0, 1));
  const g = (y - coastY(x + 3, pr)) / 3, steep = Math.abs(g) + Math.abs((coastY(x, pr + 3) - y) / 3);
  COL.copy(GRASS).lerp(GRASS2, clamp(.5 + coastNoise(x * 3.1, pr * 3.1) * .6, 0, 1));
  if (steep > .7 || y > 38) COL.lerp(ROCK, clamp((steep - .6) * 1.5 + (y - 38) / 20, 0, .9));
  return COL;
}
/* --- low-poly coastal plants (vertex coloured, same faceted material as the forest) --- */
function palmGeo(seed){
  const r = rng(seed), pos = [], col = [], lean = .12 + r() * .14, segs = 9;
  let px = 0, py = 0;
  for (let i = 0; i < segs; i++) {
    const t = i / segs, nx = Math.pow((i + 1) / segs, 2) * lean, ny = (i + 1) / segs * .86;
    const c = i % 2 ? [.45, .36, .26] : [.55, .44, .31], len = Math.hypot(nx - px, ny - py);
    pushGeo(pos, col, new THREE.CylinderGeometry(.018 - t * .006, .024 - t * .006, len, 6), mat4((px + nx) / 2, (py + ny) / 2, 0, 1, 1, 1, 0, 0, -Math.atan2(nx - px, ny - py)), () => c);
    px = nx; py = ny;
  }
  for (let k = 0; k < 9; k++) {                                     // fronds: long drooping blades
    const a = k / 9 * Math.PI * 2 + r() * .3, droop = .5 + r() * .5, L = .32 + r() * .1, g = [.24 + r() * .06, .42 + r() * .08, .16];
    const ex = Math.cos(a) * L, ez = Math.sin(a) * L;
    const tip = [px + ex, py - droop * .14, ez], mid = [px + ex * .5, py + .05, ez * .5], side = [-Math.sin(a) * .045, 0, Math.cos(a) * .045];
    const tri = (p, q, s, c) => { pos.push(...p, ...q, ...s); col.push(...c, ...c, ...c); };
    const base = [px, py, 0];
    tri(base, [mid[0] + side[0], mid[1], mid[2] + side[2]], mid, shade(g, 1.1)); tri(base, mid, [mid[0] - side[0], mid[1], mid[2] - side[2]], shade(g, .85));
    tri([mid[0] + side[0], mid[1], mid[2] + side[2]], tip, mid, shade(g, 1)); tri(mid, tip, [mid[0] - side[0], mid[1], mid[2] - side[2]], shade(g, .75));
  }
  for (let k = 0; k < 3; k++) pushGeo(pos, col, new THREE.IcosahedronGeometry(.022, 0), mat4(px + Math.cos(k * 2.1) * .03, py - .03, Math.sin(k * 2.1) * .03, 1, 1, 1), () => [.36, .25, .12]);
  return geoFrom(pos, col);
}
function cypressGeo(seed){
  const r = rng(seed), pos = [], col = [];
  pushGeo(pos, col, new THREE.CylinderGeometry(.012, .02, .12, 5), mat4(0, .06, 0, 1, 1, 1), () => [.3, .22, .15]);
  pushGeo(pos, col, new THREE.ConeGeometry(.11, .92, 8, 4), mat4(0, .55, 0, 1, 1, 1), (y, ny) => { const g = [.13 + r() * .03, .25 + r() * .04, .14]; return ny > .2 ? shade(g, 1.15) : shade(g, .8 + r() * .2); });
  return geoFrom(pos, col);
}
function stonePineGeo(seed){
  const r = rng(seed), pos = [], col = [];
  pushGeo(pos, col, new THREE.CylinderGeometry(.018, .03, .72, 6), mat4(.03, .36, 0, 1, 1, 1, 0, 0, -.08), () => [.42, .3, .2]);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * 6.3 + r(), d = i ? .12 + r() * .06 : 0, s = .16 + r() * .05;
    pushGeo(pos, col, new THREE.IcosahedronGeometry(1, 0), mat4(.06 + Math.cos(a) * d, .8 + r() * .05, Math.sin(a) * d, s * 1.3, s * .38, s * 1.3, r(), r(), r()),
      (fy, ny) => ny > .3 ? [.27 + r() * .04, .4, .2] : [.17, .26, .14]);
  }
  return geoFrom(pos, col);
}
const COAST_TREES = { palm: [palmGeo(1), palmGeo(2)], cypress: [cypressGeo(3), cypressGeo(4)], pine: [stonePineGeo(5), stonePineGeo(6)] };
const seaNormal = (() => {                                   // tiling wave normal map
  const S = 256, hgt = new Float32Array(S * S), r = rng(808), waves = Array.from({ length: 9 }, () => [r() * 6.3, 1 + Math.floor(r() * 5), 1 + Math.floor(r() * 5), r() * 6.3, .4 + r()]);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let h = 0; for (const [, kx, ky, ph, a] of waves) h += a * Math.sin((x * kx + y * ky) / S * 6.283 + ph); hgt[y * S + x] = h; }
  return canvasTex(S, S, (c, w, h) => {
    const id = c.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = hgt[y * S + (x + 1) % S] - hgt[y * S + (x - 1 + S) % S], dy = hgt[((y + 1) % S) * S + x] - hgt[((y - 1 + S) % S) * S + x];
      const nx = -dx * .9, ny = -dy * .9, nz = 1, l = Math.hypot(nx, ny, nz), o = (y * S + x) * 4;
      id.data[o] = (nx / l * .5 + .5) * 255; id.data[o + 1] = (ny / l * .5 + .5) * 255; id.data[o + 2] = (nz / l * .5 + .5) * 255; id.data[o + 3] = 255;
    }
    c.putImageData(id, 0, 0);
  });
})();
seaNormal.wrapS = seaNormal.wrapT = THREE.RepeatWrapping;
const seaMat = new THREE.MeshPhongMaterial({ color: 0x1f6f8f, specular: 0xe6f6ff, shininess: 120, normalMap: seaNormal, normalScale: new THREE.Vector2(.55, .55), transparent: true, opacity: .86, depthWrite: false });
/* birds circling (gulls here, eagles over the canyon): two hinged wings each */
function makeBirds(n, col, size, cx, cz, y0, rad, seed){
  const r = rng(seed), grp = new THREE.Group(), wingGeo = new THREE.BufferGeometry(), m = new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide });
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -.25, 0, 0, .3, 1, 0, .05], 3)); wingGeo.computeVertexNormals();
  const birds = [];
  for (let i = 0; i < n; i++) {
    const b = new THREE.Group(), L = new THREE.Mesh(wingGeo, m), R = new THREE.Mesh(wingGeo, m);
    R.scale.x = -1; b.add(L, R); b.scale.setScalar(size * (.8 + r() * .4));
    const body = new THREE.Mesh(unit, m); body.scale.set(.12, .1, .7); b.add(body);
    grp.add(b); birds.push({ b, L, R, a: r() * 6.3, rad: rad * (.5 + r() * .7), y: y0 + r() * 25, sp: (.12 + r() * .1) * (r() < .5 ? 1 : -1), ph: r() * 6, cx: cx + (r() - .5) * rad, cz: cz + (r() - .5) * rad });
  }
  grp.userData.tick = t => {
    for (const q of birds) {
      const a = q.a + t * q.sp; q.b.position.set(q.cx + Math.cos(a) * q.rad, q.y + Math.sin(t * .3 + q.ph) * 3, q.cz + Math.sin(a) * q.rad);
      q.b.rotation.set(0, -a + (q.sp > 0 ? 0 : Math.PI), Math.sin(t * .5 + q.ph) * .25 * Math.sign(q.sp));
      const f = Math.sin(t * 5 + q.ph) * .5 * (Math.sin(t * .7 + q.ph) > .2 ? 1 : .15);   // flap, then glide
      q.L.rotation.z = f; q.R.rotation.z = -f;
    }
  };
  return grp;
}
function buildCoastScenery(){
  const grp = new THREE.Group(), r = rng(5150);
  // terrain: one sheet for the whole route, dense near the line
  const NX = 84, pa = 0, pb = COAST.END, NZ = Math.ceil((pb - pa) / 8), pos = [], cols = [], ids = [];
  for (let iz = 0; iz <= NZ; iz++) {
    const pr = pa + (pb - pa) * iz / NZ;
    for (let ix = 0; ix <= NX; ix++) {
      const t = ix / NX * 2 - 1, x = Math.sign(t) * Math.pow(Math.abs(t), 1.7) * 1400 - 2.3, y = coastY(x, pr);
      pos.push(x, y, -pr); const c = coastColor(x, y, pr); cols.push(c.r, c.g, c.b);
    }
  }
  for (let iz = 0; iz < NZ; iz++) for (let ix = 0; ix < NX; ix++) { const a = iz * (NX + 1) + ix, b = a + 1, c = a + NX + 1, d = c + 1; ids.push(a, b, c, b, d, c); }   // counter-clockwise seen from above
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.setIndex(ids);
  g = g.toNonIndexed(); g.computeVertexNormals();
  grp.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })));
  // the sea
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(4200, COAST.END + 400), seaMat); sea.rotation.x = -Math.PI / 2; sea.position.set(700, SEA_Y, -COAST.END / 2); sea.renderOrder = 1;
  seaNormal.repeat.set(4200 / 34, (COAST.END + 400) / 34); grp.add(sea);
  // surf: a white ribbon along the waterline wherever there is beach
  const fp = [], fi = [];
  for (let pr = 0; pr <= COAST.END; pr += 6) {
    const se = seaEdge(pr); if (se > 700) continue;
    for (const k of [0, 1]) { const x = se + (k ? 5 : -1.5); fp.push(x, SEA_Y + .06, -pr); }
    const n = fp.length / 3; if (n >= 4 && Math.abs(fp[(n - 3) * 3 + 2] - fp[(n - 1) * 3 + 2]) < 7) fi.push(n - 4, n - 2, n - 3, n - 3, n - 2, n - 1);
  }
  // bay shore on the far left side: the same surf ribbon is shared by the sea on both sides
  const foamGeo = new THREE.BufferGeometry(); foamGeo.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); foamGeo.setIndex(fi); foamGeo.computeVertexNormals();
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, depthWrite: false, side: THREE.DoubleSide });
  const foam = new THREE.Mesh(foamGeo, foamMat); foam.renderOrder = 2; grp.add(foam);
  // vegetation and rocks
  const plants = { palm: [], cypress: [], pine: [] }, rocks = [];
  for (let i = 0; i < 2600; i++) {
    const pr = r() * COAST.END, se = seaEdge(pr), d = 8 + Math.pow(r(), 1.5) * 520, x = Math.min(se, 760) - d;
    if (Math.abs(x + 2.3) < 13 || x < -1350) continue;
    const y = coastY(x, pr); if (y < SEA_Y + .4) continue;
    const town = pr > COAST.town[0] && pr < COAST.town[1];
    if (d < 45) { if (r() < (town ? .7 : .35)) plants.palm.push([x, y, -pr, 9 + r() * 6]); }
    else if (y > 30 && r() < .5) rocks.push([x, y, -pr, 2 + r() * 5]);
    else if (r() < .55) plants.cypress.push([x, y, -pr, 8 + r() * 9]);
    else plants.pine.push([x, y, -pr, 9 + r() * 7]);
  }
  for (let i = 0; i < 260; i++) {                                   // boulders on the waterline
    const pr = r() * COAST.END, se = seaEdge(pr); if (se > 700) continue;
    const x = se + (r() - .3) * 14; if (Math.abs(x + 2.3) < 12) continue;
    rocks.push([x, Math.max(coastY(x, pr), SEA_Y - .6), -pr, 1 + r() * 3.5]);
  }
  for (const [kind, list] of Object.entries(plants)) {
    const per = [[], []]; list.forEach(p => per[r() < .5 ? 0 : 1].push(p));
    per.forEach((items, vi) => {
      if (!items.length) return;
      const mesh = new THREE.InstancedMesh(COAST_TREES[kind][vi], treeMat, items.length);
      items.forEach(([x, y, z, h], i) => { D.position.set(x, y - .1, z); D.rotation.set(0, r() * 6.3, 0); D.scale.set(h, h, h); D.updateMatrix(); mesh.setMatrixAt(i, D.matrix); const v = .85 + r() * .3; mesh.setColorAt(i, COL.setRGB(v, v, v)); });
      grp.add(mesh);
    });
  }
  const rk = new THREE.InstancedMesh(rockGeo, M(0x8a8478), rocks.length);
  rocks.forEach(([x, y, z, s], i) => { D.position.set(x, y, z); D.rotation.set(r() * 3, r() * 3, r() * 3); D.scale.set(s * (1 + r()), s * (.6 + r() * .5), s * (1 + r())); D.updateMatrix(); rk.setMatrixAt(i, D.matrix); const v = .75 + r() * .35; rk.setColorAt(i, COL.setRGB(v, v * .97, v * .92)); });
  grp.add(rk);
  addLighthouse(grp);
  addBayBridge(grp, r);
  addTown(grp, r);
  // boats bobbing in the sea
  const boats = [];
  for (let i = 0; i < 16; i++) {
    const pr = 200 + r() * (COAST.END - 400), se = seaEdge(pr), inBay = bayK(pr) > .5;
    const x = inBay ? (r() < .5 ? -60 - r() * 380 : 40 + r() * 500) : se + 60 + r() * 600;
    if (coastY(x, pr) > SEA_Y - 1.5) continue;
    const b = r() < .75 ? sailBoat(r) : motorBoat(r); b.position.set(x, SEA_Y, -pr); b.rotation.y = r() * 6.3; grp.add(b); boats.push({ b, ph: r() * 6 });
  }
  const ship = cargoShip(); ship.position.set(1150, SEA_Y, -1500); ship.rotation.y = .3; grp.add(ship);
  const gulls = makeBirds(14, 0xf4f4f0, 1.4, 80, -900, 18, 160, 61); grp.add(gulls);
  const gulls2 = makeBirds(10, 0xf4f4f0, 1.4, 60, -COAST.pier, 14, 120, 62); grp.add(gulls2);
  grp.userData.tick = (t, dt) => {
    seaNormal.offset.x = t * .012; seaNormal.offset.y = t * .02;
    foamMat.opacity = .42 + .18 * Math.sin(t * 1.3);
    for (const q of boats) { q.b.position.y = SEA_Y + Math.sin(t * 1.1 + q.ph) * .25; q.b.rotation.z = Math.sin(t * .9 + q.ph) * .06; q.b.rotation.x = Math.sin(t * .7 + q.ph * 2) * .04; }
    gulls.userData.tick(t); gulls2.userData.tick(t);
    lhBeam.rotation.y = t * .9;
  };
  return grp;
}
function sailBoat(r){
  const g = new THREE.Group(), hullCol = r() < .5 ? 0xf2f2ee : 0x1d3c63;
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.2, .5, 1.2, 6, 1), M(hullCol)); hull.scale.set(1, 1, 4); hull.rotation.y = Math.PI / 6; hull.position.y = .2; g.add(hull);
  const deck = new THREE.Mesh(unit, M(0xc9a77a)); deck.position.y = .82; deck.scale.set(1.8, .06, 7.5); g.add(deck);
  const mast = new THREE.Mesh(unit, M(0xdedad2)); mast.position.set(0, 6, -.6); mast.scale.set(.14, 11, .14); g.add(mast);
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0, 9.8); s.lineTo(3.6, 0); s.closePath();
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshLambertMaterial({ color: 0xfbfaf4, side: THREE.DoubleSide }));
  sail.rotation.y = -Math.PI / 2 + .25; sail.position.set(0, 1.2, -.5); g.add(sail);
  const jib = new THREE.Mesh(new THREE.ShapeGeometry(s), sail.material); jib.rotation.y = -Math.PI / 2 - .2; jib.scale.set(.6, .82, 1); jib.position.set(0, 1.2, -3.4); g.add(jib);
  return g;
}
function motorBoat(r){
  const g = new THREE.Group();
  const hull = new THREE.Mesh(unit, M(0xf4f2ec)); hull.position.y = .5; hull.scale.set(2.6, 1.4, 8); g.add(hull);
  const stripe = new THREE.Mesh(unit, M(r() < .5 ? 0xc4122f : 0x1d6fb8)); stripe.position.y = .55; stripe.scale.set(2.65, .3, 8.05); g.add(stripe);
  const cabin = new THREE.Mesh(unit, M(0xe8e6df)); cabin.position.set(0, 1.7, 1); cabin.scale.set(2.1, 1.2, 3.4); g.add(cabin);
  const win = new THREE.Mesh(unit, M(0x1d2a33)); win.position.set(0, 1.85, -.75); win.scale.set(2, .6, .1); g.add(win);
  return g;
}
function cargoShip(){
  const g = new THREE.Group();
  const hull = new THREE.Mesh(unit, M(0x7a2a22)); hull.position.y = 2; hull.scale.set(26, 9, 180); g.add(hull);
  const top = new THREE.Mesh(unit, M(0x23272c)); top.position.y = 6.8; top.scale.set(26.2, 1.6, 180.5); g.add(top);
  const cols = [0xc4122f, 0x1d6fb8, 0xe0a030, 0x2f8f5a, 0x8a8f96, 0xd8d4c8], r = rng(9);
  for (let z = -70; z < 60; z += 13) for (let x = -9; x <= 9; x += 6) { const h = 1 + Math.floor(r() * 3); for (let k = 0; k < h; k++) { const c = new THREE.Mesh(unit, M(cols[Math.floor(r() * cols.length)])); c.position.set(x, 9 + k * 2.7, z); c.scale.set(5.6, 2.6, 12.4); g.add(c); } }
  const bridge = new THREE.Mesh(unit, M(0xf0eee8)); bridge.position.set(0, 15, 78); bridge.scale.set(22, 14, 12); g.add(bridge);
  const stack = new THREE.Mesh(unit, M(0xc4122f)); stack.position.set(0, 25, 82); stack.scale.set(4, 8, 4); g.add(stack);
  return g;
}
let lhBeam = new THREE.Group();
function addLighthouse(grp){
  const pr = COAST.cape, x = seaEdge(pr) - 34, y = coastY(x, pr), z = -pr, g = new THREE.Group(); g.position.set(x, y, z); grp.add(g);
  const H = 30, N = 6;
  for (let i = 0; i < N; i++) {
    const r0 = 3.4 - i / N * 1.2, r1 = 3.4 - (i + 1) / N * 1.2, seg = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, H / N, 16), M(i % 2 ? 0xc4122f : 0xf4f2ec));
    seg.position.y = H / N * (i + .5); g.add(seg);
  }
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.8, 6, 16), M(0xb9ad98)); plinth.position.y = -2.6; g.add(plinth);
  const gal = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, .4, 16), M(0x2a2f35)); gal.position.y = H + .2; g.add(gal);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3, 12), new THREE.MeshBasicMaterial({ color: 0xfff1b8 })); lamp.position.y = H + 1.9; g.add(lamp);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.4, 12), M(0xc4122f)); cap.position.y = H + 4.6; g.add(cap);
  const glow = new THREE.Sprite(glowMat.clone()); glow.material.color.set(0xfff1b8); glow.scale.set(16, 16, 1); glow.position.y = H + 1.9; g.add(glow);
  // rotating light beams
  lhBeam = new THREE.Group(); lhBeam.position.y = H + 1.9; g.add(lhBeam);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff4c8, transparent: true, opacity: .055, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (const s of [1, -1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(6, 150, 16, 1, true), beamMat); c.rotation.z = s * Math.PI / 2; c.position.x = s * 75; lhBeam.add(c); }
  const house = new THREE.Mesh(boxGeo, M(0xf1ede2)); house.position.set(-9, -3, 6); house.scale.set(8, 7.5, 10); g.add(house);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0, 6.6, 2.6, 4, 1), M(0xb5562e)); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 1.25); roof.position.set(-9, 5.8, 6); g.add(roof);
}
function addBayBridge(grp, r){
  const { a, b, mid } = BAY_BRIDGE, len = b - a, zc = -(a + b) / 2, X = -2.3;
  const conc = M(0xd9d5cc), dark = M(0x8f8b84), steel = M(0x55606b), white = M(0xf2f1ec), deckM = M(0x8e8a83);
  const deck = new THREE.Mesh(unit, deckM); deck.position.set(X, -1.3, zc); deck.scale.set(14, 2.6, len); grp.add(deck);
  const edge = new THREE.Mesh(unit, white); edge.position.set(X, -.6, zc); edge.scale.set(14.4, .6, len); grp.add(edge);
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(unit, steel); rail.position.set(X + s * 6.9, 1.1, zc); rail.scale.set(.1, .1, len); grp.add(rail);
    const n = Math.floor(len / 2.5), posts = new THREE.InstancedMesh(unit, steel, n);
    for (let i = 0; i < n; i++) { D.rotation.set(0, 0, 0); D.position.set(X + s * 6.9, .55, -a - 1.25 - i * 2.5); D.scale.set(.07, 1.1, .07); D.updateMatrix(); posts.setMatrixAt(i, D.matrix); }
    grp.add(posts);
    for (let pr = a + 18; pr < b - 10; pr += 36) {                              // lamp posts with warm glow
      if (Math.abs(pr - mid) < 14) continue;
      const lp = new THREE.Mesh(unit, steel); lp.position.set(X + s * 7.2, 3.6, -pr); lp.scale.set(.16, 7.2, .16); grp.add(lp);
      const arm = new THREE.Mesh(unit, steel); arm.position.set(X + s * 6.4, 7.1, -pr); arm.scale.set(1.6, .12, .12); grp.add(arm);
      const gl = new THREE.Sprite(glowMat); gl.position.set(X + s * 5.7, 6.9, -pr); gl.scale.set(2.2, 2.2, 1); grp.add(gl);
    }
  }
  // piers down to the seabed
  for (let pr = a + 25; pr < b - 10; pr += 50) {
    if (Math.abs(pr - mid) < 30) continue;
    const base = Math.min(coastY(X - 4, pr), coastY(X + 4, pr)), top = -2.6, hgt = top - base; if (hgt < 1) continue;
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, hgt, 10), dark); p.position.set(X + s * 4, base + hgt / 2, -pr); grp.add(p); }
    const cap = new THREE.Mesh(unit, conc); cap.position.set(X, -3.2, -pr); cap.scale.set(13, 1.4, 3.6); grp.add(cap);
  }
  // cable-stayed main span: an A-shaped pylon with fans of stays
  const PY = 82, legX = 9.5, base = Math.min(coastY(X - legX, mid), coastY(X + legX, mid));
  for (const s of [-1, 1]) {
    beamIn(grp, [X + s * legX, base, -mid], [X + s * 1.6, PY, -mid], 2.6, conc);
    beamIn(grp, [X + s * 1.6, PY, -mid], [X + s * 1.2, PY + 6, -mid], 2.2, conc);
  }
  beamIn(grp, [X - legX * .95, -3.5, -mid], [X + legX * .95, -3.5, -mid], 2.4, conc);
  beamIn(grp, [X - 3.6, PY - 22, -mid], [X + 3.6, PY - 22, -mid], 1.6, conc);
  const top = new THREE.Mesh(unit, M(0xc4122f)); top.position.set(X, PY + 6.5, -mid); top.scale.set(3.6, 1.2, 3); grp.add(top);
  const tip = new THREE.Sprite(glowMat.clone()); tip.material.color.set(0xff3a2a); tip.position.set(X, PY + 7.6, -mid); tip.scale.set(4, 4, 1); grp.add(tip);
  for (const s of [-1, 1]) for (const dir of [-1, 1]) for (let k = 1; k <= 12; k++) {
    const dz = dir * (k * 15 + 8), yTop = PY - 3 - k * 1.6;
    beamIn(grp, [X + s * 1.3, yTop, -mid], [X + s * 6.6, .4, -mid - dz], .13, white);
  }
  // abutments where the bridge meets land
  for (const pr of [a, b]) { const ab = new THREE.Mesh(unit, dark); ab.position.set(X, -4, -pr); ab.scale.set(15, 8, 10); grp.add(ab); }
}
function addTown(grp, r){
  const wallCols = [0xf4f1e8, 0xf0e2c8, 0xe9d3b4, 0xf5ece0, 0xdfe8ea], roofMat = M(0xb8572f), roofMat2 = M(0xa04a2a), winMat = M(0x2a3138), doorMat = M(0x5b3b28);
  for (let i = 0; i < 150; i++) {
    const pr = COAST.town[0] + r() * (COAST.town[1] - COAST.town[0]), se = seaEdge(pr), d = 34 + Math.pow(r(), 1.3) * 230, x = se - d;
    if (Math.abs(x + 2.3) < 18) continue;
    const y = coastY(x, pr); if (y < .5) continue;
    const w = 6 + r() * 6, dp = 6 + r() * 6, h = 4 + Math.floor(r() * 3) * 3, z = -pr, rot = (r() - .5) * .3;
    // sit on the slope: walls go down to the lowest corner (a plinth), the floor is level with the highest one
    const ys = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]].map(([a, b]) => coastY(x + a * dp * .55, pr - b * w * .55)), lo = Math.min(...ys) - .6, fl = Math.max(...ys) - lo;
    const g = new THREE.Group(); g.position.set(x, lo, z); g.rotation.y = rot; grp.add(g);
    const plinth = new THREE.Mesh(boxGeo, M(0xb9ad98)); plinth.scale.set(dp + .3, fl + .2, w + .3); g.add(plinth);
    const inner = new THREE.Group(); inner.position.y = fl; g.add(inner);
    const body = new THREE.Mesh(boxGeo, M(wallCols[Math.floor(r() * wallCols.length)])); body.scale.set(dp, h + .2, w); inner.add(body);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0, Math.max(w, dp) * .72, 2.4, 4, 1), r() < .5 ? roofMat : roofMat2);
    roof.rotation.y = Math.PI / 4; roof.scale.set(dp / Math.max(w, dp), 1, w / Math.max(w, dp)); roof.position.y = h + 1.4; inner.add(roof);
    const face = dp / 2 + .05;
    for (let fy = 2.2; fy < h; fy += 3) for (let fz = -w / 2 + 1.4; fz < w / 2 - 1; fz += 2.4) { const wn = new THREE.Mesh(unit, winMat); wn.position.set(face, fy - .6, fz); wn.scale.set(.1, 1.3, .9); inner.add(wn); }
    const dr = new THREE.Mesh(unit, doorMat); dr.position.set(face, 1.1, 0); dr.scale.set(.1, 2, 1.1); inner.add(dr);
  }
  // church with a bell tower and dome on the hill
  { const pr = COAST.town[0] + 380, x = seaEdge(pr) - 150, y = coastY(x, pr), g = new THREE.Group(); g.position.set(x, y - 4, -pr); grp.add(g);
    const nave = new THREE.Mesh(boxGeo, M(0xf6f2ea)); nave.scale.set(16, 14, 28); g.add(nave);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0x3d7bd6)); dome.position.y = 14; g.add(dome);
    const tower = new THREE.Mesh(boxGeo, M(0xf6f2ea)); tower.position.set(0, 0, 18); tower.scale.set(6, 28, 6); g.add(tower);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(4, 7, 4), M(0xb8572f)); spire.rotation.y = Math.PI / 4; spire.position.set(0, 31.5, 18); g.add(spire); }
  // harbour pier with moored boats
  { const pr = COAST.pier, se = seaEdge(pr), L = 110, deck = new THREE.Mesh(unit, M(0x9a8f80)); deck.position.set(se + L / 2 - 6, .2, -pr); deck.scale.set(L, 1.2, 9); grp.add(deck);
    const n = Math.floor(L / 8), posts = new THREE.InstancedMesh(unit, M(0x6b5a48), n * 2);
    for (let i = 0; i < n; i++) for (const s of [-1, 1]) { D.rotation.set(0, 0, 0); D.position.set(se - 2 + i * 8, -2, -pr + s * 4.3); D.scale.set(.6, 5, .6); D.updateMatrix(); posts.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), D.matrix); }
    grp.add(posts);
    for (let i = 0; i < 6; i++) { const b = i % 2 ? sailBoat(r) : motorBoat(r); b.position.set(se + 20 + i * 14, SEA_Y, -pr + (i % 2 ? 11 : -11)); b.rotation.y = Math.PI / 2 + (r() - .5) * .2; grp.add(b); }
    const lt = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 7, 10), M(0x2f8f5a)); lt.position.set(se + L - 4, 3.6, -pr); grp.add(lt); }
}
function coastTile(idx){
  const grp = new THREE.Group();
  addTrack(grp, 0);
  for (let k = 0; k < 4 * KT; k++) { const pr = idx * TILE + 30 + k * 60, se = seaEdge(pr); if (se > 16) addBox(grp, null, 2.5, 0, -(30 + k * 60), .18, 1.1, .18, 0xcccbc2); }
  if (idx === 5) addJunction(grp);
  return grp;
}
