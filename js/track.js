/* ---------- snow ---------- */
const SN = 1400, snowPos = new Float32Array(SN * 3), sr = rng(77);
for (let i = 0; i < SN; i++) { snowPos[i * 3] = (sr() - .5) * 60; snowPos[i * 3 + 1] = sr() * 22; snowPos[i * 3 + 2] = -sr() * 90 + 6; }
const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xe9ecec, size: .07, transparent: true, opacity: .85, depthWrite: false }));
scene.add(snow);

/* ---------- track stream: segments of TILE (480 m), appended ahead, a junction at the end of every route ---------- */
let AHEAD = 480; const BEHIND = 300;   // look-ahead grows with speed (480–900 m); the route locks when the tile after a junction is built
const segs = []; let segVer = 0;
let planned = null;                              // driver's pick for the next junction (route index); null = go on in order
const SHORT = ['Лес', 'Горы', 'Станция', 'Каньон', 'Депо', 'Побережье', 'Под водой'];
const autoNext = from => ORDER[(ORDER.indexOf(from) + 1) % ORDER.length];
function makeSeg(route, idx, S, xOff, ghost){
  const s = { route, idx, S, xOff, ghost: ghost || 0, choice: 0, locked: false };
  if (idx === 5) { s.user = planned !== null; s.target = s.user ? planned : autoNext(route); s.choice = s.target === 4 ? 1 : 0; }   // only the depot leaves the main line
  return s;
}
segs.push(makeSeg(4, 0, -2 * TILE, 0), makeSeg(4, 1, -TILE, 0));
segs.push(makeSeg(0, 0, 0, 0, 0));
const MIN_DIST = -2 * TILE + 40;      // just short of the buffer stop behind the depot
function appendSeg(){
  const last = segs[segs.length - 1];
  if (last.route === 4) { const n = last.idx !== 1 ? makeSeg(4, 1, last.S + TILE, last.xOff) : makeSeg(0, 0, last.S + TILE, last.xOff); n.arrive = last.idx !== 1 && last.arrive; segs.push(n); return; }
  if (last.idx === 5) {
    last.locked = true;
    const nr = last.target;
    const n = makeSeg(nr, nr === 4 ? 2 : 0, last.S + TILE, last.xOff + (last.choice ? SH : 0), last.choice ? -1 : 0); n.arrive = nr === 4; segs.push(n);
  } else segs.push(makeSeg(last.route, last.idx + 1, last.S + TILE, last.xOff));
  segVer++;
}
function segAt(d){ for (let i = segs.length - 1; i >= 0; i--) if (d >= segs[i].S) return segs[i]; return segs[0]; }
function nextJunction(d){ for (const s of segs) if (s.idx === 5 && s.S + BR_A > d) return s; return null; }
function junctionDist(d){
  const j = nextJunction(d); if (j) return j.S + BR_A - d;
  const c = segAt(d);
  if (c.route === 4) return c.S + (c.idx === 1 ? 1 : 2) * TILE + 5 * TILE + BR_A - d;
  return c.S + (5 - c.idx) * TILE + BR_A - d + (c.idx === 5 ? 6 * TILE : 0);
}
function junctionFrom(d){ const c = segAt(d), j = nextJunction(d); if (!j && c.route === 4) return 0; return j ? j.route : (c.idx === 5 && d > c.S + BR_A ? c.target : c.route); }
function upcomingRoute(d){ const j = nextJunction(d); return j ? j.target : (planned !== null ? planned : autoNext(junctionFrom(d))); }
function userPick(d){ const j = nextJunction(d); return j ? (j.user ? j.target : null) : planned; }
function setSwitch(d, target){                     // target: route index, or null for "in order"
  const j = nextJunction(d);
  if (j && j.locked) return false;
  planned = target;
  if (j) { j.user = target !== null; j.target = j.user ? target : autoNext(j.route); j.choice = j.target === 4 ? 1 : 0; }
  return true;
}
function toggleSwitch(d){ const j = nextJunction(d), cur = j ? (j.user ? j.target : null) : planned; return setSwitch(d, cur === 4 ? null : 4); }
const DEPOT_STOP = 150;                              // stop mark inside the hangar (metres into the hangar tile)
function depotStopS(d){
  const c = segAt(d);
  if (c.route === 4 && c.arrive) return c.done ? null : (c.idx === 2 ? c.S + TILE : c.S) + DEPOT_STOP;
  const j = nextJunction(d);
  if (j && j.target === 4) return j.S + 2 * TILE + DEPOT_STOP;
  if (!j && planned === 4) return d + junctionDist(d) - BR_A + 2 * TILE + DEPOT_STOP;
  return null;
}
let autoBrake = false;
function depotAutopilot(d){
  const sS = depotStopS(d); autoBrake = false;
  if (sS === null) return;
  const rem = sS - d;
  if (v > .05) {
    const need = v * v / (2 * Math.max(1, rem - 4));
    if (rem < 3 || need > 1.05) { autoBrake = true; if (notch >= 0) setNotch(-1); }
  } else if (Math.abs(rem) < 40) {
    const c = segAt(d); if (c.route === 4 && c.arrive) { for (const s2 of segs) if (s2.route === 4 && s2.arrive && s2.S <= d + TILE) s2.done = true; }
    setNotch(0);
  }
}
let passedJ = null;
function checkPassed(d){ const c = segAt(d); if (c.idx === 5 && d > c.S + BR_A && passedJ !== c) { passedJ = c; planned = null; } }
function trackX(d){
  const s = segAt(d);
  return s.idx === 5 && s.choice && s.locked ? s.xOff + lat(d - s.S) : s.xOff;
}
/* curvature along the line (1/m, + = to the right): straights and long gentle curves, none in the depot */
const CURVES = [[400, 1400, 1 / 2600], [1900, 3000, -1 / 2200], [3600, 4300, 1 / 3200], [4700, 5900, -1 / 2800]], CURVE_P = 6400, CURVE_RAMP = 160;
function curvAt(d){
  if (segAt(d).route === 4) return 0;
  const p = mod(d, CURVE_P);
  for (const [a, b, c] of CURVES) if (p > a && p < b) return c * sstep(a, a + CURVE_RAMP, p) * (1 - sstep(b - CURVE_RAMP, b, p));
  return 0;
}
function updateBend(d){
  const a = bendU.value, SUB = 4, ds = BEND_STEP / SUB; a[BEND_I0] = 0;
  for (const dir of [-1, 1]) {                   // -1: ahead (z < 0), +1: behind
    let x = 0, h = 0, s = 0;
    for (let i = BEND_I0 + dir; i >= 0 && i < BEND_N; i += dir) {
      for (let k = 0; k < SUB; k++) { const c = curvAt(d - dir * (s + ds / 2)); h += c * ds; x += h * ds; s += ds; }
      a[i] = x;
    }
  }
}
const attached = new Set();
function updateStream(d){
  while (segs[segs.length - 1].S + TILE < d + AHEAD) appendSeg();
  checkPassed(d);
  const want = new Set();
  for (const s of segs) {
    if (s.S > d + AHEAD || s.S + TILE < d - BEHIND) continue;
    const g = ROUTES[s.route].tiles[s.idx];
    want.add(g); g.position.set(s.xOff, 0, d - s.S);
    if (s.idx === 5) setJunctionLook(g, s.choice);
    if (g.userData.grounds) for (const gm of g.userData.grounds) gm.position.x = Math.round(s.xOff / G_M) * G_M - s.xOff;
    if (s.ghost) { const gh = s.ghost < 0 ? ghosts.L : ghosts.R; want.add(gh); gh.position.set(s.xOff + s.ghost * SH, 0, d - s.S); }
  }
  // route-wide scenery (canyon, coast): placed for the run the camera is in, or the next one ahead
  const c = segAt(d), cpr = c.idx * TILE + (d - c.S);
  for (const ri of [3, 5, 6]) {
    const sc = ROUTES[ri].scenery; let run = null;
    if (c.route === ri && cpr < ROUTES[ri].sceneryEnd) run = { S: c.S - c.idx * TILE, x: c.xOff };
    else for (const s2 of segs) if (s2.route === ri && s2.idx === 0 && s2.S > d) { run = { S: s2.S, x: s2.xOff }; break; }
    if (run && run.S - d < AHEAD + 500) { want.add(sc); sc.position.set(run.x, 0, d - run.S); }
  }
  for (const g of attached) if (!want.has(g)) { worldRoot.remove(g); attached.delete(g); }
  for (const g of want) if (!attached.has(g)) { worldRoot.add(g); attached.add(g); }
}
updateStream(0);
