/* ---------- living cab instruments: annunciator lamps, analog gauges, navigator, rear-view monitor ---------- */
const dash = document.createElement('canvas'); dash.id = 'dash'; cab.after(dash);
const dx2 = dash.getContext('2d');
let DL = null;                                         // layout (CSS px)
const spring = (s, target, dt, k = 60, c = 9) => { s.vel += ((target - s.val) * k - s.vel * c) * dt; s.val += s.vel * dt; return s.val; };
const gTM = { val: 5, vel: 0 }, gTC = { val: 0, vel: 0 }, gPW = { val: 0, vel: 0 }, gKV = { val: 25, vel: 0 };

function layoutDash(){
  const W = innerWidth, H = innerHeight, d = Math.min(devicePixelRatio || 1, 2);
  dash.width = W * d; dash.height = H * d; dx2.setTransform(d, 0, 0, d, 0, 0);
  const wb = H * cabWB, info = document.querySelector('.info').getBoundingClientRect(), hr = hud.getBoundingClientRect(), cr = document.querySelector('.ctrl').getBoundingClientRect();
  const gL = { x: info.right + 14, y: hr.top, w: hr.left - info.right - 28, h: hr.height }, gR = { x: hr.right + 14, y: hr.top, w: cr.left - hr.right - 28, h: hr.height };
  const mw = clamp(W * .16, 150, 300), mh = mw * 9 / 16, inset = W * .026 + Math.min(W, H) * .07;
  DL = { W, H, wb, gauges: gL.w >= 110 && W > 900 ? gL : null, nav: gR.w >= 110 && W > 900 ? gR : null,
    mon: W > 700 ? { x: W - inset - mw, y: H * .05 + H * .035, w: mw, h: mh } : null };
  sizeRear();
}

/* --- annunciator lamps along the console lip --- */
function lamp(x, y, w, h, label, on, col){
  dx2.save();
  dx2.fillStyle = on ? col : 'rgba(30,38,46,.92)'; dx2.strokeStyle = on ? col : 'rgba(120,150,175,.25)'; dx2.lineWidth = 1;
  if (on) { dx2.shadowColor = col; dx2.shadowBlur = 12; dx2.globalAlpha = .92; }
  dx2.beginPath(); dx2.roundRect ? dx2.roundRect(x, y, w, h, 3) : dx2.rect(x, y, w, h); dx2.fill(); dx2.shadowBlur = 0; dx2.globalAlpha = 1; dx2.stroke();
  dx2.fillStyle = on ? 'rgba(10,14,18,.9)' : 'rgba(150,180,200,.45)'; dx2.font = `700 ${Math.max(7, h * .55)}px "Segoe UI", Arial, sans-serif`;
  dx2.textAlign = 'center'; dx2.textBaseline = 'middle'; dx2.fillText(label, x + w / 2, y + h / 2 + .5);
  dx2.restore();
}
function drawLamps(now){
  if (innerWidth < 900) return;                       // phones: skip the lamp strip, it crowds the compact panels
  const { W, wb } = DL, h = 14, y = wb + 19, lw = clamp(W * .03, 34, 52), gap = 6, blink = Math.floor(now / 350) % 2 === 0;
  const up = upcomingRoute(dist), jd = junctionDist(dist), cr = segAt(dist), kmh = Math.abs(v) * 3.6;
  const oncNear = onc && onc.p - dist > -120 && onc.p - dist < 700;
  const chNear = CH.state === 'lead' && chGap() < 160;
  const als = kmh > 330 || notch === -2 || chNear ? 'r' : autoBrake || (up === 4 && jd < 900) || nitroT > 0 ? 'y' : 'g';
  const left = [
    ['ТЯГА', notch > 0 && rev !== 0, '#4fd2ff'], ['ТОРМ', tc > .3, '#ff5a4e'], ['ЭКСТР', notch === -2 && blink, '#ff3b30'],
    ['ДВЕРИ', true, cr.route === 4 && kmh < 1 ? '#ffb547' : '#3fe08a'], ['ПАНТ', true, '#3fe08a']
  ];
  const right = [
    ['ФАРЫ', tunK > .3 || hangK > .3, '#f3f6ff'], ['НИТРО', nitroT > 0 ? blink : nitroCd <= 0, nitroT > 0 ? '#ff8a3d' : '#3fe08a'],
    ['ВСТР', (oncNear || CH.state === 'approach') && blink, CH.state === 'approach' ? '#ff5a4e' : '#5c9dff'], ['ДЕПО', up === 4 || (cr.route === 4 && cr.arrive && !cr.done), '#ffb547']
  ];
  const span = n => n * lw + (n - 1) * gap;
  let x = W / 2 - Math.max(140, W * .1) - span(left.length);
  for (const [l, on, c] of left) { lamp(x, y, lw, h, l, on, c); x += lw + gap; }
  x = W / 2 + Math.max(140, W * .1);
  for (const [l, on, c] of right) { lamp(x, y, lw, h, l, on, c); x += lw + gap; }
  // ALS cab signal: three round lamps
  x += 6; dx2.save();
  for (const [k, c] of [['g', '#3fe08a'], ['y', '#ffc23a'], ['r', '#ff3b30']]) {
    const on = als === k && (k !== 'r' || blink);
    dx2.fillStyle = on ? c : 'rgba(30,38,46,.95)'; if (on) { dx2.shadowColor = c; dx2.shadowBlur = 14; }
    dx2.beginPath(); dx2.arc(x + h / 2, y + h / 2, h / 2 - .5, 0, 7); dx2.fill(); dx2.shadowBlur = 0;
    dx2.strokeStyle = 'rgba(120,150,175,.3)'; dx2.stroke(); x += h + 4;
  }
  dx2.fillStyle = 'rgba(150,180,200,.45)'; dx2.font = '700 8px "Segoe UI", Arial, sans-serif'; dx2.textAlign = 'left'; dx2.textBaseline = 'middle'; dx2.fillText('АЛС', x + 2, y + h / 2);
  dx2.restore();
}

