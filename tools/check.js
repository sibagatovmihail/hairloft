/* Layout check in WebKit (Safari's engine) and Chromium, all pages x widths, including every step of the modals.
   Safari differs from Chrome in grid/aspect-ratio details: never sign off a layout change on Chromium alone.

     python3 -m http.server 8791 &      # in the project root
     node tools/check.js [webkit|chromium]

   Needs a Playwright package and browser builds on this machine (paths below; adjust if they moved). */
const PW = process.env.PW_CORE || process.env.HOME + '/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core';
const WEBKIT = process.env.PW_WEBKIT || process.env.HOME + '/Library/Caches/ms-playwright/webkit-2311/pw_run.sh';
const BASE = process.env.BASE || 'http://localhost:8791/';
const pw = require(PW);
const engine = process.argv[2] || 'webkit';
const PAGES = ['index.html', 'termin.html', 'karriere.html', 'impressum.html', 'datenschutz.html'];
const SIZES = [[320, 568], [360, 740], [375, 812], [393, 852], [430, 932], [480, 900], [520, 900], [600, 900], [601, 900],
  [767, 1024], [768, 1024], [769, 1024], [834, 1194], [900, 900], [901, 900], [999, 800], [1024, 768], [1025, 768],
  [1100, 800], [1280, 800], [1359, 800], [1360, 800], [1440, 900], [1920, 1080]];

function probe() {
  const frac = v => Math.abs(v - Math.round(v)) > 0.01;
  const notes = [];
  const add = t => { if (notes.length < 6) notes.push(t); };
  const de = document.documentElement;
  if (de.scrollWidth - de.clientWidth) add('X-OVERFLOW ' + (de.scrollWidth - de.clientWidth));
  document.querySelectorAll('main .frame, footer .frame, .top > .frame, .cell, .nav > a, .nav > button, .cal > *, .slot, .seg span').forEach(c => {
    const r = c.getBoundingClientRect();
    if (!r.width && !r.height) return;
    if (frac(r.left) || frac(r.top + scrollY) || frac(r.width) || frac(r.height)) add('FRAC ' + c.className.slice(0, 24) + ' ' + [r.left, r.top + scrollY, r.width, r.height].map(v => +v.toFixed(2)).join('/'));
  });
  // a cell must fill its grid area: same width as its columns, and reach the row's bottom line
  document.querySelectorAll('.grid').forEach(g => {
    const gw = g.getBoundingClientRect().width, col = gw / 12, byTop = {};
    [...g.children].forEach(c => {
      const cs = getComputedStyle(c);
      if (cs.display === 'none') return;
      const r = c.getBoundingClientRect();
      const m = /span (\d+)/.exec(cs.gridColumnEnd) || /span (\d+)/.exec(cs.gridColumnStart);
      if (m && Math.abs(r.width - col * +m[1]) > 1) add('WIDTH ' + c.className.slice(0, 26) + ' ' + Math.round(r.width) + ' != ' + Math.round(col * +m[1]));
      if (r.height < 8) add('COLLAPSED ' + c.className.slice(0, 26) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      if (!/span/.test(cs.gridRowEnd + cs.gridRowStart)) (byTop[Math.round(r.top)] = byTop[Math.round(r.top)] || []).push(Math.round(r.bottom));
    });
    Object.values(byTop).forEach(b => { if (Math.max(...b) - Math.min(...b) > 0) add('SHORT cell, bottoms ' + b.join(',')); });
  });
  document.querySelectorAll('.media').forEach(m => {
    const r = m.getBoundingClientRect(), i = m.querySelector('img'), ir = i.getBoundingClientRect(), t = m.querySelector('.media__tag');
    if (Math.abs(ir.width - (r.width - 1)) > 1 || Math.abs(ir.height - (r.height - 1)) > 1) add('IMG does not fill ' + Math.round(ir.width) + 'x' + Math.round(ir.height) + ' in ' + Math.round(r.width) + 'x' + Math.round(r.height));
    if (t && (Math.abs(r.bottom - 1 - t.getBoundingClientRect().bottom) > 1 || Math.abs(t.getBoundingClientRect().left - r.left) > 1)) add('TAG off the corner');
  });
  document.querySelectorAll('.cell:not(.media):not(.strip)').forEach(e => {
    if (e.clientWidth && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)) add('CLIP ' + e.className.slice(0, 24) + ':' + e.textContent.trim().slice(0, 14));
  });
  // service names: no word runs out of its cell, and in the three-column grid no name needs a third line
  document.querySelectorAll('.svc__t').forEach(t => {
    if (t.scrollWidth > t.clientWidth + 1) add('SVC name too wide: ' + t.textContent.trim().slice(0, 16));
    const fs = parseFloat(getComputedStyle(t).fontSize);
    if (innerWidth > 600 && t.getBoundingClientRect().height > 2 * fs + 1) add('SVC name on 3 lines: ' + t.textContent.trim().slice(0, 16));
  });
  const hero = document.querySelector('.hero .grid');
  if (hero && innerWidth >= 375 && Math.round(hero.getBoundingClientRect().bottom + scrollY) !== innerHeight) add('HERO ' + Math.round(hero.getBoundingClientRect().bottom + scrollY) + ' != ' + innerHeight);
  return notes;
}

