import * as THREE from 'three';

/* A single, anatomically-built right hand that grips the mug HANDLE (never the mug body).
   - Fingers and thumb are smooth skinned tubes (variable radius, knuckle swells, creases, nails).
   - Every digit is wrapped around the real handle bar: the grip is computed from the handle curve,
     so the fingers touch the bar instead of floating near it. */

/* ---------- handle (shared with mug3d.js so the hand always matches the mug) ---------- */
export const HANDLE_POINTS = [[0.95, 0.62, 0], [1.38, 0.66, 0], [1.66, 0.3, 0], [1.66, -0.3, 0], [1.38, -0.62, 0], [0.95, -0.58, 0]];
export const HANDLE_R = 0.115;

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const gauss = (x, m, s) => Math.exp(-((x - m) * (x - m)) / (2 * s * s));
const sstep = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
const sgnp = (x, p) => Math.sign(x) * Math.pow(Math.abs(x), p);
const ease = x => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);
const lerp = (a, b, t) => a + (b - a) * t;

const handleCurve = new THREE.CatmullRomCurve3(HANDLE_POINTS.map(p => new THREE.Vector3(...p)));
const hSamples = [];
for (let i = 0; i <= 800; i++) { const t = i / 800; hSamples.push({ p: handleCurve.getPointAt(t), T: handleCurve.getTangentAt(t) }); }
function barAt(y) {                                   // outer bar centre + horizontal half-width at height y
  let best = null, bd = 1e9;
  for (const s of hSamples) { if (s.p.x < 1.3) continue; const d = Math.abs(s.p.y - y); if (d < bd) { bd = d; best = s; } }
  return { x: best.p.x, hw: HANDLE_R / Math.max(0.55, Math.abs(best.T.y)) };
}

