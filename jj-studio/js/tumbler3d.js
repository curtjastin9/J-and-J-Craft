import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

/* =====================================================================
   1. PRODUCT SPECS
   Every size is a REAL measurement in centimetres.
   The 3D scene uses 1 unit = 10 cm (see CM), so a 26 cm bottle is 2.6 units tall.
   To match your own stock, only edit the numbers in PRODUCTS.
   ===================================================================== */
const CM = 0.1;
const ARC = THREE.MathUtils.degToRad(120);   // how far the print wraps around the bottle
const TEX_W = 2048;                          // print texture width (pixels)
const MAX_MB = 10;
const COMPARE_ORDER = ['m', 'l', 's'];       // left to right, same as the shop photo

const PRODUCTS = {
  s: {
    name: 'Sport Bottle', capacity: '750 ml', colorName: 'Teal Green', price: 320, kind: 'sport',
    swatch: 'linear-gradient(#1f8392,#0e5a56)',
    diameter: 7.4, bodyHeight: 21.5, shoulderHeight: 3.2, neckRatio: 0.82, cornerRadius: 1.0,
    capHeight: 5.6, loopHeight: 0,
    print: [4.0, 17.5],                                       // print area from the bottom, cm
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
const TEXT_COLORS = ['#ffffff', '#292329', '#d92332', '#ffd36a', '#2f6fde', '#2e9b5b', '#f58fb0'];

/* =====================================================================
   2. STATE + SMALL HELPERS
   ===================================================================== */
const $ = selector => document.querySelector(selector);
const viewport = $('#viewport');

const state = {
  size: 'm', compare: false,
  img: null, zoom: 1, px: 0, py: 0,
  text: '', font: 0, color: '#ffffff', textSize: 0.14, textY: 0
};

const V2 = (x, y) => new THREE.Vector2(x, y);
const smooth = t => t * t * (3 - 2 * t);
const totalHeight = p => p.bodyHeight + p.capHeight + p.loopHeight;
const outerRadius = p => p.diameter / 2 + (p.boot ? 0.45 : 0);
const printSize = p => ({ w: (p.diameter / 2) * ARC, h: p.print[1] - p.print[0] });

let layer = null;               // print layer of the currently selected bottle
let stageGroup = null;          // everything that is currently shown (one bottle or all three)
let frontCam = new THREE.Vector3();
let camTween = null;

/* =====================================================================
   3. RENDERER, SCENE, LIGHTS, TABLE
   ===================================================================== */
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

/** Grey noise texture used for fine surface grain (powder coat, frosted plastic, table). */
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

/** Vertical grip ribs (used on lid collars and the silicone boot). */
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

/** Soft dark spot under a bottle so it sits on the table. */
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

/* =====================================================================
   4. BOTTLE PARTS (all measurements in cm)
   ===================================================================== */
function latheMesh(points, material, segments = 112) {
  return new THREE.Mesh(new THREE.LatheGeometry(points, segments), material);
}

function physical(color, roughness, clearcoat, extra = {}) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness, clearcoat, clearcoatRoughness: 0.35, side: THREE.DoubleSide, envMapIntensity: 0.9, ...extra
  });
}

/** Body: flat base with a recess, straight wall, rounded shoulder, narrow neck. Colour (or ombré) is baked into vertex colours. */
function buildBody(p) {
  const r = p.diameter / 2, H = p.bodyHeight, rc = p.cornerRadius;
  const rNeck = r * p.neckRatio, wallTop = H - p.shoulderHeight;

  const profile = [V2(0, 0.3), V2(r - rc - 0.5, 0.3), V2(r - rc - 0.4, 0), V2(r - rc, 0)];
  for (let i = 1; i <= 8; i++) {                                    // rounded bottom edge
    const a = -Math.PI / 2 + (i / 8) * Math.PI / 2;
    profile.push(V2(r - rc + rc * Math.cos(a), rc + rc * Math.sin(a)));
  }
  profile.push(V2(r, wallTop));                                     // straight wall
  for (let i = 1; i <= 16; i++) {                                   // shoulder curving in to the neck
    const t = i / 16;
    profile.push(V2(r + (rNeck - r) * smooth(t), wallTop + (H - 0.15 - wallTop) * t));
  }
  profile.push(V2(rNeck, H));

  const geometry = new THREE.LatheGeometry(profile, 128);
  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color(p.bodyColor || '#ffffff');
  const grad = p.gradient && { bottom: new THREE.Color(p.gradient.bottom), top: new THREE.Color(p.gradient.top) };
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    if (grad) tmp.copy(grad.bottom).lerp(grad.top, THREE.MathUtils.smoothstep(pos.getY(i) / H, p.gradient.from, p.gradient.to));
    else tmp.copy(base);
    colors.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = physical(0xffffff, p.finish.roughness, p.finish.clearcoat, {
    vertexColors: true, bumpMap: grainTex, bumpScale: p.finish.bump, clearcoatRoughness: 0.45, envMapIntensity: 0.8
  });
  return new THREE.Mesh(geometry, material);
}

