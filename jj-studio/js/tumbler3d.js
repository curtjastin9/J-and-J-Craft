import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

/* ===== 1. PRODUCT SPECS (real cm; 1 scene unit = 10 cm) ===== */
const CM = 0.1;
const ARC = THREE.MathUtils.degToRad(120);
const TEX_W = 2048;
const MAX_MB = 10;
const COMPARE_ORDER = ['m', 'l', 's'];

const PRODUCTS = {
  s: {
    name: 'Sport Bottle', capacity: '750 ml', colorName: 'Teal Green', price: 320, kind: 'sport',
    swatch: 'linear-gradient(#1f8392,#0e5a56)',
    diameter: 7.4, bodyHeight: 21.5, shoulderHeight: 3.2, neckRatio: 0.82, cornerRadius: 1.0,
    capHeight: 5.6, loopHeight: 0,
    print: [4.0, 17.5],
    finish: { roughness: 0.55, clearcoat: 0.25, bump: 0.15 },
    gradient: { bottom: '#0e5a56', top: '#1f8392', from: 0.05, to: 0.9 },
    colors: { collar: '#1f7f8c', lid: '#161618' }
  },
  m: {
    name: 'Insulated Tumbler', capacity: '900 ml', colorName: 'Coral', price: 390, kind: 'insulated',
    swatch: '#ef5b4f',
    diameter: 8.6, bodyHeight: 21.5, shoulderHeight: 3.0, neckRatio: 0.8, cornerRadius: 1.1,
    capHeight: 3.0, loopHeight: 1.9, loopWidth: 0.62,
    print: [3.5, 18.0],
    finish: { roughness: 0.5, clearcoat: 0.12, bump: 0.35 },
    gradient: null, bodyColor: '#ef5b4f',
    colors: { collar: '#9ea3aa', lid: '#9ea3aa', handle: '#aeb3ba' }
  },
  l: {
    name: 'Large Tumbler', capacity: '1.2 L', colorName: 'Purple Ombré', price: 450, kind: 'large',
    swatch: 'linear-gradient(#6b3fa0,#efc6e6)',
    diameter: 9.4, bodyHeight: 24.0, shoulderHeight: 3.5, neckRatio: 0.78, cornerRadius: 1.2,
    capHeight: 3.0, loopHeight: 4.0, loopWidth: 0.55,
    boot: { color: '#f3b9df', height: 4.5 },
    print: [6.0, 20.0],
    finish: { roughness: 0.5, clearcoat: 0.12, bump: 0.35 },
    gradient: { bottom: '#e8b7e0', top: '#6b3fa0', from: 0.1, to: 0.62 },
    colors: { collar: '#7d4fb5', lid: '#7d4fb5', handle: '#7d4fb5' }
  }
};

const FONTS = [
  ['Poppins Bold', s => `700 ${s}px Poppins, Arial, sans-serif`],
  ['Baloo Rounded', s => `800 ${s}px "Baloo 2", Poppins, sans-serif`],
  ['Elegant Serif', s => `italic 700 ${s}px Georgia, "Times New Roman", serif`],
  ['Script', s => `400 ${s}px "Brush Script MT", "Segoe Script", cursive`],
  ['Impact', s => `400 ${s}px Impact, "Arial Narrow", sans-serif`]
];

/* Colour palette used for BOTH text colour and tumbler colour.
   One colour = solid. Two or more = gradient (like Canva). Edit freely. */
