import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { createHands, createSteam, HANDLE_POINTS, HANDLE_R } from './hands.js';

/* ---------- Settings (sample values: the owner will set real ones later) ---------- */
const CUSTOM_PRICE = 250;
const MAX_MB = 10;
const SIDES = {
  front: { label: 'Front', start: THREE.MathUtils.degToRad(-70), arc: THREE.MathUtils.degToRad(140), cam: [0, 0.9, 5.8] },
  back:  { label: 'Back',  start: THREE.MathUtils.degToRad(110), arc: THREE.MathUtils.degToRad(140), cam: [0, 0.9, -5.8] }   // opposite of the front, handle sits between
};
for (const k in SIDES) Object.assign(SIDES[k], { key: k, img: null, zoom: 1, px: 0, py: 0, wid: 1, len: 1, mesh: null, canvas: null, ctx: null, tex: null });
const PRINT_H = 1.5, TEX_W = 2048;

const $ = s => document.querySelector(s);
const viewport = $('#viewport');

/* ---------- Procedural micro-texture helper (glaze orange-peel, table grain) ---------- */
function noiseTexture(size, mid, amp, repeatX, repeatY, blur = 0.6) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), img = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = Math.max(0, Math.min(255, mid + (Math.random() - 0.5) * 2 * amp));
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  if (blur > 0) { g.filter = `blur(${blur}px)`; g.drawImage(c, 0, 0); g.filter = 'none'; }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeatX, repeatY);
  t.anisotropy = 8;
  return t;
}

/* ---------- Renderer / scene ---------- */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xE9EAE5); scene.fog = new THREE.Fog(0xE9EAE5, 9, 17);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
camera.position.set(...SIDES.front.cam);

// Studio lighting: soft warm key, cool rim, gentle fill and sky/ground bounce
const key = new THREE.DirectionalLight(0xfff1de, 1.25); key.position.set(3.5, 6, 4); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 6;
Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 18 }); scene.add(key);
const rim = new THREE.DirectionalLight(0xdfe8ff, 0.55); rim.position.set(-5, 3, -4); scene.add(rim);
const fill = new THREE.DirectionalLight(0xffffff, 0.3); fill.position.set(-4, 2, 5); scene.add(fill);
scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 0.35));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.enablePan = false; controls.minDistance = 3.4; controls.maxDistance = 9;
controls.minPolarAngle = 0.25; controls.maxPolarAngle = Math.PI * 0.62;
controls.target.set(0.25, 0, 0);
controls.autoRotateSpeed = 2;

/* ---------- Mug model ---------- */
const V2 = (x, y) => new THREE.Vector2(x, y);
const arc = (cx, cy, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => {
  const a = THREE.MathUtils.degToRad(a0 + (a1 - a0) * i / n);
  return V2(cx + r * Math.cos(a), cy + r * Math.sin(a));
});

// Unglazed foot: the raw, matte ceramic ring a real mug sits on
const FOOT_PROFILE = [
  V2(0, -0.965), V2(0.6, -0.965), V2(0.66, -0.975), V2(0.7, -1),     // underside recess
  ...arc(0.9, -0.9, 0.1, -90, -60, 4)                                   // foot ring
];
// Glazed body: rounded bottom edge, straight wall, rounded rim, glazed inside
const BODY_PROFILE = [
  ...arc(0.9, -0.9, 0.1, -60, 0, 6),                                    // rounded bottom edge
  ...arc(0.945, 0.945, 0.055, 0, 180, 12),                              // outer wall -> rounded rim
  ...arc(0.79, -0.8, 0.1, 0, -90, 8),                                   // inner wall -> inner floor edge
  V2(0.4, -0.9), V2(0, -0.9)                                            // inner floor
];

