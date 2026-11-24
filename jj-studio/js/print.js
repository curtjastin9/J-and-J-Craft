(() => {
  const $ = s => document.querySelector(s);
  const MAX_MB = 25, MAX_PREVIEW = 60;
  const prices = PriceStore.load();
  const S = { type: 'regular', size: 'A4', color: 'bw', copies: 1, file: null, pages: 0, range: 'all', custom: '', sel: [], token: 0 };

  if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  /* ---------- step switching ---------- */
  const showPaper = () => { $('#stepCategory').hidden = true; $('#stepPaper').hidden = false; window.scrollTo({ top: 0, behavior: 'smooth' }); };
  $('#catPaper').onclick = showPaper;
  $('#catShirt').onclick = () => { $('#soonMsg').hidden = false; };
  $('#backCat').onclick = () => { $('#stepPaper').hidden = true; $('#stepCategory').hidden = false; };
  if (new URLSearchParams(location.search).get('cat') === 'paper') showPaper();

  /* ---------- paper type / size ---------- */
  function renderSizes() {
    const group = prices[S.type], sizes = Object.keys(group);
    if (!sizes.includes(S.size)) S.size = sizes.includes('A4') ? 'A4' : sizes[0];
    $('#sizeGrid').innerHTML = sizes.map(z => {
      const m = PriceStore.META[z] || { w: 210, h: 297, mm: '', stock: '' }, k = 44 / Math.max(m.w, m.h);
      const w = Math.max(6, Math.round(m.w * k)), h = Math.max(8, Math.round(m.h * k));
      return `<button type="button" class="size ${z === S.size ? 'on' : ''}" data-size="${z}">
        <span class="size-ic"><i style="width:${w}px;height:${h}px"></i></span>
        <span class="size-tx"><b>${z}</b><small>${m.mm.split(' · ')[1] || m.mm}</small></span>
        <span class="size-pr">${pesoFmt(group[z].bw)}<small>/ page</small></span></button>`;
    }).join('');
    $('#sizeGrid').querySelectorAll('.size').forEach(b => b.onclick = () => { S.size = b.dataset.size; renderSizes(); });
    update();
  }
  document.querySelectorAll('#typeSeg .seg-b').forEach(b => b.onclick = () => {
    S.type = b.dataset.type;
    document.querySelectorAll('#typeSeg .seg-b').forEach(x => x.classList.toggle('on', x === b));
    renderSizes();
  });
  document.querySelectorAll('#colorGrid .color-opt').forEach(b => b.onclick = () => { S.color = b.dataset.color; update(); });
  $('#cMinus').onclick = () => { S.copies = Math.max(1, S.copies - 1); update(); };
  $('#cPlus').onclick = () => { S.copies = Math.min(999, S.copies + 1); update(); };
  $('#pages').addEventListener('input', e => { S.pages = Math.max(1, Math.min(2000, parseInt(e.target.value) || 1)); update(); });

  /* ---------- page range ---------- */
  document.querySelectorAll('#rangeChips .pchip').forEach(b => b.onclick = () => {
    S.range = b.dataset.range;
    document.querySelectorAll('#rangeChips .pchip').forEach(x => x.classList.toggle('on', x === b));
    $('#customBox').hidden = S.range !== 'custom';
    if (S.range === 'custom') $('#customIn').focus();
    update();
  });
  $('#customIn').addEventListener('input', e => { S.custom = e.target.value; update(); });

  function parseRange() {
    const n = S.pages, out = [];
    if (!n) return { pages: out, err: '' };
    if (S.range === 'all') for (let i = 1; i <= n; i++) out.push(i);
    else if (S.range === 'odd') for (let i = 1; i <= n; i += 2) out.push(i);
    else if (S.range === 'even') for (let i = 2; i <= n; i += 2) out.push(i);
    else {
      const txt = S.custom.trim();
      if (!txt) return { pages: out, err: '' };
      const set = new Set();
      for (const part of txt.split(',')) {
        const t = part.trim(); if (!t) continue;
        const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(t);
        if (!m) return { pages: [], err: `"${t}" is not a valid page or range.` };
        const a = +m[1], b = m[2] ? +m[2] : a;
        if (a < 1 || b < a) return { pages: [], err: `"${t}" is not a valid range.` };
        if (b > n) return { pages: [], err: `Your file only has ${n} page${n === 1 ? '' : 's'}.` };
        for (let i = a; i <= b; i++) set.add(i);
      }
      out.push(...[...set].sort((x, y) => x - y));
    }
    return { pages: out, err: '' };
  }
  function compact(list) {                               // [1,2,3,5] -> "1-3, 5"
    const parts = []; let i = 0;
    while (i < list.length) { let j = i; while (j + 1 < list.length && list[j + 1] === list[j] + 1) j++; parts.push(j > i ? `${list[i]}-${list[j]}` : `${list[i]}`); i = j + 1; }
    return parts.join(', ');
  }

  /* ---------- summary ---------- */
  const unit = () => prices[S.type][S.size][S.color];
  function update() {
    const p = prices[S.type][S.size], meta = PriceStore.META[S.size] || {};
    $('#pBw').textContent = pesoFmt(p.bw) + ' / page';
    $('#pColor').textContent = pesoFmt(p.color) + ' / page';
    document.querySelectorAll('#colorGrid .color-opt').forEach(b => b.classList.toggle('on', b.dataset.color === S.color));
    $('#copies').textContent = S.copies;
    $('#sizeInfo').innerHTML = `<div><span>Paper used</span><b>${meta.stock || '—'}</b></div><div><span>Best for</span><b>${meta.use || '—'}</b></div><div><span>Size</span><b>${meta.mm || '—'}</b></div>`;

    const r = parseRange(); S.sel = r.pages;
    const re = $('#rangeErr'); re.textContent = r.err; re.hidden = !r.err;
    const ready = !!S.file && S.pages > 0 && !r.err && S.sel.length > 0;
    $('#rangeInfo').textContent = !S.file ? 'Upload a file to choose pages.'
      : r.err ? 'Fix the page range to continue.'
      : S.sel.length ? `${S.sel.length} of ${S.pages} page${S.pages === 1 ? '' : 's'} selected${S.range === 'custom' ? '' : ''}.`
      : 'Type the pages you want to print.';

    $('#sFile').textContent = S.file ? S.file.name : '—';
    $('#sRange').textContent = S.file && S.sel.length ? (S.range === 'all' ? `All (${S.pages})` : `${compact(S.sel)} (${S.sel.length})`) : '—';
    $('#sPaper').textContent = `${S.size}${S.type === 'aseries' ? ' (A-Series)' : ' (Bond)'}`;
    $('#sStock').textContent = meta.stock || '—';
    $('#sColor').textContent = S.color === 'bw' ? 'Black & White' : 'Full Color';
    $('#sQty').textContent = ready ? `${S.sel.length} × ${S.copies} = ${S.sel.length * S.copies}` : '—';
    $('#sUnit').textContent = pesoFmt(unit());
    $('#sTotal').textContent = pesoFmt(ready ? unit() * S.sel.length * S.copies : 0);
    $('#add').disabled = !ready;
    $('#addHint').textContent = ready ? 'Looks good? Add it to your order.' : (S.file ? 'Choose the pages to print.' : 'Upload a file to continue.');

    const set = new Set(S.sel);                           // dim pages that will not print
    $('#pvPages').querySelectorAll('.pv-pg').forEach(el => el.classList.toggle('off', !set.has(+el.dataset.n)));
  }

  /* ---------- preview helpers ---------- */
  const err = m => { const e = $('#err'); e.textContent = m || ''; e.hidden = !m; };
  const ext = n => (n.split('.').pop() || '').toLowerCase();
  function resetPreview(msg) {
    $('#pvPages').innerHTML = ''; $('#pvPages').hidden = true;
    $('#pvDocx').innerHTML = ''; $('#pvDocx').hidden = true;
    $('#pvEmpty').hidden = false; $('#pvEmptyTx').textContent = msg || 'Your file will appear here after you upload it.';
    $('#pvNote').textContent = '';
  }

  async function renderPdfPreview(doc, token) {
    $('#pvEmpty').hidden = true; $('#pvPages').hidden = false;
    const total = Math.min(doc.numPages, MAX_PREVIEW), box = $('#pvPages');
    for (let n = 1; n <= total; n++) {
      if (token !== S.token) return;
      try {
        const page = await doc.getPage(n), vp0 = page.getViewport({ scale: 1 });
        const scale = (260 * Math.min(window.devicePixelRatio || 1, 2)) / vp0.width, vp = page.getViewport({ scale });
        const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
        await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        if (token !== S.token) return;
        const el = document.createElement('figure'); el.className = 'pv-pg'; el.dataset.n = n;
        el.appendChild(c); const cap = document.createElement('figcaption'); cap.textContent = `Page ${n}`; el.appendChild(cap);
        box.appendChild(el);
        if (n === 1) { const t = $('#thumb'); t.textContent = ''; const tc = document.createElement('canvas'); tc.width = c.width; tc.height = c.height; tc.getContext('2d').drawImage(c, 0, 0); t.appendChild(tc); }
      } catch (e) { /* skip a page that cannot render */ }
      if (n === 1 || n % 4 === 0) update();
    }
    if (doc.numPages > total) {
      const more = document.createElement('p'); more.className = 'pv-more'; more.textContent = `Showing the first ${total} of ${doc.numPages} pages.`; box.appendChild(more);
    }
    $('#pvNote').textContent = `${doc.numPages} page${doc.numPages === 1 ? '' : 's'}`;
    update();
  }

  async function renderDocxPreview(buf, token) {
    if (!(window.docx && docx.renderAsync)) throw new Error('Word preview could not load. Check your internet connection.');
    const host = $('#pvDocx'); host.innerHTML = ''; host.hidden = false; $('#pvEmpty').hidden = true;
    await docx.renderAsync(buf, host, null, { className: 'docx', inWrapper: true, ignoreWidth: false, breakPages: true, ignoreLastRenderedPageBreak: true });
    if (token !== S.token) return;
    const sec = host.querySelector('section.docx'), wrap = host.querySelector('.docx-wrapper');
    if (sec && wrap) {
      const avail = $('#pvBody').clientWidth - 24, w = sec.offsetWidth || 816;
      wrap.style.zoom = Math.min(1, avail / w);
    }
    $('#pvNote').textContent = 'Word preview';
  }

  /* ---------- file loading ---------- */
  async function docxPages(buf) {
    if (!window.JSZip) return { pages: 0, note: '' };
    const zip = await JSZip.loadAsync(buf);
    const app = zip.file('docProps/app.xml');
    if (app) { const m = /<Pages>(\d+)<\/Pages>/.exec(await app.async('string')); if (m) return { pages: +m[1], note: 'Read from your Word file.' }; }
    const body = zip.file('word/document.xml');
    const words = body ? ((await body.async('string')).replace(/<[^>]+>/g, ' ').match(/\S+/g) || []).length : 0;
    return { pages: Math.max(1, Math.ceil(words / 450)), note: 'Estimated. Please check the page count.' };
  }

  async function loadFile(file) {
    err('');
    if (!file) return;
    const e = ext(file.name);
    if (!['pdf', 'doc', 'docx'].includes(e)) return err('Please upload a PDF or Word file (.pdf, .doc, .docx).');
    if (file.size > MAX_MB * 1024 * 1024) return err(`That file is over ${MAX_MB} MB.`);
    const token = ++S.token;
    $('#loaded').hidden = false; $('#drop').hidden = true;
    $('#fName').textContent = file.name; $('#fMeta').textContent = 'Loading…';
    $('#thumb').textContent = e === 'pdf' ? '📕' : '📘'; $('#pgNote').textContent = '';
    resetPreview('Loading preview…');
    S.file = file; S.pages = 0; update();
    try {
      const buf = await file.arrayBuffer();
      if (token !== S.token) return;
      let pages = 1, note = '', pdfDoc = null;
      if (e === 'pdf') {
        if (!window.pdfjsLib) throw new Error('PDF reader could not load. Check your internet connection.');
        pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
        pages = pdfDoc.numPages; note = 'Counted from your PDF.';
      } else if (e === 'docx') {
        const info = await docxPages(buf.slice(0)); pages = info.pages || 1; note = info.note;
      } else note = 'Old .doc files cannot be counted. Please enter the number of pages.';
      if (token !== S.token) return;
      S.pages = pages; $('#pages').value = pages; $('#pgNote').textContent = note;
      $('#fMeta').textContent = `${e.toUpperCase()} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
      update();
      if (e === 'pdf') await renderPdfPreview(pdfDoc, token);
      else if (e === 'docx') {
        try { await renderDocxPreview(buf.slice(0), token); }
        catch (ex) { resetPreview('Preview is not available for this Word file, but you can still print it.'); }
      } else resetPreview('Preview is not available for old .doc files. You can still print it.');
    } catch (ex) {
      if (token !== S.token) return;
      S.file = null; S.pages = 0; $('#loaded').hidden = true; $('#drop').hidden = false;
      resetPreview(); err('Could not read that file. ' + (ex.message || ''));
      update();
    }
  }
  $('#file').onchange = ev => { loadFile(ev.target.files[0]); ev.target.value = ''; };
  const drop = $('#drop');
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => loadFile(e.dataTransfer.files[0]));

  /* ---------- add to order ---------- */
  $('#add').onclick = () => {
    if (!S.file || !S.sel.length) return;
    const qty = S.sel.length * S.copies;
    const rangeTx = S.range === 'all' ? 'All pages' : `Pages ${compact(S.sel)}`;
    const detail = `${S.file.name} · ${S.size} · ${S.color === 'bw' ? 'B&W' : 'Color'} · ${rangeTx} (${S.sel.length}) × ${S.copies}`;
    // The file itself is not stored yet; it will be uploaded to the server (PHP) at checkout.
    const ok = Cart.add({ key: 'paper|' + Date.now(), id: 'paper', name: 'Paper Print', detail, price: unit(), art: 'paper', bg: 'bg-blue', unit: 'page' }, qty);
    if (!ok) return toast('Could not save. Browser storage is full.');
    toast('Added to your order');
    $('#addHint').innerHTML = 'Added! <a class="linkbtn" href="order.html?type=product&open=cart">View your order</a> or upload another file.';
  };

  /* ---------- price list + paper guide ---------- */
  $('#priceTables').innerHTML = Object.keys(prices).map(g => `
    <h4 class="pt-h">${PriceStore.GROUPS[g]}</h4>
    <div class="pt-wrap"><table class="pt"><thead><tr><th>Size</th><th>Dimensions</th><th>Paper used</th><th>Best for</th><th>B&amp;W</th><th>Color</th></tr></thead><tbody>
    ${Object.entries(prices[g]).map(([z, v]) => { const m = PriceStore.META[z] || {}; return `<tr><td><b>${z}</b></td><td>${m.mm || ''}</td><td>${m.stock || ''}</td><td>${m.use || ''}</td><td>${pesoFmt(v.bw)}</td><td>${pesoFmt(v.color)}</td></tr>`; }).join('')}
    </tbody></table></div>`).join('');

  renderSizes();
})();
