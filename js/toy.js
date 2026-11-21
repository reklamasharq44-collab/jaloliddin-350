/* ---------- dashboard toy: an original 70s-style coupe from the user's own design: warm yellow with twin black stripes with a bobble-head driver on a coil spring ----------
   physics: the spring-mounted body (pitch, roll, heave), the driver's head and the whip antenna are separate damped
   oscillators driven by what the cab feels — acceleration and braking, cornering, rail joints, vibration at speed */
let toy = null;                        // built by buildToy() once the train materials (env map, emblem) exist
function buildToy(){
  const std = (c, m = .2, r = .45, e) => new THREE.MeshStandardMaterial(Object.assign({ color: c, metalness: m, roughness: r, envMap: trainEnv }, e || {}));
  const paint = std(0xf2b01e, .35, .2, { envMapIntensity: 1.25 }), stripeK = std(0x16171a, .2, .45), rimM = std(0x1b1c1f, .5, .4), capM = std(0xc9ced3, .9, .2), gold = rimM, roofM = paint;
    glass = std(0x0e1a24, .6, .05, { transparent: true, opacity: .55, envMapIntensity: 1.6 }), rubber = std(0x141414, 0, .85), stripeM = std(0xf3efe4, .1, .4), red = std(0x8a0a0a, .2, .3, { emissive: 0xc01010, emissiveIntensity: .7 });
  const chrome = TM.chrome;                       // was resolving to the browser's window.chrome, so chrome parts (incl. the coil spring) vanished
  const holder = new THREE.Group(), carPivot = new THREE.Group(), car = new THREE.Group();
  const ext = (pts, depth, mat, bevel = .003) => {
    const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) Array.isArray(pts[i][0]) ? sh.absarc(...pts[i][0]) : sh.lineTo(pts[i][0], pts[i][1]);
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * .9, bevelSegments: 3, curveSegments: 14 });
    g.translate(0, 0, -depth / 2); const m = new THREE.Mesh(g, mat); car.add(m); return m;
  };
  const box = (mat, sx, sy, sz, x, y, z, parent = car) => { const m = new THREE.Mesh(unit, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); parent.add(m); return m; };
  // body (the user's own design): short overhangs, chunky stance, flared arches, fastback with quarter windows
  const WR = .025, WY = .021, a0 = -.25, a1 = Math.PI + .25, WX = .05;
  ext([[.081, .014], [WX + WR * Math.cos(a0), .014], [[WX, WY, WR, a0, a1, false]], [-WX + WR * Math.cos(a0), .014], [[-WX, WY, WR, a0, a1, false]], [-.08, .014],
    [-.0825, .022], [-.0825, .046], [-.08, .0545], [-.068, .0562], [.018, .0512], [.06, .0478], [.0805, .046], [.0835, .036], [.0835, .022]], .064, paint, .004);
  for (const x of [WX, -WX]) {                                                                      // flared arches
    const sh = new THREE.Shape(); sh.absarc(x, WY, WR + .0045, a0, a1, false); sh.absarc(x, WY, WR + .0005, a1, a0, true);
    const g = new THREE.ExtrudeGeometry(sh, { depth: .074, bevelEnabled: true, bevelThickness: .0015, bevelSize: .0012, bevelSegments: 2, curveSegments: 16 }); g.translate(0, 0, -.037); car.add(new THREE.Mesh(g, paint));
  }
  // greenhouse: upright windscreen, roof, long fastback C-pillar with a quarter window
  ext([[-.067, .0555], [.018, .051], [-.002, .0775], [-.034, .0785]], .054, glass, .0018);
  ext([[-.035, .0765], [-.001, .0755], [-.002, .0798], [-.034, .0808]], .057, paint, .0015);
  for (const s of [-1, 1]) {
    const z = s * .0272;
    beamIn(car, [.018, .0515, z], [-.002, .0778, z], .0032, paint);                                // A-pillar
    beamIn(car, [-.034, .0788, z], [-.066, .0562, z], .007, paint);                                // fastback C-pillar
    beamIn(car, [-.017, .052, z], [-.019, .078, z], .003, paint);                                  // B-pillar
    for (const [p, q] of [[[.016, .0525], [-.001, .0772]], [[-.001, .0774], [-.033, .0782]], [[-.033, .078], [-.06, .058]], [[-.06, .057], [.016, .0528]]])
      beamIn(car, [p[0], p[1], z + s * .0008], [q[0], q[1], z + s * .0008], .0011, chrome);       // thin chrome window frames
    box(paint, .007, .005, .004, .013, .0545, s * .0345);                                          // body-coloured mirror
    box(paint, .0015, .006, .0015, .015, .0515, s * .0335);
    box(chrome, .008, .0013, .0012, -.013, .043, s * .0335);                                       // door handle
    for (const x of [.019, -.028]) box(stripeK, .0006, .03, .0004, x, .033, s * .0333);              // door shut lines
  }
  // twin black stripes over hood, roof, fastback and deck
  for (const s of [-1, 1]) {
    const z = s * .0088, w = .0105, up = .0042;                                                  // sits on the bevelled skin
    beamIn(car, [.0805, .0472 + up, z], [.018, .0522 + up, z], .0001, stripeK).scale.set(w, .0012, .0628);
    box(stripeK, .033, .0012, w, -.018, .0808 + .0016, z);
    beamIn(car, [-.034, .0808 + .0016, z], [-.067, .0562 + up, z], .0001, stripeK).scale.set(w, .0012, .0405);
    box(stripeK, .013, .0012, w, -.074, .0545 + up, z);
  }
  box(stripeK, .004, .0035, .062, -.0805, .0565, 0);                                               // little black lip spoiler
  // nose: black recessed grille, two square lamps in black surrounds; tail: horizontal red lamps
  box(stripeK, .002, .016, .058, .0838, .03, 0);
  for (let i = 0; i < 5; i++) box(std(0x2a2c30, .4, .4), .0012, .0011, .03, .0848, .0245 + i * .0028, 0);
  for (const s of [-1, 1]) {
    box(stripeK, .0016, .0128, .0145, .0845, .0302, s * .0225);
    box(std(0xf4f6f8, .3, .15, { emissive: 0xfff2d8, emissiveIntensity: .55 }), .0012, .0098, .0115, .0856, .0302, s * .0225);
    box(red, .0016, .0055, .021, -.0838, .042, s * .018);
  }
  box(std(0x2a2c30, .3, .5), .003, .004, .066, .082, .0165, 0); box(std(0x2a2c30, .3, .5), .003, .004, .066, -.081, .0165, 0);   // dark valances
  // wheels: tall black tyres, matt black five-spoke rims with a bright centre cap
  const tyreG = new THREE.CylinderGeometry(.0205, .0205, .017, 28), shoulderG = new THREE.TorusGeometry(.0195, .0026, 8, 28), rimG = new THREE.CylinderGeometry(.0125, .0125, .0175, 22);
  for (const x of [-WX, WX]) for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(x, WY, s * .0315); car.add(w);
    const t2 = new THREE.Mesh(tyreG, rubber); t2.rotation.x = Math.PI / 2; w.add(t2);
    for (const e of [-1, 1]) { const sh2 = new THREE.Mesh(shoulderG, rubber); sh2.position.z = e * .0082; w.add(sh2); }
    const rim = new THREE.Mesh(rimG, rimM); rim.rotation.x = Math.PI / 2; w.add(rim);
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2, sp = box(rimM, .0034, .011, .0016, Math.sin(a) * .0055, Math.cos(a) * .0055, s * .0094, w); sp.rotation.z = -a; }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.0032, .0032, .02, 12), capM); hub.rotation.x = Math.PI / 2; w.add(hub);
  }
  box(stripeK, .15, .004, .06, 0, .0145, 0);                                                         // underside shadow
  // bobble-head driver: a spring neck under a big helmeted head
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(.0055, .0075, .014, 12), std(0x1d4f8f, .1, .6)); torso.position.set(-.02, .054, .011); car.add(torso);
  const head = new THREE.Group(); head.position.set(-.02, .06, .011); car.add(head);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(.0085, 18, 14), std(0xf3efe4, .3, .25)); helmet.position.y = .0062; head.add(helmet);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(.0086, 18, 10, -.9, 1.8, 1.1, .7), std(0x101418, .8, .08)); visor.position.y = .0062; visor.rotation.y = Math.PI; head.add(visor);
  const hstripe = new THREE.Mesh(new THREE.TorusGeometry(.0086, .0011, 6, 24, Math.PI), std(0x0f7f86, .3, .3)); hstripe.position.y = .0062; head.add(hstripe);
  // whip antenna with a ball on top
  const ant = new THREE.Group(); ant.visible = false; car.add(ant);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(.0006, .0009, .075, 6), chrome); rod.position.y = .0375; ant.add(rod);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.0042, 12, 10), std(0xff8a1f, .1, .35)); ball.position.y = .076; ant.add(ball);
  car.position.y = .0; carPivot.add(car); carPivot.position.y = .02;
  // coil spring + suction base
  const coil = new THREE.Group(), springPts = [];
  for (let i = 0; i <= 80; i++) { const a = i / 80 * Math.PI * 12; springPts.push(new THREE.Vector3(Math.cos(a) * .0065, i / 80 * .02, Math.sin(a) * .0065)); }
  coil.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(springPts), 200, .001, 6), chrome));
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.016, .021, .006, 28), std(0x2a2f36, .1, .5)); base.position.y = -.003;
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(.006, .009, .004, 16), std(0x3a4048, .1, .5)); cup.position.y = .002;
  holder.add(base, cup, coil, carPivot);
  holder.userData = { car, carPivot, coil, head, ant };
  holder.rotation.y = -.75; holder.scale.setScalar(1.3);
  camera.add(holder);
  return holder;
}
const TOYS = { p: 0, pv: 0, r: 0, rv: 0, h: 0, hv: 0, hp: 0, hpv: 0, hr: 0, hrv: 0, ap: 0, apv: 0, ar: 0, arv: 0 };
const toyLocal = new THREE.Vector3(), Y_AX = new THREE.Vector3(0, 1, 0);
/* inp: acc (m/s², + = speeding up), lat (m/s², + = pushed to the right), bump (rail-joint kick), vib (0..1 vibration level) */
function updateToy(dt, inp){
  toyLocal.set(inp.lat, 0, inp.acc).applyAxisAngle(Y_AX, -toy.rotation.y);      // the push the toy feels, in its own axes
  const fx = clamp(toyLocal.x, -16, 16), fz = clamp(toyLocal.z, -16, 16), S = TOYS, n = Math.max(1, Math.ceil(dt / .004)), h = dt / n;
  for (let i = 0; i < n; i++) {
    const nz = () => (Math.random() - .5) * inp.vib;
    const pa = -380 * S.p - 4.4 * S.pv - 11 * fx + nz() * 160;                 // body pitch: a push toward the nose tips it nose-down
    const ra = -380 * S.r - 4.4 * S.rv + 11 * fz + nz() * 160;                 // body roll
    const ha = -1400 * S.h - 14 * S.hv + inp.bump + nz() * 900;                // heave on the coil
    S.pv += pa * h; S.p += S.pv * h; S.rv += ra * h; S.r += S.rv * h; S.hv += ha * h; S.h += S.hv * h;
    const hpa = -120 * S.hp - 1.5 * S.hpv - pa * .85 - 7 * fx - ha * .015;     // bobble head: soft, barely damped, follows the body late
    const hra = -120 * S.hr - 1.5 * S.hrv - ra * .85 + 7 * fz;
    S.hpv += hpa * h; S.hp += S.hpv * h; S.hrv += hra * h; S.hr += S.hrv * h;
    const apa = -700 * S.ap - 2.4 * S.apv - pa * 1.3 - 12 * fx - ha * .03;     // whip antenna: stiffer, rings longer
    const ara = -700 * S.ar - 2.4 * S.arv - ra * 1.3 + 12 * fz;
    S.apv += apa * h; S.ap += S.apv * h; S.arv += ara * h; S.ar += S.arv * h;
  }
  S.p = clamp(S.p, -.5, .5); S.r = clamp(S.r, -.45, .45); S.h = clamp(S.h, -1, 1); S.hp = clamp(S.hp, -.6, .6); S.hr = clamp(S.hr, -.6, .6); S.ap = clamp(S.ap, -.7, .7); S.ar = clamp(S.ar, -.7, .7);
  const U = toy.userData;
  U.carPivot.rotation.set(S.r, 0, S.p); U.carPivot.position.y = .02 - S.h * .005;
  U.coil.rotation.set(S.r * .5, 0, S.p * .5); U.coil.scale.y = 1 - S.h * .25;
  U.head.rotation.set(S.hr, 0, S.hp); U.ant.rotation.set(S.ar, 0, S.ap);
}