/* the step modals: every step of every modal, opened without animation */
function probeModals() {
  const frac = v => Math.abs(v - Math.round(v)) > 0.01;
  const notes = [];
  const add = t => { if (notes.length < 6) notes.push(t); };
  document.querySelectorAll('.overlay').forEach(o => {
    const m = o.querySelector('.modal'), body = m.querySelector('.modal__body');
    o.classList.add('is-open');
    m.classList.remove('is-first');
    const steps = [...m.querySelectorAll('.step')];
    steps.forEach((st, k) => {
      steps.forEach(x => x.classList.toggle('is-active', x === st));
      const tag = o.id + ' step ' + (k + 1) + ': ';
      const br = body.getBoundingClientRect();
      m.querySelectorAll('.modal__bar > *, .prog li, .step.is-active:not(.step--done) > *, .step.is-active .seg span, .step.is-active .cal > *, .step.is-active .slot, .step.is-active .input, .step.is-active .drop, .modal__foot > *').forEach(c => {
        const r = c.getBoundingClientRect();
        if (!r.width) return;
        if (frac(r.left) || frac(r.top) || frac(r.width) || frac(r.height)) add(tag + 'FRAC ' + String(c.className || c.tagName).slice(0, 18) + ' ' + [r.left, r.top, r.width, r.height].map(v => +v.toFixed(2)).join('/'));
        if (r.right > br.right + 0.5) add(tag + 'SPILL ' + String(c.className || c.tagName).slice(0, 18));
      });
      if (body.scrollWidth > body.clientWidth) add(tag + 'X-OVERFLOW ' + (body.scrollWidth - body.clientWidth));
      // one right edge for every control of a step
      const edges = [...st.querySelectorAll('.step__a > *')].filter(e => e.getBoundingClientRect().width).map(e => Math.round(e.getBoundingClientRect().right * 100) / 100);
      if (new Set(edges).size > 1) add(tag + 'EDGES ' + [...new Set(edges)].join(','));
      // the Termin step: calendar and times close on one line (side by side) or share the edges (stacked)
      const when = st.querySelector('.when');
      if (when) {
        const c = when.querySelector('.cal').getBoundingClientRect(), t = when.querySelector('.slots').getBoundingClientRect(), w = when.getBoundingClientRect();
        const side = getComputedStyle(when).display === 'grid';
        if (side && (c.bottom !== t.bottom || c.top !== t.top || t.right !== w.right || c.right !== t.left + 0)) add(tag + 'WHEN grids ' + [c.top, c.bottom, t.top, t.bottom, c.right, t.left, t.right, w.right].join('/'));
        if (!side && (c.right !== t.right)) add(tag + 'WHEN stacked edges ' + c.right + '/' + t.right);
        if (side && body.scrollHeight > body.clientHeight) add(tag + 'WHEN scrolls ' + (body.scrollHeight - body.clientHeight));
        when.querySelectorAll('.slot, .slots__head > *').forEach(x => { if (x.scrollWidth > x.clientWidth + 1) add(tag + 'SLOT text too wide'); });
      }
    });
    const mr = m.getBoundingClientRect();
    if (frac(mr.left) || frac(mr.top) || frac(mr.width) || frac(mr.height)) add(o.id + ': FRAC modal ' + [mr.left, mr.top, mr.width, mr.height].join('/'));
    const last = m.querySelector('.prog li:last-child').getBoundingClientRect(), bar = m.querySelector('.modal__bar').getBoundingClientRect();
    if (Math.abs(last.right - bar.right) > 0.01) add(o.id + ': PROG ends at ' + last.right + ', bar at ' + bar.right);
    const name = m.querySelector('.modal__name');
    if (name.scrollWidth > name.clientWidth) add(o.id + ': TITLE cut');
    m.querySelectorAll('.modal__foot > *').forEach(b => { if (b.scrollWidth > b.clientWidth + 1) add(o.id + ': BUTTON label too wide'); });
    o.classList.remove('is-open');
  });
  return notes;
}

(async () => {
  const browser = engine === 'webkit' ? await pw.webkit.launch({ executablePath: WEBKIT }) : await pw.chromium.launch();
  let bad = 0, n = 0;
  for (const p of PAGES) {
    for (const [w, h] of SIZES) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 700 ? 3 : 1 });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push('JS ' + String(e).slice(0, 100)));
      await page.goto(BASE + p);
      await page.waitForTimeout(150);
      const notes = (await page.evaluate(probe)).concat(await page.evaluate(probeModals), errors);
      n++;
      if (notes.length) { bad++; console.log(p + ' ' + w + 'x' + h + ': ' + notes.join(' | ')); }
      await ctx.close();
    }
  }
  console.log(engine + ': ' + (n - bad) + '/' + n + ' clean');
  await browser.close();
})().catch(e => { console.error('ERR', String(e).slice(0, 400)); process.exit(1); });
