/* ---------- cab overlay ---------- */
const cab = document.getElementById('cab'), cx = cab.getContext('2d'); let cabWB = .655;
function drawCab(){
  const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  cab.width = W * dpr; cab.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const mob = W < 900;                                                      // phones: shorter windshield so the console has room
  const wx = W * .018, wy = H * .05, ww = W - wx * 2, wb = H * (mob ? .56 : .655); cabWB = wb / H; const rad = Math.min(W, H) * .085, bow = H * .028, inset = W * .008;
  // graphite cab interior
  const g = cx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#151a20'); g.addColorStop(.62, '#0c0f13'); g.addColorStop(1, '#06080a');
  cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  const r = rng(31);
  for (let i = 0; i < 4000; i++) { const v = r() * 255; cx.fillStyle = `rgba(${v},${v},${v},.018)`; cx.fillRect(r() * W, r() * H, 1 + r() * 8, 1); }
  // panoramic windshield: convex top edge, big rounded corners, slightly flared lower sides
  const shape = () => {
    cx.beginPath();
    cx.moveTo(wx, wb - rad * .35);
    cx.lineTo(wx + inset, wy + rad);
    cx.quadraticCurveTo(wx + inset, wy, wx + inset + rad * 1.3, wy - bow * .25);
    cx.quadraticCurveTo(W / 2, wy - bow * 1.4, wx + ww - inset - rad * 1.3, wy - bow * .25);
    cx.quadraticCurveTo(wx + ww - inset, wy, wx + ww - inset, wy + rad);
    cx.lineTo(wx + ww, wb - rad * .35);
    cx.quadraticCurveTo(wx + ww, wb, wx + ww - rad * .35, wb);
    cx.lineTo(wx + rad * .35, wb);
    cx.quadraticCurveTo(wx, wb, wx, wb - rad * .35);
    cx.closePath();
  };
  cx.save(); cx.globalCompositeOperation = 'destination-out'; cx.fillStyle = '#000'; shape(); cx.fill(); cx.restore();
  // glass: faint top tint + thin reflection, nothing that dulls the view
  cx.save(); shape(); cx.clip();
  const tint = cx.createLinearGradient(0, wy - bow, 0, wy + H * .09);
  tint.addColorStop(0, 'rgba(20,40,60,.28)'); tint.addColorStop(1, 'rgba(20,40,60,0)');
  cx.fillStyle = tint; cx.fillRect(0, 0, W, wy + H * .09);
  const sheen = cx.createLinearGradient(W * .62, wy, W * .8, wb);
  sheen.addColorStop(0, 'rgba(255,255,255,0)'); sheen.addColorStop(.48, 'rgba(255,255,255,.035)'); sheen.addColorStop(.52, 'rgba(255,255,255,0)');
  cx.fillStyle = sheen; cx.fillRect(0, 0, W, H);
  // parked wiper along the lower edge
  cx.strokeStyle = 'rgba(8,10,12,.9)'; cx.lineCap = 'round';
  cx.lineWidth = Math.max(3, H * .004); cx.beginPath(); cx.moveTo(W * .2, wb - H * .012); cx.lineTo(W * .48, wb - H * .02); cx.stroke();
  cx.lineWidth = Math.max(2, H * .0025); cx.beginPath(); cx.moveTo(W * .5, wb + 2); cx.lineTo(W * .47, wb - H * .019); cx.stroke();
  cx.restore();
  // seal + edge glint
  cx.lineWidth = Math.max(7, W * .005); cx.strokeStyle = '#040608'; shape(); cx.stroke();
  cx.lineWidth = 1.5; cx.strokeStyle = 'rgba(150,215,255,.16)'; cx.save(); cx.translate(0, -1); shape(); cx.stroke(); cx.restore();
  // console top: glossy lip and LED strip
  const lip = cx.createLinearGradient(0, wb, 0, wb + H * .06);
  lip.addColorStop(0, 'rgba(120,150,175,.14)'); lip.addColorStop(1, 'rgba(120,150,175,0)');
  cx.fillStyle = lip; cx.fillRect(0, wb + 6, W, H * .06);
  cx.save(); cx.shadowColor = 'rgba(79,210,255,.9)'; cx.shadowBlur = 14; cx.strokeStyle = 'rgba(79,210,255,.55)'; cx.lineWidth = 2;
  cx.beginPath(); cx.moveTo(W * .08, wb + 14); cx.lineTo(W * .92, wb + 14); cx.stroke(); cx.restore();
  cx.fillStyle = 'rgba(150,200,230,.32)'; cx.font = `600 ${clamp(H * .012, 9, 12)}px "Segoe UI", Arial, sans-serif`; cx.letterSpacing = '6px';
  cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(TRAIN_NAME + ' · 350', W / 2, wb + 30); cx.letterSpacing = '0px';
  document.documentElement.style.setProperty('--dash-h', Math.max(120, H - wb - (mob ? 30 : 52)) + 'px');
}

