/* Mug color availability.
   White is always available. Every other color stays locked (grayed out) until the admin turns it on.
   Temporary setup: saved in this browser's localStorage, like prices.js.
   Later, replace load()/save() with PHP/MySQL calls so every customer sees the same list. */
const MugColors = {
  KEY: 'jj_mug_colors_v1',
  ALWAYS: 'White',
  ALL: [
    ['White',  '#FFFFFF'],
    ['Red',    '#E4262C'],
    ['Yellow', '#FFC72C'],
    ['Pink',   '#F58FB0'],
    ['Blue',   '#2F6FDE'],
    ['Green',  '#2E9B5B'],
    ['Black',  '#2A2A2E']
  ],

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.KEY));
      if (Array.isArray(saved)) return saved;
    } catch (e) {}
    return [];
  },
  save(list) {
    try { localStorage.setItem(this.KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  },

  isEnabled(name) {
    return name === this.ALWAYS || this.load().includes(name);
  },
  set(name, on) {
    if (name === this.ALWAYS) return;
    const rest = this.load().filter(n => n !== name);
    this.save(on ? [...rest, name] : rest);
  },
  reset() {
    try { localStorage.removeItem(this.KEY); } catch (e) {}
  }
};
