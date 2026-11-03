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
})();
