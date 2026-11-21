/* ---------- supersonic warp: a blink to black, then the whole world is gone and the train flies through a starfield;
   when it ends the blink reverses and everything comes back exactly as it was ---------- */
const WARP_HOLD = 7, WARP_CD = 20, WARP_BLACK = .45, WARP_REVEAL = .65;
let warpState = 'off', warpT = 0, warpCd = 0, warpSpeedKmh = 0, warpWorldHidden = false, warpTravel = 0;
const warpActive = () => warpState !== 'off';

/* starfield lives in camera space, so it always fills the view ahead whatever the camera does */
const warpGroup = new THREE.Group(); warpGroup.visible = false; warpGroup.frustumCulled = false; camera.add(warpGroup);
const WSTARS = 1300, warpStars = [], WSPREAD = 150;
function placeStar(i, far){ warpStars[i] = { x: (Math.random() - .5) * WSPREAD, y: ((Math.random() * .6) - .1) * WSPREAD, z: far ? -(440 + Math.random() * 90) : -(5 + Math.random() * 525), h: Math.random() }; }
for (let i = 0; i < WSTARS; i++) placeStar(i, false);
const warpStarMat = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const warpMesh = new THREE.InstancedMesh(unit, warpStarMat, WSTARS); warpMesh.frustumCulled = false; warpMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); warpGroup.add(warpMesh);
const warpColObj = new THREE.Color();
const _wd = new THREE.Vector3(), _wq = new THREE.Quaternion();   // temps for the horizon fade
const warpCore = new THREE.Sprite(glowMat.clone()); warpCore.material.color.set(0x9fc4ff); warpCore.position.set(0, 0, -40); warpCore.scale.set(52, 52, 1); warpGroup.add(warpCore);
const warpBg = new THREE.Color(0x02030a), warpHemiCol = new THREE.Color(0x9fb8ff);
let warpSavedBg = null, warpSavedHemiI = 0, warpSavedSunI = 0;

const warpFadeEl = document.getElementById('warpfade');
function warpBoom(){
  if (!ac || ac.state !== 'running') return;
  const t0 = ac.currentTime;
  const src = ac.createBufferSource(); src.buffer = noiseBuf(2.4);
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = .8; bp.frequency.setValueAtTime(120, t0); bp.frequency.exponentialRampToValueAtTime(6000, t0 + .5); bp.frequency.exponentialRampToValueAtTime(400, t0 + 2.2);
  const g = ac.createGain(); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.9, t0 + .12); g.gain.exponentialRampToValueAtTime(.02, t0 + 2.3);
  src.connect(bp).connect(g).connect(master); src.start(t0); src.stop(t0 + 2.4);
  const o = ac.createOscillator(), og = ac.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(40, t0); o.frequency.exponentialRampToValueAtTime(520, t0 + 1.6);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
  og.gain.setValueAtTime(.0001, t0); og.gain.exponentialRampToValueAtTime(.4, t0 + .1); og.gain.exponentialRampToValueAtTime(.001, t0 + 1.8);
  o.connect(lp).connect(og).connect(master); o.start(t0); o.stop(t0 + 1.9);
}
function warpDrone(on){                                        // a steady hum while flying
  if (!ac || ac.state !== 'running') return;
  if (on && !warpDrone.n) {
    const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
    o.type = 'sawtooth'; o2.type = 'sine'; o.frequency.value = 70; o2.frequency.value = 140; lp.type = 'lowpass'; lp.frequency.value = 700;
    g.gain.value = 0; o.connect(lp); o2.connect(lp); lp.connect(g).connect(master); o.start(); o2.start();
    warpDrone.n = { o, o2, g };
  }
  if (warpDrone.n) warpDrone.n.g.gain.setTargetAtTime(on ? .22 : 0, ac.currentTime, .3);
}

