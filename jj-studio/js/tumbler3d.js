import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

/* ---------- The 3 tumbler sizes (shapes and colors follow the shop's photos; prices are samples) ---------- */
const SIZES = {
  s: { name: 'Sport Bottle', ml: '750 ml', price: 320, colorName: 'Teal Green', r: 0.78, H: 3.3, sh: 2.55, neck: 0.86, style: 'flip',
       body: '#1c6b75', rough: 0.72, clear: 0.05, ring: '#1f6f78', lid: '#18181a', handle: '#18181a', print: [0.45, 2.4], dot: '#1c6b75' },
  m: { name: 'Insulated Tumbler', ml: '900 ml', price: 390, colorName: 'Coral Pink', r: 0.95, H: 3.0, sh: 2.35, neck: 0.8, style: 'rect',
       body: '#f0506b', rough: 0.4, clear: 0.2, ring: '#f0586f', lid: '#9ea3aa', handle: '#aeb3ba', print: [0.5, 2.2], dot: '#f0506b' },
  l: { name: 'Large Tumbler', ml: '1.2 L', price: 450, colorName: 'Purple Ombré', r: 1.08, H: 3.4, sh: 2.7, neck: 0.78, style: 'round',
       body: '#6b3fa0', grad: { bot: '#efc6e6', top: '#6b3fa0', a: 0.1, b: 0.62 }, boot: '#f1b8de', rough: 0.4, clear: 0.2,
       ring: '#7d4fb5', lid: '#7d4fb5', handle: '#7d4fb5', print: [0.8, 2.55], dot: 'linear-gradient(#6b3fa0,#efc6e6)' }
};
const FONTS = [
  ['Poppins Bold', s => `700 ${s}px Poppins, Arial, sans-serif`],
  ['Baloo Rounded', s => `800 ${s}px "Baloo 2", Poppins, sans-serif`],
  ['Elegant Serif', s => `italic 700 ${s}px Georgia, "Times New Roman", serif`],
  ['Script', s => `400 ${s}px "Brush Script MT", "Segoe Script", cursive`],
  ['Impact', s => `400 ${s}px Impact, "Arial Narrow", sans-serif`]
];
const COLORS = ['#ffffff', '#292329', '#d92332', '#ffd36a', '#2f6fde', '#2e9b5b', '#f58fb0'];
const ARC = THREE.MathUtils.degToRad(120), TEX_W = 2048, MAX_MB = 10;

const $ = s => document.querySelector(s);
const viewport = $('#viewport');
const S = { size: 'm', img: null, zoom: 1, px: 0, py: 0, text: '', font: 0, color: '#ffffff', tsize: 0.14, ty: 0 };

/* ---------- renderer / scene ---------- */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xE9EAE5); scene.fog = new THREE.Fog(0xE9EAE5, 11, 20);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
const key = new THREE.DirectionalLight(0xfff1de, 1.3); key.position.set(3.5, 7, 4.5); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 6;
Object.assign(key.shadow.camera, { left: -5, right: 5, top: 6, bottom: -4, near: 1, far: 20 }); scene.add(key);
const rim = new THREE.DirectionalLight(0xdfe8ff, 0.6); rim.position.set(-5, 4, -4); scene.add(rim);
const fill = new THREE.DirectionalLight(0xffffff, 0.3); fill.position.set(-4, 2, 5); scene.add(fill);
scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 0.35));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
controls.minDistance = 3.5; controls.maxDistance = 14; controls.minPolarAngle = 0.3; controls.maxPolarAngle = Math.PI * 0.55;

/* table with fine grain + soft contact shadow */
function grain(size, mid, amp, rep) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), im = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) { const v = mid + (Math.random() - .5) * 2 * amp; im.data.set([v, v, v, 255], i * 4); }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); return t;
}
const table = new THREE.Mesh(new THREE.CircleGeometry(16, 64), new THREE.MeshStandardMaterial({ color: 0xDDDCD4, roughness: 0.88, bumpMap: grain(256, 128, 60, 40), bumpScale: 0.25 }));
table.rotation.x = -Math.PI / 2; table.position.y = -0.002; table.receiveShadow = true; scene.add(table);
const shadow = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 20, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,.6)'); gr.addColorStop(.4, 'rgba(0,0,0,.28)'); gr.addColorStop(.75, 'rgba(0,0,0,.07)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.004; scene.add(m); return m;
})();

/* ribbed grip texture (bump) */
const ribs = (() => {
  const c = document.createElement('canvas'); c.width = 64; c.height = 4;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 64, 0);
  gr.addColorStop(0, '#303030'); gr.addColorStop(.5, '#ffffff'); gr.addColorStop(1, '#303030');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 4);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(44, 1); return t;
})();

