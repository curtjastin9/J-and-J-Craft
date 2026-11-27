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

/* ===== 1b. DESIGNS (all drawn in code, so they take any colour and stay sharp) ===== */
const TAU = Math.PI * 2;
const dot = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
const line = (c, w, build) => { c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); build(); c.stroke(); };
function oval(c, x, y, rx, ry, a = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, a, 0, TAU); c.fill(); }
function leaf(c, x, y, len, a) {                        // pointed leaf growing from (x, y) toward angle a
  c.save(); c.translate(x, y); c.rotate(a);
  c.beginPath(); c.moveTo(0, 0);
  c.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0);
  c.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0);
  c.fill(); c.restore();
}
function heart(c, x, y, s) {
  c.beginPath(); c.moveTo(x, y + s * 0.35);
  c.bezierCurveTo(x - s * 0.9, y - s * 0.25, x - s * 0.5, y - s * 0.9, x, y - s * 0.4);
  c.bezierCurveTo(x + s * 0.5, y - s * 0.9, x + s * 0.9, y - s * 0.25, x, y + s * 0.35);
  c.fill();
}
function polygon(c, pts) {
  c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill();
}

/* Corner icons: drawn around (0,0), about 2s wide */
const ICONS = {
  hearts: (c, s) => heart(c, 0, s * 0.2, s * 1.35),
  stars: (c, s) => polygon(c, Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.42 : s;
    return [Math.cos(a) * r, Math.sin(a) * r];
  })),
  sparkles: (c, s) => {
    c.beginPath(); c.moveTo(0, -s);
    c.quadraticCurveTo(s * 0.12, -s * 0.12, s, 0); c.quadraticCurveTo(s * 0.12, s * 0.12, 0, s);
    c.quadraticCurveTo(-s * 0.12, s * 0.12, -s, 0); c.quadraticCurveTo(-s * 0.12, -s * 0.12, 0, -s);
    c.fill();
  },
  flowers: (c, s) => {
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; oval(c, Math.cos(a) * s * 0.62, Math.sin(a) * s * 0.62, s * 0.38, s * 0.28, a); }
    dot(c, 0, 0, s * 0.18);
  },
  butterflies: (c, s) => {
    for (const k of [-1, 1]) {
      oval(c, k * s * 0.52, -s * 0.28, s * 0.55, s * 0.36, k * -0.6);
      oval(c, k * s * 0.4, s * 0.36, s * 0.38, s * 0.27, k * 0.65);
      line(c, s * 0.07, () => { c.moveTo(0, -s * 0.35); c.quadraticCurveTo(k * s * 0.08, -s * 0.8, k * s * 0.32, -s * 0.92); });
    }
    oval(c, 0, s * 0.05, s * 0.09, s * 0.52);
  },
  music: (c, s) => {
    oval(c, -s * 0.5, s * 0.6, s * 0.34, s * 0.25, -0.35); oval(c, s * 0.5, s * 0.4, s * 0.34, s * 0.25, -0.35);
    line(c, s * 0.13, () => { c.moveTo(-s * 0.22, s * 0.55); c.lineTo(-s * 0.22, -s * 0.6); c.moveTo(s * 0.78, s * 0.35); c.lineTo(s * 0.78, -s * 0.8); });
    polygon(c, [[-s * 0.28, -s * 0.72], [s * 0.84, -s * 0.94], [s * 0.84, -s * 0.62], [-s * 0.28, -s * 0.4]]);
  },
  paws: (c, s) => {
    c.beginPath(); c.moveTo(0, -s * 0.05);
    c.bezierCurveTo(s * 0.45, -s * 0.05, s * 0.85, s * 0.75, s * 0.3, s * 0.78);
    c.quadraticCurveTo(0, s * 0.65, -s * 0.3, s * 0.78);
    c.bezierCurveTo(-s * 0.85, s * 0.75, -s * 0.45, -s * 0.05, 0, -s * 0.05); c.fill();
    for (const [x, y, a] of [[-0.74, -0.12, -0.5], [-0.28, -0.58, -0.15], [0.28, -0.58, 0.15], [0.74, -0.12, 0.5]]) oval(c, x * s, y * s, s * 0.19, s * 0.26, a);
  },
  leaves: (c, s) => {
    leaf(c, -s * 0.15, s * 0.25, s * 1.15, -0.75); leaf(c, -s * 0.15, s * 0.25, s * 1.0, -2.05);
    line(c, s * 0.1, () => { c.moveTo(-s * 0.15, s * 0.25); c.quadraticCurveTo(-s * 0.05, s * 0.65, s * 0.25, s * 0.9); });
  }
};

