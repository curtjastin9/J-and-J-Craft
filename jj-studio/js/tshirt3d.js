import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

/* =====================================================================
   1. SETTINGS  (sample values: the owner sets the real ones later)
   ===================================================================== */
const CM = 0.1;                       // 1 scene unit = 10 cm
const TEX_W = 2048;
const PRICE = 350;                    // sample base price
const SIZE_EXTRA = { '2XL': 30 };     // sample extra for bigger sizes

const SIZES = [                        // flat chest width / length in cm (oversized fit) + model scale
  { k: 'XS',  chest: 56, len: 66, s: 0.92 },
  { k: 'S',   chest: 58.5, len: 68, s: 0.96 },
  { k: 'M',   chest: 61, len: 70, s: 1.00 },
  { k: 'L',   chest: 64, len: 72, s: 1.04 },
  { k: 'XL',  chest: 67, len: 74, s: 1.08 },
  { k: '2XL', chest: 70, len: 76, s: 1.12 }
];

/* White is the default (first in the list) */
const SHIRTS = [
  ['White', '#f4f4f1'], ['Blue Gray', '#9aadac'], ['Black', '#222326'], ['Navy', '#1f2b4d'],
  ['Royal Blue', '#2f5fc4'], ['Red', '#c8283a'], ['Forest Green', '#2f6b4a'], ['Pink', '#f0a7bf'],
  ['Beige', '#d9c7a8'], ['Maroon', '#6e1f2c'], ['Yellow', '#f4cf4a'], ['Gray', '#8d8f94']
];

/* Shirt shape in cm (boxy oversized tee, narrow crew neck) */
const D = { A: 31, B: 11.5, HB: 66, NA: 9.4, NB: 8.4, N: 4.2, RISE: 6.2, BACK: 2.5, FRONT: 2.4 };
const SL = { L: 27, ang: 17 * Math.PI / 180, ry0: 12.8, ry1: 11.6, rz0: 9.6, rz1: 8.4, sy: D.HB - 11.8, sx: D.A - 6 };
const PR = { w: 34, h: 38, cy: 41 };   // print area on the chest

const FONTS = [
  { n: 'Christmas',   f: 'Mountains of Christmas', w: 700, st: 'normal', fb: 'cursive' },
  { n: 'Elegant Script', f: 'Great Vibes', w: 400, st: 'normal', fb: 'cursive' },
  { n: 'Lobster',     f: 'Lobster', w: 400, st: 'normal', fb: 'cursive' },
  { n: 'Pacifico',    f: 'Pacifico', w: 400, st: 'normal', fb: 'cursive' },
  { n: 'Dancing',     f: 'Dancing Script', w: 700, st: 'normal', fb: 'cursive' },
  { n: 'Chewy Fun',   f: 'Chewy', w: 400, st: 'normal', fb: 'cursive' },
  { n: 'Bangers',     f: 'Bangers', w: 400, st: 'normal', fb: 'Impact, sans-serif' },
  { n: 'Marker',      f: 'Permanent Marker', w: 400, st: 'normal', fb: 'cursive' },
  { n: 'Anton Bold',  f: 'Anton', w: 400, st: 'normal', fb: 'Impact, sans-serif' },
  { n: 'Classic Serif', f: 'Playfair Display', w: 700, st: 'italic', fb: 'Georgia, serif' },
  { n: 'Baloo Rounded', f: 'Baloo 2', w: 800, st: 'normal', fb: 'Poppins, sans-serif' },
  { n: 'Poppins Bold', f: 'Poppins', w: 700, st: 'normal', fb: 'Arial, sans-serif' }
];
const fontStr = (F, s) => `${F.st} ${F.w} ${s}px "${F.f}", ${F.fb}`;

/* One colour = solid. Two or more = gradient. */
const PALETTE = [
  { n: 'White', c: ['#ffffff'] }, { n: 'Black', c: ['#1a1a1a'] }, { n: 'Silver', c: ['#b8bcc4'] },
  { n: 'Red', c: ['#d92332'] }, { n: 'Orange', c: ['#ff7a1a'] }, { n: 'Yellow', c: ['#ffd36a'] },
  { n: 'Gold', c: ['#d4a72c'] }, { n: 'Green', c: ['#2e9b5b'] }, { n: 'Teal', c: ['#1f8392'] },
  { n: 'Blue', c: ['#2f6fde'] }, { n: 'Navy', c: ['#1b2a5c'] }, { n: 'Purple', c: ['#7d4fb5'] },
  { n: 'Pink', c: ['#f58fb0'] }, { n: 'Hot Pink', c: ['#e6399b'] }, { n: 'Beige', c: ['#e8d8bf'] },
  { n: 'Brown', c: ['#6b4226'] },
  { n: 'Gold Foil', c: ['#f3d572', '#c18f22', '#f3d572'] }, { n: 'Rose Gold', c: ['#b76e79', '#f4c4b0', '#b76e79'] },
  { n: 'Sunset', c: ['#ff5f6d', '#ffc371'] }, { n: 'Fire', c: ['#f12711', '#f5af19'] },
  { n: 'Ocean', c: ['#2193b0', '#6dd5ed'] }, { n: 'Aurora', c: ['#00c6ff', '#0072ff'] },
  { n: 'Mint', c: ['#00b09b', '#96c93d'] }, { n: 'Purple Haze', c: ['#7f00ff', '#e100ff'] },
  { n: 'Blush', c: ['#ee9ca7', '#ffdde1'] }, { n: 'Candy', c: ['#ff9a9e', '#fad0c4', '#a18cd1'] },
  { n: 'Rainbow', c: ['#ff0000', '#ffd000', '#2ecc71', '#3498db', '#9b59b6'] }, { n: 'Midnight', c: ['#232526', '#5a5f66'] }
];
const palIdx = name => Math.max(0, PALETTE.findIndex(p => p.n === name));

/* =====================================================================
   2. SMALL HELPERS
   ===================================================================== */