const PALETTE = [
  { n: 'White', c: ['#ffffff'] }, { n: 'Black', c: ['#1a1a1a'] }, { n: 'Silver', c: ['#b8bcc4'] },
  { n: 'Red', c: ['#d92332'] }, { n: 'Orange', c: ['#ff7a1a'] }, { n: 'Yellow', c: ['#ffd36a'] },
  { n: 'Gold', c: ['#d4a72c'] }, { n: 'Green', c: ['#2e9b5b'] }, { n: 'Teal', c: ['#1f8392'] },
  { n: 'Blue', c: ['#2f6fde'] }, { n: 'Navy', c: ['#1b2a5c'] }, { n: 'Purple', c: ['#7d4fb5'] },
  { n: 'Pink', c: ['#f58fb0'] }, { n: 'Hot Pink', c: ['#e6399b'] }, { n: 'Beige', c: ['#e8d8bf'] },
  { n: 'Brown', c: ['#6b4226'] },
  { n: 'Sunset', c: ['#ff5f6d', '#ffc371'] }, { n: 'Fire', c: ['#f12711', '#f5af19'] },
  { n: 'Gold Shine', c: ['#f7971e', '#ffd200'] }, { n: 'Ocean', c: ['#2193b0', '#6dd5ed'] },
  { n: 'Aurora', c: ['#00c6ff', '#0072ff'] }, { n: 'Mint', c: ['#00b09b', '#96c93d'] },
  { n: 'Purple Haze', c: ['#7f00ff', '#e100ff'] }, { n: 'Berry', c: ['#8e2de2', '#4a00e0'] },
  { n: 'Blush', c: ['#ee9ca7', '#ffdde1'] }, { n: 'Peach', c: ['#ffecd2', '#fcb69f'] },
  { n: 'Candy', c: ['#ff9a9e', '#fad0c4', '#a18cd1'] }, { n: 'Rose Gold', c: ['#b76e79', '#f4c4b0', '#b76e79'] },
  { n: 'Rainbow', c: ['#ff0000', '#ffd000', '#2ecc71', '#3498db', '#9b59b6'] }, { n: 'Midnight', c: ['#232526', '#5a5f66'] }
];

/* ===== 2. STATE + HELPERS ===== */
const $ = selector => document.querySelector(selector);
const viewport = $('#viewport');

const state = {
  size: 'm', compare: false,
  img: null, zoom: 1, px: 0, py: 0,
  mode: 'both',            // 'photo' | 'text' | 'both'
  orient: 'h',             // 'h' horizontal | 'v' vertical
  text: '', font: 0, fill: 0, textSize: 0.14, textY: 0,
  bodyIdx: -1              // -1 = original tumbler colour, otherwise index in PALETTE
};

const V2 = (x, y) => new THREE.Vector2(x, y);
const smooth = t => t * t * (3 - 2 * t);
const totalHeight = p => p.bodyHeight + p.capHeight + p.loopHeight;
const outerRadius = p => p.diameter / 2 + (p.boot ? 0.45 : 0);
const printSize = p => ({ w: (p.diameter / 2) * ARC, h: p.print[1] - p.print[0] });

let layer = null;
let stageGroup = null;
let frontCam = new THREE.Vector3();
let camTween = null;

/* ===== 3. RENDERER, SCENE, LIGHTS, TABLE ===== */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe9eae5);
scene.fog = new THREE.Fog(0xe9eae5, 11, 22);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);

const keyLight = new THREE.DirectionalLight(0xfff1de, 1.3);
keyLight.position.set(3.5, 7, 4.5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.bias = -0.0004;
keyLight.shadow.normalBias = 0.02;
keyLight.shadow.radius = 6;
Object.assign(keyLight.shadow.camera, { left: -6, right: 6, top: 6, bottom: -4, near: 1, far: 22 });
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xdfe8ff, 0.6);
rimLight.position.set(-5, 4, -4);
scene.add(rimLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
fillLight.position.set(-4, 2, 5);
scene.add(fillLight);

scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 0.35));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 2.5;
controls.maxDistance = 16;
controls.minPolarAngle = 0.3;
controls.maxPolarAngle = Math.PI * 0.55;

function noiseTexture(size, mid, amp, repeatX, repeatY) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = mid + (Math.random() - 0.5) * 2 * amp;
    image.data.set([v, v, v, 255], i * 4);
  }
  ctx.putImageData(image, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  return tex;
}

function ribTexture(repeatX) {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 4;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 64, 0);
  gradient.addColorStop(0, '#303030');
  gradient.addColorStop(0.5, '#ffffff');
  gradient.addColorStop(1, '#303030');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, 1);
  return tex;
}

