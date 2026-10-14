/* Layout check for Entwurf B (v2/) in WebKit and Chromium: 5 pages x 24 widths, plus every step of both modals.

     python3 -m http.server 8791 &      # in the project root
     node tools/check-v2.js [webkit|chromium] [shots]

   "shots" also writes screenshots (whole page with every reveal shown, the first screen, the open modal) to
   $SHOTS (default /tmp/hl-v2-shots). Needs the same Playwright setup as tools/check.js. */
const PW = process.env.PW_CORE || process.env.HOME + '/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core';
const WEBKIT = process.env.PW_WEBKIT || process.env.HOME + '/Library/Caches/ms-playwright/webkit-2311/pw_run.sh';
const BASE = (process.env.BASE || 'http://localhost:8791/') + 'v2/';
const SHOTS = process.env.SHOTS || '/tmp/hl-v2-shots';
const pw = require(PW);
const fs = require('fs');
const engine = process.argv[2] || 'webkit';
const shots = process.argv.includes('shots');
const PAGES = (process.env.PAGES || 'index.html,termin.html,karriere.html,impressum.html,datenschutz.html').split(',');
const SIZES = process.env.SIZES ? process.env.SIZES.split(',').map(s => s.split('x').map(Number)) :
  [[320, 568], [360, 740], [375, 812], [393, 852], [430, 932], [480, 900], [520, 900], [599, 900], [600, 900],
   [767, 1024], [768, 1024], [834, 1194], [900, 900], [999, 800], [1000, 800], [1024, 768], [1100, 800],
   [1199, 800], [1200, 800], [1280, 720], [1360, 800], [1440, 900], [1680, 1050], [1920, 1080]];

function probe() {
  const notes = [];
  const add = t => { if (notes.length < 8) notes.push(t); };
  const de = document.documentElement;
  if (de.scrollWidth - de.clientWidth) add('X-OVERFLOW ' + (de.scrollWidth - de.clientWidth));
  if (de.classList.contains('rv-fallback')) add('FALLBACK: v2.js did not start');
  // hero: exactly one screen (or the 34rem floor), the main action inside it
  const hero = document.querySelector('.hero');
  if (hero) {
    const want = Math.max(innerHeight, 544), r = hero.getBoundingClientRect();
    const grows = matchMedia('(max-width: 47.9375rem) and (max-height: 41rem)').matches;   // very short phones: may run longer
    if (grows ? r.height < innerHeight - 1 : Math.abs(r.height - want) > 1) add('HERO ' + Math.round(r.height) + ' != ' + want);
    const btn = hero.querySelector('.btn');
    if (btn && btn.getBoundingClientRect().bottom > innerHeight) add('HERO CTA below the fold');
    const t = hero.querySelector('.hero__text'), f = hero.querySelector('.hero__facts'), ph = hero.querySelector('.arch-set');
    [t, f, ph].forEach(el => { if (el && el.getBoundingClientRect().bottom > r.bottom + 1) add('HERO spill ' + el.className.split(' ')[0]); });
    if (ph && ph.getBoundingClientRect().height < 100) add('HERO photo tiny ' + Math.round(ph.getBoundingClientRect().height));
    if (t && f && t.getBoundingClientRect().bottom > f.getBoundingClientRect().top + 1) add('HERO text runs into facts');
    const h1 = hero.querySelector('h1');
    if (h1 && h1.scrollWidth > h1.clientWidth + 1) add('H1 too wide');
  }
  // reel: sideways only, never a vertical scroll
  document.querySelectorAll('.reel__track').forEach(t => { if (t.scrollHeight - t.clientHeight > 0) add('REEL scrolls vertically ' + (t.scrollHeight - t.clientHeight)); });
  // services: on the three-column grid no name needs a third line, no word runs out
  document.querySelectorAll('.svc__t').forEach(t => {
    if (t.scrollWidth > t.clientWidth + 1) add('SVC name too wide: ' + t.textContent.trim().slice(0, 16));
    const lh = parseFloat(getComputedStyle(t).lineHeight);
    if (innerWidth >= 600 && t.getBoundingClientRect().height > 2 * lh + 1) add('SVC name on 3 lines: ' + t.textContent.trim().slice(0, 16));
  });
  // titles and big words never run out of their box
  document.querySelectorAll('h1, h2, h3, .visit__big, .perk__big, .teaser__t, .menu__row, .btn, .nav__link').forEach(e => {
    if (e.getClientRects().length && e.scrollWidth > e.clientWidth + 1) add('WIDE ' + e.tagName + '.' + String(e.className).split(' ')[0] + ': ' + e.textContent.trim().slice(0, 18));
  });
  // header: logo and links fit side by side
  const bar = document.querySelector('.hdr__bar');
  if (bar) {
    const kids = [...bar.children].filter(k => getComputedStyle(k).display !== 'none').map(k => k.getBoundingClientRect()).filter(r => r.width).sort((a, b) => a.left - b.left);
    for (let i = 1; i < kids.length; i++) if (kids[i].left < kids[i - 1].right - 0.5) add('HEADER overlap');
  }
  document.querySelectorAll('main img').forEach(i => { if (i.complete && !i.naturalWidth) add('IMG missing ' + i.getAttribute('src')); });
  return notes;
}

