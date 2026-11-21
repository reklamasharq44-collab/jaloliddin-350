const ROUTES = [
  { name: 'Лесная линия', make: forestTile },
  { name: 'Горы и туннель', make: mountainTile },
  { name: 'Станция Заречная', make: cityTile },
  { name: 'Каньон', make: canyonTile },
  { name: 'Депо «Jaloliddin»', make: depotTile, count: 3 },  // 0 start yard · 1 hangar · 2 arrival yard
  { name: 'Побережье', make: coastTile },
  { name: 'Подводный тоннель', make: underTile }
];
const ORDER = [0, 1, 2, 3, 5, 6];       // the main line, in driving order (4 = depot, reached only on request)
ROUTES[3].scenery = buildCanyonScenery(); ROUTES[3].sceneryEnd = CAN.rimB + 160;
ROUTES[5].scenery = buildCoastScenery(); ROUTES[5].sceneryEnd = COAST.END + 1;
ROUTES[6].scenery = buildUnderScenery(); ROUTES[6].sceneryEnd = COAST.END + 1;
/* the player's trainset for the outside view: nose tip just ahead of the cab position, cars trailing behind */
const playerTrain = (() => {
  const t = trainModel(3, { hero: true }); t.position.set(0, .32, 12.5);
  const lamp = new THREE.SpotLight(0xfff1d6, 0, 200, .5, .6, 1); lamp.position.set(0, 1.8, -NOSE_L + .6);
  const lt = new THREE.Object3D(); lt.position.set(0, 0, -60); t.add(lamp, lt); lamp.target = lt;
  t.userData.lamp = lamp; t.visible = false; scene.add(t);
  return t;
})();
let viewOut = false, orbAz = -.16, orbEl = .27, orbR = 34, camSm = null;
ROUTES.forEach(rt => { rt.tiles = Array.from({ length: rt.count || 6 }, (_, i) => rt.make(i)); rt.tiles.forEach(t => tessellateLong(t)); });
tessellateLong(ROUTES[3].scenery); tessellateLong(ROUTES[5].scenery); tessellateLong(ROUTES[6].scenery); tessellateLong(ghosts.L); tessellateLong(ghosts.R);

/* distant treeline + hills: a ring far beyond the tiles, painted in haze colours */
const ringTex = canvasTex(2048, 256, (x, w, h) => {
  const r = rng(21);
  const layer = (base, amp, col, treeH, dens) => {
    x.fillStyle = col; x.beginPath(); x.moveTo(0, h);
    let y = base;
    for (let px = 0; px <= w; px += 2) {
      y = base - amp * (.5 + .5 * Math.sin(px * .004 + base) * Math.sin(px * .0013 + amp));
      const tree = r() < dens ? treeH * (.4 + r() * .6) : treeH * .15 * r();
      x.lineTo(px, y - tree);
    }
    x.lineTo(w, h); x.closePath(); x.fill();
  };
  layer(150, 60, 'rgba(150,168,182,.5)', 8, .5);
  layer(185, 30, 'rgba(112,132,140,.75)', 14, .6);
  layer(215, 12, 'rgba(78,98,96,.92)', 20, .7);
});
ringTex.wrapS = THREE.RepeatWrapping; ringTex.repeat.x = 3;
const ring = new THREE.Mesh(new THREE.CylinderGeometry(1900, 1900, 260, 64, 1, true),
  new THREE.MeshBasicMaterial({ map: ringTex, side: THREE.BackSide, transparent: true, fog: false, depthWrite: false }));
ring.position.y = 70; ring.renderOrder = -1; scene.add(ring);
ring.material.userData.noBend = true; ring.material.customProgramCacheKey = () => 'nobend';