/* Above the text: (0,0) is bottom centre, u is half width. h = height in u */
const TOPPERS = {
  crown: { h: 1.25, draw: (c, u) => {
    polygon(c, [[-u * 0.85, -u * 0.25], [-u, -u * 1.0], [-u * 0.45, -u * 0.6], [0, -u * 1.15], [u * 0.45, -u * 0.6], [u, -u * 1.0], [u * 0.85, -u * 0.25]]);
    c.fillRect(-u * 0.85, -u * 0.16, u * 1.7, u * 0.16);
    for (const [x, y] of [[-1, -1.07], [0, -1.23], [1, -1.07]]) dot(c, x * u, y * u, u * 0.1);
  } },
  bow: { h: 1.1, draw: (c, u) => {
    for (const k of [-1, 1]) {
      line(c, u * 0.13, () => { c.moveTo(0, -u * 0.62); c.bezierCurveTo(k * u * 0.5, -u * 1.25, k * u * 1.2, -u * 1.05, k * u * 0.95, -u * 0.6); c.bezierCurveTo(k * u * 0.85, -u * 0.28, k * u * 0.35, -u * 0.4, 0, -u * 0.62); });
      line(c, u * 0.13, () => { c.moveTo(k * u * 0.08, -u * 0.55); c.quadraticCurveTo(k * u * 0.2, -u * 0.2, k * u * 0.55, -u * 0.07); });
    }
    oval(c, 0, -u * 0.62, u * 0.18, u * 0.2);
  } },
  gradcap: { h: 1.15, draw: (c, u) => {
    polygon(c, [[0, -u * 1.12], [u, -u * 0.75], [0, -u * 0.38], [-u, -u * 0.75]]);
    c.beginPath(); c.moveTo(-u * 0.55, -u * 0.46); c.lineTo(0, -u * 0.26); c.lineTo(u * 0.55, -u * 0.46); c.lineTo(u * 0.55, -u * 0.13);
    c.quadraticCurveTo(0, u * 0.1, -u * 0.55, -u * 0.13); c.closePath(); c.fill();
    line(c, u * 0.07, () => { c.moveTo(0, -u * 0.75); c.lineTo(u * 0.82, -u * 0.62); c.lineTo(u * 0.82, -u * 0.2); });
    oval(c, u * 0.82, -u * 0.12, u * 0.09, u * 0.15);
  } },
  rays: { h: 0.95, draw: (c, u) => {
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i + 0.5) * Math.PI / 7, r = i % 2 ? 0.68 : 0.92;
      line(c, u * 0.11, () => { c.moveTo(Math.cos(a) * u * 0.38, Math.sin(a) * u * 0.38); c.lineTo(Math.cos(a) * u * r, Math.sin(a) * u * r); });
    }
  } }
};

