/* ---------- controller lever ---------- */
const slot = document.getElementById('slot'), handle = document.getElementById('handle'), marks = document.getElementById('marks');
NOTCHES.forEach(nv => {
  const s = document.createElement('span'); s.textContent = NOTCH_NAME[nv] ?? nv; s.dataset.n = nv;
  if (nv < 0) s.className = 'br';
  s.addEventListener('click', () => setNotch(nv));
  marks.appendChild(s);
});
function notchX(nv){ const i = NOTCHES.indexOf(nv), w = slot.clientWidth; return 16 + i * (w - 32) / (NOTCHES.length - 1); }
function placeHandle(){
  handle.style.left = notchX(notch) + 'px';
  document.getElementById('brk').style.width = (notchX(0) - 6) + 'px';
  const m = marks.getBoundingClientRect(), sl = slot.getBoundingClientRect();
  [...marks.children].forEach((sp, i) => { sp.style.position = 'absolute'; sp.style.left = (sl.left - m.left + notchX(NOTCHES[i]) - 8) + 'px'; });
  document.getElementById('cNotch').textContent = notch > 0 ? `Тяга ${Math.round(notch / 6 * 100)}%` : notch === 0 ? 'Выбег' : notch === -1 ? 'Тормоз' : 'Экстренный';
}
function setNotch(nv){
  nv = clamp(nv, -2, 6); if (nv === notch) return;
  if (nv < 0 && nv < notch && Math.abs(v) > 1) hiss(nv === -2 ? 1.4 : .6);
  if (notch < 0 && nv >= 0) hiss(.35);
  notch = nv; placeHandle(); slot.setAttribute('aria-valuenow', nv);
  if (nv <= 0 && nitroT > 0) { nitroT = 0; nitroCd = NITRO_CD; }
  [...marks.children].forEach(s => s.classList.toggle('on', +s.dataset.n === nv));
}
function notchFromY(clientY){
  const rct = slot.getBoundingClientRect(), y = clientY - rct.left;
  let best = notch, bd = 1e9;
  NOTCHES.forEach(nv => { const dd = Math.abs(notchX(nv) - y); if (dd < bd) { bd = dd; best = nv; } });
  return best;
}
slot.addEventListener('pointerdown', e => { slot.setPointerCapture(e.pointerId); slot.classList.add('drag'); setNotch(notchFromY(e.clientX)); });
slot.addEventListener('pointermove', e => { if (slot.hasPointerCapture(e.pointerId)) setNotch(notchFromY(e.clientX)); });
slot.addEventListener('pointerup', e => { slot.classList.remove('drag'); });
slot.addEventListener('keydown', e => {
  if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { setNotch(notch + 1); e.preventDefault(); e.stopPropagation(); }
  if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { setNotch(notch - 1); e.preventDefault(); e.stopPropagation(); }
});
const revBox = document.getElementById('rev');
function setRev(r){
  if (r === rev) return;
  if (Math.abs(v) > .3) { warn('Сначала остановите поезд'); return; }
  rev = r; [...revBox.children].forEach(b => b.classList.toggle('on', +b.dataset.v === r));
}
revBox.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setRev(+b.dataset.v); });
const depBtn = document.getElementById('depBtn');
function flipSwitch(){ if (!toggleSwitch(dist)) warn('Маршрут уже задан, стрелку не перевести'); updateInfo(); }
depBtn.addEventListener('click', flipSwitch);
const nitroBtn = document.getElementById('nitro'), nitroBar = document.getElementById('nitroBar'), speedfx = document.getElementById('speedfx');
nitroBtn.addEventListener('click', () => { if (!ac) startSound(); else if (ac.state !== 'running') ac.resume(); nitro(); });
const hornBtn = document.getElementById('horn');
hornBtn.addEventListener('pointerdown', e => { hornBtn.setPointerCapture(e.pointerId); hornOn(); });
['pointerup', 'pointercancel'].forEach(ev => hornBtn.addEventListener(ev, hornOff));
hornBtn.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { hornOn(); e.preventDefault(); e.stopPropagation(); } });
hornBtn.addEventListener('keyup', e => { if (e.key === 'Enter' || e.key === ' ') hornOff(); });

