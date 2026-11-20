/**
 * Acceptance QA — Certificates & Achievements carousel (src/certificates/).
 *
 * Run against the built site:  BASE=http://[::1]:4173/ npx playwright … or
 * plain node:  node qa/accept-certificates-carousel.mjs
 * (expects `npx vite preview --port 4173` running; BASE env overrides).
 *
 * Checks: section mounts after Experience with no heading, 5 data-driven
 * cards in the approved order, all preview+PDF assets return 200, prev/next,
 * dots, keyboard arrows, scroll-snap, lightbox open/close + PDF actions,
 * achievement styling, 4:3 contain preview area, responsive widths with no
 * page h-overflow, zero console/page errors, and the EXISTING Experience
 * certificate lightbox still works.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = process.env.BASE || 'http://[::1]:4173/';
const OUT = 'qa-screenshots-certificates';
mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}

// Instant scroll (html has scroll-behavior:smooth; animated scrolls race the
// hero timeline and leave elements mid-flight).
function scrollToSel(page, sel, off = 0) {
  return page.evaluate(([s, o]) => {
    const el = document.querySelector(s);
    if (!el) return false;
    const y = el.getBoundingClientRect().top + window.scrollY + o;
    window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    return true;
  }, [sel, off]);
}

const EXPECTED = [
  { slug: 'aws-academy-cloud-foundations', pdf: '/assets/certificates/pdf/aws-academy-cloud-foundations.pdf', fileName: 'AWS-Academy-Cloud-Foundations.pdf', kind: 'certificate', title: 'AWS Academy Graduate — Cloud Foundations' },
  { slug: 'aws-academy-machine-learning-foundations', pdf: '/assets/certificates/pdf/aws-academy-machine-learning-foundations.pdf', fileName: 'AWS-Academy-ML-Foundations.pdf', kind: 'certificate', title: 'AWS Academy Graduate — Machine Learning Foundations' },
  { slug: 'udemy-fullstack-ai-devops', pdf: '/assets/certificates/pdf/udemy-fullstack-ai-devops.pdf', fileName: 'Udemy-FullStack-AI-DevOps.pdf', kind: 'certificate', title: 'Full Stack AI DevOps + Real Projects | AWS, Azure, GCP, K8S' },
  { slug: 'copyright-affordable-housing', pdf: '/assets/certificates/pdf/copyright-affordable-housing.pdf', fileName: 'Copyright-LD-20250168994.pdf', kind: 'achievement', title: 'Copyright Registration — "Affordable Housing: Personalized Recommendation System"' },
  { slug: 'agratas-industrial-training', pdf: '/assets/certificates/pdf/agratas-industrial-training.pdf', fileName: 'Agratas-Industrial-Training.pdf', kind: 'certificate', title: 'Certificate of Industrial Training — Finance' },
];

const browser = await chromium.launch({ headless: true });

// ---------- Desktop functional pass ----------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });
  page.on('response', (r) => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url().slice(-90)); });

  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(7000); // hero loading screen has a 5 s minimum

  // Section exists after Experience, with no permanent heading (h1/h2).
  const structure = await page.evaluate(() => {
    const sec = document.querySelector('#certificates');
    if (!sec) return { found: false };
    const exp = document.querySelector('#experience');
    const order = exp && sec ? exp.compareDocumentPosition(sec) & Node.DOCUMENT_POSITION_FOLLOWING : false;
    return {
      found: true,
      afterExperience: !!order,
      heading: sec.querySelector('h1, h2') ? sec.querySelector('h1, h2').textContent : null,
      cards: [...sec.querySelectorAll('.certs-card')].length,
    };
  });
  check('section #certificates mounted', structure.found);
  check('section comes after #experience', structure.afterExperience);
  check('no permanent section heading (h1/h2)', structure.found && structure.heading === null, structure.heading ?? '');
  check('5 cards rendered', structure.cards === 5, `got ${structure.cards}`);

  await scrollToSel(page, '#certificates', -40);
  await page.waitForTimeout(1200);
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.certs-card img')].every((img) => img.complete && img.naturalWidth > 0),
    { timeout: 20000 },
  );
  await page.screenshot({ path: `${OUT}/certs-1440.png` });

  // Card order + assets + actions
  const cards = await page.evaluate(() =>
    [...document.querySelectorAll('.certs-card')].map((c) => ({
      img: c.querySelector('.certs-preview img')?.getAttribute('src'),
      title: c.querySelector('.certs-title')?.textContent,
      kind: c.querySelector('.certs-kind')?.textContent,
      achievementClass: c.classList.contains('certs-card--achievement'),
      viewPdf: c.querySelector('a[target="_blank"]')?.getAttribute('href'),
      download: c.querySelector('a[download]')?.getAttribute('href'),
      downloadName: c.querySelector('a[download]')?.getAttribute('download'),
      previewBox: (() => { const p = c.querySelector('.certs-preview'); const s = getComputedStyle(p); const im = getComputedStyle(p.querySelector('img')); return { ar: s.aspectRatio, fit: im.objectFit }; })(),
    })),
  );
  EXPECTED.forEach((exp, i) => {
    const c = cards[i];
    check(`card ${i + 1} order/preview = ${exp.slug}`, c?.img === `/assets/certificates/previews/${exp.slug}.webp`, c?.img ?? 'missing');
    check(`card ${i + 1} title`, c?.title === exp.title, c?.title ?? '');
    check(`card ${i + 1} kind = ${exp.kind}`, c?.kind?.toLowerCase() === exp.kind && c?.achievementClass === (exp.kind === 'achievement'));
    check(`card ${i + 1} PDF actions`, c?.viewPdf === exp.pdf && c?.download === exp.pdf && c?.downloadName === exp.fileName, `${c?.viewPdf} / ${c?.downloadName}`);
    check(`card ${i + 1} preview area 4:3 + contain`, c?.previewBox.ar === '4 / 3' && c?.previewBox.fit === 'contain', `${c?.previewBox.ar} ${c?.previewBox.fit}`);
  });

  // Every asset URL returns 200
  for (const exp of EXPECTED) {
    for (const url of [`/assets/certificates/previews/${exp.slug}.webp`, exp.pdf]) {
      const status = await page.evaluate(async (u) => (await fetch(u, { method: 'HEAD' })).status, url);
      check(`asset 200 ${url.split('/').pop()}`, status === 200, `status=${status}`);
    }
  }

  // Prev disabled at start; next advances scroll + counter; next disabled at end
  const nav0 = await page.evaluate(() => ({
    prevDisabled: document.querySelector('.certs-nav[aria-label="Previous certificates"]').disabled,
    nextDisabled: document.querySelector('.certs-nav[aria-label="Next certificates"]').disabled,
    scrollLeft: document.querySelector('.certs-track').scrollLeft,
    counter: document.querySelector('.certs-counter').textContent.trim(),
  }));
  check('prev disabled at start, next enabled', nav0.prevDisabled && !nav0.nextDisabled, JSON.stringify(nav0));

  await page.click('.certs-nav[aria-label="Next certificates"]');
  await page.waitForTimeout(900);
  const nav1 = await page.evaluate(() => ({
    scrollLeft: document.querySelector('.certs-track').scrollLeft,
    counter: document.querySelector('.certs-counter').textContent.trim(),
    prevDisabled: document.querySelector('.certs-nav[aria-label="Previous certificates"]').disabled,
    activeDot: [...document.querySelectorAll('.certs-dot')].findIndex((d) => d.classList.contains('certs-dot--active')),
  }));
  check('next scrolls track right', nav1.scrollLeft > nav0.scrollLeft, `${nav0.scrollLeft} -> ${nav1.scrollLeft}`);
  check('counter + dot advance to 2', nav1.counter.startsWith('2') && nav1.activeDot === 1, `${nav1.counter} dot=${nav1.activeDot}`);
  check('prev enabled after moving', !nav1.prevDisabled);

  // Keyboard: focus track, ArrowRight/ArrowLeft
  await page.focus('.certs-track');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(900);
  const key1 = await page.evaluate(() => document.querySelector('.certs-track').scrollLeft);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(900);
  const key2 = await page.evaluate(() => document.querySelector('.certs-track').scrollLeft);
  check('ArrowRight/ArrowLeft drive the track', key1 > nav1.scrollLeft && key2 < key1, `${nav1.scrollLeft} -> ${key1} -> ${key2}`);

  // Dot navigation to last slide
  await page.evaluate(() => document.querySelectorAll('.certs-dot')[4].click());
  await page.waitForTimeout(1200);
  const last = await page.evaluate(() => ({
    scrollLeft: document.querySelector('.certs-track').scrollLeft,
    nextDisabled: document.querySelector('.certs-nav[aria-label="Next certificates"]').disabled,
    counter: document.querySelector('.certs-counter').textContent.trim(),
  }));
  check('dot 5 scrolls to end, next disabled, counter 5/5', last.nextDisabled && last.counter.startsWith('5'), JSON.stringify(last));

  // Lightbox on card 1: open via preview click, check contents, Escape closes
  await scrollToSel(page, '#certificates', -40);
  await page.waitForTimeout(800);
  await page.locator('.certs-card').first().locator('.certs-preview').scrollIntoViewIfNeeded();
  await page.locator('.certs-card').first().locator('.certs-preview').click({ timeout: 10000 });
  await page.waitForSelector('.certs-lightbox[role="dialog"]', { timeout: 5000 });
  const lb = await page.evaluate(() => {
    const d = document.querySelector('.certs-lightbox');
    return {
      label: d.getAttribute('aria-label'),
      title: d.querySelector('h3')?.textContent,
      hasImg: !!d.querySelector('img'),
      viewPdf: d.querySelector('.certs-lightbox-bar a[target="_blank"]')?.getAttribute('href'),
      download: d.querySelector('.certs-lightbox-bar a[download]')?.getAttribute('download'),
      verify: d.querySelector('.certs-verify')?.getAttribute('href'),
    };
  });
  check('lightbox opens with dialog semantics', lb.label === EXPECTED[0].title && lb.hasImg, lb.label ?? '');
  check('lightbox PDF + verify actions', lb.viewPdf === EXPECTED[0].pdf && lb.download === EXPECTED[0].fileName && lb.verify === 'https://www.credly.com/go/BuMaiLhV', `${lb.viewPdf} | ${lb.verify}`);
  await page.screenshot({ path: `${OUT}/certs-lightbox-1440.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  check('Escape closes lightbox', (await page.$('.certs-lightbox')) === null);

  // Achievement lightbox shows gold treatment + no verify link
  await page.locator('.certs-card').nth(3).locator('.certs-preview').click({ timeout: 10000 });
  await page.waitForSelector('.certs-lightbox[role="dialog"]', { timeout: 5000 });
  const lb4 = await page.evaluate(() => ({
    kind: document.querySelector('.certs-lightbox .certs-kind')?.textContent,
    verify: !!document.querySelector('.certs-lightbox .certs-verify'),
    details: [...document.querySelectorAll('.certs-lightbox .certs-details li')].map((li) => li.textContent),
  }));
  check('achievement lightbox: kind tag, no verify link, cert no shown', lb4.kind === 'Achievement' && !lb4.verify && lb4.details.some((t) => t.includes('LD-20250168994')), JSON.stringify(lb4.details));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Existing Experience certificate lightbox still works (regression)
  await scrollToSel(page, '#experience');
  await page.waitForSelector('#experience canvas', { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.click('.dest-label[data-dest="windmill"]');
  await page.waitForSelector('.dest-panel .cert-block', { timeout: 10000 });
  await page.click('.cert-block .cert-btn-primary');
  await page.waitForSelector('.cert-lightbox[role="dialog"]', { timeout: 5000 });
  const expCert = await page.evaluate(() => ({
    img: document.querySelector('.cert-lightbox img')?.getAttribute('src'),
    download: document.querySelector('.cert-lightbox a[download]')?.getAttribute('href'),
  }));
  check('Experience cert lightbox intact', expCert.img === '/assets/certificates/agratas-internship-certificate.png' && !!expCert.download, JSON.stringify(expCert));
  await page.keyboard.press('Escape');

  check('zero console/page/asset errors (desktop pass)', errs.length === 0, errs.slice(0, 4).join(' | '));
  await page.close();
}

// ---------- Responsive pass ----------
for (const [w, h] of [[390, 844], [768, 1024], [1920, 1080]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(7000);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`page ${w}x${h}: no horizontal overflow`, overflow <= 2, `delta=${overflow}px`);
  await scrollToSel(page, '#certificates', -20);
  await page.waitForTimeout(1000);
  const fit = await page.evaluate(() => {
    const track = document.querySelector('.certs-track');
    const card = document.querySelector('.certs-card');
    return {
      cardFitsViewport: card.getBoundingClientRect().width <= window.innerWidth,
      trackScrollable: track.scrollWidth > track.clientWidth,
      cards: document.querySelectorAll('.certs-card').length,
    };
  });
  check(`page ${w}x${h}: card fits viewport, track scrollable, 5 cards`, fit.cardFitsViewport && fit.trackScrollable && fit.cards === 5, JSON.stringify(fit));
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.certs-card img')].every((img) => img.complete && img.naturalWidth > 0),
    { timeout: 20000 },
  ).catch(() => {});
  await page.screenshot({ path: `${OUT}/certs-${w}.png` });
  // swipe-equivalent: drag via scrollTo on track
  const swiped = await page.evaluate(() => {
    const t = document.querySelector('.certs-track');
    const before = t.scrollLeft;
    t.scrollTo({ left: t.scrollWidth, behavior: 'auto' });
    return { before, after: t.scrollLeft, max: t.scrollWidth - t.clientWidth };
  });
  check(`page ${w}x${h}: track can scroll to end`, swiped.after > swiped.before, JSON.stringify(swiped));
  check(`page ${w}x${h}: zero errors`, errs.length === 0, errs.slice(0, 2).join('|'));
  await page.close();
}

await browser.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\n=== CERTIFICATES CAROUSEL: ${passed}/${results.length} pass ===`);
if (results.some((r) => !r.pass)) process.exit(1);
