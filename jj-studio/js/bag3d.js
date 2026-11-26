import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

/* ===== 1. SPECS (real cm; 1 scene unit = 10 cm) ===== */
const CM = 0.1;
const TEX_W = 2048;
const PRICE = 350;                       // sample price: the owner sets the real one later
const BAG = { W: 34, H: 28, D: 12, wall: 0.5, band: 5, bottom: 2.4 };
const PANEL = { w: BAG.W - 6.4, h: BAG.H - BAG.band - BAG.bottom };          // black front panel
const POCKET = { w: PANEL.w - 7, h: PANEL.h - 3.5, bottomGap: 3.5 };         // white-piped pocket (text area)

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
  { n: 'Gold', c: ['#d9a93a'] }, { n: 'White', c: ['#ffffff'] }, { n: 'Black', c: ['#1a1a1a'] }, { n: 'Silver', c: ['#b8bcc4'] },
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

/* ===== 2. RENDERER / SCENE ===== */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe9eae5);
scene.fog = new THREE.Fog(0xe9eae5, 11, 22);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);

const keyLight = new THREE.DirectionalLight(0xfff1de, 1.3);
keyLight.position.set(3.5, 7, 4.5); keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048); keyLight.shadow.bias = -0.0004; keyLight.shadow.normalBias = 0.02; keyLight.shadow.radius = 6;
Object.assign(keyLight.shadow.camera, { left: -6, right: 6, top: 6, bottom: -4, near: 1, far: 22 });
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0xdfe8ff, 0.6); rimLight.position.set(-5, 4, -4); scene.add(rimLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 0.35); fillLight.position.set(-4, 2, 5); scene.add(fillLight);
scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 0.35));

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

const table = new THREE.Mesh(
  new THREE.CircleGeometry(16, 64),
  new THREE.MeshStandardMaterial({ color: 0xdddcd4, roughness: 0.88, bumpMap: noiseTexture(256, 128, 60, 40, 40), bumpScale: 0.25 })
);
table.rotation.x = -Math.PI / 2; table.position.y = -0.002; table.receiveShadow = true; scene.add(table);

const shadowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 20, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,.6)'); gr.addColorStop(0.4, 'rgba(0,0,0,.28)'); gr.addColorStop(0.75, 'rgba(0,0,0,.07)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
})();

/* ===== 3. MATERIALS ===== */
/* Woven jute / abaca: checkerboard of threads + fuzzy fibres */
const juteCanvas = (() => {
  const S = 256, cell = 4, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  for (let j = 0; j < S / cell; j++) for (let i = 0; i < S / cell; i++) {
    const horiz = (i + j) % 2 === 0, k = 0.82 + Math.random() * 0.3;
    g.fillStyle = `rgb(${Math.min(255, 205 * k) | 0},${Math.min(255, 168 * k) | 0},${Math.min(255, 108 * k) | 0})`;
    g.fillRect(i * cell, j * cell, cell, cell);
    g.fillStyle = horiz ? 'rgba(255,240,200,.35)' : 'rgba(70,45,15,.35)';
    if (horiz) g.fillRect(i * cell, j * cell, cell, 1); else g.fillRect(i * cell, j * cell, 1, cell);
  }
  g.lineWidth = 1;
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * S, y = Math.random() * S, a = Math.random() * Math.PI, l = 3 + Math.random() * 8;
    g.strokeStyle = Math.random() < 0.5 ? 'rgba(255,235,190,.35)' : 'rgba(80,55,20,.3)';
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  return c;
})();

function juteMat(wCm, hCm) {
  const map = new THREE.CanvasTexture(juteCanvas), bump = new THREE.CanvasTexture(juteCanvas);
  for (const t of [map, bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(wCm / 8, hCm / 8); t.anisotropy = 8; }
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 1.4, roughness: 0.96, metalness: 0, side: THREE.DoubleSide });
}

const grain = noiseTexture(256, 128, 60, 14, 10);
const canvasBlack = new THREE.MeshPhysicalMaterial({
  color: 0x141416, roughness: 0.9, sheen: 0.6, sheenRoughness: 0.7, sheenColor: new THREE.Color(0x6a6a70),
  bumpMap: grain, bumpScale: 0.25, envMapIntensity: 0.5
});
const pipingMat = new THREE.MeshStandardMaterial({ color: 0xf3eee3, roughness: 0.85, bumpMap: grain, bumpScale: 0.1 });

