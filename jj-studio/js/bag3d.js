import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

/* ===== 1. SPECS (real cm; 1 scene unit = 10 cm) ===== */
const CM = 0.1;
const TEX_W = 2048;
const PRICE = 350;                       // sample price: the owner sets the real one later
const BAG = { W: 34, H: 28, D: 12, wall: 0.5, band: 5, bottom: 2.4 };
const { W, H, D } = BAG;
const PANEL = { w: W - 6.4, h: H - BAG.band - BAG.bottom };                  // black front panel
const POCKET = { w: PANEL.w - 7, h: PANEL.h - 3.5, bottomGap: 3.5 };         // white-piped pocket (text area)
const LEG = 7;                                                               // handle leg position (cm from centre)
const BTN_X = 3.2, BTN_Y = H - 2.7;                                          // black button on the jute band

const FONTS = [
  ['Kaushan Script', s => `400 ${s}px "Kaushan Script", cursive`],
  ['Great Vibes', s => `400 ${s}px "Great Vibes", cursive`],
  ['Dancing Script', s => `700 ${s}px "Dancing Script", cursive`],
  ['Pacifico', s => `400 ${s}px Pacifico, cursive`],
  ['Poppins Bold', s => `700 ${s}px Poppins, Arial, sans-serif`],
  ['Baloo Rounded', s => `800 ${s}px "Baloo 2", Poppins, sans-serif`],
  ['Elegant Serif', s => `italic 700 ${s}px Georgia, "Times New Roman", serif`]
];

/* One colour = solid. Two or more = gradient. */
const PALETTE = [
  { n: 'Gold', c: ['#e9c660', '#c99a2e', '#f2d97e', '#c08f26'] }, { n: 'White', c: ['#ffffff'] }, { n: 'Black', c: ['#1a1a1a'] }, { n: 'Silver', c: ['#b8bcc4'] },
  { n: 'Red', c: ['#d92332'] }, { n: 'Orange', c: ['#ff7a1a'] }, { n: 'Yellow', c: ['#ffd36a'] },
  { n: 'Green', c: ['#2e9b5b'] }, { n: 'Teal', c: ['#1f8392'] }, { n: 'Blue', c: ['#2f6fde'] },
  { n: 'Navy', c: ['#1b2a5c'] }, { n: 'Purple', c: ['#7d4fb5'] }, { n: 'Pink', c: ['#f58fb0'] },
  { n: 'Hot Pink', c: ['#e6399b'] }, { n: 'Beige', c: ['#e8d8bf'] }, { n: 'Brown', c: ['#6b4226'] },
  { n: 'Gold Foil', c: ['#f3d572', '#c18f22', '#f3d572'] }, { n: 'Rose Gold', c: ['#b76e79', '#f4c4b0', '#b76e79'] },
  { n: 'Sunset', c: ['#ff5f6d', '#ffc371'] }, { n: 'Fire', c: ['#f12711', '#f5af19'] },
  { n: 'Ocean', c: ['#2193b0', '#6dd5ed'] }, { n: 'Aurora', c: ['#00c6ff', '#0072ff'] },
  { n: 'Mint', c: ['#00b09b', '#96c93d'] }, { n: 'Purple Haze', c: ['#7f00ff', '#e100ff'] },
  { n: 'Blush', c: ['#ee9ca7', '#ffdde1'] }, { n: 'Candy', c: ['#ff9a9e', '#fad0c4', '#a18cd1'] },
  { n: 'Rainbow', c: ['#ff0000', '#ffd000', '#2ecc71', '#3498db', '#9b59b6'] }, { n: 'Midnight', c: ['#232526', '#5a5f66'] }
];

const $ = s => document.querySelector(s);
const viewport = $('#viewport');

const state = { text: 'Jaye', font: 0, fill: PALETTE[0], textSize: 0.3, tx: 0, ty: 0.12, hearts: true, scarf: true };