function warp(){
  if (warpState !== 'off') return;
  if (warpCd > 0) { warn(`Сверхзвук заряжается: ${Math.ceil(warpCd)} с`); return; }
  if (rev !== 1) { warn('Сверхзвук только при реверсе «Вперёд»'); return; }
  const cr = segAt(dist); if (cr.route === 4) { warn('В депо сверхзвук не работает'); return; }
  warpState = 'in'; warpT = 0; warpSpeedKmh = Math.abs(v) * 3.6; warpBoom(); warpDrone(true);
}
function setWorldWarp(hidden){
  if (warpWorldHidden === hidden) return; warpWorldHidden = hidden;
  // keep the road and the whole world visible so the speed is physically felt; only darken the sky and add the starfield
  skyDome.visible = !hidden; warpGroup.visible = hidden;
  if (hidden) { warpSavedBg = scene.background; scene.background = warpBg; }
  else { scene.background = warpSavedBg; }                 // sky colour is overwritten by updateAtmos next frame
}
function animateStars(dt){
  const sp = 340 + warpTravel * .4;
  camera.getWorldQuaternion(_wq);                             // fade stars out at/below the horizon so none rise from the ground
  for (let i = 0; i < WSTARS; i++) {
    const s = warpStars[i]; s.z += sp * dt; if (s.z > 8) placeStar(i, true);
    _wd.set(s.x, s.y, s.z).normalize().applyQuaternion(_wq);
    const sky = clamp((_wd.y + .03) / .16, 0, 1);             // 0 below horizon → 1 up in the sky
    const near = clamp(1 - (-s.z) / 540, 0, 1), len = clamp(sp * .045 + near * 22, 2, 34), th = (.12 + near * .5) * sky;
    D.position.set(s.x, s.y, s.z - len / 2); D.rotation.set(0, 0, 0); D.scale.set(th, th, len * (.25 + .75 * sky)); D.updateMatrix(); warpMesh.setMatrixAt(i, D.matrix);
    const b = (.25 + near * near * 1.6) * sky, warm = s.h > .86;   // bright near, a few golden among the blue-white
    warpColObj.setRGB(b * (warm ? 1 : .62), b * (warm ? .82 : .72), b * (warm ? .42 : 1)); warpMesh.setColorAt(i, warpColObj);
  }
  warpMesh.instanceMatrix.needsUpdate = true; if (warpMesh.instanceColor) warpMesh.instanceColor.needsUpdate = true;
  warpCore.material.opacity = .14 + .08 * Math.sin(performance.now() / 110);
  warpGroup.rotation.z += dt * .05;                            // a slow roll of the whole starfield
}
function updateWarp(dt){
  if (warpState === 'off') { if (warpCd > 0) warpCd = Math.max(0, warpCd - dt); warpFadeEl.style.opacity = '0'; warpBtn.classList.toggle('wait', warpCd > 0); warpBtn.classList.remove('go'); return; }
  warpT += dt; let fade = 0;
  if (warpState === 'in') {
    if (warpT < WARP_BLACK) fade = warpT / WARP_BLACK;
    else { setWorldWarp(true); fade = clamp(1 - (warpT - WARP_BLACK) / WARP_REVEAL, 0, 1); if (warpT > WARP_BLACK + WARP_REVEAL) { warpState = 'hold'; warpT = 0; } }
  } else if (warpState === 'hold') {
    warpSpeedKmh += (4800 - warpSpeedKmh) * Math.min(1, dt * .5);
    warpTravel = Math.min(900, warpTravel + dt * 320); dist += warpTravel * dt;   // really cover ground: new scenery on the way out
    if (warpT > WARP_HOLD) { warpState = 'out'; warpT = 0; warpDrone(false); }
  } else {
    if (warpT < WARP_BLACK) { fade = warpT / WARP_BLACK; warpSpeedKmh += (350 - warpSpeedKmh) * Math.min(1, dt * 4); }
    else { setWorldWarp(false); warpTravel = 0; fade = clamp(1 - (warpT - WARP_BLACK) / WARP_REVEAL, 0, 1); if (warpT > WARP_BLACK + WARP_REVEAL) { warpState = 'off'; warpCd = WARP_CD; warpSpeedKmh = 0; } }
  }
  warpFadeEl.style.opacity = (fade * .4).toFixed(3);          // a light boom-flash, not a black-out
  warpBtn.classList.toggle('go', warpWorldHidden);
  if (warpWorldHidden) {                                       // keep the road; pin only the dark sky + starfield each frame (updateWarp runs last)
    skyDome.visible = false; warpGroup.visible = true;
    scene.background = warpBg;
    animateStars(dt);
  }
}
const warpBtn = document.getElementById('warp');
warpBtn.addEventListener('click', e => { e.stopPropagation(); if (!ac) startSound(); else if (ac.state !== 'running') ac.resume(); warp(); });
addEventListener('keydown', e => { const k = e.key.toLowerCase(); if ((k === 'b' || k === 'и') && !e.repeat && !e.target.closest('input,textarea')) warp(); });
