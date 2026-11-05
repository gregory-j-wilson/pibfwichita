/* Música page: hymn player for the Himnario Bautista (rojo) tracks.
   The full, numbered hymn list (assets/js/himnos.js) shows right away and
   can be searched by number or title. Nothing loads from YouTube until a
   hymn is played; the video then plays in YouTube's privacy-enhanced mode.
   When a hymn ends, the next one plays (in hymnal order, or at random with
   shuffle on). The last hymn played is remembered in this browser. */
(function () {
  'use strict';
  var box = document.querySelector('.hymn-player');
  var H = window.HIMNOS;
  if (!box || !H || !H.length) return;
  var LAST = 'pibf-himno-ultimo';

  var ICON = {
    prev: '<path d="M6 6h2v12H6zM9.5 12 18 18V6z"/>',
    next: '<path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/>',
    play: '<path d="M8 5v14l11-7z"/>',
    pause: '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>',
    shuffle: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8.5" cy="8.5" r="1.6"/><circle cx="15.5" cy="15.5" r="1.6"/><circle cx="15.5" cy="8.5" r="1.6"/><circle cx="8.5" cy="15.5" r="1.6"/><circle cx="12" cy="12" r="1.6"/>'
  };
  function svg(n) { return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + ICON[n] + '</svg>'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fold(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  var last = -1;
  try { var l = JSON.parse(localStorage.getItem(LAST) || 'null'); if (l) last = H.findIndex(function (h) { return h[2] === l; }); } catch (e) {}

  var startAt = last >= 0 ? last : 0;
  box.classList.add('ready');
  box.innerHTML =
    '<div class="hp-main">' +
      '<div class="hp-video">' +
        '<div class="hp-cover">' +
          '<button type="button" class="hp-cover-play" data-i="' + startAt + '">' +
            '<span class="hymn-start-icon" aria-hidden="true">' + svg('play') + '</span>' +
            '<span class="hymn-start-text"><strong>' + (last >= 0 ? 'Continuar donde se quedó' : 'Reproducir los himnos') + '</strong>' +
            '<span>' + H[startAt][0] + '. ' + esc(H[startAt][1]) + '</span></span>' +
          '</button>' +
          '<button type="button" class="hp-cover-random">' + svg('dice') + ' Himno al azar</button>' +
        '</div>' +
      '</div>' +
      '<div class="hp-now" aria-live="polite"><span class="hp-now-label">Ahora:</span> <span class="hp-now-title">Elija un himno de la lista</span></div>' +
      '<div class="hp-controls">' +
        '<button type="button" class="hp-btn" data-act="prev" aria-label="Himno anterior">' + svg('prev') + '</button>' +
        '<button type="button" class="hp-btn hp-play" data-act="toggle" aria-label="Reproducir">' + svg('play') + '</button>' +
        '<button type="button" class="hp-btn" data-act="next" aria-label="Siguiente himno">' + svg('next') + '</button>' +
        '<button type="button" class="hp-btn hp-shuffle" data-act="shuffle" aria-pressed="false" aria-label="Orden aleatorio">' + svg('shuffle') + '</button>' +
        '<button type="button" class="hp-btn" data-act="random" aria-label="Himno al azar">' + svg('dice') + '</button>' +
      '</div>' +
    '</div>' +
    '<div class="hp-side">' +
      '<div class="hp-search-row">' +
        '<label class="hp-search"><span class="sr-only">Buscar por número o título</span>' +
          '<input type="search" placeholder="Buscar por número o título…" autocomplete="off" inputmode="search"></label>' +
        '<span class="hp-total">' + H.length + ' himnos</span>' +
      '</div>' +
      '<ol class="hp-list" aria-label="Lista de himnos">' +
        H.map(function (h, i) {
          return '<li><button type="button" class="hp-item" data-i="' + i + '">' +
            '<span class="hp-num">' + h[0] + '</span>' +
            '<span class="hp-title">' + esc(h[1]) + '</span>' +
            '<span class="hp-dur">' + esc(h[3]) + '</span></button></li>';
        }).join('') +
      '</ol>' +
      '<p class="hp-empty" hidden>No se encontró ningún himno.</p>' +
    '</div>';

  var list = box.querySelector('.hp-list');
  var items = Array.prototype.slice.call(list.querySelectorAll('.hp-item'));
  var index = H.map(function (h) { return fold(h[0] + ' ' + h[1]); });
  var player = null, ready = false, current = -1, shuffle = false, pending = -1, apiLoading = false;

  function random() {
    if (H.length < 2) return 0;
    var r; do { r = Math.floor(Math.random() * H.length); } while (r === current);
    return r;
  }

  function play(i) {
    current = i;
    mark();
    try { localStorage.setItem(LAST, JSON.stringify(H[i][2])); } catch (e) {}
    if (ready) { player.loadVideoById(H[i][2]); return; }
    pending = i;
    if (apiLoading) return;
    apiLoading = true;
    box.querySelector('.hp-video').innerHTML = '<div id="hp-yt"></div>';
    var go = function () {
      player = new YT.Player('hp-yt', {
        host: 'https://www.youtube-nocookie.com',
        videoId: H[pending][2],
        playerVars: { autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: function () { ready = true; if (pending !== current) player.loadVideoById(H[current][2]); },
          onStateChange: onState
        }
      });
    };
    if (window.YT && window.YT.Player) return go();
    var prevCb = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () { if (prevCb) prevCb(); go(); };
    var s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = function () {
      box.querySelector('.hp-now-title').textContent = 'No se pudo cargar YouTube. Intente de nuevo más tarde.';
    };
    document.head.appendChild(s);
  }

  function onState(e) {
    var playing = e.data === YT.PlayerState.PLAYING || e.data === YT.PlayerState.BUFFERING;
    var b = box.querySelector('.hp-play');
    b.innerHTML = svg(playing ? 'pause' : 'play');
    b.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
    if (e.data === YT.PlayerState.ENDED) next();
  }

  function next() { play(shuffle ? random() : (current + 1) % H.length); }
  function prev() { play(current <= 0 ? H.length - 1 : current - 1); }

  function mark() {
    items.forEach(function (b, i) {
      var on = i === current;
      b.classList.toggle('current', on);
      if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    var b = items[current];
    if (b && !b.parentNode.hidden) {
      var top = b.parentNode.offsetTop - list.offsetTop;
      if (top < list.scrollTop || top > list.scrollTop + list.clientHeight - 50) list.scrollTop = top - 8;
    }
    box.querySelector('.hp-now-title').textContent = H[current][0] + '. ' + H[current][1];
  }

  box.addEventListener('click', function (e) {
    var item = e.target.closest('.hp-item, .hp-cover-play');
    if (item) { play(+item.getAttribute('data-i')); return; }
    if (e.target.closest('.hp-cover-random')) { play(random()); return; }
    var c = e.target.closest('[data-act]');
    if (!c) return;
    var act = c.getAttribute('data-act');
    if (act === 'shuffle') { shuffle = !shuffle; c.setAttribute('aria-pressed', String(shuffle)); return; }
    if (act === 'random') return play(random());
    if (current < 0) return play(startAt);
    if (act === 'prev') prev();
    if (act === 'next') next();
    if (act === 'toggle') {
      if (!ready) return;
      if (player.getPlayerState() === YT.PlayerState.PLAYING) player.pauseVideo(); else player.playVideo();
    }
  });

  box.querySelector('.hp-search input').addEventListener('input', function (e) {
    var q = fold(e.target.value.trim());
    var shown = 0;
    items.forEach(function (b, i) {
      var h = H[i];
      // A number on its own matches that hymn number (and numbers starting with it)
      var hit = !q || (/^\d+$/.test(q) ? String(h[0]).indexOf(q) === 0 : index[i].indexOf(q) !== -1);
      b.parentNode.hidden = !hit;
      if (hit) shown++;
    });
    box.querySelector('.hp-empty').hidden = shown > 0;
    list.scrollTop = 0;
  });
})();