const grainTex = noiseTexture(256, 128, 70, 14, 8);
const ribTex = ribTexture(56);

const table = new THREE.Mesh(
  new THREE.CircleGeometry(16, 64),
  new THREE.MeshStandardMaterial({ color: 0xdddcd4, roughness: 0.88, bumpMap: noiseTexture(256, 128, 60, 40, 40), bumpScale: 0.25 })
);
table.rotation.x = -Math.PI / 2;
table.position.y = -0.002;
table.receiveShadow = true;
scene.add(table);

const contactShadowTex = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
  g.addColorStop(0, 'rgba(0,0,0,.6)');
  g.addColorStop(0.4, 'rgba(0,0,0,.28)');
  g.addColorStop(0.75, 'rgba(0,0,0,.07)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
})();

/* ===== 4. BOTTLE PARTS ===== */
function latheMesh(points, material, segments = 112) {
  return new THREE.Mesh(new THREE.LatheGeometry(points, segments), material);
}

function physical(color, roughness, clearcoat, extra = {}) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness, clearcoat, clearcoatRoughness: 0.35, side: THREE.DoubleSide, envMapIntensity: 0.9, ...extra
  });
}

/** Body. `custom` = this is the selected bottle, so the chosen palette colour/gradient may override the original. */
function buildBody(p, custom) {
  const r = p.diameter / 2, H = p.bodyHeight, rc = p.cornerRadius;
  const rNeck = r * p.neckRatio, wallTop = H - p.shoulderHeight;

  const profile = [V2(0, 0.3), V2(r - rc - 0.5, 0.3), V2(r - rc - 0.4, 0), V2(r - rc, 0)];
  for (let i = 1; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * Math.PI / 2;
    profile.push(V2(r - rc + rc * Math.cos(a), rc + rc * Math.sin(a)));
  }
  profile.push(V2(r, wallTop));
  for (let i = 1; i <= 16; i++) {
    const t = i / 16;
    profile.push(V2(r + (rNeck - r) * smooth(t), wallTop + (H - 0.15 - wallTop) * t));
  }
  profile.push(V2(rNeck, H));

  const geometry = new THREE.LatheGeometry(profile, 128);
  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color(p.bodyColor || '#ffffff');
  const grad = p.gradient && { bottom: new THREE.Color(p.gradient.bottom), top: new THREE.Color(p.gradient.top) };
  const ov = custom && state.bodyIdx >= 0 ? PALETTE[state.bodyIdx].c.map(c => new THREE.Color(c)) : null;
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / H;
    if (ov) {
      if (ov.length === 1) tmp.copy(ov[0]);
      else {
        const u = (1 - THREE.MathUtils.smoothstep(t, 0.05, 0.9)) * (ov.length - 1), k = Math.min(Math.floor(u), ov.length - 2);
        tmp.copy(ov[k]).lerp(ov[k + 1], u - k);
      }
    } else if (grad) tmp.copy(grad.bottom).lerp(grad.top, THREE.MathUtils.smoothstep(t, p.gradient.from, p.gradient.to));
    else tmp.copy(base);
    colors.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = physical(0xffffff, p.finish.roughness, p.finish.clearcoat, {
    vertexColors: true, bumpMap: grainTex, bumpScale: p.finish.bump, clearcoatRoughness: 0.45, envMapIntensity: 0.8
  });
  return new THREE.Mesh(geometry, material);
}

function buildBoot(p) {
  const r = p.diameter / 2, { height, color } = p.boot;
  const profile = [V2(r - 0.2, 0), V2(r + 0.3, 0.08), V2(r + 0.45, 0.6), V2(r + 0.45, height - 0.4), V2(r + 0.33, height), V2(r + 0.02, height + 0.1)];
  const material = physical(color, 0.75, 0, { sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.6, bumpMap: ribTex, bumpScale: 0.35 });
  return latheMesh(profile, material);
}