// Handle: same centre line as the hand model (so fingers grip it exactly), with flared ends that blend into the wall.
function buildHandleGeometry() {
  const curve = new THREE.CatmullRomCurve3(HANDLE_POINTS.map(p => new THREE.Vector3(...p)));
  const SEG = 120, RAD = 28, frames = curve.computeFrenetFrames(SEG, false);
  const flare = t => { const e = Math.min(t, 1 - t), k = 1 - THREE.MathUtils.smoothstep(e, 0, 0.1); return k * k; };
  const pos = [], nor = [], uv = [], idx = [];

  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG, p = curve.getPointAt(t), r = HANDLE_R * (1 + 0.55 * flare(t));
    for (let j = 0; j <= RAD; j++) {
      const a = j / RAD * Math.PI * 2;
      const n = frames.normals[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a));
      pos.push(p.x + r * n.x, p.y + r * n.y, p.z + r * n.z);
      nor.push(n.x, n.y, n.z);
      uv.push(t, j / RAD);
    }
  }
  for (let i = 0; i < SEG; i++) for (let j = 0; j < RAD; j++) {
    const a = i * (RAD + 1) + j, b = a + RAD + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);          // outward-facing winding (the old order faced inward, which made the handle look harsh black/white)
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// Glazed ceramic: smooth glaze with tiny surface variation, plus a glossy clear coat
const glazeBump = noiseTexture(256, 128, 40, 10, 3, 0.8);
const glazeRough = noiseTexture(256, 205, 28, 6, 2, 1.5);
const bodyMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff, roughness: 0.2, roughnessMap: glazeRough, bumpMap: glazeBump, bumpScale: 0.012, metalness: 0,
  clearcoat: 0.85, clearcoatRoughness: 0.06, ior: 1.5, specularIntensity: 0.9, envMapIntensity: 0.6, side: THREE.DoubleSide
});

// Handle: always glossy white ceramic, independent of the mug color
const handleMat = new THREE.MeshPhysicalMaterial({
  color: 0xf6f4ef, roughness: 0.2, roughnessMap: glazeRough, bumpMap: glazeBump, bumpScale: 0.012, metalness: 0,
  clearcoat: 0.85, clearcoatRoughness: 0.06, ior: 1.5, specularIntensity: 0.9, envMapIntensity: 0.6, side: THREE.DoubleSide
});

// Raw ceramic foot ring
const footMat = new THREE.MeshStandardMaterial({
  color: 0xe8dfd0, roughness: 0.92, metalness: 0, bumpMap: noiseTexture(128, 128, 90, 12, 2, 0.3), bumpScale: 0.03, side: THREE.DoubleSide
});

const mug = new THREE.Group(); scene.add(mug);
mug.add(new THREE.Mesh(new THREE.LatheGeometry(BODY_PROFILE, 160), bodyMat));
mug.add(new THREE.Mesh(new THREE.LatheGeometry(FOOT_PROFILE, 160), footMat));
mug.add(new THREE.Mesh(buildHandleGeometry(), handleMat));

// Coffee with crema ring, tiny bubbles near the wall and a soft meniscus
function coffeeTexture() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, '#3b2214'); gr.addColorStop(0.6, '#33200f'); gr.addColorStop(0.9, '#55361e'); gr.addColorStop(1, '#241509');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 420; i++) {                      // bubbles gathered around the edge
    const a = Math.random() * Math.PI * 2, d = S * (0.36 + Math.random() * 0.12), r = 1 + Math.random() * 3.2;
    g.fillStyle = `rgba(160,110,70,${0.12 + Math.random() * 0.2})`;
    g.beginPath(); g.arc(S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d, r, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const coffee = new THREE.Mesh(
  new THREE.CircleGeometry(0.885, 96),
  new THREE.MeshPhysicalMaterial({ map: coffeeTexture(), roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 0.9 })
);
coffee.rotation.x = -Math.PI / 2; coffee.position.y = 0.62; mug.add(coffee);

mug.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = o !== coffee; } });

// Table: matte surface with fine grain that catches the real shadows and fades into the background
const tableMat = new THREE.MeshStandardMaterial({
  color: 0xDDDCD4, roughness: 0.88, bumpMap: noiseTexture(256, 128, 60, 40, 40, 0.6), bumpScale: 0.25
});
const table = new THREE.Mesh(new THREE.CircleGeometry(14, 64), tableMat);
table.rotation.x = -Math.PI / 2; table.position.y = -1.004; table.receiveShadow = true; scene.add(table);

// Soft contact shadow right under the mug (tight dark core + wide soft falloff) so it sits on the table
function contactShadow() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 30, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.35, 'rgba(0,0,0,.28)'); gr.addColorStop(0.7, 'rgba(0,0,0,.08)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(0.35, -1.0, 0); return m;
}
scene.add(contactShadow());

const hands = createHands(scene), steam = createSteam(scene);

/* ---------- Photo layers (one canvas per side, painted onto a curved strip of the mug) ---------- */
const state = { side: 'front', colorName: MugColors.ALWAYS };
const cur = () => SIDES[state.side];

function makePrintMat() {
  return new THREE.MeshPhysicalMaterial({
    transparent: true, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.55,
    polygonOffset: true, polygonOffsetFactor: -2
  });
}

