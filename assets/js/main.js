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

  // ---------- Announcement bell (every page) ----------
  // To post a new announcement: change AVISO.id (so the bell shines again
  // for everyone), update the title and images (Spanish first), and set
  // `until` to when it should end. After `until`, the bell goes quiet (no
  // dot or shimmer) and shows "No hay notificaciones ahora" when clicked.
  // News items on the home page marked data-until="..." also move under
  // "Ver más" at that time.
  var AVISO = {
    id: 'ropa-gratis-2026-11',
    until: '2026-11-08T00:00:00-06:00', // midnight Nov 8, Wichita time (CST)
    title: 'Ropa Gratis · Clothes Giveaway',
    images: [
      { src: 'img/ropa-gratis-2026-esp.jpg', alt: 'Cartel de Ropa Gratis: viernes 6 y sábado 7 de noviembre de 2026, 11 AM a 3 PM, 856 S Green St., Wichita, KS 67211. Ropa, zapatos y trastes. ¡Traiga su propia bolsa y tome lo que necesite!' },
      { src: 'img/ropa-gratis-2026-eng.jpg', alt: 'Clothes Giveaway poster: Friday November 6 and Saturday November 7, 2026, 11 AM to 3 PM, 856 S Green St., Wichita, KS 67211. Clothes, shoes and dishes. Bring your own bag and take what you need.' }
    ]
  };

  function expired(when) {
    var t = Date.parse(when);
    return !isNaN(t) && Date.now() >= t;
  }

  // Move expired news on the home page under "Ver más" (newest first)
  (function () {
    var more = document.querySelector('.news-more');
    if (!more) return;
    var summary = more.querySelector('summary');
    var old = Array.prototype.filter.call(document.querySelectorAll('#novedades [data-until]'), function (el) {
      return !more.contains(el) && expired(el.getAttribute('data-until'));
    });
    for (var i = old.length - 1; i >= 0; i--) summary.insertAdjacentElement('afterend', old[i]);
  })();

  (function () {
    var script = document.currentScript || document.querySelector('script[src*="main.js"]');
    var assets = new URL('../', script.src); // .../assets/
    var active = AVISO.images.length > 0 && !(AVISO.until && expired(AVISO.until));
    var key = 'pibf-aviso-visto';
    var seen = false;
    try { seen = localStorage.getItem(key) === AVISO.id; } catch (e) {}

    var bell = document.createElement('button');
    bell.type = 'button';
    bell.className = 'aviso-bell' + (active && !seen ? ' shine' : '');
    bell.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span class="dot"></span>';
    document.body.appendChild(bell);

    if (!active) {
      // Nothing to announce: a small drop-down under the bell
      bell.setAttribute('aria-label', 'Notificaciones');
      bell.setAttribute('aria-expanded', 'false');
      bell.setAttribute('aria-controls', 'aviso-menu');
      var menu = document.createElement('div');
      menu.id = 'aviso-menu';
      menu.className = 'aviso-menu';
      menu.setAttribute('role', 'status');
      menu.hidden = true;
      menu.textContent = 'No hay notificaciones ahora';
      document.body.appendChild(menu);
      var setOpen = function (open) {
        menu.hidden = !open;
        bell.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      bell.addEventListener('click', function (e) { e.stopPropagation(); setOpen(menu.hidden); });
      document.addEventListener('click', function (e) { if (!menu.contains(e.target)) setOpen(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setOpen(false); bell.focus(); } });
      return;
    }

    bell.setAttribute('aria-label', 'Anuncios — ' + AVISO.title);
    bell.setAttribute('aria-haspopup', 'dialog');
    var dialog = document.createElement('dialog');
    dialog.className = 'aviso-dialog';
    dialog.setAttribute('aria-label', AVISO.title);
    var imgs = AVISO.images.map(function (im) {
      return '<img src="' + new URL(im.src, assets).href + '" width="1024" height="1536" alt="' + im.alt.replace(/"/g, '&quot;') + '">';
    }).join('');
    dialog.innerHTML = '<button type="button" class="aviso-close" aria-label="Cerrar">&times;</button>' +
      '<div class="aviso-inner"><h2>' + AVISO.title + '</h2><div class="aviso-imgs">' + imgs + '</div></div>';
    document.body.appendChild(dialog);

    bell.addEventListener('click', function () {
      bell.classList.remove('shine');
      try { localStorage.setItem(key, AVISO.id); } catch (e) {}
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    });
    function close() {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
      bell.focus();
    }
    dialog.querySelector('.aviso-close').addEventListener('click', close);
    dialog.addEventListener('click', function (e) { if (e.target === dialog) close(); });
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
})();