const ropeBump = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'); g.fillStyle = '#707070'; g.fillRect(0, 0, 32, 32);
  g.strokeStyle = '#ffffff'; g.lineWidth = 6;
  for (const o of [-16, 0, 16, 32]) { g.beginPath(); g.moveTo(o, 32); g.lineTo(o + 32, 0); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(46, 1); t.anisotropy = 8; return t;
})();
const ropeMat = new THREE.MeshPhysicalMaterial({
  color: 0x111113, roughness: 0.85, sheen: 0.7, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x777780),
  bumpMap: ropeBump, bumpScale: 1.0, envMapIntensity: 0.5
});

const buttonMat = new THREE.MeshPhysicalMaterial({ color: 0x0c0c0e, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });

const scarfTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ecd6ad'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#c4641c'; for (let i = 0; i < 4; i++) g.fillRect(0, i * 64 + 6, 256, 24);
  g.fillStyle = '#7a4a22'; for (let i = 0; i < 4; i++) g.fillRect(0, i * 64 + 36, 256, 6);
  g.strokeStyle = '#5b3216'; g.lineWidth = 4;
  for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 32) {
    g.beginPath(); g.ellipse(x + 16 + ((y / 32) % 2) * 16, y + 16, 11, 6, Math.PI / 4, 0, 7); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
})();
const scarfMat = new THREE.MeshPhysicalMaterial({ map: scarfTex, roughness: 0.45, sheen: 0.8, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide });

/* ===== 4. SHAPE HELPERS ===== */
function rrPath(P, x0, y0, w, h, r) {
  P.moveTo(x0 + r, y0);
  P.lineTo(x0 + w - r, y0); P.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  P.lineTo(x0 + w, y0 + h - r); P.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  P.lineTo(x0 + r, y0 + h); P.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
  P.lineTo(x0, y0 + r); P.quadraticCurveTo(x0, y0, x0 + r, y0);
}

function handle(side) {                                  // side: +1 front, -1 back
  const { H, D } = BAG;
  const pts = [[-5.5, 0], [-5.5, 6], [-4.6, 12], [-2.8, 15.6], [0, 16.8], [2.8, 15.6], [4.6, 12], [5.5, 6], [5.5, 0]]
    .map(([x, y]) => new THREE.Vector3(x, y, 0));
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 120, 0.85, 16, false), ropeMat);
  const g = new THREE.Group(); g.add(tube);
  g.position.set(0, H - 3, side * (D / 2 - 1.0));
  g.rotation.x = side * -0.25;                           // handles lean toward each other
  return g;
}

function buildScarf() {
  const g = new THREE.Group();
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.95, 20, 16), scarfMat); knot.scale.set(1, 0.85, 1.2); g.add(knot);
  for (const s of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), scarfMat);
    loop.scale.set(2.9, 1.5, 0.55); loop.position.set(s * 2.7, 0.35, 0); loop.rotation.z = s * 0.3; g.add(loop);
  }
  const tail = (x, rot, len) => {
    const geo = new THREE.PlaneGeometry(2.2, len, 4, 18);
    geo.translate(0, -len / 2, 0);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), t = -y / len;
      p.setX(i, p.getX(i) * (1 - 0.15 * t));
      p.setZ(i, Math.sin(y * 0.9 + p.getX(i)) * 0.35 + t * 1.2);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, scarfMat); m.position.set(x, -0.5, 0.3); m.rotation.z = rot; return m;
  };
  g.add(tail(-0.5, 0.18, 9), tail(0.8, -0.22, 8));
  return g;
}

/* ===== 5. BUILD THE BAG ===== */
let printLayer = null, scarfGroup = null, frontCam = new THREE.Vector3(), camTween = null;