/* ---------- tumbler model ---------- */
const V2 = (x, y) => new THREE.Vector2(x, y);
const sstep = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
let model = null, L = null, frontCam = new THREE.Vector3(), tween = null;

function bodyGeometry(C) {
  const { r, H, sh } = C, rn = r * C.neck, rc = 0.16, h2 = H - 0.1, pts = [V2(0, 0), V2(r - rc, 0)];
  for (let i = 1; i <= 8; i++) { const a = -Math.PI / 2 + i / 8 * Math.PI / 2; pts.push(V2(r - rc + rc * Math.cos(a), rc + rc * Math.sin(a))); }
  pts.push(V2(r, sh));
  for (let i = 1; i <= 16; i++) { const s = i / 16, e = s * s * (3 - 2 * s); pts.push(V2(r + (rn - r) * e, sh + (h2 - sh) * s)); }
  pts.push(V2(rn, H));
  const g = new THREE.LatheGeometry(pts, 112), p = g.attributes.position, col = new Float32Array(p.count * 3);
  const base = new THREE.Color(C.body), a = C.grad && new THREE.Color(C.grad.bot), b = C.grad && new THREE.Color(C.grad.top), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    if (C.grad) c.copy(a).lerp(b, sstep(C.grad.a, C.grad.b, p.getY(i) / H)); else c.copy(base);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

function buildLid(C, rn) {
  const g = new THREE.Group();
  const mat = (color, rough, clear, rib) => new THREE.MeshPhysicalMaterial({ color, roughness: rough, clearcoat: clear, clearcoatRoughness: 0.35, bumpMap: rib ? ribs : null, bumpScale: 0.6 });
  const ring = mat(C.ring, 0.45, 0.15, true), lid = mat(C.lid, 0.4, 0.3), handle = mat(C.handle, 0.35, 0.4);
  const add = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const cyl = (rt, rb, h) => new THREE.CylinderGeometry(rt, rb, h, 72);
  const tube = (pts, rad, scale) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0] * scale, p[1], 0))), 64, rad, 14);
  add(cyl(rn * 1.07, rn * 1.07, 0.34), ring, 0, 0.17, 0);

  if (C.style === 'flip') {
    add(cyl(rn * 1.0, rn * 1.04, 0.3), lid, 0, 0.49, 0);
    add(cyl(rn * 0.96, rn * 0.96, 0.22), lid, 0, 0.75, 0);
    const tab = add(new THREE.BoxGeometry(rn * 0.95, 0.18, 0.4), lid, 0, 0.73, rn * 0.98); tab.rotation.x = 0.05;
    add(new THREE.TorusGeometry(0.22, 0.035, 14, 40), lid, -rn * 1.12, 0.2, 0).rotation.y = Math.PI / 2;      // side strap loop
    add(cyl(0.05, 0.05, 0.12), lid, -rn * 1.06, 0.2, 0).rotation.z = Math.PI / 2;
  } else {
    add(cyl(rn * 1.09, rn * 1.09, 0.07), lid, 0, 0.375, 0);
    add(cyl(rn * 0.93, rn * 1.0, 0.3), lid, 0, 0.56, 0);
    add(cyl(rn * 0.8, rn * 0.9, 0.12), lid, 0, 0.77, 0);
    if (C.style === 'rect') {
      const w = 0.4;
      add(tube([[-w, 0], [-w, 0.55], [-w * 0.7, 0.9], [w * 0.7, 0.9], [w, 0.55], [w, 0]].map(p => [p[0], p[1] + 0.78]), 0.055, rn), handle);
    } else {
      add(tube([[-0.2, 0], [-0.34, 0.5], [-0.26, 0.95], [0, 1.08], [0.26, 0.95], [0.34, 0.5], [0.2, 0]].map(p => [p[0], p[1] + 0.8]), 0.07, rn * 1.1), handle);
      add(cyl(rn * 0.34, rn * 0.4, 0.14), lid, 0, 0.86, 0);
    }
  }
  return g;
}