/** Silicone boot at the bottom of the large tumbler. */
function buildBoot(p) {
  const r = p.diameter / 2, { height, color } = p.boot;
  const profile = [V2(r - 0.2, 0), V2(r + 0.3, 0.08), V2(r + 0.45, 0.6), V2(r + 0.45, height - 0.4), V2(r + 0.33, height), V2(r + 0.02, height + 0.1)];
  const material = physical(color, 0.75, 0, { sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.6, bumpMap: ribTex, bumpScale: 0.35 });
  return latheMesh(profile, material);
}

/** U-shaped carry loop standing on the lid. */
function buildLoop(width, height, tubeRadius, material) {
  const pts = [[-width, 0], [-width * 1.05, height * 0.45], [-width * 0.62, height * 0.93], [width * 0.62, height * 0.93], [width * 1.05, height * 0.45], [width, 0]]
    .map(([x, y]) => new THREE.Vector3(x, y, 0));
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 72, tubeRadius, 16), material);
}

/** Lid for the insulated (coral) and large (purple) tumblers: ribbed collar, domed cap, carry loop. */
function buildScrewLid(p, rNeck) {
  const group = new THREE.Group();
  const R = rNeck * 1.08, cap = p.capHeight;
  const lidMat = physical(p.colors.lid, 0.42, 0.3);
  const collarMat = physical(p.colors.collar, 0.5, 0.15, { bumpMap: ribTex, bumpScale: 0.6 });
  const handleMat = physical(p.colors.handle, 0.35, 0.4);
  const darkMat = physical(0x1b1b1d, 0.5, 0.2);

  group.add(latheMesh([V2(R - 0.05, 0), V2(R, 0.1), V2(R, cap - 0.7), V2(R - 0.15, cap - 0.35), V2(R - 0.6, cap - 0.08), V2(rNeck * 0.45, cap), V2(0, cap)], lidMat));
  group.add(latheMesh([V2(R + 0.04, 0.12), V2(R + 0.04, cap * 0.55)], collarMat));           // grip band
  group.add(latheMesh([V2(rNeck, -0.3), V2(rNeck, 0.1)], darkMat));                          // thin seam between lid and body

  if (p.kind === 'large') {                                                                  // drinking spout with small holes
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
  for (const side of [-1, 1]) {                                                              // loop mounting blocks
    const block = new THREE.Mesh(new THREE.BoxGeometry(tube * 2.6, 0.5, tube * 3), handleMat);
    block.position.set(side * loopW, cap - 0.1, 0);
    group.add(block);
  }
  return group;
}

/** Lid for the sport bottle: teal collar, black body, flip hood, latch, hinge and strap loop. */
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
  add(new THREE.BoxGeometry(rNeck * 0.7, 0.9, 0.5), 0, 3.35, rNeck * 1.02);                 // front latch
  add(new THREE.BoxGeometry(rNeck * 0.5, 0.35, 0.8), 0, 4.95, rNeck * 0.95, 0.12);          // thumb tab
  add(new THREE.BoxGeometry(rNeck * 0.6, 1.5, 0.5), 0, 3.8, -rNeck * 1.0);                  // hinge block

  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.16, 14, 40), blackMat);       // side strap loop
  strap.position.set(-R - 0.55, 1.8, 0);
  strap.rotation.y = Math.PI / 2;
  group.add(strap);
  return group;
}

/** Transparent canvas layer wrapped around the front of the bottle (customer photo + text). */
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