/* the step modals: every step of every modal, opened without animation (same rules as Entwurf A) */
function probeModals() {
  const frac = v => Math.abs(v - Math.round(v)) > 0.01;
  const notes = [];
  const add = t => { if (notes.length < 6) notes.push(t); };
  document.querySelectorAll('.overlay').forEach(o => {
    const m = o.querySelector('.modal'), body = m.querySelector('.modal__body');
    o.classList.add('is-open');
    m.style.animation = 'none';
    m.classList.remove('is-first');
    const steps = [...m.querySelectorAll('.step')];
    steps.forEach((st, k) => {
      steps.forEach(x => x.classList.toggle('is-active', x === st));
      const tag = o.id + ' step ' + (k + 1) + ': ';
      const br = body.getBoundingClientRect();
      m.querySelectorAll('.prog li, .step.is-active .seg span, .step.is-active .cal > *, .step.is-active .slot, .step.is-active .input, .step.is-active .drop, .modal__foot > *').forEach(c => {
        const r = c.getBoundingClientRect();
        if (!r.width) return;
        if (frac(r.left) || frac(r.width)) add(tag + 'FRAC ' + String(c.className || c.tagName).slice(0, 18) + ' ' + [r.left, r.width].map(v => +v.toFixed(2)).join('/'));
        if (r.right > br.right + 0.5) add(tag + 'SPILL ' + String(c.className || c.tagName).slice(0, 18));
      });
      if (body.scrollWidth > body.clientWidth) add(tag + 'X-OVERFLOW ' + (body.scrollWidth - body.clientWidth));
      const edges = [...st.querySelectorAll('.step__a > *')].filter(e => e.getBoundingClientRect().width).map(e => Math.round(e.getBoundingClientRect().right * 100) / 100);
      if (new Set(edges).size > 1) add(tag + 'EDGES ' + [...new Set(edges)].join(','));
      const when = st.querySelector('.when');
      if (when) {
        const c = when.querySelector('.cal').getBoundingClientRect(), t = when.querySelector('.slots').getBoundingClientRect();
        const side = getComputedStyle(when).display === 'grid';
        if (side && (c.bottom !== t.bottom || c.top !== t.top)) add(tag + 'WHEN grids ' + [c.top, c.bottom, t.top, t.bottom].join('/'));
        if (!side && (c.right !== t.right)) add(tag + 'WHEN stacked edges ' + c.right + '/' + t.right);
        if (side && body.scrollHeight > body.clientHeight) add(tag + 'WHEN scrolls ' + (body.scrollHeight - body.clientHeight));
        when.querySelectorAll('.slot, .slots__head > *').forEach(x => { if (x.scrollWidth > x.clientWidth + 1) add(tag + 'SLOT text too wide'); });
      }
    });
    const name = m.querySelector('.modal__name');
    if (name.scrollWidth > name.clientWidth) add(o.id + ': TITLE cut');
    m.querySelectorAll('.modal__foot > *, .prog button').forEach(b => { if (b.scrollWidth > b.clientWidth + 1) add(o.id + ': LABEL too wide ' + b.textContent.trim().slice(0, 12)); });
    steps.forEach((x, k) => x.classList.toggle('is-active', k === 0));
    m.classList.add('is-first');
    o.classList.remove('is-open');
    m.style.animation = '';
  });
  return notes;
}

(async () => {
  const browser = engine === 'webkit' ? await pw.webkit.launch({ executablePath: WEBKIT }) : await pw.chromium.launch();
  if (shots) fs.mkdirSync(SHOTS, { recursive: true });
  let bad = 0, n = 0;
  for (const p of PAGES) {
    for (const [w, h] of SIZES) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 700 ? 2 : 1, hasTouch: w < 1000, isMobile: false });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push('JS ' + String(e).slice(0, 120)));
      page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text().slice(0, 120)); });
      await page.goto(BASE + p, { waitUntil: 'load' });
      await page.waitForTimeout(400);
      const notes = (await page.evaluate(probe)).concat(await page.evaluate(probeModals), errors);
      n++;
      if (notes.length) { bad++; console.log(p + ' ' + w + 'x' + h + ': ' + notes.join(' | ')); }
      if (shots) {
        const base = SHOTS + '/' + engine + '-' + p.replace('.html', '') + '-' + w;
        await page.waitForTimeout(1300);
        await page.screenshot({ path: base + '-top.png' });
        await page.evaluate(() => {
          document.querySelectorAll('.rv, .rv-lines').forEach(e => e.classList.add('is-in'));
          document.querySelectorAll('.hero, main').forEach(e => { e.style.position = 'relative'; e.style.top = '0'; });
          document.querySelectorAll('img[loading=lazy]').forEach(i => { i.loading = 'eager'; });
          document.querySelectorAll('.ftr').forEach(e => { e.style.marginTop = '0'; });
        });
        await page.waitForTimeout(1300);
        await page.screenshot({ path: base + '-full.png', fullPage: true });
      }
      await ctx.close();
    }
  }
  console.log(engine + ': ' + (n - bad) + '/' + n + ' clean');
  await browser.close();
})().catch(e => { console.error('ERR', String(e).slice(0, 400)); process.exit(1); });