/* ===== 2. RENDERER / SCENE (plain studio table, no props) ===== */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.prepend(renderer.domElement);

const BG = 0x8c9198;
const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
scene.fog = new THREE.Fog(BG, 11, 24);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);

const keyLight = new THREE.DirectionalLight(0xfff1de, 1.35);
keyLight.position.set(-3.5, 7, 5); keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048); keyLight.shadow.bias = -0.0004; keyLight.shadow.normalBias = 0.02; keyLight.shadow.radius = 6;
Object.assign(keyLight.shadow.camera, { left: -6, right: 6, top: 6, bottom: -4, near: 1, far: 22 });
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0xdfe8ff, 0.55); rimLight.position.set(5, 4, -4); scene.add(rimLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 0.35); fillLight.position.set(4, 2, 5); scene.add(fillLight);
scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 0.4));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
controls.minDistance = 2.5; controls.maxDistance = 14;
controls.minPolarAngle = 0.3; controls.maxPolarAngle = Math.PI * 0.55;

function noiseTexture(size, mid, amp, rx, ry) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), img = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) { const v = mid + (Math.random() - 0.5) * 2 * amp; img.data.set([v, v, v, 255], i * 4); }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t;
}

// kraft-paper tabletop
const table = new THREE.Mesh(
  new THREE.CircleGeometry(16, 64),
  new THREE.MeshStandardMaterial({ color: 0xd3b58c, roughness: 0.9, bumpMap: noiseTexture(256, 128, 70, 40, 40), bumpScale: 0.3 })
);
table.rotation.x = -Math.PI / 2; table.position.y = -0.002; table.receiveShadow = true; scene.add(table);

const shadowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 20, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,.65)'); gr.addColorStop(0.4, 'rgba(0,0,0,.3)'); gr.addColorStop(0.75, 'rgba(0,0,0,.08)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
})();

/* ===== 3. MATERIALS ===== */
/* Woven jute: real over/under plain weave, thread shading, fuzzy fibres. Colour map + matching bump map. */
function weaveCanvas(bump) {
  const S = 512, cell = 16, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = bump ? '#707070' : '#7a5a30'; g.fillRect(0, 0, S, S);
  for (let j = 0; j < S / cell; j++) for (let i = 0; i < S / cell; i++) {
    const horiz = (i + j) % 2 === 0, k = 0.84 + Math.random() * 0.3, x = i * cell, y = j * cell;
    const grad = horiz ? g.createLinearGradient(0, y, 0, y + cell) : g.createLinearGradient(x, 0, x + cell, 0);
    if (bump) {
      grad.addColorStop(0, '#303030'); grad.addColorStop(0.5, '#f4f4f4'); grad.addColorStop(1, '#303030');
    } else {
      const r = Math.min(255, 214 * k) | 0, gg = Math.min(255, 172 * k) | 0, b = Math.min(255, 108 * k) | 0;
      grad.addColorStop(0, `rgb(${r * .55 | 0},${gg * .55 | 0},${b * .55 | 0})`);
      grad.addColorStop(0.5, `rgb(${Math.min(255, r * 1.08) | 0},${Math.min(255, gg * 1.08) | 0},${Math.min(255, b * 1.08) | 0})`);
      grad.addColorStop(1, `rgb(${r * .6 | 0},${gg * .6 | 0},${b * .6 | 0})`);
    }
    g.fillStyle = grad;
    if (horiz) g.fillRect(x - 1, y + 1, cell + 2, cell - 2); else g.fillRect(x + 1, y - 1, cell - 2, cell + 2);
    // thread fibre lines
    g.strokeStyle = bump ? 'rgba(0,0,0,.25)' : 'rgba(70,45,15,.25)'; g.lineWidth = 1;
    for (let f = 0; f < 3; f++) {
      g.beginPath();
      if (horiz) { const yy = y + 4 + f * 4; g.moveTo(x, yy); g.lineTo(x + cell, yy + (Math.random() - .5) * 2); }
      else { const xx = x + 4 + f * 4; g.moveTo(xx, y); g.lineTo(xx + (Math.random() - .5) * 2, y + cell); }
      g.stroke();
    }
  }
  for (let i = 0; i < 1400; i++) {                                              // loose fibres
    const x = Math.random() * S, y = Math.random() * S, a = Math.random() * Math.PI * 2, l = 3 + Math.random() * 9;
    g.strokeStyle = bump ? (Math.random() < .5 ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.3)') : (Math.random() < 0.5 ? 'rgba(255,236,190,.4)' : 'rgba(80,55,20,.32)');
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  return c;
}
const juteColorCanvas = weaveCanvas(false), juteBumpCanvas = weaveCanvas(true);

function juteMat(wCm, hCm, tint = 0xffffff) {
  const map = new THREE.CanvasTexture(juteColorCanvas), bump = new THREE.CanvasTexture(juteBumpCanvas);
  for (const t of [map, bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(wCm / 12, hCm / 12); t.anisotropy = 16; }
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ color: tint, map, bumpMap: bump, bumpScale: 2.2, roughness: 0.97, metalness: 0, side: THREE.DoubleSide });
}