/* --- analog gauges --- */
function gauge(cx0, cy0, R, title, unit, max, step, needles, readout){
  dx2.save();
  const bez = dx2.createRadialGradient(cx0 - R * .3, cy0 - R * .4, R * .2, cx0, cy0, R * 1.08);
  bez.addColorStop(0, '#3a434c'); bez.addColorStop(1, '#0d1115');
  dx2.fillStyle = bez; dx2.beginPath(); dx2.arc(cx0, cy0, R * 1.07, 0, 7); dx2.fill();
  const face = dx2.createRadialGradient(cx0, cy0 - R * .3, R * .1, cx0, cy0, R);
  face.addColorStop(0, '#1d2630'); face.addColorStop(1, '#0a0e12');
  dx2.fillStyle = face; dx2.beginPath(); dx2.arc(cx0, cy0, R * .97, 0, 7); dx2.fill();
  const A0 = Math.PI * .75, A1 = Math.PI * 2.25, ang = x => A0 + (A1 - A0) * clamp(x / max, 0, 1.04);
  dx2.lineCap = 'round';
  for (let s = 0; s <= max + 1e-6; s += step / 2) {
    const a = ang(s), major = Math.abs(s / step - Math.round(s / step)) < 1e-6, r0 = R * (major ? .74 : .8);
    dx2.strokeStyle = major ? 'rgba(220,235,245,.8)' : 'rgba(160,190,210,.4)'; dx2.lineWidth = major ? 1.6 : 1;
    dx2.beginPath(); dx2.moveTo(cx0 + Math.cos(a) * r0, cy0 + Math.sin(a) * r0); dx2.lineTo(cx0 + Math.cos(a) * R * .87, cy0 + Math.sin(a) * R * .87); dx2.stroke();
    if (major) { dx2.fillStyle = 'rgba(200,220,235,.75)'; dx2.font = `600 ${Math.max(7, R * .13)}px Consolas, monospace`; dx2.textAlign = 'center'; dx2.textBaseline = 'middle'; dx2.fillText(+s.toFixed(1), cx0 + Math.cos(a) * R * .58, cy0 + Math.sin(a) * R * .58); }
  }
  dx2.fillStyle = 'rgba(79,210,255,.75)'; dx2.font = `700 ${Math.max(7, R * .12)}px "Segoe UI", Arial, sans-serif`; dx2.textAlign = 'center';
  dx2.fillText(title, cx0, cy0 + R * .36); dx2.fillStyle = 'rgba(150,180,200,.6)'; dx2.font = `600 ${Math.max(7, R * .1)}px "Segoe UI", Arial, sans-serif`; dx2.fillText(unit, cx0, cy0 + R * .52);
  if (readout) { dx2.fillStyle = '#e8f3fa'; dx2.font = `700 ${Math.max(8, R * .14)}px Consolas, monospace`; dx2.fillText(readout, cx0, cy0 + R * .74); }
  for (const [val, col, w] of needles) {
    const a = ang(val);
    dx2.strokeStyle = col; dx2.lineWidth = w; dx2.shadowColor = col; dx2.shadowBlur = 6;
    dx2.beginPath(); dx2.moveTo(cx0 - Math.cos(a) * R * .14, cy0 - Math.sin(a) * R * .14); dx2.lineTo(cx0 + Math.cos(a) * R * .84, cy0 + Math.sin(a) * R * .84); dx2.stroke();
  }
  dx2.shadowBlur = 0; dx2.fillStyle = '#58626c'; dx2.beginPath(); dx2.arc(cx0, cy0, R * .08, 0, 7); dx2.fill();
  // glass glint
  const gl = dx2.createLinearGradient(cx0 - R, cy0 - R, cx0 + R * .2, cy0 + R * .2); gl.addColorStop(0, 'rgba(255,255,255,.1)'); gl.addColorStop(.5, 'rgba(255,255,255,0)');
  dx2.fillStyle = gl; dx2.beginPath(); dx2.arc(cx0, cy0, R * .97, 0, 7); dx2.fill();
  dx2.restore();
}
function drawGauges(dt){
  const r = DL.gauges, mw = amp / 1000, sp = Math.abs(v) / VMAX;
  spring(gTM, tm, dt, 40, 8); spring(gTC, tc, dt, 40, 8); spring(gPW, mw + (Math.random() - .5) * .08 * mw, dt, 30, 6);
  spring(gKV, 25 + Math.sin(performance.now() / 700) * .25 - mw * .06 + (Math.random() - .5) * .15, dt, 20, 6);
  const sideBy = r.w > r.h * 1.1, R = sideBy ? Math.min(r.h * .44, (r.w - 16) / 4.3) : Math.min(r.w * .44, (r.h - 16) / 4.3);
  const c1 = sideBy ? [r.x + r.w / 2 - R * 1.12, r.y + r.h / 2] : [r.x + r.w / 2, r.y + r.h / 2 - R * 1.12];
  const c2 = sideBy ? [r.x + r.w / 2 + R * 1.12, r.y + r.h / 2] : [r.x + r.w / 2, r.y + r.h / 2 + R * 1.12];
  gauge(c1[0], c1[1], R, 'ТМ · ТЦ', 'атм', 10, 2, [[gTM.val, '#f2f5f7', 2], [gTC.val, '#ff5a4e', 2.2]], `${gTM.val.toFixed(1)} / ${gTC.val.toFixed(1)}`.replace(/\./g, ','));
  gauge(c2[0], c2[1], R, 'ТЯГА', 'МВт', 12, 2, [[gPW.val, '#4fd2ff', 2.2]], `${gKV.val.toFixed(1).replace('.', ',')} кВ`);
}