function buildLoop(width, height, tubeRadius, material) {
  const pts = [[-width, 0], [-width * 1.05, height * 0.45], [-width * 0.62, height * 0.93], [width * 0.62, height * 0.93], [width * 1.05, height * 0.45], [width, 0]]
    .map(([x, y]) => new THREE.Vector3(x, y, 0));
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 72, tubeRadius, 16), material);
}

function buildScrewLid(p, rNeck) {
  const group = new THREE.Group();
  const R = rNeck * 1.08, cap = p.capHeight;
  const lidMat = physical(p.colors.lid, 0.42, 0.3);
  const collarMat = physical(p.colors.collar, 0.5, 0.15, { bumpMap: ribTex, bumpScale: 0.6 });
  const handleMat = physical(p.colors.handle, 0.35, 0.4);
  const darkMat = physical(0x1b1b1d, 0.5, 0.2);

  group.add(latheMesh([V2(R - 0.05, 0), V2(R, 0.1), V2(R, cap - 0.7), V2(R - 0.15, cap - 0.35), V2(R - 0.6, cap - 0.08), V2(rNeck * 0.45, cap), V2(0, cap)], lidMat));
  group.add(latheMesh([V2(R + 0.04, 0.12), V2(R + 0.04, cap * 0.55)], collarMat));
  group.add(latheMesh([V2(rNeck, -0.3), V2(rNeck, 0.1)], darkMat));

  if (p.kind === 'large') {
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(rNeck * 0.5, rNeck * 0.55, 0.7, 48), lidMat);
    spout.position.y = cap + 0.3;
    group.add(spout);
    for (const x of [-1.0, 0, 1.0]) {
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), darkMat);
      hole.scale.set(1, 1.8, 1);
      hole.rotation.x = -Math.PI / 2;
      hole.position.set(x, cap + 0.66, 0);
      group.add(hole);
    }
  }

  const loopW = rNeck * p.loopWidth, tube = p.kind === 'large' ? 0.38 : 0.28;
  const loop = buildLoop(loopW, p.loopHeight + 0.3, tube, handleMat);
  loop.position.y = cap - 0.3;
  group.add(loop);
  for (const side of [-1, 1]) {
    const block = new THREE.Mesh(new THREE.BoxGeometry(tube * 2.6, 0.5, tube * 3), handleMat);
    block.position.set(side * loopW, cap - 0.1, 0);
    group.add(block);
  }
  return group;
}

function buildSportLid(p, rNeck) {
  const group = new THREE.Group();
  const R = rNeck * 1.08;
  const collarMat = physical(p.colors.collar, 0.45, 0.15, { bumpMap: ribTex, bumpScale: 0.6 });
  const blackMat = physical(p.colors.lid, 0.42, 0.3);

  group.add(latheMesh([V2(R, 0), V2(R, 1.5), V2(R - 0.1, 1.6), V2(rNeck * 1.02, 1.6)], collarMat));
  group.add(latheMesh([V2(rNeck * 1.02, 1.5), V2(rNeck * 1.02, 3.0)], blackMat));
  group.add(latheMesh([V2(rNeck * 1.0, 3.0), V2(rNeck * 1.0, 4.7), V2(rNeck * 0.92, 5.15), V2(rNeck * 0.5, 5.5), V2(0, p.capHeight)], blackMat));

  const add = (geometry, x, y, z, rotX = 0) => {
    const mesh = new THREE.Mesh(geometry, blackMat);
    mesh.position.set(x, y, z);
    mesh.rotation.x = rotX;
    group.add(mesh);
    return mesh;
  };
  add(new THREE.BoxGeometry(rNeck * 0.7, 0.9, 0.5), 0, 3.35, rNeck * 1.02);
  add(new THREE.BoxGeometry(rNeck * 0.5, 0.35, 0.8), 0, 4.95, rNeck * 0.95, 0.12);
  add(new THREE.BoxGeometry(rNeck * 0.6, 1.5, 0.5), 0, 3.8, -rNeck * 1.0);

  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.16, 14, 40), blackMat);
  strap.position.set(-R - 0.55, 1.8, 0);
  strap.rotation.y = Math.PI / 2;
  group.add(strap);
  return group;
}

