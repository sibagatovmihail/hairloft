/* The HairLoft by Colle & Roy: header, opening status, forms. No dependencies. */
(function () {
  'use strict';

  /* ---------- Salon data (single source for status, calendar and slots) ---------- */
  // ISO weekday (1 = Monday) -> [open, close] in minutes; missing = closed
  var HOURS = { 2: [480, 1080], 3: [480, 1080], 4: [480, 1080], 5: [480, 1080] };
  var DAYS_SHORT = ['', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  var DAYS_LONG = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  // Web3Forms key placeholder: while it is in place, forms are only simulated (draft mode)
  var KEY_PLACEHOLDER = 'WEB3FORMS-KEY';

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

  /* ---------- Dialog ---------- */
  var lastFocus = null;
  function openDialog(id) {
    var overlay = document.getElementById(id);
    if (!overlay || overlay.classList.contains('is-open')) return;
    lastFocus = document.activeElement;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    lock();
    var btn = overlay.querySelector('[data-close]');
    if (btn) btn.focus();
  }
  function closeDialog(overlay) {
    if (!overlay.classList.contains('is-open')) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    unlock();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function initDialogs() {
    document.querySelectorAll('.overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay || e.target.closest('[data-close]')) closeDialog(overlay);
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var o = document.querySelector('.overlay.is-open');
      if (o) closeDialog(o);
    });
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

  /* returns the first invalid element (or null); only recolours, never changes the layout */
  function validate(form) {
    var first = null;
    form.querySelectorAll('.input').forEach(function (input) {
      var ok = fieldOk(input);
      input.classList.toggle('is-invalid', !ok);
      input.setAttribute('aria-invalid', String(!ok));
      if (!ok && !first) first = input;
    });
    form.querySelectorAll('.check input[data-required]').forEach(function (box) {
      var ok = box.checked;
      box.closest('.check').classList.toggle('has-error', !ok);
      if (!ok && !first) first = box;
    });
    form.querySelectorAll('[data-group]').forEach(function (group) {
      var name = group.getAttribute('data-group');
      var el = form.elements[name];
      var ok = !!(el && (el.value !== undefined ? el.value : ''));
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

  function initForms() {
    document.querySelectorAll('form[data-form]').forEach(function (form) {
      form.setAttribute('novalidate', '');
      form.addEventListener('input', function (e) {
        var t = e.target;
        if (t.classList.contains('is-invalid') && fieldOk(t)) { t.classList.remove('is-invalid'); t.setAttribute('aria-invalid', 'false'); }
      });
      form.addEventListener('change', function (e) {
        var c = e.target.closest('.check');
        if (c && e.target.checked) c.classList.remove('has-error');
        var g = e.target.closest('[data-group]');
        if (g) g.classList.remove('has-error');
      });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var bad = validate(form);
        if (bad) {
          var target = bad.closest('.cell') || bad;
          var top = target.getBoundingClientRect().top;
          if (top < 80 || top > window.innerHeight * 0.6) {
            window.scrollTo({ top: window.scrollY + top - 96, behavior: 'smooth' });
          }
          if (bad.focus && bad.matches('input, textarea')) bad.focus({ preventScroll: true });
          return;
        }
        var btn = form.querySelector('[type="submit"]');
        var label = btn.querySelector('span');
        var original = label.textContent;
        label.textContent = 'Wird gesendet …';
        btn.disabled = true;
        send(form)
          .then(function (ok) {
            if (!ok) throw new Error('send');
            form.dispatchEvent(new CustomEvent('hl:sent'));
            form.reset();
            form.dispatchEvent(new CustomEvent('hl:reset'));
            var id = form.getAttribute('data-success') || 'success';
            var overlay = document.getElementById(id);
            if (overlay) overlay.classList.toggle('is-draft', isDraft(form));
            openDialog(id);
          })
          .catch(function () {
            label.textContent = 'Nicht gesendet. Bitte anrufen.';
            setTimeout(function () { label.textContent = original; }, 4000);
          })
          .then(function () {
            if (label.textContent === 'Wird gesendet …') label.textContent = original;
            btn.disabled = false;
          });
      });
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
    initDialogs();
    initForms();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
