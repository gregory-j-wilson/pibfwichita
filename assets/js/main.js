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
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ---------- Footer year ----------
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // ---------- Gallery: pagination + lightbox ----------
  var gallery = document.querySelector('.gallery');
  if (gallery) {
    var items = Array.prototype.slice.call(gallery.querySelectorAll('figure'));
    var perPage = parseInt(gallery.getAttribute('data-per-page') || '0', 10);
    var pager = document.querySelector('.pager');

    function showPage(n) {
      items.forEach(function (fig, i) {
        fig.hidden = Math.floor(i / perPage) !== n;
      });
      if (!pager) return;
      pager.querySelectorAll('[data-page]').forEach(function (b) {
        b.setAttribute('aria-current', String(+b.getAttribute('data-page') === n));
      });
      var next = pager.querySelector('.next');
      var prev = pager.querySelector('.prev');
      var last = Math.ceil(items.length / perPage) - 1;
      if (next) { next.disabled = n >= last; next.onclick = function () { go(n + 1); }; }
      if (prev) { prev.disabled = n <= 0; prev.onclick = function () { go(n - 1); }; }
    }
    function go(n) {
      showPage(n);
      gallery.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (perPage && items.length > perPage && pager) {
      var pages = Math.ceil(items.length / perPage);
      var html = '<button type="button" class="prev">Anterior</button>';
      for (var p = 0; p < pages; p++) {
        html += '<button type="button" data-page="' + p + '">' + (p + 1) + '</button>';
      }
      html += '<button type="button" class="next">Siguiente</button>';
      pager.innerHTML = html;
      pager.querySelectorAll('[data-page]').forEach(function (b) {
        b.addEventListener('click', function () { go(+b.getAttribute('data-page')); });
      });
      showPage(0);
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

    items.forEach(function (fig, i) {
      fig.querySelector('button').addEventListener('click', function () { open(i); });
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
})();