addEventListener('keydown', e => {
  if (e.target.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
  const k = e.key.toLowerCase();
  if (k === 'arrowup' || k === 'arrowright' || k === 'w' || k === 'd' || k === 'ц' || k === 'в') { setNotch(notch + 1); e.preventDefault(); }
  else if (k === 'arrowdown' || k === 'arrowleft' || k === 's' || k === 'a' || k === 'ы' || k === 'ф') { setNotch(notch - 1); e.preventDefault(); }
  else if (k === ' ') { setNotch(-2); e.preventDefault(); }
  else if (k === 'r' || k === 'к') setRev(rev === 1 ? 0 : rev === 0 ? -1 : 1);
  else if ((k === 'e' || k === 'у') && !e.repeat) flipSwitch();
  else if ((k === 'h' || k === 'р') && !e.repeat) hornOn();
  else if ((k === 'c' || k === 'с') && !e.repeat) setView(!viewOut);
  else if ((k === 'n' || k === 'т' || k === 'shift') && !e.repeat) nitro();
});
addEventListener('keyup', e => { const k = e.key.toLowerCase(); if (k === 'h' || k === 'р') hornOff(); });

/* ---------- info plate ---------- */
const $ = id => document.getElementById(id);
const fmt = (x, d) => x.toFixed(d).replace('.', ',');
function updateInfo(){
  const kmh = Math.abs(v) * 3.6;
  $('iSpd').textContent = Math.round(kmh);
  $('iAcc').textContent = (acc >= 0 ? '+' : '−') + fmt(Math.abs(acc), 2) + ' м/с²';
  $('iNotch').textContent = notch > 0 ? `Тяга ${Math.round(notch / 6 * 100)}%` : notch === 0 ? 'Выбег (0)' : notch === -1 ? 'Торможение' : 'Экстренное';
  $('iRev').textContent = rev === 1 ? 'Вперёд' : rev === -1 ? 'Назад' : 'Нейтраль';
  $('iOdo').textContent = fmt(odo / 1000, 2) + ' км';
  const s = Math.floor(ride); $('iTime').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  $('iPress').textContent = `${fmt(tm, 1)} / ${fmt(tc, 1)} атм`;
  $('iPow').textContent = Math.round(amp).toLocaleString('ru-RU') + ' кВт';
  const cr = segAt(dist), jd = junctionDist(dist), nj = nextJunction(dist), up = upcomingRoute(dist), pick = userPick(dist), locked = nj && nj.locked, fr = junctionFrom(dist);
  $('iRoute').textContent = ROUTES[cr.route].name;
  $('iSw').textContent = `${jd > 999 ? fmt(jd / 1000, 1) + ' км' : Math.round(jd) + ' м'} → ${SHORT[up]}${locked ? ' ✓' : ''}`;
  $('iSw').title = 'Дальше: ' + ROUTES[upcomingRoute(dist)].name;
  const sd = $('swDist');
  const toDepot = up === 4, cur4 = cr.route === 4 && cr.arrive;
  depBtn.classList.toggle('on', toDepot || (cur4 && !cr.done));
  depBtn.disabled = !!locked || cur4;
  depBtn.textContent = cur4 ? (cr.done ? 'Поезд в депо' : 'Заезжаем в депо…') : locked ? (toDepot ? 'В депо · маршрут задан' : 'Маршрут задан') : toDepot ? 'Едем в депо ✓ · отменить' : 'Заехать в депо';
  $('rNote').innerHTML = cur4 ? (cr.done ? 'Стоим в депо. Включите тягу, чтобы выехать' : 'Автоторможение до места стоянки')
    : toDepot ? 'На стрелке свернём в <b>депо</b> и остановимся' : `Прямо по главному ходу: дальше <b>${SHORT[up]}</b>`;
  sd.textContent = locked ? 'задано' : (jd > 999 ? fmt(jd / 1000, 1) + ' км' : Math.round(jd) + ' м'); sd.classList.toggle('lock', !!locked);
  const st = $('iStatus'); let txt, cls = '';
  if (performance.now() < warnUntil) { txt = warnText; cls = 'warn'; }
  else if (kmh > 470) { txt = 'Превышение скорости'; cls = 'bad'; }
  else if (autoBrake) { txt = 'Автоторможение: остановка в депо'; cls = 'warn'; }
  else if (jd < 400 && v > .5 && notch >= 0 && up === 4) { txt = `Стрелка в депо через ${Math.round(jd)} м`; cls = 'warn'; }
  else if (cr.route === 4 && kmh < 2 && notch <= 0) { txt = 'Депо: переведите контроллер на тягу (→), чтобы выехать'; cls = 'warn'; }
  else if (notch === -2) { txt = kmh > 1 ? 'Экстренное торможение' : 'Стоим · экстренный тормоз'; cls = 'bad'; }
  else if (notch === -1) { txt = kmh > 1 ? 'Служебное торможение' : 'Стоим на тормозе'; cls = 'warn'; }
  else if (notch > 0 && rev === 0) { txt = 'Реверс в нейтрали, тяги нет'; cls = 'warn'; }
  else if (notch > 0) txt = `Тяга ${notch} · ${Math.round(notch / 6 * 100)}%` + (rev === -1 ? ' · назад' : '');
  else txt = kmh > 1 ? 'Выбег' : 'Стоим';
  st.textContent = txt; st.className = 'status' + (cls ? ' ' + cls : '');
}

/* ---------- UI ---------- */
const fsBtn = document.getElementById('fs');
fsBtn.addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  else document.documentElement.requestFullscreen?.().catch(() => {});
});
document.addEventListener('fullscreenchange', () => { fsBtn.textContent = document.fullscreenElement ? 'Выйти' : 'Полный экран'; });
let wake = null; const askWake = () => navigator.wakeLock?.request('screen').then(w => wake = w).catch(() => {});
addEventListener('pointerdown', askWake, { once: true });
document.addEventListener('visibilitychange', () => { if (!document.hidden && wake) askWake(); });
let idleT; const wakeUi = () => { document.body.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => document.body.classList.add('idle'), 3000); };
['pointermove', 'pointerdown', 'keydown'].forEach(e => addEventListener(e, wakeUi)); wakeUi();
let lookX = 0, lookY = 0, tLookX = 0, tLookY = 0;
const viewBtn = document.getElementById('viewBtn');
function setView(out){ viewOut = out; camSm = null; document.body.classList.toggle('out', out); viewBtn.textContent = out ? 'Вид из кабины' : 'Вид снаружи'; if (!out) { camera.rotation.order = 'YXZ'; } }
viewBtn.addEventListener('click', () => setView(!viewOut));
let drag = null;
canvas.addEventListener('pointerdown', e => { if (!viewOut) return; drag = { x: e.clientX, y: e.clientY, az: orbAz, el: orbEl }; canvas.setPointerCapture(e.pointerId); document.body.classList.add('dragging'); });
canvas.addEventListener('pointermove', e => { if (!drag) return; orbAz = drag.az - (e.clientX - drag.x) * .006; orbEl = clamp(drag.el + (e.clientY - drag.y) * .004, .03, 1.2); });
['pointerup', 'pointercancel'].forEach(ev => canvas.addEventListener(ev, () => { drag = null; document.body.classList.remove('dragging'); }));
canvas.addEventListener('wheel', e => { if (!viewOut) return; e.preventDefault(); orbR = clamp(orbR * (1 + Math.sign(e.deltaY) * .1), 12, 90); }, { passive: false });
addEventListener('pointermove', e => { if (e.pointerType && e.pointerType !== 'mouse') return; if (e.target === canvas || e.target === document.body) { tLookX = (e.clientX / innerWidth - .5); tLookY = (e.clientY / innerHeight - .5); } });   // head-look follows the mouse only, not touch


let baseFov = 62;
function resize(){
  const W = innerWidth, H = innerHeight;
  renderer.setSize(W, H, false); camera.aspect = W / H;
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(W, H); bloomPass && bloomPass.setSize(W, H); }
  baseFov = W / H < 1 ? 78 : 62; camera.fov = baseFov; camera.updateProjectionMatrix();
  drawCab(); sizeHud(); placeHandle();
}
addEventListener('resize', resize); resize();
[...marks.children].forEach(s => s.classList.toggle('on', +s.dataset.n === notch));
