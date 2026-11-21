/* ---------- trees: hand-built low-poly models with vertex colours (spruce, Scots pine, birch) ---------- */
const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, flatShading: true, side: THREE.DoubleSide });
function geoFrom(pos, col){ const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }
function pushGeo(pos, col, geo, m, colorFn){
  const g = (geo.index ? geo.toNonIndexed() : geo.clone()); g.applyMatrix4(m); g.computeVertexNormals();
  const P = g.attributes.position, N = g.attributes.normal;
  for (let i = 0; i < P.count; i += 3) {            // one colour per face keeps the faceted look
    const c = colorFn(P.getY(i), N.getY(i), i / 3);
    for (let k = 0; k < 3; k++) { pos.push(P.getX(i + k), P.getY(i + k), P.getZ(i + k)); col.push(c[0], c[1], c[2]); }
  }
}
const mat4 = (x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => { D.position.set(x, y, z); D.rotation.set(rx, ry, rz); D.scale.set(sx, sy, sz); D.updateMatrix(); return D.matrix.clone(); };
const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const SNOW = [.84, .87, .88];

function spruceGeo(seed){                           // unit height; tiers of jagged "paws" with snow on top
  const r = rng(seed), pos = [], col = [];
  const tri = (a, b, c, ca, cb, cc) => { pos.push(...a, ...b, ...c); col.push(...ca, ...cb, ...cc); };
  pushGeo(pos, col, new THREE.CylinderGeometry(.018, .03, .3, 6), mat4(0, .15, 0, 1, 1, 1), () => [.3, .21, .15]);
  const n = 5 + (seed % 3), k = 9;
  for (let t = 0; t < n; t++) {
    const u = t / n, yb = .1 + u * .74, h = .3 - u * .1, R = .32 * (1 - u * .86) + .03;
    const apex = [(r() - .5) * .01, yb + h, (r() - .5) * .01], inner = [0, yb + h * .22, 0], ring = [];
    for (let i = 0; i < 2 * k; i++) {
      const a = i / (2 * k) * Math.PI * 2 + r() * .12, out = i % 2 === 0, rr = R * (out ? .95 + r() * .2 : .62 + r() * .1);
      ring.push([Math.cos(a) * rr, yb + (out ? -h * .08 * r() : h * .06), Math.sin(a) * rr]);
    }
    const g0 = [.1 + r() * .02, .19 + r() * .03, .12], tip = [.17, .29, .17], dark = shade(g0, .55);
    for (let i = 0; i < 2 * k; i++) {
      const p = ring[i], q = ring[(i + 1) % (2 * k)];
      const snowy = r() < .42 - u * .15, ca = snowy ? SNOW : shade(tip, 1.05);
      const cp = i % 2 === 0 ? (snowy && r() < .5 ? shade(SNOW, .9) : tip) : g0, cq = (i + 1) % 2 === 0 ? tip : g0;
      tri(apex, q, p, ca, cq, cp);
      tri(inner, p, q, dark, dark, dark);
    }
  }
  pushGeo(pos, col, new THREE.ConeGeometry(.025, .12, 5), mat4(0, .98, 0, 1, 1, 1), () => [.16, .27, .16]);
  return geoFrom(pos, col);
}
function scotsPineGeo(seed){                        // long bare reddish trunk, flat clumps of needles on top
  const r = rng(seed), pos = [], col = [];
  pushGeo(pos, col, new THREE.CylinderGeometry(.013, .022, .78, 7, 4), mat4(0, .39, 0, 1, 1, 1), y => y > .3 ? [.62, .38, .22] : [.33, .24, .18]);
  for (let i = 0; i < 4; i++) {                     // a couple of side limbs
    const a = r() * 6.3, y = .58 + i * .06;
    pushGeo(pos, col, new THREE.CylinderGeometry(.005, .008, .16, 4), mat4(Math.cos(a) * .06, y, Math.sin(a) * .06, 1, 1, 1, Math.sin(a) * .9, 0, -Math.cos(a) * .9), () => [.4, .27, .18]);
  }
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * 6.3 + r(), d = i === 0 ? 0 : .09 + r() * .07, y = .78 + r() * .14 - d * .3, s = .11 + r() * .06;
    const base = [.15 + r() * .03, .27 + r() * .04, .15];
    pushGeo(pos, col, new THREE.IcosahedronGeometry(1, 1), mat4(Math.cos(a) * d, y, Math.sin(a) * d, s, s * .45, s, r(), r(), r()),
      (fy, ny) => ny > .55 && r() < .5 ? SNOW : ny < -.3 ? shade(base, .6) : shade(base, .85 + r() * .3));
  }
  return geoFrom(pos, col);
}
function birchGeo(seed, leafy){                     // white bark with black marks, upward branches, light crown or bare twigs
  const r = rng(seed), pos = [], col = [];
  pushGeo(pos, col, new THREE.CylinderGeometry(.015, .026, .8, 7, 12), mat4(0, .4, 0, 1, 1, 1),
    y => (y < .06 || r() < .2) ? [.12, .11, .1] : [.88 + r() * .06, .87 + r() * .05, .82]);
  const tips = [];
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * 6.3 + r() * .6, y = .45 + r() * .3, len = .22 + r() * .12, lean = .5 + r() * .35;
    const ex = Math.cos(a) * Math.sin(lean) * len, ez = Math.sin(a) * Math.sin(lean) * len, ey = Math.cos(lean) * len;
    pushGeo(pos, col, new THREE.CylinderGeometry(.003, .007, len, 4), mat4(ex / 2, y + ey / 2, ez / 2, 1, 1, 1, Math.sin(a) * lean, 0, -Math.cos(a) * lean), () => [.25, .21, .19]);
    tips.push([ex, y + ey, ez]);
  }
  if (leafy) {
    const leaf = [.52 + r() * .1, .5 + r() * .08, .24];
    for (const [x, y, z] of tips) for (let j = 0; j < 2; j++) {
      const s = .07 + r() * .06;
      pushGeo(pos, col, new THREE.IcosahedronGeometry(1, 0), mat4(x + (r() - .5) * .06, y + (r() - .3) * .06, z + (r() - .5) * .06, s, s * .8, s, r(), r(), r()),
        (fy, ny) => shade(leaf, ny > .3 ? 1.12 + r() * .1 : .75 + r() * .15));
    }
  } else {
    for (const [x, y, z] of tips) for (let j = 0; j < 3; j++) {
      const a = r() * 6.3, l = .06 + r() * .06;
      pushGeo(pos, col, new THREE.CylinderGeometry(.0015, .003, l, 3), mat4(x + Math.cos(a) * l * .4, y + l * .4, z + Math.sin(a) * l * .4, 1, 1, 1, Math.sin(a) * .7, 0, -Math.cos(a) * .7), () => [.3, .24, .22]);
    }
  }
  return geoFrom(pos, col);
}
const TREE_GEO = {
  spruce: [spruceGeo(1), spruceGeo(2), spruceGeo(3)],
  pine: [scotsPineGeo(11), scotsPineGeo(12)],
  birchLeaf: [birchGeo(21, true), birchGeo(22, true)],
  birchBare: [birchGeo(31, false), birchGeo(32, false)]
};
/* trees: list of {x, z, y, kind:'pine'|'birch', h} */
function plantTrees(grp, r, list){
  const buckets = new Map();
  for (const t of list) {
    let key;
    if (t.kind === 'pine') key = r() < .74 ? 'spruce:' + Math.floor(r() * 3) : 'pine:' + Math.floor(r() * 2);
    else key = (r() < .55 ? 'birchBare:' : 'birchLeaf:') + Math.floor(r() * 2);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(t);
  }
  for (const [key, items] of buckets) {
    const [type, vi] = key.split(':'), geo = TREE_GEO[type][+vi], mesh = new THREE.InstancedMesh(geo, treeMat, items.length);
    items.forEach((t, i) => {
      const h = type === 'pine' ? t.h * 1.15 : type === 'spruce' ? t.h * .95 : t.h * 1.1, w = .85 + r() * .35;
      D.position.set(t.x, (t.y || 0) - .05, t.z); D.rotation.set((r() - .5) * .04, r() * 6.3, (r() - .5) * .04); D.scale.set(h * w, h, h * w); D.updateMatrix(); mesh.setMatrixAt(i, D.matrix);
      const dead = type !== 'birchBare' && type !== 'birchLeaf' && r() < .08;
      if (dead) COL.setRGB(1.7, 1.05, .75); else { const v = .86 + r() * .28; COL.setRGB(v, v * (.97 + r() * .06), v); }
      mesh.setColorAt(i, COL);
    });
    grp.add(mesh);
  }
}
function addWagons(grp, r, x, z, n){
  const body = new THREE.InstancedMesh(boxGeo, matWhite, n), roof = new THREE.InstancedMesh(boxGeo, matWhite, n), bog = new THREE.InstancedMesh(boxGeo, matHole, n * 2);
  for (let k = 0; k < n; k++, z -= 14) {
    const tilt = r() < .2 ? (r() - .5) * .12 : 0;
    D.position.set(x, .95, z - 6.6); D.rotation.set(0, 0, tilt); D.scale.set(3, 3.2, 13); D.updateMatrix(); body.setMatrixAt(k, D.matrix);
    D.position.set(x, 4.12, z - 6.6); D.scale.set(3.15, .25, 13.1); D.updateMatrix(); roof.setMatrixAt(k, D.matrix);
    const c = [[.36, .22, .15], [.29, .31, .23], [.32, .18, .13], [.25, .24, .22]][Math.floor(r() * 4)];
    COL.setRGB(...c); body.setColorAt(k, COL); COL.multiplyScalar(.8); roof.setColorAt(k, COL);
    D.rotation.set(0, 0, 0);
    [-3, -10.2].forEach((o, j) => { D.position.set(x, .3, z + o); D.scale.set(2.4, .7, 2.6); D.updateMatrix(); bog.setMatrixAt(k * 2 + j, D.matrix); });
  }
  grp.add(body, roof, bog);
}
/* clearance rule shared by all routes: the diverging branch (right, from z=-40 in the last tile)
   and the stub of the untaken track (first 110 m of the first tile) must stay free */
function rightMin(idx, z, base){ return (idx === 5 && z < -30) || (idx === 0 && z > -115) ? Math.max(base, 11.5) : base; }
function leftMin(idx, z, base){ return idx === 0 && z > -115 ? Math.max(base, 9.5) : base; }