function buildSide(S) {
  S.mat = makePrintMat();
  S.mesh = new THREE.Mesh(new THREE.CylinderGeometry(1.004, 1.004, PRINT_H, 128, 1, true, S.start, S.arc), S.mat);
  S.mesh.position.y = -0.02; mug.add(S.mesh);
  S.canvas = document.createElement('canvas');
  S.canvas.width = TEX_W; S.canvas.height = Math.round(TEX_W * PRINT_H / (1.004 * S.arc));
  S.ctx = S.canvas.getContext('2d');
  S.tex = new THREE.CanvasTexture(S.canvas);
  S.tex.colorSpace = THREE.SRGBColorSpace;
  S.tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  S.mat.map = S.tex; S.mat.needsUpdate = true;
  paint(S);
}

function paint(S) {
  const { ctx, canvas } = S, W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (!S.img) {                                       // placeholder until a photo is chosen
    if (S.key === 'back') { S.tex.needsUpdate = true; return; }   // empty back stays plain
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(43,27,23,.45)'; ctx.lineWidth = H * 0.012; ctx.setLineDash([H * 0.04, H * 0.03]);
    ctx.strokeRect(H * 0.05, H * 0.05, W - H * 0.1, H * 0.9);
    ctx.setLineDash([]); ctx.fillStyle = 'rgba(43,27,23,.7)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 ${H * 0.1}px Poppins, Arial, sans-serif`; ctx.fillText('Your photo here', W / 2, H * 0.47);
    ctx.font = `500 ${H * 0.055}px Poppins, Arial, sans-serif`; ctx.fillText('Upload a photo to start', W / 2, H * 0.6);
  } else {
    const img = S.img, s = Math.max(W / img.width, H / img.height) * S.zoom;
    const w = img.width * s * S.wid, h = img.height * s * S.len;     // width / length stretch
    ctx.drawImage(img, (W - w) / 2 + S.px * W / 2, (H - h) / 2 - S.py * H / 2, w, h);
  }
  S.tex.needsUpdate = true;
}

/* ---------- Mug colors (only the colors the admin has enabled can be picked) ---------- */
function setColor(name) {
  const hex = MugColors.ALL.find(c => c[0] === name)[1];
  bodyMat.color.set(hex); state.colorName = name; $('#colorName').textContent = name;   // body only: the handle stays black
  document.querySelectorAll('.sw').forEach(b => b.classList.toggle('on', b.dataset.name === name));
}

function renderSwatches() {
  if (!MugColors.isEnabled(state.colorName)) setColor(MugColors.ALWAYS);   // admin switched the chosen color off
  $('#swatches').innerHTML = MugColors.ALL.map(([name, hex]) => {
    const ok = MugColors.isEnabled(name);
    return `<button type="button" class="sw ${name === state.colorName ? 'on' : ''}" data-name="${name}" style="--c:${hex}"
      aria-label="${name}${ok ? '' : ' (not available)'}" title="${ok ? name : name + ' · not available yet'}" ${ok ? '' : 'disabled'}></button>`;
  }).join('');
  document.querySelectorAll('.sw:not(:disabled)').forEach(b => b.onclick = () => setColor(b.dataset.name));
  const locked = MugColors.ALL.some(([name]) => !MugColors.isEnabled(name));
  $('#colorNote').textContent = locked ? 'Other colors are not available yet. The shop will turn them on when they are in stock.' : '';
}
renderSwatches();
window.addEventListener('storage', e => { if (e.key === MugColors.KEY) renderSwatches(); });   // admin changed it in another tab

/* ---------- UI wiring ---------- */
let tween = null;
function goTo(pos) { tween = new THREE.Vector3(...pos); }

