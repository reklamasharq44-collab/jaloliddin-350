/* ================= ROUTE 1 · forest ================= */
const BRIDGE = { z0: -84, z1: -156, r0: -95, r1: -145 };
function forestTile(idx){
  const seed = 101 + idx * 101, r = rng(seed), grp = new THREE.Group();
  const BR = idx === 3 ? BRIDGE : null;
  const inRiver = (z, m = 12) => !!BR && z < BR.z0 + m && z > BR.z1 - m;
  addTrack(grp, 0); addGround(grp);
  // rusty side track with dead ends at the route's ends
  const sz0 = idx === 0 ? -8 : 0, sz1 = idx === 5 ? -TILE + 14 : -TILE;
  addTrack(grp, -10, true, sz0, sz0 - sz1);
  if (idx === 0) bufferStop(grp, -10, -7.5); if (idx === 5) bufferStop(grp, -10, -TILE + 13.5);
  const trees = [];
  for (const side of [-1, 1]) for (let i = 0; i < 270 * KT; i++) {
    const z = -r() * TILE;
    if (Math.sin(z * .018 + seed * 1.7 + side) > .82 && r() < .8) continue;
    if (inRiver(z)) continue;
    const min = side < 0 ? leftMin(idx, z, 13) : rightMin(idx, z, 6.5);
    const x = side * (min + Math.pow(r(), 1.5) * 85);
    const pine = r() < .62, rr = r();
    trees.push({ x, z, kind: pine ? 'pine' : 'birch', h: pine ? 9 + rr * 12 + (Math.abs(x) > 30 ? 4 : 0) : 7 + rr * 8 });
  }
  plantTrees(grp, r, trees);
  // telegraph poles + wires
  const PX = -7.5, PH = 8, pz = Array.from({ length: TILE / 40 }, (_, j) => -20 - j * 40).filter(z => !inRiver(z, 4));
  const poles = new THREE.InstancedMesh(poleGeo, matWood, pz.length), bars = new THREE.InstancedMesh(boxGeo, matWood, pz.length), wirePts = [];
  pz.forEach((z, j) => {
    const tilt = (r() - .5) * .08;
    D.position.set(PX, 0, z); D.rotation.set(0, 0, tilt); D.scale.set(1, PH, 1); D.updateMatrix(); poles.setMatrixAt(j, D.matrix);
    D.position.set(PX + Math.sin(-tilt) * PH * .93, PH * .93, z); D.rotation.set(0, 0, tilt); D.scale.set(1.8, .12, .12); D.updateMatrix(); bars.setMatrixAt(j, D.matrix);
  });
  pz.forEach((z0, j) => {
    const z1 = j < pz.length - 1 ? pz[j + 1] : -TILE - 20;
    for (const wx of [-.75, 0, .75]) {
      const y0 = PH * .93 + .1 + (wx === 0 ? .25 : 0), sag = (1.1 + r() * .3) * (z0 - z1) / 40;
      for (let s = 0; s < 12; s++) { const a = s / 12, b = (s + 1) / 12; wirePts.push(PX + wx, y0 - sag * 4 * a * (1 - a), z0 + (z1 - z0) * a, PX + wx, y0 - sag * 4 * b * (1 - b), z0 + (z1 - z0) * b); }
    }
  });
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wirePts, 3));
  grp.add(poles, bars, new THREE.LineSegments(wg, wireMat));
  if (!BR && idx !== 0 && idx !== 5 && r() < .8) addWagons(grp, r, -10, -20 - r() * 150, 1 + Math.floor(r() * 4));
  // ruined concrete buildings
  const houses = [];
  const nh = r() < .7 ? 1 + Math.floor(r() * 2) : 0;
  for (let k = 0; k < nh; k++) houses.push({ x: (r() < .75 ? 1 : -1) * (19 + r() * 25), z: -20 - r() * 200, w: 7 + r() * 8, h: 4 + r() * 8, dpt: 8 + r() * 10 });
  houses.filter(hh => !inRiver(hh.z, hh.w / 2 + 8)).forEach(hh => {
    const v = .36 + r() * .1; const m = addBox(grp, null, hh.x, 0, hh.z, hh.dpt, hh.h, hh.w, 0xffffff); m.material.color.setRGB(v, v * .97, v * .92);
    const face = hh.x > 0 ? hh.x - hh.dpt / 2 - .05 : hh.x + hh.dpt / 2 + .05;
    for (let fy = 1.4; fy < hh.h - 1; fy += 3) for (let fz = -hh.w / 2 + 1.5; fz < hh.w / 2 - 1; fz += 2.6) if (r() < .85) addBox(grp, matHole, face, fy, hh.z + fz, .12, 1.4, 1.1);
  });
  for (let k = 0; k < 4 * KT; k++) { const z = -30 - k * 60; if (!inRiver(z, 4)) addBox(grp, null, 2.5, 0, z, .18, 1.1, .18, 0xcccbc2); }
  if (BR) addBridge(grp, BR);
  if (idx === 5) addJunction(grp);
  return grp;
}
function addBridge(grp, BR){
  const H = 7.5, N = 9, XS = [-12.6, 2.8], z0 = BR.z0, z1 = BR.z1, pl = (z0 - z1) / N, Y0 = .35;
  const Z = i => z0 - i * pl, b = (a, c, t) => beamIn(grp, a, c, t, matSteel);
  for (const x of XS) {
    b([x, Y0, z0], [x, Y0, z1], .55); b([x, H, Z(1)], [x, H, Z(N - 1)], .6);
    b([x, Y0, z0], [x, H, Z(1)], .6); b([x, Y0, z1], [x, H, Z(N - 1)], .6);
    for (let i = 1; i < N; i++) b([x, Y0, Z(i)], [x, H, Z(i)], .32);
    for (let i = 1; i < N - 1; i++) { const c = i < N / 2; b([x, H, Z(c ? i : i + 1)], [x, Y0, Z(c ? i + 1 : i)], .26); }
    b([x, 1.2, z0], [x, 1.2, z1], .12);
  }
  for (let i = 1; i < N; i++) b([XS[0], H, Z(i)], [XS[1], H, Z(i)], .3);
  for (let i = 1; i < N - 1; i++) { b([XS[0], H, Z(i)], [XS[1], H, Z(i + 1)], .14); b([XS[1], H, Z(i)], [XS[0], H, Z(i + 1)], .14); }
  for (let i = 0; i <= N; i++) b([XS[0], .1, Z(i)], [XS[1], .1, Z(i)], .35);
  for (const zz of [Z(1), Z(N - 1)]) { b([XS[0], H - 1.8, zz], [XS[0] + 2.2, H, zz], .25); b([XS[1], H - 1.8, zz], [XS[1] - 2.2, H, zz], .25); }
  const deck = new THREE.Mesh(unit, M(0x2b2824)); deck.position.set((XS[0] + XS[1]) / 2, .07, (z0 + z1) / 2); deck.scale.set(XS[1] - XS[0], .12, z0 - z1); grp.add(deck);
  for (const [zz, dz] of [[z0 + 2, 6], [z1 - 2, 6], [(z0 + z1) / 2, 3.5]]) { const p = new THREE.Mesh(unit, M(0x8a867d)); p.position.set((XS[0] + XS[1]) / 2, -.6, zz); p.scale.set(XS[1] - XS[0] + 3, 1.3, dz); grp.add(p); }
  const rw = BR.r0 - BR.r1, rz = (BR.r0 + BR.r1) / 2;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1800, rw), new THREE.MeshPhongMaterial({ color: 0x55717c, specular: 0xb8c8d0, shininess: 70 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, .065, rz); grp.add(water);
  for (const zz of [BR.r0 + 2.5, BR.r1 - 2.5]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1800, 5), M(0x4a4234)); m.rotation.x = -Math.PI / 2; m.position.set(0, .055, zz); grp.add(m); }
}
