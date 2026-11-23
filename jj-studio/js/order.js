/* ---------- Catalog (sample prices: the owner will set real ones later) ---------- */
const PAPER_PRICE = { // pesos per page
  'Black & White': { 'Short (8.5×11)': 3, 'A4': 3, 'Legal (8.5×13)': 4 },
  'Colored':       { 'Short (8.5×11)': 10, 'A4': 10, 'Legal (8.5×13)': 12 }
};

const CATALOG = {
  product: {
    label: 'Products',
    items: [
      { id: 'mug',   name: 'Ceramic Mug',   desc: 'Glossy 11 oz mug. Add your own photo and preview it in 3D.', price: 150, art: 'mug',   bg: 'bg-red',   badge: 'Best seller',
        customize: 'customize-mug.html', customPrice: 250 },
      { id: 'rose',  name: 'Rose',          desc: 'A handcrafted rose keepsake that never wilts.', price: 120, art: 'rose',  bg: 'bg-pink' },
      { id: 'frame', name: 'Picture Frame', desc: 'Wooden tabletop frame, perfect for 4R photos.', price: 180, art: 'frame', bg: 'bg-yellow' }
    ]
  },
  print: {
    label: 'Print',
    items: [
      { id: 'paper', name: 'Paper Print', desc: 'Pick your paper size and color. Priced per page.', art: 'paper', bg: 'bg-blue', unit: 'page',
        options: [
          { key: 'size',  label: 'Paper size', choices: ['Short (8.5×11)', 'A4', 'Legal (8.5×13)'] },
          { key: 'color', label: 'Color',      choices: ['Black & White', 'Colored'] }
        ],
        priceFn: s => PAPER_PRICE[s.color][s.size] },
      { id: 'tshirt', name: 'T-shirt Print', desc: 'Soft cotton t-shirt, printed by the shop.', art: 'tshirt', bg: 'bg-green', price: 250,
        options: [{ key: 'size', label: 'Shirt size', choices: ['S', 'M', 'L', 'XL'] }] }
    ]
  }
};

/* ---------- State ---------- */
const state = { view: 'type', type: 'product', sel: {}, qty: {} };
const $ = s => document.querySelector(s);
const stage = $('#stage');

const itemPrice = it => it.priceFn ? it.priceFn(selOf(it)) : it.price;
function selOf(it) {
  if (!state.sel[it.id]) {
    state.sel[it.id] = {};
    (it.options || []).forEach(o => state.sel[it.id][o.key] = o.choices[0]);
  }
  return state.sel[it.id];
}

/* ---------- Views ---------- */
function setProgress(step) {
  const names = ['Choose type', 'Pick items', 'Review order'];
  $('#progress').innerHTML = names.map((n, i) => {
    const cls = i + 1 < step ? 'done' : i + 1 === step ? 'on' : '';
    return `<div class="p ${cls}"><i>${i + 1 < step ? '✓' : i + 1}</i>${n}</div>${i < 2 ? '<div class="bar"></div>' : ''}`;
  }).join('');
}

