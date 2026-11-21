/* ================= ROUTE 3 · abandoned station & town ================= */
const signTex = canvasTex(512, 112, (x, w, h) => {
  x.fillStyle = '#1f4f8a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#e9edf2'; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16);
  x.fillStyle = '#f2f4f7'; x.font = '700 62px "Trebuchet MS", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ЗАРЕЧНАЯ', w / 2, h / 2 + 3);
});
function block(grp, r, x, z, len, floors){                // Soviet 5-storey panel block, long side along the track
  const side = Math.sign(x), dep = 12, h = floors * 3;
  const tones = [[.62, .6, .55], [.7, .66, .58], [.55, .57, .58], [.66, .6, .52], [.6, .63, .6]];
  const m = addBox(grp, null, x, 0, z, dep, h, len, 0xffffff); m.material.color.setRGB(...tones[Math.floor(r() * tones.length)]);
  addBox(grp, null, x, h, z, dep + .3, .5, len + .3, 0x3d3a36);
  const face = x - side * (dep / 2 + .04), cols = Math.floor((len - 2) / 3.2), n = cols * floors;
  const win = new THREE.InstancedMesh(unit, matWhite, n);
  let i = 0;
  for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++, i++) {
    D.rotation.set(0, 0, 0); D.position.set(face, 1.7 + f * 3, z + len / 2 - 2.2 - c * 3.2); D.scale.set(.1, 1.45, 1.6); D.updateMatrix(); win.setMatrixAt(i, D.matrix);
    const k = r(); if (k < .35) COL.setRGB(.07, .07, .07); else if (k < .8) COL.setRGB(.24, .29, .32); else COL.setRGB(.42, .46, .5);
    win.setColorAt(i, COL);
  }
  grp.add(win);
  for (let c = 0; c < Math.floor(len / 14); c++) addBox(grp, null, face - side * .1, 0, z + len / 2 - 7 - c * 14, .4, 2.6, 1.6, 0x2c2a27); // entrances
}
function cityTile(idx){
  const r = rng(909 + idx * 53), grp = new THREE.Group();
  addTrack(grp, 0); addGround(grp);
  if (idx >= 1 && idx <= 4) {
    const z0 = idx === 1 ? -10 : 0, z1 = idx === 4 ? -TILE + 20 : -TILE;
    addTrack(grp, -10, true, z0, z0 - z1);
    if (idx === 1) bufferStop(grp, -10, -9.5); if (idx === 4) bufferStop(grp, -10, -TILE + 19.5);
  }
  if (idx === 2 || idx === 3) addTrack(grp, -15, true);
  // blocks of flats
  const nBlocks = [3, 7, 4, 5, 6, 2][idx] * KT;
  for (let k = 0; k < nBlocks; k++) {
    const side = idx === 2 ? -1 : (r() < .5 ? -1 : 1), len = 30 + r() * 30, z = -len / 2 - 10 - r() * (TILE - len - 20);
    const x = side * ((side < 0 ? (idx === 2 ? 48 : 30) : 26) + r() * 40), floors = r() < .6 ? 5 : 9;
    block(grp, r, x, z, len, floors);
  }
  // trees in courtyards / outskirts
  const trees = [], nT = [180, 50, 20, 30, 90, 200][idx] * KT;
  for (let i = 0; i < nT; i++) {
    const z = -r() * TILE, side = r() < .5 ? -1 : 1, base = idx >= 1 && idx <= 4 && side < 0 ? (idx === 3 ? 26 : 21.5) : (idx === 3 ? 12 : side < 0 ? 12 : 8);
    const min = side < 0 ? leftMin(idx, z, base) : rightMin(idx, z, idx === 2 ? 34 : base);
    const x = side * (min + Math.pow(r(), 1.3) * 90), birch = r() < .55;
    trees.push({ x, z, kind: birch ? 'birch' : 'pine', h: birch ? 6 + r() * 8 : 8 + r() * 10 });
  }
  plantTrees(grp, r, trees);
  // concrete fence (left, behind the sidings)
  if (idx === 1 || idx === 4) {
    const n = Math.floor(TILE / 3.3), f = new THREE.InstancedMesh(boxGeo, M(0x9a958b), n);
    for (let i = 0; i < n; i++) { D.rotation.set(0, 0, (r() - .5) * .06); D.position.set(-19.5, 0, -2 - i * 3.3); D.scale.set(.2, 2.3, 3.1); D.updateMatrix(); f.setMatrixAt(i, D.matrix); }
    grp.add(f);
  }
  if (idx === 2) {          // the station
    const plat = addBox(grp, null, 5.7, 0, -120, 6.2, 1.05, 180, 0x8d8981);
    addBox(grp, null, 2.75, 1.05, -120, .35, .03, 180, 0xe9e4d6);
    for (let z = -40; z >= -200; z -= 12) addBox(grp, null, 6.6, 1.05, z, .3, 3.3, .3, 0x3a5a4a);
    addBox(grp, null, 5.9, 4.35, -120, 7, .3, 168, 0x4c5a52);
    for (const z of [-36, -120, -204]) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1), new THREE.MeshBasicMaterial({ map: signTex })); s.position.set(5.6, 3.55, z); grp.add(s);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1), new THREE.MeshBasicMaterial({ map: signTex })); back.rotation.y = Math.PI; back.position.set(5.6, 3.55, z - .03); grp.add(back);
      for (const dx of [-2, 2]) addBox(grp, null, 5.6 + dx, 4.05, z, .05, .3, .05, 0x222222);
    }
    for (let z = -30; z >= -210; z -= 30) { addBox(grp, null, 8.3, 1.05, z, .14, 4.6, .14, 0x2b2a27); addBox(grp, null, 7.8, 5.6, z, 1.1, .14, .3, 0x2b2a27); }
    // station building
    addBox(grp, null, 22, 0, -120, 13, 10, 64, 0xc9b48f);
    addBox(grp, null, 22, 10, -120, 14, .7, 65, 0x6b4c3a);
    addBox(grp, null, 22, 10.7, -120, 8, 6, 10, 0xc9b48f);
    addBox(grp, null, 22, 16.7, -120, 9, .6, 11, 0x6b4c3a);
    const clock = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), M(0xece6d6)); clock.rotation.y = -Math.PI / 2; clock.position.set(17.9, 13.6, -120); grp.add(clock);
    for (let z = -94; z >= -146; z -= 6.5) addBox(grp, matHole, 15.45, 2, z, .1, 5.5, 3, 0);
    // water tower + wagons on the sidings
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) addBox(grp, null, -32 + dx, 0, -60 + dz, .5, 12, .5, 0x4a3f36);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 6, 14), M(0x6a5446)); tank.position.set(-32, 15, -60); grp.add(tank);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(4.4, 2.4, 14), M(0x3d3a36)); cap.position.set(-32, 19.2, -60); grp.add(cap);
    addWagons(grp, r, -15, -30, 4);
  }
  if (idx === 3) {          // depot: the train drives straight through the hangar
    buildHangar(grp, { zA: -30, zB: -210, xL: -21.5, xR: 7, tracks: [0, -4.6, -10, -15], doors: [[-2.3, 5.7], [-12.5, 3.4]], parked: [{ x: -15, z: -150, cars: 2 }] });
    for (const [x, z] of [[-36, -60], [-44, -60], [-36, -72]]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 9, 16), M(0x9fa09a)); t.position.set(x, 4.5, z); grp.add(t); }
  }
  if (idx === 4) {          // garages
    for (let k = 0; k < 14; k++) { const z = -60 - k * 4.2; addBox(grp, null, 16, 0, z, 6, 2.6, 4, 0x7d776c); addBox(grp, null, 12.95, .2, z, .08, 2.1, 3, 0x5a3b2c); }
    addWagons(grp, r, -10, -40, 2);
  }
  // street lamps along the track in town
  if (idx >= 1 && idx <= 4 && idx !== 3) for (let z = -15; z > -TILE; z -= 45) { addBox(grp, null, -7.5, 0, z, .14, 7, .14, 0x2b2a27); addBox(grp, null, -6.7, 7, z, 1.7, .12, .25, 0x2b2a27);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.26, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffdf9f })); bulb.position.set(-5.9, 6.88, z); grp.add(bulb); }   // glowing lamp head — reads as a street light at night
  if (idx === 5) addJunction(grp);
  return grp;
}