function build(key) {
  const C = SIZES[key], r = C.r, H = C.H, rn = r * C.neck; S.size = key;
  if (model) { scene.remove(model); model.traverse(o => o.geometry && o.geometry.dispose()); }
  model = new THREE.Group();

  const body = new THREE.Mesh(bodyGeometry(C), new THREE.MeshPhysicalMaterial({
    color: 0xffffff, vertexColors: true, roughness: C.rough, clearcoat: C.clear, clearcoatRoughness: 0.45, side: THREE.DoubleSide, envMapIntensity: 0.8 }));
  model.add(body);
  if (C.boot) {                                                          // silicone boot
    const b = [V2(0, -0.01), V2(r - 0.06, -0.01), V2(r + 0.01, 0.04), V2(r + 0.06, 0.15), V2(r + 0.06, 0.5), V2(r + 0.05, 0.58), V2(r + 0.0, 0.6)];
    model.add(new THREE.Mesh(new THREE.LatheGeometry(b, 112), new THREE.MeshPhysicalMaterial({ color: C.boot, roughness: 0.75, sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.6, side: THREE.DoubleSide })));
  }
  const lid = buildLid(C, rn); lid.position.y = H - 0.02; model.add(lid);

  // print layer (photo + text) on the front of the body
  const [y0, y1] = C.print, ph = y1 - y0;
  L = { canvas: document.createElement('canvas') };
  L.canvas.width = TEX_W; L.canvas.height = Math.round(TEX_W * ph / (r * ARC));
  L.ctx = L.canvas.getContext('2d');
  L.tex = new THREE.CanvasTexture(L.canvas); L.tex.colorSpace = THREE.SRGBColorSpace; L.tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const pm = new THREE.MeshPhysicalMaterial({ map: L.tex, transparent: true, roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.3, polygonOffset: true, polygonOffsetFactor: -2 });
  const print = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.003, r * 1.003, ph, 128, 1, true, -ARC / 2, ARC), pm);
  print.position.y = (y0 + y1) / 2; model.add(print);

  model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = o !== print; } });
  scene.add(model);
  shadow.scale.setScalar(r / 0.95);

  const mid = (H + 0.9) / 2, dist = (H + 1) * 1.65;
  controls.target.set(0, mid, 0); frontCam.set(0, mid + 0.5, dist); camera.position.copy(frontCam); tween = null; controls.update();
  paint(); updateUI();
}

