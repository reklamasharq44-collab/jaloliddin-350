/* ---------- external-view camera presets (ракурсы): fixed cinematic framings to cycle through and refine ---------- */
const CAMS = [
  { n: 'Погоня',      az: -.16, el: .27, r: 34 },   // behind, over the roof, down the line
  { n: '3/4 сзади',   az: -.72, el: .18, r: 23 },   // rear three-quarter
  { n: 'Сбоку',       az: -1.57, el: .10, r: 17 },  // side profile
  { n: '3/4 спереди', az: -2.42, el: .15, r: 17 },  // front three-quarter
  { n: 'Низкий',      az: -2.00, el: .03, r: 12 },  // low, near the rail
  { n: 'Сверху',      az: -.95, el: .62, r: 32 }    // high overview
];
let camIdx = 0;
const camLabel = document.getElementById('camLabel');
let camLabelT = 0;
function showCamLabel(txt){ if (!camLabel) return; camLabel.textContent = txt; camLabel.classList.add('show'); clearTimeout(camLabelT); camLabelT = setTimeout(() => camLabel.classList.remove('show'), 1700); }
function setCam(i){
  camIdx = (i % CAMS.length + CAMS.length) % CAMS.length; const c = CAMS[camIdx];
  if (!viewOut) setView(true);
  orbAz = c.az; orbEl = c.el; orbR = c.r;
  showCamLabel(`Ракурс ${camIdx + 1}/${CAMS.length} · ${c.n}`);
}
function nextCam(){ setCam(camIdx + 1); }
const camBtn = document.getElementById('camBtn');
if (camBtn) camBtn.addEventListener('click', e => { e.stopPropagation(); nextCam(); });
addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input,textarea')) return;
  const k = e.key.toLowerCase();
  if ((k === 'v' || k === 'м') && !e.repeat) { nextCam(); e.preventDefault(); }
  else if (k >= '1' && k <= '6' && viewOut && !e.repeat) { setCam(+k - 1); e.preventDefault(); }
});