const grain = noiseTexture(256, 128, 55, 14, 10);
const canvasBlack = new THREE.MeshPhysicalMaterial({
  color: 0x151517, roughness: 0.92, sheen: 0.9, sheenRoughness: 0.55, sheenColor: new THREE.Color(0x7a7a82),
  bumpMap: grain, bumpScale: 0.35, envMapIntensity: 0.5, side: THREE.DoubleSide
});
const liningMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0f, roughness: 1, side: THREE.BackSide });
const pipingMat = new THREE.MeshStandardMaterial({ color: 0xf5f1e8, roughness: 0.85, bumpMap: grain, bumpScale: 0.15 });

/* twisted cotton rope for the handles */
const ropeBump = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.fillStyle = '#6a6a6a'; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#ffffff'; g.lineWidth = 12;
  for (const o of [-32, 0, 32, 64]) { g.beginPath(); g.moveTo(o, 64); g.lineTo(o + 64, 0); g.stroke(); }
  g.strokeStyle = '#2a2a2a'; g.lineWidth = 3;
  for (const o of [-16, 16, 48, 80]) { g.beginPath(); g.moveTo(o, 64); g.lineTo(o + 64, 0); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(80, 2); t.anisotropy = 8; return t;
})();
const ropeMat = new THREE.MeshPhysicalMaterial({
  color: 0x131315, roughness: 0.88, sheen: 0.8, sheenRoughness: 0.55, sheenColor: new THREE.Color(0x8a8a94),
  bumpMap: ropeBump, bumpScale: 1.6, envMapIntensity: 0.5
});

const buttonMat = new THREE.MeshPhysicalMaterial({ color: 0x0c0c0e, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 });

/* printed twill scarf (cream, orange, brown chain-link print) */
const scarfTex = (() => {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#f2e3c6'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#d9782a'; for (let i = 0; i < 4; i++) g.fillRect(0, i * 64 + 4, S, 26);
  g.fillStyle = '#6e3a16'; for (let i = 0; i < 4; i++) g.fillRect(0, i * 64 + 36, S, 7);
  g.lineWidth = 4;
  for (let y = 0; y < S; y += 32) for (let x = 0; x < S; x += 32) {
    const ox = ((y / 32) % 2) * 16;
    g.fillStyle = 'rgba(250,232,190,.85)'; g.strokeStyle = '#5b3216';
    g.beginPath(); g.ellipse(x + 16 + ox, y + 16, 12, 6, Math.PI / 4, 0, 7); g.fill(); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.2, 1.6); t.anisotropy = 8; return t;
})();
const scarfMat = new THREE.MeshPhysicalMaterial({ map: scarfTex, roughness: 0.4, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide });

