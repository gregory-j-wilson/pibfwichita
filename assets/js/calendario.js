/* Calendario page: month grid + upcoming events, from data/eventos.json
   (managed from /admin/). Needs main.js loaded first (window.PIBF). */
(function () {
  'use strict';
  var root = document.getElementById('calendario');
  var P = window.PIBF;
  if (!root || !P) return;
  var esc = P.esc;

  var CATS = {
    servicio: 'Servicio',
    especial: 'Evento especial',
    conferencia: 'Conferencia',
    actividad: 'Actividad',
    otro: 'Otro'
  };
  var I_CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
  var I_PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';

  var events = [];
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var view = new Date(today.getFullYear(), today.getMonth(), 1);
  var showServices = true;
  try { showServices = localStorage.getItem('pibf-cal-servicios') !== '0'; } catch (e) {}
  var selected = null; // Date selected on small screens

  function key(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function isService(ev) { return ev.repetir === 'semanal'; }

  // All events happening on a given day, sorted by time
  function on(d) {
    var k = key(d), out = [];
    events.forEach(function (ev) {
      if (ev.repetir === 'semanal') {
        if (!showServices) return;
        var start = P.parseDate(ev.fecha);
        var until = ev.repetirHasta ? P.parseDate(ev.repetirHasta) : null;
        if (d >= start && (!until || d <= until) && d.getDay() === start.getDay() && (ev.excepciones || []).indexOf(k) === -1) out.push(ev);
      } else if (k >= ev.fecha && k <= (ev.fechaFin || ev.fecha)) out.push(ev);
    });
    return out.sort(function (a, b) { return (a.hora || '00:00').localeCompare(b.hora || '00:00'); });
  }

  function chip(ev) {
    return '<button type="button" class="cal-ev cat-' + esc(ev.categoria || 'otro') + '" data-id="' + esc(ev.id) + '">' +
      (ev.hora ? '<span class="cal-ev-time">' + esc(P.fmtTime(ev.hora).replace(' ', '')) + '</span> ' : '') + esc(ev.titulo) + '</button>';
  }

  function render() {
    var y = view.getFullYear(), m = view.getMonth();
    var first = new Date(y, m, 1), startDow = first.getDay();
    var days = new Date(y, m + 1, 0).getDate();
    var cells = '';
    ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].forEach(function (d) { cells += '<div class="cal-dow" aria-hidden="true">' + d + '</div>'; });
    for (var i = 0; i < startDow; i++) cells += '<div class="cal-cell cal-empty"></div>';
    for (var day = 1; day <= days; day++) {
      var d = new Date(y, m, day), evs = on(d);
      var cls = 'cal-cell' + (+d === +today ? ' cal-today' : '') + (d < today ? ' cal-past' : '') + (selected && +d === +selected ? ' cal-selected' : '') + (evs.length ? ' cal-has' : '');
      var label = P.fmtDay(d) + (evs.length ? ', ' + evs.length + (evs.length === 1 ? ' evento' : ' eventos') : '');
      cells += '<div class="' + cls + '">' +
        '<button type="button" class="cal-daynum" data-day="' + key(d) + '" aria-label="' + esc(label) + '">' + day + '</button>' +
        '<div class="cal-evs">' + evs.slice(0, 3).map(chip).join('') +
        (evs.length > 3 ? '<button type="button" class="cal-more" data-day="' + key(d) + '">+' + (evs.length - 3) + ' más</button>' : '') + '</div>' +
        '<div class="cal-dots" aria-hidden="true">' + evs.slice(0, 4).map(function (ev) { return '<span class="cat-' + esc(ev.categoria || 'otro') + '"></span>'; }).join('') + '</div>' +
        '</div>';
    }
    root.querySelector('.cal-title').textContent = P.MESES[m].charAt(0).toUpperCase() + P.MESES[m].slice(1) + ' ' + y;
    root.querySelector('.cal-grid').innerHTML = cells;
    renderDay();
  }

  function row(ev, d) {
    return '<li><button type="button" class="cal-row" data-id="' + esc(ev.id) + '">' +
      '<span class="cal-row-bar cat-' + esc(ev.categoria || 'otro') + '"></span>' +
      '<span class="cal-row-main"><strong>' + esc(ev.titulo) + '</strong>' +
      '<span>' + esc(d ? P.fmtDay(d) + (ev.hora ? ' · ' + P.fmtTime(ev.hora) : '') : P.fmtWhen(ev)) + (ev.lugar ? ' · ' + esc(ev.lugar) : '') + '</span></span>' +
      '<span class="cal-row-cat">' + esc(CATS[ev.categoria] || CATS.otro) + '</span></button></li>';
  }

  function renderDay() {
    var box = root.querySelector('.cal-day');
    if (!selected) { box.hidden = true; return; }
    var evs = on(selected);
    box.hidden = false;
    box.innerHTML = '<h3>' + esc(P.fmtDay(selected)) + '</h3>' +
      (evs.length ? '<ul class="cal-list">' + evs.map(function (ev) { return row(ev, selected); }).join('') + '</ul>' : '<p class="cal-none">No hay eventos este día.</p>');
  }

  function renderUpcoming() {
    var list = events.filter(function (ev) { return !isService(ev) && P.parseDate(ev.fechaFin || ev.fecha) >= today; })
      .sort(function (a, b) { return (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || '')); });
    var box = root.querySelector('.cal-upcoming-list');
    box.innerHTML = list.length ? '<ul class="cal-list">' + list.slice(0, 12).map(function (ev) { return row(ev); }).join('') + '</ul>'
      : '<p class="cal-none">No hay eventos especiales próximos por ahora. ¡Vuelva pronto!</p>';
    var svc = events.filter(isService).sort(function (a, b) {
      return (P.parseDate(a.fecha).getDay() - P.parseDate(b.fecha).getDay()) || (a.hora || '').localeCompare(b.hora || '');
    });
    root.querySelector('.cal-weekly').innerHTML = svc.map(function (ev) {
      return '<li><span>' + esc(P.DIAS[P.parseDate(ev.fecha).getDay()]) + '</span> ' + esc(ev.titulo) + (ev.hora ? ' — ' + esc(P.fmtTime(ev.hora)) : '') + '</li>';
    }).join('');
  }

  // Event details pop-up
  var dialog = document.createElement('dialog');
  dialog.className = 'aviso-dialog cal-dialog';
  document.body.appendChild(dialog);
  dialog.addEventListener('click', function (e) { if (e.target === dialog || e.target.closest('.aviso-close')) dialog.close(); });
  function open(id) {
    var ev = events.filter(function (x) { return x.id === id; })[0];
    if (!ev) return;
    var imgs = (ev.imagenes || []).slice().sort(function (x, y) { return (x.idioma === 'en') - (y.idioma === 'en'); });
    var details = '<div class="aviso-details">' +
      '<p class="aviso-row">' + I_CAL + '<span>' + esc(P.fmtWhen(ev)) + '</span></p>' +
      (ev.lugar ? '<p class="aviso-row">' + I_PIN + '<span>' + esc(ev.lugar) + '</span></p>' : '') +
      (ev.descripcion ? '<p class="aviso-desc">' + esc(ev.descripcion) + '</p>' : '') + '</div>';
    var pics = imgs.length ? '<div class="aviso-imgs' + (imgs.length === 1 ? ' one' : '') + '">' + imgs.map(function (im) {
      return '<img src="' + esc(P.imageUrl(im.src)) + '" alt="' + esc(im.alt || ev.titulo) + '">';
    }).join('') + '</div>' : '';
    dialog.classList.toggle('has-details', !imgs.length);
    dialog.setAttribute('aria-label', ev.titulo);
    dialog.innerHTML = '<button type="button" class="aviso-close" aria-label="Cerrar">&times;</button>' +
      '<div class="aviso-inner"><h2>' + esc(ev.titulo) + '</h2>' + details + (pics ? '<div class="cal-pics">' + pics + '</div>' : '') + '</div>';
    var pair = dialog.querySelector('.aviso-imgs');
    if (pair && P.posterToggle) P.posterToggle(pair);
    dialog.showModal();
  }

  root.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-id]'))) return open(t.getAttribute('data-id'));
    if ((t = e.target.closest('[data-day]'))) { selected = P.parseDate(t.getAttribute('data-day')); render(); root.querySelector('.cal-day').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
    if ((t = e.target.closest('[data-nav]'))) {
      var n = t.getAttribute('data-nav');
      view = n === 'hoy' ? new Date(today.getFullYear(), today.getMonth(), 1) : new Date(view.getFullYear(), view.getMonth() + (n === 'next' ? 1 : -1), 1);
      if (n === 'hoy') selected = today;
      render();
    }
  });
  root.querySelector('.cal-services input').addEventListener('change', function (e) {
    showServices = e.target.checked;
    try { localStorage.setItem('pibf-cal-servicios', showServices ? '1' : '0'); } catch (err) {}
    render();
  });
  root.querySelector('.cal-services input').checked = showServices;

  P.loadData('eventos.json').then(function (d) {
    events = (d && d.eventos) || [];
    root.classList.remove('cal-loading');
    render(); renderUpcoming();
  }).catch(function () {
    root.classList.remove('cal-loading');
    root.querySelector('.cal-grid').innerHTML = '<p class="cal-none">No se pudo cargar el calendario. Intente de nuevo más tarde.</p>';
  });
  render();
})();
