/* ---------- atmosphere per route: sky dome with sun and clouds, fog, light colours; blends smoothly between routes ---------- */
const ATMOS_PRESETS = {
  base:   { top: '#4f86c2', hor: '#c4d0d5', fog: '#c4d0d5', dens: .0034, sun: '#fff1d6', sunI: .85, sky: '#dfe7ee', gnd: '#4f4a3c', hemiI: 1.05, dir: [-30, 40, -60], clouds: .55, snow: 1, dust: 0, ring: 1, ringCol: '#ffffff' },
  canyon: { top: '#2f63a8', hor: '#f2c08a', fog: '#e2b07c', dens: .00055, sun: '#ffbe73', sunI: 1.35, sky: '#f6d4ad', gnd: '#7a4428', hemiI: .95, dir: [-70, 22, -80], clouds: .25, snow: 0, dust: 1, ring: .35, ringCol: '#d79a66' },
  coast:  { top: '#1f74c9', hor: '#cfe6ef', fog: '#cfe3ec', dens: .0011, sun: '#fff2d8', sunI: .95, sky: '#d3e4ee', gnd: '#5e5a48', hemiI: .82, dir: [60, 45, -70], clouds: .4, snow: 0, dust: 0, ring: 0, ringCol: '#ffffff' }
};
ATMOS_PRESETS.under = { top: '#0b5a72', hor: '#127a8c', fog: '#0f6e80', dens: .0078, sun: '#c8f4ff', sunI: .55, sky: '#7fd6e4', gnd: '#0d3d44', hemiI: 1.0, dir: [10, 90, -20], clouds: 0, snow: 0, dust: 0, ring: 0, ringCol: '#ffffff' };
const ROUTE_ATMOS = { 3: 'canyon', 5: 'coast', 6: 'coast' };
const atm = (() => { const p = ATMOS_PRESETS.base, o = {}; for (const k in p) o[k] = typeof p[k] === 'string' ? new THREE.Color(p[k]) : Array.isArray(p[k]) ? new THREE.Vector3(...p[k]) : p[k]; return o; })();
const atmTarget = {};
/* sky dome: gradient, sun disc + glow, soft drifting clouds (value-noise fbm) */
const skyU = { uTop: { value: atm.top.clone() }, uHor: { value: atm.hor.clone() }, uSunDir: { value: atm.dir.clone().normalize() }, uSunCol: { value: atm.sun.clone() }, uClouds: { value: atm.clouds }, uTime: { value: 0 }, uNight: { value: 0 } };
const skyMat = new THREE.ShaderMaterial({
  uniforms: skyU, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform vec3 uTop, uHor, uSunDir, uSunCol; uniform float uClouds, uTime, uNight; varying vec3 vDir;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
    float fbm(vec2 p){ float s = 0.0, a = .5; for (int i = 0; i < 5; i++){ s += a * n(p); p *= 2.03; a *= .5; } return s; }
    void main(){
      vec3 d = normalize(vDir); float el = d.y;
      vec3 col = mix(uHor, uTop, pow(clamp(el, 0.0, 1.0), .55));
      col = mix(col, uHor * .92, clamp(-el * 6.0, 0.0, 1.0));                       // below the horizon: haze
      float sd = max(dot(d, normalize(uSunDir)), 0.0);
      col += uSunCol * (pow(sd, 6.0) * .22 + pow(sd, 60.0) * .35);                   // glow round the sun
      col = mix(col, mix(vec3(1.0, .98, .92), vec3(.86, .91, 1.0), uNight), smoothstep(.9992, .9997, sd));            // the disc / moon
      if (el > 0.0 && uClouds > 0.0) {
        vec2 uv = d.xz / (el + .12) * 1.6 + vec2(uTime * .006, uTime * .002);
        float c = smoothstep(.52 - uClouds * .22, .9, fbm(uv)) * smoothstep(0.0, .18, el);
        vec3 cc = mix(vec3(.93, .95, .97), uSunCol, .25) * (.8 + .25 * pow(sd, 3.0)) * (1.0 - .65 * uNight);
        col = mix(col, cc, c * .85 * (1.0 - .5 * uNight));
      }
      if (uNight > 0.01 && el > 0.0) {                                               // starfield at night
        vec2 su = d.xz / (el + .10) * 90.0; vec2 ci = floor(su), cf = fract(su);
        vec2 pp = vec2(h(ci), h(ci + 3.1)); float dd = length(cf - pp);
        float star = smoothstep(.08, 0.0, dd) * step(.86, h(ci + 5.7));
        float tw = .6 + .4 * sin(uTime * 3.0 + h(ci) * 40.0);
        col += vec3(.8, .85, 1.0) * star * tw * uNight * smoothstep(0.0, .1, el);
      }
      gl_FragColor = vec4(col, 1.0);
    }`
});
skyMat.userData.noBend = true; skyMat.customProgramCacheKey = () => 'sky';
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), skyMat); skyDome.renderOrder = -2; skyDome.frustumCulled = false;
scene.add(skyDome); scene.background = null;
const ringBase = new THREE.Color(1, 1, 1);
let atmKey = '';
function updateAtmos(dt, route, under = false){
  const key = under ? 'under' : ROUTE_ATMOS[route] || 'base';
  if (key !== atmKey) { atmKey = key; const p = ATMOS_PRESETS[key]; for (const k in p) atmTarget[k] = typeof p[k] === 'string' ? new THREE.Color(p[k]) : Array.isArray(p[k]) ? new THREE.Vector3(...p[k]) : p[k]; }
  const k = Math.min(1, dt * (key === 'under' || atm.dens > .005 && key !== 'base' ? 1.6 : .5));
  for (const n in atmTarget) { const tv = atmTarget[n]; if (tv.isColor || tv.isVector3) atm[n].lerp(tv, k); else atm[n] += (tv - atm[n]) * k; }
  night += (nightTarget - night) * Math.min(1, dt * .8);
  skyU.uTop.value.copy(atm.top).lerp(NIGHT.top, night); skyU.uHor.value.copy(atm.hor).lerp(NIGHT.hor, night * .92);
  skyU.uSunCol.value.copy(atm.sun).lerp(NIGHT.moon, night * .9); skyU.uClouds.value = atm.clouds; skyU.uTime.value += dt; skyU.uNight.value = night;
  skyU.uSunDir.value.copy(atm.dir).normalize(); sun.position.copy(atm.dir); sun.color.copy(atm.sun).lerp(NIGHT.moon, night * .9);
  hemi.color.copy(atm.sky).lerp(NIGHT.sky, night * .85); hemi.groundColor.copy(atm.gnd).lerp(NIGHT.gnd, night * .8);
  camera.getWorldPosition(skyDome.position);
  ring.material.opacity = atm.ring * (1 - .82 * night); ring.visible = ring.material.opacity > .02; ring.material.color.copy(ringBase).lerp(atm.ringCol, .8);
}
const NIGHT = { top: new THREE.Color('#05070f'), hor: new THREE.Color('#0b1524'), fog: new THREE.Color('#070b16'), moon: new THREE.Color('#b4c6e8'), sky: new THREE.Color('#16203a'), gnd: new THREE.Color('#05080e') };
let night = 0, nightTarget = 0;
function setNight(on){ nightTarget = on ? 1 : 0; const b = document.getElementById('night'); if (b) b.textContent = on ? 'День' : 'Ночь'; }
{ const b = document.getElementById('night'); if (b) b.addEventListener('click', () => setNight(nightTarget < .5)); }
addEventListener('keydown', e => { const k = e.key.toLowerCase(); if ((k === 'l' || k === 'д') && !e.repeat && !(e.target.closest && e.target.closest('input,textarea'))) setNight(nightTarget < .5); });