/* ===== 4. SHAPE HELPERS ===== */
const sstep = (x, a, b) => THREE.MathUtils.smoothstep(x, a, b);

/** how far the soft front/back faces swell outward at (x, y). Zero at the edges, fullest in the middle of the bag. */
function bulge(x, y) {
  const u = Math.min(1, Math.abs(x) / (W / 2)), v = THREE.MathUtils.clamp(y / H, 0, 1);
  return 1.0 * Math.pow(1 - u * u, 0.7) * sstep(v, 0, 0.5) * (1 - 0.4 * v * v);
}
/** inward fold of the side gussets */
function dent(z, y) {
  const w = THREE.MathUtils.clamp(z / (D / 2), -1, 1), v = THREE.MathUtils.clamp(y / H, 0, 1);
  return 0.9 * (1 - w * w) * sstep(v, 0.05, 0.6);
}

function surface(w, h, sx, sy, fn) {
  const g = new THREE.PlaneGeometry(w, h, sx, sy), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const r = fn(p.getX(i), p.getY(i)); p.setXYZ(i, r[0], r[1], r[2]); }
  g.computeVertexNormals();
  return g;
}

function rrPath(P, x0, y0, w, h, r) {
  P.moveTo(x0 + r, y0);
  P.lineTo(x0 + w - r, y0); P.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  P.lineTo(x0 + w, y0 + h - r); P.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  P.lineTo(x0 + r, y0 + h); P.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
  P.lineTo(x0, y0 + r); P.quadraticCurveTo(x0, y0, x0 + r, y0);
}

function roundedBlock(w, h, d, rad, material) {
  const s = new THREE.Shape(); rrPath(s, -w / 2, -h / 2, w, h, rad);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3, curveSegments: 8 });
  g.translate(0, 0, -d / 2);
  return new THREE.Mesh(g, material);
}

function handle(side) {                                  // side: +1 front, -1 back
  const pts = [[-LEG, -2], [-LEG, 5], [-LEG + 0.7, 11], [-4.4, 15.2], [0, 17], [4.4, 15.2], [LEG - 0.7, 11], [LEG, 5], [LEG, -2]]
    .map(([x, y]) => new THREE.Vector3(x, y, 0));
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 200, 0.95, 22, false), ropeMat);
  const g = new THREE.Group(); g.add(tube);
  g.position.set(0, H - 1, side * (D / 2 - 1.0));
  g.rotation.x = side * -0.18;                           // handles lean toward each other
  return g;
}

/** soft bow + two hanging tails, resting on the front of the bag next to the right handle leg */
function buildScarf() {
  const g = new THREE.Group();
  const kx = LEG + 1.2, ky = H + 1.4, kz = D / 2 - 0.4;

  const knotGroup = new THREE.Group(); knotGroup.position.set(kx, ky, kz); knotGroup.rotation.set(0.1, 0.1, -0.08);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 18), scarfMat); knot.scale.set(1.05, 0.85, 1.15); knotGroup.add(knot);
  for (const s of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.55, 20, 44), scarfMat);
    loop.scale.set(1.35, 1.0, 0.5); loop.position.set(s * 2.5, 0.55, 0.15); loop.rotation.set(0.1, s * 0.25, s * 0.45);
    knotGroup.add(loop);
  }
  g.add(knotGroup);

  const tail = (x0, len, dx, w, phase) => {
    const geo = new THREE.PlaneGeometry(1, 1, 8, 30), p = geo.attributes.position;
    const yTop = ky - 0.6;
    for (let i = 0; i < p.count; i++) {
      const s = p.getX(i) * 2, t = 0.5 - p.getY(i);
      const x = x0 + s * (w / 2) * (1 - 0.18 * t) + dx * Math.pow(t, 1.3);
      const y = yTop - t * len;
      const zs = D / 2 + bulge(x, y) + 0.95 + 0.35 * Math.sin(t * 6 + phase) * Math.sin(s * 1.4 + phase) * t;
      const m = sstep(t, 0, 0.28);
      p.setXYZ(i, x, y, kz * (1 - m) + zs * m);
    }
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, scarfMat);
  };
  g.add(tail(kx - 0.3, 9.5, -1.0, 2.5, 0), tail(kx + 0.9, 8.0, 1.5, 2.3, 2.2));
  return g;
}

