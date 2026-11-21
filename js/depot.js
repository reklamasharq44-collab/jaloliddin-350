/* ================= DEPOT · maintenance hangar ================= */
const depotSignTex = canvasTex(1024, 160, (x, w, h) => {
  x.fillStyle = '#0f1820'; x.fillRect(0, 0, w, h);
  x.strokeStyle = '#4fd2ff'; x.lineWidth = 6; x.strokeRect(10, 10, w - 20, h - 20);
  x.fillStyle = '#e8f2f8'; x.textAlign = 'center'; x.textBaseline = 'middle';
  let fs = 84; do { x.font = `800 ${fs}px "Segoe UI", Arial, sans-serif`; fs -= 4; } while (x.measureText('ДЕПО «' + TRAIN_NAME + '»').width > w - 80);
  x.fillText('ДЕПО «' + TRAIN_NAME + '»', w / 2, h / 2 + 4);
});
const exitSignTex = canvasTex(512, 128, (x, w, h) => {
  x.fillStyle = '#0d3a1f'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#7dffae'; x.font = '700 58px "Segoe UI", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('ВЫЕЗД ▲', w / 2, h / 2 + 3);
});
const metalTex = canvasTex(256, 256, (x, w, h) => {      // corrugated wall cladding
  for (let i = 0; i < w; i += 8) { const g = x.createLinearGradient(i, 0, i + 8, 0); g.addColorStop(0, '#6b767c'); g.addColorStop(.5, '#88939a'); g.addColorStop(1, '#5d676d'); x.fillStyle = g; x.fillRect(i, 0, 8, h); }
  const r = rng(5); for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(60,45,35,${r() * .12})`; x.fillRect(r() * w, r() * h, 2 + r() * 6, 4 + r() * 20); }
});
metalTex.wrapS = metalTex.wrapT = THREE.RepeatWrapping;
const hazardTex = canvasTex(128, 32, (x, w, h) => { x.fillStyle = '#f2c230'; x.fillRect(0, 0, w, h); x.fillStyle = '#1a1a1a'; for (let i = -32; i < w; i += 32) { x.beginPath(); x.moveTo(i, h); x.lineTo(i + 16, 0); x.lineTo(i + 32, 0); x.lineTo(i + 16, h); x.fill(); } });
hazardTex.wrapS = THREE.RepeatWrapping;

/* drive-through hangar between local z = zA (entry) and zB (exit), walls at xL/xR; doors cut for the given tracks */
const hangarLampMat = new THREE.MeshBasicMaterial({ color: 0xfff6e0 });
function buildHangar(grp, { zA, zB, xL, xR, tracks, doors, parked = [], backDoors = true, startInside = false }){
  doors = doors || tracks;
  const W = xR - xL, xc = (xL + xR) / 2, L = zA - zB, zc = (zA + zB) / 2, Hw = 12, rise = 6.5;
  const conc = M(0x8b8882), steel = M(0x3b4147), yellow = M(0xd9a91f);
  // floor + pits + walkways + safety lines
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W - .6, L), M(0x6d6c69)); floor.rotation.x = -Math.PI / 2; floor.position.set(xc, .03, zc); grp.add(floor);
  for (const tx of tracks) {
    addBox(grp, null, tx, .045, zc, 1.3, .006, L - 4, 0x16171a);                                     // inspection pit
    for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(.14, L - 2), new THREE.MeshBasicMaterial({ color: 0xd8b02a })); l.rotation.x = -Math.PI / 2; l.position.set(tx + s * 2.35, .05, zc); grp.add(l); }
  }
  const sorted = [...tracks].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length - 1; i++) { const wx = (sorted[i] + sorted[i + 1]) / 2; if (sorted[i + 1] - sorted[i] > 6.5) { addBox(grp, null, wx, 0, zc, 1.6, .9, L - 10, 0x7f8287); addBox(grp, null, wx, .9, zc, 1.62, .04, L - 10, 0xd8b02a); } }
  // walls: concrete plinth + corrugated cladding + daylight band
  const cladMat = new THREE.MeshStandardMaterial({ map: metalTex, roughness: .8, metalness: .2, side: THREE.DoubleSide });
  for (const x of [xL, xR]) {
    addBox(grp, conc, x, 0, zc, .6, 3, L);
    const clad = new THREE.Mesh(new THREE.PlaneGeometry(L, Hw - 3), cladMat); clad.rotation.y = Math.PI / 2; clad.position.set(x, 3 + (Hw - 3) / 2, zc);
    clad.material = cladMat.clone(); clad.material.map = metalTex.clone(); clad.material.map.needsUpdate = true; clad.material.map.repeat.set(L / 10, 1); grp.add(clad);
    const band = new THREE.Mesh(new THREE.PlaneGeometry(L - 4, 1.6), new THREE.MeshBasicMaterial({ color: 0xcfe0e8, side: THREE.DoubleSide })); band.rotation.y = Math.PI / 2; band.position.set(x + (x < xc ? .32 : -.32), 8.6, zc); grp.add(band);
  }
  // arched roof (both sides visible) with skylight strips
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(W / 2, W / 2, L, 28, 1, true, Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: 0x5a6268, roughness: .7, metalness: .3, side: THREE.DoubleSide }));
  roof.rotation.x = Math.PI / 2; roof.rotation.y = 0; roof.position.set(xc, Hw, zc); roof.scale.set(1, 1, rise / (W / 2)); grp.add(roof);
  for (const s of [-1, 1]) { const sk = new THREE.Mesh(new THREE.PlaneGeometry(1.4, L - 6), new THREE.MeshBasicMaterial({ color: 0xdfeaf0, side: THREE.DoubleSide })); sk.rotation.x = -Math.PI / 2; sk.position.set(xc + s * W * .22, Hw + rise * Math.sqrt(1 - .44 * .44) - .25, zc); grp.add(sk); }
  // end facades with doors
  const archY = x => Hw + rise * Math.sqrt(Math.max(0, 1 - Math.pow((x - xc) / (W / 2), 2)));
  const facade = (z, doors, out) => {
    const sh = new THREE.Shape(); sh.moveTo(xL, 0);
    for (let i = 0; i <= 24; i++) { const x = xL + W * i / 24; sh.lineTo(x, archY(x)); }
    sh.lineTo(xR, 0); sh.lineTo(xL, 0);
    for (const dd of doors) { const dx = Array.isArray(dd) ? dd[0] : dd, hw = Array.isArray(dd) ? dd[1] : 3.3; const p = new THREE.Path(); p.moveTo(dx - hw, 0); p.lineTo(dx + hw, 0); p.lineTo(dx + hw, 7.4); p.lineTo(dx - hw, 7.4); p.lineTo(dx - hw, 0); sh.holes.push(p); }
    const f = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ color: 0x77828a, roughness: .8, side: THREE.DoubleSide })); f.position.z = z; grp.add(f);
    for (const dd of doors) {
      const dx = Array.isArray(dd) ? dd[0] : dd, hw = Array.isArray(dd) ? dd[1] : 3.3;
      for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(.5, 7.4), new THREE.MeshBasicMaterial({ map: hazardTex, side: THREE.DoubleSide })); p.position.set(dx + s * (hw + .25), 3.7, z + out * .05); grp.add(p); }
      addBox(grp, steel, dx, 7.4, z + out * .4, hw * 2 + 1, .9, .9);                               // rolled-up door drum
    }
    return f;
  };
  facade(zA, backDoors ? doors : [0], 1);
  facade(zB, doors.filter(tx => tx === 0 || !startInside || Array.isArray(tx)), -1);
  // signs
  const sg = (z, rotY) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.56), new THREE.MeshBasicMaterial({ map: depotSignTex })); s.position.set(0, 9.3, z); s.rotation.y = rotY; grp.add(s); };
  sg(zA + .1, 0); sg(zB - .1, Math.PI);
  const ex = new THREE.Mesh(new THREE.PlaneGeometry(2.6, .65), new THREE.MeshBasicMaterial({ map: exitSignTex })); ex.position.set(0, 8.4, zB + .12); grp.add(ex);
  // columns, trusses, lamps
  for (let z = zA - 6; z > zB + 3; z -= 12) {
    for (const x of [xL + .6, xR - .6]) addBox(grp, steel, x, 0, z, .45, Hw, .7);
    beamIn(grp, [xL + .6, Hw, z], [xR - .6, Hw, z], .35, steel);
    const nd = 8; for (let i = 0; i < nd; i++) { const xa = xL + W * i / nd, xb = xL + W * (i + 1) / nd; beamIn(grp, [xa, i % 2 ? archY(xa) - .3 : Hw, z], [xb, i % 2 ? Hw : archY(xb) - .3, z], .16, steel); }
    for (const tx of tracks) {
      const l = new THREE.Mesh(unit, hangarLampMat); l.position.set(tx, Hw - 1.6, z); l.scale.set(.9, .12, .5); grp.add(l);
      addBox(grp, steel, tx, Hw - 1.55, z, .04, 1.55, .04);
      const glow = new THREE.Sprite(glowMat); glow.material = glowMat.clone(); glow.material.color.set(0xfff1d8); glow.position.set(tx, Hw - 1.8, z); glow.scale.set(5, 5, 1); grp.add(glow);
    }
  }
  // crane runway + bridge crane
  for (const x of [xL + 1.2, xR - 1.2]) addBox(grp, yellow, x, Hw - 2.6, zc, .5, .5, L - 4);
  addBox(grp, yellow, xc, Hw - 2.9, zB + L * .35, W - 2.4, .8, 1.4); addBox(grp, steel, xc - 3, Hw - 3.9, zB + L * .35, 1.4, 1, 1.6);
  // equipment along the walls
  const r = rng(Math.round(zA * 13 + xL));
  for (let z = zA - 10; z > zB + 8; z -= 7 + r() * 9) {
    const side = r() < .5 ? xL + 1.3 : xR - 1.3, k = r();
    if (k < .4) addBox(grp, null, side, 0, z, 1.2, 1.9, 2.4, [0xb0372c, 0x2e5f8a, 0x4e6a3a][Math.floor(r() * 3)]);            // tool cabinets
    else if (k < .7) for (let b = 0; b < 3; b++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .95, 10), M([0x2b5d9a, 0xa83a2b, 0x3d6b3a][b])); c.position.set(side + (b - 1) * .7 * Math.sign(xc - side) * .5, .48, z + (b - 1) * .7); grp.add(c); }
    else { addBox(grp, null, side, 0, z, 1.4, .9, 3, 0x6b5638); addBox(grp, null, side, .9, z, 1.5, .08, 3.1, 0x3a3a3a); }   // workbench
  }
  for (const p of parked) { const t = trainModel(p.cars || 2); t.position.set(p.x, .32, p.z); grp.add(t); }
  grp.userData.hangar = [-zA, -zB];
}

/* the start depot: idx 0 = yard behind the hangar, idx 1 = hangar with the exit gate */
const DEPOT_START = -TILE + 70;
function depotTile(idx){
  const grp = new THREE.Group(), r = rng(3100 + idx);
  addGround(grp);
  if (idx === 0 || idx === 2) {
    if (idx === 0) { addTrack(grp, 0, false, -30, TILE - 30); bufferStop(grp, 0, -29.5); } else addTrack(grp, 0);
    for (const s of [-1, 1]) { addTrack(grp, s * 9, false, -60, 180); bufferStop(grp, s * 9, -59.5); }
    for (let z = -20; z > -TILE; z -= 40) for (const x of [-22, 22]) { addBox(grp, null, x, 0, z, .18, 9, .18, 0x2b2a27); addBox(grp, null, x * .96, 9, z, 1.4, .2, .5, 0x2b2a27); }
    if (idx === 0) {
    const f = new THREE.InstancedMesh(boxGeo, M(0x9a958b), 26);
    for (let i = 0; i < 26; i++) { D.rotation.set(0, 0, 0); D.position.set(-24 + i * 1.9, 0, -6); D.scale.set(1.85, 2.4, .2); D.updateMatrix(); f.setMatrixAt(i, D.matrix); }
    grp.add(f);
    }
  } else {
    addTrack(grp, 0);
    for (const s of [-1, 1]) { addTrack(grp, s * 9, false, 0, 192); bufferStop(grp, s * 9, -192.5); }
    buildHangar(grp, { zA: -36, zB: -204, xL: -16, xR: 16, tracks: [-9, 0, 9], startInside: true,
      parked: [{ x: -9, z: -178, cars: 3 }, { x: 9, z: -178, cars: 2 }] });
  }
  // trees around the yard
  const trees = [];
  for (let i = 0; i < 90 * KT; i++) { const z = -r() * TILE, side = r() < .5 ? -1 : 1; trees.push({ x: side * (28 + Math.pow(r(), 1.3) * 90), z, kind: r() < .6 ? 'pine' : 'birch', h: 8 + r() * 10 }); }
  plantTrees(grp, r, trees);
  return grp;
}
