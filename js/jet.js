/* ---------- fighter jet that flies alongside the train on open routes (replaces the eagle) ---------- */
function makeJet(){
  const g = new THREE.Group();
  const bodyM = new THREE.MeshStandardMaterial({ color: 0x9aa2aa, metalness: .55, roughness: .45, flatShading: true });
  const panelM = new THREE.MeshStandardMaterial({ color: 0x6f767d, metalness: .55, roughness: .5, flatShading: true });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x2f353b, metalness: .6, roughness: .5, flatShading: true });
  const wingM = new THREE.MeshStandardMaterial({ color: 0x8b939b, metalness: .55, roughness: .5, flatShading: true, side: THREE.DoubleSide });
  const canM = new THREE.MeshStandardMaterial({ color: 0x1a2a38, metalness: .5, roughness: .12, flatShading: true });
  const nozM = new THREE.MeshStandardMaterial({ color: 0x24272b, metalness: .85, roughness: .3, flatShading: true });
  const redM = new THREE.MeshStandardMaterial({ color: 0xb5352a, metalness: .3, roughness: .5, flatShading: true });
  const abM = new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: .85 });
  const tube = (rt, rb, len, mat, seg = 8) => { const gg = new THREE.CylinderGeometry(rt, rb, len, seg); gg.rotateX(Math.PI / 2); return new THREE.Mesh(gg, mat); };
  const cone = (r, len, mat, seg = 8) => { const gg = new THREE.ConeGeometry(r, len, seg); gg.rotateX(Math.PI / 2); return new THREE.Mesh(gg, mat); };   // tip toward +z

  // fuselage: pointed nose + mid body + tail, slightly flattened
  const mid = tube(.46, .5, 4.2, bodyM); mid.scale.set(1.08, .82, 1); mid.position.z = .2; g.add(mid);
  const noseB = tube(.2, .46, 2.2, bodyM); noseB.scale.set(1.08, .82, 1); noseB.position.z = 2.5; g.add(noseB);
  const noseTip = cone(.2, 1.0, bodyM); noseTip.scale.set(1.08, .82, 1); noseTip.position.z = 4.1; g.add(noseTip);
  const pitot = tube(.015, .03, .6, darkM, 6); pitot.position.z = 4.8; g.add(pitot);
  const tail = tube(.5, .34, 1.8, bodyM); tail.scale.set(1.08, .82, 1); tail.position.z = -2.1; g.add(tail);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(.2, .24, 3.4), panelM); spine.position.set(0, .34, -.5); g.add(spine);
  const redBand = tube(.47, .49, .18, redM); redBand.scale.set(1.09, .83, 1); redBand.position.z = 1.6; g.add(redBand);   // accent band

  // bubble canopy
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(.46, 12, 8, 0, Math.PI * 2, 0, Math.PI * .55), canM); canopy.scale.set(.64, .62, 1.7); canopy.position.set(0, .32, 1.35); g.add(canopy);
  const canSill = tube(.34, .34, 1.3, darkM); canSill.scale.set(.64, .3, 1); canSill.position.set(0, .18, 1.3); g.add(canSill);

  // side intakes under the wing roots
  for (const s of [-1, 1]) {
    const intake = new THREE.Mesh(new THREE.BoxGeometry(.5, .52, 2.3), panelM); intake.position.set(s * .54, -.2, .1); g.add(intake);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(.44, .46, .18), darkM); mouth.position.set(s * .56, -.2, 1.25); g.add(mouth);
  }

  // main swept wings with pylon + missile + wingtip rail
  const horiz = sh => { const gw = new THREE.ExtrudeGeometry(sh, { depth: .12, bevelEnabled: false }); gw.translate(0, 0, -.06); gw.rotateX(Math.PI / 2); return gw; };
  const mkWing = s => {
    const sh = new THREE.Shape(); sh.moveTo(s * .5, 1.0); sh.lineTo(s * 3.5, -.6); sh.lineTo(s * 3.5, -1.4); sh.lineTo(s * .5, -1.6); sh.closePath();
    const w = new THREE.Mesh(horiz(sh), wingM); w.position.y = -.04; g.add(w);
    const pyl = new THREE.Mesh(new THREE.BoxGeometry(.1, .2, .5), darkM); pyl.position.set(s * 2.1, -.2, -.5); g.add(pyl);
    const mis = tube(.08, .08, 1.5, panelM, 6); mis.position.set(s * 2.1, -.4, -.4); g.add(mis);
    const misN = cone(.08, .42, redM, 6); misN.position.set(s * 2.1, -.4, .45); g.add(misN);
    for (const fz of [-1.0, .2]) { const fin = new THREE.Mesh(new THREE.BoxGeometry(.015, .3, .3), darkM); fin.position.set(s * 2.1, -.4, fz); g.add(fin); }   // missile fins
    const tip = tube(.05, .05, 1.0, darkM, 5); tip.position.set(s * 3.55, 0, -.6); g.add(tip);
  };
  mkWing(-1); mkWing(1);

  // horizontal tailplanes (stabilators)
  const mkStab = s => { const sh = new THREE.Shape(); sh.moveTo(s * .42, -.9); sh.lineTo(s * 1.8, -1.6); sh.lineTo(s * 1.8, -2.15); sh.lineTo(s * .42, -2.05); sh.closePath(); const t = new THREE.Mesh(horiz(sh), wingM); t.position.y = -.02; g.add(t); };
  mkStab(-1); mkStab(1);

  // twin canted vertical tails
  const vert = sh => { const gv = new THREE.ExtrudeGeometry(sh, { depth: .09, bevelEnabled: false }); gv.translate(0, 0, -.045); gv.rotateY(-Math.PI / 2); return gv; };
  for (const s of [-1, 1]) {
    const sh = new THREE.Shape(); sh.moveTo(.9, 0); sh.lineTo(-.4, 0); sh.lineTo(-.75, 1.25); sh.lineTo(.15, 1.35); sh.closePath();   // (x = fore/aft +z forward, y = height)
    const fin = new THREE.Mesh(vert(sh), wingM); fin.position.set(s * .42, .28, -1.8); fin.rotation.x = -.12; fin.rotation.z = s * .28; g.add(fin);
    const tipR = new THREE.Mesh(new THREE.BoxGeometry(.02, .12, .5), redM); tipR.position.set(s * .64, 1.5, -2.2); tipR.rotation.z = s * .28; g.add(tipR);   // red fin cap
  }

  // afterburner nozzles + animated plume
  const burners = [];
  for (const s of [-1, 1]) {
    const noz = tube(.3, .34, .7, nozM, 10); noz.scale.set(1, .82, 1); noz.position.set(s * .27, 0, -3.1); g.add(noz);
    const lip = tube(.22, .22, .12, darkM, 10); lip.scale.set(1, .82, 1); lip.position.set(s * .27, 0, -3.46); g.add(lip);
    const ab = cone(.18, 1.7, abM, 10); ab.rotation.x += Math.PI; ab.scale.set(1, .82, 1); ab.position.set(s * .27, 0, -4.2); g.add(ab);   // plume points back (-z)
    burners.push(ab);
  }
  g.userData.burn = t => { for (const ab of burners) { const f = .78 + Math.sin(t * 46) * .16 + Math.random() * .12; ab.scale.z = f; ab.material.opacity = .55 + .35 * Math.abs(Math.sin(t * 37)); } };
  return g;
}
let jet = null, jetTimer = 6, jetSide = 1, jetT = 0, jetK = 0;
const jetG = makeJet(); jetG.visible = false; scene.add(jetG);
function jetOK(){ const cur = segAt(dist); return (cur.route === 0 || cur.route === 1 || cur.route === 5) && !(typeof warpWorldHidden !== 'undefined' && warpWorldHidden) && seaK < .2 && tunK < .2; }
function updateJet(dt){
  if (!jet) {
    jetTimer -= dt;
    if (jetTimer <= 0) { if (jetOK()) { jet = { life: 18 + Math.random() * 14 }; jetSide = Math.random() < .5 ? -1 : 1; jetT = 0; jetG.visible = true; } else jetTimer = 3; }
    if (!jet) return;
  }
  jetT += dt; jet.life -= dt;
  if (jet.life <= 0 || !jetOK()) { jet = null; jetG.visible = false; jetK = 0; jetTimer = 22 + Math.random() * 26; return; }
  jetK += ((jet.life > 2 ? 1 : 0) - jetK) * Math.min(1, dt * 1.5);                    // fade in/out by scaling
  const sp = Math.abs(v) / VMAX;
  const z = playerTrain.position.z - 16 + Math.sin(jetT * .45) * 9;                    // drifts fore/aft beside the train
  const x = jetSide * (6.5 + Math.sin(jetT * .35) * 2.2) + bendAtZ(z);                 // stays over the curving line
  const y = 9.5 + Math.sin(jetT * .7) * 1.2 + sp * 1.6;                                // cruises above the treeline
  jetG.position.set(x, y, z);
  const bank = jetSide * .1 + Math.sin(jetT * .45) * .13;                              // mostly level, banks gently with the drift
  jetG.rotation.set(Math.sin(jetT * .7) * .05, Math.PI + Math.sin(jetT * .35) * .07, bank);
  jetG.userData.burn(jetT);
  jetG.scale.setScalar(1.05 * (.4 + .6 * jetK));
}