/* Under the text: (0,0) is top centre, w is half width, u is the stroke unit. h = height in u */
const UNDERLINES = {
  swoosh: { h: 1.0, draw: (c, w, u) => {
    c.beginPath(); c.moveTo(-w, u * 0.55);
    c.quadraticCurveTo(0, -u * 0.05, w, u * 0.25); c.quadraticCurveTo(0, u * 0.3, -w, u * 0.55); c.fill();
    line(c, u * 0.1, () => { c.moveTo(-w * 0.45, u * 0.82); c.quadraticCurveTo(w * 0.15, u * 0.55, w * 0.7, u * 0.68); });
  } },
  heartline: { h: 0.9, draw: (c, w, u) => {
    for (const k of [-1, 1]) {
      line(c, u * 0.11, () => { c.moveTo(k * u * 0.75, u * 0.45); c.lineTo(k * w, u * 0.45); });
      dot(c, k * w, u * 0.45, u * 0.12);
    }
    heart(c, 0, u * 0.62, u * 0.75);
  } },
  wave: { h: 0.8, draw: (c, w, u) => line(c, u * 0.15, () => {
    for (let i = 0; i <= 120; i++) { const x = -w + 2 * w * i / 120, y = u * 0.4 + Math.sin(i / 120 * TAU * 4) * u * 0.24; i ? c.lineTo(x, y) : c.moveTo(x, y); }
  }) },
  vine: { h: 1.1, draw: (c, w, u) => {
    const at = x => u * 0.55 + Math.sin(x / w * Math.PI) * u * 0.12;
    line(c, u * 0.09, () => { for (let i = 0; i <= 60; i++) { const x = -w + 2 * w * i / 60; i ? c.lineTo(x, at(x)) : c.moveTo(x, at(x)); } });
    for (let i = 1; i <= 9; i++) { const x = -w + 2 * w * i / 10; leaf(c, x, at(x), u * 0.55, i % 2 ? -0.75 : 0.75); }
  } },
  diamonds: { h: 0.8, draw: (c, w, u) => {
    const gem = (x, r) => polygon(c, [[x, u * 0.4 - r], [x + r, u * 0.4], [x, u * 0.4 + r], [x - r, u * 0.4]]);
    gem(0, u * 0.35); gem(-u * 0.6, u * 0.18); gem(u * 0.6, u * 0.18);
    for (let x = u * 1.15; x <= w; x += u * 0.42) { dot(c, x, u * 0.4, u * 0.09); dot(c, -x, u * 0.4, u * 0.09); }
  } }
};

