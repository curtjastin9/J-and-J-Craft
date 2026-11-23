/* Shared cart (kept in the browser's localStorage so it survives page changes).
   Later this will be sent to PHP/MySQL when the customer checks out. */
const peso = n => '₱' + Number(n).toLocaleString('en-PH');

const Cart = {
  KEY: 'jj_cart_v1',
  get() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch (e) { return []; } },
  save(items) {
    let ok = true;
    try { localStorage.setItem(this.KEY, JSON.stringify(items)); } catch (e) { ok = false; }
    if (ok) this.refresh();
    return ok;
  },
  add(item, qty) {
    const items = this.get();
    const found = items.find(i => i.key === item.key);
    if (found) found.qty += qty; else items.push({ ...item, qty });
    return this.save(items);
  },
  setQty(key, qty) {
    let items = this.get();
    items = qty <= 0 ? items.filter(i => i.key !== key) : items.map(i => i.key === key ? { ...i, qty } : i);
    this.save(items);
  },
  clear() { this.save([]); },
  count() { return this.get().reduce((s, i) => s + i.qty, 0); },
  total() { return this.get().reduce((s, i) => s + i.qty * i.price, 0); },
  refresh() {
    document.querySelectorAll('[data-cart-count]').forEach(el => el.textContent = this.count());
    document.dispatchEvent(new Event('cart:change'));
  }
};

function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 1600);
}

document.addEventListener('DOMContentLoaded', () => Cart.refresh());
