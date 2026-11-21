/* ---------- train assembly: bogies, pantograph, mesh merging, trainModel(cars, opts) ---------- */
const shadowTex = canvasTex(64, 64, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.3, 'rgba(0,0,0,.8)'); g.addColorStop(.7, 'rgba(0,0,0,.8)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: .55 });
/* SHARQ advertising board for the sides of oncoming trains — an unlit lightbox that glows day and night */
const sharqBoardTex = canvasTex(1024, 224, (x, w, h) => {
  x.fillStyle = '#0b8a3a'; x.fillRect(0, 0, w, h); x.fillStyle = '#0c7d36'; x.fillRect(0, 0, w, h * .5);
  x.strokeStyle = '#ffffff'; x.lineWidth = 12; x.strokeRect(12, 12, w - 24, h - 24);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = '#ffffff'; x.font = '800 118px "Trebuchet MS", Arial, sans-serif'; x.fillText('SHARQ', w / 2, h * .40);
  x.fillStyle = '#e4002b'; x.fillRect(w * .30, h * .60, w * .40, 7);
  x.fillStyle = '#ffd21f'; x.font = '700 46px "Trebuchet MS", Arial, sans-serif'; x.fillText('REKLAMA MARKAZI', w / 2, h * .80);
});
const sharqBoardMat = new THREE.MeshBasicMaterial({ map: sharqBoardTex });

const DISC_GEO = new THREE.CylinderGeometry(.33, .33, .06, 20), DAMP_GEO = new THREE.CylinderGeometry(.07, .07, 1.25, 10);
TM.disc = new THREE.MeshStandardMaterial({ color: 0x8a5a44, metalness: .8, roughness: .35, envMap: trainEnv });
function addBogie(g, z){
  const b = new THREE.Group(); b.position.set(0, 0, z);
  const frame = new THREE.Mesh(unit, TM.graphite); frame.position.y = .78; frame.scale.set(2.5, .32, 3.6); b.add(frame);
  for (const s of [-1, 1]) { const side = new THREE.Mesh(unit, TM.dark); side.position.set(s * 1.05, .7, 0); side.scale.set(.18, .5, 3.9); b.add(side); }
  const wg = new THREE.CylinderGeometry(.46, .46, .13, 22), hub = new THREE.CylinderGeometry(.2, .2, .16, 12);
  for (const az of [-1.25, 1.25]) {
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(wg, TM.steel); w.rotation.z = Math.PI / 2; w.position.set(s * .76, .46, az); b.add(w);
      const h = new THREE.Mesh(hub, TM.dark); h.rotation.z = Math.PI / 2; h.position.set(s * .84, .46, az); b.add(h);
      const box = new THREE.Mesh(unit, TM.yellow); box.position.set(s * 1.17, .5, az); box.scale.set(.2, .3, .38); b.add(box);
      const spring = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .32, 8), TM.dark); spring.position.set(s * 1.17, .82, az); b.add(spring);
    }
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 1.7, 8), TM.dark); axle.rotation.z = Math.PI / 2; axle.position.set(0, .46, az); b.add(axle);
    for (const s of [-1, 1]) { const dsc = new THREE.Mesh(DISC_GEO, TM.disc); dsc.rotation.z = Math.PI / 2; dsc.position.set(s * .36, .46, az); b.add(dsc); }
  }
  for (const s of [-1, 1]) {                                                                         // yaw dampers along the frame
    const dm = new THREE.Mesh(DAMP_GEO, TM.graphite); dm.rotation.x = Math.PI / 2; dm.position.set(s * 1.3, .92, 0); b.add(dm);
    for (const e of [-.62, .62]) { const cap = new THREE.Mesh(unit, TM.yellow); cap.position.set(s * 1.3, .92, e); cap.scale.set(.16, .16, .1); b.add(cap); }
  }
  g.add(b);
}
function addPantograph(g, z, hero = false){
  const p = new THREE.Group(); p.position.set(0, BODY.top - .02, z);
  for (const [x, zz] of [[-.7, -.9], [.7, -.9], [-.7, .9], [.7, .9]]) { const ins = new THREE.Mesh(new THREE.CylinderGeometry(.09, .12, .42, 10), TM.ceramic); ins.position.set(x, .21, zz); p.add(ins); }
  const base = new THREE.Mesh(unit, TM.graphite); base.position.set(0, .46, 0); base.scale.set(1.7, .1, 2.1); p.add(base);
  const m = TM.dark, bm = (a, b, t) => beamIn(p, a, b, t, m);
  bm([-.55, .5, .7], [-.15, 1.55, -.55], .07); bm([.55, .5, .7], [.15, 1.55, -.55], .07);
  bm([0, 1.55, -.55], [0, 2.55, .45], .06); bm([-.15, 1.55, -.55], [.15, 1.55, -.55], .05);
  const head = new THREE.Mesh(unit, TM.steel); head.position.set(0, 2.6, .45); head.scale.set(1.7, .07, .32); p.add(head);
  for (const s of [-1, 1]) bm([s * .85, 2.6, .45], [s * 1.12, 2.45, .45], .05);
  g.add(p);
  if (hero) { beamIn(g, [.55, BODY.top + .5, z], [.55, BODY.top + .38, z + 1.4], .035, TM.chrome); return; }
  const bus = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 22, 6), TM.ceramic); bus.rotation.x = Math.PI / 2; bus.position.set(.55, BODY.top + .12, z + 8); g.add(bus);
}
/* fold every static mesh under a part into one mesh per material: same look, far fewer draw calls */
function mergeStatic(root){
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), m = new THREE.Matrix4(), nm = new THREE.Matrix3(), byMat = new Map(), dead = [];
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    m.multiplyMatrices(inv, o.matrixWorld); g.applyMatrix4(m);
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(g); dead.push(o);
  });
  for (const o of dead) o.parent.remove(o);
  for (const [mat, list] of byMat) {
    const n = list.reduce((a, g) => a + g.attributes.position.count, 0), P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2);
    let off = 0;
    for (const g of list) {
      P.set(g.attributes.position.array, off * 3); N.set(g.attributes.normal.array, off * 3);
      if (g.attributes.uv) U.set(g.attributes.uv.array, off * 2);
      off += g.attributes.position.count; g.dispose();
    }
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(P, 3)); mg.setAttribute('normal', new THREE.BufferAttribute(N, 3)); mg.setAttribute('uv', new THREE.BufferAttribute(U, 2));
    const mesh = new THREE.Mesh(mg, mat); if (mat.transparent) mesh.renderOrder = 1; root.add(mesh);
  }
}
/* trainset made of articulated parts; each part pivots about its own centre so it can follow a curve */
const INS_GEO = new THREE.CylinderGeometry(.05, .07, .36, 8);
const FIN_GEO = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(.62, 0); s.quadraticCurveTo(.2, .1, .05, .32); s.lineTo(0, .3); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: .04, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(-.02, 0, .31); return g; })();
const DOOR_LED = new THREE.MeshBasicMaterial({ color: 0x45ff8a });
const carNumMats = {}, carNumMat = n => carNumMats[n] || (carNumMats[n] = new THREE.MeshBasicMaterial({ transparent: true, map: canvasTex(128, 128, (x, w, h) => {
  x.clearRect(0, 0, w, h); x.fillStyle = '#c4122f'; x.beginPath(); x.arc(64, 64, 58, 0, 7); x.fill(); x.lineWidth = 6; x.strokeStyle = '#fff'; x.stroke();
  x.fillStyle = '#fff'; x.font = '800 74px "Segoe UI", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n), 64, 68); }) }));
const emblemMat = new THREE.MeshStandardMaterial({ map: emblemTex, transparent: true, roughness: .25, metalness: .2, depthWrite: false, side: THREE.DoubleSide });
/* hero nose extras: emblem on the snout, coupler-hatch seam, side camera pods (dir -1 = front, +1 = tail) */
function heroNose(P, z0, dir = -1){
  const s1 = noseSec(.6, dir), s2 = noseSec(.72, dir), p1 = new THREE.Vector3(0, s1.top, z0 + s1.z), p2 = new THREE.Vector3(0, s2.top, z0 + s2.z);
  const yA = p1.clone().sub(p2).normalize(), zA = new THREE.Vector3(0, yA.z, -yA.y);   // texture up points back toward the body; normal points up
  if (zA.y < 0) zA.negate();
  const xA = new THREE.Vector3().crossVectors(yA, zA), em = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), emblemMat);
  em.matrixAutoUpdate = true; em.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, yA, zA));
  em.position.copy(p1).add(p2).multiplyScalar(.5).addScaledVector(zA, .03); P.add(em);
  const hatch = nosePatch(dir, .9, .97, sc => [phiAt(sc, .36), Math.PI - phiAt(sc, .36)], .007, TM.graphite, 10, 30); hatch.position.z = z0; P.add(hatch);   // clean coupler-hatch panel
  const rim = nosePatch(dir, .895, .905, sc => [phiAt(sc, .36), Math.PI - phiAt(sc, .36)], .0075, TM.rubber, 3, 30); rim.position.z = z0; P.add(rim);         // crisp seam line above it
  if (dir < 0) {
    const sc = noseSec(.07, dir);
    for (const s of [-1, 1]) {
      const pt = surfPt(sc, s > 0 ? phiAt(sc, .66) : Math.PI - phiAt(sc, .66), .0);
      const housing = new THREE.Mesh(new THREE.SphereGeometry(.1, 14, 10), TM.chrome); housing.scale.set(1, 1, 1.1); housing.position.set(pt[0] * .99, pt[1], z0 + pt[2] + .02); P.add(housing);   // small chrome sensor bezel, flush to the snout
      const lens = new THREE.Mesh(new THREE.SphereGeometry(.055, 10, 8), TM.wsGlass); lens.position.set(pt[0] * .99, pt[1], z0 + pt[2] - .05); P.add(lens);   // dark glass eye
    }
  }
}
const HEAD_DISC = new THREE.CircleGeometry(.17, 20);
function trainModel(cars = 2, opts = {}){
  const g = new THREE.Group(), CL = 25, GAP = .8, M = 64, parts = [], H = !!opts.hero;
  const ACC = opts.accent ? new THREE.MeshStandardMaterial({ color: opts.accent, emissive: opts.accent, emissiveIntensity: .25, metalness: .3, roughness: .3, envMap: trainEnv, side: THREE.DoubleSide }) : TM.cyan;
  const part = (zc, bogies) => { const pivot = new THREE.Group(), inner = new THREE.Group(); pivot.position.z = zc; inner.position.z = -zc; pivot.add(inner); g.add(pivot); parts.push({ pivot, zc, bogies }); return inner; };
  const flatSecs = (z0, z1) => [{ z: z0, a: BODY.a, top: BODY.top, bot: BODY.bot, n: 4 }, { z: z1, a: BODY.a, top: BODY.top, bot: BODY.bot, n: 4 }];
  // lead car = nose + first passenger body share one part, like a real power car
  const zEnd = GAP + cars * (CL + GAP) - GAP;
  for (let c = 0; c < cars; c++) {
    const z0 = GAP + c * (CL + GAP), z1 = z0 + CL, zc = (z0 + z1) / 2;
    const P = part(zc, [zc - 8.6, zc + 8.6]);
    if (c === 0) {
      const front = new THREE.Mesh(NOSE_FRONT, TM.paint); front.position.z = GAP; P.add(front);
      const det = noseDetails(-1, ACC, H); det.position.z = GAP; P.add(det);
      const ht = .82, sc = noseSec(ht, -1);
      for (const s of [-1, 1]) {
        const pt = surfPt(sc, s > 0 ? phiAt(sc, .33) : Math.PI - phiAt(sc, .33), .01), kx = H ? .985 : .92;
        if (H) { const bez = new THREE.Mesh(new THREE.SphereGeometry(.2, 16, 10), TM.chrome); bez.scale.set(1.25, .82, .4); bez.position.set(pt[0] * kx, pt[1], GAP + pt[2] - .05); P.add(bez); }   // chrome bezel ring flush to the nose
        const l = new THREE.Mesh(new THREE.SphereGeometry(.13, 16, 10), TM.head); l.scale.set(1.3, .8, .7); l.position.set(pt[0] * kx, pt[1], GAP + pt[2]); P.add(l);   // emissive lamp lens (shown on the hero too)
        if (H) { const gd = new THREE.Mesh(HEAD_DISC, TM.head); gd.position.set(pt[0] * kx, pt[1], GAP + pt[2] + .06); gd.rotation.y = Math.PI; P.add(gd); }   // forward-facing glow: edge-on and invisible from the side
      }
      { const s1 = noseSec(.5, -1), s2 = noseSec(.3, -1);                                                // wipers lying on the windscreen
        for (const s of [-1, 1]) { const a = surfPt(s1, Math.PI / 2 - s * .55, .03), b = surfPt(s2, Math.PI / 2 - s * .12, .03); beamIn(P, [a[0], a[1], GAP + a[2]], [b[0], b[1], GAP + b[2]], .03, TM.dark); } }
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(3.8, NOSE_L), shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.set(0, -.08, GAP - NOSE_L / 2); P.add(sh);
      if (H) heroNose(P, GAP);
    }
    if (c === cars - 1 && opts.tail !== false && H) heroNose(P, zEnd, 1);
    if (c === cars - 1 && opts.tail !== false) {
      const tail = new THREE.Mesh(NOSE_TAIL, TM.paint); tail.position.z = zEnd; P.add(tail);
      const det = noseDetails(1, ACC, H); det.position.z = zEnd; P.add(det);
      const sc = noseSec(.82, 1);
      for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(.18, 12, 8), TM.tail); l.scale.set(1.5, .5, .8); l.visible = !H; const pt = surfPt(sc, s > 0 ? phiAt(sc, .33) : Math.PI - phiAt(sc, .33), .01); l.position.set(pt[0] * .92, pt[1], zEnd + pt[2]); P.add(l);
        if (H) { const gl = new THREE.Sprite(glowMat.clone()); gl.material.color.set(0xff3020); gl.material.opacity = .6; gl.position.set(pt[0] * .9, pt[1], zEnd + pt[2] + .12); gl.scale.set(1.15, .8, 1); P.add(gl); } }
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(3.8, NOSE_L), shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.set(0, -.08, zEnd + NOSE_L / 2); P.add(sh);
    }
    P.add(new THREE.Mesh(loft(flatSecs(z0, z1), M, null, z0, z1), TM.paint));
    const fR = phiAt(bodySc, U_ROOF);
    P.add(bodyPatch(z0 + .05, z1 - .05, fR, Math.PI - fR, .004, TM.roof, 24));                                     // grey roof
    for (const s2 of [-1, 1]) {
      const [g0, g1] = sideArc(bodySc, U_ROOF - .012, U_ROOF - .004, s2); P.add(bodyPatch(z0 + .05, z1 - .05, g0, g1, .006, TM.rubber, 2));   // rain gutter
      if (H) {
        P.add(carPatch(z0, z1, U_BAND, s2, .005, TM.livery, 1, 8));                                                                         // crimson band
        P.add(carPatch(z0, z1, [U_BAND[1] + .006, U_BAND[1] + .026], s2, .0055, TM.led, 1, 2));                                             // neon LED line
        P.add(carPatch(z0, z1, [U_BAND[0] - .012, U_BAND[0] - .004], s2, .0055, TM.chrome, 1, 2));                                          // chrome underline
        { const t2 = saloonTex.clone(); t2.needsUpdate = true; t2.repeat.set((CL - 4.6) / 2.3, 1);                                         // lit saloon behind the glass
          P.add(carPatch(z0 + 2.3, z1 - 2.3, [U_WIN[0] + .01, U_WIN[1] - .01], s2, .003, new THREE.MeshBasicMaterial({ map: t2, color: 0xc8b8a2 }), 1, 6)); }
        P.add(carPatch(z0 + 2.3, z1 - 2.3, U_WIN, s2, .006, TM.sideGlass, 1, 6));                                                          // see-through glass
        for (const uu of [[U_WIN[1] + .004, U_WIN[1] + .012], [U_WIN[0] - .04, U_WIN[0] - .033]]) P.add(carPatch(z0 + 2.2, z1 - 2.2, uu, s2, .0065, TM.chrome, 1, 2));   // chrome window trims
        for (const zz of [z0 + 6.4, zc, z1 - 6.4]) for (const uu of [[.1, U_BAND[0] - .014], [U_BAND[1] + .02, U_WIN[0] - .045], [U_WIN[1] + .015, U_ROOF - .015]])
          P.add(carPatch(zz - .012, zz + .012, uu, s2, .0062, TM.rubber, 1, 3));                                                            // panel seams
        if (c === 0 || c === cars - 1) {                                                                                                  // cooling grille behind the cab
          const gz = c === 0 ? z0 + 3.1 : z1 - 5.5, gu0 = .345, gu1 = .408;
          P.add(carPatch(gz - .06, gz + 1.9, [gu0, gu1], s2, .0042, TM.graphite, 1, 4));                                                   // flush recessed vent panel
          for (let k = 0; k < 4; k++) { const u = gu0 + .009 + k * .0145; P.add(carPatch(gz, gz + 1.78, [u, u + .005], s2, .0056, TM.dark, 1, 2)); }   // thin louvers hug the curve
          P.add(carPatch(gz - .07, gz + 1.95, [gu0 - .004, gu0 - .0015], s2, .006, TM.chrome, 1, 2));                                      // chrome trim top & bottom
          P.add(carPatch(gz - .07, gz + 1.95, [gu1 + .0015, gu1 + .004], s2, .006, TM.chrome, 1, 2));
        }
      } else {
      const [a0, a1] = sideArc(bodySc, U_ACC[0], U_ACC[1], s2); P.add(bodyPatch(z0, z1, a0, a1, .005, ACC, 3));                           // accent stripe
      const [b0, b1] = sideArc(bodySc, .22, .232, s2); P.add(bodyPatch(z0, z1, b0, b1, .005, ACC, 2));                                    // pin line
      const [w0, w1] = sideArc(bodySc, U_WIN[0], U_WIN[1], s2); P.add(bodyPatch(z0 + 2.3, z1 - 2.3, w0, w1, .006, TM.glass, 6));           // window band
      }
      const [m0, m1] = sideArc(bodySc, U_WIN[0] - .03, U_WIN[0] - .005, s2); P.add(bodyPatch(z0 + 2.2, z1 - 2.2, m0, m1, .005, TM.graphite, 2));
    }
    { const f = phiAt(bodySc, U_SKIRT); P.add(bodyPatch(z0, z1, Math.PI - f, 2 * Math.PI + f, .004, TM.graphite, 12)); }               // lower body band
    for (const pz of [z0 + .04, z1 - .04]) P.add(bodyPatch(pz - .02, pz + .02, 0, 2 * Math.PI, .007, TM.rubber, 40));                   // car-end seams
    for (const s of [-1, 1]) {
      const wx = s * (sideX(3.35) + .012);
      const np = Math.floor((CL - 4.6) / 2.3), pil = new THREE.InstancedMesh(unit, TM.graphite, np);
      for (let i = 0; i < np; i++) { D.position.set(wx + s * .01, 3.35, z0 + 2.3 + 1.15 + i * 2.3); D.rotation.set(0, 0, 0); D.scale.set(.03, .95, .16); D.updateMatrix(); pil.setMatrixAt(i, D.matrix); }
      P.add(pil);
      for (const dz of [1.15, CL - 1.15]) {
        const dx = s * (sideX(2.7) + .014);
        for (const [yy, hh, zz, ww] of [[2.7, 2.6, -.55, .035], [2.7, 2.6, .55, .035], [4.0, .035, 0, 1.1], [1.4, .035, 0, 1.1]]) { const e = new THREE.Mesh(unit, TM.dark); e.position.set(dx, yy, z0 + dz + zz); e.scale.set(.02, hh, ww); P.add(e); }
        const dw = new THREE.Mesh(new THREE.PlaneGeometry(.55, .75), TM.glass); dw.rotation.y = s * Math.PI / 2; dw.position.set(dx + s * .003, 3.35, z0 + dz); P.add(dw);
        if (H) {
          const hd = new THREE.Mesh(unit, TM.chrome); hd.position.set(dx + s * .03, 2.75, z0 + dz + (dz < CL / 2 ? .38 : -.38)); hd.scale.set(.035, .5, .05); P.add(hd);            // grab handle
          const st = new THREE.Mesh(unit, TM.plate); st.position.set(s * 1.47, 1.16, z0 + dz); st.scale.set(.22, .07, 1.15); P.add(st);                                   // boarding step
          const sl = new THREE.Mesh(unit, TM.chrome); sl.position.set(s * 1.58, 1.16, z0 + dz); sl.scale.set(.02, .072, 1.15); P.add(sl);
          const ind = new THREE.Mesh(unit, DOOR_LED); ind.position.set(s * (sideX(4.12) + .02), 4.12, z0 + dz); ind.scale.set(.03, .07, .32); P.add(ind);             // door status light
          const cn = new THREE.Mesh(new THREE.PlaneGeometry(.42, .42), carNumMat(c + 1)); cn.rotation.y = s * Math.PI / 2; cn.position.set(dx + s * .006, 3.5, z0 + dz + (dz < CL / 2 ? .95 : -.95)); P.add(cn);   // car number roundel
        }
      }
      if (H) P.add(carPatch(zc - 3.6, zc + 3.6, [U_BAND[0] + .02, U_BAND[1] - .015], s, .0075, heroNameMat, 4, 6));                     // big white name on the band
      else if (opts.adBoards) { const nm = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.1), sharqBoardMat); nm.rotation.y = s * Math.PI / 2; nm.position.set(s * (sideX(2.45) + .03), 2.45, zc); P.add(nm); }   // SHARQ board on oncoming trains
      else if (c === 0 || c === cars - 1) { const nm = new THREE.Mesh(new THREE.PlaneGeometry(3.4, .64), new THREE.MeshBasicMaterial({ map: nameTex, transparent: true })); nm.rotation.y = s * Math.PI / 2; nm.position.set(s * (sideX(2.35) + .02), 2.35, zc); P.add(nm); }
      const no = new THREE.Mesh(new THREE.PlaneGeometry(.9, .45), new THREE.MeshBasicMaterial({ map: numTexFor('0' + (c + 1) + '·350'), transparent: true })); no.rotation.y = s * Math.PI / 2;
      if (H) no.position.set(s * (sideX(2.62) + .02), 2.62, z1 - 3.4); else no.position.set(s * (sideX(2.3) + .02), 2.3, z0 + 3.2); P.add(no);
    }
    const skirt = new THREE.Mesh(unit, TM.graphite); skirt.position.set(0, 1.0, zc); skirt.scale.set(2.95, .5, CL - .4); P.add(skirt);
    for (const ez of [-4.5, 0, 4.5]) { const eq = new THREE.Mesh(unit, TM.dark); eq.position.set(0, .82, zc + ez); eq.scale.set(2.2, .4, 2.6); P.add(eq); }
    addBogie(P, zc - 8.6); addBogie(P, zc + 8.6);
    if (H) for (const s of [-1, 1]) {                                                                    // aero skirts between the bogies
      const sk = new THREE.Mesh(unit, TM.paint); sk.position.set(s * 1.47, .66, zc); sk.scale.set(.06, .58, 12.2); P.add(sk);
      const skl = new THREE.Mesh(unit, TM.graphite); skl.position.set(s * 1.48, .4, zc); skl.scale.set(.05, .06, 12.2); P.add(skl);                  // shadow line along the bottom edge
      const lip = new THREE.Mesh(unit, TM.chrome); lip.position.set(s * 1.49, .95, zc); lip.scale.set(.04, .035, 12.2); P.add(lip);                  // chrome accent where skirt meets body
      for (const bz of [zc - 8.6, zc + 8.6]) { const fl = new THREE.Mesh(unit, TM.graphite); fl.position.set(s * 1.44, .52, bz); fl.scale.set(.05, .3, 4.6); P.add(fl); }   // dark bogie cut-outs
    }
    const ac = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 3.6, 18, 1, false, Math.PI / 2, Math.PI), TM.paint); ac.rotation.x = Math.PI / 2; ac.scale.set(1, 1, .32); ac.position.set(0, BODY.top - .06, zc - 6); P.add(ac);
    for (let i = 0; i < 4; i++) { const vt = new THREE.Mesh(unit, TM.graphite); vt.position.set(0, BODY.top + .02, zc + 2 + i * 1.1); vt.scale.set(.9, .06, .5); P.add(vt); }
    if (H) {
      for (let i = 0; i < 6; i++) { const sl = new THREE.Mesh(unit, TM.graphite); sl.position.set(0, BODY.top + .3, zc - 7.25 + i * .5); sl.scale.set(1.25, .03, .14); P.add(sl); }   // grille on the AC pod
      const ze = c < cars - 1 ? z1 + GAP + .1 : z1 - .6, zs = c === 0 ? z0 + 2 : z0 - .1;                                                                      // roof power line over all cars
      const bus = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, ze - zs, 8), TM.chrome); bus.rotation.x = Math.PI / 2; bus.position.set(.55, BODY.top + .38, (zs + ze) / 2); P.add(bus);
      for (let zz = zs + 1.2; zz < ze - .5; zz += 4.2) { const ins = new THREE.Mesh(INS_GEO, TM.ceramic); ins.position.set(.55, BODY.top + .2, zz); P.add(ins); }
      if (c === 0) for (const [zz, xx] of [[z0 + 5, -.4], [z0 + 6.6, -.4]]) { const fin = new THREE.Mesh(FIN_GEO, TM.graphite); fin.position.set(xx, BODY.top, zz); P.add(fin); }   // antenna fins
    }
    if (c < cars - 1 && H) {                                                                             // smooth painted fairing between cars
      const sec = (z, k) => ({ z, a: BODY.a * k, top: BODY.top - (1 - k) * 2, bot: BODY.bot + (1 - k) * 3, n: 4 });
      P.add(new THREE.Mesh(loft([sec(z1 - .2, .985), sec(z1 + GAP + .2, .985)], 56, null), TM.paint));
      for (const zz of [z1 + .08, z1 + GAP - .08]) P.add(new THREE.Mesh(loft([sec(zz - .03, .992), sec(zz + .03, .992)], 56, null), TM.rubber));
      const [l0, l1] = [U_BAND[0], U_BAND[1]];
      for (const s of [-1, 1]) { P.add(carPatch(z1 - .2, z1 + GAP + .2, [l0, l1], s, -.009, TM.livery, 1, 6)); P.add(carPatch(z1 - .2, z1 + GAP + .2, [l1 + .006, l1 + .026], s, -.0085, TM.led, 1, 2)); }
    } else if (c < cars - 1) {
      P.add(new THREE.Mesh(loft([{ z: z1 - .2, a: BODY.a * .97, top: BODY.top - .06, bot: BODY.bot + .2, n: 4 }, { z: z1 + GAP + .2, a: BODY.a * .97, top: BODY.top - .06, bot: BODY.bot + .2, n: 4 }], 48, null), TM.rubber));
      for (let k = 0; k < 4; k++) { const zz = z1 + .1 + k * .2; P.add(new THREE.Mesh(loft([{ z: zz, a: BODY.a * .985, top: BODY.top - .03, bot: BODY.bot + .17, n: 4 }, { z: zz + .06, a: BODY.a * .985, top: BODY.top - .03, bot: BODY.bot + .17, n: 4 }], 48, null), TM.graphite)); }
    }
    if (c === Math.min(1, cars - 1) && opts.pantograph !== false) {
      addPantograph(P, zc + 4, H);
      if (H) { const fr = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.35, 5.2, 24, 1, true, Math.PI / 2, Math.PI), TM.paint); fr.rotation.x = Math.PI / 2; fr.scale.set(1, 1, .2); fr.position.set(0, BODY.top - .1, zc + 4); P.add(fr);   // low aero fence round the pantograph
        for (const s of [-1, 1]) { const ed = new THREE.Mesh(unit, TM.livery); ed.position.set(s * 1.2, BODY.top + .08, zc + 4); ed.scale.set(.06, .1, 5.1); P.add(ed); } }
    }
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(4.6, CL + GAP), shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.set(0, -.08, zc); P.add(sh);
  }
  for (const p of parts) mergeStatic(p.pivot.children[0]);
  g.userData.parts = parts;
  return g;
}