/* --- navigator: the line ahead as a map, with curves, structures, oncoming train --- */
function featureAt(d){
  const s = segAt(d), pr = s.idx * TILE + (d - s.S);
  if (s.route === 0 && pr > 3 * TILE + 84 && pr < 3 * TILE + 156) return ['#7aa7bd', 'мост'];
  if (s.route === 1 && pr > TUN.a && pr < TUN.b) return ['#5b6470', 'туннель'];
  if (s.route === 2 && pr > 2 * TILE + 30 && pr < 2 * TILE + 210) return ['#3d7bd6', 'станция'];
  if (s.route === 3 && pr > CAN.a && pr < CAN.b) return ['#c98a5a', 'виадук'];
  if (s.route === 5 && pr > BAY_BRIDGE.a && pr < BAY_BRIDGE.b) return ['#4fb3d9', 'мост'];
  if (s.route === 5 && Math.abs(pr - COAST.cape) < 60) return ['#ff5a4e', 'маяк'];
  if (s.route === 6 && pr > UND.a && pr < UND.b) return ['#2fd3c1', 'под водой'];
  if (s.route === 4) return ['#ffb547', 'депо'];
  return null;
}
function drawNav(){
  const r = DL.nav, x0 = r.x, y0 = r.y, w = r.w, h = r.h;
  dx2.save();
  dx2.fillStyle = '#060b10'; dx2.strokeStyle = 'rgba(79,210,255,.35)'; dx2.lineWidth = 1.5;
  dx2.beginPath(); dx2.roundRect ? dx2.roundRect(x0, y0, w, h, 10) : dx2.rect(x0, y0, w, h); dx2.fill(); dx2.stroke(); dx2.clip();
  // grid
  dx2.strokeStyle = 'rgba(79,210,255,.06)'; dx2.lineWidth = 1;
  for (let gx = x0; gx < x0 + w; gx += 18) { dx2.beginPath(); dx2.moveTo(gx, y0); dx2.lineTo(gx, y0 + h); dx2.stroke(); }
  for (let gy = y0; gy < y0 + h; gy += 18) { dx2.beginPath(); dx2.moveTo(x0, gy); dx2.lineTo(x0 + w, gy); dx2.stroke(); }
  dx2.fillStyle = 'rgba(79,210,255,.8)'; dx2.font = '700 9px "Segoe UI", Arial, sans-serif'; dx2.textAlign = 'left'; dx2.textBaseline = 'top';
  dx2.fillText('НАВИГАТОР · 3 КМ', x0 + 10, y0 + 8);
  // path ahead
  const RANGE = 3000, STEP = 40, mapTop = y0 + 26, mapBot = y0 + h - 34, sc = (mapBot - mapTop) / RANGE, cxm = x0 + w / 2;
  const pts = []; let px = 0, hd = 0;
  for (let s = 0; s <= RANGE; s += STEP) { pts.push([s, px]); const c = curvAt(dist + s + STEP / 2); hd += c * STEP; px += hd * STEP; }
  const P = ([s, x]) => [cxm + x * sc, mapBot - s * sc];
  const line = (off, col, wd) => { dx2.strokeStyle = col; dx2.lineWidth = wd; dx2.beginPath(); pts.forEach((p, i) => { const [a, b] = P(p); i ? dx2.lineTo(a + off, b) : dx2.moveTo(a + off, b); }); dx2.stroke(); };
  dx2.lineJoin = 'round'; dx2.lineCap = 'round';
  line(-6, 'rgba(150,170,190,.35)', 2);                  // oncoming line
  line(0, 'rgba(79,210,255,.85)', 3);
  // structures + route boundaries
  let lastF = null, lastR = segAt(dist).route;
  for (let i = 0; i < pts.length; i++) {
    const d = dist + pts[i][0], f = featureAt(d), sg = segAt(d);
    if (f && i) { const [a1, b1] = P(pts[i - 1]), [a2, b2] = P(pts[i]); dx2.strokeStyle = f[0]; dx2.lineWidth = 6; dx2.beginPath(); dx2.moveTo(a1, b1); dx2.lineTo(a2, b2); dx2.stroke(); }
    if (f && (!lastF || lastF[1] !== f[1])) { const [a, b] = P(pts[i]); dx2.fillStyle = f[0]; dx2.font = '600 9px "Segoe UI", Arial, sans-serif'; dx2.textAlign = 'left'; dx2.textBaseline = 'middle'; dx2.fillText(f[1], a + 9, b); }
    if (sg.route !== lastR) { const [a, b] = P(pts[i]); dx2.fillStyle = '#e8f3fa'; dx2.beginPath(); dx2.arc(a, b, 3.5, 0, 7); dx2.fill(); dx2.font = '700 9px "Segoe UI", Arial, sans-serif'; dx2.textAlign = 'right'; dx2.textBaseline = 'middle'; dx2.fillText(ROUTES[sg.route].name, a - 8, b); lastR = sg.route; }
    lastF = f;
  }
  // oncoming train
  if (onc) { const ds = onc.p - dist; if (ds > -40 && ds < RANGE) { const i = clamp(Math.round(ds / STEP), 0, pts.length - 1), [a, b] = P(pts[i]); dx2.fillStyle = '#5c9dff'; dx2.shadowColor = '#5c9dff'; dx2.shadowBlur = 8; dx2.beginPath(); dx2.arc(a - 6, b, 4, 0, 7); dx2.fill(); dx2.shadowBlur = 0; } }
  // the black train
  if (CH.state !== 'idle') { const ds = CH.gp - dist; if (ds > -150 && ds < RANGE) { const i = clamp(Math.round(ds / STEP), 0, pts.length - 1), [a, b] = P(pts[i]), off = chLat(CH.gp) * 1.3; dx2.fillStyle = '#ff3b30'; dx2.shadowColor = '#ff3b30'; dx2.shadowBlur = 10; dx2.beginPath(); dx2.arc(a + off, b, 4.5, 0, 7); dx2.fill(); dx2.shadowBlur = 0; } }
  // own train
  const [ta, tb] = P(pts[0]); dx2.fillStyle = '#4fd2ff'; dx2.shadowColor = '#4fd2ff'; dx2.shadowBlur = 10;
  dx2.beginPath(); dx2.moveTo(ta, tb - 9); dx2.lineTo(ta - 6, tb + 5); dx2.lineTo(ta + 6, tb + 5); dx2.closePath(); dx2.fill(); dx2.shadowBlur = 0;
  // readouts
  const jd = junctionDist(dist), up = upcomingRoute(dist), fmtK = m => m > 999 ? (m / 1000).toFixed(1).replace('.', ',') + ' км' : Math.round(m) + ' м';
  dx2.fillStyle = 'rgba(200,225,240,.85)'; dx2.font = '600 9px "Segoe UI", Arial, sans-serif'; dx2.textAlign = 'left'; dx2.textBaseline = 'bottom';
  dx2.fillText(`${up === 4 ? 'Депо' : SHORT[up]}: ${fmtK(jd)}`, x0 + 10, y0 + h - 18);
  dx2.fillStyle = onc ? '#5c9dff' : 'rgba(150,180,200,.5)';
  dx2.fillText(onc ? `Встречный: ${fmtK(Math.max(0, onc.p - dist))}` : 'Встречных нет', x0 + 10, y0 + h - 6);
  const c = curvAt(dist); dx2.textAlign = 'right'; dx2.fillStyle = 'rgba(200,225,240,.7)';
  dx2.fillText(Math.abs(c) < 1e-5 ? 'прямая' : `R ${Math.round(1 / Math.abs(c) / 100) / 10} км ${c > 0 ? '↱' : '↰'}`, x0 + w - 10, y0 + h - 6);
  dx2.restore();
}

