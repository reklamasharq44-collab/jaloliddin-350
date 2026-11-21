/* ---------- the black train: once per lap on the forest line a dark train comes up alongside on the other track,
   overtakes, crosses over onto OUR track just ahead and then keeps pace — fast when we are fast, slow when we are slow —
   creeping closer for a while before it runs off into the fog ---------- */
const CH_LEN = 3 * 25.8 + 2 * (NOSE_L + 1.1);                      // nose tip to tail tip
const CH_TIP = .8 - NOSE_L - 1.1;                                    // nose tip in the model's own z
const CH = { state: 'idle', lap: null, gp: 0, gv: 0, t: 0, gx: 0, horn: 0, beat: 0, dark: 0 };
const chTrain = (() => {
  const t = trainModel(3, { accent: 0x8a0d16 }), dark = new THREE.MeshPhysicalMaterial({ color: 0x0b0c0f, metalness: .25, roughness: .35, clearcoat: .6, clearcoatRoughness: .2, envMap: trainEnv, envMapIntensity: .3, side: THREE.DoubleSide });
  t.traverse(o => { if (o.isMesh && o.material === TM.paint) o.material = dark; if (o.isMesh && o.material === TM.glass) o.material = TM.wsGlass; });
  t.visible = false; worldRoot.add(t); return t;
})();
const chTail = new THREE.MeshBasicMaterial({ color: 0xff2a1a });
chTrain.traverse(o => { if (o.isMesh && o.material === TM.tail) o.material = chTail; });
const chGlow = [];                                                    // red eyes on its tail, the only bright thing about it
{ const sc = noseSec(.82, 1), zEnd = 3 * 25.8 - .8 + .8;
  const last = chTrain.userData.parts[chTrain.userData.parts.length - 1].pivot.children[0];
  for (const s of [-1, 1]) { const pt = surfPt(sc, s > 0 ? phiAt(sc, .33) : Math.PI - phiAt(sc, .33), .01), gl = new THREE.Sprite(glowMat.clone()); gl.material.color.set(0xff1a10); gl.position.set(pt[0] * .95, pt[1], zEnd + pt[2] + .3); gl.scale.set(2.6, 1.6, 1); last.add(gl); chGlow.push(gl); } }
