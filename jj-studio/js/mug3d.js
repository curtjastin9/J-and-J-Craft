import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { createHands, createSteam } from './hands.js';

/* ---------- Settings (sample values: the owner will set real ones later) ---------- */
const CUSTOM_PRICE = 250;
const MAX_MB = 10;
const COLORS = [
  ['White', '#FFFFFF'], ['Red', '#E4262C'], ['Yellow', '#FFC72C'], ['Pink', '#F58FB0'],
  ['Blue', '#2F6FDE'], ['Green', '#2E9B5B'], ['Black', '#2A2A2E']
];
const SIDES = {
  front: { label: 'Front', start: THREE.MathUtils.degToRad(-70), arc: THREE.MathUtils.degToRad(140), cam: [0, 0.9, 5.8] },
  back:  { label: 'Back',  start: THREE.MathUtils.degToRad(110), arc: THREE.MathUtils.degToRad(140), cam: [0, 0.9, -5.8] }   // opposite of the front, handle sits between
};
for (const k in SIDES) Object.assign(SIDES[k], { key: k, img: null, zoom: 1, px: 0, py: 0, wid: 1, len: 1, mesh: null, canvas: null, ctx: null, tex: null });
const PRINT_H = 1.5, TEX_W = 2048;

const $ = s => document.querySelector(s);
const viewport = $('#viewport');

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

const key = new THREE.DirectionalLight(0xfff4e6, 1.3); key.position.set(3.5, 6, 4); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 5;
Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 18 }); scene.add(key);
const rim = new THREE.DirectionalLight(0xdfe8ff, 0.6); rim.position.set(-5, 3, -4); scene.add(rim);
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.enablePan = false; controls.minDistance = 3.4; controls.maxDistance = 9;
controls.minPolarAngle = 0.25; controls.maxPolarAngle = Math.PI * 0.62;
controls.target.set(0.25, 0, 0);
controls.autoRotateSpeed = 2;

/* ---------- Mug model ---------- */
const mug = new THREE.Group(); scene.add(mug);
const bodyMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide, envMapIntensity: 0.6
});

// Body: a profile spun around the vertical axis (gives a real wall thickness and rounded rim)
const profile = [[0,-1],[0.88,-1],[0.96,-0.97],[0.995,-0.9],[1,-0.8],[1,0.96],[0.985,0.995],[0.94,1],[0.9,0.99],[0.89,0.94],[0.89,-0.86],[0,-0.86]]
  .map(([x, y]) => new THREE.Vector2(x, y));
mug.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 128), bodyMat));

// Handle on the +X side
const handleCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.95, 0.62, 0), new THREE.Vector3(1.38, 0.66, 0), new THREE.Vector3(1.66, 0.3, 0),
  new THREE.Vector3(1.66, -0.3, 0), new THREE.Vector3(1.38, -0.62, 0), new THREE.Vector3(0.95, -0.58, 0)
]);
mug.add(new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 64, 0.115, 20, false), bodyMat));

// Coffee inside the mug
const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.885, 64), new THREE.MeshPhysicalMaterial({ color: 0x3A2316, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }));
coffee.rotation.x = -Math.PI / 2; coffee.position.y = 0.62; mug.add(coffee);
mug.traverse(o => { if (o.isMesh) o.castShadow = true; });

// Table: matte surface that catches the real shadows and fades into the background
const table = new THREE.Mesh(new THREE.CircleGeometry(14, 64), new THREE.MeshStandardMaterial({ color: 0xDDDCD4, roughness: 0.85 }));
table.rotation.x = -Math.PI / 2; table.position.y = -1.004; table.receiveShadow = true; scene.add(table);

const hands = createHands(scene), steam = createSteam(scene);

/* ---------- Photo layers (one canvas per side, painted onto a curved strip of the mug) ---------- */
const state = { side: 'front', colorName: 'White' };
const cur = () => SIDES[state.side];

function makePrintMat() {
  return new THREE.MeshPhysicalMaterial({
    transparent: true, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 0.6,
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

/* ---------- UI wiring ---------- */
function setColor(name, hex) {
  bodyMat.color.set(hex); state.colorName = name; $('#colorName').textContent = name;
  document.querySelectorAll('.sw').forEach(b => b.classList.toggle('on', b.dataset.name === name));
}
$('#swatches').innerHTML = COLORS.map(([n, h]) =>
  `<button class="sw ${n === 'White' ? 'on' : ''}" data-name="${n}" data-hex="${h}" style="--c:${h}" aria-label="${n}" title="${n}"></button>`).join('');
document.querySelectorAll('.sw').forEach(b => b.onclick = () => setColor(b.dataset.name, b.dataset.hex));

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
  const hasBack = !!SIDES.back.img;
  const ok = Cart.add({
    key: 'mug-custom-' + Date.now(), id: 'mug-custom', name: 'Custom Photo Mug',
    detail: `${hasBack ? 'Front + Back' : 'Front only'} · ${state.colorName}`, price: CUSTOM_PRICE, art: 'mug', bg: 'bg-red',
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