/* --- rear-view monitor: a camera on the right cab pod looking back along the train --- */
const rearRT = new THREE.WebGLRenderTarget(384, 216);
const rearCam = new THREE.PerspectiveCamera(46, 16 / 9, .3, 3600); rearCam.position.set(2.75, 4.0, 11.5); rearCam.lookAt(1.7, 2.6, 80);
const rearMat = new THREE.MeshBasicMaterial({ map: rearRT.texture, depthTest: false, depthWrite: false }); rearMat.userData.noBend = true; rearMat.customProgramCacheKey = () => 'nobend';
const rearQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), rearMat), rearScene = new THREE.Scene(); rearScene.add(rearQuad);
const rearOrtho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
rearQuad.geometry.attributes.uv.array.forEach((u, i, a) => { if (i % 2 === 0) a[i] = 1 - u; });   // mirror image, like a real rear-view screen
function sizeRear(){ if (DL && DL.mon) rearRT.setSize(Math.round(DL.mon.w * 1.25), Math.round(DL.mon.h * 1.25)); }
let rearTick = 0;
function renderRear(){
  if (viewOut || !DL || !DL.mon) return;
  const m = DL.mon;
  if (rearTick++ % 2 === 0) {                       // refresh the feed every other frame
    const pv = playerTrain.visible, tv = toy.visible, sv = streaks.visible;
    playerTrain.visible = true; toy.visible = false; streaks.visible = false;
    renderer.setRenderTarget(rearRT); renderer.render(scene, rearCam); renderer.setRenderTarget(null);
    playerTrain.visible = pv; toy.visible = tv; streaks.visible = sv;
  }
  const H = innerHeight;
  renderer.autoClear = false; renderer.setScissorTest(true);
  renderer.setViewport(m.x, H - m.y - m.h, m.w, m.h); renderer.setScissor(m.x, H - m.y - m.h, m.w, m.h);
  renderer.render(rearScene, rearOrtho);
  renderer.setScissorTest(false); renderer.setViewport(0, 0, innerWidth, innerHeight); renderer.autoClear = true;
}
function drawMonitorBezel(now){
  const m = DL.mon; dx2.save();
  dx2.fillStyle = '#0b0f13'; dx2.beginPath(); dx2.roundRect ? dx2.roundRect(m.x - 7, m.y - 7, m.w + 14, m.h + 24, 9) : dx2.rect(m.x - 7, m.y - 7, m.w + 14, m.h + 24);
  dx2.rect(m.x, m.y, m.w, m.h); dx2.fill('evenodd');
  dx2.strokeStyle = 'rgba(120,150,175,.35)'; dx2.lineWidth = 1; dx2.strokeRect(m.x - .5, m.y - .5, m.w + 1, m.h + 1);
  // scanlines + vignette over the feed
  dx2.fillStyle = 'rgba(0,0,0,.12)'; for (let y = m.y; y < m.y + m.h; y += 3) dx2.fillRect(m.x, y, m.w, 1);
  const vg = dx2.createRadialGradient(m.x + m.w / 2, m.y + m.h / 2, m.h * .3, m.x + m.w / 2, m.y + m.h / 2, m.w * .62);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); dx2.fillStyle = vg; dx2.fillRect(m.x, m.y, m.w, m.h);
  dx2.font = '700 9px "Segoe UI", Arial, sans-serif'; dx2.textBaseline = 'middle'; dx2.textAlign = 'left';
  dx2.fillStyle = Math.floor(now / 600) % 2 ? '#ff3b30' : 'rgba(255,59,48,.3)'; dx2.beginPath(); dx2.arc(m.x + 2, m.y + m.h + 9, 3, 0, 7); dx2.fill();
  dx2.fillStyle = 'rgba(200,225,240,.75)'; dx2.fillText('КАМЕРА · ВИД НАЗАД', m.x + 10, m.y + m.h + 9);
  dx2.textAlign = 'right'; dx2.fillText(`${Math.round(Math.abs(v) * 3.6)} км/ч`, m.x + m.w, m.y + m.h + 9);
  dx2.restore();
}

let dashT = 0, dashLast = performance.now();
function updateDash(dt){
  if (viewOut || !DL) return;
  dashT += dt; if (dashT < 1 / 20) return;
  const now = performance.now(), ddt = Math.min(.2, (now - dashLast) / 1000); dashLast = now; dashT = 0;
  dx2.clearRect(0, 0, DL.W, DL.H);
  drawLamps(now);
  if (DL.gauges) drawGauges(ddt);
  if (DL.nav) drawNav();
  if (DL.mon) drawMonitorBezel(now);
}
addEventListener('resize', layoutDash); layoutDash();