function createPrintLayer(p) {
  const r = p.diameter / 2, [y0, y1] = p.print, h = y1 - y0;
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = Math.round(TEX_W * h / (r * ARC));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const material = new THREE.MeshPhysicalMaterial({
    map: tex, transparent: true, roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.3,
    polygonOffset: true, polygonOffsetFactor: -2
  });
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.05, r + 0.05, h, 128, 1, true, -ARC / 2, ARC), material);
  mesh.position.y = (y0 + y1) / 2;
  return { canvas, ctx: canvas.getContext('2d'), tex, mesh };
}

function buildBottle(key, withPrint) {
  const p = PRODUCTS[key], r = p.diameter / 2, rNeck = r * p.neckRatio;
  const group = new THREE.Group();

  group.add(buildBody(p, key === state.size));
  if (p.boot) group.add(buildBoot(p));

  const lid = p.kind === 'sport' ? buildSportLid(p, rNeck) : buildScrewLid(p, rNeck);
  lid.position.y = p.bodyHeight;
  group.add(lid);

  const printLayer = withPrint ? createPrintLayer(p) : null;
  if (printLayer) group.add(printLayer.mesh);

  group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = o !== printLayer?.mesh; } });

  const shadowSize = outerRadius(p) * 4.4;
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(shadowSize, shadowSize),
    new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.04;
  group.add(shadow);

  group.scale.setScalar(CM);
  return { group, layer: printLayer, width: outerRadius(p) * 2, height: totalHeight(p) };
}

/* ===== 5. STAGE ===== */
function clearStage() {
  if (!stageGroup) return;
  scene.remove(stageGroup);
  stageGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); });
}

function frameCamera(widthCm, heightCm) {
  const w = widthCm * CM, h = heightCm * CM;
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const distance = Math.max((h * 1.4) / (2 * t), (w * 1.45) / (2 * t * camera.aspect), 3.5);
  controls.target.set(0, h / 2, 0);
  frontCam.set(0, h / 2 + h * 0.12, distance);
  camera.position.copy(frontCam);
  camTween = null;
  controls.update();
}

function showBottles() {
  clearStage();
  const keys = state.compare ? COMPARE_ORDER : [state.size];
  const gap = 3;
  const bottles = keys.map(k => buildBottle(k, k === state.size));
  const totalWidth = bottles.reduce((sum, b) => sum + b.width, 0) + gap * (bottles.length - 1);

  stageGroup = new THREE.Group();
  let cursor = -totalWidth / 2;
  for (const bottle of bottles) {
    bottle.group.position.x = (cursor + bottle.width / 2) * CM;
    cursor += bottle.width + gap;
    stageGroup.add(bottle.group);
  }
  scene.add(stageGroup);

  layer = bottles.find(b => b.layer)?.layer || null;
  frameCamera(totalWidth, Math.max(...bottles.map(b => b.height)));
  paint();
  updateUI();
}

/* ===== 6. PAINT PHOTO + TEXT ===== */
const usePhoto = () => state.mode !== 'text';
const useText = () => state.mode !== 'photo';
const isReady = () => {
  const t = state.text.trim();
  return state.mode === 'photo' ? !!state.img : state.mode === 'text' ? !!t : !!(state.img && t);
};

function fillFor(ctx, w, h) {
  const c = PALETTE[state.fill].c;
  if (c.length === 1) return c[0];
  const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  c.forEach((col, i) => g.addColorStop(i / (c.length - 1), col));
  return g;
}

function drawPhoto(ctx, b) {
  const img = state.img, k = Math.max(b.w / img.width, b.h / img.height) * state.zoom;
  const w = img.width * k, h = img.height * k;
  ctx.save();
  ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
  ctx.drawImage(img, b.x + (b.w - w) / 2 + state.px * b.w / 2, b.y + (b.h - h) / 2 - state.py * b.h / 2, w, h);
  ctx.restore();
}