/* ===== 5. BUILD THE BAG ===== */
let printLayer = null, scarfGroup = null, frontCam = new THREE.Vector3(), camTween = null;

function buildBag() {
  const { bottom } = BAG;
  const g = new THREE.Group();
  const edgeTint = 0xd9b88a;

  // soft swelling front and back faces
  const front = new THREE.Mesh(surface(W, H, 48, 48, (x, y) => [x, y + H / 2, D / 2 + bulge(x, y + H / 2)]), juteMat(W, H));
  const back = new THREE.Mesh(surface(W, H, 48, 48, (x, y) => [x, y + H / 2, -(D / 2 + bulge(x, y + H / 2))]), juteMat(W, H));
  // side gussets, folded slightly inward
  const sideMesh = sgn => new THREE.Mesh(surface(D, H, 20, 36, (lz, y) => [sgn * (W / 2 - dent(lz, y + H / 2)), y + H / 2, lz]), juteMat(D, H));
  const bottomMesh = new THREE.Mesh(new THREE.BoxGeometry(W, 0.6, D), juteMat(W, D)); bottomMesh.position.y = 0.3;
  g.add(front, back, sideMesh(1), sideMesh(-1), bottomMesh);

  // dark lining visible through the open top
  const lining = new THREE.Mesh(new THREE.BoxGeometry(W - 1.4, H - 1, D - 1.4), liningMat);
  lining.position.y = (H - 1) / 2 + 0.3; g.add(lining);

  // bound edges: vertical corners and bottom edges
  const edgeMat = () => juteMat(8, 8, edgeTint);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, H, 14), edgeMat());
    c.position.set(sx * W / 2, H / 2, sz * D / 2); g.add(c);
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), edgeMat()); s.position.set(sx * W / 2, 0, sz * D / 2); g.add(s);
  }
  for (const sz of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, W, 14), edgeMat());
    e.rotation.z = Math.PI / 2; e.position.set(0, 0, sz * D / 2); g.add(e);
  }
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, D, 14), edgeMat());
    e.rotation.x = Math.PI / 2; e.position.set(sx * W / 2, 0, 0); g.add(e);
  }

  // rolled top rim following the swelling front/back
  const rim = [];
  for (let i = 0; i <= 40; i++) { const x = -W / 2 + W * i / 40; rim.push(new THREE.Vector3(x, H, D / 2 + bulge(x, H))); }
  for (let k = 1; k < 12; k++) { const z = D / 2 - D * k / 12; rim.push(new THREE.Vector3(W / 2 - dent(z, H), H, z)); }
  for (let i = 40; i >= 0; i--) { const x = -W / 2 + W * i / 40; rim.push(new THREE.Vector3(x, H, -(D / 2 + bulge(x, H)))); }
  for (let k = 11; k > 0; k--) { const z = D / 2 - D * k / 12; rim.push(new THREE.Vector3(-W / 2 + dent(z, H), H, z)); }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rim, true, 'centripetal'), 420, 0.55, 12, true), juteMat(10, 10, edgeTint)));

  // black canvas front panel (follows the bulge, with a little cloth wrinkle)
  const panelY0 = bottom + PANEL.h / 2;
  const panel = new THREE.Mesh(surface(PANEL.w, PANEL.h, 48, 36, (x, ly) => {
    const y = panelY0 + ly;
    return [x, y, D / 2 + bulge(x, y) + 0.32 + 0.05 * Math.sin(x * 1.3 + y * 0.8) * Math.cos(y * 0.5)];
  }), canvasBlack);
  g.add(panel);

  // white piping along the pocket (left, bottom, right; open at the top)
  const iw = POCKET.w, ih = POCKET.h, r = 1.0;
  const cy = bottom + POCKET.bottomGap + ih / 2;
  const P = new THREE.Path();
  P.moveTo(-iw / 2, ih / 2); P.lineTo(-iw / 2, -ih / 2 + r);
  P.quadraticCurveTo(-iw / 2, -ih / 2, -iw / 2 + r, -ih / 2);
  P.lineTo(iw / 2 - r, -ih / 2); P.quadraticCurveTo(iw / 2, -ih / 2, iw / 2, -ih / 2 + r); P.lineTo(iw / 2, ih / 2);
  const pipePts = P.getSpacedPoints(300).map(p => { const y = cy + p.y; return new THREE.Vector3(p.x, y, D / 2 + bulge(p.x, y) + 0.58); });
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pipePts), 420, 0.26, 10, false), pipingMat));

  // text print layer on the pocket
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W; canvas.height = Math.round(TEX_W * ih / iw);
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const printMat = new THREE.MeshPhysicalMaterial({
    map: tex, transparent: true, roughness: 0.38, metalness: 0.3, clearcoat: 0.4, clearcoatRoughness: 0.25,
    polygonOffset: true, polygonOffsetFactor: -2
  });
  const plane = new THREE.Mesh(surface(iw, ih, 48, 36, (x, ly) => {
    const y = cy + ly;
    return [x, y, D / 2 + bulge(x, y) + 0.36 + 0.05 * Math.sin(x * 1.3 + y * 0.8) * Math.cos(y * 0.5)];
  }), printMat);
  g.add(plane);
  printLayer = { canvas, ctx: canvas.getContext('2d'), tex, mesh: plane };

  // handles, black stitched patches where they enter the bag, and the button
  g.add(handle(1), handle(-1));
  for (const side of [1, -1]) for (const x of [-LEG, LEG]) {
    const yy = H - 2.7, patch = roundedBlock(3.4, 4.4, 0.4, 0.5, canvasBlack);
    patch.position.set(x, yy, side * (D / 2 + bulge(x, yy) + 0.18));
    if (side < 0) patch.rotation.y = Math.PI;
    g.add(patch);
  }
  const bz = D / 2 + bulge(BTN_X, BTN_Y);
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.5, 44), buttonMat);
  btn.rotation.x = Math.PI / 2; btn.position.set(BTN_X, BTN_Y, bz + 0.25); g.add(btn);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.13, 12, 40), buttonMat);
  ring.position.set(BTN_X, BTN_Y, bz + 0.52); g.add(ring);
  const stitch = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.2, 20), buttonMat);
  stitch.rotation.x = Math.PI / 2; stitch.position.set(BTN_X, BTN_Y, bz + 0.1); g.add(stitch);

  // scarf bow
  scarfGroup = buildScarf();
  scarfGroup.visible = state.scarf; g.add(scarfGroup);

  // soft contact shadow
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.7, D * 4.2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.04; g.add(sh);

  g.traverse(o => { if (o.isMesh && o !== sh) { o.castShadow = true; o.receiveShadow = o !== plane; } });
  g.scale.setScalar(CM);
  return g;
}