const $ = s => document.querySelector(s);
const viewport = $('#viewport');
const { lerp, clamp } = THREE.MathUtils;
const sst = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const spow = (c, p) => Math.sign(c) * Math.pow(Math.abs(c), p);
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function shade(hex, amt) {                 // amt > 0 lighten, < 0 darken
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = n >> 8 & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
  return `rgb(${r},${g},${b})`;
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function starP(ctx, x, y, R, r, n = 5) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / n, rad = i % 2 ? r : R;
    ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
}
function heartP(ctx, x, y, s) {
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.85);
  ctx.bezierCurveTo(x - s * 1.5, y - s * 0.05, x - s * 0.95, y - s * 1.15, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.95, y - s * 1.15, x + s * 1.5, y - s * 0.05, x, y + s * 0.85);
  ctx.closePath();
}
function sparkle(ctx, x, y, r, col) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
}
function snowflake(ctx, x, y, r, col) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.lineWidth = r * 0.12; ctx.lineCap = 'round';
  for (let k = 0; k < 6; k++) {
    ctx.rotate(Math.PI / 3); ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, -r);
    ctx.moveTo(0, -r * .55); ctx.lineTo(r * .25, -r * .8);
    ctx.moveTo(0, -r * .55); ctx.lineTo(-r * .25, -r * .8); ctx.stroke();
  }
  ctx.restore();
}

/* =====================================================================
   3. THEME ARTWORK  (all drawn in code, so no image files are needed)
   Each function draws around (0,0), roughly 560 x 560 units.
   ===================================================================== */
function artXmas(ctx, C) {
  const [tree, orn, gold, trunk, snow] = C;
  [[-290, -170, 34], [270, -200, 40], [-300, 60, 28], [300, 40, 32], [-250, 240, 26], [260, 250, 30], [-120, -300, 24], [130, -310, 28]]
    .forEach(([x, y, r]) => snowflake(ctx, x, y, r, snow));
  ctx.fillStyle = trunk; rr(ctx, -38, 150, 76, 70, 8); ctx.fill();
  const tiers = [[-90, 150, 440], [-170, 30, 330], [-240, -90, 230]];   // apex y, base y, width
  tiers.forEach(([ay, by, w]) => {
    const g = ctx.createLinearGradient(0, ay, 0, by);
    g.addColorStop(0, shade(tree, .22)); g.addColorStop(1, shade(tree, -.18));
    ctx.fillStyle = g; ctx.strokeStyle = shade(tree, -.4); ctx.lineWidth = 6; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0, ay); ctx.lineTo(w / 2, by); ctx.quadraticCurveTo(0, by + 30, -w / 2, by); ctx.closePath();
    ctx.fill(); ctx.stroke();
  });
  ctx.save(); ctx.strokeStyle = gold; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.setLineDash([1, 15]);
  tiers.forEach(([ay, by, w]) => {
    const yb = by - 45, hw = (w / 2) * (yb - ay) / (by - ay);
    ctx.beginPath(); ctx.moveTo(-hw, yb); ctx.quadraticCurveTo(0, yb + 55, hw, yb); ctx.stroke();
  });
  ctx.restore();
  const oc = [orn, gold, '#ffffff'];
  [[-25, -118, 15], [38, -150, 12], [-70, -20, 17], [20, -60, 16], [85, -5, 16], [-120, 95, 18], [-35, 60, 17], [70, 100, 18], [150, 128, 16], [-170, 135, 14], [10, 135, 15]]
    .forEach(([x, y, r], i) => {
      const c = oc[i % 3], g = ctx.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r);
      g.addColorStop(0, shade(c, .5)); g.addColorStop(1, shade(c, -.15));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    });
  const glow = ctx.createRadialGradient(0, -262, 5, 0, -262, 90);
  glow.addColorStop(0, 'rgba(255,230,150,.55)'); glow.addColorStop(1, 'rgba(255,230,150,0)');
  ctx.fillStyle = glow; ctx.fillRect(-100, -360, 200, 200);
  ctx.fillStyle = gold; ctx.strokeStyle = shade(gold, -.4); ctx.lineWidth = 5; ctx.lineJoin = 'round';
  starP(ctx, 0, -262, 52, 23); ctx.fill(); ctx.stroke();
}

function artValentine(ctx, C) {
  const [main, light, acc, dark] = C;
  ctx.save(); ctx.strokeStyle = acc; ctx.lineWidth = 14; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-290, 180); ctx.lineTo(285, -170); ctx.stroke(); ctx.restore();
  [[-250, -190, 46, light, -.3], [265, -150, 36, main, .35], [-285, 110, 34, main, -.2], [250, 190, 48, light, .25], [10, -300, 28, main, 0], [-130, 260, 26, light, .2]]
    .forEach(([x, y, s, c, r]) => { ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.fillStyle = c; heartP(ctx, 0, 0, s); ctx.fill(); ctx.restore(); });
  const g = ctx.createLinearGradient(-200, -200, 200, 220);
  g.addColorStop(0, shade(main, .28)); g.addColorStop(1, shade(main, -.22));
  ctx.fillStyle = g; ctx.strokeStyle = dark; ctx.lineWidth = 10; ctx.lineJoin = 'round';
  heartP(ctx, 0, 0, 215); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.38)'; ctx.beginPath(); ctx.ellipse(-100, -105, 48, 24, -.7, 0, 7); ctx.fill();
  const ang = Math.atan2(-350, 575);
  ctx.fillStyle = acc;
  ctx.save(); ctx.translate(285, -170); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(36, 0); ctx.lineTo(-18, -28); ctx.lineTo(-4, 0); ctx.lineTo(-18, 28); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(-290, 180); ctx.rotate(ang);
  for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(34, 0); ctx.lineTo(-6, k * 30); ctx.lineTo(-36, k * 30); ctx.lineTo(-2, 0); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  [[150, -270, 20], [-190, 20, 16], [300, 40, 18], [-60, 300, 15], [-310, -40, 14]].forEach(([x, y, r]) => sparkle(ctx, x, y, r, acc));
}

