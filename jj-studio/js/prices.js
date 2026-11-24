/* Paper print prices (pesos per page).
   The admin page (admin.html) edits these and saves them in the browser's localStorage.
   Later, replace load()/save() with calls to PHP/MySQL so every customer sees the same prices. */
const PriceStore = {
  KEY: 'jj_paper_prices_v1',
  DEFAULTS: {
    regular: {
      'Short (Letter)': { bw: 3, color: 8 },
      'A4':             { bw: 3, color: 8 },
      'Legal (Long)':   { bw: 4, color: 10 }
    },
    aseries: {
      'A1':  { bw: 40, color: 100 },
      'A2':  { bw: 25, color: 70 },
      'A3':  { bw: 10, color: 25 },
      'A4':  { bw: 3,  color: 8 },
      'A5':  { bw: 2,  color: 5 },
      'A6':  { bw: 2,  color: 4 },
      'A7':  { bw: 1,  color: 3 },
      'A8':  { bw: 1,  color: 2 },
      'A9':  { bw: 1,  color: 2 },
      'A10': { bw: 1,  color: 2 }
    }
  },
  /* Size details: w/h in mm, label text, paper stock used, and best use */
  META: {
    'Short (Letter)': { w: 216, h: 279, mm: '8.5 × 11 in · 216 × 279 mm', stock: 'Bond paper, 70 gsm (substance 20)', use: 'School work, reports, resumes, forms' },
    'A4':             { w: 210, h: 297, mm: '8.3 × 11.7 in · 210 × 297 mm', stock: 'Bond paper, 70 gsm (substance 20)', use: 'Documents, letters, handouts, certificates' },
    'Legal (Long)':   { w: 216, h: 330, mm: '8.5 × 13 in · 216 × 330 mm', stock: 'Bond paper, 70 gsm (substance 20)', use: 'Contracts, legal forms, long documents, tables' },
    'A1': { w: 594, h: 841, mm: '23.4 × 33.1 in · 594 × 841 mm', stock: 'Plotter / engineering bond, 80–90 gsm', use: 'Large posters, blueprints, floor plans' },
    'A2': { w: 420, h: 594, mm: '16.5 × 23.4 in · 420 × 594 mm', stock: 'Plotter / engineering bond, 80–90 gsm', use: 'Posters, project boards, drawings' },
    'A3': { w: 297, h: 420, mm: '11.7 × 16.5 in · 297 × 420 mm', stock: 'Copy paper, 80–100 gsm', use: 'Charts, drawings, menus, small posters' },
    'A5': { w: 148, h: 210, mm: '5.8 × 8.3 in · 148 × 210 mm', stock: 'Copy paper, 80 gsm', use: 'Flyers, booklets, notes, invitations' },
    'A6': { w: 105, h: 148, mm: '4.1 × 5.8 in · 105 × 148 mm', stock: 'Light card stock, 100–120 gsm', use: 'Postcards, greeting cards, small flyers' },
    'A7': { w: 74,  h: 105, mm: '2.9 × 4.1 in · 74 × 105 mm', stock: 'Card stock, 120–160 gsm', use: 'Tags, coupons, small cards' },
    'A8': { w: 52,  h: 74,  mm: '2.0 × 2.9 in · 52 × 74 mm', stock: 'Card stock, 120–160 gsm', use: 'Business cards, ID-size cards, labels' },
    'A9': { w: 37,  h: 52,  mm: '1.5 × 2.0 in · 37 × 52 mm', stock: 'Card stock, 120–160 gsm', use: 'Mini tags, price tags, stickers' },
    'A10':{ w: 26,  h: 37,  mm: '1.0 × 1.5 in · 26 × 37 mm', stock: 'Card stock, 120–160 gsm', use: 'Tiny labels, mini tags' }
  },
  GROUPS: { regular: 'Regular Bond Paper', aseries: 'A-Series Paper Sizes' },
  load() {
    const d = JSON.parse(JSON.stringify(this.DEFAULTS));
    try {
      const saved = JSON.parse(localStorage.getItem(this.KEY));
      if (saved) for (const g in d) for (const s in d[g]) {
        const v = saved[g] && saved[g][s];
        if (v && isFinite(v.bw) && isFinite(v.color)) d[g][s] = { bw: +v.bw, color: +v.color };
      }
    } catch (e) {}
    return d;
  },
  save(prices) { localStorage.setItem(this.KEY, JSON.stringify(prices)); },
  reset() { localStorage.removeItem(this.KEY); }
};
const pesoFmt = n => '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
