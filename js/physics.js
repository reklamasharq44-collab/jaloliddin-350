/* ---------- train state & physics ---------- */
const NOTCHES = [-2, -1, 0, 1, 2, 3, 4, 5, 6];
const NOTCH_NAME = { '-2': 'Э', '-1': 'Т', 0: '0' };
const FORCE = [0, .16, .52, 1.22, 2.6, 5.5, 11.5]; // per notch; top speeds ≈ 110/190/270/350/430/500 km/h
const ADH = 2.6;                                        // adhesion limit, m/s²
let notch = 0, rev = 1, v = 0, dist = DEPOT_START, odo = 0, acc = 0, tm = 5, tc = 0, amp = 0, ride = 0;
let warnText = '', warnUntil = 0;
const NITRO_V = 420 / 3.6, NITRO_MAX = 8, NITRO_CD = 12;
let nitroT = 0, nitroCd = 0, nitroK = 0;          // active seconds, cooldown left, visual intensity 0..1
function nitro(){
  if (nitroT > 0) return;
  if (nitroCd > 0) { warn(`Нитро заряжается: ${Math.ceil(nitroCd)} с`); return; }
  if (rev !== 1) { warn('Нитро только при реверсе «Вперёд»'); return; }
  if (v >= NITRO_V - 1) { warn('Уже 420 км/ч'); return; }
  const cr = segAt(dist); if (cr.route === 4 && !cr.done && depotStopS(dist) != null) { warn('В депо нитро не работает'); return; }
  if (notch < 5) setNotch(5);
  nitroT = NITRO_MAX; nitroBoom();
}
function step(dt){
  const dir = v > .02 ? 1 : v < -.02 ? -1 : 0;
  let a = 0;
  if (notch > 0 && rev !== 0) a += rev * Math.min(ADH, FORCE[notch] * Math.max(0, 1 - Math.abs(v) / 175));
  const opp = dir || 0;
  a -= opp * (.02 + .00012 * v * v);
  // brakes act through brake-cylinder pressure
  const tcTarget = notch === -1 ? 1.8 : notch === -2 ? 4.5 : 0;
  const tmTarget = notch === -1 ? 4.4 : notch === -2 ? .3 : 5;
  tc += (tcTarget - tc) * Math.min(1, dt * (notch === -2 ? 2.5 : 1.2));
  tm += (tmTarget - tm) * Math.min(1, dt * (notch === -2 ? 3 : 1));
  a -= opp * tc * .9;
  if (nitroT > 0) {
    nitroT -= dt;
    a += 14 * (1 - sstep(NITRO_V - 6, NITRO_V, v));
    if (v >= NITRO_V - .3 || nitroT <= 0) { nitroT = 0; nitroCd = NITRO_CD; }
  } else if (nitroCd > 0) nitroCd = Math.max(0, nitroCd - dt);
  const nv = v + a * dt;
  v = (dir !== 0 && Math.sign(nv) !== dir && (notch <= 0 || rev !== dir)) ? 0 : clamp(nv, -VMAX, VMAX);
  acc += (a - acc) * Math.min(1, dt * 3);
  if (dir === 0 && v === 0) acc = 0;
  amp += ((notch > 0 && rev ? Math.min(ADH, FORCE[notch] * Math.max(0, 1 - Math.abs(v) / 175)) * 80 * Math.max(Math.abs(v), 2) : 0) - amp) * Math.min(1, dt * 2); // kW for an 80 t trainset
  dist += v * dt; odo += Math.abs(v) * dt;
  if (dist < MIN_DIST) { dist = MIN_DIST; if (v < 0) { v = 0; warn('Тупик: дальше назад пути нет'); } }
  if (Math.abs(v) > .1) ride += dt;
}
function warn(t){ warnText = t; warnUntil = performance.now() + 2500; }