function artTeacher(ctx, C) {
  const [apple, leaf, pencil, book] = C, b2 = shade(book, -.28);
  ctx.fillStyle = book; rr(ctx, -230, 185, 460, 64, 10); ctx.fill();
  ctx.fillStyle = '#fffaf0'; rr(ctx, -215, 205, 420, 30, 6); ctx.fill();
  ctx.fillStyle = b2; rr(ctx, -190, 128, 380, 57, 10); ctx.fill();
  ctx.fillStyle = '#fffaf0'; rr(ctx, -175, 146, 350, 24, 6); ctx.fill();
  ctx.save(); ctx.translate(120, -30); ctx.rotate(-.85);
  ctx.fillStyle = '#f08aa6'; rr(ctx, -245, -26, 46, 52, 10); ctx.fill();
  const mg = ctx.createLinearGradient(0, -26, 0, 26); mg.addColorStop(0, '#f5f5f7'); mg.addColorStop(.5, '#9ea3ab'); mg.addColorStop(1, '#e6e8ec');
  ctx.fillStyle = mg; ctx.fillRect(-200, -26, 36, 52);
  ctx.fillStyle = pencil; ctx.fillRect(-165, -26, 295, 52);
  ctx.fillStyle = shade(pencil, -.18); ctx.fillRect(-165, 2, 295, 24);
  ctx.fillStyle = '#f1cf9e'; ctx.beginPath(); ctx.moveTo(130, -26); ctx.lineTo(215, 0); ctx.lineTo(130, 26); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#333'; ctx.beginPath(); ctx.moveTo(188, -9); ctx.lineTo(215, 0); ctx.lineTo(188, 9); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.translate(0, -45);
  const g = ctx.createRadialGradient(-60, -50, 20, 0, 0, 200);
  g.addColorStop(0, shade(apple, .3)); g.addColorStop(1, shade(apple, -.2));
  ctx.fillStyle = g; ctx.strokeStyle = shade(apple, -.45); ctx.lineWidth = 8; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(0, -80);
  ctx.bezierCurveTo(-40, -130, -170, -120, -170, 10); ctx.bezierCurveTo(-170, 110, -90, 170, -40, 160);
  ctx.quadraticCurveTo(0, 140, 40, 160); ctx.bezierCurveTo(90, 170, 170, 110, 170, 10);
  ctx.bezierCurveTo(170, -120, 40, -130, 0, -80); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(-95, -35, 22, 48, .5, 0, 7); ctx.fill();
  ctx.strokeStyle = '#6b4226'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -78); ctx.quadraticCurveTo(6, -110, 14, -138); ctx.stroke();
  ctx.fillStyle = leaf; ctx.strokeStyle = shade(leaf, -.4); ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(14, -118); ctx.bezierCurveTo(40, -172, 100, -178, 128, -150); ctx.bezierCurveTo(100, -108, 50, -94, 14, -118); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = pencil; ctx.strokeStyle = shade(pencil, -.4); ctx.lineWidth = 4; ctx.lineJoin = 'round';
  [[-250, -130, 32], [-285, -10, 22], [265, 150, 26]].forEach(([x, y, r]) => { starP(ctx, x, y, r, r * .45); ctx.fill(); ctx.stroke(); });
}