/* Frames go around everything. b = inner box; u = stroke unit. They return the outer box. */
const makeBox = (l, t, r, b) => ({ l, t, r, b, get w() { return this.r - this.l; }, get h() { return this.b - this.t; }, get cx() { return (this.l + this.r) / 2; }, get cy() { return (this.t + this.b) / 2; } });
const around = (x, y, rx, ry) => makeBox(x - rx, y - ry, x + rx, y + ry);
function roundRect(c, x, y, w, h, r) {
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
const FRAMES = {
  wreath: {
    size: (b, u) => around(b.cx, b.cy, b.w * 0.67 + u * 0.7, b.h * 0.69 + u * 0.7),
    draw: (c, b, u) => {
      const rx = b.w * 0.67, ry = b.h * 0.69;
      for (const k of [-1, 1]) {
        const pt = a => [b.cx + k * Math.cos(a) * rx, b.cy + Math.sin(a) * ry];
        const from = 1.42, to = -0.95;
        line(c, u * 0.11, () => { for (let i = 0; i <= 50; i++) { const p = pt(from + (to - from) * i / 50); i ? c.lineTo(...p) : c.moveTo(...p); } });
        for (let i = 1; i <= 11; i++) {
          const a = from + (to - from) * i / 11, [x, y] = pt(a);
          const dir = Math.atan2(-Math.cos(a) * ry, k * Math.sin(a) * rx);
          leaf(c, x, y, u * 0.65, dir - 0.7); leaf(c, x, y, u * 0.65, dir + 0.7);
        }
      }
    }
  },
  ring: {
    size: (b, u) => around(b.cx, b.cy, b.w * 0.67 + u * 0.4, b.h * 0.69 + u * 0.4),
    draw: (c, b, u) => {
      line(c, u * 0.16, () => c.ellipse(b.cx, b.cy, b.w * 0.67 + u * 0.25, b.h * 0.69 + u * 0.25, 0, 0, TAU));
      line(c, u * 0.06, () => c.ellipse(b.cx, b.cy, b.w * 0.67 - u * 0.05, b.h * 0.69 - u * 0.05, 0, 0, TAU));
    }
  },
  heartframe: {
    k: b => Math.max(b.w / 2 / 11.5, b.h / 2 / 5.5),
    size(b, u) { const k = this.k(b), y = b.cy - k * 0.5; return makeBox(b.cx - 16 * k - u * 0.2, y - 12 * k - u * 0.2, b.cx + 16 * k + u * 0.2, y + 17 * k + u * 0.2); },
    draw(c, b, u) {
      const k = this.k(b), y0 = b.cy - k * 0.5;
      line(c, u * 0.18, () => {
        for (let i = 0; i <= 160; i++) {
          const t = i / 160 * TAU, x = b.cx + 16 * Math.pow(Math.sin(t), 3) * k;
          const y = y0 - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * k;
          i ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.closePath();
      });
    }
  },
  corners: {
    size: (b, u) => makeBox(b.l - u * 0.8, b.t - u * 0.8, b.r + u * 0.8, b.b + u * 0.8),
    draw: (c, b, u) => {
      const len = Math.min(b.w, b.h) * 0.3, p = u * 0.6;
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const x = (sx < 0 ? b.l : b.r) + sx * p, y = (sy < 0 ? b.t : b.b) + sy * p;
        line(c, u * 0.16, () => { c.moveTo(x - sx * len, y); c.lineTo(x, y); c.lineTo(x, y - sy * len); });
        dot(c, x - sx * u * 0.5, y - sy * u * 0.5, u * 0.14);
      }
    }
  },
  stitch: {
    size: (b, u) => makeBox(b.l - u * 0.9, b.t - u * 0.9, b.r + u * 0.9, b.b + u * 0.9),
    draw: (c, b, u) => {
      c.save(); c.setLineDash([u * 0.4, u * 0.34]);
      line(c, u * 0.14, () => roundRect(c, b.l - u * 0.7, b.t - u * 0.7, b.w + u * 1.4, b.h + u * 1.4, u * 1.1));
      c.restore();
    }
  }
};

/* The list shown to the customer. max = how many can be picked in that group. */
const GROUPS = [
  { key: 'accent', label: 'Corner accents', hint: 'pick up to 2', max: 2, items: [
    ['hearts', 'Hearts'], ['stars', 'Stars'], ['sparkles', 'Sparkles'], ['flowers', 'Flowers'],
    ['butterflies', 'Butterflies'], ['music', 'Music notes'], ['paws', 'Paw prints'], ['leaves', 'Leaves']] },
  { key: 'top', label: 'Above the text', hint: 'pick 1', max: 1, items: [
    ['crown', 'Crown'], ['bow', 'Ribbon bow'], ['gradcap', 'Grad cap'], ['rays', 'Sun rays']] },
  { key: 'under', label: 'Under the text', hint: 'pick 1', max: 1, items: [
    ['swoosh', 'Swoosh'], ['heartline', 'Heart line'], ['wave', 'Wave'], ['vine', 'Leaf vine'], ['diamonds', 'Diamonds']] },
  { key: 'frame', label: 'Frame', hint: 'pick 1', max: 1, items: [
    ['wreath', 'Laurel wreath'], ['ring', 'Oval ring'], ['heartframe', 'Big heart'], ['corners', 'Elegant corners'], ['stitch', 'Stitched box']] }
];

/**
 * Lays out the text plus the chosen designs, then shrinks everything to fit the area.
 * o = { lines, font, size, picks, scale, areaW, areaH, x, y, textPaint(ctx, box), designPaint(ctx, box) }
 */
function compose(ctx, o) {
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let size = o.size;
  ctx.font = o.font(size);
  const widestOf = () => Math.max(...o.lines.map(l => ctx.measureText(l).width)) || 1;
  size *= Math.min(1, (o.areaW * 0.9) / widestOf(), (o.areaH * 0.85) / (o.lines.length * size * 1.2));
  ctx.font = o.font(size);
  const widest = widestOf(), lh = size * 1.2;
  const rows = o.lines.map((t, i) => ({ t, y: -(o.lines.length - 1) * lh / 2 + i * lh }));

  // real ink size of the letters, so designs never sit on top of tall or swirly fonts
  let top = Infinity, bot = -Infinity, half = widest / 2;
  for (const r of rows) {
    const m = ctx.measureText(r.t || ' ');
    top = Math.min(top, r.y - (m.actualBoundingBoxAscent ?? size * 0.55));
    bot = Math.max(bot, r.y + (m.actualBoundingBoxDescent ?? size * 0.5));
    half = Math.max(half, m.actualBoundingBoxLeft || 0, m.actualBoundingBoxRight || 0);
  }
  const text = makeBox(-half, top, half, bot), ds = o.scale, u = size * 0.23 * ds;
  let inner = makeBox(text.l, text.t, text.r, text.b);
  const grow = (l, t, r, b) => { inner = makeBox(Math.min(inner.l, l), Math.min(inner.t, t), Math.max(inner.r, r), Math.max(inner.b, b)); };

  const topper = TOPPERS[o.picks.top[0]], tu = size * 0.34 * ds, topY = text.t - size * 0.05;
  if (topper) grow(-tu * 1.15, topY - topper.h * tu - tu * 0.12, tu * 1.15, topY);

  const under = UNDERLINES[o.picks.under[0]], uw = Math.max(half * 0.92, size * 0.65), uu = size * 0.2 * ds, underY = text.b + size * 0.06;
  if (under) grow(-uw - uu * 0.2, underY, uw + uu * 0.2, underY + under.h * uu);

  const corners = [];                                     // 1 accent: two opposite corners. 2 accents: all four
  o.picks.accent.forEach((id, n) => {
    for (const [sx, sy] of n === 0 ? [[-1, -1], [1, 1]] : [[1, -1], [-1, 1]]) {
      const x = sx < 0 ? text.l : text.r, y = sy < 0 ? text.t : text.b;
      corners.push({ id, list: [
        [x + sx * u * 1.0, y + sy * u * 0.05, u, sx * 0.2],
        [x + sx * u * 0.1, y + sy * u * 0.85, u * 0.55, -sx * 0.25],
        [x + sx * u * 1.75, y - sy * u * 0.95, u * 0.42, sx * 0.35]] });
      grow(Math.min(x, x + sx * u * 2.25), Math.min(y, y + sy * u * 1.5), Math.max(x, x + sx * u * 2.25), Math.max(y, y + sy * u * 1.5));
    }
  });

  const frame = FRAMES[o.picks.frame[0]], fu = size * 0.16 * ds;
  const all = frame ? frame.size(inner, fu) : inner;
  const fit = Math.min(1, (o.areaW * 0.96) / all.w, (o.areaH * 0.88) / all.h);

  const keepIn = (v, half, full) => Math.min(Math.max(v, half), full - half);   // never let a design run off the pocket
  const px = keepIn(o.x, all.w * fit / 2, o.areaW), py = keepIn(o.y, all.h * fit / 2, o.areaH);
  ctx.translate(px, py); ctx.scale(fit, fit); ctx.translate(-all.cx, -all.cy);
  const shadow = () => { ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = size * fit * 0.04; ctx.shadowOffsetY = size * fit * 0.015; };

  shadow();
  const paintStyle = o.designPaint(ctx, all);
  const reset = () => { ctx.fillStyle = paintStyle; ctx.strokeStyle = paintStyle; };
  if (frame) { reset(); frame.draw(ctx, inner, fu); }
  if (topper) { reset(); ctx.save(); ctx.translate(0, topY); topper.draw(ctx, tu); ctx.restore(); }
  if (under) { reset(); ctx.save(); ctx.translate(0, underY); under.draw(ctx, uw, uu); ctx.restore(); }
  for (const cl of corners) for (const [x, y, s, a] of cl.list) {
    reset(); ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ICONS[cl.id](ctx, s);
    ctx.restore();
  }

  ctx.fillStyle = o.textPaint(ctx, text);
  rows.forEach(r => ctx.fillText(r.t, 0, r.y));
  ctx.restore();
}

const $ = s => document.querySelector(s);
const viewport = $('#viewport');

const state = {
  text: 'Jaye', font: 0, fill: PALETTE[0], textSize: 0.3, tx: 0, ty: 0.12, scarf: true,
  picks: { accent: ['hearts'], top: [], under: [], frame: [] },
  designScale: 1, ownColor: false, designColor: '#ffffff'
};

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

/* ===== 6. PAINT THE TEXT + DESIGNS ===== */
const gradientFor = (colors, ctx, box) => {
  if (colors.length === 1) return colors[0];
  const g = ctx.createLinearGradient(box.l, box.t, box.r, box.b);
  colors.forEach((col, i) => g.addColorStop(i / (colors.length - 1), col)); return g;
};
const designColors = () => state.ownColor ? [state.designColor] : state.fill.c;

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
    compose(ctx, {
      lines: state.text.replace(/\s+$/, '').split('\n').slice(0, 3),
      font: FONTS[state.font][1], size: CH * state.textSize,
      picks: state.picks, scale: state.designScale, areaW: CW, areaH: CH,
      x: CW / 2 + state.tx * CW * 0.4, y: CH / 2 - state.ty * CH * 0.4,
      textPaint: (c, box) => gradientFor(state.fill.c, c, box),
      designPaint: (c, box) => gradientFor(designColors(), c, box)
    });
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

/* design list: one box per design, with a small live picture of it */
const designName = (key, id) => GROUPS.find(g => g.key === key).items.find(i => i[0] === id)[1];
const pickedNames = () => GROUPS.flatMap(g => state.picks[g.key].map(id => designName(g.key, id)));

$('#designs').innerHTML = GROUPS.map(g => `
  <div class="lbl">${g.label} <small>· ${g.hint}</small></div>
  <div class="dz-grid">${g.items.map(([id, name]) => `
    <button type="button" class="dz" data-group="${g.key}" data-id="${id}" aria-pressed="false">
      <canvas width="168" height="112" aria-hidden="true"></canvas><span>${name}</span>
    </button>`).join('')}
  </div>`).join('');

function drawThumbs() {
  document.querySelectorAll('.dz').forEach(b => {
    const cv = b.querySelector('canvas'), g = cv.getContext('2d');
    const picks = { accent: [], top: [], under: [], frame: [] }; picks[b.dataset.group] = [b.dataset.id];
    g.clearRect(0, 0, cv.width, cv.height);
    compose(g, {
      lines: ['Aa'], font: FONTS[0][1], size: 54, picks, scale: 1.1,
      areaW: cv.width, areaH: cv.height, x: cv.width / 2, y: cv.height / 2,
      textPaint: () => '#b9adb1', designPaint: () => '#d92332'
    });
  });
}

function syncDesigns() {
  document.querySelectorAll('.dz').forEach(b => {
    const on = state.picks[b.dataset.group].includes(b.dataset.id);
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
  });
  const names = pickedNames();
  $('#designName').textContent = names.length ? names.join(', ') : 'None';
}

$('#designs').onclick = e => {
  const b = e.target.closest('.dz'); if (!b) return;
  const { group, id } = b.dataset, max = GROUPS.find(g => g.key === group).max;
  let list = state.picks[group];
  list = list.includes(id) ? list.filter(x => x !== id) : [...list, id].slice(-max);   // over the limit: the oldest one is replaced
  state.picks[group] = list;
  syncDesigns(); paint();
};
$('#clearDesigns').onclick = () => { for (const k in state.picks) state.picks[k] = []; syncDesigns(); paint(); };
$('#dsize').addEventListener('input', e => { state.designScale = parseFloat(e.target.value); paint(); });
$('#ownColor').onchange = e => { state.ownColor = e.target.checked; paint(); };
$('#dcolor').oninput = e => { state.designColor = e.target.value; state.ownColor = true; $('#ownColor').checked = true; paint(); };
drawThumbs(); syncDesigns();

$('#txt').addEventListener('input', e => { state.text = e.target.value; paint(); });
$('#font').addEventListener('change', e => { state.font = +e.target.value; paint(); });
for (const [id, key] of [['tsize', 'textSize'], ['tx', 'tx'], ['ty', 'ty']]) $('#' + id).addEventListener('input', e => { state[key] = parseFloat(e.target.value); paint(); });
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
  const text = state.text.trim().replace(/\n/g, ' '), names = pickedNames();
  const designs = names.length ? ` · Designs: ${names.join(', ')}${state.ownColor ? ` (color ${state.designColor})` : ''}` : '';
  const ok = Cart.add({
    key: 'bag-' + Date.now(), id: 'bag-custom', name: 'Custom Abaca Bag',
    detail: `Text “${text}” · ${FONTS[state.font][0]} · ${state.fill.n}${designs}${state.scarf ? ' · With scarf' : ''}`,
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
  .map(f => document.fonts.load(f))).then(() => { drawThumbs(); paint(); }).catch(() => {});