function beamIn(grp, a, b, t, mat){
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), m = new THREE.Mesh(unit, mat);
  m.position.copy(A).add(B).multiplyScalar(.5); m.lookAt(B); m.scale.set(t, t, A.distanceTo(B)); grp.add(m); return m;
}
function addBox(grp, mat, x, y, z, sx, sy, sz, color){ const m = new THREE.Mesh(boxGeo, color ? M(color) : mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); grp.add(m); return m; }

/* straight track along local z from z0 down to z0-len */
function addTrack(grp, x, rusty = false, z0 = 0, len = TILE){
  const b = new THREE.Mesh(new THREE.PlaneGeometry(rusty ? 3.4 : 4.2, len), ballastMat);
  b.rotation.x = -Math.PI / 2; b.position.set(x, rusty ? .035 : .04, z0 - len / 2); grp.add(b);
  for (const s of [-.76, .76]) { const r = new THREE.Mesh(unit, rusty ? rustRailMat : railMat); r.position.set(x + s, .3, z0 - len / 2); r.scale.set(.08, .15, len); grp.add(r); }
  const n = Math.floor(len / SLEEP), sl = new THREE.InstancedMesh(sleeperGeo, rusty ? sleeperOldMat : sleeperMat, n), rr = rng(Math.round(x * 31 + z0 * 7 + 5));
  for (let i = 0; i < n; i++) { D.position.set(x + (rr() - .5) * .06, .16, z0 - .35 - i * SLEEP); D.rotation.set(0, (rr() - .5) * .03, 0); D.scale.set(1, 1, 1); D.updateMatrix(); sl.setMatrixAt(i, D.matrix); }
  grp.add(sl);
}
/* ground strip for one tile; UVs in metres so the texture lines up across tiles */
function addGround(grp, z0 = 0, z1 = -TILE, mat = groundMat){
  const len = z0 - z1, geo = new THREE.PlaneGeometry(G_W, len), uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * G_W / G_M, uv.getY(i) * len / G_M);
  const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.set(0, 0, (z0 + z1) / 2); grp.add(m);
  (grp.userData.grounds = grp.userData.grounds || []).push(m);
}
function bufferStop(grp, x, z){
  addBox(grp, null, x, 0, z, 2.4, 1.3, .5, 0x9e3328);
  addBox(grp, null, x, .55, z + .27, 2.4, .25, .05, 0xe8e2d4);
  for (const s of [-.9, .9]) addBox(grp, null, x + s, 0, z - .6, .3, .9, 1.4, 0x3a3631);
}
