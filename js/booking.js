/* Terminanfrage: service preselect, calendar, time slots, live summary.
   Uses the salon data from main.js (window.HL). The request is a wish, the salon confirms by phone,
   so no availability is checked here: closed days, public holidays and past times are blocked. */
(function () {
  'use strict';
  var HL = window.HL;
  var form = document.getElementById('booking');
  if (!HL || !form) return;

  var MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  var STEP = 30;          // minutes between slots
  var LAST_BEFORE = 60;   // the last slot starts this long before closing
  var LEAD = 60;          // today: earliest slot is this far from now
  var WINDOW_DAYS = 90;   // how far ahead a day can be requested

  var cal = form.querySelector('[data-cal]');
  var slots = form.querySelector('[data-slots]');
  var hint = form.querySelector('[data-slot-hint]');
  var inDate = form.elements.datum;
  var inTime = form.elements.uhrzeit;

  var now = HL.berlinNow();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var maxDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + WINDOW_DAYS);
  var view = new Date(today.getFullYear(), today.getMonth(), 1);
  var picked = null;      // Date
  var pickedTime = '';

  function sameDay(a, b) { return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function longDate(d) { return HL.DAYS_LONG[HL.isoDay(d)] + ', ' + d.getDate() + '. ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function shortDate(d) { return HL.DAYS_SHORT[HL.isoDay(d)] + ', ' + HL.pad(d.getDate()) + '.' + HL.pad(d.getMonth() + 1) + '.' + d.getFullYear(); }

  /* the times that can be requested on a day */
  function timesFor(d) {
    var h = HL.hoursOn(d);
    if (!h) return [];
    var out = [];
    var earliest = sameDay(d, today) ? now.getHours() * 60 + now.getMinutes() + LEAD : 0;
    for (var m = h[0]; m <= h[1] - LAST_BEFORE; m += STEP) out.push({ t: HL.hhmm(m), ok: m >= earliest });
    return out;
  }
  function dayOpen(d) {
    if (d < today || d > maxDay) return false;
    return timesFor(d).some(function (s) { return s.ok; });
  }

  /* ---------- Calendar ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function icon(name) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'i');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-' + name);
    svg.appendChild(use);
    return svg;
  }

  function renderCal(focusDate) {
    cal.textContent = '';
    var y = view.getFullYear(), m = view.getMonth();

    var prev = el('button', 'cal__nav');
    prev.type = 'button';
    prev.setAttribute('aria-label', 'Vorheriger Monat');
    prev.appendChild(icon('chevron-left'));
    prev.disabled = y === today.getFullYear() && m === today.getMonth();
    prev.addEventListener('click', function () { shift(-1); });

    var title = el('div', 'cal__month', MONTHS[m] + ' ' + y);
    title.setAttribute('aria-live', 'polite');

    var next = el('button', 'cal__nav');
    next.type = 'button';
    next.setAttribute('aria-label', 'Nächster Monat');
    next.appendChild(icon('chevron-right'));
    next.disabled = y === maxDay.getFullYear() && m === maxDay.getMonth();
    next.addEventListener('click', function () { shift(1); });

    cal.appendChild(prev);
    cal.appendChild(title);
    cal.appendChild(next);

    for (var w = 1; w <= 7; w++) {
      var dow = el('span', 'cal__dow', HL.DAYS_SHORT[w]);
      dow.setAttribute('aria-hidden', 'true');
      cal.appendChild(dow);
    }

    var lead = HL.isoDay(new Date(y, m, 1)) - 1;
    var count = new Date(y, m + 1, 0).getDate();
    // always six weeks, so the cell never changes height between months
    for (var i = 0; i < 42; i++) {
      var num = i - lead + 1;
      var b = el('button', 'cal__day');
      b.type = 'button';
      if (num < 1 || num > count) {
        b.disabled = true;
        b.setAttribute('aria-hidden', 'true');
        b.tabIndex = -1;
        cal.appendChild(b);
        continue;
      }
      var d = new Date(y, m, num);
      b.textContent = num;
      b.dataset.day = HL.ymd(d);
      var open = dayOpen(d);
      b.disabled = !open;
      b.setAttribute('aria-label', longDate(d) + (open ? '' : ', nicht verfügbar'));
      b.setAttribute('aria-pressed', String(sameDay(d, picked)));
      if (sameDay(d, today)) b.classList.add('is-today');
      cal.appendChild(b);
    }
    if (focusDate) {
      var target = cal.querySelector('[data-day="' + HL.ymd(focusDate) + '"]:not([disabled])') || cal.querySelector('.cal__day:not([disabled])');
      if (target) target.focus();
    }
  }

  function shift(delta, focusDate) {
    var target = new Date(view.getFullYear(), view.getMonth() + delta, 1);
    var first = new Date(today.getFullYear(), today.getMonth(), 1);
    var last = new Date(maxDay.getFullYear(), maxDay.getMonth(), 1);
    if (target < first || target > last) return;
    view = target;
    renderCal(focusDate);
  }

  function parseDay(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }

  cal.addEventListener('click', function (e) {
    var b = e.target.closest('.cal__day');
    if (!b || b.disabled) return;
    pickDay(parseDay(b.dataset.day));
  });

  /* arrow keys walk the open days, PageUp/PageDown change the month */
  cal.addEventListener('keydown', function (e) {
    var b = e.target.closest('.cal__day');
    if (!b) return;
    var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      shift(e.key === 'PageUp' ? -1 : 1, new Date(view.getFullYear(), view.getMonth() + (e.key === 'PageUp' ? -1 : 1), 1));
      return;
    }
    if (!step) return;
    e.preventDefault();
    var d = parseDay(b.dataset.day);
    for (var i = 0; i < 14; i++) {
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + step);
      if (d < today || d > maxDay) return;
      if (dayOpen(d)) break;
    }
    if (!dayOpen(d)) return;
    if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) {
      view = new Date(d.getFullYear(), d.getMonth(), 1);
      renderCal(d);
    } else {
      var t = cal.querySelector('[data-day="' + HL.ymd(d) + '"]');
      if (t) t.focus();
    }
  });

  function pickDay(d) {
    picked = d;
    inDate.value = shortDate(d);
    cal.querySelectorAll('.cal__day[data-day]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.day === HL.ymd(d)));
    });
    // keep the time if it is still possible on the new day
    var possible = timesFor(d).some(function (s) { return s.ok && s.t === pickedTime; });
    if (!possible && pickedTime !== 'flexibel') setTime('');
    renderSlots();
    clearError(cal);
    summary();
  }

  /* ---------- Slots ---------- */
  function renderSlots() {
    slots.textContent = '';
    var list = picked ? timesFor(picked) : timesFor(nextOpen()).map(function (s) { return { t: s.t, ok: false }; });
    list.forEach(function (s) {
      var b = el('button', 'slot', s.t);
      b.type = 'button';
      b.dataset.time = s.t;
      b.disabled = !s.ok;
      b.setAttribute('aria-pressed', String(s.t === pickedTime));
      slots.appendChild(b);
    });
    var flex = el('button', 'slot', 'Egal');
    flex.type = 'button';
    flex.dataset.time = 'flexibel';
    flex.disabled = !picked;
    flex.setAttribute('aria-label', 'Uhrzeit egal');
    flex.setAttribute('aria-pressed', String(pickedTime === 'flexibel'));
    slots.appendChild(flex);
    hint.textContent = picked
      ? 'Die Uhrzeit ist ein Wunsch. Wir sagen dir am Telefon, ob sie frei ist.'
      : 'Wähle zuerst einen Tag.';
  }
  function nextOpen() {
    var d = new Date(today);
    for (var i = 0; i < 14; i++) {
      d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      if (HL.hoursOn(d)) return d;
    }
    return d;
  }
  function setTime(t) {
    pickedTime = t;
    inTime.value = t === 'flexibel' ? 'flexibel' : (t ? t + ' Uhr' : '');
    slots.querySelectorAll('.slot').forEach(function (b) { b.setAttribute('aria-pressed', String(!!t && b.dataset.time === t)); });
  }
  slots.addEventListener('click', function (e) {
    var b = e.target.closest('.slot');
    if (!b || b.disabled) return;
    setTime(b.dataset.time);
    clearError(slots);
    summary();
  });

  function clearError(node) {
    var g = node.closest('[data-group]');
    if (g) g.classList.remove('has-error');
  }

  /* ---------- Summary ---------- */
  function checked(name) {
    var r = form.querySelector('input[name="' + name + '"]:checked');
    return r ? r.value : '';
  }
  function summary() {
    var values = {
      leistung: checked('leistung'),
      stylist: checked('stylist'),
      datum: picked ? shortDate(picked) : '',
      uhrzeit: pickedTime === 'flexibel' ? 'flexibel' : (pickedTime ? pickedTime + ' Uhr' : '')
    };
    form.querySelectorAll('[data-sum]').forEach(function (dd) {
      var v = values[dd.getAttribute('data-sum')];
      dd.textContent = v || 'noch offen';
      dd.classList.toggle('is-empty', !v);
    });
  }
  form.addEventListener('change', summary);

  /* the dialog shows what was requested */
  form.addEventListener('hl:sent', function () {
    var copy = document.querySelector('[data-sum-copy]');
    var src = form.querySelector('.sum');
    if (copy && src) copy.innerHTML = src.innerHTML;
  });
  form.addEventListener('hl:reset', function () {
    picked = null;
    pickedTime = '';
    inDate.value = '';
    inTime.value = '';
    view = new Date(today.getFullYear(), today.getMonth(), 1);
    renderCal();
    renderSlots();
    summary();
  });

  /* ---------- Preselect from ?leistung=slug ---------- */
  try {
    var slug = new URLSearchParams(window.location.search).get('leistung');
    if (slug) {
      var radio = form.querySelector('input[name="leistung"][data-slug="' + slug.replace(/[^a-z0-9-]/gi, '') + '"]');
      if (radio) radio.checked = true;
    }
  } catch (e) { /* no URLSearchParams: nothing preselected */ }

  // start in the month of the first open day
  var first = null;
  for (var i = 0; i <= WINDOW_DAYS && !first; i++) {
    var probe = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    if (dayOpen(probe)) first = probe;
  }
  if (first) view = new Date(first.getFullYear(), first.getMonth(), 1);

  renderCal();
  renderSlots();
  summary();
})();
