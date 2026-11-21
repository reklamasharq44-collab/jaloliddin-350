/* ---------- second main line: a track 4.6 m to the left that follows the route, with oncoming trains ---------- */
const ONC_X = -4.6, OX = p => trackX(p) + ONC_X;
let oncVer = -1, oncBase = 0;
const oncRoot = new THREE.Group(); worldRoot.add(oncRoot);
const oncGeoRoot = new THREE.Group(); oncRoot.add(oncGeoRoot);
const oncBallastTex = ballastTex.clone(); oncBallastTex.repeat.set(1, 1); oncBallastTex.needsUpdate = true;
const oncBallastMat = new THREE.MeshStandardMaterial({ map: oncBallastTex, roughness: 1, side: THREE.DoubleSide });
const oncRailMat = railMat.clone(); oncRailMat.side = THREE.DoubleSide;
const MAX_SL = 2800, oncSleepers = new THREE.InstancedMesh(sleeperGeo, sleeperMat, MAX_SL); oncSleepers.count = 0; oncRoot.add(oncSleepers);
const bufRed = M(0x9e3328), bufDark = M(0x3a3631);
function oncRangesAll(){                        // continuous stretches of the second line (none in the depot)
  const out = []; let cur = null;
  for (const s of segs) {
    if (s.route === 4) { cur = null; continue; }
    const cut = s.idx === 5 && s.locked && s.target === 4;
    if (!cur) { cur = { a: s.S + 3, b: 0, cut: false }; out.push(cur); }
    cur.b = cut ? s.S + BR_A - 6 : s.S + TILE; cur.cut = cut;
    if (cut) cur = null;
  }
  return out;
}
function oncBuffer(x, z, dir){
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const a = new THREE.Mesh(boxGeo, bufRed); a.scale.set(2.4, 1.3, .5); g.add(a);
  for (const s of [-1, 1]) { const b = new THREE.Mesh(boxGeo, bufDark); b.position.set(s * .9, 0, dir * .6); b.scale.set(.3, .9, 1.4); g.add(b); }
  oncGeoRoot.add(g);
}
function buildOnc(){
  oncBase = dist;
  oncGeoRoot.traverse(o => { if (o.userData.own) o.geometry.dispose(); }); oncGeoRoot.clear();
  const pa = dist - BEHIND - 60, pb = dist + AHEAD + 160; let ns = 0;
  for (const r of oncRangesAll()) {
    const a = Math.max(r.a, pa), b = Math.min(r.b, pb); if (b - a < 4) continue;
    const S = []; for (let p = a; p < b; p += 3) S.push(p); S.push(b);
    const bp = [], bu = [], bi = [];
    S.forEach((p, i) => { const x = OX(p), z = -(p - oncBase); bp.push(x - 2.1, .04, z, x + 2.1, .04, z); bu.push(0, p / 4, 1, p / 4); if (i) { const k = (i - 1) * 2; bi.push(k, k + 1, k + 3, k, k + 3, k + 2); } });
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); bg.setAttribute('uv', new THREE.Float32BufferAttribute(bu, 2)); bg.setIndex(bi); bg.computeVertexNormals();
    const bm = new THREE.Mesh(bg, oncBallastMat); bm.userData.own = true; oncGeoRoot.add(bm);
    for (const s of [-.76, .76]) {
      const rp = [], ri = [];
      S.forEach((p, i) => { const x = OX(p) + s, z = -(p - oncBase); rp.push(x - .04, .225, z, x - .04, .375, z, x + .04, .375, z, x + .04, .225, z);
        if (i) { const k = (i - 1) * 4; for (const f of [0, 1, 2]) ri.push(k + f, k + f + 1, k + f + 5, k + f, k + f + 5, k + f + 4); } });
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); rg.setIndex(ri); rg.computeVertexNormals();
      const rm = new THREE.Mesh(rg, oncRailMat); rm.userData.own = true; oncGeoRoot.add(rm);
    }
    for (let p = Math.ceil(a / SLEEP) * SLEEP; p < b && ns < MAX_SL; p += SLEEP, ns++) {
      D.position.set(OX(p), .16, -(p - oncBase)); D.rotation.set(0, -Math.atan(OX(p + .5) - OX(p - .5)), 0); D.scale.set(1, 1, 1); D.updateMatrix(); oncSleepers.setMatrixAt(ns, D.matrix);
    }
    if (r.a >= pa) oncBuffer(OX(r.a), -(r.a - 1 - oncBase), 1);
    if (r.cut && r.b <= pb) oncBuffer(OX(r.b), -(r.b + 1 - oncBase), -1);
  }
  oncSleepers.count = ns; oncSleepers.instanceMatrix.needsUpdate = true;
}
/* the oncoming trainset: same model, turned to face us */
const oncTrain = (() => { const o = new THREE.Group(), t = trainModel(3, { accent: 0x2b63c9, adBoards: true }); t.rotation.y = Math.PI; o.add(t); o.userData.t = t; o.visible = false; worldRoot.add(o); return o; })();
let onc = null, oncTimer = 10, oncSnd = null;
function oncHorn(){
  if (!ac || ac.state !== 'running') return;
  const t0 = ac.currentTime, g = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200;
  g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.09, t0 + .08); g.gain.setValueAtTime(.09, t0 + .7); g.gain.exponentialRampToValueAtTime(.0001, t0 + 1.1);
  [440, 523].forEach(f => { const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = f; o.connect(lp); o.start(t0); o.stop(t0 + 1.15); });
  lp.connect(g).connect(master);
}
function updateOncoming(dt){
  if (segVer !== oncVer || Math.abs(dist - oncBase) > 100) { buildOnc(); oncVer = segVer; }
  oncRoot.position.z = dist - oncBase;
  const R = oncRangesAll(), rangeAt = p => R.find(r => p >= r.a && p <= r.b);
  if (!onc) {
    oncTimer -= dt; if (chaserBusy()) oncTimer = Math.max(oncTimer, 2);
    if (oncTimer <= 0) {
      const rr = rangeAt(dist + AHEAD - 40);
      if (rr && rr.a < dist + 150) onc = { p: Math.min(dist + AHEAD - 40, rr.b - 20), v: 38 + Math.random() * 40, horn: false };
      else oncTimer = 4;
    }
  }
  if (onc) {
    onc.p -= onc.v * dt;
    const rr = rangeAt(onc.p);
    if (!rr || onc.p + 140 < dist - 160) { onc = null; oncTimer = 18 + Math.random() * 30; }
  }
  oncTrain.visible = !!onc;
  let near = 1e9;
  if (onc) {
    const x0 = OX(onc.p); oncTrain.position.set(x0, .32, dist - onc.p);
    for (const pt of oncTrain.userData.t.userData.parts) {
      const [bf, br] = pt.bogies, Xf = OX(onc.p + bf), Xr = OX(onc.p + br);
      pt.pivot.position.x = -((Xf + Xr) / 2 - x0); pt.pivot.rotation.y = Math.atan2(-(Xr - x0) + (Xf - x0), br - bf);
    }
    const dd = onc.p - dist; near = dd > 0 ? dd : dd > -112 ? 0 : -dd - 112;
    if (!onc.horn && dd < 650 && dd > 0) { onc.horn = true; oncHorn(); }
  }
  if (ac && master) {
    if (!oncSnd) {
      const src = ac.createBufferSource(), b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), ch = b.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
      src.buffer = b; src.loop = true; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = .7;
      const g = ac.createGain(); g.gain.value = 0; src.connect(bp).connect(g).connect(master); src.start(); oncSnd = { g, bp };
    }
    const rel = onc ? onc.v + Math.abs(v) : 0, target = onc ? .6 * clamp(rel / 70, .3, 1.6) / (1 + Math.pow(near / 22, 2)) : 0;
    oncSnd.g.gain.value += (target - oncSnd.g.gain.value) * Math.min(1, dt * 10);
    oncSnd.bp.frequency.value = 300 + rel * 8;
  }
}
