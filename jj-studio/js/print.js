(() => {
  const $ = s => document.querySelector(s);
  const MAX_MB = 25;
  const prices = PriceStore.load();
  const S = { type: 'regular', size: 'Short (Letter)', color: 'bw', copies: 1, file: null, pages: 0 };

  if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  /* ---------- step switching ---------- */
  const showPaper = () => { $('#stepCategory').hidden = true; $('#stepPaper').hidden = false; window.scrollTo({ top: 0, behavior: 'smooth' }); };
  $('#catPaper').onclick = showPaper;
  $('#catShirt').onclick = () => { $('#soonMsg').hidden = false; };
  $('#backCat').onclick = () => { $('#stepPaper').hidden = true; $('#stepCategory').hidden = false; };
  if (new URLSearchParams(location.search).get('cat') === 'paper') showPaper();

  /* ---------- paper type / size / color ---------- */
  function renderSizes() {
    const sizes = Object.keys(prices[S.type]);
    if (!sizes.includes(S.size)) S.size = sizes.includes('A4') ? 'A4' : sizes[0];
    $('#sizeChips').innerHTML = sizes.map(z => `<button class="chip ${z === S.size ? 'on' : ''}" data-size="${z}" type="button">${z}</button>`).join('');
    $('#sizeChips').querySelectorAll('.chip').forEach(b => b.onclick = () => { S.size = b.dataset.size; renderSizes(); update(); });
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

  /* ---------- summary ---------- */
  const unit = () => prices[S.type][S.size][S.color];
  function update() {
    const p = prices[S.type][S.size];
    $('#pBw').textContent = pesoFmt(p.bw) + ' / page';
    $('#pColor').textContent = pesoFmt(p.color) + ' / page';
    document.querySelectorAll('#colorGrid .color-opt').forEach(b => b.classList.toggle('on', b.dataset.color === S.color));
    $('#copies').textContent = S.copies;
    const ready = !!S.file && S.pages > 0;
    $('#optCard').removeAttribute('aria-disabled');
    $('#sFile').textContent = S.file ? S.file.name : '—';
    $('#sPaper').textContent = S.size + (S.type === 'aseries' ? ' (A-Series)' : ' (Bond)');
    $('#sColor').textContent = S.color === 'bw' ? 'Black & White' : 'Colored';
    $('#sQty').textContent = ready ? `${S.pages} × ${S.copies} = ${S.pages * S.copies}` : '—';
    $('#sUnit').textContent = pesoFmt(unit());
    $('#sTotal').textContent = pesoFmt(ready ? unit() * S.pages * S.copies : 0);
    $('#add').disabled = !ready;
    $('#addHint').textContent = ready ? 'Looks good? Add it to your order.' : 'Upload a file to continue.';
  }

  /* ---------- file loading ---------- */
  const err = m => { const e = $('#err'); e.textContent = m || ''; e.hidden = !m; };
  const ext = n => (n.split('.').pop() || '').toLowerCase();

  async function pdfInfo(file) {
    if (!window.pdfjsLib) throw new Error('PDF reader could not load. Check your internet connection.');
    const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    let thumb = null;
    try {
      const page = await doc.getPage(1), vp0 = page.getViewport({ scale: 1 }), scale = 160 / vp0.width, vp = page.getViewport({ scale });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; thumb = c;
    } catch (e) {}
    return { pages: doc.numPages, note: 'Counted from your PDF.', thumb };
  }
  async function docxInfo(file) {
    if (!window.JSZip) throw new Error('Word reader could not load. Check your internet connection.');
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    let pages = 0, note = '';
    const app = zip.file('docProps/app.xml');
    if (app) { const m = /<Pages>(\d+)<\/Pages>/.exec(await app.async('string')); if (m) { pages = +m[1]; note = 'Read from your Word file.'; } }
    if (!pages) {
      const body = zip.file('word/document.xml');
      const words = body ? ((await body.async('string')).replace(/<[^>]+>/g, ' ').match(/\S+/g) || []).length : 0;
      pages = Math.max(1, Math.ceil(words / 450)); note = 'Estimated. Please check the page count.';
    }
    return { pages, note, thumb: null };
  }

  async function loadFile(file) {
    err('');
    if (!file) return;
    const e = ext(file.name);
    if (!['pdf', 'doc', 'docx'].includes(e)) return err('Please upload a PDF or Word file (.pdf, .doc, .docx).');
    if (file.size > MAX_MB * 1024 * 1024) return err(`That file is over ${MAX_MB} MB.`);
    $('#loaded').hidden = false; $('#drop').hidden = true;
    $('#fName').textContent = file.name; $('#fMeta').textContent = 'Loading…';
    $('#thumb').textContent = e === 'pdf' ? '📕' : '📘'; $('#pgNote').textContent = '';
    try {
      let info;
      if (e === 'pdf') info = await pdfInfo(file);
      else if (e === 'docx') info = await docxInfo(file);
      else info = { pages: 1, note: 'Old .doc files cannot be counted. Please enter the number of pages.', thumb: null };
      S.file = file; S.pages = info.pages;
      $('#pages').value = info.pages; $('#pgNote').textContent = info.note;
      $('#fMeta').textContent = `${e.toUpperCase()} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
      if (info.thumb) { const t = $('#thumb'); t.textContent = ''; t.appendChild(info.thumb); }
    } catch (ex) {
      S.file = null; S.pages = 0; $('#loaded').hidden = true; $('#drop').hidden = false;
      err('Could not read that file. ' + (ex.message || '')); 
    }
    update();
  }
  $('#file').onchange = ev => { loadFile(ev.target.files[0]); ev.target.value = ''; };
  const drop = $('#drop');
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => loadFile(e.dataTransfer.files[0]));

  /* ---------- add to order ---------- */
  $('#add').onclick = () => {
    if (!S.file) return;
    const qty = S.pages * S.copies;
    const detail = `${S.file.name} · ${S.size} · ${S.color === 'bw' ? 'B&W' : 'Colored'} · ${S.pages} pg × ${S.copies}`;
    // The file itself is not stored yet; it will be uploaded to the server (PHP) at checkout.
    const ok = Cart.add({ key: 'paper|' + Date.now(), id: 'paper', name: 'Paper Print', detail, price: unit(), art: 'paper', bg: 'bg-blue', unit: 'page' }, qty);
    if (!ok) return toast('Could not save. Browser storage is full.');
    toast('Added to your order');
    $('#addHint').innerHTML = 'Added! <a class="linkbtn" href="order.html?type=product&open=cart">View your order</a> or upload another file.';
  };

  /* ---------- price tables ---------- */
  $('#priceTables').innerHTML = Object.keys(prices).map(g => `
    <h4 class="pt-h">${PriceStore.GROUPS[g]}</h4>
    <div class="pt-wrap"><table class="pt"><thead><tr><th>Paper size</th><th>Black &amp; White</th><th>Colored</th></tr></thead><tbody>
    ${Object.entries(prices[g]).map(([z, v]) => `<tr><td>${z}</td><td>${pesoFmt(v.bw)}</td><td>${pesoFmt(v.color)}</td></tr>`).join('')}
    </tbody></table></div>`).join('');

  renderSizes();
})();