function drawPlaceholder(ctx, b, label, H) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = 'rgba(43,27,23,.45)';
  ctx.lineWidth = H * 0.012;
  ctx.setLineDash([H * 0.04, H * 0.03]);
  const m = H * 0.04;
  ctx.strokeRect(b.x + m, b.y + m, b.w - m * 2, b.h - m * 2);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(43,27,23,.7)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.min(H * 0.07, b.h * 0.2)}px Poppins, Arial, sans-serif`;
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2);
  ctx.restore();
}

function drawText(ctx, b, H) {
  const lines = state.text.trim().split('\n').slice(0, 3), vert = state.orient === 'v';
  const along = (vert ? b.h : b.w) * 0.9, across = (vert ? b.w : b.h) * 0.88;
  let size = H * state.textSize;
  ctx.font = FONTS[state.font][1](size);
  let widest = Math.max(...lines.map(l => ctx.measureText(l).width)) || 1;
  size *= Math.min(1, along / widest, across / (lines.length * size * 1.15));   // shrink to fit
  ctx.font = FONTS[state.font][1](size);
  widest = Math.max(...lines.map(l => ctx.measureText(l).width)) || 1;
  const lh = size * 1.15, total = lines.length * lh;

  ctx.save();
  ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
  if (vert) ctx.rotate(Math.PI / 2);                                           // reads top to bottom
  ctx.translate(0, -state.textY * (vert ? b.w : b.h) * 0.4);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = fillFor(ctx, widest, total);
  ctx.shadowColor = 'rgba(0,0,0,.3)';
  ctx.shadowBlur = size * 0.07;
  ctx.shadowOffsetY = size * 0.03;
  lines.forEach((line, i) => ctx.fillText(line, 0, -(lines.length - 1) * lh / 2 + i * lh));
  ctx.restore();
}

function paint() {
  if (!layer) return;
  const { canvas, ctx, tex } = layer, W = canvas.width, H = canvas.height, text = state.text.trim();
  ctx.clearRect(0, 0, W, H);

  let photoBox = { x: 0, y: 0, w: W, h: H }, textBox = { x: 0, y: 0, w: W, h: H };
  if (state.mode === 'both') {                                                 // text goes BELOW the photo
    const band = Math.round(H * (state.orient === 'v' ? 0.45 : 0.3));
    photoBox = { x: 0, y: 0, w: W, h: H - band };
    textBox = { x: 0, y: H - band, w: W, h: band };
  }

  if (usePhoto()) {
    if (state.img) drawPhoto(ctx, photoBox);
    else drawPlaceholder(ctx, photoBox, 'Your photo here', H);
  }
  if (useText()) {
    if (text) drawText(ctx, textBox, H);
    else if (state.mode === 'text') drawPlaceholder(ctx, textBox, 'Your text here', H);
  }

  tex.needsUpdate = true;
  const ready = isReady();
  $('#add').disabled = !ready;
  $('#addHint').textContent = ready ? 'Looks good? Add it to your order.'
    : state.mode === 'photo' ? 'Upload a photo to continue.'
    : state.mode === 'text' ? 'Type some text to continue.'
    : !state.img && !text ? 'Add a photo and some text to continue.'
    : !state.img ? 'Upload a photo to continue.' : 'Type some text to continue.';
}

/* ===== 7. INTERFACE ===== */
const fmt = n => (Math.round(n * 10) / 10).toFixed(1);

function updateUI() {
  const p = PRODUCTS[state.size], area = printSize(p);
  document.querySelectorAll('.tsz').forEach(b => b.classList.toggle('on', b.dataset.k === state.size));
  $('#sizeName').textContent = `${p.name} · ${p.capacity} · ${p.colorName}`;
  $('#price').textContent = '₱' + p.price;
  $('#specs').textContent =
    `Height ${fmt(totalHeight(p))} cm · Diameter ${fmt(p.diameter)} cm · Print area ${fmt(area.w)} × ${fmt(area.h)} cm`;
}

$('#sizes').innerHTML = Object.entries(PRODUCTS).map(([key, p]) => `
  <button type="button" class="tsz" data-k="${key}">
    <i style="--c:${p.swatch}"></i><b>${p.capacity}</b><small>${p.name}</small><small>${fmt(totalHeight(p))} cm tall</small><span>₱${p.price}</span>
  </button>`).join('');
document.querySelectorAll('.tsz').forEach(b => b.onclick = () => { state.size = b.dataset.k; showBottles(); });

$('#font').innerHTML = FONTS.map((f, i) => `<option value="${i}">${f[0]}</option>`).join('');

/* colour swatches: text colour + tumbler colour */
const tile = c => c.length === 1 ? c[0] : `linear-gradient(135deg,${c.join(',')})`;
const swHTML = (i, on) => `<button type="button" class="sw ${on ? 'on' : ''}" data-i="${i}" style="--c:${tile(PALETTE[i].c)}" title="${PALETTE[i].n}" aria-label="${PALETTE[i].n}"></button>`;
function renderPalettes() {
  $('#tcolors').innerHTML = PALETTE.map((_, i) => swHTML(i, i === state.fill)).join('');
  $('#bcolors').innerHTML = `<button type="button" class="sw orig ${state.bodyIdx < 0 ? 'on' : ''}" data-i="-1">Original</button>` +
    PALETTE.map((_, i) => swHTML(i, i === state.bodyIdx)).join('');
  $('#fillName').textContent = PALETTE[state.fill].n;
  $('#bcName').textContent = state.bodyIdx < 0 ? 'Original' : PALETTE[state.bodyIdx].n;
}
$('#tcolors').onclick = e => {
  const b = e.target.closest('.sw'); if (!b) return;
  state.fill = +b.dataset.i; renderPalettes(); paint();
};
$('#bcolors').onclick = e => {
  const b = e.target.closest('.sw'); if (!b) return;
  state.bodyIdx = +b.dataset.i; renderPalettes(); showBottles();
};
renderPalettes();

/* design type: photo / text / both */
function applyMode() {
  document.querySelectorAll('[data-mode]').forEach(b => {
    const on = b.dataset.mode === state.mode;
    b.classList.toggle('on', on); b.setAttribute('aria-checked', on);
  });
  $('#photoSec').hidden = state.mode === 'text';
  $('#textSec').hidden = state.mode === 'photo';
  $('#modeHint').textContent = state.mode === 'both' ? 'The text is placed below the photo.'
    : state.mode === 'photo' ? 'Only your photo is printed.' : 'Only your text is printed.';
  paint();
}
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { state.mode = b.dataset.mode; applyMode(); });

/* text direction: horizontal / vertical */
function applyOrient() {
  document.querySelectorAll('[data-o]').forEach(b => {
    const on = b.dataset.o === state.orient;
    b.classList.toggle('on', on); b.setAttribute('aria-checked', on);
  });
  $('#tyLabel').textContent = state.orient === 'v' ? 'Left / Right' : 'Down / Up';
  paint();
}
document.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { state.orient = b.dataset.o; applyOrient(); });
applyMode(); applyOrient();

$('#txt').addEventListener('input', e => { state.text = e.target.value; paint(); });
$('#font').addEventListener('change', e => { state.font = +e.target.value; paint(); });
for (const [id, key] of [['zoom', 'zoom'], ['px', 'px'], ['py', 'py'], ['tsize', 'textSize'], ['ty', 'textY']]) {
  $('#' + id).addEventListener('input', e => { state[key] = parseFloat(e.target.value); paint(); });
}

$('#spin').onclick = e => {
  controls.autoRotate = !controls.autoRotate;
  e.currentTarget.classList.toggle('on', controls.autoRotate);
  e.currentTarget.setAttribute('aria-pressed', controls.autoRotate);
};
$('#reset').onclick = () => {
  controls.autoRotate = false;
  $('#spin').classList.remove('on');
  camTween = frontCam.clone();
};
$('#compare').onclick = e => {
  setCompare(!state.compare);
  e.currentTarget.classList.toggle('on', state.compare);
  e.currentTarget.setAttribute('aria-pressed', state.compare);
};
controls.addEventListener('start', () => { camTween = null; $('#hint').classList.add('gone'); });

function setCompare(on) {
  if (state.compare === on) return;
  state.compare = on;
  $('#compare').classList.toggle('on', on);
  showBottles();
}

/* photo upload */
function loadFile(file) {
  if (!file) return;
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return toast('Please choose a JPG, PNG or WebP image');
  if (file.size > MAX_MB * 1024 * 1024) return toast(`That photo is over ${MAX_MB} MB`);
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    Object.assign(state, { img, zoom: 1, px: 0, py: 0 });
    ['zoom', 'px', 'py'].forEach(k => $('#' + k).value = state[k]);
    $('#pimg').src = url;
    $('#pname').textContent = file.name;
    $('#pdim').textContent = `${img.width} × ${img.height}px`;
    $('#picked').hidden = false;
    $('#drop').hidden = true;
    $('#adjust').classList.remove('adjust-off');
    paint();
    if (Math.min(img.width, img.height) < 600) toast('Low-resolution photo. The print may look soft.');
  };
  img.onerror = () => toast('Could not open that image');
  img.src = url;
}
$('#file').onchange = e => { loadFile(e.target.files[0]); e.target.value = ''; };
$('#removePhoto').onclick = () => {
  state.img = null;
  $('#picked').hidden = true;
  $('#drop').hidden = false;
  $('#adjust').classList.add('adjust-off');
  paint();
};
const dropZone = $('#drop');
['dragenter', 'dragover'].forEach(ev => dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.remove('over'); }));
dropZone.addEventListener('drop', e => loadFile(e.dataTransfer.files[0]));

/* add to order */
function toJPEG(source, maxWidth, quality) {
  const k = Math.min(1, maxWidth / source.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.width * k);
  canvas.height = Math.round(source.height * k);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

function snapshot() {
  const keep = camera.position.clone();
  camera.position.copy(frontCam);
  controls.update();
  renderer.render(scene, camera);
  const src = renderer.domElement, side = Math.min(src.width, src.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 360;
  canvas.getContext('2d').drawImage(src, (src.width - side) / 2, (src.height - side) / 2, side, side, 0, 0, 360, 360);
  camera.position.copy(keep);
  controls.update();
  return canvas.toDataURL('image/jpeg', 0.85);
}

$('#add').onclick = () => {
  if (!isReady()) return;
  const p = PRODUCTS[state.size], text = state.text.trim();
  setCompare(false);
  const parts = [
    usePhoto() && 'Photo',
    useText() && `Text “${text.replace(/\n/g, ' ')}” (${state.orient === 'v' ? 'vertical' : 'horizontal'}, ${PALETTE[state.fill].n})`
  ].filter(Boolean).join(' + ');
  const bodyName = state.bodyIdx >= 0 ? PALETTE[state.bodyIdx].n : p.colorName;
  const saved = Cart.add({
    key: 'tumbler-' + Date.now(), id: 'tumbler-custom', name: 'Custom Tumbler',
    detail: `${p.capacity} · ${bodyName} · ${parts}`, price: p.price, art: 'mug', bg: 'bg-pink',
    preview: snapshot(), design: toJPEG(layer.canvas, 1000, 0.8)
  }, 1);
  if (!saved) return toast('Could not save. Browser storage is full.');
  toast('Added to your order');
  setTimeout(() => location.href = 'order.html?type=product&open=cart', 450);
};

/* ===== 8. RENDER LOOP ===== */
function resize() {
  const w = viewport.clientWidth, h = viewport.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewport);
resize();

renderer.setAnimationLoop(() => {
  if (camTween) {
    camera.position.lerp(camTween, 0.09);
    if (camera.position.distanceTo(camTween) < 0.02) camTween = null;
  }
  controls.update();
  renderer.render(scene, camera);
});

showBottles();
$('#loading').remove();
Promise.all([document.fonts.load('700 40px Poppins'), document.fonts.load('800 40px "Baloo 2"')]).then(paint).catch(() => {});
