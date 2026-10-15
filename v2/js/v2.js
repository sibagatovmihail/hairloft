/* The HairLoft · Entwurf B: presentation layer. The salon logic (hours, status, reviews, menu, both step
   modals) is ../js/main.js and ../js/booking.js, shared with Entwurf A. This file only adds motion:
   smooth scrolling, reveals, titles that rise line by line, the letter roll in the header, the pinned hero
   and the footer that slides over the last section, the photo reel. Every part has a static default. */
(function () {
  'use strict';
  window.HL2 = true;   // the failsafe in <head> stays off

  var root = document.documentElement;
  var body = document.body;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hdr = document.querySelector('.hdr');
  var hero = document.querySelector('.hero');
  var heroIn = hero && hero.querySelector('.hero__in');
  var main = document.getElementById('main');
  var tail = body.classList.contains('tail') && !reduced;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function screenH() { return parseFloat(getComputedStyle(root).getPropertyValue('--screen')) || window.innerHeight; }

  /* ---------- Smooth scroll: mouse and trackpad only; touch keeps its native momentum ---------- */
  var lenis = null;
  if (!reduced && fine && window.Lenis) {
    lenis = new window.Lenis({
      autoRaf: true,
      lerp: 0.1,
      anchors: { offset: -(hdr ? hdr.offsetHeight : 0) },
      prevent: function (node) { return !!(node.closest && node.closest('.overlay, .menu')); }
    });
  }

  /* ---------- While main.js pins the body (menu, modal), the pinned layers must not jump ----------
     A pinned body reports scrollY 0, so sticky elements fall back to their place in the flow. Each one is
     shifted back to where it was on screen, and the smooth scroller pauses. */
  var sticky = [hero, tail ? main : null].filter(Boolean);
  var lastTops = [];
  function rememberTops() { lastTops = sticky.map(function (el) { return el.getBoundingClientRect().top; }); }
  var wasLocked = false;
  new MutationObserver(function () {
    var locked = body.classList.contains('is-locked');
    if (locked === wasLocked) return;
    wasLocked = locked;
    if (locked) {
      if (lenis) lenis.stop();
      sticky.forEach(function (el, i) {
        el.style.translate = '0 ' + Math.round(lastTops[i] - el.getBoundingClientRect().top) + 'px';
      });
    } else {
      sticky.forEach(function (el) { el.style.translate = ''; });
      // main.js has put the scroll position back; the smooth scroller measured a one-screen page meanwhile
      if (lenis) { lenis.resize(); lenis.start(); lenis.scrollTo(window.scrollY, { immediate: true, force: true }); }
      requestTick();
    }
  }).observe(body, { attributes: true, attributeFilter: ['class'] });

  /* ---------- Titles: lines that rise one after the other (laptops), the whole title at once (touch) ---------- */
  var lineEls = [].slice.call(document.querySelectorAll('[data-split]'));
  function splitLines(el) {
    if (el._src == null) el._src = el.textContent.replace(/\s+/g, ' ').trim();
    if (!fine || reduced) {
      el.innerHTML = '<span class="pl">' + esc(el._src) + '</span>';
      el.classList.add('is-ready');
      return;
    }
    var words = el._src.split(' ');
    el.innerHTML = words.map(function (w) { return '<span class="w">' + esc(w) + '</span>'; }).join(' ');
    var lines = [], top = null;
    [].forEach.call(el.querySelectorAll('.w'), function (w) {
      var t = w.offsetTop;
      if (top === null || Math.abs(t - top) > 3) { lines.push([]); top = t; }
      lines[lines.length - 1].push(w.textContent);
    });
    el.innerHTML = lines.map(function (ln, i) {
      return '<span class="ln"><span style="--i:' + i + '">' + esc(ln.join(' ')) + '</span></span>';
    }).join(' ');
    el._w = el.clientWidth;
    el.classList.add('is-ready');
  }
  function splitAll() { lineEls.forEach(splitLines); }

  /* ---------- Letter roll on the header links (pointer devices) ---------- */
  if (fine && !reduced) {
    [].forEach.call(document.querySelectorAll('[data-roll]'), function (el) {
      var text = el.textContent.replace(/\s+/g, ' ').trim();
      var link = el.closest('a');
      if (link) link.setAttribute('aria-label', text);
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = text.split('').map(function (c, i) {
        return '<span class="ch" data-c="' + esc(c) + '" style="--c:' + i + '">' + esc(c) + '</span>';
      }).join('');
    });
  }

  /* ---------- Reveals ---------- */
  var rvEls = [].slice.call(document.querySelectorAll('.rv, .rv-lines'));
  function startReveals() {
    if (reduced || !('IntersectionObserver' in window)) {
      rvEls.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    rvEls.forEach(function (el) { io.observe(el); });
    // hidden tabs and some renderers never fire the observer: show what is on screen
    window.setTimeout(function () {
      rvEls.forEach(function (el) { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in'); });
    }, 2500);
  }

  /* ---------- The last section holds, then the footer slides over it ----------
     main is pinned by its bottom edge: top = (largest screen height) - (its own height). */
  var lvhProbe = null;
  function largeScreen() {
    if (!lvhProbe) {
      lvhProbe = document.createElement('div');
      lvhProbe.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:100vh;height:100lvh;visibility:hidden;pointer-events:none';
      body.appendChild(lvhProbe);
    }
    return lvhProbe.offsetHeight || window.innerHeight;
  }
  function layoutTail() {
    if (!tail || !main) return;
    main.style.top = Math.min(0, largeScreen() - main.offsetHeight) + 'px';
  }
  if (tail && main && 'ResizeObserver' in window) new ResizeObserver(layoutTail).observe(main);

  /* ---------- Photo reel: buttons, progress, drag with the mouse ---------- */
  [].forEach.call(document.querySelectorAll('[data-reel]'), function (reel) {
    var track = reel.querySelector('.reel__track');
    var prev = reel.querySelector('[data-reel-prev]');
    var next = reel.querySelector('[data-reel-next]');
    var thumb = reel.querySelector('.reel__bar span');
    function stepPx() {
      var card = track.querySelector('.look');
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card ? card.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
    }
    function update() {
      var max = track.scrollWidth - track.clientWidth;
      var share = track.scrollWidth ? track.clientWidth / track.scrollWidth : 1;
      var p = max > 0 ? clamp(track.scrollLeft / max, 0, 1) : 0;
      thumb.style.width = (share * 100) + '%';
      thumb.style.transform = 'translateX(' + (p * (1 - share) / share * 100) + '%)';
      prev.disabled = track.scrollLeft < 4;
      next.disabled = track.scrollLeft > max - 4;
    }
    function go(dir) { track.scrollBy({ left: dir * stepPx(), behavior: reduced ? 'auto' : 'smooth' }); }
    prev.addEventListener('click', function () { go(-1); });
    next.addEventListener('click', function () { go(1); });
    var raf = 0;
    track.addEventListener('scroll', function () {
      if (raf) return;
      raf = window.requestAnimationFrame(function () { raf = 0; update(); });
    }, { passive: true });
    window.addEventListener('resize', update);
    update();

    // drag with a mouse (touch and trackpads scroll natively)
    var down = false, moved = false, x0 = 0, s0 = 0;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false; x0 = e.clientX; s0 = track.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - x0;
      if (!moved && Math.abs(dx) > 5) { moved = true; track.classList.add('is-drag'); }
      if (moved) track.scrollLeft = s0 - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      if (!moved) return;
      // let the snap take the nearest photo, and swallow the click that ends the drag
      var left = track.scrollLeft;
      track.classList.remove('is-drag');
      track.scrollLeft = left;
      var stop = function (ev) { ev.preventDefault(); ev.stopPropagation(); };
      track.addEventListener('click', stop, { capture: true, once: true });
      window.setTimeout(function () { track.removeEventListener('click', stop, { capture: true }); }, 0);
    });
  });

  /* ---------- The request button: in the header over the hero, then a calendar square in the corner ----------
     --hdr-btn is the room the header button takes (with the gap before it), so the links close up smoothly. */
  var fab = document.querySelector('.fab');
  var hdrBtn = document.querySelector('.hdr__r .btn--sm');
  var fabEnd = document.querySelector('main > .cta') || document.querySelector('.ftr');
  function measureHdrBtn() {
    if (!hdrBtn) return;
    var prev = hdrBtn.previousElementSibling;
    var gap = prev && prev.offsetWidth ? parseFloat(getComputedStyle(hdrBtn.parentNode).columnGap) || 0 : 0;
    root.style.setProperty('--hdr-btn', (hdrBtn.offsetWidth + gap) + 'px');
  }

  /* ---------- Scroll-driven values ---------- */
  var drifts = reduced ? [] : [].slice.call(document.querySelectorAll('img[data-drift]'));
  var ticking = false;
  function tick() {
    ticking = false;
    if (body.classList.contains('is-locked')) return;   // a pinned body reports scrollY 0
    var y = window.scrollY, V = window.innerHeight;
    if (hdr) hdr.classList.toggle('is-scrolled', y > 8);
    if (heroIn && !reduced) heroIn.style.setProperty('--cover', clamp(y / (hero.offsetHeight || V), 0, 1).toFixed(3));
    if (fab) {
      var past = y > (hero ? hero.offsetHeight : V) * 0.4;
      var end = fabEnd && fabEnd.getBoundingClientRect().top < V * 0.85;
      body.classList.toggle('past-hero', past);
      body.classList.toggle('show-fab', past && !end);
    }
    drifts.forEach(function (img) {
      var r = img.parentNode.getBoundingClientRect();
      if (r.bottom < 0 || r.top > V) return;
      img.style.setProperty('--drift', clamp((r.top + r.height / 2 - V / 2) / V, -1, 1).toFixed(3));
    });
    rememberTops();
  }
  function requestTick() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(tick);
  }
  window.addEventListener('scroll', requestTick, { passive: true });

  /* ---------- Keyboard focus never hides under a sheet that covers a pinned layer ---------- */
  var byKey = false;
  document.addEventListener('keydown', function (e) { if (e.key === 'Tab') byKey = true; });
  document.addEventListener('pointerdown', function () { byKey = false; });
  function scrollBy(dy) {
    var y = Math.max(0, window.scrollY + dy);
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
  }
  document.addEventListener('focusin', function (e) {
    if (!byKey || body.classList.contains('is-locked')) return;
    var el = e.target;
    if (!el.getBoundingClientRect || el.closest('.hdr, .overlay, .draft-tag')) return;
    window.requestAnimationFrame(function () {
      var r = el.getBoundingClientRect();
      if (!r.height) return;
      var hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!hit || el.contains(hit) || hit.contains(el)) return;
      if (hero && hero.contains(el)) { scrollBy(-window.scrollY); return; }   // the hero is only whole at the top
      var ftr = hit.closest('.ftr');
      if (ftr) scrollBy(r.bottom - ftr.getBoundingClientRect().top + 24);   // back until the footer has cleared it
    });
  });

  /* ---------- Width changes only (iOS fires resize while its toolbar moves) ---------- */
  var lastW = window.innerWidth, resizeT = 0;
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    window.clearTimeout(resizeT);
    resizeT = window.setTimeout(function () {
      splitAll();
      layoutTail();
      measureHdrBtn();
      if (lenis) lenis.resize();
      requestTick();
    }, 120);
  });

  /* ---------- Start: measure lines only once the title face is in use ---------- */
  function boot() {
    splitAll();
    startReveals();
    layoutTail();
    measureHdrBtn();
    requestTick();
  }
  var faceReady = document.fonts && document.fonts.load ? document.fonts.load('600 48px "HL Sans"') : Promise.resolve();
  var timeout = new Promise(function (r) { window.setTimeout(r, 1200); });
  Promise.race([faceReady, timeout]).then(boot, boot);
  // a late font or a late stylesheet changes the line breaks: measure again
  if (document.fonts && document.fonts.addEventListener) {
    document.fonts.addEventListener('loadingdone', function () { if (fine) splitAll(); layoutTail(); });
  }
  window.addEventListener('load', function () { if (fine) splitAll(); layoutTail(); measureHdrBtn(); requestTick(); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) requestTick(); });
})();