/* ---------- materials ---------- */
function skinTex(kind) {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), offs = [-S, 0, S];
  const wrap = fn => offs.forEach(ox => offs.forEach(oy => fn(ox, oy)));
  if (kind === 'bump') {
    g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, S, S);
    g.lineCap = 'round';
    for (let i = 0; i < 520; i++) {                   // fine criss-cross skin lines
      const x = Math.random() * S, y = Math.random() * S, a = (Math.random() < .5 ? .6 : -.6) + (Math.random() - .5) * .35, l = 10 + Math.random() * 22;
      wrap((ox, oy) => { g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke(); });
    }
    for (let i = 0; i < 1200; i++) {                   // pores
      const x = Math.random() * S, y = Math.random() * S, r = .7 + Math.random() * .9;
      wrap((ox, oy) => { g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(x + ox, y + oy, r, 0, 7); g.fill(); });
    }
  } else {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 200; i++) {                   // soft colour mottling
      const x = Math.random() * S, y = Math.random() * S, r = 18 + Math.random() * 34, warm = Math.random() < .6;
      wrap((ox, oy) => {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        gr.addColorStop(0, warm ? 'rgba(255,150,130,.13)' : 'rgba(170,120,80,.08)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      });
    }
    for (let i = 0; i < 80; i++) {                    // a few tiny freckles
      const x = Math.random() * S, y = Math.random() * S;
      wrap((ox, oy) => { g.fillStyle = 'rgba(150,90,60,.10)'; g.beginPath(); g.arc(x + ox, y + oy, 1.2 + Math.random() * 1.5, 0, 7); g.fill(); });
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16;
  if (kind !== 'bump') t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const skin = new THREE.MeshPhysicalMaterial({
  color: 0xDDA682, map: skinTex('color'), bumpMap: skinTex('bump'), bumpScale: 0.5, vertexColors: true,
  roughness: 0.5, clearcoat: 0.1, clearcoatRoughness: 0.55, sheen: 1, sheenColor: new THREE.Color(0xFFB59E), sheenRoughness: 0.5,
  emissive: 0x3a1208, emissiveIntensity: 0.3, envMapIntensity: 0.75
});
const nailMat = new THREE.MeshPhysicalMaterial({ color: 0xF0CBBF, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1 });
const cloth = new THREE.MeshPhysicalMaterial({ color: 0x2B3550, roughness: 0.92, sheen: 1, sheenColor: new THREE.Color(0x5a6c9a), sheenRoughness: 0.6, side: THREE.DoubleSide });

/* ---------- generic skinned tube ("sweep") ---------- */
const EXP = 0.91, Y_UP = V3(0, 1, 0);
function sweepMesh(o) {
  const { M = 40, n, capA = 5, capB = 6, section, tint, perim = 0.5, dsign = 1, headR = 0.08, tipR = 0.08, flatB = false, step = 0.0125, fOf, mat, uvStep = 0.16 } = o;
  const R = capA + n + capB, VPR = M + 1;
  const pos = new Float32Array(R * VPR * 3), col = new Float32Array(R * VPR * 3).fill(1), uv = new Float32Array(R * VPR * 2), idx = [];
  for (let r = 0; r < R - 1; r++) for (let j = 0; j < M; j++) {
    const a = r * VPR + j, b = a + 1, c = a + VPR, d = c + 1;
    if (dsign > 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
  const rings = new Array(R); let colored = false;

  function update(path) {
    for (let i = 0; i < n; i++) {
      const { p, T } = path[i];
      const W = Y_UP.clone().addScaledVector(T, -Y_UP.dot(T)); if (W.lengthSq() < 1e-6) W.set(1, 0, 0); W.normalize();
      const D = dsign > 0 ? new THREE.Vector3().crossVectors(W, T) : new THREE.Vector3().crossVectors(T, W);
      rings[capA + i] = { p: p.clone(), T: T.clone(), W, D, sc: 1, f: fOf(i) };
    }
    const first = rings[capA], last = rings[capA + n - 1];
    for (let k = 1; k <= capA; k++) {
      const th = k / capA * Math.PI / 2;
      rings[capA - k] = { ...first, p: first.p.clone().addScaledVector(first.T, -headR * Math.sin(th)), sc: Math.cos(th) };
    }
    for (let k = 1; k <= capB; k++) {
      const th = k / capB * Math.PI / 2;
      rings[capA + n - 1 + k] = { ...last, p: last.p.clone().addScaledVector(last.T, flatB ? 0 : tipR * Math.sin(th)), sc: flatB ? Math.max(0, 1 - k / capB) : Math.cos(th) };
    }
    const tmp = V3();
    for (let r = 0; r < R; r++) {
      const ring = rings[r];
      for (let j = 0; j <= M; j++) {
        const phi = j / M * Math.PI * 2, [a, b] = section(ring, phi), o3 = (r * VPR + j) * 3;
        tmp.copy(ring.p).addScaledVector(ring.W, a * ring.sc).addScaledVector(ring.D, b * ring.sc);
        pos[o3] = tmp.x; pos[o3 + 1] = tmp.y; pos[o3 + 2] = tmp.z;
        if (!colored) {
          const t = tint ? tint(ring.f, phi) : [1, 1, 1];
          col[o3] = t[0]; col[o3 + 1] = t[1]; col[o3 + 2] = t[2];
          const o2 = (r * VPR + j) * 2; uv[o2] = j / M * perim / uvStep; uv[o2 + 1] = (r - capA) * step / uvStep;
        }
      }
    }
    colored = true;
    geo.attributes.position.needsUpdate = true;
    if (geo.attributes.color) geo.attributes.color.needsUpdate = true;
    geo.attributes.uv.needsUpdate = true;
    geo.computeVertexNormals();
    const nr = geo.attributes.normal.array;                // weld the texture seam
    for (let r = 0; r < R; r++) {
      const a = (r * VPR) * 3, b = (r * VPR + M) * 3;
      const x = nr[a] + nr[b], y = nr[a + 1] + nr[b + 1], z = nr[a + 2] + nr[b + 2], l = Math.hypot(x, y, z) || 1;
      nr[a] = nr[b] = x / l; nr[a + 1] = nr[b + 1] = y / l; nr[a + 2] = nr[b + 2] = z / l;
    }
    geo.attributes.normal.needsUpdate = true;
  }
  return { mesh, rings, update, section, capA, n, M };
}

/* nail plate that rides on the back of a fingertip */
function nailMesh(sw, f0, f1, halfW = 0.85) {
  const Pn = 17, dors = -Math.PI / 2;
  let list = null;
  const geo = new THREE.BufferGeometry(); let pos = null;
  const mesh = new THREE.Mesh(geo, nailMat); mesh.castShadow = true; mesh.frustumCulled = false;
  function update() {
    if (!list) {
      list = []; for (let r = sw.capA; r < sw.capA + sw.n; r++) { const f = sw.rings[r].f; if (f >= f0 && f <= f1) list.push(r); }
      pos = new Float32Array(list.length * Pn * 3); const idx = [];
      for (let i = 0; i < list.length - 1; i++) for (let j = 0; j < Pn - 1; j++) { const a = i * Pn + j, b = a + 1, c = a + Pn, d = c + 1; idx.push(a, b, c, b, d, c); }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
    }
    const tmp = V3();
    list.forEach((r, i) => {
      const ring = sw.rings[r], u = (ring.f - f0) / (f1 - f0);
      for (let j = 0; j < Pn; j++) {
        const v = j / (Pn - 1) * 2 - 1, phi = dors + v * halfW, [a, b] = sw.section(ring, phi);
        const dome = Math.cos(v * Math.PI / 2) * Math.pow(Math.sin(Math.PI * (0.08 + 0.84 * u)), 0.6);
        const k = 1.004 + 0.02 * dome, o3 = (i * Pn + j) * 3;
        tmp.copy(ring.p).addScaledVector(ring.W, a * k).addScaledVector(ring.D, b * k);
        pos[o3] = tmp.x; pos[o3 + 1] = tmp.y; pos[o3 + 2] = tmp.z;
      }
    });
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
  }
  return { mesh, update };
}

/* ---------- digit shapes ---------- */
function fingerSection(r, joints) {
  return (ring, phi) => {
    const f = Math.max(ring.f, 0), c = Math.cos(phi), s = Math.sin(phi), vent = Math.max(0, s);
    const rw = r * (1 - 0.17 * f) * (1 + 0.055 * gauss(f, joints[0], 0.05) + 0.045 * gauss(f, joints[1], 0.04));
    const depth = s > 0 ? (0.95 + 0.1 * gauss(f, 0.86, 0.11)) : 0.9;
    const crease = 1 - 0.06 * (gauss(f, joints[0], 0.014) + gauss(f, joints[1], 0.012)) * Math.pow(vent, 1.5);
    return [rw * sgnp(c, EXP), rw * depth * crease * sgnp(s, EXP)];
  };
}
function thumbSection() {
  return (ring, phi) => {
    const f = Math.max(ring.f, 0), c = Math.cos(phi), s = Math.sin(phi), vent = Math.max(0, s);
    const rw = lerp(0.1, 0.068, f) * (1 + 0.06 * gauss(f, 0.62, 0.06) + 0.04 * gauss(f, 0.82, 0.05) + 0.06 * gauss(f, 0.88, 0.08));
    const crease = 1 - 0.06 * (gauss(f, 0.62, 0.014) + gauss(f, 0.82, 0.012)) * Math.pow(vent, 1.5);
    return [rw * sgnp(c, EXP), rw * (s > 0 ? 0.96 : 0.88) * crease * sgnp(s, EXP)];
  };
}
const white = [1, 1, 1], blush = [1, 0.84, 0.8];
const mixc = (w) => [lerp(1, blush[0], w), lerp(1, blush[1], w), lerp(1, blush[2], w)];
const fingerTint = joints => (f, phi) => {
  const dors = Math.max(0, -Math.sin(phi)), vent = Math.max(0, Math.sin(phi));
  return mixc(Math.min(1, 0.55 * sstep(0.8, 1, f) + 0.4 * (gauss(f, joints[0], 0.045) + gauss(f, joints[1], 0.035)) * dors + 0.18 * vent * sstep(0.5, 1, f)));
};

/* ---------- palm + forearm ---------- */
const ST = [[0, .30, .074, .08], [.12, .312, .078, .086], [.3, .30, .08, .095], [.46, .262, .082, .095], [.6, .215, .088, .09],
  [.78, .205, .092, .09], [1.2, .235, .12, .12], [2, .27, .165, .165], [3.8, .30, .2, .2]];
function station(s) {
  if (s <= ST[0][0]) return ST[0].slice(1);
  for (let i = 0; i < ST.length - 1; i++) if (s <= ST[i + 1][0]) {
    const t = sstep(ST[i][0], ST[i + 1][0], s); return [1, 2, 3].map(k => lerp(ST[i][k], ST[i + 1][k], t));
  }
  return ST[ST.length - 1].slice(1);
}

/* ---------- the hand ---------- */
export function createHands(scene) {
  const group = new THREE.Group(); scene.add(group);

  // where each digit leaves the tangent line and starts wrapping the bar
  const A_S = -55 * Math.PI / 180;
  const TDIR = V3(Math.sin(A_S), 0, -Math.cos(A_S));             // direction fingers travel
  const NRM = V3(-Math.cos(A_S), 0, -Math.sin(A_S));             // from contact point toward bar axis
  const TP = TDIR.clone().negate();                              // palm -> wrist direction

  function wrapDef(yc, rf, ell, s0) {
    const b = barAt(yc), R = b.hw + rf + 0.003;
    return { yc, rf, R, xc: b.x, s0, ell, P0: V3(b.x + R * Math.cos(A_S), yc, R * Math.sin(A_S)) };
  }
  function wrapPt(d, u, c) {                                     // point at distance u from P0 along the grip path
    const k = c / d.R;
    if (u <= 0 || k * u < 1e-4) return { p: d.P0.clone().addScaledVector(TDIR, u), T: TDIR.clone() };
    const ku = k * u;
    return {
      p: d.P0.clone().addScaledVector(TDIR, Math.sin(ku) / k).addScaledVector(NRM, (1 - Math.cos(ku)) / k),
      T: TDIR.clone().multiplyScalar(Math.cos(ku)).addScaledVector(NRM, Math.sin(ku))
    };
  }

  // four fingers stacked along the straight part of the handle bar
  const FS = [
    { r: .082, ell: .60, s0: .13, j: [.43, .71] },
    { r: .086, ell: .65, s0: .13, j: [.43, .71] },
    { r: .080, ell: .60, s0: .13, j: [.43, .71] },
    { r: .068, ell: .49, s0: .12, j: [.43, .71] }
  ];
  let yc = 0.27;
  FS.forEach((f, i) => { if (i) yc -= FS[i - 1].r + f.r - 0.008; f.yc = yc; f.def = wrapDef(yc, f.r, f.ell, f.s0); });
  const yAxis = FS.reduce((a, f) => a + f.yc, 0) / FS.length;
  const Kc = FS.reduce((a, f) => a.add(f.def.P0.clone().addScaledVector(TDIR, -f.s0)), V3()).multiplyScalar(1 / FS.length);
  const Dp = new THREE.Vector3().crossVectors(TP, Y_UP);        // palm-side normal

  const EMBED = 0.09, NF = 120, parts = [];
  FS.forEach((f, i) => {
    const total = EMBED + f.ell, du = total / (NF - 1);
    const sw = sweepMesh({
      n: NF, M: 40, perim: 0.52, step: du, headR: f.r * .9, tipR: f.r * .8,
      fOf: k => (k * du - EMBED) / f.ell, section: fingerSection(f.r, f.j), tint: fingerTint(f.j), mat: skin
    });
    const nail = nailMesh(sw, 0.74, 0.97, 0.8);
    f.build = c => {
      const path = []; for (let k = 0; k < NF; k++) path.push(wrapPt(f.def, k * du - EMBED - f.s0, c));
      sw.update(path); nail.update();
    };
    group.add(sw.mesh, nail.mesh); parts.push(f);
  });

  // thumb: rests on top of the bar, above the index finger
  const rth = 0.08, thDef = wrapDef(FS[0].yc + FS[0].r + rth + 0.004, rth, 0, 0.07);
  const thArc = 0.27, NT = 110;
  const T0 = Kc.clone().addScaledVector(TP, 0.34).addScaledVector(Y_UP, 0.27);
  const Q = thDef.P0.clone().addScaledVector(TDIR, -thDef.s0);
  const T1 = T0.clone().lerp(Q, 0.5).addScaledVector(Dp, 0.01);
  const thSw = sweepMesh({
    n: NT, M: 40, perim: 0.6, step: 0.012, headR: 0.1, tipR: 0.075,
    fOf: k => k / (NT - 1), section: thumbSection(), tint: (f, phi) => {
      const dors = Math.max(0, -Math.sin(phi));
      return mixc(Math.min(1, 0.5 * sstep(0.82, 1, f) + 0.35 * (gauss(f, 0.62, 0.05) + gauss(f, 0.82, 0.04)) * dors));
    }, mat: skin
  });
  const thNail = nailMesh(thSw, 0.78, 0.97, 0.85);
  function buildThumb(c) {
    const ctrl = [T0, T1, Q.clone().addScaledVector(TDIR, -0.04), Q];
    const steps = 9;
    for (let i = 0; i <= steps; i++) ctrl.push(wrapPt(thDef, thArc * (i / steps), c).p);
    const cv = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
    const pts = cv.getSpacedPoints(NT - 1), path = pts.map((p, i) => ({ p, T: cv.getTangentAt(i / (NT - 1)) }));
    thSw.update(path); thNail.update();
  }
  group.add(thSw.mesh, thNail.mesh);

  // palm, wrist and forearm in one continuous skin
  const DF = V3(0.9, -0.12, 0.42).normalize(), Wp = Kc.clone().addScaledVector(TP, 0.6);
  const armCurve = new THREE.CatmullRomCurve3([
    Kc.clone(), Kc.clone().addScaledVector(TP, 0.3), Wp,
    Wp.clone().addScaledVector(TP.clone().add(DF).normalize(), 0.4), Wp.clone().addScaledVector(DF, 0.9),
    Wp.clone().addScaledVector(DF, 1.8), Wp.clone().addScaledVector(DF, 3.2)], false, 'centripetal');
  const NA = 260, armLen = armCurve.getLength(), armPts = armCurve.getSpacedPoints(NA - 1);
  const armPath = armPts.map((p, i) => ({ p, T: armCurve.getTangentAt(i / (NA - 1)) })), dsA = armLen / (NA - 1);
  const xk = FS.map(f => f.yc - yAxis);
  const armSection = (ring, phi) => {
    const s = ring.f, [hw, tp, td] = station(s), c = Math.cos(phi), sn = Math.sin(phi);
    let a = hw * sgnp(c, 0.8), b = (sn > 0 ? tp : td) * sgnp(sn, 0.8);
    if (sn > 0) {                                                 // thenar + hypothenar pads
      const w = Math.pow(sn, 0.7);
      b += w * (0.045 * gauss(s, 0.34, 0.11) * sstep(0.02, 0.2, a) + 0.025 * gauss(s, 0.4, 0.12) * sstep(0.02, 0.2, -a));
    } else {                                                      // tendon ridges and knuckles on the back
      let ridge = 0; xk.forEach(x => ridge += gauss(a, x, 0.03));
      b *= 1 + 0.05 * ridge * (1 - sstep(0.15, 0.55, s)) + 0.12 * ridge * gauss(s, 0.03, 0.05);
    }
    return [a, b];
  };
  const armSw = sweepMesh({
    n: NA, M: 72, perim: 1.4, dsign: -1, capA: 6, capB: 4, headR: 0.09, tipR: 0.1, step: dsA,
    fOf: i => i * dsA, section: armSection, mat: skin,
    tint: (s, phi) => mixc(Math.max(0, Math.sin(phi)) * 0.25 * (1 - sstep(0.2, 0.7, s)))
  });
  armSw.update(armPath); group.add(armSw.mesh);

  // sleeve
  const i0 = armPath.findIndex((_, i) => i * dsA >= 1.15);
  const slPath = armPath.slice(i0), sleeve = sweepMesh({
    n: slPath.length, M: 72, perim: 2.0, dsign: -1, capA: 3, capB: 3, headR: 0.02, tipR: 0, flatB: true, step: dsA,
    fOf: i => 1.15 + i * dsA, mat: cloth,
    section: (ring, phi) => {
      const s = ring.f, k = 1 + 0.12 * (s - 1.15) / 2.6 + 0.022 * Math.sin(s * 30 + Math.cos(phi) * 5) * Math.sin(phi * 3 + s * 9);
      return [0.34 * k * sgnp(Math.cos(phi), 0.9), 0.3 * k * sgnp(Math.sin(phi), 0.9)];
    }
  });
  sleeve.update(slPath); group.add(sleeve.mesh);

  /* ---------- animation: slide along the tangent, then close fingers around the bar ---------- */
  let t0 = null, last = 0, on = true, lastC = -1, lastT = -1;
  const off = TP.clone().multiplyScalar(2.6).add(V3(0, -0.15, 0));
  function build(c, ct) {
    FS.forEach((f, i) => f.build(c[i]));
    buildThumb(ct);
  }
  build([0, 0, 0, 0], 0);
  function update(t) {
    last = t; if (!group.visible) return;
    if (t0 === null) t0 = t;
    const p = ease((t - t0 - 0.25) / 1.6);
    const c = FS.map((_, i) => ease((t - t0 - 0.95 - i * 0.07) / 1.1)), ct = ease((t - t0 - 1.35) / 1.1);
    const key = c.join() + ct;
    if (key !== lastC) { build(c, ct); lastC = key; }
    group.position.lerpVectors(off, V3(), p);
    group.position.y += Math.sin(t * 1.3) * 0.006 * p;
  }
  return {
    group, update,
    toggle() { on = !on; group.visible = on; if (on) { t0 = last; lastC = -1; } return on; }
  };
}

export function createSteam(scene) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c), group = new THREE.Group(), puffs = [];
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
    puffs.push({ s, off: i / 9, x: (Math.random() - .5) * .5, z: (Math.random() - .5) * .5 }); group.add(s);
  }
  scene.add(group);
  return {
    group,
    update(t) {
      puffs.forEach(p => {
        const k = (t * 0.16 + p.off) % 1;
        p.s.position.set(p.x + Math.sin(t + p.off * 9) * 0.12 * k, 0.75 + k * 1.7, p.z);
        p.s.scale.setScalar(0.35 + k * 0.9);
        p.s.material.opacity = Math.sin(k * Math.PI) * 0.35;
      });
    }
  };
}
