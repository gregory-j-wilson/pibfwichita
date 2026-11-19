/* Bible reference helpers (needs assets/js/biblia-libros.js first).
   BIBLIA.parse("2 Juan, 3 Juan y Judas") → [{code, nombre, cap, capFin, vers}, …]
   BIBLIA.url(code, cap, vers) → the passage in the RVR1960 on YouVersion. */
(function () {
  'use strict';
  var L = window.BIBLIA_LIBROS || [];
  function fold(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }

  // Names people type: full name, without accents, and common abbreviations
  var EXTRA = {
    GEN: ['gen', 'gn'], EXO: ['ex', 'exo'], LEV: ['lev', 'lv'], NUM: ['num', 'nm'], DEU: ['deut', 'dt'], JOS: ['jos'], JDG: ['jue', 'jc'],
    '1SA': ['1 sam', '1 s'], '2SA': ['2 sam', '2 s'], '1KI': ['1 rey', '1 r'], '2KI': ['2 rey', '2 r'], '1CH': ['1 cron', '1 cr'], '2CH': ['2 cron', '2 cr'],
    EZR: ['esd'], NEH: ['neh'], EST: ['est'], PSA: ['sal', 'salmo', 'sl'], PRO: ['prov', 'pr'], ECC: ['ecl', 'ec'], SNG: ['cantar de los cantares', 'cant', 'cnt'],
    ISA: ['is', 'isa'], JER: ['jer', 'jr'], LAM: ['lam'], EZK: ['ez', 'eze'], DAN: ['dn'], HOS: ['os'], JOL: ['jl'], AMO: ['am'], OBA: ['abd'],
    JON: ['jon'], MIC: ['miq'], NAM: ['nah'], HAB: ['hab'], ZEP: ['sof'], HAG: ['hag'], ZEC: ['zac'], MAL: ['mal'],
    MAT: ['mt', 'mat'], MRK: ['mr', 'mc', 'mar'], LUK: ['lc', 'luc'], JHN: ['jn', 'jua'], ACT: ['hch', 'hech'], ROM: ['ro', 'rom'],
    '1CO': ['1 co', '1 cor'], '2CO': ['2 co', '2 cor'], GAL: ['ga', 'gal'], EPH: ['ef', 'efe'], PHP: ['fil', 'flp'], COL: ['col'],
    '1TH': ['1 ts', '1 tes'], '2TH': ['2 ts', '2 tes'], '1TI': ['1 ti', '1 tim'], '2TI': ['2 ti', '2 tim'], TIT: ['tit'], PHM: ['flm', 'filem'],
    HEB: ['he', 'heb'], JAS: ['stg', 'sant'], '1PE': ['1 p', '1 pe', '1 ped'], '2PE': ['2 p', '2 pe', '2 ped'],
    '1JN': ['1 jn'], '2JN': ['2 jn'], '3JN': ['3 jn'], JUD: ['jud'], REV: ['ap', 'apoc']
  };
  var names = [];
  L.forEach(function (b) {
    [b[1]].concat(EXTRA[b[0]] || []).forEach(function (n) {
      var f = fold(n);
      names.push([f, b]);
      // "1 Juan" also typed as "1Juan", "I Juan", "primera de Juan"
      var m = f.match(/^([123]) (.+)$/);
      if (m) { names.push([m[1] + m[2], b]); names.push([['i', 'ii', 'iii'][m[1] - 1] + ' ' + m[2], b]); }
    });
  });
  names.sort(function (a, b) { return b[0].length - a[0].length; });

  function book(code) { for (var i = 0; i < L.length; i++) if (L[i][0] === code) return L[i]; return null; }

  // Parse text like "Apocalipsis 1-3", "1 Juan 4, 5", "Juan 3:16", "2 Juan; 3 Juan y Judas"
  function parse(text) {
    var out = [], cur = null, bad = [];
    String(text || '').replace(/[–—]/g, '-').replace(/^\s*(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s*:\s*/i, '').split(/\s*(?:[,;]|\by\b|&)\s*/i).forEach(function (seg) {
      seg = seg.trim().replace(/\.$/, '');
      if (!seg) return;
      var f = fold(seg).replace(/\bcap(itulos?\b\.?|s?\.)\s*/g, '').replace(/:\s+/, ' ').replace(/\s+/g, ' ').trim().replace(/^(primera|primero)\s+(de\s+)?/, '1 ').replace(/^(segunda|segundo)\s+(de\s+)?/, '2 ').replace(/^(tercera|tercero)\s+(de\s+)?/, '3 ');
      var found = null, rest = f;
      for (var i = 0; i < names.length; i++) {
        var n = names[i][0];
        if (f === n || (f.indexOf(n) === 0 && /[\s\d.:]/.test(f.charAt(n.length)))) { found = names[i][1]; rest = f.slice(n.length).replace(/^[.\s]+/, ''); break; }
      }
      if (found) cur = found;
      else if (!cur || !/^\d/.test(f)) { bad.push(seg); return; }
      var b = cur, chs = b[3].length;
      var m = rest.match(/^(\d+)(?::(\d+)(?:-(\d+))?)?(?:\s*-\s*(\d+))?$/);
      var ref = { code: b[0], nombre: b[1], cap: 1 };
      if (!rest) { ref.cap = 1; if (chs > 1) ref.capFin = chs; }
      else if (m) {
        ref.cap = +m[1];
        if (m[2]) { ref.vers = +m[2]; if (m[3]) ref.versFin = +m[3]; }
        else if (m[4]) ref.capFin = +m[4];
      } else { bad.push(seg); return; }
      if (ref.cap < 1 || ref.cap > chs || (ref.capFin && (ref.capFin < ref.cap || ref.capFin > chs)) || (ref.vers && ref.vers > b[3][ref.cap - 1])) { bad.push(seg); return; }
      out.push(ref);
    });
    out.bad = bad;
    return out;
  }

  function label(r) {
    var one = book(r.code)[3].length === 1;
    if (r.vers) return r.nombre + ' ' + r.cap + ':' + r.vers + (r.versFin ? '-' + r.versFin : '');
    if (r.capFin) return r.nombre + ' ' + r.cap + '–' + r.capFin;
    return one ? r.nombre : r.nombre + ' ' + r.cap;
  }

  function url(code, cap, vers) {
    return 'https://www.bible.com/bible/149/' + code + '.' + cap + (vers ? '.' + vers : '') + '.RVR1960';
  }

  window.BIBLIA = { libros: L, book: book, parse: parse, label: label, url: url, fold: fold };
})();