const bag = buildBag();
scene.add(bag);

function frameCamera() {
  const w = W * CM, h = (H + 17) * CM;
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const d = Math.max((h * 1.45) / (2 * t), (w * 1.5) / (2 * t * camera.aspect), 3.5);
  controls.target.set(0, h / 2 - 0.1, 0);
  const a = -0.5;                                          // 3/4 view from the left, like the product photo
  frontCam.set(Math.sin(a) * d, h / 2 + h * 0.1, Math.cos(a) * d);
  camera.position.copy(frontCam); camTween = null; controls.update();
}

/* ===== 6. PAINT THE TEXT ===== */
const fillFor = (ctx, w, h) => {
  const c = state.fill.c;
  if (c.length === 1) return c[0];
  const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  c.forEach((col, i) => g.addColorStop(i / (c.length - 1), col)); return g;
};

function heart(ctx, x, y, s) {
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 0.9, y - s * 0.25, x - s * 0.5, y - s * 0.9, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.5, y - s * 0.9, x + s * 0.9, y - s * 0.25, x, y + s * 0.35);
  ctx.fill();
}

const isReady = () => !!state.text.trim();

function paint() {
  const { canvas, ctx, tex } = printLayer, CW = canvas.width, CH = canvas.height, text = state.text.trim();
  ctx.clearRect(0, 0, CW, CH);
  if (!text) {
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = CH * 0.01; ctx.setLineDash([CH * 0.04, CH * 0.03]);
    ctx.strokeRect(CW * 0.2, CH * 0.3, CW * 0.6, CH * 0.3); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 ${CH * 0.07}px Poppins, Arial, sans-serif`; ctx.fillText('Your text here', CW / 2, CH * 0.45); ctx.restore();
  } else {
    const lines = state.text.replace(/\s+$/, '').split('\n').slice(0, 3);
    let size = CH * state.textSize;
    ctx.font = FONTS[state.font][1](size);
    let widest = Math.max(...lines.map(l => ctx.measureText(l).width)) || 1;
    size *= Math.min(1, (CW * 0.86) / widest, (CH * 0.8) / (lines.length * size * 1.2));
    ctx.font = FONTS[state.font][1](size);
    widest = Math.max(...lines.map(l => ctx.measureText(l).width)) || 1;
    const lh = size * 1.2, total = lines.length * lh;

    ctx.save();
    ctx.translate(CW / 2 + state.tx * CW * 0.4, CH / 2 - state.ty * CH * 0.4);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = fillFor(ctx, widest, total);
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = size * 0.04; ctx.shadowOffsetY = size * 0.015;
    lines.forEach((line, i) => ctx.fillText(line, 0, -(lines.length - 1) * lh / 2 + i * lh));
    if (state.hearts) {
      const s = size * 0.2;
      heart(ctx, -widest / 2 + s * 0.2, -total / 2 - s * 0.1, s);
      heart(ctx, -widest / 2 + s * 1.5, -total / 2 - s * 0.5, s * 0.7);
      heart(ctx, widest / 2 - s * 0.2, -total / 2 + lh * 0.15, s * 0.8);
    }
    ctx.restore();
  }
  tex.needsUpdate = true;
  const ready = isReady();
  $('#add').disabled = !ready;
  $('#addHint').textContent = ready ? 'Looks good? Add it to your order.' : 'Type some text to continue.';
}

/* ===== 7. INTERFACE ===== */
$('#price').textContent = '₱' + PRICE;
$('#font').innerHTML = FONTS.map((f, i) => `<option value="${i}">${f[0]}</option>`).join('');

const tile = c => c.length === 1 ? c[0] : `linear-gradient(135deg,${c.join(',')})`;
function renderPalette() {
  $('#tcolors').innerHTML = PALETTE.map((p, i) =>
    `<button type="button" class="sw ${p.n === state.fill.n ? 'on' : ''}" data-i="${i}" style="--c:${tile(p.c)}" title="${p.n}" aria-label="${p.n}"></button>`).join('');
  $('#fillName').textContent = state.fill.n;
}
function setFill(f) { state.fill = f; renderPalette(); paint(); }
$('#tcolors').onclick = e => { const b = e.target.closest('.sw'); if (b) setFill(PALETTE[+b.dataset.i]); };
$('#c1').oninput = () => setFill({ n: 'Custom color', c: [$('#c1').value] });
$('#c2').oninput = () => setFill({ n: 'Custom gradient', c: [$('#c1').value, $('#c2').value] });
$('#gradBtn').onclick = () => setFill({ n: 'Custom gradient', c: [$('#c1').value, $('#c2').value] });
renderPalette();

$('#txt').addEventListener('input', e => { state.text = e.target.value; paint(); });
$('#font').addEventListener('change', e => { state.font = +e.target.value; paint(); });
for (const [id, key] of [['tsize', 'textSize'], ['tx', 'tx'], ['ty', 'ty']]) $('#' + id).addEventListener('input', e => { state[key] = parseFloat(e.target.value); paint(); });
$('#hearts').onchange = e => { state.hearts = e.target.checked; paint(); };
$('#scarf').onchange = e => { state.scarf = e.target.checked; scarfGroup.visible = state.scarf; };

$('#spin').onclick = e => {
  controls.autoRotate = !controls.autoRotate;
  e.currentTarget.classList.toggle('on', controls.autoRotate); e.currentTarget.setAttribute('aria-pressed', controls.autoRotate);
};
$('#reset').onclick = () => { controls.autoRotate = false; $('#spin').classList.remove('on'); camTween = frontCam.clone(); };
controls.addEventListener('start', () => { camTween = null; $('#hint').classList.add('gone'); });

/* ===== 8. ADD TO ORDER ===== */
function toJPEG(src, maxW, q) {
  const k = Math.min(1, maxW / src.width), c = document.createElement('canvas');
  c.width = Math.round(src.width * k); c.height = Math.round(src.height * k);
  const g = c.getContext('2d'); g.fillStyle = '#141416'; g.fillRect(0, 0, c.width, c.height);   // black bag panel behind the text
  g.drawImage(src, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', q);
}
function snapshot() {
  const keep = camera.position.clone();
  camera.position.copy(frontCam); controls.update(); renderer.render(scene, camera);
  const r = renderer.domElement, side = Math.min(r.width, r.height), c = document.createElement('canvas'); c.width = c.height = 360;
  c.getContext('2d').drawImage(r, (r.width - side) / 2, (r.height - side) / 2, side, side, 0, 0, 360, 360);
  camera.position.copy(keep); controls.update();
  return c.toDataURL('image/jpeg', 0.85);
}
$('#add').onclick = () => {
  if (!isReady()) return;
  const text = state.text.trim().replace(/\n/g, ' ');
  const ok = Cart.add({
    key: 'bag-' + Date.now(), id: 'bag-custom', name: 'Custom Abaca Bag',
    detail: `Text “${text}” · ${FONTS[state.font][0]} · ${state.fill.n}${state.hearts ? ' · Hearts' : ''}${state.scarf ? ' · With scarf' : ''}`,
    price: PRICE, art: 'mug', bg: 'bg-yellow', preview: snapshot(), design: toJPEG(printLayer.canvas, 1000, 0.85)
  }, 1);
  if (!ok) return toast('Could not save. Browser storage is full.');
  toast('Added to your order');
  setTimeout(() => location.href = 'order.html?type=product&open=cart', 450);
};

/* ===== 9. LOOP ===== */
function resize() {
  const w = viewport.clientWidth, h = viewport.clientHeight;
  renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewport); resize();
frameCamera();

renderer.setAnimationLoop(() => {
  if (camTween) { camera.position.lerp(camTween, 0.09); if (camera.position.distanceTo(camTween) < 0.02) camTween = null; }
  controls.update(); renderer.render(scene, camera);
});

paint();
$('#loading').remove();
Promise.all(['400 40px "Kaushan Script"', '400 40px "Great Vibes"', '700 40px "Dancing Script"', '400 40px Pacifico', '700 40px Poppins', '800 40px "Baloo 2"']
  .map(f => document.fonts.load(f))).then(paint).catch(() => {});
