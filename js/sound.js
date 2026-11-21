/* ---------- sound ---------- */
let ac = null, master = null, rumble = null, hornNodes = null, whine = null;
const JOINT = 25, AXLES = [0, 1.8, 10.2, 12.0];
function noiseBuf(sec){ const b = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
function click(time, strength){
  const len = .06, buf = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 6);
  const src = ac.createBufferSource(); src.buffer = buf;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700 + Math.random() * 300; bp.Q.value = 1.4;
  const g = ac.createGain(); g.gain.value = .55 * strength;
  src.connect(bp).connect(g).connect(master); src.start(time);
  const o = ac.createOscillator(), og = ac.createGain(); o.frequency.setValueAtTime(95, time); o.frequency.exponentialRampToValueAtTime(45, time + .12);
  og.gain.setValueAtTime(.5 * strength, time); og.gain.exponentialRampToValueAtTime(.001, time + .16);
  o.connect(og).connect(master); o.start(time); o.stop(time + .18);
}
function hiss(strength){
  if (!ac || ac.state !== 'running') return;
  const src = ac.createBufferSource(); src.buffer = noiseBuf(1.6);
  const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
  const g = ac.createGain(), t0 = ac.currentTime;
  g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.35 * strength, t0 + .05); g.gain.exponentialRampToValueAtTime(.001, t0 + 1.5);
  src.connect(hp).connect(g).connect(master); src.start(t0); src.stop(t0 + 1.6);
}
function nitroBoom(){
  if (!ac || ac.state !== 'running') return;
  const t0 = ac.currentTime, src = ac.createBufferSource(); src.buffer = noiseBuf(3);
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(300, t0); bp.frequency.exponentialRampToValueAtTime(3200, t0 + 2.4);
  const g = ac.createGain(); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.7, t0 + .12); g.gain.exponentialRampToValueAtTime(.001, t0 + 2.9);
  src.connect(bp).connect(g).connect(master); src.start(t0); src.stop(t0 + 3);
  const o = ac.createOscillator(), og = ac.createGain(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(60, t0); o.frequency.exponentialRampToValueAtTime(240, t0 + 2.2);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
  og.gain.setValueAtTime(.0001, t0); og.gain.exponentialRampToValueAtTime(.35, t0 + .08); og.gain.exponentialRampToValueAtTime(.001, t0 + 2.4);
  o.connect(lp).connect(og).connect(master); o.start(t0); o.stop(t0 + 2.5);
}
function hornOn(){
  if (!ac) startSound();
  if (ac.state !== 'running') ac.resume();
  if (hornNodes) return;
  const g = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
  g.gain.setValueAtTime(.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(.22, ac.currentTime + .08);
  const os = [554, 698].map(f => { const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = f; o.connect(lp); o.start(); return o; });
  lp.connect(g).connect(master);
  hornNodes = { g, os };
}
function hornOff(){
  if (!hornNodes) return;
  const { g, os } = hornNodes, t0 = ac.currentTime;
  g.gain.cancelScheduledValues(t0); g.gain.setValueAtTime(g.gain.value, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + .25);
  os.forEach(o => o.stop(t0 + .3)); hornNodes = null;
}
function startSound(){
  ac = new (window.AudioContext || window.webkitAudioContext)();
  master = ac.createGain(); master.gain.value = .5; master.connect(ac.destination);
  const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = nb.getChannelData(0); let last = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; d[i] = last * 3.2; }
  const src = ac.createBufferSource(); src.buffer = nb; src.loop = true;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
  const rg = ac.createGain(); rg.gain.value = .3; src.connect(lp).connect(rg).connect(master); src.start();
  const wo = ac.createOscillator(), wo2 = ac.createOscillator(), wbp = ac.createBiquadFilter(), wg = ac.createGain();
  wo.type = 'sawtooth'; wo2.type = 'triangle'; wbp.type = 'bandpass'; wbp.Q.value = 6; wg.gain.value = 0;
  wo.connect(wbp); wo2.connect(wbp); wbp.connect(wg).connect(master); wo.start(); wo2.start();
  whine = { wo, wo2, wbp, wg };
  rumble = { lp, rg };
  // wheel clicks keyed to the odometer (always increasing, works in reverse too)
  const evDist = n => Math.floor(n / 4) * JOINT + AXLES[n % 4];
  let n = Math.floor(odo / JOINT) * 4; while (evDist(n) < odo) n++;
  setInterval(() => {
    const sp = Math.abs(v);
    if (sp < .3) { while (evDist(n) < odo) n++; return; }
    while (evDist(n) - odo < sp * .35) {
      const dt = Math.max(0, (evDist(n) - odo) / sp);
      click(ac.currentTime + .02 + dt, (n % 2 ? .8 : 1) * clamp(.35 + sp / 40, .35, .8) * (1 + onBridge * .6));
      n++;
    }
  }, 60);
}
const sndBtn = document.getElementById('snd');
sndBtn.addEventListener('click', () => {
  if (!ac) { startSound(); sndBtn.textContent = 'Выключить звук'; return; }
  if (ac.state === 'running') { ac.suspend(); sndBtn.textContent = 'Включить звук'; }
  else { ac.resume(); sndBtn.textContent = 'Выключить звук'; }
});