const SL = { zoom: '#zoom', len: '#len', wid: '#wid', px: '#px', py: '#py' };
function syncControls() {
  const S = cur();
  for (const k in SL) $(SL[k]).value = S[k];
  if (S.img) $('#adjust').removeAttribute('aria-disabled'); else $('#adjust').setAttribute('aria-disabled', 'true');
}
function selectSide(side, move = true) {
  state.side = side;
  document.querySelectorAll('[data-side]').forEach(x => { const on = x.dataset.side === side; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
  syncControls();
  if (move) goTo(cur().cam);
}
document.querySelectorAll('[data-side]').forEach(b => b.onclick = () => selectSide(b.dataset.side));

for (const k in SL) $(SL[k]).addEventListener('input', e => { const S = cur(); S[k] = parseFloat(e.target.value); paint(S); });
$('#resetPhoto').onclick = () => { const S = cur(); Object.assign(S, { zoom: 1, px: 0, py: 0, wid: 1, len: 1 }); syncControls(); paint(S); };

$('#hands').onclick = e => { const on = hands.toggle(); e.currentTarget.classList.toggle('on', on); e.currentTarget.setAttribute('aria-pressed', on); };
$('#spin').onclick = e => {
  controls.autoRotate = !controls.autoRotate; e.currentTarget.setAttribute('aria-pressed', controls.autoRotate);
  e.currentTarget.classList.toggle('on', controls.autoRotate);
};
$('#reset').onclick = () => { controls.autoRotate = false; $('#spin').classList.remove('on'); goTo(cur().cam); };
controls.addEventListener('start', () => { tween = null; $('#hint').classList.add('gone'); });

/* ---------- Photo upload (stays in the browser until checkout) ---------- */
function loadFile(side, file) {
  if (!file) return;
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return toast('Please choose a JPG, PNG or WebP image');
  if (file.size > MAX_MB * 1024 * 1024) return toast(`That photo is over ${MAX_MB} MB`);
  const S = SIDES[side], url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    Object.assign(S, { img, zoom: 1, px: 0, py: 0, wid: 1, len: 1 });
    $('#pimg-' + side).src = url; $('#pname-' + side).textContent = file.name; $('#pdim-' + side).textContent = `${img.width} × ${img.height}px`;
    $('#picked-' + side).hidden = false; $('#drop-' + side).hidden = true;
    selectSide(side);                                  // show + adjust the photo that was just added
    paint(S);
    if (SIDES.front.img) { $('#add').disabled = false; $('#addHint').textContent = SIDES.back.img ? 'Looks good? Add it to your order.' : 'Add a back photo too, or add it to your order.'; }
    else $('#addHint').textContent = 'Upload a front photo to continue.';
    if (Math.min(img.width, img.height) < 600) toast('Low-resolution photo. The print may look soft.');
  };
  img.onerror = () => toast('Could not open that image');
  img.src = url;
}
for (const side of ['front', 'back']) {
  $('#file-' + side).onchange = e => { loadFile(side, e.target.files[0]); e.target.value = ''; };
  const drop = $('#drop-' + side);
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => loadFile(side, e.dataTransfer.files[0]));
}

/* ---------- Add to order ---------- */
function toJPEG(src, maxW, q, w, h) {
  const k = Math.min(1, maxW / (w || src.width)), c = document.createElement('canvas');
  c.width = Math.round((w || src.width) * k); c.height = Math.round((h || src.height) * k);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(src, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', q);
}
function snapshot() {                                  // square preview from the front view
  const keep = camera.position.clone(), hv = hands.group.visible, sv = steam.group.visible;
  hands.group.visible = steam.group.visible = false;
  camera.position.set(...SIDES.front.cam); controls.update(); renderer.render(scene, camera);
  const r = renderer.domElement, side = Math.min(r.width, r.height), c = document.createElement('canvas');
  c.width = c.height = 360;
  c.getContext('2d').drawImage(r, (r.width - side) / 2, (r.height - side) / 2, side, side, 0, 0, 360, 360);
  camera.position.copy(keep); controls.update(); hands.group.visible = hv; steam.group.visible = sv;
  return c.toDataURL('image/jpeg', 0.85);
}
$('#add').onclick = () => {
  if (!SIDES.front.img) return;
  if (!MugColors.isEnabled(state.colorName)) renderSwatches();       // never order a color that was switched off
  const hasBack = !!SIDES.back.img;
  const ok = Cart.add({
    key: 'mug-custom-' + Date.now(), id: 'mug-custom', name: 'Custom Photo Mug',
    detail: `${hasBack ? 'Front + Back' : 'Front only'} · ${state.colorName} · White handle`, price: CUSTOM_PRICE, art: 'mug', bg: 'bg-red',
    preview: snapshot(), design: toJPEG(SIDES.front.canvas, 1000, 0.78), designBack: hasBack ? toJPEG(SIDES.back.canvas, 1000, 0.78) : null
  }, 1);
  if (!ok) return toast('Could not save. Browser storage is full.');
  toast('Added to your order');
  setTimeout(() => location.href = 'order.html?type=product&open=cart', 450);
};
$('#price').textContent = '₱' + CUSTOM_PRICE;

/* ---------- Loop ---------- */
function resize() {
  const w = viewport.clientWidth, h = viewport.clientHeight;
  renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewport); resize();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime(); hands.update(t); steam.update(t);
  if (tween) { camera.position.lerp(tween, 0.09); if (camera.position.distanceTo(tween) < 0.02) tween = null; }
  controls.update(); renderer.render(scene, camera);
});

buildSide(SIDES.front); buildSide(SIDES.back);
$('#loading').remove();
