/* PIBF Wichita — mobile menu, photo gallery, bulletins */
(function () {
  'use strict';

  // ---------- Mobile menu ----------
  var nav = document.querySelector('.main-nav');
  var toggle = document.querySelector('.nav-toggle');
  if (nav && toggle) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ---------- Footer year ----------
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // ---------- Gallery: filters + pagination + lightbox ----------
  var gallery = document.querySelector('.gallery');
  if (gallery) {
    var all = Array.prototype.slice.call(gallery.querySelectorAll('figure'));
    var items = all.slice(); // the photos in the current filter
    var perPage = parseInt(gallery.getAttribute('data-per-page') || '0', 10);
    var pager = document.querySelector('.pager');
    var pageCount = 1;

    function showPage(n) {
      all.forEach(function (fig) { fig.hidden = true; });
      items.forEach(function (fig, i) {
        fig.hidden = perPage ? Math.floor(i / perPage) !== n : false;
      });
      if (!pager) return;
      pager.querySelectorAll('[data-page]').forEach(function (b) {
        b.setAttribute('aria-current', String(+b.getAttribute('data-page') === n));
      });
      var next = pager.querySelector('.next');
      var prev = pager.querySelector('.prev');
      if (next) { next.disabled = n >= pageCount - 1; next.onclick = function () { go(n + 1); }; }
      if (prev) { prev.disabled = n <= 0; prev.onclick = function () { go(n - 1); }; }
    }
    function go(n) {
      showPage(n);
      gallery.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function buildPager() {
      pageCount = perPage ? Math.max(1, Math.ceil(items.length / perPage)) : 1;
      if (!pager) return;
      if (pageCount < 2) { pager.innerHTML = ''; pager.hidden = true; return; }
      pager.hidden = false;
      var html = '<button type="button" class="prev">Anterior</button>';
      for (var p = 0; p < pageCount; p++) {
        html += '<button type="button" data-page="' + p + '">' + (p + 1) + '</button>';
      }
      html += '<button type="button" class="next">Siguiente</button>';
      pager.innerHTML = html;
      pager.querySelectorAll('[data-page]').forEach(function (b) {
        b.addEventListener('click', function () { go(+b.getAttribute('data-page')); });
      });
    }
    buildPager();
    showPage(0);

    // Category filter pills
    var filters = document.querySelector('.gallery-filters');
    if (filters) {
      filters.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-filter]');
        if (!btn) return;
        var f = btn.getAttribute('data-filter');
        filters.querySelectorAll('[data-filter]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });
        items = all.filter(function (fig) { return f === 'all' || fig.getAttribute('data-cat') === f; });
        buildPager();
        showPage(0);
      });
    }

    // Lightbox
    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Foto');
    lb.innerHTML =
      '<button type="button" class="lb-close" aria-label="Cerrar">&times;</button>' +
      '<button type="button" class="lb-prev" aria-label="Anterior">&#8249;</button>' +
      '<figure><img alt=""><figcaption></figcaption></figure>' +
      '<button type="button" class="lb-next" aria-label="Siguiente">&#8250;</button>';
    document.body.appendChild(lb);
    var lbImg = lb.querySelector('img');
    var lbCap = lb.querySelector('figcaption');
    var current = 0;
    var lastFocus = null;

    function open(i) {
      current = (i + items.length) % items.length;
      var btn = items[current].querySelector('button');
      var cap = items[current].querySelector('figcaption');
      lbImg.src = btn.getAttribute('data-full');
      lbImg.alt = cap ? cap.textContent : '';
      lbCap.textContent = cap ? cap.textContent : '';
      if (!lb.classList.contains('open')) {
        lastFocus = document.activeElement;
        lb.classList.add('open');
        document.body.style.overflow = 'hidden';
        lb.querySelector('.lb-close').focus();
      }
    }
    function close() {
      lb.classList.remove('open');
      document.body.style.overflow = '';
      lbImg.removeAttribute('src');
      if (lastFocus) lastFocus.focus();
    }

    all.forEach(function (fig) {
      fig.querySelector('button').addEventListener('click', function () { open(items.indexOf(fig)); });
    });
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.querySelector('.lb-prev').addEventListener('click', function () { open(current - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { open(current + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') open(current - 1);
      if (e.key === 'ArrowRight') open(current + 1);
    });
    var startX = null;
    lb.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) open(current + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  // ---------- Bulletins ----------
  var bulletinCard = document.getElementById('bulletin-latest');
  if (bulletinCard && window.BOLETINES && window.BOLETINES.length) {
    var list = window.BOLETINES;
    var base = document.body.getAttribute('data-base') || '';
    var latest = list[0];
    bulletinCard.href = base + latest.archivo;
    bulletinCard.querySelector('.date').textContent = latest.fecha;
    bulletinCard.querySelector('.day').textContent = latest.dia || 'Domingo';

    var archive = document.getElementById('bulletin-archive');
    if (archive && list.length > 1) {
      var ul = archive.querySelector('ul');
      list.slice(1).forEach(function (b) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = base + b.archivo;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = b.fecha;
        li.appendChild(a);
        ul.appendChild(li);
      });
      archive.hidden = false;
    }
  }

  // ---------- Versículo del Día + nature photo (home page) ----------
  // The verse comes from assets/js/versiculos.js. The photo is a featured
  // nature picture from Wikimedia Commons, the same one all day for everyone.
  (function () {
    var textEl = document.getElementById('vdd-text');
    if (!textEl) return;
    var now = new Date();
    var dayNum = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5);
    var dayKey = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
    var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    var dateEl = document.getElementById('vdd-date');
    if (dateEl) {
      var d = DIAS[now.getDay()];
      dateEl.textContent = d.charAt(0).toUpperCase() + d.slice(1) + ', ' + now.getDate() + ' de ' + MESES[now.getMonth()] + ' de ' + now.getFullYear();
    }
    var list = window.VERSICULOS || [];
    if (list.length) {
      var v = list[dayNum % list.length];
      textEl.textContent = '“' + v.texto + '”';
      document.getElementById('vdd-ref').textContent = v.ref + ' (RVR1960)';
    }

    var fig = document.getElementById('vdd-photo');
    if (!fig || !window.fetch) return;
    var section = fig.parentNode;
    var API = 'https://commons.wikimedia.org/w/api.php?format=json&formatversion=2&origin=*&';
    var CATS = [
      'Featured pictures of landscapes',
      'Featured pictures of mountains',
      'Featured pictures of waterfalls',
      'Featured pictures of forests',
      'Featured pictures of lakes',
      'Featured pictures of flowers',
      'Featured pictures of beaches'
    ];
    var CACHE = 'pibf-foto-del-dia';

    function show(photo) {
      var img = fig.querySelector('img');
      img.onload = function () { fig.hidden = false; section.classList.add('has-photo'); };
      img.onerror = function () { fig.hidden = true; };
      img.src = photo.src;
      img.alt = photo.alt || 'Foto de la naturaleza';
      var cap = fig.querySelector('figcaption');
      cap.textContent = '';
      var a = document.createElement('a');
      a.href = photo.page; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = 'Foto: ' + (photo.artist || 'Wikimedia Commons') + (photo.license ? ' · ' + photo.license : '') + ' · Wikimedia Commons';
      cap.appendChild(a);
    }
    function plain(html) {
      var div = document.createElement('div');
      div.innerHTML = html || '';
      return (div.textContent || '').replace(/\s+/g, ' ').trim();
    }

    try {
      var cached = JSON.parse(localStorage.getItem(CACHE) || 'null');
      if (cached && cached.day === dayKey && cached.src) { show(cached); return; }
    } catch (e) {}

    Promise.all(CATS.map(function (c) {
      return fetch(API + 'action=query&list=categorymembers&cmtype=file&cmlimit=500&cmtitle=' + encodeURIComponent('Category:' + c))
        .then(function (r) { return r.json(); })
        .then(function (j) { return (j.query && j.query.categorymembers || []).map(function (m) { return m.title; }); })
        .catch(function () { return []; });
    })).then(function (lists) {
      var seen = {};
      var titles = [].concat.apply([], lists).filter(function (t) {
        if (seen[t] || !/\.(jpe?g|png)$/i.test(t)) return false;
        return (seen[t] = true);
      }).sort();
      if (!titles.length) throw new Error('no photos');
      var title = titles[dayNum % titles.length];
      return fetch(API + 'action=query&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=1200' +
        '&iiextmetadatafilter=Artist%7CLicenseShortName%7CImageDescription&titles=' + encodeURIComponent(title))
        .then(function (r) { return r.json(); })
        .then(function (j) {
          var page = j.query.pages[0];
          var info = page.imageinfo[0];
          var meta = info.extmetadata || {};
          var photo = {
            day: dayKey,
            src: info.thumburl || info.url,
            page: info.descriptionurl,
            artist: plain(meta.Artist && meta.Artist.value).slice(0, 80),
            license: plain(meta.LicenseShortName && meta.LicenseShortName.value),
            alt: plain(meta.ImageDescription && meta.ImageDescription.value).slice(0, 200)
          };
          try { localStorage.setItem(CACHE, JSON.stringify(photo)); } catch (e) {}
          show(photo);
        });
    }).catch(function () { fig.hidden = true; });
  })();

  // ---------- Español / English poster toggle ----------
  // A box holding two posters (Spanish first, then English) shows one at a
  // time with a two-button switch above it. Visitors who picked another
  // language in the language menu start on the English poster.
  function posterToggle(box) {
    var imgs = box.querySelectorAll('img');
    if (imgs.length !== 2 || box.getAttribute('data-toggled')) return;
    box.setAttribute('data-toggled', '1');
    box.classList.add('poster-toggle');
    var m = document.cookie.match(/(?:^|;\s*)googtrans=\/[^\/]*\/([^;]+)/);
    var start = m && m[1] !== 'es' ? 1 : 0;
    var bar = document.createElement('div');
    bar.className = 'lang-switch notranslate';
    bar.setAttribute('translate', 'no');
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Idioma del cartel / Poster language');
    bar.innerHTML = '<button type="button" lang="es">Español</button><button type="button" lang="en">English</button>';
    var btns = bar.querySelectorAll('button');
    function show(i) {
      for (var k = 0; k < 2; k++) {
        imgs[k].hidden = k !== i;
        btns[k].setAttribute('aria-pressed', String(k === i));
      }
    }
    btns[0].addEventListener('click', function () { show(0); });
    btns[1].addEventListener('click', function () { show(1); });
    box.parentNode.insertBefore(bar, box);
    show(start);
  }
  document.querySelectorAll('.poster-pair').forEach(posterToggle);

  // ---------- Notifications bell (every page) ----------
  // Each notification shows in the bell's drop-down until its `until` time
  // (Wichita time, CST = -06:00), soonest first. "Abrir" opens it: the
  // posters if it has `images` (Spanish first), otherwise the title, date,
  // place and description. The bell shimmers and shows a red dot until the
  // visitor has opened every current notification. To add one, copy a block
  // and give it a new, unique `id`.
  var AVISOS = [
    {
      id: 'ropa-gratis-2026-11',
      until: '2026-11-08T00:00:00-06:00',
      title: 'Ropa Gratis · Clothes Giveaway',
      when: 'Viernes 6 y sábado 7 de noviembre · 11 AM – 3 PM',
      place: '856 S. Green St., Wichita, KS 67211',
      images: [
        { src: 'img/ropa-gratis-2026-esp.jpg', alt: 'Cartel de Ropa Gratis: viernes 6 y sábado 7 de noviembre de 2026, 11 AM a 3 PM, 856 S Green St., Wichita, KS 67211. Ropa, zapatos y trastes. ¡Traiga su propia bolsa y tome lo que necesite!' },
        { src: 'img/ropa-gratis-2026-eng.jpg', alt: 'Clothes Giveaway poster: Friday November 6 and Saturday November 7, 2026, 11 AM to 3 PM, 856 S Green St., Wichita, KS 67211. Clothes, shoes and dishes. Bring your own bag and take what you need.' }
      ]
    },
    {
      id: 'dias-de-trabajo-2026-11',
      until: '2026-11-08T00:00:00-06:00',
      title: 'Días de trabajo en el edificio nuevo',
      when: 'Viernes 6 y sábado 7 de noviembre',
      place: 'Edificio nuevo · 856 S. Green St., Wichita, KS 67211',
      description: 'Se necesita la ayuda de todos para tener el edificio listo para la inauguración. También estaremos donando a la comunidad la ropa que está en los salones, así que habrá oportunidad de evangelizar.'
    },
    {
      id: 'ultimo-servicio-dodge-2026-11',
      until: '2026-11-09T00:00:00-06:00',
      title: 'Último servicio en este edificio',
      when: 'Domingo 8 de noviembre',
      place: '1127 S. Dodge Ave., Wichita, KS 67213',
      description: 'Será nuestro último servicio en este edificio y queremos tener algo especial. Tendremos nuestra última comida de traje aquí. Anótese con la hna. Andrea para la comida y no falte a este servicio especial.'
    },
    {
      id: 'inauguracion-2026-11',
      until: '2026-11-13T00:00:00-06:00',
      title: 'Inauguración de nuestro edificio',
      when: 'Jueves 12 de noviembre · 6:30 p.m.',
      place: '856 S. Green St., Wichita, KS 67211',
      images: [
        { src: 'img/inauguracion-2026.jpg', alt: 'Cartel de la Inauguración de nuestro edificio: jueves 12 de noviembre, 6:30 p.m., 856 S. Green St., Wichita, KS 67211. Habrá una ligera cena después del servicio. Si necesita transportación, favor de llamar al 316-794-6217. 1 Samuel 7:12: “Hasta aquí nos ayudó Jehová.”' }
      ]
    },
    {
      id: 'conferencia-fundamentos-2026-11',
      until: '2026-11-15T00:00:00-06:00',
      title: 'Conferencia de Fundamentos',
      when: 'Viernes 13 (6:30 p.m.) y sábado 14 de noviembre (10:00 a.m.)',
      place: '856 S. Green St., Wichita, KS',
      images: [
        { src: 'img/conferencia-fundamentos-2026-esp.jpg', alt: 'Cartel de la Conferencia de Fundamentos, 2 Timoteo 2:19: viernes 13 de noviembre a las 6:30 PM con cena ligera al terminar, y sábado 14 de noviembre a las 10:00 AM con almuerzo al final. 856 S. Green St., Wichita, KS.' },
        { src: 'img/conferencia-fundamentos-2026-eng.jpg', alt: 'Fundamental Conference poster, 2 Timothy 2:19: Friday November 13 at 6:30 PM with dinner afterward, and Saturday November 14 at 10:00 AM with lunch at the end. 856 S. Green St., Wichita, KS.' }
      ]
    }
  ];

  function expired(when) {
    var t = Date.parse(when);
    return !isNaN(t) && Date.now() >= t;
  }

  // ---------- Church address change (every page) ----------
  // From midnight Nov 12 (Wichita time) every address marked data-address,
  // the address Google reads on the home page, and the home page photo
  // (img data-new-src) show the new building.
  var MUDANZA = {
    at: '2026-11-12T00:00:00-06:00',
    text: '856 S Green St, Wichita, KS 67211',
    street: '856 S Green St',
    zip: '67211'
  };
  if (expired(MUDANZA.at)) {
    document.querySelectorAll('[data-address]').forEach(function (el) { el.textContent = MUDANZA.text; });
    // Swap the photo only once the new one has loaded (keeps the old photo
    // if the new file isn't on the site).
    document.querySelectorAll('img[data-new-src]').forEach(function (img) {
      var pre = new Image();
      pre.onload = function () {
        img.src = pre.src;
        img.alt = img.getAttribute('data-new-alt') || img.alt;
      };
      pre.src = img.getAttribute('data-new-src');
    });
    var ld = document.getElementById('church-ld');
    if (ld) {
      try {
        var data = JSON.parse(ld.textContent);
        data.address.streetAddress = MUDANZA.street;
        data.address.postalCode = MUDANZA.zip;
        ld.textContent = JSON.stringify(data);
      } catch (e) {}
    }
  }

  // Novedades: the 3 newest events (by data-date, the event's last day)
  // show on top: upcoming ones soonest first, then past ones newest first.
  // Everything else goes under "Ver más", newest first. To add an event,
  // put it anywhere in Novedades with its data-date.
  (function () {
    var more = document.querySelector('.news-more');
    if (!more) return;
    var box = more.parentNode;
    var now = Date.now();
    function end(el) { return Date.parse(el.getAttribute('data-date') + 'T23:59:59-06:00'); }
    var items = Array.prototype.slice.call(box.querySelectorAll('[data-date]'))
      .sort(function (x, y) { return end(y) - end(x); });
    var top = items.slice(0, 3);
    var upcoming = top.filter(function (el) { return end(el) >= now; }).sort(function (x, y) { return end(x) - end(y); });
    var past = top.filter(function (el) { return end(el) < now; });
    upcoming.concat(past).forEach(function (el) { box.insertBefore(el, more); });
    items.slice(3).forEach(function (el) { more.appendChild(el); });
  })();

  (function () {
    var script = document.currentScript || document.querySelector('script[src*="main.js"]');
    var assets = new URL('../', script.src); // .../assets/
    var KEY = 'pibf-avisos-leidos';
    var read = [];
    try { read = JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) {}
    try { if (localStorage.getItem('pibf-aviso-visto') === 'ropa-gratis-2026-11') read.push('ropa-gratis-2026-11'); } catch (e) {}
    function isRead(a) { return read.indexOf(a.id) !== -1; }
    function markRead(a) {
      if (isRead(a)) return;
      read.push(a.id);
      try { localStorage.setItem(KEY, JSON.stringify(read)); } catch (e) {}
    }
    function esc(t) {
      return String(t).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; });
    }
    var active = AVISOS.filter(function (a) { return !(a.until && expired(a.until)); })
      .sort(function (x, y) { return Date.parse(x.until) - Date.parse(y.until); });

    var BELL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
    var I_CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
    var I_PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';

    var bell = document.createElement('button');
    bell.type = 'button';
    bell.className = 'aviso-bell';
    bell.innerHTML = BELL + '<span class="dot"></span>';
    bell.setAttribute('aria-expanded', 'false');
    bell.setAttribute('aria-controls', 'aviso-panel');
    document.body.appendChild(bell);

    var panel = document.createElement('div');
    panel.id = 'aviso-panel';
    panel.className = 'aviso-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Notificaciones');
    panel.hidden = true;
    document.body.appendChild(panel);

    var dialog = document.createElement('dialog');
    dialog.className = 'aviso-dialog';
    document.body.appendChild(dialog);

    // The list and every pop-up are built once, when the page loads, and
    // only shown or hidden afterwards. That way Google Translate (language
    // menu) translates them together with the rest of the page.
    panel.innerHTML = '<p class="aviso-panel-title">Notificaciones</p>' + (active.length
      ? '<ul class="aviso-list">' + active.map(function (a, i) {
          return '<li data-i="' + i + '">' +
            '<span class="aviso-dot" aria-hidden="true"></span>' +
            '<span class="aviso-text"><span class="aviso-title">' + esc(a.title) + '<span class="sr-only aviso-new"> (nueva)</span></span>' +
            (a.when ? '<span class="aviso-when">' + esc(a.when) + '</span>' : '') + '</span>' +
            '<button type="button" class="aviso-open" data-i="' + i + '">Abrir</button></li>';
        }).join('') + '</ul>'
      : '<p class="aviso-empty">No hay notificaciones ahora</p>');

    dialog.innerHTML = '<button type="button" class="aviso-close" aria-label="Cerrar">&times;</button>' +
      active.map(function (a, i) {
        var body;
        if (a.images && a.images.length) {
          body = '<div class="aviso-imgs' + (a.images.length === 1 ? ' one' : '') + '">' + a.images.map(function (im) {
            return '<img src="' + new URL(im.src, assets).href + '" width="1024" height="1536" alt="' + esc(im.alt) + '" loading="lazy">';
          }).join('') + '</div>';
        } else {
          body = '<div class="aviso-details">' +
            (a.when ? '<p class="aviso-row">' + I_CAL + '<span>' + esc(a.when) + '</span></p>' : '') +
            (a.place ? '<p class="aviso-row">' + I_PIN + '<span>' + esc(a.place) + '</span></p>' : '') +
            (a.description ? '<p class="aviso-desc">' + esc(a.description) + '</p>' : '') + '</div>';
        }
        return '<div class="aviso-inner" data-i="' + i + '" hidden><h2>' + esc(a.title) + '</h2>' + body + '</div>';
      }).join('');
    dialog.querySelectorAll('.aviso-imgs').forEach(posterToggle);
    dialog.querySelector('.aviso-close').addEventListener('click', closeDialog);

    function updateBell() {
      var unread = active.filter(function (a) { return !isRead(a); }).length;
      bell.classList.toggle('shine', unread > 0);
      bell.setAttribute('aria-label', unread ? 'Notificaciones: ' + unread + ' sin abrir' : 'Notificaciones');
      panel.querySelectorAll('.aviso-list li').forEach(function (li) {
        var un = !isRead(active[+li.getAttribute('data-i')]);
        li.classList.toggle('unread', un);
        li.querySelector('.aviso-new').hidden = !un;
      });
    }
    function setOpen(open) {
      panel.hidden = !open;
      bell.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    function openAviso(i) {
      var a = active[i];
      dialog.querySelectorAll('.aviso-inner').forEach(function (v) { v.hidden = +v.getAttribute('data-i') !== i; });
      var view = dialog.querySelector('.aviso-inner[data-i="' + i + '"]');
      dialog.setAttribute('aria-label', view.querySelector('h2').textContent);
      dialog.classList.toggle('has-details', !!view.querySelector('.aviso-details'));
      markRead(a);
      updateBell();
      setOpen(false);
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    function closeDialog() {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
      bell.focus();
    }
    dialog.addEventListener('click', function (e) { if (e.target === dialog) closeDialog(); });

    bell.addEventListener('click', function (e) { e.stopPropagation(); setOpen(panel.hidden); });
    panel.addEventListener('click', function (e) {
      e.stopPropagation();
      var btn = e.target.closest('.aviso-open');
      if (btn) openAviso(+btn.getAttribute('data-i'));
    });
    document.addEventListener('click', function () { if (!panel.hidden) setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { setOpen(false); bell.focus(); }
    });
    updateBell();
  })();

  // ---------- Back to top button (every page) ----------
  (function () {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'to-top';
    btn.setAttribute('aria-label', 'Volver arriba');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
    document.body.appendChild(btn);
    function update() { btn.classList.toggle('show', window.scrollY > 400); }
    window.addEventListener('scroll', update, { passive: true });
    update();
    btn.addEventListener('click', function () {
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  })();

  // ---------- Copy-to-clipboard buttons (Donar page) ----------
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    var label = btn.querySelector('span') || btn;
    var original = label.textContent;
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var done = function () {
        label.textContent = '¡Copiado!';
        setTimeout(function () { label.textContent = original; }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {});
      } else {
        var t = document.createElement('textarea');
        t.value = text; document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        document.body.removeChild(t);
      }
    });
  });

  // ---------- Contact form → Formspree ----------
  // Sends in the background, then goes to the "gracias" page. Without
  // JavaScript the form still posts normally and Formspree shows its own
  // confirmation page.
  var contactForm = document.querySelector('.contact-form[action*="formspree.io"]');
  if (contactForm && window.fetch && window.FormData) {
    var status = contactForm.querySelector('.form-status');
    var submitBtn = contactForm.querySelector('button[type="submit"]');
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(contactForm);
      // Send ticked "Me gustaría" boxes as one line
      var wants = data.getAll('Me gustaría');
      data.delete('Me gustaría');
      data.append('Me gustaría', wants.length ? wants.join(', ') : '—');
      var label = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando…';
      if (status) status.hidden = true;
      fetch(contactForm.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          window.location.href = contactForm.getAttribute('data-thanks') || 'gracias/';
        })
        .catch(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = label;
          if (status) {
            status.textContent = 'Lo sentimos, no se pudo enviar su mensaje. Por favor intente de nuevo o llámenos al (316) 794-6217.';
            status.hidden = false;
          }
        });
    });
  }

  // ---------- Language menu (Google Translate, every page) ----------
  // The site is in Spanish. Picking another language loads Google Translate
  // (only then) and translates the page; the choice carries to other pages
  // through Google's "googtrans" cookie. "Español" switches back.
  (function () {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var LANGS = [
      ['es', 'Español'], ['en', 'English'], ['pt', 'Português'], ['fr', 'Français'],
      ['ht', 'Kreyòl ayisyen'], ['de', 'Deutsch'], ['it', 'Italiano'], ['nl', 'Nederlands'],
      ['pl', 'Polski'], ['ro', 'Română'], ['ru', 'Русский'], ['uk', 'Українська'],
      ['el', 'Ελληνικά'], ['tr', 'Türkçe'], ['ar', 'العربية'], ['iw', 'עברית'],
      ['fa', 'فارسی'], ['ur', 'اردو'], ['hi', 'हिन्दी'], ['bn', 'বাংলা'],
      ['pa', 'ਪੰਜਾਬੀ'], ['ta', 'தமிழ்'], ['te', 'తెలుగు'], ['ne', 'नेपाली'],
      ['zh-CN', '中文 (简体)'], ['zh-TW', '中文 (繁體)'], ['ja', '日本語'], ['ko', '한국어'],
      ['vi', 'Tiếng Việt'], ['th', 'ไทย'], ['tl', 'Filipino'], ['id', 'Bahasa Indonesia'],
      ['ms', 'Bahasa Melayu'], ['my', 'မြန်မာ'], ['km', 'ខ្មែរ'], ['sw', 'Kiswahili'],
      ['am', 'አማርኛ'], ['so', 'Soomaali'], ['ha', 'Hausa'], ['yo', 'Yorùbá'], ['zu', 'isiZulu']
    ];
    var GLOBE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';

    function current() {
      var m = document.cookie.match(/(?:^|;\s*)googtrans=\/[^\/]*\/([^;]+)/);
      return m ? decodeURIComponent(m[1]) : 'es';
    }
    function clearCookie() {
      var past = '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      var host = location.hostname;
      document.cookie = 'googtrans' + past;
      if (host) {
        document.cookie = 'googtrans' + past + '; domain=' + host;
        document.cookie = 'googtrans' + past + '; domain=.' + host.replace(/^www\./, '');
      }
    }

    var bar = document.createElement('div');
    bar.className = 'translate-bar notranslate';
    bar.setAttribute('translate', 'no');
    var cur = current();
    bar.innerHTML = '<label class="translate-box">' + GLOBE +
      '<span class="sr-only">Idioma / Language</span>' +
      '<select aria-label="Idioma / Language">' + LANGS.map(function (l) {
        return '<option value="' + l[0] + '"' + (l[0] === cur ? ' selected' : '') + '>' + l[1] + '</option>';
      }).join('') + '</select></label><div id="gt-element" aria-hidden="true"></div>';
    header.insertBefore(bar, header.firstChild);
    var select = bar.querySelector('select');

    var loading = null;
    function loadGoogle() {
      if (loading) return loading;
      loading = new Promise(function (resolve) {
        window.pibfGoogleTranslateInit = function () {
          new google.translate.TranslateElement({
            pageLanguage: 'es',
            includedLanguages: LANGS.map(function (l) { return l[0]; }).join(','),
            autoDisplay: false
          }, 'gt-element');
          resolve();
        };
        var s = document.createElement('script');
        s.src = 'https://translate.google.com/translate_a/element.js?cb=pibfGoogleTranslateInit';
        s.async = true;
        s.onerror = function () { select.value = 'es'; };
        document.head.appendChild(s);
      });
      return loading;
    }
    function setCookie(code) {
      var v = 'googtrans=/es/' + code + '; path=/';
      document.cookie = v;
      if (location.hostname && location.hostname.indexOf('.') !== -1) {
        document.cookie = v + '; domain=.' + location.hostname.replace(/^www\./, '');
      }
    }
    function translateTo(code) {
      // Save the choice the way Google does, so it also applies on reload
      // and on every other page.
      setCookie(code);
      var done = false;
      // If Google's selector isn't ready within 8 seconds, reload: Google
      // then translates the page on load from the saved choice.
      var fallback = setTimeout(function () { if (!done) location.reload(); }, 8000);
      loadGoogle().then(function () {
        (function apply() {
          var combo = document.querySelector('#gt-element select.goog-te-combo');
          // Wait until Google has filled in its language list.
          if (!combo || !combo.querySelector('option[value="' + code + '"]')) { setTimeout(apply, 150); return; }
          done = true;
          clearTimeout(fallback);
          combo.value = code;
          var evt = document.createEvent('HTMLEvents');
          evt.initEvent('change', true, true);
          combo.dispatchEvent(evt);
        })();
      });
    }

    select.addEventListener('change', function () {
      if (select.value === 'es') { clearCookie(); location.reload(); return; }
      translateTo(select.value);
    });
    if (cur !== 'es') loadGoogle();
  })();
})();
