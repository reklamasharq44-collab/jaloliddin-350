/* ---------- junction: diverging branch, route signal, switch lantern ---------- */
const BR_A = 40, BR_B = 200;
const lat = p => SH * sstep(BR_A, BR_B, p);
function addJunction(grp0){
  const grp = new THREE.Group(); grp0.add(grp);            // the diverging branch: shown only when the train is routed into the depot
  const segs = [], ballast = [], sl = [];
  for (let p = BR_A; p < TILE; p += 3) segs.push(p);
  const railI = new THREE.InstancedMesh(unit, railMat, segs.length * 2), bal = new THREE.InstancedMesh(unit, M(0x6f6b64), segs.length);
  segs.forEach((p, i) => {
    const q = Math.min(TILE, p + 3), A = lat(p), B = lat(q);
    [-.76, .76].forEach((o, j) => {
      D.position.set((A + B) / 2 + o, .3, -(p + q) / 2); D.scale.set(1, 1, 1); D.rotation.set(0, 0, 0);
      D.lookAt(B + o, .3, -q); D.position.set((A + B) / 2 + o, .3, -(p + q) / 2); D.scale.set(.08, .15, Math.hypot(B - A, q - p) + .02); D.updateMatrix(); railI.setMatrixAt(i * 2 + j, D.matrix);
    });
    D.rotation.set(0, -Math.atan((B - A) / (q - p)), 0); D.position.set((A + B) / 2, .025, -(p + q) / 2); D.scale.set(3.8, .05, 3.05); D.updateMatrix(); bal.setMatrixAt(i, D.matrix);
  });
  const sp = []; for (let p = BR_A + 14; p < TILE; p += SLEEP) sp.push(p);
  const slI = new THREE.InstancedMesh(sleeperGeo, sleeperMat, sp.length);
  sp.forEach((p, i) => { const s = (lat(p + .5) - lat(p - .5)); D.rotation.set(0, -Math.atan(s), 0); D.position.set(lat(p), .16, -p); D.scale.set(1, 1, 1); D.updateMatrix(); slI.setMatrixAt(i, D.matrix); });
  grp.add(railI, bal, slI);
  // switch frog area: a few long timbers
  for (let p = BR_A; p < BR_A + 14; p += SLEEP * 1.5) addBox(grp, sleeperMat, lat(p) / 2, .09, -p, 2.6 + lat(p) + 1.2, .14, .24);
  const branch = grp; grp0.userData.branch = branch;
  { const grp = grp0;
  // route signal before the switch
  addBox(grp, null, 2.9, 0, -6, .18, 4.3, .18, 0x2b2a27);
  addBox(grp, null, 2.9, 3.7, -6, .62, 1.6, .34, 0x111111);
  const lampG = new THREE.SphereGeometry(.17, 10, 8);
  const top = new THREE.Mesh(lampG, new THREE.MeshBasicMaterial({ color: 0x33ff88 })), bot = new THREE.Mesh(lampG, new THREE.MeshBasicMaterial({ color: 0x222222 }));
  top.position.set(2.9, 4.95, -5.8); bot.position.set(2.9, 4.4, -5.8); grp.add(top, bot);
  const g1 = new THREE.Sprite(glowMat.clone()), g2 = new THREE.Sprite(glowMat.clone());
  g1.scale.set(1.6, 1.6, 1); g2.scale.set(1.6, 1.6, 1); g1.position.copy(top.position); g2.position.copy(bot.position); grp.add(g1, g2);
  // switch stand with indicator
  addBox(branch, null, -2.3, 0, -BR_A, .14, 1.1, .14, 0x2b2a27);
  const ind = new THREE.Mesh(unit, new THREE.MeshBasicMaterial({ color: 0xe8e2d4 })); ind.position.set(-2.3, 1.25, -BR_A); ind.scale.set(.5, .3, .08); branch.add(ind);
  grp.userData.junction = { top, bot, g1, g2, ind, branch };
  }
}
function setJunctionLook(grp, choice){
  const j = grp.userData.junction; if (!j) return;
  j.branch.visible = !!choice;
  j.top.material.color.set(choice ? 0xffc23a : 0x33ff88); j.g1.material.color.set(choice ? 0xffb02a : 0x44ff99);
  j.bot.material.color.set(choice ? 0xffc23a : 0x222222); j.g2.visible = !!choice; j.g2.material.color.set(0xffb02a);
  j.ind.material.color.set(choice ? 0xffc23a : 0xe8e2d4);
}
/* stub of the untaken track, attached to the first tile after a junction */
function makeGhost(){ const g = new THREE.Group(); addTrack(g, 0, false, 0, 96); bufferStop(g, 0, -97); return g; }
const ghosts = { L: makeGhost(), R: makeGhost() };
