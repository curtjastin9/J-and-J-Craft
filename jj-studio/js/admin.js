(() => {
  const $ = s => document.querySelector(s);
  const PW_KEY = 'jj_admin_pw_v1', SESSION = 'jj_admin_ok';
  const DEFAULT_PW = 'admin123'; // placeholder: change it below after logging in, then replace with a real PHP login
  const getPw = () => localStorage.getItem(PW_KEY) || DEFAULT_PW;

  let okTimer;
  function flashSaved() {
    $('#ok').hidden = false;
    clearTimeout(okTimer);
    okTimer = setTimeout(() => $('#ok').hidden = true, 2000);
  }

  /* ----- section templates ----- */
  const priceTables = p => Object.keys(p).map(g => `
    <div class="pr-card" style="margin-bottom:18px">
      <h3 style="margin-bottom:10px">${PriceStore.GROUPS[g]}</h3>
      <div class="pt-wrap"><table class="pt"><thead><tr><th>Paper size</th><th>Black &amp; White (₱)</th><th>Colored (₱)</th></tr></thead><tbody>
      ${Object.entries(p[g]).map(([z, v]) => `<tr><td>${z}</td>
        <td><input class="ad-in" type="number" min="0" step="0.5" data-g="${g}" data-s="${z}" data-k="bw" value="${v.bw}"></td>
        <td><input class="ad-in" type="number" min="0" step="0.5" data-g="${g}" data-s="${z}" data-k="color" value="${v.color}"></td></tr>`).join('')}
      </tbody></table></div>
    </div>`).join('');

  const mugColorsCard = () => `
    <div class="pr-card" style="margin-bottom:18px">
      <h3>Mug colors</h3>
      <p class="muted" style="margin-top:4px">Customers can only pick the colors that are switched on. Switched-off colors appear grayed out. Changes apply immediately.</p>
      <div class="mc-list">
        ${MugColors.ALL.map(([name, hex]) => {
          const locked = name === MugColors.ALWAYS, on = MugColors.isEnabled(name);
          return `<label class="mc-row ${locked ? 'locked' : ''}">
            <i class="mc-dot" style="--c:${hex}"></i>
            <span class="mc-name">${name}<small>${locked ? 'Always available' : on ? 'Available to customers' : 'Grayed out for customers'}</small></span>
            <input type="checkbox" class="mc-toggle" data-name="${name}" ${on ? 'checked' : ''} ${locked ? 'disabled' : ''}>
            <span class="mc-switch"></span>
          </label>`;
        }).join('')}
      </div>
    </div>`;

  const passwordCard = () => `
    <div class="pr-card"><h3 style="margin-bottom:8px">Change admin password</h3>
      <input class="ad-in" style="width:100%;max-width:280px;text-align:left" type="password" id="newPw" placeholder="New password (min 6 characters)">
      <button class="btn btn-ghost btn-sm" id="pwBtn" type="button" style="margin-left:8px">Update</button></div>`;

  /* ----- render + wiring ----- */
  function render() {
    $('#tables').innerHTML = priceTables(PriceStore.load()) + mugColorsCard() + passwordCard();

    document.querySelectorAll('.mc-toggle').forEach(box => box.onchange = () => {
      MugColors.set(box.dataset.name, box.checked);
      box.closest('.mc-row').querySelector('small').textContent = box.checked ? 'Available to customers' : 'Grayed out for customers';
      flashSaved();
    });

    $('#pwBtn').onclick = () => {
      const v = $('#newPw').value;
      if (v.length < 6) return alert('Password must be at least 6 characters.');
      localStorage.setItem(PW_KEY, v); $('#newPw').value = ''; alert('Password updated.');
    };
  }

  function show(ok) {
    $('#login').hidden = ok; $('#editor').hidden = !ok; $('#logout').hidden = !ok;
    if (ok) render();
  }

  $('#go').onclick = () => {
    if ($('#pw').value === getPw()) { sessionStorage.setItem(SESSION, '1'); $('#loginErr').hidden = true; show(true); }
    else $('#loginErr').hidden = false;
  };
  $('#pw').addEventListener('keydown', e => e.key === 'Enter' && $('#go').click());
  $('#logout').onclick = () => { sessionStorage.removeItem(SESSION); show(false); };

  $('#save').onclick = () => {
    const p = PriceStore.load();
    let bad = false;
    document.querySelectorAll('.ad-in[data-g]').forEach(i => {
      const v = parseFloat(i.value);
      if (!isFinite(v) || v < 0) { bad = true; i.style.borderColor = '#d92332'; return; }
      i.style.borderColor = ''; p[i.dataset.g][i.dataset.s][i.dataset.k] = v;
    });
    if (bad) return alert('Please enter a valid price (0 or more) in every box.');
    PriceStore.save(p);
    flashSaved();
  };
  $('#reset').onclick = () => { if (confirm('Reset all paper prices to the default list?')) { PriceStore.reset(); render(); } };

  show(sessionStorage.getItem(SESSION) === '1');
})();
