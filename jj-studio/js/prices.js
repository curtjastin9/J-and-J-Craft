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
