/* PIBF Wichita — admin panel (/admin/).
 *
 * The site is static (GitHub Pages), so the panel saves changes by committing
 * them to the GitHub repository with the GitHub API; the site then redeploys.
 * The GitHub access token is stored only encrypted, in data/admin.json,
 * locked with the master password (PBKDF2-SHA256 + AES-GCM in the browser).
 * The password itself is never stored anywhere. A wrong password simply
 * cannot decrypt the token.
 */
(function () {
  'use strict';

  var REPO = { owner: 'gregory-j-wilson', name: 'pibfwichita', branch: 'main' };
  var ITER = 600000;
  var GREEN = '856 S Green St, Wichita, KS 67211';
  var CATS = [['servicio', 'Servicio'], ['especial', 'Evento especial'], ['conferencia', 'Conferencia'], ['actividad', 'Actividad'], ['otro', 'Otro']];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  var app = document.getElementById('app');
  var toastEl = document.querySelector('.adm-toast');
  var session = { token: null, password: null, config: null, tokenExpires: null };
  var state = { eventos: [], boletines: [], tab: 'calendario', editing: null };

  // ---------- small helpers ----------
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(sel, el) { return (el || document).querySelector(sel); }
  function toast(msg, kind) {
    toastEl.textContent = msg;
    toastEl.className = 'adm-toast ' + (kind || '');
    toastEl.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { toastEl.hidden = true; }, kind === 'error' ? 9000 : 6000);
  }
  function busy(btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || 'Guardando…'; btn.disabled = true; }
    else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
  }
  function parseDate(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function fmtTime(t) { if (!t) return ''; var p = t.split(':'), h = +p[0]; return (h % 12 || 12) + ':' + p[1] + (h < 12 ? ' a.m.' : ' p.m.'); }
  function fmtWhen(ev) {
    var a = parseDate(ev.fecha), s;
    if (ev.repetir === 'semanal') s = 'Cada ' + DIAS[a.getDay()] + ' (desde el ' + a.getDate() + ' de ' + MESES[a.getMonth()] + ')';
    else if (ev.fechaFin && ev.fechaFin !== ev.fecha) { var b = parseDate(ev.fechaFin); s = a.getDate() + ' de ' + MESES[a.getMonth()] + ' – ' + b.getDate() + ' de ' + MESES[b.getMonth()] + ', ' + b.getFullYear(); }
    else s = cap(DIAS[a.getDay()]) + ' ' + a.getDate() + ' de ' + MESES[a.getMonth()] + ', ' + a.getFullYear();
    if (ev.hora) s += ' · ' + fmtTime(ev.hora) + (ev.horaFin ? ' – ' + fmtTime(ev.horaFin) : '');
    return s;
  }
  function slug(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'evento'; }
  function b64FromBytes(bytes) { var s = '', CH = 0x8000; for (var i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH)); return btoa(s); }
  function bytesFromB64(b) { var s = atob(b.replace(/\s/g, '')), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }

  // ---------- crypto: token locked with the master password ----------
  function deriveKey(password, salt, iter) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  function lockToken(token, password) {
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    return deriveKey(password, salt, ITER).then(function (key) {
      return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(token));
    }).then(function (ct) {
      return { version: 1, kdf: 'PBKDF2-SHA256', iterations: ITER, salt: b64FromBytes(salt), iv: b64FromBytes(iv), token: b64FromBytes(new Uint8Array(ct)),
        note: 'Token de GitHub cifrado con la contraseña maestra del panel de administración. No contiene la contraseña.' };
    });
  }
  function unlockToken(cfg, password) {
    return deriveKey(password, bytesFromB64(cfg.salt), cfg.iterations || ITER).then(function (key) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytesFromB64(cfg.iv) }, key, bytesFromB64(cfg.token));
    }).then(function (pt) { return new TextDecoder().decode(pt); });
  }

  // ---------- GitHub API ----------
  function gh(path, opts, token) {
    opts = opts || {};
    var headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', Authorization: 'Bearer ' + (token || session.token) };
    if (opts.body) headers['Content-Type'] = 'application/json';
    return fetch('https://api.github.com' + path, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined, cache: 'no-store' })
      .then(function (r) {
        var exp = r.headers.get('github-authentication-token-expiration');
        if (exp) session.tokenExpires = exp;
        if (r.status === 404 && opts.allow404) return null;
        return r.text().then(function (t) {
          var data = t ? JSON.parse(t) : null;
          if (!r.ok) {
            var e = new Error((data && data.message) || ('HTTP ' + r.status));
            e.status = r.status;
            throw e;
          }
          return data;
        });
      });
  }
  var R = '/repos/' + REPO.owner + '/' + REPO.name;
  function readJSON(path, token) {
    return gh(R + '/contents/' + path + '?ref=' + REPO.branch, { allow404: true }, token).then(function (d) {
      if (!d) return null;
      return JSON.parse(new TextDecoder().decode(bytesFromB64(d.content)));
    });
  }
  // One commit with several files. files: [{path, text}|{path, base64}|{path, remove:true}]
  function commit(files, message, token, retry) {
    var base;
    return gh(R + '/git/ref/heads/' + REPO.branch, null, token).then(function (ref) {
      base = ref.object.sha;
      return gh(R + '/git/commits/' + base, null, token);
    }).then(function (c) {
      return Promise.all(files.map(function (f) {
        if (f.remove) return Promise.resolve({ path: f.path, mode: '100644', type: 'blob', sha: null });
        var body = f.base64 != null ? { content: f.base64, encoding: 'base64' } : { content: f.text, encoding: 'utf-8' };
        return gh(R + '/git/blobs', { method: 'POST', body: body }, token).then(function (b) { return { path: f.path, mode: '100644', type: 'blob', sha: b.sha }; });
      })).then(function (tree) {
        return gh(R + '/git/trees', { method: 'POST', body: { base_tree: c.tree.sha, tree: tree } }, token);
      });
    }).then(function (tree) {
      return gh(R + '/git/commits', { method: 'POST', body: { message: message + '\n\n(Desde el panel de administración del sitio)', tree: tree.sha, parents: [base] } }, token);
    }).then(function (nc) {
      return gh(R + '/git/refs/heads/' + REPO.branch, { method: 'PATCH', body: { sha: nc.sha } }, token);
    }).catch(function (e) {
      // Someone else committed in between: try once more on top of it
      if (!retry && (e.status === 422 || e.status === 409)) return commit(files, message, token, true);
      throw e;
    });
  }
  function errText(e) {
    if (e && e.status === 401) return 'GitHub rechazó el token (puede estar vencido). Reemplácelo en Ajustes.';
    if (e && e.status === 403) return 'El token no tiene permiso para escribir en el repositorio (necesita "Contents: Read and write").';
    return 'No se pudo guardar: ' + (e && e.message ? e.message : e);
  }

  // ---------- screens ----------
  // Read data/admin.json fresh from GitHub (public repo, no token needed),
  // so a just-changed password works at once; fall back to the site's copy.
  function loadConfig() {
    var site = function () { return fetch('../data/admin.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); };
    return fetch('https://api.github.com' + R + '/contents/data/admin.json?ref=' + REPO.branch, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' })
      .then(function (r) {
        if (r.status === 404) return null;
        if (!r.ok) return site();
        return r.json().then(function (d) { return JSON.parse(new TextDecoder().decode(bytesFromB64(d.content))); });
      }).catch(site);
  }

  function showSetup() {
    $('.adm-top-actions').hidden = true;
    app.innerHTML =
      '<section class="adm-card adm-narrow"><h1>Configurar el panel</h1>' +
      '<p>Esto se hace una sola vez. El panel guarda los cambios en GitHub, así que necesita un <strong>token de acceso de GitHub</strong> que solo pueda escribir en este sitio.</p>' +
      '<ol class="adm-steps"><li>Abra <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">GitHub → Fine-grained token nuevo</a> (con la cuenta dueña del sitio).</li>' +
      '<li><strong>Repository access:</strong> “Only select repositories” → <code>' + esc(REPO.owner + '/' + REPO.name) + '</code>.</li>' +
      '<li><strong>Permissions → Repository → Contents:</strong> “Read and write”. Nada más.</li>' +
      '<li>Elija la fecha de vencimiento (por ejemplo, 1 año), cree el token y cópielo.</li></ol>' +
      '<form id="setup" class="adm-form">' +
      '<label>Token de GitHub<input type="password" name="token" autocomplete="off" required placeholder="github_pat_…"></label>' +
      '<label>Contraseña maestra<input type="password" name="pw" autocomplete="new-password" required minlength="10"></label>' +
      '<label>Repetir contraseña<input type="password" name="pw2" autocomplete="new-password" required minlength="10"></label>' +
      '<p class="adm-hint">El token se guarda cifrado con esta contraseña. La contraseña no se guarda en ningún lugar: si la olvida, solo tendrá que configurar el panel otra vez con un token nuevo.</p>' +
      '<button class="adm-btn" type="submit">Guardar y entrar</button></form></section>';
    $('#setup').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, btn = f.querySelector('button');
      var token = f.token.value.trim(), pw = f.pw.value;
      if (pw !== f.pw2.value) return toast('Las contraseñas no coinciden.', 'error');
      busy(btn, true, 'Comprobando…');
      readJSON('data/eventos.json', token).then(function () {
        return lockToken(token, pw);
      }).then(function (cfg) {
        return commit([{ path: 'data/admin.json', text: JSON.stringify(cfg, null, 1) + '\n' }], 'Configurar el panel de administración', token).then(function () { return cfg; });
      }).then(function (cfg) {
        session = { token: token, password: pw, config: cfg, tokenExpires: session.tokenExpires };
        toast('¡Listo! El panel está configurado.', 'ok');
        startDashboard();
      }).catch(function (err) {
        busy(btn, false);
        toast(err.status === 401 || err.status === 404 ? 'El token no es válido o no tiene acceso a ' + REPO.owner + '/' + REPO.name + '.' : errText(err), 'error');
      });
    });
  }

  function showLogin(cfg) {
    $('.adm-top-actions').hidden = true;
    app.innerHTML =
      '<section class="adm-card adm-narrow"><h1>Iniciar sesión</h1>' +
      '<form id="login" class="adm-form"><label>Contraseña maestra<input type="password" name="pw" autocomplete="current-password" required autofocus></label>' +
      '<button class="adm-btn" type="submit">Entrar</button></form></section>';
    $('#login').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = e.target.querySelector('button'), pw = e.target.pw.value;
      busy(btn, true, 'Verificando…');
      unlockToken(cfg, pw).then(function (token) {
        session = { token: token, password: pw, config: cfg, tokenExpires: null };
        startDashboard();
      }, function () {
        busy(btn, false);
        toast('Contraseña incorrecta.', 'error');
        e.target.pw.select();
      });
    });
  }

  function startDashboard() {
    $('.adm-top-actions').hidden = false;
    app.innerHTML = '<p class="adm-loading">Cargando datos…</p>';
    Promise.all([readJSON('data/eventos.json'), readJSON('data/boletines.json')]).then(function (r) {
      state.eventos = (r[0] && r[0].eventos) || [];
      state.boletines = r[1] || [];
      render();
    }).catch(function (e) {
      app.innerHTML = '<section class="adm-card"><p>' + esc(errText(e).replace('No se pudo guardar', 'No se pudieron cargar los datos')) + '</p><button class="adm-btn" data-action="retry">Intentar de nuevo</button></section>';
    });
  }

  function render() {
    var tabs = [['calendario', 'Calendario'], ['boletines', 'Boletines'], ['ajustes', 'Ajustes']];
    app.innerHTML = '<nav class="adm-tabs" role="tablist">' + tabs.map(function (t) {
      return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (state.tab === t[0]) + '">' + t[1] + '</button>';
    }).join('') + '</nav><div class="adm-panel"></div>';
    var panel = $('.adm-panel');
    if (state.tab === 'calendario') (state.editing ? renderEventForm : renderEvents)(panel);
    if (state.tab === 'boletines') renderBoletines(panel);
    if (state.tab === 'ajustes') renderAjustes(panel);
  }

  // ---------- Calendario ----------
  function sortEvents(list) { return list.slice().sort(function (a, b) { return (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || '')); }); }
  function renderEvents(panel) {
    var today = iso(new Date());
    var weekly = sortEvents(state.eventos.filter(function (e) { return e.repetir === 'semanal'; }));
    var upcoming = sortEvents(state.eventos.filter(function (e) { return e.repetir !== 'semanal' && (e.fechaFin || e.fecha) >= today; }));
    var past = sortEvents(state.eventos.filter(function (e) { return e.repetir !== 'semanal' && (e.fechaFin || e.fecha) < today; })).reverse();
    function rows(list) {
      if (!list.length) return '<p class="adm-empty">Ninguno.</p>';
      return '<ul class="adm-list">' + list.map(function (ev) {
        return '<li><div class="adm-li-main"><strong>' + esc(ev.titulo) + '</strong><span>' + esc(fmtWhen(ev)) + '</span>' +
          '<span class="adm-tags">' + (ev.notificar ? '<em class="t-bell">Notificación</em>' : '') + (ev.imagenes && ev.imagenes.length ? '<em>' + ev.imagenes.length + ' cartel(es)</em>' : '') + '<em>' + esc((CATS.filter(function (c) { return c[0] === ev.categoria; })[0] || CATS[4])[1]) + '</em></span></div>' +
          '<div class="adm-li-act"><button type="button" class="adm-btn sm ghost" data-edit="' + esc(ev.id) + '">Editar</button>' +
          '<button type="button" class="adm-btn sm danger" data-del="' + esc(ev.id) + '">Eliminar</button></div></li>';
      }).join('') + '</ul>';
    }
    panel.innerHTML = '<div class="adm-bar"><h2>Eventos</h2><button type="button" class="adm-btn" data-action="new-event">+ Nuevo evento</button></div>' +
      '<section class="adm-card"><h3>Próximos</h3>' + rows(upcoming) + '</section>' +
      '<section class="adm-card"><h3>Cada semana</h3>' + rows(weekly) + '</section>' +
      '<details class="adm-card"><summary><h3>Pasados (' + past.length + ')</h3></summary>' + rows(past) + '</details>';
  }

  function renderEventForm(panel) {
    var ev = state.editing === 'new' ? { categoria: 'especial', lugar: GREEN, imagenes: [] } : JSON.parse(JSON.stringify(state.eventos.filter(function (e) { return e.id === state.editing; })[0]));
    var opts = CATS.map(function (c) { return '<option value="' + c[0] + '"' + (ev.categoria === c[0] ? ' selected' : '') + '>' + c[1] + '</option>'; }).join('');
    panel.innerHTML = '<div class="adm-bar"><h2>' + (state.editing === 'new' ? 'Nuevo evento' : 'Editar evento') + '</h2><button type="button" class="adm-btn ghost" data-action="cancel-edit">Volver</button></div>' +
      '<form id="evform" class="adm-card adm-form">' +
      '<label>Título *<input name="titulo" required maxlength="120" value="' + esc(ev.titulo || '') + '"></label>' +
      '<div class="adm-row"><label>Categoría<select name="categoria">' + opts + '</select></label>' +
      '<label>Fecha *<input type="date" name="fecha" required value="' + esc(ev.fecha || '') + '"></label>' +
      '<label class="adm-not-weekly">Fecha final <small>(si dura varios días)</small><input type="date" name="fechaFin" value="' + esc(ev.fechaFin || '') + '"></label></div>' +
      '<div class="adm-row"><label>Hora<input type="time" name="hora" value="' + esc(ev.hora || '') + '"></label>' +
      '<label>Hora final<input type="time" name="horaFin" value="' + esc(ev.horaFin || '') + '"></label></div>' +
      '<label class="adm-check"><input type="checkbox" name="semanal"' + (ev.repetir === 'semanal' ? ' checked' : '') + '> Se repite cada semana (el mismo día de la semana que la fecha)</label>' +
      '<label class="adm-only-weekly">Repetir hasta <small>(opcional)</small><input type="date" name="repetirHasta" value="' + esc(ev.repetirHasta || '') + '"></label>' +
      '<label>Lugar<input name="lugar" maxlength="160" value="' + esc(ev.lugar || '') + '"></label>' +
      '<label>Descripción<textarea name="descripcion" rows="4" maxlength="1500">' + esc(ev.descripcion || '') + '</textarea></label>' +
      '<label class="adm-check adm-not-weekly"><input type="checkbox" name="notificar"' + (ev.notificar ? ' checked' : '') + '> Mostrar en la campana de notificaciones (hasta que termine el evento)</label>' +
      '<fieldset class="adm-imgs"><legend>Carteles <small>(opcional; primero el de español)</small></legend><div class="adm-img-list"></div>' +
      '<label class="adm-file">+ Agregar cartel<input type="file" accept="image/*" multiple hidden></label></fieldset>' +
      '<div class="adm-actions"><button type="submit" class="adm-btn">Guardar evento</button></div></form>';
    var form = $('#evform');
    var images = (ev.imagenes || []).map(function (im) { return { src: im.src, idioma: im.idioma || 'es', alt: im.alt || '' }; });
    function drawImages() {
      $('.adm-img-list', form).innerHTML = images.map(function (im, i) {
        var url = im.file ? im.preview : '../' + im.src;
        return '<div class="adm-img"><img src="' + esc(url) + '" alt="">' +
          '<select data-lang="' + i + '"><option value="es"' + (im.idioma === 'es' ? ' selected' : '') + '>Español</option><option value="en"' + (im.idioma === 'en' ? ' selected' : '') + '>English</option></select>' +
          '<button type="button" class="adm-btn sm danger" data-rmimg="' + i + '">Quitar</button></div>';
      }).join('') || '<p class="adm-empty">Sin carteles.</p>';
    }
    function weeklyUI() {
      var w = form.semanal.checked;
      form.querySelectorAll('.adm-not-weekly').forEach(function (el) { el.hidden = w; });
      form.querySelectorAll('.adm-only-weekly').forEach(function (el) { el.hidden = !w; });
    }
    drawImages(); weeklyUI();
    form.semanal.addEventListener('change', weeklyUI);
    form.addEventListener('change', function (e) {
      if (e.target.dataset.lang != null) images[+e.target.dataset.lang].idioma = e.target.value;
      if (e.target.type === 'file') {
        Array.prototype.forEach.call(e.target.files, function (file) {
          images.push({ file: file, preview: URL.createObjectURL(file), idioma: images.some(function (x) { return x.idioma === 'es'; }) ? 'en' : 'es' });
        });
        e.target.value = '';
        drawImages();
      }
    });
    form.addEventListener('click', function (e) {
      if (e.target.dataset.rmimg != null) { images.splice(+e.target.dataset.rmimg, 1); drawImages(); }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form, btn = f.querySelector('[type=submit]');
      var weekly = f.semanal.checked;
      var out = {
        id: ev.id || (slug(f.titulo.value) + '-' + f.fecha.value),
        titulo: f.titulo.value.trim(), categoria: f.categoria.value, fecha: f.fecha.value
      };
      if (!weekly && f.fechaFin.value && f.fechaFin.value > f.fecha.value) out.fechaFin = f.fechaFin.value;
      if (f.hora.value) out.hora = f.hora.value;
      if (f.horaFin.value) out.horaFin = f.horaFin.value;
      if (f.lugar.value.trim()) out.lugar = f.lugar.value.trim();
      if (f.descripcion.value.trim()) out.descripcion = f.descripcion.value.trim();
      if (weekly) { out.repetir = 'semanal'; if (f.repetirHasta.value) out.repetirHasta = f.repetirHasta.value; if (ev.excepciones) out.excepciones = ev.excepciones; }
      else if (f.notificar.checked) out.notificar = true;
      if (!out.titulo || !out.fecha) return toast('Falta el título o la fecha.', 'error');
      if (state.editing === 'new') {
        var n = 2, base = out.id;
        while (state.eventos.some(function (x) { return x.id === out.id; })) out.id = base + '-' + (n++);
      }
      // Spanish posters first
      images.sort(function (x, y) { return (x.idioma === 'en') - (y.idioma === 'en'); });
      busy(btn, true);
      var files = [];
      Promise.all(images.map(function (im, i) {
        if (!im.file) return Promise.resolve({ src: im.src, idioma: im.idioma, alt: im.alt || ((im.idioma === 'en' ? 'Poster: ' : 'Cartel: ') + out.titulo) });
        var path = 'assets/img/eventos/' + out.id + '-' + im.idioma + '-' + Date.now().toString(36) + i + '.jpg';
        return toJpegBase64(im.file).then(function (b64) {
          files.push({ path: path, base64: b64 });
          return { src: path, idioma: im.idioma, alt: (im.idioma === 'en' ? 'Poster: ' : 'Cartel: ') + out.titulo };
        });
      })).then(function (imgs) {
        if (imgs.length) out.imagenes = imgs;
        // Remove poster files this edit dropped (only ones the panel uploaded)
        (ev.imagenes || []).forEach(function (old) {
          if (/^assets\/img\/eventos\//.test(old.src) && !imgs.some(function (x) { return x.src === old.src; })) files.push({ path: old.src, remove: true });
        });
        return saveEvents(function (list) {
          var i = list.findIndex(function (x) { return x.id === out.id; });
          if (i === -1) list.push(out); else list[i] = out;
        }, files, (state.editing === 'new' ? 'Agregar evento: ' : 'Editar evento: ') + out.titulo);
      }).then(function () {
        state.editing = null;
        toast('✓ Evento guardado. El sitio se actualizará en 1–2 minutos.', 'ok');
        render();
      }).catch(function (err) { busy(btn, false); toast(errText(err), 'error'); });
    });
  }

  // Re-read the latest events from GitHub, apply the change, commit (with any extra files)
  function saveEvents(change, extraFiles, message) {
    return readJSON('data/eventos.json').then(function (d) {
      var list = (d && d.eventos) || [];
      change(list);
      list = sortEvents(list);
      return commit([{ path: 'data/eventos.json', text: JSON.stringify({ eventos: list }, null, 1) + '\n' }].concat(extraFiles || []), message).then(function () {
        state.eventos = list;
      });
    });
  }

  function toJpegBase64(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var max = 1600, w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.round(w * s); c.height = Math.round(h * s);
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.86).split(',')[1]);
      };
      img.onerror = function () { reject(new Error('No se pudo leer la imagen ' + file.name)); };
      img.src = URL.createObjectURL(file);
    });
  }

  // ---------- Boletines ----------
  function lastSunday() { var d = new Date(); d.setDate(d.getDate() - d.getDay()); return d; }
  function renderBoletines(panel) {
    panel.innerHTML = '<div class="adm-bar"><h2>Boletines semanales</h2></div>' +
      '<form id="bolform" class="adm-card adm-form"><h3>Subir boletín</h3>' +
      '<div class="adm-row"><label>Fecha (domingo)<input type="date" name="fecha" required value="' + iso(lastSunday()) + '"></label>' +
      '<label>Archivo PDF<input type="file" name="pdf" accept="application/pdf" required></label></div>' +
      '<div class="adm-actions"><button class="adm-btn" type="submit">Subir boletín</button></div></form>' +
      '<section class="adm-card"><h3>Publicados (' + state.boletines.length + ')</h3><ul class="adm-list">' +
      state.boletines.slice(0, 12).map(function (b, i) {
        return '<li><div class="adm-li-main"><strong>' + esc(b.fecha) + '</strong><span>' + esc(b.dia || '') + (i === 0 ? ' · <em class="t-bell">Actual</em>' : '') + '</span></div>' +
          '<div class="adm-li-act"><a class="adm-btn sm ghost" href="../' + esc(b.archivo) + '" target="_blank" rel="noopener">Ver</a>' +
          '<button type="button" class="adm-btn sm danger" data-delbol="' + esc(b.archivo) + '">Quitar</button></div></li>';
      }).join('') + '</ul>' + (state.boletines.length > 12 ? '<p class="adm-hint">Se muestran los 12 más recientes.</p>' : '') + '</section>';
    $('#bolform').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, btn = f.querySelector('[type=submit]'), file = f.pdf.files[0];
      if (!file) return;
      if (file.size > 20 * 1024 * 1024) return toast('El PDF es demasiado grande (máximo 20 MB).', 'error');
      var d = parseDate(f.fecha.value);
      var path = 'boletines/' + f.fecha.value + '.pdf';
      var entry = { fecha: d.getDate() + ' de ' + cap(MESES[d.getMonth()]) + ', ' + d.getFullYear(), dia: cap(DIAS[d.getDay()]), archivo: path };
      if (state.boletines.some(function (b) { return b.archivo === path; }) && !confirm('Ya hay un boletín para esa fecha. ¿Reemplazarlo?')) return;
      busy(btn, true, 'Subiendo…');
      file.arrayBuffer().then(function (buf) {
        var b64 = b64FromBytes(new Uint8Array(buf));
        return readJSON('data/boletines.json').then(function (list) {
          list = (list || []).filter(function (b) { return b.archivo !== path; });
          list.push(entry);
          list.sort(function (a, b) { return b.archivo.localeCompare(a.archivo); });
          return commit([{ path: path, base64: b64 }, { path: 'data/boletines.json', text: JSON.stringify(list, null, 1) + '\n' }], 'Boletín ' + entry.fecha).then(function () { state.boletines = list; });
        });
      }).then(function () {
        toast('✓ Boletín publicado. El sitio se actualizará en 1–2 minutos.', 'ok');
        render();
      }).catch(function (err) { busy(btn, false); toast(errText(err), 'error'); });
    });
  }

  // ---------- Ajustes ----------
  function renderAjustes(panel) {
    var exp = session.tokenExpires ? new Date(session.tokenExpires.replace(' UTC', 'Z').replace(' ', 'T')) : null;
    panel.innerHTML = '<div class="adm-bar"><h2>Ajustes</h2></div>' +
      '<section class="adm-card"><h3>Token de GitHub</h3><p>' + (exp && !isNaN(exp) ? 'Vence el <strong>' + exp.getDate() + ' de ' + MESES[exp.getMonth()] + ' de ' + exp.getFullYear() + '</strong>. Antes de esa fecha, cree uno nuevo y reemplácelo aquí.' : 'Token activo.') + '</p>' +
      '<form id="tokform" class="adm-form"><label>Token nuevo<input type="password" name="token" autocomplete="off" required placeholder="github_pat_…"></label>' +
      '<div class="adm-actions"><button class="adm-btn" type="submit">Reemplazar token</button></div></form></section>' +
      '<section class="adm-card"><h3>Cambiar la contraseña maestra</h3><form id="pwform" class="adm-form">' +
      '<label>Contraseña nueva<input type="password" name="pw" autocomplete="new-password" required minlength="10"></label>' +
      '<label>Repetir contraseña<input type="password" name="pw2" autocomplete="new-password" required minlength="10"></label>' +
      '<div class="adm-actions"><button class="adm-btn" type="submit">Cambiar contraseña</button></div></form></section>';
    function relock(token, pw, btn, msg) {
      busy(btn, true);
      return lockToken(token, pw).then(function (cfg) {
        return commit([{ path: 'data/admin.json', text: JSON.stringify(cfg, null, 1) + '\n' }], msg, token).then(function () {
          session.token = token; session.password = pw; session.config = cfg;
        });
      }).then(function () { busy(btn, false); toast('✓ Guardado.', 'ok'); render(); })
        .catch(function (err) { busy(btn, false); toast(errText(err), 'error'); });
    }
    $('#tokform').addEventListener('submit', function (e) {
      e.preventDefault();
      var token = e.target.token.value.trim(), btn = e.target.querySelector('button');
      busy(btn, true, 'Comprobando…');
      readJSON('data/eventos.json', token).then(function () { return relock(token, session.password, btn, 'Reemplazar el token del panel de administración'); },
        function () { busy(btn, false); toast('El token nuevo no es válido o no tiene acceso al repositorio.', 'error'); });
    });
    $('#pwform').addEventListener('submit', function (e) {
      e.preventDefault();
      if (e.target.pw.value !== e.target.pw2.value) return toast('Las contraseñas no coinciden.', 'error');
      relock(session.token, e.target.pw.value, e.target.querySelector('button'), 'Cambiar la contraseña del panel de administración');
    });
  }

  // ---------- global clicks ----------
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab],[data-action],[data-edit],[data-del],[data-delbol]');
    if (!t) return;
    if (t.dataset.tab) { state.tab = t.dataset.tab; state.editing = null; return render(); }
    if (t.dataset.edit) { state.editing = t.dataset.edit; return render(); }
    if (t.dataset.del) {
      var ev = state.eventos.filter(function (x) { return x.id === t.dataset.del; })[0];
      if (!ev || !confirm('¿Eliminar “' + ev.titulo + '”?')) return;
      busy(t, true, '…');
      var files = (ev.imagenes || []).filter(function (im) { return /^assets\/img\/eventos\//.test(im.src); }).map(function (im) { return { path: im.src, remove: true }; });
      return saveEvents(function (list) {
        var i = list.findIndex(function (x) { return x.id === ev.id; });
        if (i !== -1) list.splice(i, 1);
      }, files, 'Eliminar evento: ' + ev.titulo).then(function () { toast('✓ Evento eliminado.', 'ok'); render(); })
        .catch(function (err) { busy(t, false); toast(errText(err), 'error'); });
    }
    if (t.dataset.delbol) {
      var path = t.dataset.delbol;
      if (!confirm('¿Quitar este boletín del sitio? El PDF también se borrará.')) return;
      busy(t, true, '…');
      return readJSON('data/boletines.json').then(function (list) {
        list = (list || []).filter(function (b) { return b.archivo !== path; });
        return commit([{ path: 'data/boletines.json', text: JSON.stringify(list, null, 1) + '\n' }, { path: path, remove: true }], 'Quitar boletín ' + path).then(function () { state.boletines = list; });
      }).then(function () { toast('✓ Boletín quitado.', 'ok'); render(); })
        .catch(function (err) { busy(t, false); toast(errText(err), 'error'); });
    }
    var a = t.dataset.action;
    if (a === 'new-event') { state.editing = 'new'; render(); }
    if (a === 'cancel-edit') { state.editing = null; render(); }
    if (a === 'retry') startDashboard();
    if (a === 'logout') { session = { token: null, password: null, config: null }; state = { eventos: [], boletines: [], tab: 'calendario', editing: null }; boot(); }
  });

  function boot() {
    if (!window.crypto || !crypto.subtle) {
      app.innerHTML = '<section class="adm-card"><p>Este navegador no puede abrir el panel de forma segura. Use una versión reciente de Chrome, Safari, Edge o Firefox.</p></section>';
      return;
    }
    app.innerHTML = '<p class="adm-loading">Cargando…</p>';
    loadConfig().then(function (cfg) { if (cfg && cfg.token) showLogin(cfg); else showSetup(); });
  }
  boot();
})();