/** One complete bottle, built in cm and scaled to scene units. */
function buildBottle(key, withPrint) {
  const p = PRODUCTS[key], r = p.diameter / 2, rNeck = r * p.neckRatio;
  const group = new THREE.Group();

  group.add(buildBody(p));
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

/* =====================================================================
   5. STAGE: show one bottle, or all three side by side to compare sizes
   ===================================================================== */
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
  const gap = 3;                                                           // cm between bottles
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

/* =====================================================================
   6. PAINT THE PHOTO + TEXT ONTO THE PRINT LAYER
   ===================================================================== */
function paint() {
  if (!layer) return;
  const { canvas, ctx, tex } = layer, W = canvas.width, H = canvas.height, text = state.text.trim();
  ctx.clearRect(0, 0, W, H);

  if (state.img) {
    const k = Math.max(W / state.img.width, H / state.img.height) * state.zoom;
    const w = state.img.width * k, h = state.img.height * k;
    ctx.drawImage(state.img, (W - w) / 2 + state.px * W / 2, (H - h) / 2 - state.py * H / 2, w, h);
  } else if (!text) {
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(43,27,23,.45)';
    ctx.lineWidth = H * 0.012;
    ctx.setLineDash([H * 0.04, H * 0.03]);
    ctx.strokeRect(H * 0.04, H * 0.04, W - H * 0.08, H * 0.92);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(43,27,23,.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${H * 0.085}px Poppins, Arial, sans-serif`;
    ctx.fillText('Your photo or text here', W / 2, H / 2);
  }

  if (text) {
    const lines = text.split('\n').slice(0, 3);
    let size = H * state.textSize;
    ctx.font = FONTS[state.font][1](size);
    const widest = Math.max(...lines.map(line => ctx.measureText(line).width));
    if (widest > W * 0.88) size *= (W * 0.88) / widest;                    // shrink long text to fit
    ctx.font = FONTS[state.font][1](size);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = state.color;
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = size * 0.08;
    ctx.shadowOffsetY = size * 0.03;
    const lineHeight = size * 1.15;
    const top = H / 2 - state.textY * H * 0.4 - (lines.length - 1) * lineHeight / 2;
    lines.forEach((line, i) => ctx.fillText(line, W / 2, top + i * lineHeight));
    ctx.shadowColor = 'transparent';
  }

  tex.needsUpdate = true;
  const hasDesign = !!(state.img || text);
  $('#add').disabled = !hasDesign;
  $('#addHint').textContent = hasDesign ? 'Looks good? Add it to your order.' : 'Add a photo or some text to continue.';
}

/* =====================================================================
   7. INTERFACE
   ===================================================================== */
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
$('#tcolors').innerHTML = TEXT_COLORS.map(c =>
  `<button type="button" class="sw ${c === state.color ? 'on' : ''}" data-c="${c}" style="--c:${c}" aria-label="Text color ${c}"></button>`).join('');
document.querySelectorAll('#tcolors .sw').forEach(b => b.onclick = () => {
  state.color = b.dataset.c;
  document.querySelectorAll('#tcolors .sw').forEach(x => x.classList.toggle('on', x === b));
  paint();
});

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

/* ---------- photo upload ---------- */
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

/* ---------- add to order ---------- */
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

function snapshot() {                                                      // square preview from the front
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
  const p = PRODUCTS[state.size], text = state.text.trim();
  if (!state.img && !text) return;
  setCompare(false);                                                       // preview must show the single bottle
  const parts = [state.img && 'Photo', text && `Text “${text.replace(/\n/g, ' ')}”`].filter(Boolean).join(' + ');
  const saved = Cart.add({
    key: 'tumbler-' + Date.now(), id: 'tumbler-custom', name: 'Custom Tumbler',
    detail: `${p.capacity} · ${p.colorName} · ${parts}`, price: p.price, art: 'mug', bg: 'bg-pink',
    preview: snapshot(), design: toJPEG(layer.canvas, 1000, 0.8)
  }, 1);
  if (!saved) return toast('Could not save. Browser storage is full.');
  toast('Added to your order');
  setTimeout(() => location.href = 'order.html?type=product&open=cart', 450);
};

/* =====================================================================
   8. RENDER LOOP
   ===================================================================== */
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
