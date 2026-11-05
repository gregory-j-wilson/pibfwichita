/* Música page: custom hymn player for a YouTube playlist.
   Nothing loads from YouTube until the visitor presses play. Then the
   YouTube player (privacy-enhanced mode) loads the playlist, and a numbered,
   searchable list of hymns is built from it. Titles come from YouTube as each
   hymn plays, and are also looked up in the background where the browser
   allows it; they are remembered in this browser for a week. */
(function () {
  'use strict';
  var box = document.querySelector('.hymn-player');
  if (!box) return;
  var LIST = box.getAttribute('data-playlist');
  var KEY = 'pibf-himnos-titulos';
  var WEEK = 7 * 24 * 3600 * 1000;

  var titles = {};
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && saved.t && Date.now() - saved.at < WEEK) titles = saved.t;
  } catch (e) {}
  function saveTitles() {
    try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), t: titles })); } catch (e) {}
  }
  function clean(t) {
    // "123. Santo, Santo, Santo - Himnario Bautista" -> "Santo, Santo, Santo"
    return String(t || '')
      .replace(/\s*[-|–—]\s*(himnario bautista.*|himno.*bautista.*)$/i, '')
      .replace(/^\s*(himno\s*)?#?\d+\s*[.\-–:)]\s*/i, '')
      .trim();
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  var ICON = {
    prev: '<path d="M6 6h2v12H6zM9.5 12 18 18V6z"/>',
    next: '<path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/>',
    play: '<path d="M8 5v14l11-7z"/>',
    pause: '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>',
    shuffle: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>'
  };
  function svg(name) { return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + ICON[name] + '</svg>'; }

  var player, ids = [], items = [], current = -1, shuffle = false, target = -1;
  function randomOther() {
    if (ids.length < 2) return 0;
    var r; do { r = Math.floor(Math.random() * ids.length); } while (r === current);
    return r;
  }
  function jumpTo(i) { target = i; player.playVideoAt(i); }

  function start() {
    box.classList.add('loaded');
    box.innerHTML =
      '<div class="hp-main">' +
        '<div class="hp-video"><div id="hp-yt"></div></div>' +
        '<div class="hp-now"><span class="hp-now-label">Ahora:</span> <span class="hp-now-title">Cargando…</span></div>' +
        '<div class="hp-controls">' +
          '<button type="button" class="hp-btn" data-act="prev" aria-label="Himno anterior">' + svg('prev') + '</button>' +
          '<button type="button" class="hp-btn hp-play" data-act="toggle" aria-label="Pausar">' + svg('pause') + '</button>' +
          '<button type="button" class="hp-btn" data-act="next" aria-label="Siguiente himno">' + svg('next') + '</button>' +
          '<button type="button" class="hp-btn hp-shuffle" data-act="shuffle" aria-pressed="false" aria-label="Orden aleatorio">' + svg('shuffle') + '</button>' +
          '<span class="hp-count" aria-live="polite"></span>' +
        '</div>' +
      '</div>' +
      '<div class="hp-side">' +
        '<label class="hp-search"><span class="sr-only">Buscar himno</span>' +
          '<input type="search" placeholder="Buscar himno…" autocomplete="off"></label>' +
        '<ol class="hp-list" aria-label="Lista de himnos"><li class="hp-loading">Cargando la lista…</li></ol>' +
      '</div>';
    box.querySelector('.hp-controls').addEventListener('click', onControl);
    box.querySelector('.hp-search input').addEventListener('input', filter);

    if (window.YT && window.YT.Player) return makePlayer();
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () { if (prev) prev(); makePlayer(); };
    var s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = function () {
      box.querySelector('.hp-now-title').textContent = 'No se pudo cargar YouTube. Intente de nuevo más tarde.';
    };
    document.head.appendChild(s);
  }

  function makePlayer() {
    player = new YT.Player('hp-yt', {
      host: 'https://www.youtube-nocookie.com',
      playerVars: { listType: 'playlist', list: LIST, autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1 },
      events: { onReady: onReady, onStateChange: onState }
    });
  }

  function onReady() {
    var tries = 0;
    (function waitList() {
      var pl = player.getPlaylist && player.getPlaylist();
      if (pl && pl.length) { ids = pl; buildList(); return; }
      if (++tries < 60) setTimeout(waitList, 250);
      else box.querySelector('.hp-list').innerHTML = '<li class="hp-loading">No se pudo cargar la lista.</li>';
    })();
  }

  function buildList() {
    var list = box.querySelector('.hp-list');
    list.innerHTML = ids.map(function (id, i) {
      var t = titles[id] ? esc(titles[id]) : 'Himno ' + (i + 1);
      return '<li><button type="button" class="hp-item" data-i="' + i + '">' +
        '<span class="hp-num">' + (i + 1) + '</span>' +
        '<img src="https://i.ytimg.com/vi/' + id + '/mqdefault.jpg" alt="" width="96" height="54" loading="lazy">' +
        '<span class="hp-title">' + t + '</span></button></li>';
    }).join('');
    items = Array.prototype.slice.call(list.querySelectorAll('.hp-item'));
    list.addEventListener('click', function (e) {
      var b = e.target.closest('.hp-item');
      if (b) jumpTo(+b.getAttribute('data-i'));
    });
    markCurrent();
    fetchTitles();
  }

  // Background title lookup (YouTube's public oEmbed). If the browser blocks
  // it, the list keeps "Himno N" and fills in titles as hymns play.
  function fetchTitles() {
    if (!window.fetch) return;
    var todo = ids.filter(function (id) { return !titles[id]; });
    var running = 0, idx = 0, failed = 0;
    function nextOne() {
      if (failed > 3) return;
      while (running < 4 && idx < todo.length) {
        var id = todo[idx++];
        running++;
        fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id))
          .then(function (r) { if (!r.ok) throw 0; return r.json(); })
          .then((function (vid) { return function (j) { setTitle(vid, j.title); }; })(id))
          .catch(function () { failed++; })
          .then(function () { running--; if (idx >= todo.length && !running) saveTitles(); nextOne(); });
      }
    }
    nextOne();
  }

  function setTitle(id, raw) {
    var t = clean(raw);
    if (!t) return;
    titles[id] = t;
    var i = ids.indexOf(id);
    if (i !== -1 && items[i]) items[i].querySelector('.hp-title').textContent = t;
    if (i === current) box.querySelector('.hp-now-title').textContent = (i + 1) + '. ' + t;
  }

  function onState(e) {
    var playBtn = box.querySelector('.hp-play');
    var playing = e.data === YT.PlayerState.PLAYING || e.data === YT.PlayerState.BUFFERING;
    playBtn.innerHTML = svg(playing ? 'pause' : 'play');
    playBtn.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
    var i = player.getPlaylistIndex ? player.getPlaylistIndex() : -1;
    // Shuffle: when YouTube moves on to the next hymn by itself, jump to a
    // random one instead (the list keeps its real order and numbers).
    if (shuffle && target === -1 && i === current + 1 && current >= 0) { jumpTo(randomOther()); return; }
    if (i === target) target = -1;
    if (i !== current && i >= 0) { current = i; markCurrent(); }
    var d = player.getVideoData && player.getVideoData();
    if (d && d.video_id && d.title) { setTitle(d.video_id, d.title); saveTitles(); }
  }

  function markCurrent() {
    items.forEach(function (b, i) {
      b.classList.toggle('current', i === current);
      if (i === current) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    var b = items[current];
    if (b) {
      var list = box.querySelector('.hp-list');
      var top = b.parentNode.offsetTop - list.offsetTop;
      if (top < list.scrollTop || top > list.scrollTop + list.clientHeight - 60) list.scrollTop = top - 8;
      var t = titles[ids[current]];
      box.querySelector('.hp-now-title').textContent = (current + 1) + '. ' + (t || 'Himno ' + (current + 1));
    }
    if (ids.length) box.querySelector('.hp-count').textContent = (current >= 0 ? current + 1 : 1) + ' de ' + ids.length;
  }

  function filter(e) {
    var q = e.target.value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    items.forEach(function (b, i) {
      var text = ((i + 1) + ' ' + b.querySelector('.hp-title').textContent).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      b.parentNode.hidden = q && text.indexOf(q) === -1;
    });
  }

  function onControl(e) {
    var b = e.target.closest('[data-act]');
    if (!b || !player) return;
    var act = b.getAttribute('data-act');
    if (act === 'prev') player.previousVideo();
    if (act === 'next') { if (shuffle) jumpTo(randomOther()); else player.nextVideo(); }
    if (act === 'toggle') {
      if (player.getPlayerState() === YT.PlayerState.PLAYING) player.pauseVideo(); else player.playVideo();
    }
    if (act === 'shuffle') {
      shuffle = !shuffle;
      b.setAttribute('aria-pressed', String(shuffle));
    }
  }

  box.querySelector('.hymn-start').addEventListener('click', start);
})();