/* crossover from the left line to ours, built where the black train decides to cross */
const CROSS_L = 120, crossX = u => ONC_X * (1 - sstep(0, CROSS_L, u));
const crossGrp = (() => {
  const g = new THREE.Group(), n = Math.floor(CROSS_L / SLEEP), sl = new THREE.InstancedMesh(sleeperGeo, sleeperMat, n);
  for (let i = 0; i < n; i++) { const u = i * SLEEP, x = crossX(u); D.position.set(x, .165, -u); D.rotation.set(0, -Math.atan(crossX(u + .5) - crossX(u - .5)), 0); D.scale.set(1, 1, 1); D.updateMatrix(); sl.setMatrixAt(i, D.matrix); }
  g.add(sl);
  for (let u = 0; u < CROSS_L; u += 4) {
    const x0 = crossX(u), x1 = crossX(u + 4);
    const bl = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 4.2), ballastMat); bl.rotation.set(-Math.PI / 2, 0, Math.atan2(x1 - x0, 4)); bl.position.set((x0 + x1) / 2, .036, -u - 2); g.add(bl);
    for (const s of [-.76, .76]) beamIn(g, [x0 + s, .3, -u], [x1 + s, .3, -u - 4.02], .08, railMat).scale.y = .15;
  }
  g.visible = false; worldRoot.add(g); return g;
})();
const chLat = p => p < CH.gx ? ONC_X : p > CH.gx + CROSS_L ? 0 : crossX(p - CH.gx);
function chaserBusy(){ return CH.state === 'approach' || CH.state === 'cross'; }
function heartBeat(){
  if (!ac || ac.state !== 'running') return;
  const t0 = ac.currentTime;
  for (const [dt0, a] of [[0, .5], [.22, .35]]) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(70, t0 + dt0); o.frequency.exponentialRampToValueAtTime(38, t0 + dt0 + .16);
    g.gain.setValueAtTime(.0001, t0 + dt0); g.gain.exponentialRampToValueAtTime(a, t0 + dt0 + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + dt0 + .2); o.connect(g).connect(master); o.start(t0 + dt0); o.stop(t0 + dt0 + .25); }
}
function chGap(){ return CH.gp - CH_LEN - (dist + 3.8); }        // our nose to its tail
function updateChaser(dt, cur, pr){
  const lapKey = cur.S - cur.idx * TILE;
  if (CH.state === 'idle') {
    if (cur.route === 0 && pr > 260 && pr < 1200 && CH.lap !== lapKey && v > 14 && rev === 1 && !onc && planned !== 4) {
      CH.lap = lapKey; CH.state = 'approach'; CH.gp = dist - 160; CH.gv = v; CH.t = 0; CH.gx = 1e12; CH.horn = 0;
    }
  }
  if (CH.state === 'idle') { chTrain.visible = crossGrp.visible = false; CH.dark += (0 - CH.dark) * Math.min(1, dt * 2); return; }
  CH.t += dt;
  const gap = chGap();
  let target;
  if (CH.state === 'approach') {                                  // overtakes on the left track
    target = Math.max(v, 8) + 16;
    if (!CH.horn && CH.gp > dist + 10) { CH.horn = 1; oncHorn(); }
    if (gap > 55) { CH.gx = CH.gp + 30; CH.state = 'cross'; }
  } else if (CH.state === 'cross') {                              // swings across in front of us
    target = v + clamp((95 - gap) * .6, -6, 14);
    if (CH.gp - CH_LEN > CH.gx + CROSS_L + 5) { CH.state = 'lead'; CH.t = 0; oncHorn(); }
  } else if (CH.state === 'lead') {                               // keeps pace, creeping closer
    const want = THREE.MathUtils.lerp(90, 24, sstep(0, 22, CH.t));
    target = gap < 12 ? v + 10 : v + clamp((gap - want) * -.5, -12, 12);
    CH.beat -= dt; if (CH.beat <= 0) { CH.beat = THREE.MathUtils.lerp(1.1, .62, sstep(0, 25, CH.t)); heartBeat(); }
    CH.horn -= dt; if (CH.horn <= 0) { CH.horn = 9 + Math.random() * 5; if (CH.t > 4) oncHorn(); }
    if (CH.t > 36 || cur.route === 4) { CH.state = 'leave'; CH.t = 0; }
  } else {                                                        // runs off into the fog
    target = Math.max(v, 20) + 20 + CH.t * 6;
    if (gap > 1300 || CH.t > 40) { CH.state = 'idle'; return; }
  }
  CH.gv += (Math.max(0, target) - CH.gv) * Math.min(1, dt * 1.6);
  CH.gp += CH.gv * dt;
  CH.dark += ((CH.state === 'lead' ? 1 : 0) - CH.dark) * Math.min(1, dt * 1.2);
  // place the articulated set: every car on its bogies, sideways where the crossover moves it
  const x0 = trackX(CH.gp) + chLat(CH.gp);
  chTrain.visible = true; chTrain.position.set(x0, .32, dist - CH.gp - CH_TIP);
  for (const pt of chTrain.userData.parts) {
    const [bf, br] = pt.bogies, pf = CH.gp + CH_TIP - bf, pb = CH.gp + CH_TIP - br;
    const xf = trackX(pf) + chLat(pf) - x0, xr = trackX(pb) + chLat(pb) - x0;
    pt.pivot.position.x = (xf + xr) / 2; pt.pivot.rotation.y = Math.atan2(xr - xf, br - bf);
  }
  const fl = CH.state === 'lead' && Math.floor(performance.now() / 260) % 2; chTail.color.setHSL(0, 1, fl ? .62 : .42);
  for (const gl of chGlow) gl.material.opacity = fl ? 1 : .6;
  crossGrp.visible = CH.gx < 1e11 && CH.gx - dist < AHEAD && CH.gx + CROSS_L > dist - 200;
  if (crossGrp.visible) crossGrp.position.set(trackX(CH.gx), 0, dist - CH.gx);
  if (CH.state === 'lead' && gap < 400) warn(`ВНИМАНИЕ! Поезд на нашем пути — ${Math.max(0, Math.round(gap))} м`);
}
