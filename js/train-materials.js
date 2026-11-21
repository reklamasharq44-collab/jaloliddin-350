/* ---------- the trainset: lofted streamlined body, long nose, windows, bogies, roof gear (an original design) ---------- */
const trainEnv = (() => {                       // soft sky/ground reflection map so paint and glass catch the light
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#6f97c2'); g.addColorStop(.42, '#cfdbe4'); g.addColorStop(.5, '#e8ecee'); g.addColorStop(.56, '#8a8377'); g.addColorStop(1, '#3e3a33');
  x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  x.fillStyle = 'rgba(255,248,230,.9)'; x.beginPath(); x.arc(150, 70, 14, 0, 7); x.fill();
  const tex = new THREE.CanvasTexture(c); tex.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer), env = pm.fromEquirectangular(tex).texture; pm.dispose(); return env;
})();
const TM = {
  paint: new THREE.MeshPhysicalMaterial({ color: 0xf4f6f8, metalness: .12, roughness: .3, clearcoat: 1, clearcoatRoughness: .06, envMap: trainEnv, envMapIntensity: 1.1, side: THREE.DoubleSide }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x0a1218, metalness: .9, roughness: .04, clearcoat: 1, clearcoatRoughness: .02, envMap: trainEnv, envMapIntensity: 1.7, side: THREE.DoubleSide }),
  roof: new THREE.MeshStandardMaterial({ color: 0x8e979e, metalness: .4, roughness: .45, envMap: trainEnv, envMapIntensity: .6, side: THREE.DoubleSide }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x1b1e21, roughness: .85, side: THREE.DoubleSide }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xc9d0d6, metalness: 1, roughness: .18, envMap: trainEnv, side: THREE.DoubleSide }),
  graphite: new THREE.MeshStandardMaterial({ color: 0x2a3036, metalness: .5, roughness: .45, envMap: trainEnv, envMapIntensity: .5 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x15181b, metalness: .3, roughness: .7 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: .9, roughness: .3, envMap: trainEnv }),
  cyan: new THREE.MeshStandardMaterial({ color: 0x2fb8ea, emissive: 0x0d5876, emissiveIntensity: .55, metalness: .3, roughness: .3, envMap: trainEnv, side: THREE.DoubleSide }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xd8a62a, roughness: .6 }),
  ceramic: new THREE.MeshStandardMaterial({ color: 0x6f4a3a, roughness: .4, metalness: .1 }),
  head: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff1cf, emissiveIntensity: 1.3 }),
  tail: new THREE.MeshStandardMaterial({ color: 0xff3a2a, emissive: 0xd8160c, emissiveIntensity: 1.2 }),
  // hero livery: lacquered crimson, neon LED line, see-through side glass with a lit saloon behind it
  livery: new THREE.MeshPhysicalMaterial({ color: 0xc4122f, metalness: .25, roughness: .26, clearcoat: 1, clearcoatRoughness: .04, envMap: trainEnv, envMapIntensity: 1.15, side: THREE.DoubleSide }),
  led: new THREE.MeshBasicMaterial({ color: 0x66ecff, side: THREE.DoubleSide }),
  wsGlass: new THREE.MeshPhysicalMaterial({ color: 0x0c1c2a, metalness: .85, roughness: .03, clearcoat: 1, clearcoatRoughness: .01, envMap: trainEnv, envMapIntensity: 2, side: THREE.DoubleSide }),
  sideGlass: new THREE.MeshPhysicalMaterial({ color: 0x0b1620, metalness: .55, roughness: .04, clearcoat: 1, envMap: trainEnv, envMapIntensity: 1.5, transparent: true, opacity: .5, depthWrite: false, side: THREE.DoubleSide }),
  plate: new THREE.MeshPhysicalMaterial({ color: 0x23292f, metalness: .6, roughness: .32, clearcoat: .6, envMap: trainEnv, envMapIntensity: .7, side: THREE.DoubleSide })
};
TM.paint.envMapIntensity = 1.3;
const saloonTex = canvasTex(256, 128, (x, w, h) => {          // one 2.3 m window bay of the lit saloon
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#fff3da'); g.addColorStop(.14, '#ffe2b0'); g.addColorStop(.6, '#c99a68'); g.addColorStop(1, '#6b4a33');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = '#fffaf0'; x.fillRect(0, 4, w, 7);                                     // ceiling light line
  x.fillStyle = 'rgba(60,45,35,.55)'; x.fillRect(0, 22, w, 4);                          // luggage rack
  for (const sx of [34, 160]) {                                                         // seat backs with headrest covers
    x.fillStyle = '#26385a'; x.beginPath(); x.roundRect ? x.roundRect(sx, 52, 64, 90, 14) : x.rect(sx, 52, 64, 90); x.fill();
    x.fillStyle = '#e9ecef'; x.beginPath(); x.roundRect ? x.roundRect(sx + 6, 56, 52, 16, 6) : x.rect(sx + 6, 56, 52, 16); x.fill();
  }
  x.fillStyle = 'rgba(40,28,20,.5)'; x.beginPath(); x.arc(118, 70, 11, 0, 7); x.fill(); x.fillRect(106, 80, 24, 40);   // a passenger
});
saloonTex.wrapS = THREE.RepeatWrapping;
const TRAIN_NAME = 'JALOLIDDIN';
/* emblem: an original "J" inside a swirl ring */
function drawEmblem(x, cx, cy, R, col){
  x.lineCap = 'round'; x.strokeStyle = col; x.fillStyle = col;
  for (let i = 0; i < 3; i++) { x.lineWidth = R * (.15 - i * .035); x.beginPath(); x.arc(cx, cy, R * (1 - i * .27), -2.6 + i * .7, .9 + i * .7); x.stroke(); }
  x.font = `900 ${R * 1.05}px "Segoe UI", Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('J', cx + R * .04, cy + R * .06); x.textAlign = 'left';
}
const heroNameTex = canvasTex(2048, 160, (x, w, h) => {       // 12.8 : 1 — matches the 6.5 m × 0.5 m patch, so letters are not stretched
  x.clearRect(0, 0, w, h);
  drawEmblem(x, 82, 80, 66, '#ffffff');
  x.save(); x.transform(1, 0, -.2, 1, 0, 0);
  let fs = 112; x.font = `900 ${fs}px "Segoe UI", Arial, sans-serif`;
  while (x.measureText(TRAIN_NAME).width > 1150 && fs > 60) { fs -= 4; x.font = `900 ${fs}px "Segoe UI", Arial, sans-serif`; }
  x.fillStyle = '#ffffff'; x.textBaseline = 'middle'; x.fillText(TRAIN_NAME, 200, 86);
  const nw = x.measureText(TRAIN_NAME).width;
  x.fillStyle = '#7ff0ff'; x.font = '800 80px "Segoe UI", Arial, sans-serif'; x.fillText('350', 240 + nw, 92);
  x.restore();
  const ex = 240 + nw + 190;
  x.fillStyle = 'rgba(255,255,255,.85)'; x.fillRect(ex, 72, w - ex - 40, 7); x.fillRect(ex + 50, 92, w - ex - 90, 4);
});
const emblemTex = canvasTex(256, 256, (x, w, h) => {
  x.clearRect(0, 0, w, h);
  const g = x.createRadialGradient(128, 110, 10, 128, 128, 124); g.addColorStop(0, '#e8202f'); g.addColorStop(1, '#8e0d1c');
  x.fillStyle = g; x.beginPath(); x.arc(128, 128, 120, 0, 7); x.fill();
  x.lineWidth = 9; x.strokeStyle = '#e9eef2'; x.stroke();
  drawEmblem(x, 128, 128, 84, '#ffffff');
});
const heroNameMat = new THREE.MeshStandardMaterial({ map: heroNameTex, transparent: true, roughness: .3, metalness: .1, depthWrite: false, side: THREE.DoubleSide });
