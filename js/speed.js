/* ---------- sense of speed: air streaks, sleeper blur, edge blur, cab buzz ---------- */
// air streaks: thin lines hanging in the air beside the line; the train rushes through them, length ∝ speed (motion blur)
const STREAK_N = 240, streakSeed = rng(404), streakBase = [];
function streakPlace(i, zFar){
  const side = streakSeed() < .5 ? -1 : 1, x = side * (3.4 + Math.pow(streakSeed(), 1.6) * 18), y = .3 + Math.pow(streakSeed(), 1.7) * 5.5;
  streakBase[i] = { x, y, z: zFar ? -170 + streakSeed() * 20 : -170 + streakSeed() * 178 };
}
for (let i = 0; i < STREAK_N; i++) streakPlace(i, false);
const streakMat = new THREE.MeshBasicMaterial({ color: 0xf2f7ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
const streaks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), streakMat, STREAK_N); streaks.frustumCulled = false; scene.add(streaks);
const sleeperBase = sleeperMat.color.clone(), sleeperBlur = new THREE.Color(0x67625a);
const edgeBlur = document.getElementById('edgeblur');
let speedK = 0;
function updateSpeedFx(dt, sp){
  speedK += (sstep(.42, 1, sp) - speedK) * Math.min(1, dt * 3);
  const k = Math.max(speedK, nitroK * .8);
  // streaks (cab view only; outside they would cut through the train)
  streaks.visible = !viewOut && k > .01;
  if (streaks.visible) {
    const L = clamp(Math.abs(v) * .05, .5, 5) * (1 + nitroK * .6), dz = v * dt;
    for (let i = 0; i < STREAK_N; i++) {
      const s = streakBase[i]; s.z += dz;
      if (s.z > 10) streakPlace(i, true); else if (s.z < -175) s.z += 180;
      const th = .018 + Math.abs(s.x) * .0016;                          // farther streaks a little thicker so they stay visible
      D.position.set(s.x, s.y, s.z - L / 2); D.rotation.set(0, 0, 0); D.scale.set(th, th, L); D.updateMatrix(); streaks.setMatrixAt(i, D.matrix);
    }
    streaks.instanceMatrix.needsUpdate = true;
    streakMat.opacity = k * (tunK > .5 ? .3 : .4);
  }
  // sleepers smear into the ballast instead of strobing
  sleeperMat.color.copy(sleeperBase).lerp(sleeperBlur, sstep(.3, .85, sp) * .65);
  // soft blur round the edges of the view, and a faint buzz of the cab frame
  edgeBlur.style.opacity = (k * .95).toFixed(3);
  cab.style.transform = k > .05 && !RM ? `translate(${((Math.random() - .5) * 2.4 * k).toFixed(2)}px, ${((Math.random() - .5) * 2.4 * k).toFixed(2)}px)` : '';
}