function artSchool(ctx, C) {
  const [pack, flap, pocket, acc] = C;
  const block = (x, y, s, rot, col, ch) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = col; ctx.strokeStyle = shade(col, -.35); ctx.lineWidth = 6; rr(ctx, -s / 2, -s / 2, s, s, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.font = `800 ${s * .62}px "Baloo 2", Poppins, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ch, 0, 3); ctx.restore();
  };
  block(-262, -170, 76, -.22, acc, 'A'); block(262, -160, 76, .22, flap, 'B');
  block(-268, 205, 70, .2, flap, '1'); block(268, 200, 70, -.2, acc, '+');
  ctx.strokeStyle = shade(pack, -.4); ctx.lineWidth = 22; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-62, -128); ctx.quadraticCurveTo(0, -235, 62, -128); ctx.stroke();
  ctx.fillStyle = shade(pack, -.25); rr(ctx, -222, 40, 76, 150, 26); ctx.fill(); rr(ctx, 146, 40, 76, 150, 26); ctx.fill();
  const g = ctx.createLinearGradient(-170, 0, 170, 0);
  g.addColorStop(0, shade(pack, -.1)); g.addColorStop(.5, shade(pack, .12)); g.addColorStop(1, shade(pack, -.18));
  ctx.fillStyle = g; ctx.strokeStyle = shade(pack, -.45); ctx.lineWidth = 7; rr(ctx, -170, -130, 340, 340, 80); ctx.fill(); ctx.stroke();
  ctx.fillStyle = flap; rr(ctx, -170, -130, 340, 150, 70); ctx.fill(); ctx.stroke();
  ctx.fillStyle = acc; ctx.strokeStyle = shade(acc, -.4); ctx.lineWidth = 5; rr(ctx, -26, -8, 52, 44, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = pocket; ctx.strokeStyle = shade(pocket, -.4); ctx.lineWidth = 6; rr(ctx, -120, 62, 240, 128, 30); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.strokeStyle = acc; ctx.lineWidth = 6; ctx.setLineDash([12, 9]); ctx.beginPath(); ctx.moveTo(-85, 95); ctx.lineTo(85, 95); ctx.stroke(); ctx.restore();
  ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(85, 95, 11, 0, 7); ctx.fill();
  ctx.fillStyle = acc; ctx.strokeStyle = shade(acc, -.4); ctx.lineWidth = 4;
  [[-110, -275, 28], [120, -285, 24], [290, 40, 22], [-292, 50, 24]].forEach(([x, y, r]) => { starP(ctx, x, y, r, r * .45); ctx.fill(); ctx.stroke(); });
}

function artBirthday(ctx, C, rnd) {
  const [c1, c2, c3, gold] = C, cols = [c1, c2, c3, gold];
  for (let i = 0; i < 46; i++) {
    ctx.save(); ctx.translate((rnd() - .5) * 640, (rnd() - .5) * 560); ctx.rotate(rnd() * 6.28); ctx.fillStyle = cols[i % 4];
    if (i % 3 === 0) { ctx.beginPath(); ctx.arc(0, 0, 7 + rnd() * 5, 0, 7); ctx.fill(); } else ctx.fillRect(-4, -11, 9, 22 * (.5 + rnd() * .5));
    ctx.restore();
  }
  const balloon = (x, y, rx, ry, col) => {
    ctx.strokeStyle = 'rgba(70,70,80,.6)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y + ry + 10);
    ctx.bezierCurveTo(x + 25, y + ry + 70, x - 25, y + ry + 130, x + (x < 0 ? 40 : -40), y + ry + 210); ctx.stroke();
    const g = ctx.createRadialGradient(x - rx * .35, y - ry * .4, rx * .1, x, y, ry * 1.1);
    g.addColorStop(0, shade(col, .4)); g.addColorStop(1, shade(col, -.12));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill();
    ctx.fillStyle = shade(col, -.2); ctx.beginPath(); ctx.moveTo(x, y + ry - 2); ctx.lineTo(x - 9, y + ry + 14); ctx.lineTo(x + 9, y + ry + 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(x - rx * .4, y - ry * .4, rx * .14, ry * .26, .5, 0, 7); ctx.fill();
  };
  balloon(-235, -110, 55, 66, c2); balloon(240, -125, 55, 66, gold); balloon(-150, -250, 50, 60, c3); balloon(150, -258, 50, 60, c1);
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(0, 214, 262, 24, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#e6e9ec'; ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 208, 260, 22, 0, 0, 7); ctx.fill(); ctx.stroke();
  const layer = (x, y, w, h, col) => {
    ctx.fillStyle = col; ctx.strokeStyle = shade(col, -.35); ctx.lineWidth = 5; rr(ctx, x, y, w, h, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fffaf3'; rr(ctx, x - 6, y - 6, w + 12, 30, 14); ctx.fill();
    const n = Math.floor(w / 44), step = w / n;
    for (let k = 0; k < n; k++) { const cx = x + step * (k + .5), len = 14 + rnd() * 26; rr(ctx, cx - 11, y + 8, 22, len, 11); ctx.fill(); }
  };
  layer(-215, 95, 430, 110, c1); layer(-165, -5, 330, 100, c2); layer(-110, -95, 220, 90, c3);
  [-55, 0, 55].forEach((x, i) => {
    ctx.fillStyle = '#ffffff'; rr(ctx, x - 9, -175, 18, 85, 5); ctx.fill();
    ctx.fillStyle = cols[(i + 1) % 4]; for (let s = 0; s < 4; s++) ctx.fillRect(x - 9, -170 + s * 20, 18, 9);
    ctx.fillStyle = gold; ctx.beginPath(); ctx.moveTo(x, -232); ctx.bezierCurveTo(x + 16, -210, x + 14, -185, x, -180); ctx.bezierCurveTo(x - 14, -185, x - 16, -210, x, -232); ctx.fill();
    ctx.fillStyle = '#ff9d3c'; ctx.beginPath(); ctx.moveTo(x, -212); ctx.bezierCurveTo(x + 7, -200, x + 6, -190, x, -187); ctx.bezierCurveTo(x - 6, -190, x - 7, -200, x, -212); ctx.fill();
  });
}

const THEMES = {
  xmas: {
    name: 'Christmas', emoji: '🎄', l1: 'Merry Christmas', l2: 'Season’s Greetings', font: 'Christmas', color: 'Gold Foil', seed: 11, art: artXmas,
    schemes: [
      { n: 'Classic', c: ['#1f7a3d', '#d92332', '#f4c542', '#6b4226', '#cfe8ff'] },
      { n: 'Candy Cane', c: ['#2e9b5b', '#ffffff', '#d92332', '#7a4a2a', '#ffd1d6'] },
      { n: 'Winter Blue', c: ['#2f6fa8', '#c8e6ff', '#ffe08a', '#5b4636', '#ffffff'] },
      { n: 'Green & Gold', c: ['#14532d', '#f4c542', '#fff1b8', '#4a3320', '#f4e6b0'] }
    ]
  },
  valentine: {
    name: 'Valentine’s', emoji: '💘', l1: 'Be My Valentine', l2: 'Happy Hearts Day', font: 'Elegant Script', color: 'White', seed: 22, art: artValentine,
    schemes: [
      { n: 'Classic Red', c: ['#e0243b', '#ff8fa3', '#ffd166', '#7a0f20'] },
      { n: 'Pink', c: ['#ff5c9a', '#ffc2dc', '#ffffff', '#a3205a'] },
      { n: 'Purple', c: ['#8e3cc9', '#d9a8ff', '#ffd166', '#4a1a73'] },
      { n: 'Black & Gold', c: ['#1c1c1f', '#5a5a60', '#e0b84a', '#000000'] }
    ]
  },
  teacher: {
    name: 'Teachers’ Day', emoji: '🍎', l1: 'World’s Best Teacher', l2: 'Happy Teachers’ Day', font: 'Chewy Fun', color: 'Yellow', seed: 33, art: artTeacher,
    schemes: [
      { n: 'Red Apple', c: ['#e0343a', '#3da35d', '#f7c948', '#2f6fde'] },
      { n: 'Green Apple', c: ['#7bc043', '#2e7d32', '#f7c948', '#d9534f'] },
      { n: 'Orange', c: ['#ff7a1a', '#2e9b5b', '#ffd36a', '#7d4fb5'] },
      { n: 'Navy Books', c: ['#e0343a', '#3da35d', '#f7c948', '#1b2a5c'] }
    ]
  },
  school: {
    name: 'Back to School', emoji: '🎒', l1: 'Back to School', l2: 'Ready, Set, Learn!', font: 'Bangers', color: 'White', seed: 44, art: artSchool,
    schemes: [
      { n: 'Blue', c: ['#2f6fde', '#4f8df0', '#1f4fa8', '#ffc72c'] },
      { n: 'Red', c: ['#d92332', '#ef5a64', '#a3151f', '#ffd36a'] },
      { n: 'Green', c: ['#2e9b5b', '#58c486', '#1f6f40', '#ffd36a'] },
      { n: 'Purple', c: ['#7d4fb5', '#a67fd6', '#5a3590', '#ffd36a'] }
    ]
  },
  birthday: {
    name: 'Birthday', emoji: '🎂', l1: 'Happy Birthday!', l2: 'Make a Wish', font: 'Pacifico', color: 'Sunset', seed: 55, art: artBirthday,
    schemes: [
      { n: 'Rainbow', c: ['#ff5c8a', '#4db8ff', '#ffc93c', '#ffd24d'] },
      { n: 'Pastel', c: ['#ffb3c7', '#b8e0ff', '#fff1a8', '#ffd24d'] },
      { n: 'Blue', c: ['#2f6fde', '#6dd5ed', '#ffd36a', '#ffd24d'] },
      { n: 'Pink', c: ['#ff5c9a', '#ffc2dc', '#a56bff', '#ffd24d'] }
    ]
  }
};

/* =====================================================================
   4. STATE
   ===================================================================== */
const state = {
  theme: 'xmas', scheme: 0, art: true,
  l1: '', l2: '', font: 0, fill: 0, outline: 'dark', caps: false,
  scale: 0.9, tsize: 1, tx: 0, ty: 0,
  shirt: 0, size: 'M',
  edited: { text: false, font: false, color: false }
};

/* =====================================================================
   5. RENDERER, SCENE, LIGHTS  (dark studio, floating shirt)
   ===================================================================== */
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 80);

/* soft studio set-up: big front key from above, cool side fill, back rim, so folds read clearly */
const key = new THREE.DirectionalLight(0xfff4e6, 2.3); key.position.set(3, 10, 10); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0008; key.shadow.normalBias = 0.05; key.shadow.radius = 6;
Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -3, near: 1, far: 30 }); scene.add(key);
const fill = new THREE.DirectionalLight(0xcfd8ff, 0.7); fill.position.set(-9, 3, 6); scene.add(fill);
const rim = new THREE.DirectionalLight(0xffffff, 0.9); rim.position.set(0, 6, -9); scene.add(rim);
scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a2a, 0.45));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
controls.minDistance = 5; controls.maxDistance = 34;
controls.minPolarAngle = 0.35; controls.maxPolarAngle = Math.PI * 0.68;
controls.autoRotateSpeed = 2;

/* =====================================================================
   6. FABRIC TEXTURES  (soft heathered cotton jersey + ribbed collar)
   ===================================================================== */
function mottleTexture() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * S, y = Math.random() * S, r = 20 + Math.random() * 60, dark = Math.random() < .5;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, dark ? 'rgba(0,0,0,.055)' : 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 9000; i++) {                              // fibres
    const x = Math.random() * S, y = Math.random() * S, a = Math.random() * 6.28, l = 2 + Math.random() * 4;
    g.strokeStyle = Math.random() < .5 ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.09)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8; return t;
}
function knitTexture() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 64; i++) {
    const x = i * 4, gr = g.createLinearGradient(x, 0, x + 4, 0);
    gr.addColorStop(0, '#6a6a6a'); gr.addColorStop(.5, '#c8c8c8'); gr.addColorStop(1, '#6a6a6a');
    g.fillStyle = gr; g.fillRect(x, 0, 4, S);
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < S; y += 6) g.fillRect(x + 1, y + (i % 2) * 3, 2, 2);
  }
  const img = g.getImageData(0, 0, S, S);
  for (let i = 0; i < S * S; i++) { const n = (Math.random() - .5) * 36; for (let k = 0; k < 3; k++) img.data[i * 4 + k] = Math.max(0, Math.min(255, img.data[i * 4 + k] + n)); }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; return t;
}
/* 1x1 rib pattern: strong vertical ribs for the collar (bump) and a soft shading map */
function ribTextures() {
  const S = 128, mk = bump => {
    const c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), n = 8, w = S / n;
    for (let i = 0; i < n; i++) {
      const gr = g.createLinearGradient(i * w, 0, (i + 1) * w, 0);
      if (bump) { gr.addColorStop(0, '#2a2a2a'); gr.addColorStop(.5, '#f2f2f2'); gr.addColorStop(1, '#2a2a2a'); }
      else { gr.addColorStop(0, '#d2d2d2'); gr.addColorStop(.5, '#ffffff'); gr.addColorStop(1, '#d2d2d2'); }
      g.fillStyle = gr; g.fillRect(i * w, 0, w, S);
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16;
    if (!bump) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { bump: mk(true), map: mk(false) };
}

const mottle = mottleTexture(); mottle.repeat.set(0.5, 0.5);
const knit = knitTexture(); knit.repeat.set(0.12, 0.12);                  // very fine, only a hint of weave
const hemKnit = knitTexture(); hemKnit.repeat.set(6, 1);
const rib = ribTextures();

/* body + sleeves (vertex colours add soft baked shadows in the folds and under the arms) */
const fabric = new THREE.MeshPhysicalMaterial({
  color: SHIRTS[0][1], map: mottle, bumpMap: knit, bumpScale: 0.25, roughness: 0.95, metalness: 0, vertexColors: true,
  sheen: 1, sheenRoughness: 0.7, sheenColor: new THREE.Color(0xffffff), envMapIntensity: 0.5, side: THREE.DoubleSide
});
/* hems and cuffs */
const trim = new THREE.MeshPhysicalMaterial({
  color: SHIRTS[0][1], bumpMap: hemKnit, bumpScale: 0.5, roughness: 0.97, metalness: 0,
  sheen: 1, sheenRoughness: 0.75, sheenColor: new THREE.Color(0xffffff), envMapIntensity: 0.45
});
/* ribbed crew-neck band */
const collarMat = new THREE.MeshPhysicalMaterial({
  color: SHIRTS[0][1], map: rib.map, bumpMap: rib.bump, bumpScale: 1.1, roughness: 0.98, metalness: 0,
  sheen: 1, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xffffff), envMapIntensity: 0.45, side: THREE.DoubleSide
});
/* stitching lines */
const stitchMat = new THREE.MeshStandardMaterial({ color: SHIRTS[0][1], roughness: 1 });

/* =====================================================================
   7. SHIRT GEOMETRY  (boxy oversized fit, dropped shoulders, wide drooping short sleeves,
      thin ribbed crew neck, soft drape folds radiating from the armpits)
   ===================================================================== */
const halfW = y => D.A * (1 + 0.012 * Math.sin(Math.PI * clamp(y / D.HB, 0, 1)));
const halfD = y => D.B * (0.9 + 0.12 * Math.sin(Math.PI * clamp(y / D.HB, 0, 1)));
const wr = (x, y) => 1 + 0.018 * Math.sin(x * 0.45 + y * 0.1) * (0.5 + 0.5 * sst(y / D.HB)) + 0.01 * Math.sin(x * 1.2 - y * 0.22 + 2);   // soft fabric folds
const VS = 0.84;

/* normal displacement (cm) that makes the cloth drape: radial wrinkles from the armpit,
   soft waves at the hem and a few big slow undulations. sg = +1 front, -1 back. */
function fold(x, y, sg) {
  const ax = Math.abs(x), sx = x < 0 ? -1 : 1;
  const dx = ax - 25.5, dy = y - 46.5, d = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  let f = 0.62 * Math.exp(-d / 12) * Math.sin(7 * ang + sx * 0.7 + sg * 1.9 + 0.9 * Math.sin(d * 0.35));
  const hm = 1 - sst(y / 24);
  f += 0.34 * hm * Math.sin(x * 0.45 + sg * 1.7 + 0.8 * Math.sin(x * 0.13 + sg));
  f += 0.24 * Math.sin(x * 0.16 + y * 0.09 + sg * 2.3) * Math.sin(y * 0.05 + 0.6);
  f += 0.14 * Math.sin(x * 0.9 + y * 0.35 + sg) * hm;
  return f;
}

function bodyPt(th, v) {
  const c = Math.cos(th), s = Math.sin(th);
  const yb = v <= VS ? D.HB * v / VS : D.HB, e = v <= VS ? 0 : sst((v - VS) / (1 - VS));
  const a = halfW(yb), b = halfD(yb), q = 2 / D.N;
  let x = a * spow(c, q), z = b * spow(s, q);
  z *= lerp(wr(x, yb), 1, e);
  const sg = clamp(z / 3, -1, 1), fv = fold(x, yb, sg) * (1 - e);   // drape, fades out toward the neck
  const nx = x / (a * a), nz = z / (b * b), nl = Math.hypot(nx, nz) || 1;
  x += nx / nl * fv; z += nz / nl * fv;
  x = lerp(x, D.NA * c, e); z = lerp(z, D.NB * s, e);
  let y = yb;
  if (e > 0) y += e * (D.RISE * Math.pow(Math.abs(c), 1.2) + D.BACK * Math.max(0, -s)) - e * e * D.FRONT * Math.pow(Math.max(0, s), 2);
  return V3(x, y, z);
}
function sleevePt(sg, ph, t) {
  const { L, ang, ry0, ry1, rz0, rz1, sy, sx } = SL;
  const dir = V3(sg * Math.cos(ang), -Math.sin(ang), 0), up = V3(sg * Math.sin(ang), Math.cos(ang), 0);
  const m = 1 + 0.05 * Math.sin(ph * 3 + t * 4.2 + sg) * (0.3 + t) + 0.025 * Math.sin(ph * 5 - t * 3);
  const ry = lerp(ry0, ry1, t) * m, rz = lerp(rz0, rz1, t) * m;
  const p = V3(sg * sx, sy, 0).addScaledVector(dir, L * t);
  p.y -= 1.8 * t * t;                                                  // sleeve droops under its own weight
  return p.addScaledVector(up, ry * Math.cos(ph)).add(V3(0, 0, rz * Math.sin(ph)));
}

/* baked soft shadow: 1 = fully lit */
function bodyShade(p) {
  const f = fold(p.x, p.y, clamp(p.z / 3, -1, 1)), ax = Math.abs(p.x);
  let s = 1 + 0.8 * f;
  s *= 1 - 0.24 * Math.exp(-Math.hypot(ax - 26, p.y - 45) / 7);        // dark under the arm
  s *= 1 - 0.08 * Math.exp(-p.y / 5);                                  // slightly darker toward the hem
  return clamp(s, 0.6, 1);
}
function sleeveShade(sg, ph, t) {
  const under = sst(-Math.cos(ph) * 1.2);
  let s = 1 - 0.14 * under - 0.18 * under * Math.pow(1 - t, 1.5);
  s *= 1 + 0.9 * 0.05 * Math.sin(ph * 3 + t * 4.2 + sg) * (0.3 + t);
  s *= 1 - 0.2 * Math.pow(1 - t, 3);                                   // where the sleeve meets the body
  return clamp(s, 0.6, 1);
}

function surfaceGeo(nu, nv, pt, uMul, vOf, shadeFn) {
  const pos = [], uv = [], col = [], idx = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const p = pt(i / nu, j / nv); pos.push(p.x, p.y, p.z); uv.push(i / nu * uMul, vOf(j / nv));
    const s = shadeFn ? shadeFn(p, i / nu, j / nv) : 1; col.push(s, s, s);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const n = g.attributes.normal;                         // weld the seam so there is no shading line
  for (let j = 0; j <= nv; j++) {
    const a = j * (nu + 1), b = a + nu, x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b), l = Math.hypot(x, y, z) || 1;
    n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l);
  }
  return g;
}
function loopTube(pts, r, seg, mat) {
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'centripetal'), seg, r, 10, true), mat);
}

/* thin ribbed collar: a flattened band that follows the neckline and lies on the shirt */
function buildCollar() {
  const NS = 240, NP = 20, P = [], C = V3();
  for (let i = 0; i < NS; i++) { const p = bodyPt(i / NS * Math.PI * 2, 1); P.push(p); C.add(p); }
  C.multiplyScalar(1 / NS);
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= NS; i++) {
    const k = i % NS, p = P[k], T = P[(k + 1) % NS].clone().sub(P[(k + NS - 1) % NS]).normalize();
    const sd = V3(p.x - C.x, 0, p.z - C.z).normalize(), front = Math.max(0, p.z / D.NB);
    const dir = V3(sd.x * (1 - 0.8 * front), -(0.35 + 0.65 * front), sd.z * (1 - 0.8 * front)).normalize();   // direction the band lies away from the neck hole
    const nrm = new THREE.Vector3().crossVectors(T, dir).normalize();
    if (nrm.dot(sd.clone().add(V3(0, 1, 0))) < 0) nrm.negate();
    for (let j = 0; j <= NP; j++) {
      const a = j / NP * Math.PI * 2;
      const q = p.clone().addScaledVector(dir, 0.3 + 1.1 * Math.cos(a)).addScaledVector(nrm, 0.15 + 0.42 * Math.sin(a));
      pos.push(q.x, q.y, q.z); uv.push(i / NS * 46, j / NP);
    }
  }
  for (let i = 0; i < NS; i++) for (let j = 0; j < NP; j++) {
    const a = i * (NP + 1) + j, b = a + 1, c = a + NP + 1, d = c + 1; idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, collarMat);
}

let layer = null;          // the print canvas on the chest
let shirt = null;

function buildShirt() {
  const g = new THREE.Group();

  // body (front, back, shoulders, open neck, open hem)
  g.add(new THREE.Mesh(
    surfaceGeo(160, 90, (u, v) => bodyPt(u * Math.PI * 2, v), 24,
      v => (v <= VS ? D.HB * v / VS : D.HB) / 8 + (v > VS ? (v - VS) / (1 - VS) * 3 : 0), p => bodyShade(p)),
    fabric));

  // sleeves: flat folded hem with a double-needle stitch line
  for (const sg of [1, -1]) {
    g.add(new THREE.Mesh(
      surfaceGeo(72, 36, (u, t) => sleevePt(sg, u * Math.PI * 2, t), 10, t => t * SL.L / 8, (p, u, t) => sleeveShade(sg, u * Math.PI * 2, t)),
      fabric));
    const cuff = [], st = [];
    for (let i = 0; i < 72; i++) { const ph = i / 72 * Math.PI * 2; cuff.push(sleevePt(sg, ph, 1)); st.push(sleevePt(sg, ph, 1 - 1.9 / SL.L)); }
    g.add(loopTube(cuff, 0.3, 160, trim));
    g.add(loopTube(st, 0.075, 160, stitchMat));
  }

  // thin ribbed collar + stitched hem
  g.add(buildCollar());
  const hem = [], hemSt = [];
  for (let i = 0; i < 120; i++) { const th = i / 120 * Math.PI * 2; hem.push(bodyPt(th, 0)); hemSt.push(bodyPt(th, 0.03)); }
  g.add(loopTube(hem, 0.3, 300, trim));
  g.add(loopTube(hemSt, 0.075, 300, stitchMat));

  // printed artwork, curved to follow the chest (and the drape folds)
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W; canvas.height = Math.round(TEX_W * PR.h / PR.w);
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const pbump = knit.clone(); pbump.needsUpdate = true; pbump.repeat.set(PR.w / 28, PR.h / 28);
  const printMat = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, roughness: 0.88, metalness: 0, bumpMap: pbump, bumpScale: 0.3, envMapIntensity: 0.5,
    polygonOffset: true, polygonOffsetFactor: -2
  });
  const pg = new THREE.PlaneGeometry(PR.w, PR.h, 60, 60), pp = pg.attributes.position;
  for (let i = 0; i < pp.count; i++) {
    const x = pp.getX(i), y = PR.cy + pp.getY(i);
    const z = halfD(y) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x) / halfW(y), D.N)), 1 / D.N) * wr(x, y) + fold(x, y, 1) + 0.28;
    pp.setXYZ(i, x, y, z);
  }
  pg.computeVertexNormals();
  const plane = new THREE.Mesh(pg, printMat); g.add(plane);
  layer = { canvas, ctx: canvas.getContext('2d'), tex };

  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = o !== plane; } });
  return g;
}

shirt = buildShirt();
scene.add(shirt);

function applySize() {
  const S = SIZES.find(s => s.k === state.size);
  shirt.scale.setScalar(CM * S.s);
}

function setShirtColor() {
  const hex = SHIRTS[state.shirt][1];
  fabric.color.set(hex); trim.color.set(hex); collarMat.color.set(hex); stitchMat.color.set(hex);
  const dark = new THREE.Color(hex).getHSL({ h: 0, s: 0, l: 0 }).l < 0.25;
  fabric.sheenColor.set(dark ? 0x6d7480 : 0xffffff); trim.sheenColor.copy(fabric.sheenColor); collarMat.sheenColor.copy(fabric.sheenColor);
}

/* =====================================================================
   8. PAINT THE DESIGN
   ===================================================================== */
const fillFor = (ctx, w, h) => {
  const c = PALETTE[state.fill].c;
  if (c.length === 1) return c[0];
  const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  c.forEach((col, i) => g.addColorStop(i / (c.length - 1), col)); return g;
};

function drawLine(ctx, text, y, size, maxW) {
  if (!text) return;
  const F = FONTS[state.font];
  ctx.font = fontStr(F, size);
  let w = ctx.measureText(text).width;
  if (w > maxW) { size *= maxW / w; ctx.font = fontStr(F, size); w = maxW; }
  ctx.save(); ctx.translate(0, y); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (state.outline !== 'none') {
    ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.07;
    ctx.strokeStyle = state.outline === 'dark' ? 'rgba(20,20,26,.9)' : 'rgba(255,255,255,.95)';
    ctx.strokeText(text, 0, 0);
  }
  ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = size * 0.04; ctx.shadowOffsetY = size * 0.02;
  ctx.fillStyle = fillFor(ctx, w, size); ctx.fillText(text, 0, 0);
  ctx.restore();
}

const isReady = () => state.art || !!(state.l1.trim() || state.l2.trim());

function paint() {
  const { canvas, ctx, tex } = layer, CW = canvas.width, CH = canvas.height, U = CW / 1000, compH = CH / U;
  const T = THEMES[state.theme], C = T.schemes[state.scheme].c;
  ctx.clearRect(0, 0, CW, CH);
  ctx.save();
  ctx.translate(CW / 2 + state.tx * CW * 0.25, CH / 2 - state.ty * CH * 0.25);
  ctx.scale(U * state.scale, U * state.scale);

  if (state.art) {
    ctx.save(); ctx.translate(0, -compH * 0.13); ctx.scale(1.2, 1.2);
    T.art(ctx, C, rng(T.seed)); ctx.restore();
  }
  const f = k => state.caps ? k.toUpperCase() : k;
  const ts = state.tsize;
  if (state.art) {
    drawLine(ctx, f(state.l1.trim()), compH * 0.30, 150 * ts, 940);
    drawLine(ctx, f(state.l2.trim()), compH * 0.43, 72 * ts, 940);
  } else {
    drawLine(ctx, f(state.l1.trim()), -40, 210 * ts, 940);
    drawLine(ctx, f(state.l2.trim()), 130, 92 * ts, 940);
  }
  ctx.restore();
  tex.needsUpdate = true;

  const ready = isReady();
  $('#add').disabled = !ready;
  $('#addHint').textContent = ready ? 'Looks good? Add it to your order.' : 'Turn on the graphic or type some text to continue.';
}

/* =====================================================================
   9. INTERFACE
   ===================================================================== */
const tile = c => c.length === 1 ? c[0] : `linear-gradient(135deg,${c.join(',')})`;
const price = () => PRICE + (SIZE_EXTRA[state.size] || 0);

function renderThemes() {
  $('#themes').innerHTML = Object.entries(THEMES).map(([k, T]) =>
    `<button type="button" class="thm ${k === state.theme ? 'on' : ''}" data-k="${k}"><span>${T.emoji}</span><b>${T.name}</b></button>`).join('');
}
function renderSchemes() {
  const T = THEMES[state.theme];
  $('#schemes').innerHTML = T.schemes.map((s, i) =>
    `<button type="button" class="sw ${i === state.scheme ? 'on' : ''}" data-i="${i}" style="--c:${tile(s.c.slice(0, 3))}" title="${s.n}" aria-label="${s.n}"></button>`).join('');
  $('#schemeName').textContent = T.schemes[state.scheme].n;
}
function renderFills() {
  $('#tcolors').innerHTML = PALETTE.map((p, i) =>
    `<button type="button" class="sw ${i === state.fill ? 'on' : ''}" data-i="${i}" style="--c:${tile(p.c)}" title="${p.n}" aria-label="${p.n}"></button>`).join('');
  $('#fillName').textContent = PALETTE[state.fill].n;
}
function renderShirts() {
  $('#scolors').innerHTML = SHIRTS.map(([n, hex], i) =>
    `<button type="button" class="sw ${i === state.shirt ? 'on' : ''}" data-i="${i}" style="--c:${hex}" title="${n}" aria-label="${n}"></button>`).join('');
  $('#shirtName').textContent = SHIRTS[state.shirt][0];
}
function renderSizes() {
  $('#sizes').innerHTML = SIZES.map(s => `<button type="button" class="szb ${s.k === state.size ? 'on' : ''}" data-k="${s.k}">${s.k}</button>`).join('');
  const S = SIZES.find(s => s.k === state.size);
  $('#sizeInfo').textContent = `Size ${S.k} · chest ${S.chest} cm · length ${S.len} cm (oversized fit)`;
  $('#price').textContent = '₱' + price();
}
$('#chart').innerHTML = SIZES.map(s => `<tr><td><b>${s.k}</b></td><td>${s.chest}</td><td>${s.len}</td></tr>`).join('');
$('#font').innerHTML = FONTS.map((f, i) => `<option value="${i}">${f.n}</option>`).join('');

function applyTheme(k) {
  state.theme = k; state.scheme = 0;
  const T = THEMES[k];
  if (!state.edited.text) { state.l1 = T.l1; state.l2 = T.l2; $('#t1').value = state.l1; $('#t2').value = state.l2; }
  if (!state.edited.font) { state.font = Math.max(0, FONTS.findIndex(f => f.n === T.font)); $('#font').value = state.font; }
  if (!state.edited.color) state.fill = palIdx(T.color);
  renderThemes(); renderSchemes(); renderFills(); paint();
}

$('#themes').onclick = e => { const b = e.target.closest('.thm'); if (b) applyTheme(b.dataset.k); };
$('#schemes').onclick = e => { const b = e.target.closest('.sw'); if (!b) return; state.scheme = +b.dataset.i; renderSchemes(); paint(); };
$('#tcolors').onclick = e => { const b = e.target.closest('.sw'); if (!b) return; state.fill = +b.dataset.i; state.edited.color = true; renderFills(); paint(); };
$('#scolors').onclick = e => { const b = e.target.closest('.sw'); if (!b) return; state.shirt = +b.dataset.i; setShirtColor(); renderShirts(); };
$('#sizes').onclick = e => { const b = e.target.closest('.szb'); if (!b) return; state.size = b.dataset.k; applySize(); renderSizes(); };

$('#t1').addEventListener('input', e => { state.l1 = e.target.value; state.edited.text = true; paint(); });
$('#t2').addEventListener('input', e => { state.l2 = e.target.value; state.edited.text = true; paint(); });
$('#font').addEventListener('change', e => { state.font = +e.target.value; state.edited.font = true; paint(); });
$('#outline').addEventListener('change', e => { state.outline = e.target.value; paint(); });
$('#caps').onchange = e => { state.caps = e.target.checked; paint(); };
$('#showArt').onchange = e => { state.art = e.target.checked; paint(); };
for (const [id, k] of [['scale', 'scale'], ['tsize', 'tsize'], ['tx', 'tx'], ['ty', 'ty']]) $('#' + id).addEventListener('input', e => { state[k] = parseFloat(e.target.value); paint(); });
$('#resetDesign').onclick = () => {
  Object.assign(state, { scale: 0.9, tsize: 1, tx: 0, ty: 0, caps: false, outline: 'dark', art: true, edited: { text: false, font: false, color: false } });
  $('#scale').value = 0.9; $('#tsize').value = 1; $('#tx').value = 0; $('#ty').value = 0; $('#caps').checked = false; $('#outline').value = 'dark'; $('#showArt').checked = true;
  applyTheme(state.theme);
};

/* viewport buttons */
let camTween = null, userMoved = false;
const frontCam = new THREE.Vector3();
$('#spin').onclick = e => { controls.autoRotate = !controls.autoRotate; e.currentTarget.classList.toggle('on', controls.autoRotate); e.currentTarget.setAttribute('aria-pressed', controls.autoRotate); };
$('#reset').onclick = () => { controls.autoRotate = false; $('#spin').classList.remove('on'); camTween = frontCam.clone(); };
$('#back').onclick = () => { controls.autoRotate = false; $('#spin').classList.remove('on'); camTween = V3(frontCam.x, frontCam.y, -frontCam.z); };
controls.addEventListener('start', () => { camTween = null; userMoved = true; $('#hint').classList.add('gone'); });

/* =====================================================================
   10. ADD TO ORDER
   ===================================================================== */
function toJPEG(src, maxW, q, bg) {
  const k = Math.min(1, maxW / src.width), c = document.createElement('canvas');
  c.width = Math.round(src.width * k); c.height = Math.round(src.height * k);
  const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(src, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', q);
}
function snapshot() {
  const keep = camera.position.clone();
  camera.position.copy(frontCam); controls.update(); renderer.render(scene, camera);
  const r = renderer.domElement, side = Math.min(r.width, r.height), c = document.createElement('canvas'); c.width = c.height = 360;
  const g = c.getContext('2d'), bg = g.createRadialGradient(180, 160, 20, 180, 180, 260);
  bg.addColorStop(0, '#5f6263'); bg.addColorStop(1, '#161717'); g.fillStyle = bg; g.fillRect(0, 0, 360, 360);
  g.drawImage(r, (r.width - side) / 2, (r.height - side) / 2, side, side, 0, 0, 360, 360);
  camera.position.copy(keep); controls.update();
  return c.toDataURL('image/jpeg', 0.85);
}
$('#add').onclick = () => {
  if (!isReady()) return;
  const T = THEMES[state.theme], text = [state.l1.trim(), state.l2.trim()].filter(Boolean).join(' / ');
  const ok = Cart.add({
    key: 'tshirt-' + Date.now(), id: 'tshirt-custom', name: 'Custom T-shirt',
    detail: `${T.name} · Size ${state.size} · ${SHIRTS[state.shirt][0]} · “${text}” · ${FONTS[state.font].n}, ${PALETTE[state.fill].n}`,
    price: price(), art: 'tshirt', bg: 'bg-green',
    preview: snapshot(), design: toJPEG(layer.canvas, 1000, 0.85, SHIRTS[state.shirt][1])
  }, 1);
  if (!ok) return toast('Could not save. Browser storage is full.');
  toast('Added to your order');
  setTimeout(() => location.href = 'order.html?type=product&open=cart', 450);
};

/* =====================================================================
   11. LOOP
   ===================================================================== */
function frameCamera() {
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), h = 7.6, w = 10.8;
  const dist = Math.max(h * 1.3 / (2 * t), w * 1.12 / (2 * t * camera.aspect), 9);
  controls.target.set(0, 3.6, 0);
  frontCam.set(0, 3.9, dist); camera.position.copy(frontCam); camTween = null; controls.update();
}
function resize() {
  const w = viewport.clientWidth, h = viewport.clientHeight;
  renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  if (!userMoved) frameCamera();
}
new ResizeObserver(resize).observe(viewport); resize();

renderer.setAnimationLoop(() => {
  if (camTween) { camera.position.lerp(camTween, 0.09); if (camera.position.distanceTo(camTween) < 0.02) camTween = null; }
  controls.update(); renderer.render(scene, camera);
});

/* start */
setShirtColor(); applySize(); renderShirts(); renderSizes();
applyTheme('xmas');
$('#loading').remove();
Promise.all(FONTS.map(f => document.fonts.load(`${f.st} ${f.w} 40px "${f.f}"`))).then(paint).catch(() => {});