/* ---------- main speed HUD ---------- */
const hud = document.getElementById('hud'), hx = hud.getContext('2d');
let hudW = 0, hudH = 0;
function sizeHud(){ const d = Math.min(devicePixelRatio || 1, 2); hudW = hud.clientWidth; hudH = hud.clientHeight; hud.width = Math.max(1, hudW * d); hud.height = Math.max(1, hudH * d); hx.setTransform(d, 0, 0, d, 0, 0); }
const hudNeedle = { val: 0, vel: 0 }; let hudDig = 0, hudPrev = performance.now();
const NOTCH_TOP = [0, 110, 190, 270, 350, 430, 500];
function drawHud(kmhRaw){
  const w = hudW, h = hudH; if (!w || !h) return;
  hx.clearRect(0, 0, w, h);
  const nowH = performance.now(), hdt = Math.min(.1, (nowH - hudPrev) / 1000); hudPrev = nowH;
  // needle on a spring (slight overshoot) with a fine shiver at speed; digits follow smoothly and roll
  hudNeedle.vel += ((kmhRaw + (Math.random() - .5) * kmhRaw * .006 - hudNeedle.val) * 90 - hudNeedle.vel * 11) * hdt; hudNeedle.val += hudNeedle.vel * hdt;
  hudDig += (kmhRaw - hudDig) * Math.min(1, hdt * 10);
  const kmh = Math.max(0, hudNeedle.val);
  const stripH = Math.max(48, h * .27), cxH = w / 2, cy = (h - stripH) * .94, R = Math.min(w * .34, ((h - stripH) * .94 - 18) / 1.36);
  const A0 = Math.PI * 1.12, A1 = Math.PI * 1.88, frac = clamp(kmh / MAX_KMH, 0, 1), aV = A0 + (A1 - A0) * frac;
  // arc track + ticks
  hx.lineCap = 'round';
  hx.strokeStyle = 'rgba(160,220,255,.1)'; hx.lineWidth = R * .09; hx.beginPath(); hx.arc(cxH, cy, R, A0, A1); hx.stroke();
  hx.font = `600 ${Math.max(9, R * .085)}px ${'Consolas, monospace'}`; hx.textAlign = 'center'; hx.textBaseline = 'middle';
  for (let s = 0; s <= MAX_KMH; s += 50) {
    const a = A0 + (A1 - A0) * s / MAX_KMH, c = Math.cos(a), sn = Math.sin(a);
    hx.strokeStyle = s >= 450 ? 'rgba(255,90,78,.7)' : 'rgba(160,220,255,.35)'; hx.lineWidth = 2;
    hx.beginPath(); hx.moveTo(cxH + c * R * 1.08, cy + sn * R * 1.08); hx.lineTo(cxH + c * R * 1.15, cy + sn * R * 1.15); hx.stroke();
    hx.fillStyle = 'rgba(160,190,210,.6)'; hx.fillText(s, cxH + c * R * 1.28, cy + sn * R * 1.28);
  }
  // red zone 330–350: always marked, pulses when the train is in it
  const aZ = A0 + (A1 - A0) * 460 / MAX_KMH, over = kmhRaw > 460, pulse = over ? .55 + .45 * Math.sin(nowH / 90) : .28;
  hx.save(); hx.strokeStyle = `rgba(255,70,60,${pulse})`; hx.lineWidth = R * .045; if (over) { hx.shadowColor = '#ff3b30'; hx.shadowBlur = 18; }
  hx.beginPath(); hx.arc(cxH, cy, R * 1.12, aZ, A1); hx.stroke(); hx.restore();
  // speed fill
  const col = kmh > 460 ? '#ff5a4e' : kmh > 370 ? '#ffb547' : '#4fd2ff';
  hx.save(); hx.shadowColor = col; hx.shadowBlur = 16 + 8 * Math.sin(nowH / 160) * (kmh / MAX_KMH); hx.strokeStyle = col; hx.lineWidth = R * .09;
  if (frac > .002) { hx.beginPath(); hx.arc(cxH, cy, R, A0, aV); hx.stroke(); }
  hx.restore();
  // target-speed bug: top speed of the current notch (orange 300 while nitro runs)
  const tgt = nitroT > 0 ? 420 : notch > 0 && rev ? NOTCH_TOP[notch] : 0;
  if (tgt) { const a = A0 + (A1 - A0) * tgt / MAX_KMH, c = Math.cos(a), sn = Math.sin(a), tc2 = nitroT > 0 ? '#ff8a3d' : '#7ff0ff';
    hx.save(); hx.fillStyle = tc2; hx.shadowColor = tc2; hx.shadowBlur = 8; hx.beginPath();
    hx.moveTo(cxH + c * R * 1.02, cy + sn * R * 1.02); hx.lineTo(cxH + c * R * 1.2 - sn * R * .06, cy + sn * R * 1.2 + c * R * .06); hx.lineTo(cxH + c * R * 1.2 + sn * R * .06, cy + sn * R * 1.2 - c * R * .06); hx.closePath(); hx.fill(); hx.restore(); }
  // pointer riding on the rim
  { const c = Math.cos(aV), sn = Math.sin(aV); hx.save(); hx.strokeStyle = '#ffffff'; hx.shadowColor = col; hx.shadowBlur = 12; hx.lineWidth = Math.max(2.5, R * .028);
    hx.beginPath(); hx.moveTo(cxH + c * R * .84, cy + sn * R * .84); hx.lineTo(cxH + c * R * 1.17, cy + sn * R * 1.17); hx.stroke(); hx.restore(); }
  // rolling digits
  { const val = Math.max(0, hudDig), ip = Math.floor(val), f = sstep(.72, 1, val - ip), s1 = String(ip), s2 = String(ip + 1), lh = R * .52, base = cy - R * .08;
    hx.save(); hx.font = `700 ${R * .5}px "Segoe UI", Arial, sans-serif`; hx.textBaseline = 'alphabetic'; hx.fillStyle = '#e8f3fa';
    hx.beginPath(); hx.rect(cxH - R, base - R * .44, R * 2, R * .5); hx.clip();
    const same = s1.length === s2.length && s1.slice(0, -1) === s2.slice(0, -1);
    if (same) { const pre = s1.slice(0, -1), x0 = cxH - hx.measureText(s1).width / 2; hx.textAlign = 'left'; hx.fillText(pre, x0, base);
      const xl = x0 + hx.measureText(pre).width; hx.fillText(s1.slice(-1), xl, base - f * lh); hx.fillText(s2.slice(-1), xl, base + (1 - f) * lh); }
    else { hx.textAlign = 'center'; hx.fillText(s1, cxH, base - f * lh); hx.fillText(s2, cxH, base + (1 - f) * lh); }
    hx.restore(); hx.textAlign = 'center'; }
  hx.fillStyle = 'rgba(160,200,225,.75)'; hx.font = `600 ${R * .1}px "Segoe UI", Arial, sans-serif`;
  hx.fillText('КМ/Ч', cxH, cy + R * .1);
  // traction / brake bars at the arc ends
  const pw = notch > 0 && rev ? notch / 6 : 0, bk = clamp(tc / 4.5, 0, 1), bw = Math.max(6, R * .07), bh = R * .55;
  const bar = (x, f, c, label) => {
    hx.fillStyle = 'rgba(160,220,255,.08)'; hx.fillRect(x - bw / 2, cy - bh, bw, bh);
    hx.fillStyle = c; hx.fillRect(x - bw / 2, cy - bh * f, bw, bh * f);
    hx.fillStyle = 'rgba(160,190,210,.6)'; hx.font = `600 ${Math.max(8, R * .07)}px "Segoe UI", Arial, sans-serif`; hx.fillText(label, x, cy + R * .1);
  };
  bar(cxH - R * 1.42, pw, '#4fd2ff', 'ТЯГА'); bar(cxH + R * 1.42, bk, '#ff5a4e', 'ТОРМ');
  // acceleration
  hx.font = `600 ${Math.max(9, Math.min(12, R * .085))}px Consolas, monospace`; hx.textBaseline = 'top';
  hx.textAlign = 'left'; hx.fillStyle = acc >= 0 ? 'rgba(79,210,255,.85)' : 'rgba(255,181,71,.9)';
  hx.fillText('a ' + (acc >= 0 ? '+' : '−') + Math.abs(acc).toFixed(2).replace('.', ',') + ' м/с²', 12, 10);
  hx.textAlign = 'right'; hx.fillStyle = tm < 4.8 ? 'rgba(255,181,71,.9)' : 'rgba(160,190,210,.7)';
  hx.fillText('ТМ ' + tm.toFixed(1).replace('.', ',') + ' атм', w - 12, 10); hx.textAlign = 'center';
  // route strip
  const y0 = h - stripH, pad = 16, L0 = pad, L1 = w - pad, ly = y0 + stripH * .72;
  hx.fillStyle = 'rgba(160,220,255,.06)'; hx.fillRect(0, y0, w, 1);
  const cur = segAt(dist), prog = cur.route === 4 ? 0 : clamp(cur.idx * TILE + (dist - cur.S), 0, 6 * TILE) / (6 * TILE), X = p => L0 + (L1 - L0) * p / (6 * TILE);
  hx.strokeStyle = 'rgba(160,220,255,.25)'; hx.lineWidth = 3; hx.beginPath(); hx.moveTo(L0, ly); hx.lineTo(L1, ly); hx.stroke();
  if (cur.route === 0) { hx.strokeStyle = '#7aa7bd'; hx.lineWidth = 7; hx.beginPath(); hx.moveTo(X(3 * TILE + 84), ly); hx.lineTo(X(3 * TILE + 156), ly); hx.stroke(); }
  if (cur.route === 1) { hx.strokeStyle = '#2b3138'; hx.lineWidth = 9; hx.beginPath(); hx.moveTo(X(TUN.a), ly); hx.lineTo(X(TUN.b), ly); hx.stroke(); hx.strokeStyle = 'rgba(160,220,255,.4)'; hx.lineWidth = 1; hx.strokeRect(X(TUN.a), ly - 4.5, X(TUN.b) - X(TUN.a), 9); }
  if (cur.route === 3) { hx.strokeStyle = '#c98a5a'; hx.lineWidth = 7; hx.beginPath(); hx.moveTo(X(CAN.a), ly); hx.lineTo(X(CAN.b), ly); hx.stroke(); }
  if (cur.route === 6) { hx.strokeStyle = '#2fd3c1'; hx.lineWidth = 7; hx.beginPath(); hx.moveTo(X(UND.a), ly); hx.lineTo(X(UND.b), ly); hx.stroke(); }
  if (cur.route === 5) { hx.strokeStyle = '#4fb3d9'; hx.lineWidth = 7; hx.beginPath(); hx.moveTo(X(BAY_BRIDGE.a), ly); hx.lineTo(X(BAY_BRIDGE.b), ly); hx.stroke(); }
  if (cur.route === 2) { hx.fillStyle = '#3d7bd6'; hx.fillRect(X(2 * TILE + 30), ly - 5, X(2 * TILE + 210) - X(2 * TILE + 30), 10); }
  // junction fork at the end
  const jx = X(5 * TILE + BR_A), nj = nextJunction(dist), upR = upcomingRoute(dist), ch = upR !== junctionFrom(dist) ? 1 : 0;
  hx.strokeStyle = ch ? '#ffb547' : '#3fe08a'; hx.lineWidth = 2.5; hx.beginPath();
  hx.moveTo(jx, ly); hx.lineTo(L1, ly); hx.moveTo(jx, ly); hx.lineTo(L1, ly - 10); hx.stroke();
  hx.fillStyle = ch ? '#ffb547' : '#3fe08a'; hx.beginPath(); hx.arc(ch ? L1 : L1, ch ? ly - 10 : ly, 3, 0, 7); hx.fill();
  // position marker
  const px = L0 + (L1 - L0) * prog;
  hx.save(); hx.shadowColor = '#4fd2ff'; hx.shadowBlur = 10; hx.fillStyle = '#4fd2ff';
  hx.beginPath(); hx.moveTo(px, ly - 8); hx.lineTo(px - 6, ly - 16); hx.lineTo(px + 6, ly - 16); hx.closePath(); hx.fill(); hx.restore();
  hx.font = `600 ${Math.max(9, Math.min(12, stripH * .2))}px "Segoe UI", Arial, sans-serif`; hx.textBaseline = 'middle';
  hx.textAlign = 'left'; hx.fillStyle = 'rgba(200,225,240,.8)'; hx.fillText(ROUTES[cur.route].name.toUpperCase(), L0, y0 + stripH * .28);
  const jd = junctionDist(dist);
  hx.textAlign = 'right'; hx.fillStyle = ch ? '#ffb547' : '#3fe08a';
  hx.fillText(`${upR === 4 ? 'ДЕПО' : 'ДАЛЕЕ ' + SHORT[upR].toUpperCase()} · ${jd > 999 ? (jd / 1000).toFixed(1).replace('.', ',') + ' КМ' : Math.round(jd) + ' М'}`, L1, y0 + stripH * .28);
}

/* ---------- grain ---------- */
(() => { const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d'), id = x.createImageData(160, 160);
  for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  x.putImageData(id, 0, 0); document.getElementById('grain').style.backgroundImage = `url(${c.toDataURL()})`; })();
