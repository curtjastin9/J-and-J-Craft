(() => {
  const $ = s => document.querySelector(s);
  const MAX_MB = 25, MAX_PREVIEW = 100;
  const prices = PriceStore.load();
  const S = {
    type: 'regular', size: 'A4', color: 'bw', copies: 1,
    file: null, ext: '', buf: null, pdf: null, pages: 0,
    range: 'all', custom: '', sel: [], token: 0, ratio: 1.414, io: null
  };
  const V = { open: false, n: 1, zoom: 1, token: 0, task: null };

  if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  /* render queue: one page at a time so the preview fills in smoothly */
  let chain = Promise.resolve();
  const enqueue = fn => { chain = chain.then(fn).catch(() => {}); };

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
      : S.sel.length ? `${S.sel.length} of ${S.pages} page${S.pages === 1 ? '' : 's'} selected.`
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
    $('#pvExpand').hidden = !(S.file && (S.pdf || S.ext === 'docx'));
    if (V.open) viewerBadge();
  }

  /* ---------- preview helpers ---------- */
  const err = m => { const e = $('#err'); e.textContent = m || ''; e.hidden = !m; };
  const ext = n => (n.split('.').pop() || '').toLowerCase();

  function resetPreview(msg) {
    if (S.io) { S.io.disconnect(); S.io = null; }
    $('#pvPages').innerHTML = ''; $('#pvPages').hidden = true;
    $('#pvDocx').innerHTML = ''; $('#pvDocx').hidden = true;
    $('#pvEmpty').hidden = false; $('#pvEmptyTx').textContent = msg || 'Your file will appear here after you upload it.';
    $('#pvNote').textContent = '';
  }

  /* One page thumbnail. Called lazily when the placeholder scrolls into view. */
  async function renderThumb(n, fig, token) {
    if (token !== S.token || !S.pdf) return;
    const page = await S.pdf.getPage(n);
    if (token !== S.token) return;
    const vp0 = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: (300 * Math.min(window.devicePixelRatio || 1, 2)) / vp0.width });
    const c = document.createElement('canvas'); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    if (token !== S.token) return;
    const sheet = fig.querySelector('.pv-sheet');
    sheet.style.aspectRatio = 'auto'; sheet.classList.remove('sk'); sheet.replaceChildren(c);
    if (n === 1) {
      const t = $('#thumb'); t.textContent = '';
      const tc = document.createElement('canvas'); tc.width = c.width; tc.height = c.height;
      tc.getContext('2d').drawImage(c, 0, 0); t.appendChild(tc);
    }
  }

  async function renderPdfPreview(doc, token) {
    const box = $('#pvPages');
    $('#pvEmpty').hidden = true; box.innerHTML = ''; box.hidden = false;
    try { const p1 = await doc.getPage(1), v = p1.getViewport({ scale: 1 }); S.ratio = v.height / v.width; } catch (e) {}
    if (token !== S.token) return;

    // Placeholders appear instantly; pages paint in as they are rendered
    const total = Math.min(doc.numPages, MAX_PREVIEW), frag = document.createDocumentFragment();
    for (let n = 1; n <= total; n++) {
      const fig = document.createElement('figure');
      fig.className = 'pv-pg'; fig.dataset.n = n; fig.tabIndex = 0; fig.setAttribute('role', 'button');
      fig.setAttribute('aria-label', `Enlarge page ${n}`);
      fig.innerHTML = `<div class="pv-sheet sk" style="aspect-ratio:1/${S.ratio.toFixed(4)}"></div><figcaption>Page ${n}</figcaption>`;
      frag.appendChild(fig);
    }
    if (doc.numPages > total) {
      const more = document.createElement('p'); more.className = 'pv-more';
      more.textContent = `Showing the first ${total} of ${doc.numPages} pages. All pages will still print.`; frag.appendChild(more);
    }
    box.appendChild(frag);
    $('#pvNote').textContent = `${doc.numPages} page${doc.numPages === 1 ? '' : 's'}`;

    S.io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      const fig = en.target; S.io.unobserve(fig);
      enqueue(() => renderThumb(+fig.dataset.n, fig, token));
    }), { root: $('#pvBody'), rootMargin: '400px 0px' });
    box.querySelectorAll('.pv-pg').forEach(f => S.io.observe(f));
    update();
  }

  const DOCX_OPTS = { className: 'docx', inWrapper: true, ignoreWidth: false, breakPages: true, ignoreLastRenderedPageBreak: true };
  async function renderDocxPreview(buf, token) {
    if (!(window.docx && docx.renderAsync)) throw new Error('Word preview could not load. Check your internet connection.');
    const host = $('#pvDocx'); host.innerHTML = ''; host.hidden = false; $('#pvEmpty').hidden = true;
    await docx.renderAsync(buf, host, null, DOCX_OPTS);
    if (token !== S.token) return;
    const sec = host.querySelector('section.docx'), wrap = host.querySelector('.docx-wrapper');
    if (sec && wrap) {
      const avail = $('#pvBody').clientWidth - 24, w = sec.offsetWidth || 816;
      wrap.style.zoom = Math.min(1, avail / w);
    }
    $('#pvNote').textContent = 'Word preview';
  }

  /* ---------- enlarged viewer ---------- */
  function viewerBadge() {
    const b = $('#vwBadge');
    if (!(S.ext === 'pdf' && S.pdf)) { b.hidden = true; return; }
    const on = S.sel.includes(V.n);
    b.hidden = false; b.textContent = on ? 'Will print' : 'Skipped'; b.className = 'vw-badge ' + (on ? 'yes' : 'no');
  }
  async function drawViewer() {
    const body = $('#vwBody'), t = ++V.token;
    $('#vwZoom').textContent = Math.round(V.zoom * 100) + '%';
    body.classList.add('busy');
    if (V.task) { try { V.task.cancel(); } catch (e) {} V.task = null; }
    try {
      if (S.ext === 'pdf' && S.pdf) {
        const n = V.n, total = S.pdf.numPages;
        $('#vwTitle').textContent = `Page ${n} of ${total}`;
        $('#vwPrev').hidden = $('#vwNext').hidden = false;
        $('#vwPrev').disabled = n <= 1; $('#vwNext').disabled = n >= total;
        viewerBadge();
        const page = await S.pdf.getPage(n);
        if (t !== V.token) return;
        const vp0 = page.getViewport({ scale: 1 }), dpr = Math.min(window.devicePixelRatio || 1, 2);
        const fit = Math.min((body.clientWidth - 40) / vp0.width, (body.clientHeight - 40) / vp0.height);
        const cssW = vp0.width * fit * V.zoom;
        let scale = cssW / vp0.width * dpr;
        const big = Math.max(vp0.width, vp0.height) * scale;
        if (big > 4096) scale *= 4096 / big;                      // keep the canvas a safe size
        const vp = page.getViewport({ scale });
        const c = document.createElement('canvas'); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
        c.style.width = cssW + 'px'; c.style.height = (cssW * vp0.height / vp0.width) + 'px';
        V.task = page.render({ canvasContext: c.getContext('2d'), viewport: vp });
        await V.task.promise;
        if (t !== V.token) return;
        body.replaceChildren(c);
      } else if (S.ext === 'docx' && S.buf) {
        $('#vwTitle').textContent = 'Word document';
        $('#vwPrev').hidden = $('#vwNext').hidden = true; $('#vwBadge').hidden = true;
        const host = document.createElement('div'); host.className = 'vw-docx';
        body.replaceChildren(host);
        await docx.renderAsync(S.buf.slice(0), host, null, DOCX_OPTS);
        if (t !== V.token) return;
        const sec = host.querySelector('section.docx'), wrap = host.querySelector('.docx-wrapper');
        if (sec && wrap) wrap.style.zoom = Math.min(1.4, (body.clientWidth - 40) / (sec.offsetWidth || 816)) * V.zoom;
      }
    } catch (e) {
      if (e && e.name === 'RenderingCancelledException') return;
      if (t === V.token) body.innerHTML = '<p class="vw-err">Could not show this page.</p>';
    }
    if (t === V.token) body.classList.remove('busy');
  }
  function openViewer(n) {
    if (!S.file || !(S.pdf || S.ext === 'docx')) return;
    V.open = true; V.n = n || 1; V.zoom = 1;
    $('#viewer').hidden = false; document.body.classList.add('noscroll');
    $('#vwBody').innerHTML = ''; drawViewer();
    $('#vwClose').focus();
  }
  function closeViewer() {
    if (!V.open) return;
    V.open = false; V.token++; $('#viewer').hidden = true; document.body.classList.remove('noscroll');
    if (V.task) { try { V.task.cancel(); } catch (e) {} V.task = null; }
    $('#vwBody').innerHTML = '';
  }
  const goPage = d => { if (!S.pdf) return; const n = Math.min(S.pdf.numPages, Math.max(1, V.n + d)); if (n !== V.n) { V.n = n; drawViewer(); } };
  const setZoom = z => { V.zoom = Math.min(4, Math.max(0.5, z)); drawViewer(); };

  $('#vwClose').onclick = closeViewer;
  $('#vwPrev').onclick = () => goPage(-1);
  $('#vwNext').onclick = () => goPage(1);
  $('#vwIn').onclick = () => setZoom(V.zoom + 0.25);
  $('#vwOut').onclick = () => setZoom(V.zoom - 0.25);
  $('#vwFit').onclick = () => setZoom(1);
  $('#vwBody').addEventListener('click', e => { if (e.target === $('#vwBody')) closeViewer(); });
  $('#pvExpand').onclick = () => openViewer(1);
  $('#pvPages').addEventListener('click', e => { const f = e.target.closest('.pv-pg'); if (f) openViewer(+f.dataset.n); });
  $('#pvPages').addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const f = e.target.closest('.pv-pg'); if (f) { e.preventDefault(); openViewer(+f.dataset.n); }
  });
  $('#pvDocx').addEventListener('click', () => openViewer(1));
  document.addEventListener('keydown', e => {
    if (!V.open) return;
    if (e.key === 'Escape') closeViewer();
    else if (e.key === 'ArrowLeft') goPage(-1);
    else if (e.key === 'ArrowRight') goPage(1);
    else if (e.key === '+' || e.key === '=') setZoom(V.zoom + 0.25);
    else if (e.key === '-') setZoom(V.zoom - 0.25);
    else if (e.key === '0') setZoom(1);
  });
  let rz; window.addEventListener('resize', () => { if (!V.open) return; clearTimeout(rz); rz = setTimeout(drawViewer, 200); });

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
    closeViewer();
    if (S.pdf) { try { S.pdf.destroy(); } catch (x) {} }
    S.pdf = null; S.buf = null; S.ext = e;
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
      S.buf = buf; S.pdf = pdfDoc;
      S.pages = pages; $('#pages').value = pages; $('#pgNote').textContent = note;
      $('#fMeta').textContent = `${e.toUpperCase()} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
      update();
      if (e === 'pdf') await renderPdfPreview(pdfDoc, token);
      else if (e === 'docx') {
        try { await renderDocxPreview(buf.slice(0), token); }
        catch (ex) { resetPreview('Preview is not available for this Word file, but you can still print it.'); }
      } else resetPreview('Preview is not available for old .doc files. You can still print it.');
      update();
    } catch (ex) {
      if (token !== S.token) return;
      S.file = null; S.pages = 0; S.pdf = null; S.buf = null;
      $('#loaded').hidden = true; $('#drop').hidden = false;
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
