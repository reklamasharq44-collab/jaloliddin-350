toy = buildToy();
/* ---------- loop ---------- */
let fogBase = .0034, viaK = 0, hangK = 1;
let last = performance.now(), t = 0, infoT = 0, hudT = 0, onBridge = 0, tunK = 0, lastTrackX = 0;
const FOG_DAY = new THREE.Color(HORIZON), FOG_TUN = new THREE.Color(0x0b0a09);
function bump(dd){
  const x = mod(dd, JOINT); let y = 0;
  for (const o of AXLES) { const u = x - o; if (u > 0 && u < 1.5) y += Math.exp(-u * 5) * Math.sin(u * 14); }
  return y;
}
/* chase camera must never end up inside the train: inside the body's cross-section it is lifted onto an
   ellipse round the car (with margin), which narrows along the noses so the move stays smooth */
const TRAIN_SPAN = { cy: 3.26, rx: 2.35, ry: 2.5, tipF: () => playerTrain.position.z + .8 - NOSE_L - 1.1, tipR: () => playerTrain.position.z + 3 * 25.8 + NOSE_L + 1.1 };
function keepOutOfTrain(p, tx){
  const zF = TRAIN_SPAN.tipF(), zR = TRAIN_SPAN.tipR();
  if (p.z < zF - .6 || p.z > zR + .6) return;
  const L = NOSE_L + 1.1, k = Math.sqrt(clamp(Math.min(p.z - zF, zR - p.z) / L, 0, 1));
  const rx = .7 + (TRAIN_SPAN.rx - .7) * k, ry = .75 + (TRAIN_SPAN.ry - .75) * k, cy = 2.35 + (TRAIN_SPAN.cy - 2.35) * k;
  const xc = trackX(dist - p.z) - tx + bendAtZ(p.z), dx = (p.x - xc) / rx, dy = (p.y - cy) / ry;
  if (dx * dx + dy * dy >= 1) return;
  p.y = cy + ry * Math.sqrt(Math.max(0, 1 - dx * dx));                 // lift straight up onto the boundary: continuous, never under the floor
}
let leanSm = 0, frameN = 0, toyTurnPrev = 0;
const scareEl = document.getElementById('scare');
const loaderEl = document.getElementById('loader');
function frame(now){
  if (frameN < 4 && ++frameN === 3) { loaderEl.classList.add('done'); setTimeout(() => loaderEl.remove(), 900); } else if (frameN === 1) document.getElementById('ldBar').style.transform = 'scaleX(.95)';
  const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
  depotAutopilot(dist);
  step(dt);
  const sp = Math.abs(v) / VMAX;
  nitroK += ((nitroT > 0 ? 1 : 0) - nitroK) * Math.min(1, dt * (nitroT > 0 ? 5 : 1.5));
  camera.fov = baseFov + sp * 6 + sstep(.5, 1, sp) * 16 + nitroK * 10; camera.updateProjectionMatrix();
  updateSpeedFx(dt, sp);
  speedfx.style.opacity = Math.max(nitroK * (.55 + .2 * Math.sin(t * 40)), speedK * (.2 + .08 * Math.sin(t * 31))).toFixed(3);
  speedfx.style.transform = `scale(${1 + (t * 3 % 1) * .04})`;
  nitroBtn.classList.toggle('go', nitroT > 0); nitroBtn.classList.toggle('wait', nitroT <= 0 && nitroCd > 0);
  nitroBar.style.transform = `scaleX(${nitroT > 0 ? nitroT / NITRO_MAX : nitroCd > 0 ? 1 - nitroCd / NITRO_CD : 1})`;

  // world stream + sideways slide on the diverging branch
  AHEAD = clamp(480 + Math.abs(v) * 4.5, 480, 900);
  updateStream(dist);
  updateBend(dist);
  const tx = trackX(dist), slope = (trackX(dist + .5) - trackX(dist - .5));
  worldRoot.position.x = -tx;
  updateOncoming(dt);
  lastTrackX = tx;

  // where are we: bridge / tunnel
  const cur = segAt(dist), lp = dist - cur.S;
  const prNow = cur.idx * TILE + lp, bridgeNow = (cur.route === 0 && cur.idx === 3 && lp > -BRIDGE.z0 && lp < -BRIDGE.z1) || (cur.route === 3 && prNow > CAN.a && prNow < CAN.b) || (cur.route === 5 && prNow > BAY_BRIDGE.a && prNow < BAY_BRIDGE.b) ? 1 : 0;
  for (const ri of [3, 5, 6]) { const sc = ROUTES[ri].scenery; if (sc.userData.tick && attached.has(sc)) sc.userData.tick(t, dt); }
  onBridge += (bridgeNow - onBridge) * Math.min(1, dt * 4);
  const pr = cur.idx * TILE + lp;
  updateChaser(dt, cur, pr);
  scareEl.style.opacity = (CH.dark * (.55 + .25 * Math.sin(t * 7))).toFixed(3);
  const tunTarget = cur.route === 1 ? sstep(TUN.a - 8, TUN.a + 22, pr) * (1 - sstep(TUN.b - 28, TUN.b + 4, pr)) : 0;
  tunK = tunTarget;
  const htg = ROUTES[cur.route].tiles[cur.idx].userData.hangar;
  hangK += ((htg && lp > htg[0] - 4 && lp < htg[1] + 4 ? 1 : 0) - hangK) * Math.min(1, dt * 2.5);
  const seaT = cur.route === 6 ? sstep(UND.a - 6, UND.a + 4, pr) * (1 - sstep(UND.b - 4, UND.b + 6, pr)) : 0;
  seaK += (seaT - seaK) * Math.min(1, dt * 4);
  updateAtmos(dt, cur.route, cur.route === 6 && pr > UND.a + 12 && pr < UND.b - 12);
  hemi.intensity = atm.hemiI * (1 - .84 * tunK) * (1 - .42 * hangK) * (1 - .72 * night) + .05 * night; sun.intensity = atm.sunI * (1 - tunK) * (1 - .85 * hangK) * (1 - .8 * night) + .12 * night;
  fogBase = atm.dens;
  scene.fog.color.copy(atm.fog).lerp(FOG_TUN, tunK).lerp(NIGHT.fog, night * .85); scene.fog.density = fogBase + .006 * tunK + .0009 * night;
  const viaTarget = cur.route === 3 && prNow > CAN.rimA - 20 && prNow < CAN.rimB ? 1 : 0; viaK += (viaTarget - viaK) * Math.min(1, dt * 1.2);
  headlight.intensity = viewOut ? 0 : 2.8 * tunK + .8 * hangK + 3.2 * night; cabSpill.intensity = viewOut ? 1.6 * tunK : 1.1 * tunK + .5 * hangK + .5 * night; cabSpill.distance = viewOut ? 45 : 26;
  snow.visible = tunK < .5 && hangK < .5 && (atm.snow > .5 || atm.dust > .5);
  const dustK = atm.dust; snow.material.color.setRGB(.91 + .02 * dustK, .93 - .14 * dustK, .93 - .3 * dustK); snow.material.size = .07 - .03 * dustK; snow.material.opacity = .85 - .35 * dustK;
  const echo = Math.max(onBridge, tunK);
  if (rumble) { rumble.lp.frequency.value = 110 + sp * 520 - echo * 30; rumble.rg.gain.value = (.05 + Math.min(1, Math.abs(v) / 4) * (.12 + sp * .7)) * (1 + echo * .9); }
  if (whine) {
    const load = notch > 0 && rev ? notch / 6 : notch < 0 ? .3 : 0, f = 180 + Math.abs(v) * 22;
    whine.wo.frequency.value = f; whine.wo2.frequency.value = f * 1.5; whine.wbp.frequency.value = f * 1.2;
    whine.wg.gain.value += ((Math.abs(v) > .3 || load ? .025 + load * .07 : 0) - whine.wg.gain.value) * Math.min(1, dt * 3);
  }

  if (snow.visible) {
    const p = snowGeo.attributes.position.array;
    for (let i = 0; i < SN; i++) {
      p[i * 3 + 2] += (v + 1) * dt; p[i * 3 + 1] -= (1.1 - 1.3 * dustK) * dt; p[i * 3] += (Math.sin(t * .7 + i) * .25 + dustK * .9) * dt;
      if (p[i * 3 + 2] > 36) p[i * 3 + 2] -= 120; else if (p[i * 3 + 2] < -84) p[i * 3 + 2] += 120;
      if (p[i * 3 + 1] < 0) p[i * 3 + 1] += 22; else if (p[i * 3 + 1] > 22) p[i * 3 + 1] -= 22;
      if (p[i * 3] > 30) p[i * 3] -= 60;
    }
    snowGeo.attributes.position.needsUpdate = true;
  }
  const k = RM ? .25 : 1, mv = clamp(Math.abs(v) / 12, 0, 1), shk = k * (.35 + sp * .5 + speedK * .6 + nitroK * .9) * mv;
  lookX += (tLookX - lookX) * .03; lookY += (tLookY - lookY) * .03;
  const b = bump(odo), turn = Math.atan(slope);
  leanSm += (-curvAt(dist) * 130 * clamp(Math.abs(v) / 40, 0, 1) - leanSm) * Math.min(1, dt * 1.5);   // cant: the cab tilts into the curve
  if (!viewOut) {
  camera.position.set(Math.sin(t * .9) * .03 * shk, CAM_Y + (b * .025 + Math.sin(t * 6.1) * .004 + (Math.random() - .5) * .006 * sp * sp) * shk - Math.max(0, -acc) * .01 * mv, 0);
  camera.rotation.set(-.035 - viaK * .12 - lookY * .12 + b * .004 * shk + clamp(-acc, -2, 3) * .0025 * mv,
    Math.sin(t * .21) * .012 * shk - lookX * .25 - turn,
    Math.sin(t * .7) * .004 * shk - turn * .6 * Math.sign(v || 1) * mv + leanSm, 'YXZ');
  } else {
    // chase camera orbiting the lead car; pulled in tight inside tunnels
    const R2 = THREE.MathUtils.lerp(orbR, 15, tunK), el = THREE.MathUtils.lerp(orbEl, .31, tunK), az = THREE.MathUtils.lerp(orbAz, 0, tunK);
    const tx0 = 0, ty0 = 2.6, tz0 = 6;
    const want = new THREE.Vector3(tx0 + Math.sin(az) * Math.cos(el) * R2, ty0 + Math.sin(el) * R2, tz0 + Math.cos(az) * Math.cos(el) * R2);
    if (!camSm) camSm = want.clone(); camSm.lerp(want, Math.min(1, dt * 4));
    camera.position.copy(camSm); camera.position.y += b * .01 * shk;
    keepOutOfTrain(camera.position, tx);
    if (seaK < .01) {                                    // never inside the hills: keep above the terrain of canyon / coast / undersea routes
      const zc2 = camera.position.z, dC = dist - zc2, sC = segAt(dC), prC = sC.idx * TILE + (dC - sC.S);
      const fy = sC.route === 6 ? undY : sC.route === 5 ? coastY : sC.route === 3 ? canY : null;
      if (fy) { const gy = fy(camera.position.x - (trackX(dC) - tx) - bendAtZ(zc2), prC) + 2.5; if (camera.position.y < gy) camera.position.y = gy; }
    }
    if (seaK > .01) {                                    // undersea: the chase camera stays inside the tube / bore
      const ox = camera.position.x - (UND.cx + trackX(dist - camera.position.z) - tx + bendAtZ(camera.position.z)), oy = camera.position.y - UND.cy, rr = Math.hypot(ox, oy), lim = UND.R - 1.6;
      if (rr > lim) { const f = 1 + (lim / rr - 1) * seaK; camera.position.x -= ox * (1 - f); camera.position.y = UND.cy + oy * f; }
    }
    const k2 = clamp((Math.abs(az) - .25) / .8, 0, 1) * (1 - tunK);   // free orbit: keep the lead car in frame
    camera.lookAt(THREE.MathUtils.lerp(-Math.sin(az) * 4, 0, k2), THREE.MathUtils.lerp(THREE.MathUtils.lerp(-4.5, 2.4, tunK), 2.4, k2), THREE.MathUtils.lerp(-20 - Math.cos(az) * 2, 4, k2));
  }
  playerTrain.visible = viewOut; toy.visible = !viewOut;
  // articulated consist: every car sits on its own two bogies, so the set snakes through the switch
  for (const pt of playerTrain.userData.parts) {
    const bf = playerTrain.position.z + pt.bogies[0], br = playerTrain.position.z + pt.bogies[1];
    const xf = trackX(dist - bf) - tx, xr = trackX(dist - br) - tx;
    pt.pivot.position.x = (xf + xr) / 2; pt.pivot.rotation.y = Math.atan2(xr - xf, br - bf);
  }
  playerTrain.position.y = .32 + b * .01 * shk;
  playerTrain.userData.lamp.intensity = viewOut ? 3 * tunK + 1.2 * hangK + 1.6 * night : 0;
  { const nz = playerTrain.position.z - NOSE_L - .5;                                 // forward headlight beam at night (external view)
    trainBeam.position.set(0, 2.1, nz); trainBeamT.position.set(bendAtZ(nz - 150), 0, nz - 150);
    trainBeam.intensity = (viewOut && night > .05) ? 6 * night : 0; }
  // toy: sits on the console at the foot of the glass, bounces on rail joints and leans with speed changes
  { const D2 = .9, th = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), ny = 1 - 2 * cabWB, nx = innerWidth < 900 ? .55 : .42;
    const yawRate = (turn - toyTurnPrev) / Math.max(dt, 1e-3); toyTurnPrev = turn;
    updateToy(dt, { acc: clamp(acc, -16, 16), lat: clamp(-v * v * curvAt(dist) - v * yawRate * .5, -12, 12), bump: -b * shk * 260, vib: clamp(Math.abs(v) / VMAX, 0, 1) * (1 + nitroK) });
    toy.position.set(nx * th * camera.aspect * D2, ny * th * D2 - .004, -D2); }
  updateWarp(dt);
  updateJet(dt);
  hudT += dt; if (hudT > .033) { hudT = 0; drawHud(warpWorldHidden ? warpSpeedKmh : Math.abs(v) * 3.6); }
  infoT += dt; if (infoT > .1) { infoT = 0; updateInfo(); }
  renderScene();
  renderRear(); updateDash(dt);
  requestAnimationFrame(frame);
}
updateInfo();
requestAnimationFrame(frame);
