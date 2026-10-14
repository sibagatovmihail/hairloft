/* The HairLoft by Colle & Roy: header, opening status, services index, modals and the step forms. No dependencies. */
(function () {
  'use strict';

  /* ---------- Salon data (single source for status, calendar and slots) ---------- */
  // ISO weekday (1 = Monday) -> [open, close] in minutes; missing = closed
  var HOURS = { 2: [480, 1080], 3: [480, 1080], 4: [480, 1080], 5: [480, 1080] };
  var DAYS_SHORT = ['', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  var DAYS_LONG = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  // Web3Forms key placeholder: while it is in place, forms are only simulated (draft mode)
  var KEY_PLACEHOLDER = 'WEB3FORMS-KEY';

  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hhmm(min) { return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
  function isoDay(d) { return d.getDay() || 7; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  /* "now" in the salon's time zone, as a Date whose local fields are Berlin's */
  function berlinNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).formatToParts(new Date());
      var v = {};
      parts.forEach(function (p) { v[p.type] = parseInt(p.value, 10); });
      return new Date(v.year, v.month - 1, v.day, v.hour, v.minute);
    } catch (e) {
      return new Date();
    }
  }

  /* public holidays in Mecklenburg-Vorpommern */
  var holidayCache = {};
  function holidays(year) {
    if (holidayCache[year]) return holidayCache[year];
    var a = year % 19, b = Math.floor(year / 100), c = year % 100;
    var d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31) - 1, day = ((h + l - 7 * m + 114) % 31) + 1;
    var set = {};
    function add(mo, da) { set[ymd(new Date(year, mo, da))] = true; }
    [[0, 1], [2, 8], [4, 1], [9, 3], [9, 31], [11, 25], [11, 26]].forEach(function (x) { add(x[0], x[1]); });
    [-2, 1, 39, 50].forEach(function (off) { add(month, day + off); });   // Karfreitag, Ostermontag, Himmelfahrt, Pfingstmontag
    holidayCache[year] = set;
    return set;
  }
  function isHoliday(d) { return !!holidays(d.getFullYear())[ymd(d)]; }
  function hoursOn(d) { return isHoliday(d) ? null : (HOURS[isoDay(d)] || null); }

  /* ---------- Scroll lock (menu, dialogs): pin the body, restore the exact offset ---------- */
  var lockY = 0, locks = 0;
  function lock() {
    if (locks++) return;
    lockY = window.scrollY || window.pageYOffset;
    document.body.style.top = -lockY + 'px';
    document.body.classList.add('is-locked');
  }
  function unlock() {
    if (!locks || --locks) return;
    document.body.classList.remove('is-locked');
    document.body.style.top = '';
    window.scrollTo(0, lockY);
  }

  /* ---------- Header: gliding tint ---------- */
  function initTint() {
    var nav = document.querySelector('.nav');
    var tint = nav && nav.querySelector('.nav__tint');
    if (!tint) return;
    function place(a) {
      tint.style.width = a.offsetWidth + 'px';
      tint.style.transform = 'translateX(' + a.offsetLeft + 'px)';
    }
    function on(a) {
      if (tint.classList.contains('is-on')) {
        tint.classList.add('is-moving');
        place(a);
      } else {
        tint.classList.remove('is-moving');   // appears in place, no slide-in from 0
        place(a);
        void tint.offsetWidth;
        tint.classList.add('is-on');
      }
    }
    function off() { tint.classList.remove('is-on', 'is-moving'); }
    nav.addEventListener('mouseover', function (e) {
      var a = e.target.closest ? e.target.closest('.nav__link') : null;
      if (a) on(a); else off();
    });
    nav.addEventListener('mouseleave', off);
    nav.addEventListener('focusin', function (e) {
      var a = e.target.closest ? e.target.closest('.nav__link') : null;
      if (a && a.matches(':focus-visible')) on(a); else off();
    });
    nav.addEventListener('focusout', off);
  }

  /* ---------- Header: phone menu ---------- */
  function initMenu() {
    var toggle = document.querySelector('.nav__toggle');
    var menu = document.getElementById('menu');
    if (!toggle || !menu) return;
    var open = false;
    function set(state) {
      if (state === open) return;
      open = state;
      menu.classList.toggle('is-open', open);
      document.documentElement.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
      if (open) lock(); else unlock();
    }
    toggle.addEventListener('click', function () { set(!open); });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) set(false);   // unlock first, then the link jumps
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) { set(false); toggle.focus(); }
    });
    var mq = window.matchMedia('(min-width: 56.3125rem)');
    var onChange = function () { if (mq.matches) set(false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else mq.addListener(onChange);
  }

  /* ---------- Opening status ---------- */
  function initStatus() {
    var now = berlinNow();
    var minutes = now.getHours() * 60 + now.getMinutes();
    var today = hoursOn(now);
    var isOpen = !!today && minutes >= today[0] && minutes < today[1];
    var short, rest, sub;

    if (isOpen) {
      short = 'Geöffnet';
      sub = 'bis ' + hhmm(today[1]) + ' Uhr';
      rest = '· ' + sub;
    } else {
      short = 'Geschlossen';
      var next = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      var h = today && minutes < today[0] ? today : null;
      var offset = 0;
      while (!h && offset < 14) {
        offset++;
        next.setDate(next.getDate() + 1);
        h = hoursOn(next);
      }
      if (h) {
        var when = offset === 0 ? 'heute' : offset === 1 ? 'morgen' : DAYS_SHORT[isoDay(next)];
        var whenLong = offset === 0 ? 'heute' : offset === 1 ? 'morgen' : DAYS_LONG[isoDay(next)];
        rest = '· öffnet ' + when + ' ' + hhmm(h[0]) + ' Uhr';
        sub = 'Öffnet ' + whenLong + ', ' + hhmm(h[0]) + ' Uhr';
      } else {
        rest = '';
        sub = '';
      }
    }

    document.querySelectorAll('[data-status]').forEach(function (el) {
      el.classList.toggle('is-open-now', isOpen);
      var s = el.querySelector('[data-status-short]');
      var r = el.querySelector('[data-status-rest]');
      var big = el.querySelector('[data-status-big]');
      var small = el.querySelector('[data-status-sub]');
      if (s) s.textContent = short;
      if (r) r.textContent = rest;
      if (big) big.textContent = short;
      if (small) small.textContent = sub;
    });

  }

  /* ---------- Rezensionen: one at a time ---------- */
  function initQuotes() {
    document.querySelectorAll('[data-quotes]').forEach(function (box) {
      var items = box.querySelectorAll('.quotes > blockquote');
      var count = box.querySelector('[data-quote-count]');
      var i = 0;
      function show(n) {
        i = (n + items.length) % items.length;
        items.forEach(function (q, k) { q.classList.toggle('is-active', k === i); });
        if (count) count.textContent = (i + 1) + ' / ' + items.length;
      }
      box.querySelector('[data-quote-prev]').addEventListener('click', function () { show(i - 1); });
      box.querySelector('[data-quote-next]').addEventListener('click', function () { show(i + 1); });
    });
  }

  /* ---------- Frozen screen height: refreshed only when the width changes (rotation, real resize).
     iOS Safari fires resize while its toolbar animates; following that would make the hero jump. ---------- */
  function initScreen() {
    var w = window.innerWidth;
    window.addEventListener('resize', function () {
      if (window.innerWidth === w) return;
      w = window.innerWidth;
      document.documentElement.style.setProperty('--screen', window.innerHeight + 'px');
    });
  }

  /* ---------- Modals ---------- */
  var lastFocus = null;
  function focusable(root) {
    return qsa('a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]):not([tabindex="-1"]), textarea, [tabindex="0"]', root)
      .filter(function (n) { return n.getClientRects().length; });
  }
  function openDialog(id) {
    var overlay = document.getElementById(id);
    if (!overlay || overlay.classList.contains('is-open')) return;
    lastFocus = document.activeElement;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    lock();
    var first = overlay.querySelector('.step.is-active h2') || overlay.querySelector('[data-close]');
    if (first) first.focus({ preventScroll: true });
  }
  function closeDialog(overlay) {
    if (!overlay.classList.contains('is-open')) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    unlock();
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    overlay.dispatchEvent(new CustomEvent('hl:closed'));
  }
  /* open a modal from a link; ?name=slug in the link's href preselects a choice (termin.html?leistung=glossing) */
  function openModal(id, href) {
    var overlay = document.getElementById(id);
    if (!overlay) return false;
    var q = href && href.indexOf('?') > -1 ? href.slice(href.indexOf('?') + 1).split('#')[0] : '';
    q.split('&').forEach(function (pair) {
      var kv = pair.split('=');
      if (kv.length < 2) return;
      var radio = overlay.querySelector('input[type="radio"][name="' + kv[0].replace(/[^a-z0-9_-]/gi, '') + '"][data-slug="' + kv[1].replace(/[^a-z0-9-]/gi, '') + '"]');
      if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    openDialog(id);
    return true;
  }
  function initDialogs() {
    qsa('.overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay || e.target.closest('[data-close]')) closeDialog(overlay);
      });
    });
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('[data-modal]') : null;
      if (a && openModal(a.getAttribute('data-modal'), a.getAttribute('href'))) e.preventDefault();
    });
    document.addEventListener('keydown', function (e) {
      var o = document.querySelector('.overlay.is-open');
      if (!o) return;
      if (e.key === 'Escape') { closeDialog(o); return; }
      if (e.key !== 'Tab') return;
      // keep the focus inside the open modal
      var f = focusable(o);
      if (!f.length) return;
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === -1 || i === f.length - 1)) { e.preventDefault(); f[0].focus(); }
    });
    // a link straight to a request: termin.html?leistung=glossing
    if (/[?&]leistung=/.test(window.location.search)) openModal('book', window.location.search);
  }

  /* ---------- Forms ---------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function fieldOk(input) {
    var v = input.value.trim();
    if (input.hasAttribute('data-required') && !v) return false;
    if (!v) return true;
    if (input.type === 'email') return EMAIL_RE.test(v);
    if (input.type === 'tel') { var n = v.replace(/\D/g, '').length; return n >= 7 && n <= 15; }
    return true;
  }

  /* checks one step; returns the first invalid element (or null). Only recolours, never changes the layout */
  function validate(scope, form) {
    var first = null;
    qsa('.input', scope).forEach(function (input) {
      var ok = fieldOk(input);
      input.classList.toggle('is-invalid', !ok);
      input.setAttribute('aria-invalid', String(!ok));
      if (!ok && !first) first = input;
    });
    qsa('.check input[data-required]', scope).forEach(function (box) {
      var ok = box.checked;
      box.closest('.check').classList.toggle('has-error', !ok);
      if (!ok && !first) first = box;
    });
    var groups = qsa('[data-group]', scope);
    if (scope.hasAttribute('data-group')) groups.unshift(scope);
    groups.forEach(function (group) {
      var ok = group.getAttribute('data-group').split(' ').every(function (name) {
        var el = form.elements[name];
        return !!(el && el.value);
      });
      group.classList.toggle('has-error', !ok);
      if (!ok && !first) first = group;
    });
    return first;
  }

  function isDraft(form) {
    var key = form.elements.access_key;
    return !key || key.value === KEY_PLACEHOLDER;
  }

  function send(form) {
    if (isDraft(form)) {
      return new Promise(function (resolve) { setTimeout(function () { resolve(true); }, 700); });
    }
    return fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (res) { return res.json(); })
      .then(function (data) { return !!(data && data.success); });
  }

  /* what has been entered so far, for the running summary and the last step */
  function valueOf(form, name) {
    var el = form.elements[name];
    if (!el) return '';
    if (el.type === 'file') {
      var n = el.files ? el.files.length : 0;
      return n ? n + (n === 1 ? ' Datei' : ' Dateien') : '';
    }
    if (!el.tagName && el.length !== undefined) {   // radio group
      for (var k = 0; k < el.length; k++) if (el[k].checked) return el[k].getAttribute('data-label') || el[k].value;
      return '';
    }
    var v = (el.value || '').trim();
    return v && el.getAttribute('data-label') || v;
  }
  function summary(form) {
    qsa('[data-sum]', form).forEach(function (node) {
      var v = valueOf(form, node.getAttribute('data-sum'));
      var need = node.getAttribute('data-with');           // only worth showing next to another answer
      if (need && !valueOf(form, need)) v = '';
      node.textContent = v || node.getAttribute('data-empty') || '';
      node.classList.toggle('is-empty', !v);
    });
    var strip = form.querySelector('.modal__sum');
    if (strip) {
      strip.classList.toggle('is-blank', !strip.querySelector('[data-sum]:not(.is-empty)'));
      strip.classList.remove('is-error');
    }
  }

  /* ---------- File attachments (custom picker over a hidden native input, so the form still submits) ---------- */
  var FILE_TYPES = { pdf: 1, jpg: 1, jpeg: 1, png: 1, webp: 1, doc: 1, docx: 1 };

  function fmtSize(b) { return b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toFixed(1).replace('.', ',') + ' MB'; }

  function initFiles(form) {
    form.querySelectorAll('[data-files]').forEach(function (box) {
      var input = box.querySelector('input[type="file"]');
      var drop = box.querySelector('.drop');
      var list = box.querySelector('.files__list');
      var err = box.querySelector('.err');
      var max = +box.getAttribute('data-max') || 3;
      var maxBytes = (+box.getAttribute('data-max-mb') || 5) * 1048576;
      var files = [];
      var canSync = typeof DataTransfer !== 'undefined';

      function ext(f) { var m = /\.([a-z0-9]+)$/i.exec(f.name); return m ? m[1].toLowerCase() : ''; }
      function say(msg) { err.textContent = msg || ''; }

      function sync() {
        if (!canSync) return;
        try { var dt = new DataTransfer(); files.forEach(function (f) { dt.items.add(f); }); input.files = dt.files; } catch (e) { canSync = false; }
      }

      function render() {
        list.textContent = '';
        files.forEach(function (f, i) {
          var li = document.createElement('li');
          li.className = 'file';
          li.innerHTML = '<svg class="i" aria-hidden="true"><use href="#i-document-text"/></svg><span class="file__name"></span><span class="file__size"></span>' +
            '<button class="file__x" type="button"><svg class="i" aria-hidden="true"><use href="#i-x-mark"/></svg></button>';
          li.querySelector('.file__name').textContent = f.name;
          li.querySelector('.file__size').textContent = fmtSize(f.size);
          var x = li.querySelector('.file__x');
          x.setAttribute('aria-label', f.name + ' entfernen');
          x.addEventListener('click', function () {
            files.splice(i, 1); sync(); say(''); render();
            if (drop.disabled) form.querySelector('[data-wz-next]').focus(); else drop.focus();
          });
          list.appendChild(li);
        });
        box.classList.toggle('is-full', files.length >= max);
        drop.disabled = files.length >= max;
        form.dispatchEvent(new CustomEvent('hl:change'));
      }

      function add(picked) {
        var problem = '';
        Array.prototype.forEach.call(picked, function (f) {
          if (files.length >= max) { problem = 'Es sind höchstens ' + max + ' Dateien möglich.'; return; }
          if (!FILE_TYPES[ext(f)]) { problem = f.name + ': Bitte PDF, JPG, PNG oder Word senden.'; return; }
          if (f.size > maxBytes) { problem = f.name + ' ist größer als ' + (maxBytes / 1048576) + ' MB.'; return; }
          if (files.some(function (g) { return g.name === f.name && g.size === f.size; })) return;
          files.push(f);
        });
        sync(); say(problem); render();
      }

      drop.addEventListener('click', function () { input.click(); });
      input.addEventListener('change', function () {
        // without DataTransfer the input keeps only the latest pick, so mirror it instead of merging
        if (canSync) { add(input.files); } else { files = []; add(input.files); }
      });
      ['dragenter', 'dragover'].forEach(function (t) {
        drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('is-drag'); });
      });
      ['dragleave', 'drop'].forEach(function (t) {
        drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('is-drag'); });
      });
      drop.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) add(e.dataTransfer.files); });
      form.addEventListener('reset', function () { setTimeout(function () { files = []; say(''); render(); }, 0); });
      render();
    });
  }

  /* ---------- Requests in steps: one question per step, progress on top, the summary below ---------- */
  function initWizards() {
    qsa('form[data-wizard]').forEach(function (form) {
      var overlay = form.closest('.overlay');
      var steps = qsa('[data-step]', form);
      var segs = qsa('.prog li', form);
      var donePanel = form.querySelector('[data-wz-done]');
      var body = form.querySelector('.modal__body');
      var count = form.querySelector('[data-wz-count]');
      var strip = form.querySelector('.modal__sum');
      var back = form.querySelector('[data-wz-back]');
      var next = form.querySelector('[data-wz-next]');
      var label = next.querySelector('span');
      var total = steps.length;
      var cur = 0, done = false, busy = false;

      form.setAttribute('novalidate', '');
      initFiles(form);

      function paint() {
        steps.forEach(function (s, k) { s.classList.toggle('is-active', !done && k === cur); });
        donePanel.classList.toggle('is-active', done);
        segs.forEach(function (li, k) {
          var btn = li.querySelector('button');
          li.classList.toggle('is-done', done || k < cur);
          li.classList.toggle('is-now', !done && k === cur);
          btn.disabled = done || k >= cur;            // only steps already answered can be reopened
          if (!done && k === cur) btn.setAttribute('aria-current', 'step'); else btn.removeAttribute('aria-current');
        });
        form.classList.toggle('is-first', cur === 0);
        form.classList.toggle('is-done', done);
        count.textContent = done ? 'Gesendet' : 'Schritt ' + (cur + 1) + ' von ' + total;
        label.textContent = done ? 'Schließen' : cur === total - 1 ? next.getAttribute('data-send') : 'Weiter';
      }
      function go(n, dir, quiet) {
        cur = n;
        form.setAttribute('data-dir', dir);
        paint();
        body.scrollTop = 0;
        form.dispatchEvent(new CustomEvent('hl:step', { detail: { index: cur } }));
        var h = (done ? donePanel : steps[cur]).querySelector('h2');
        if (h && !quiet) h.focus({ preventScroll: true });
      }
      /* where the problem is: its step, the field in view and focused */
      function point(bad) {
        var el = bad.matches('input, textarea') ? bad : bad.querySelector('.step__a input, .step__a button:not([disabled])');
        if (el) {
          if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
          el.focus({ preventScroll: true });
        }
      }

      form.addEventListener('input', function (e) {
        var t = e.target;
        if (t.classList.contains('is-invalid') && fieldOk(t)) { t.classList.remove('is-invalid'); t.setAttribute('aria-invalid', 'false'); }
        summary(form);
      });
      form.addEventListener('change', function (e) {
        var c = e.target.closest('.check');
        if (c && e.target.checked) c.classList.remove('has-error');
        var g = e.target.closest('[data-group]');
        if (g) g.classList.remove('has-error');
        summary(form);
      });
      form.addEventListener('hl:change', function () { summary(form); });

      back.addEventListener('click', function () { if (cur > 0 && !busy && !done) go(cur - 1, 'back'); });
      segs.forEach(function (li, k) {
        li.querySelector('button').addEventListener('click', function () { if (k < cur && !busy && !done) go(k, 'back'); });
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (busy) return;
        if (done) { closeDialog(overlay); return; }
        var bad = validate(steps[cur], form);
        if (bad) { point(bad); return; }
        if (cur < total - 1) { go(cur + 1, 'fwd'); return; }
        for (var k = 0; k < total; k++) {
          bad = validate(steps[k], form);
          if (bad) { go(k, 'back', true); point(bad); return; }
        }
        busy = true;
        next.disabled = back.disabled = true;
        label.textContent = 'Wird gesendet …';
        send(form)
          .then(function (ok) {
            if (!ok) throw new Error('send');
            form.classList.toggle('is-draft', isDraft(form));
            done = true;
          })
          .catch(function () { strip.classList.add('is-error'); })
          .then(function () {
            busy = false;
            next.disabled = back.disabled = false;
            go(cur, 'fwd');
          });
      });

      // closed after sending: the next visit starts fresh. Closed half way: everything stays as it was.
      overlay.addEventListener('hl:closed', function () {
        if (!done) return;
        done = false;
        form.reset();
        form.dispatchEvent(new CustomEvent('hl:reset'));
        qsa('.has-error, .is-invalid', form).forEach(function (n) { n.classList.remove('has-error', 'is-invalid'); });
        cur = 0;
        form.setAttribute('data-dir', 'fwd');
        paint();
        summary(form);
      });

      paint();
      summary(form);
    });
  }

  /* shared with booking.js */
  window.HL = {
    HOURS: HOURS, DAYS_SHORT: DAYS_SHORT, DAYS_LONG: DAYS_LONG,
    pad: pad, hhmm: hhmm, isoDay: isoDay, ymd: ymd,
    berlinNow: berlinNow, isHoliday: isHoliday, hoursOn: hoursOn
  };

  function init() {
    initScreen();
    initTint();
    initMenu();
    initStatus();
    initQuotes();
    initWizards();
    initDialogs();
    // iOS Safari applies :active only when a touch listener exists
    document.addEventListener('touchstart', function () {}, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