function renderType() {
  state.view = 'type';
  setProgress(1);
  stage.innerHTML = `
    <h1 class="order-title">What would you like to order?</h1>
    <p class="order-sub">Pick one to get started. You can switch anytime.</p>
    <div class="type-grid">
      <button class="type prod" data-type="product" aria-label="Order products">
        <div class="art">${ART.mug}${ART.rose}</div>
        <h2>Products</h2>
        <p>Mugs, roses and picture frames, ready to gift.</p>
        <span class="go">Browse products →</span>
      </button>
      <button class="type print" data-type="print" aria-label="Order prints">
        <div class="art">${ART.paper}${ART.tshirt}</div>
        <h2>Print</h2>
        <p>Paper prints and t-shirt prints, priced instantly.</p>
        <span class="go">Start a print →</span>
      </button>
    </div>`;
  stage.querySelectorAll('.type').forEach(b => b.onclick = () => { state.type = b.dataset.type; renderItems(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
}

function renderItems() {
  state.view = 'items';
  setProgress(2);
  const cat = CATALOG[state.type];
  stage.innerHTML = `
    <button class="back" id="back">← Change type</button>
    <div class="tabs" role="tablist">
      ${Object.entries(CATALOG).map(([k, c]) => `<button class="tab ${k === state.type ? 'on' : ''}" data-tab="${k}" role="tab">${c.label}</button>`).join('')}
    </div>
    <div class="items">${cat.items.map(cardHTML).join('')}</div>`;

  $('#back').onclick = renderType;
  stage.querySelectorAll('.tab').forEach(t => t.onclick = () => { state.type = t.dataset.tab; renderItems(); });

  stage.querySelectorAll('.chip').forEach(c => c.onclick = () => {
    state.sel[c.dataset.id][c.dataset.key] = c.dataset.v;
    const scroll = window.scrollY; renderItems(); window.scrollTo(0, scroll);
  });
  stage.querySelectorAll('[data-q]').forEach(b => b.onclick = () => {
    const id = b.dataset.id; state.qty[id] = Math.max(1, (state.qty[id] || 1) + Number(b.dataset.q));
    stage.querySelector(`[data-qv="${id}"]`).textContent = state.qty[id];
  });
  stage.querySelectorAll('[data-add]').forEach(b => b.onclick = () => addToCart(b.dataset.add));
}

function cardHTML(it, idx) {
  const s = selOf(it), qty = state.qty[it.id] || 1, price = itemPrice(it);
  const opts = (it.options || []).map(o => `
    <div class="opt"><label>${o.label}</label><div class="chips">
      ${o.choices.map(c => `<button class="chip ${s[o.key] === c ? 'on' : ''}" data-id="${it.id}" data-key="${o.key}" data-v="${c}">${c}</button>`).join('')}
    </div></div>`).join('');
  const art = `${it.badge ? `<span class="badge">${it.badge}</span>` : ''}${ART[it.art]}${it.customize ? '<span class="tag3d">🎨 Customize in 3D</span>' : ''}`;
  const addRow = it.customize
    ? `<div class="add-row col">
         <a class="btn btn-primary" href="${it.customize}">Customize in 3D →</a>
         <button class="plain" data-add="${it.id}">or add a plain ${it.name.toLowerCase()}</button>
       </div>`
    : `<div class="add-row">
         <div class="qty"><button data-id="${it.id}" data-q="-1" aria-label="Less">−</button><span data-qv="${it.id}">${qty}</span><button data-id="${it.id}" data-q="1" aria-label="More">+</button></div>
         <button class="btn btn-primary" data-add="${it.id}">Add to order</button>
       </div>`;
  return `
    <article class="card" style="animation-delay:${idx * 70}ms">
      ${it.customize ? `<a class="card-art link ${it.bg}" href="${it.customize}" aria-label="Customize ${it.name} in 3D">${art}</a>` : `<div class="card-art ${it.bg}">${art}</div>`}
      <div class="card-body">
        <h3>${it.customize ? `<a href="${it.customize}">${it.name}</a>` : it.name}</h3>
        <p class="d">${it.desc}</p>
        ${opts}
        <div class="card-foot">
          <div class="price">${peso(price)}${it.unit ? ` <small>/ ${it.unit}</small>` : ''}${it.customPrice ? ` <small>· ${peso(it.customPrice)} with your photo</small>` : ''}</div>
        </div>
        ${addRow}
      </div>
    </article>`;
}

function addToCart(id) {
  const it = [...CATALOG.product.items, ...CATALOG.print.items].find(x => x.id === id);
  const s = selOf(it), qty = state.qty[id] || 1;
  const detail = (it.options || []).map(o => s[o.key]).join(' · ');
  Cart.add({ key: id + '|' + detail, id, name: it.name, detail, price: itemPrice(it), art: it.art, bg: it.bg, unit: it.unit || '' }, qty);
  state.qty[id] = 1;
  const q = stage.querySelector(`[data-qv="${id}"]`); if (q) q.textContent = 1;
  toast(`Added ${qty} × ${it.name}`);
}

/* ---------- Cart bar, drawer, review modal ---------- */
function mountCartUI() {
  document.body.insertAdjacentHTML('beforeend', `
    <div class="cartbar" id="cartbar"><button id="openCart" aria-label="View your order">
      <span style="display:flex;align-items:center;gap:12px"><span class="n" id="cbN">0</span> View your order</span>
      <span class="t" id="cbT">₱0</span></button></div>
    <div class="scrim" id="scrim"></div>
    <aside class="drawer" id="drawer" aria-label="Your order">
      <div class="drawer-head"><h2>Your order</h2><button class="x" id="closeCart" aria-label="Close">✕</button></div>
      <div class="drawer-list" id="dList"></div>
      <div class="drawer-foot">
        <div class="sum"><span>Total</span><b id="dTotal">₱0</b></div>
        <button class="btn btn-primary btn-lg" id="checkout">Review order</button>
        <p class="note">Sample prices. The shop confirms the final total.</p>
      </div>
    </aside>
    <div class="modal" id="modal"><div class="box" id="modalBox"></div></div>`);

  const open = () => { $('#drawer').classList.add('show'); $('#scrim').classList.add('show'); };
  const close = () => { $('#drawer').classList.remove('show'); $('#scrim').classList.remove('show'); $('#modal').classList.remove('show'); };
  $('#openCart').onclick = open; $('#closeCart').onclick = close; $('#scrim').onclick = close;
  $('#cartLink') && ($('#cartLink').onclick = e => { e.preventDefault(); open(); });
  window.openCartDrawer = open;
  document.addEventListener('keydown', e => e.key === 'Escape' && close());
  $('#checkout').onclick = openReview;
  document.addEventListener('cart:change', renderCart);
  renderCart();
}

function renderCart() {
  const items = Cart.get(), n = Cart.count();
  $('#cbN').textContent = n; $('#cbT').textContent = peso(Cart.total());
  $('#cartbar').classList.toggle('show', n > 0);
  $('#dTotal').textContent = peso(Cart.total());
  $('#checkout').disabled = !n; $('#checkout').style.opacity = n ? 1 : .5;
  $('#dList').innerHTML = items.length ? items.map(i => `
    <div class="line">
      <div class="th ${i.bg}">${i.preview ? `<img src="${i.preview}" alt="Your mug design">` : ART[i.art]}</div>
      <div><h4>${i.name}</h4><small>${i.detail || peso(i.price) + ' each'}</small>
        <div class="qty" style="margin-top:6px"><button data-k="${i.key}" data-d="-1">−</button><span>${i.qty}</span><button data-k="${i.key}" data-d="1">+</button></div></div>
      <div class="lp"><span>${peso(i.price * i.qty)}</span><button class="rm" data-rm="${i.key}">Remove</button></div>
    </div>`).join('') : `<div class="empty"><b>Nothing here yet</b>Add a product or print to get started.</div>`;
  $('#dList').querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
    const it = Cart.get().find(x => x.key === b.dataset.k); Cart.setQty(it.key, it.qty + Number(b.dataset.d));
  });
  $('#dList').querySelectorAll('[data-rm]').forEach(b => b.onclick = () => Cart.setQty(b.dataset.rm, 0));
}

function openReview() {
  const items = Cart.get(); if (!items.length) return;
  $('#modalBox').innerHTML = `
    <h2>Review your order</h2>
    <div class="rows">
      ${items.map(i => `<div><span>${i.qty} × ${i.name}${i.detail ? ` <small style="color:var(--muted)">(${i.detail})</small>` : ''}</span><b>${peso(i.qty * i.price)}</b></div>`).join('')}
      <div class="tot"><span>Total</span><span>${peso(Cart.total())}</span></div>
    </div>
    <div class="next"><b>Coming next:</b> choose how to receive it (Lalamove, meet-up or pickup), send the order to the shop on Facebook, then pay with GCash.</div>
    <button class="btn btn-ghost" id="mClose" style="width:100%">Keep editing</button>`;
  $('#modal').classList.add('show');
  $('#mClose').onclick = () => $('#modal').classList.remove('show');
}

/* ---------- Start ---------- */
mountCartUI();
const params = new URLSearchParams(location.search);
const startType = params.get('type');
if (CATALOG[startType]) { state.type = startType; renderItems(); } else renderType();
if (params.get('open') === 'cart') setTimeout(() => window.openCartDrawer(), 250);
