/* Leer la Biblia page: this week's reading plan (data/lectura.json, from the
   bulletin) and a book / chapter / verse picker. Passages open in the
   Reina-Valera 1960 on YouVersion (Bible.com), which holds the license for
   that text; no Bible text is copied into this site.
   Needs main.js (PIBF), biblia-libros.js and biblia-ref.js. */
(function () {
  'use strict';
  var P = window.PIBF, B = window.BIBLIA;
  if (!P || !B || !document.getElementById('biblia')) return;
  var esc = P.esc;
  var DIAS7 = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  var EXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></svg>';
  var LAST = 'pibf-biblia-ultimo';

  // ---------- This week's reading ----------
  function chapters(refs) {
    var out = [];
    refs.forEach(function (r) {
      var single = B.book(r.code)[3].length === 1;
      if (r.vers) return out.push({ code: r.code, cap: r.cap, vers: r.vers, label: B.label(r) });
      for (var c = r.cap; c <= (r.capFin || r.cap); c++) out.push({ code: r.code, cap: c, label: single ? r.nombre : r.nombre + ' ' + c });
    });
    return out;
  }
  function chip(c) {
    return '<a class="bib-chip" href="' + esc(B.url(c.code, c.cap, c.vers)) + '" target="_blank" rel="noopener">' + esc(c.label) + EXT + '</a>';
  }
  var box = document.querySelector('.bib-week');
  // data/lectura.json holds several weeks ({semanas: [...]}; an older file
  // may be a single week). Show the week that contains today, else the most
  // recent one that has started, else the first upcoming one.
  function pickWeek(data) {
    var weeks = (data && data.semanas) || (data && data.dias ? [data] : []);
    var t = new Date(); t.setHours(0, 0, 0, 0);
    weeks = weeks.slice().sort(function (a, b) { return a.desde.localeCompare(b.desde); });
    var started = weeks.filter(function (w) { return P.parseDate(w.desde) <= t; });
    var cur = started[started.length - 1];
    if (cur) { var e = P.parseDate(cur.desde); e.setDate(e.getDate() + 6); if (e >= t) return cur; }
    return weeks.filter(function (w) { return P.parseDate(w.desde) > t; })[0] || cur || { desde: '', dias: [] };
  }
  P.loadData('lectura.json').then(function (data) {
    var d = pickWeek(data);
    if (!d.desde) throw new Error('sin semanas');
    var start = P.parseDate(d.desde), today = new Date(); today.setHours(0, 0, 0, 0);
    var end = new Date(start); end.setDate(end.getDate() + 6);
    var rows = (d.dias || []).slice(0, 7).map(function (text, i) {
      var day = new Date(start); day.setDate(day.getDate() + i);
      var isToday = +day === +today;
      var chs = chapters(B.parse(text));
      return { i: i, day: day, isToday: isToday, chs: chs, text: text };
    });
    var t = rows.filter(function (r) { return r.isToday; })[0];
    var range = start.getMonth() === end.getMonth()
      ? 'Del ' + start.getDate() + ' al ' + end.getDate() + ' de ' + P.MESES[end.getMonth()]
      : 'Del ' + start.getDate() + ' de ' + P.MESES[start.getMonth()] + ' al ' + end.getDate() + ' de ' + P.MESES[end.getMonth()];
    box.innerHTML =
      (t ? '<div class="bib-today"><p class="bib-kicker">Lectura de hoy · ' + esc(DIAS7[t.i]) + ' ' + t.day.getDate() + ' de ' + esc(P.MESES[t.day.getMonth()]) + '</p>' +
        '<div class="bib-chips big">' + t.chs.map(chip).join('') + '</div></div>' : '') +
      '<div class="bib-week-head"><h2>Lectura bíblica de la semana</h2><p>' + esc(range) +
      (d.boletin ? ' · <a href="' + esc(P.imageUrl(d.boletin)) + '" target="_blank" rel="noopener">Ver el boletín</a>' : '') + '</p></div>' +
      '<ol class="bib-days">' + rows.map(function (r) {
        return '<li class="' + (r.isToday ? 'today' : '') + (r.day < today ? ' past' : '') + '">' +
          '<span class="bib-day"><strong>' + esc(DIAS7[r.i]) + '</strong> ' + r.day.getDate() + ' de ' + esc(P.MESES[r.day.getMonth()]) + (r.isToday ? ' <em>Hoy</em>' : '') + '</span>' +
          '<span class="bib-chips">' + (r.chs.length ? r.chs.map(chip).join('') : esc(r.text)) + '</span></li>';
      }).join('') + '</ol>';
  }).catch(function () { box.innerHTML = '<p class="bib-none">No se pudo cargar la lectura de la semana.</p>'; });

  // ---------- Book / chapter / verse picker ----------
  var root = document.querySelector('.bib-picker');
  var sel = { code: 'JHN', cap: 1, vers: null };
  try { var saved = JSON.parse(localStorage.getItem(LAST) || 'null'); if (saved && B.book(saved.code)) { sel.code = saved.code; sel.cap = saved.cap || 1; } } catch (e) {}

  var bookSel = root.querySelector('select');
  bookSel.innerHTML = [['AT', 'Antiguo Testamento'], ['NT', 'Nuevo Testamento']].map(function (g) {
    return '<optgroup label="' + g[1] + '">' + B.libros.filter(function (b) { return b[2] === g[0]; }).map(function (b) {
      return '<option value="' + b[0] + '">' + esc(b[1]) + '</option>';
    }).join('') + '</optgroup>';
  }).join('');

  function draw() {
    var b = B.book(sel.code), nCh = b[3].length;
    if (sel.cap > nCh) sel.cap = 1;
    bookSel.value = sel.code;
    var caps = '';
    for (var c = 1; c <= nCh; c++) caps += '<button type="button" data-cap="' + c + '" aria-pressed="' + (c === sel.cap) + '">' + c + '</button>';
    root.querySelector('.bib-caps').innerHTML = caps;
    root.querySelector('.bib-caps-label').textContent = 'Capítulo' + (nCh > 1 ? ' (' + nCh + ')' : '');
    var nV = b[3][sel.cap - 1], vs = '';
    for (var v = 1; v <= nV; v++) vs += '<button type="button" data-vers="' + v + '" aria-pressed="' + (v === sel.vers) + '">' + v + '</button>';
    root.querySelector('.bib-vers').innerHTML = vs;
    root.querySelector('.bib-vers-label').textContent = 'Versículo (opcional) · ' + nV + ' en total';
    var label = (nCh === 1 ? b[1] + ' 1' : b[1] + ' ' + sel.cap) + (sel.vers ? ':' + sel.vers : '');
    var go = root.querySelector('.bib-go');
    go.href = B.url(sel.code, sel.cap, sel.vers);
    go.querySelector('span').textContent = 'Leer ' + label;
    try { localStorage.setItem(LAST, JSON.stringify({ code: sel.code, cap: sel.cap })); } catch (e) {}
  }
  bookSel.addEventListener('change', function () { sel.code = bookSel.value; sel.cap = 1; sel.vers = null; draw(); });
  root.addEventListener('click', function (e) {
    var t = e.target.closest('[data-cap],[data-vers]');
    if (!t) return;
    if (t.dataset.cap) { sel.cap = +t.dataset.cap; sel.vers = null; }
    else sel.vers = +t.dataset.vers === sel.vers ? null : +t.dataset.vers;
    draw();
  });

  // Quick search: "Juan 3:16", "Sal 23", "1 Co 13"
  var form = document.querySelector('.bib-search');
  var msg = form.querySelector('.bib-msg');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = form.querySelector('input').value;
    var r = B.parse(q)[0];
    if (!r) { msg.textContent = 'No se encontró “' + q + '”. Pruebe, por ejemplo: Juan 3:16 o Salmos 23.'; msg.hidden = false; return; }
    msg.hidden = true;
    sel = { code: r.code, cap: r.cap, vers: r.vers || null };
    draw();
    window.open(B.url(r.code, r.cap, r.vers), '_blank', 'noopener');
  });

  draw();
})();