/* ---------- photo + text painting ---------- */
function paint() {
  const { canvas: c, ctx: g } = L, W = c.width, H = c.height, text = S.text.trim();
  g.clearRect(0, 0, W, H);
  if (S.img) {
    const k = Math.max(W / S.img.width, H / S.img.height) * S.zoom, w = S.img.width * k, h = S.img.height * k;
    g.drawImage(S.img, (W - w) / 2 + S.px * W / 2, (H - h) / 2 - S.py * H / 2, w, h);
  } else if (!text) {
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(43,27,23,.45)'; g.lineWidth = H * 0.012; g.setLineDash([H * 0.04, H * 0.03]);
    g.strokeRect(H * 0.04, H * 0.04, W - H * 0.08, H * 0.92); g.setLineDash([]);
    g.fillStyle = 'rgba(43,27,23,.7)'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 ${H * 0.085}px Poppins, Arial, sans-serif`; g.fillText('Your photo or text here', W / 2, H / 2);
  }
  if (text) {
    const lines = S.S_lines = text.split('\n').slice(0, 3); let size = H * S.tsize;
    g.font = FONTS[S.font][1](size);
    const widest = Math.max(...lines.map(t => g.measureText(t).width));
    if (widest > W * 0.88) size *= W * 0.88 / widest;                       // auto-shrink long text
    g.font = FONTS[S.font][1](size); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = S.color; g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = size * 0.08; g.shadowOffsetY = size * 0.03;
    const lh = size * 1.15, top = H / 2 - S.ty * H * 0.4 - (lines.length - 1) * lh / 2;
    lines.forEach((t, i) => g.fillText(t, W / 2, top + i * lh));
    g.shadowColor = 'transparent';
  }
  L.tex.needsUpdate = true;
  const has = !!(S.img || text);
  $('#add').disabled = !has; $('#addHint').textContent = has ? 'Looks good? Add it to your order.' : 'Add a photo or some text to continue.';
}

/* ---------- UI ---------- */
function updateUI() {
  const C = SIZES[S.size];
  document.querySelectorAll('.tsz').forEach(b => b.classList.toggle('on', b.dataset.k === S.size));
  $('#sizeName').textContent = `${C.name} · ${C.ml} · ${C.colorName}`; $('#price').textContent = '₱' + C.price;
}
$('#sizes').innerHTML = Object.entries(SIZES).map(([k, C]) =>
  `<button type="button" class="tsz" data-k="${k}"><i style="--c:${C.dot.startsWith('linear') ? 'transparent;background:' + C.dot : C.dot}"></i><b>${C.ml}</b><small>${C.name}</small><span>₱${C.price}</span></button>`).join('');
document.querySelectorAll('.tsz').forEach(b => b.onclick = () => build(b.dataset.k));

$('#font').innerHTML = FONTS.map((f, i) => `<option value="${i}">${f[0]}</option>`).join('');
$('#tcolors').innerHTML = COLORS.map(c => `<button type="button" class="sw ${c === S.color ? 'on' : ''}" data-c="${c}" style="--c:${c}" aria-label="Text color ${c}"></button>`).join('');
document.querySelectorAll('#tcolors .sw').forEach(b => b.onclick = () => {
  S.color = b.dataset.c; document.querySelectorAll('#tcolors .sw').forEach(x => x.classList.toggle('on', x === b)); paint();
});
$('#txt').addEventListener('input', e => { S.text = e.target.value; paint(); });
$('#font').addEventListener('change', e => { S.font = +e.target.value; paint(); });
for (const [id, k] of [['zoom', 'zoom'], ['px', 'px'], ['py', 'py'], ['tsize', 'tsize'], ['ty', 'ty']])
  $('#' + id).addEventListener('input', e => { S[k] = parseFloat(e.target.value); paint(); });

$('#spin').onclick = e => { controls.autoRotate = !controls.autoRotate; e.currentTarget.classList.toggle('on', controls.autoRotate); e.currentTarget.setAttribute('aria-pressed', controls.autoRotate); };
$('#reset').onclick = () => { controls.autoRotate = false; $('#spin').classList.remove('on'); tween = frontCam.clone(); };
controls.addEventListener('start', () => { tween = null; $('#hint').classList.add('gone'); });

function loadFile(file) {
  if (!file) return;
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return toast('Please choose a JPG, PNG or WebP image');
  if (file.size > MAX_MB * 1024 * 1024) return toast(`That photo is over ${MAX_MB} MB`);
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    Object.assign(S, { img, zoom: 1, px: 0, py: 0 }); ['zoom', 'px', 'py'].forEach(k => $('#' + k).value = S[k]);
    $('#pimg').src = url; $('#pname').textContent = file.name; $('#pdim').textContent = `${img.width} × ${img.height}px`;
    $('#picked').hidden = false; $('#drop').hidden = true; $('#adjust').classList.remove('adjust-off'); paint();
    if (Math.min(img.width, img.height) < 600) toast('Low-resolution photo. The print may look soft.');
  };
  img.onerror = () => toast('Could not open that image');
  img.src = url;
}
$('#file').onchange = e => { loadFile(e.target.files[0]); e.target.value = ''; };
$('#removePhoto').onclick = () => { S.img = null; $('#picked').hidden = true; $('#drop').hidden = false; $('#adjust').classList.add('adjust-off'); paint(); };
const drop = $('#drop');
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => loadFile(e.dataTransfer.files[0]));

/* ---------- add to order ---------- */
function toJPEG(src, maxW, q) {
  const k = Math.min(1, maxW / src.width), c = document.createElement('canvas'); c.width = Math.round(src.width * k); c.height = Math.round(src.height * k);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(src, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', q);
}
function snapshot() {
  const keep = camera.position.clone(), ft = fog => fog;
  camera.position.copy(frontCam); controls.update(); renderer.render(scene, camera);
  const r = renderer.domElement, side = Math.min(r.width, r.height), c = document.createElement('canvas'); c.width = c.height = 360;
  c.getContext('2d').drawImage(r, (r.width - side) / 2, (r.height - side) / 2, side, side, 0, 0, 360, 360);
  camera.position.copy(keep); controls.update(); return c.toDataURL('image/jpeg', 0.85);
}
$('#add').onclick = () => {
  const C = SIZES[S.size], text = S.text.trim(); if (!S.img && !text) return;
  const parts = [S.img && 'Photo', text && `Text “${text.replace(/\n/g, ' ')}”`].filter(Boolean).join(' + ');
  const ok = Cart.add({
    key: 'tumbler-' + Date.now(), id: 'tumbler-custom', name: 'Custom Tumbler', detail: `${C.ml} · ${C.colorName} · ${parts}`,
    price: C.price, art: 'mug', bg: 'bg-pink', preview: snapshot(), design: toJPEG(L.canvas, 1000, 0.8)
  }, 1);
  if (!ok) return toast('Could not save. Browser storage is full.');
  toast('Added to your order'); setTimeout(() => location.href = 'order.html?type=product&open=cart', 450);
};

/* ---------- loop ---------- */
function resize() { const w = viewport.clientWidth, h = viewport.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(viewport); resize();
renderer.setAnimationLoop(() => {
  if (tween) { camera.position.lerp(tween, 0.09); if (camera.position.distanceTo(tween) < 0.02) tween = null; }
  controls.update(); renderer.render(scene, camera);
});

build('m');
$('#loading').remove();
Promise.all([document.fonts.load('700 40px Poppins'), document.fonts.load('800 40px "Baloo 2"')]).then(paint).catch(() => {});