function buildBag() {
  const { W, H, D, wall: t, bottom } = BAG;
  const g = new THREE.Group();
  const box = (w, h, d, x, y, z, rx, ry) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), juteMat(rx, ry)); m.position.set(x, y, z); g.add(m); return m;
  };
  box(W, H, t, 0, H / 2, D / 2 - t / 2, W, H);                       // front
  box(W, H, t, 0, H / 2, -D / 2 + t / 2, W, H);                      // back
  box(t, H, D - 2 * t, -W / 2 + t / 2, H / 2, 0, D, H);              // left
  box(t, H, D - 2 * t, W / 2 - t / 2, H / 2, 0, D, H);               // right
  box(W - 2 * t, t, D - 2 * t, 0, t / 2, 0, W, D);                   // bottom

  // black canvas front panel
  const ps = new THREE.Shape(); rrPath(ps, -PANEL.w / 2, -PANEL.h / 2, PANEL.w, PANEL.h, 0.6);
  const panel = new THREE.Mesh(
    new THREE.ExtrudeGeometry(ps, { depth: 0.25, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2, curveSegments: 8 }), canvasBlack);
  panel.position.set(0, bottom + PANEL.h / 2, D / 2); g.add(panel);

  // white piped pocket (open at the top)
  const iw = POCKET.w, ih = POCKET.h, r = 1.0;
  const cy = bottom + POCKET.bottomGap + ih / 2;
  const P = new THREE.Path();
  P.moveTo(-iw / 2, ih / 2); P.lineTo(-iw / 2, -ih / 2 + r);
  P.quadraticCurveTo(-iw / 2, -ih / 2, -iw / 2 + r, -ih / 2);
  P.lineTo(iw / 2 - r, -ih / 2); P.quadraticCurveTo(iw / 2, -ih / 2, iw / 2, -ih / 2 + r); P.lineTo(iw / 2, ih / 2);
  const piping = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P.getSpacedPoints(300).map(p => new THREE.Vector3(p.x, p.y, 0))), 400, 0.22, 8, false), pipingMat);
  piping.position.set(0, cy, D / 2 + 0.3); g.add(piping);

  // text print layer on the pocket
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W; canvas.height = Math.round(TEX_W * ih / iw);
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const printMat = new THREE.MeshPhysicalMaterial({ map: tex, transparent: true, roughness: 0.4, clearcoat: 0.3, clearcoatRoughness: 0.3, polygonOffset: true, polygonOffsetFactor: -2 });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(iw, ih), printMat);
  plane.position.set(0, cy, D / 2 + 0.37); g.add(plane);
  printLayer = { canvas, ctx: canvas.getContext('2d'), tex, mesh: plane };

  // handles + patches + button
  g.add(handle(1), handle(-1));
  for (const side of [1, -1]) for (const x of [-5.5, 5.5]) {
    const patch = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.2, 0.25), canvasBlack);
    patch.position.set(x, H - 2.6, side * (D / 2 + 0.12)); g.add(patch);
  }
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.45, 40), buttonMat);
  btn.rotation.x = Math.PI / 2; btn.position.set(9, H - 2.6, D / 2 + 0.22); g.add(btn);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.12, 12, 36), buttonMat);
  ring.position.set(9, H - 2.6, D / 2 + 0.45); g.add(ring);

  // scarf tied on the front handle
  scarfGroup = buildScarf();
  scarfGroup.position.set(5.2, H + 3.8, D / 2 - 2.9); scarfGroup.rotation.y = 0.15;
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
  const w = BAG.W * CM, h = (BAG.H + 15) * CM;
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const d = Math.max((h * 1.45) / (2 * t), (w * 1.5) / (2 * t * camera.aspect), 3.5);
  controls.target.set(0, h / 2 - 0.1, 0);
  const a = 0.4;
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
  const { canvas, ctx, tex } = printLayer, W = canvas.width, H = canvas.height, text = state.text.trim();
  ctx.clearRect(0, 0, W, H);
  if (!text) {
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = H * 0.01; ctx.setLineDash([H * 0.04, H * 0.03]);
    ctx.strokeRect(W * 0.2, H * 0.3, W * 0.6, H * 0.3); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 ${H * 0.07}px Poppins, Arial, sans-serif`; ctx.fillText('Your text here', W / 2, H * 0.45); ctx.restore();
  } else {
    const lines = state.text.replace(/\s+$/, '').split('\n').slice(0, 3);
    let size = H * state.textSize;
    ctx.font = FONTS[state.font][1](size);
    let widest = Math.max(...lines.map(l => ctx.measureText(l).width)) || 1;
    size *= Math.min(1, (W * 0.86) / widest, (H * 0.8) / (lines.length * size * 1.2));
    ctx.font = FONTS[state.font][1](size);
    widest = Math.max(...lines.map(l => ctx.measureText(l).width)) || 1;
    const lh = size * 1.2, total = lines.length * lh;

    ctx.save();
    ctx.translate(W / 2 + state.tx * W * 0.4, H / 2 - state.ty * H * 0.4);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = fillFor(ctx, widest, total);
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
