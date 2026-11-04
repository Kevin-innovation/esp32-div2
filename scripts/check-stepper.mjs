// Run against npm run preview/dev: node scripts/check-stepper.mjs [origin].
// Uses the existing global Playwright and isolated headless testing browser.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
const require = createRequire(import.meta.url);
const { chromium } = require(`${execSync('npm root -g').toString().trim()}/playwright`);
const origin = process.argv[2] ?? 'http://127.0.0.1:4331';
const shots = '/tmp/esp32-stable-qa';
await mkdir(shots, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: `${homedir()}/.agents/bin/test-chromium` });
const errors = [];
let samples = 0;
const ready = async (page) => { await page.evaluate(() => document.fonts.ready); await page.locator('.stepper__step[inert]').first().waitFor({ state: 'attached' }); };
const metric = (s) => s.evaluate((e) => ({
  height: e.querySelector('.stepper__step.is-current .stepper__picture').getBoundingClientRect().height,
  controls: e.querySelector('.stepper__controls').getBoundingClientRect().top + scrollY,
  bottom: e.getBoundingClientRect().bottom + scrollY,
}));
async function exercise(page) {
  for (const s of await page.locator('.stepper').all()) {
    const baseline = await metric(s);
    const measure = async () => {
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const actual = await metric(s);
      for (const key of Object.keys(baseline)) assert.ok(Math.abs(actual[key] - baseline[key]) <= 1, `${await s.getAttribute('aria-label')} ${key}: ${baseline[key]} → ${actual[key]}`);
      assert.equal(await s.locator('.stepper__step:visible').count(), 1);
      const issues = await s.evaluate((el) => {
        const issues = [];
        const visible = el.querySelector('.stepper__step.is-current');
        const picture = visible.querySelector('.stepper__picture').getBoundingClientRect();
        for (const child of visible.querySelectorAll('.stepper__picture *')) {
          const r = child.getBoundingClientRect();
          if (r.width && r.height && (r.left < picture.left - 1 || r.right > picture.right + 1 || r.top < picture.top - 1 || r.bottom > picture.bottom + 1)) issues.push(child.className || child.tagName);
        }
        for (const inactive of el.querySelectorAll('.stepper__step:not(.is-current)')) if (!inactive.inert || getComputedStyle(inactive).visibility !== 'hidden') issues.push(`inactive: ${inactive.textContent.slice(0, 25)} inert=${inactive.inert} visibility=${getComputedStyle(inactive).visibility}`);
        return issues;
      });
      assert.deepEqual(issues, [], 'picture content fits and inactive steps are inert');
      samples++;
    };
    const modes = await s.locator('.stepper__modes label').all();
    for (const mode of modes.length ? modes : [null]) {
      if (mode) await mode.click();
      await measure();
      const next = s.getByRole('button', { name: '다음', exact: true });
      while (true) {
        const question = s.locator('.stepper__step.is-current details:not(.stepper__reserve)');
        if (await question.count()) { await question.locator('summary').click(); await measure(); await question.locator('summary').click(); }
        const replay = s.getByRole('button', { name: '이 단계 다시 보기', exact: true });
        if (await replay.isVisible()) { await replay.click(); await measure(); }
        if (await next.isDisabled()) break;
        await next.click(); await measure();
      }
      const prev = s.getByRole('button', { name: '이전', exact: true });
      while (!(await prev.isDisabled())) { await prev.click(); await measure(); }
      await next.click();
      await s.getByRole('button', { name: '처음', exact: true }).click(); await measure();
    }
  }
}
async function layout(page) {
  const issues = await page.evaluate(() => {
    const bad = [];
    if (document.documentElement.scrollWidth > innerWidth + 1) bad.push('document overflow');
    for (const el of document.querySelectorAll('.facts > div')) {
      const dt = el.querySelector('dt').getBoundingClientRect(), dd = el.querySelector('dd').getBoundingClientRect();
      if (Math.min(dt.right, dd.right) - Math.max(dt.left, dd.left) > 1 && Math.min(dt.bottom, dd.bottom) - Math.max(dt.top, dd.top) > 1) bad.push('dt/dd overlap');
    }
    for (const el of document.querySelectorAll('.tags > *, .workbook-planned')) {
      const r = el.getBoundingClientRect(), p = el.parentElement.getBoundingClientRect();
      if (r.left < p.left - 1 || r.right > p.right + 1) bad.push('parent overflow');
    }
    return bad;
  });
  assert.deepEqual(issues, []);
}
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  if (!process.argv.includes('--extras')) for (const theme of ['light', 'dark']) {
    await context.addInitScript(t => localStorage.setItem('esp32div.theme', t), theme);
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['/learn/nfc/', '/learn/network/']) {
        await page.goto(origin + path, { waitUntil: 'networkidle' }); await ready(page);
        assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
        await exercise(page); await layout(page);
        console.log(`PASS ${theme} ${width} ${path}`);
        if (width === 375 && theme === 'light' && path.includes('network')) {
          const scan = page.locator('.stepper').first();
          await scan.locator('.stepper__modes label').first().click();
          await scan.screenshot({ path: `${shots}/after-scan-first.png` });
          await scan.getByRole('button', { name: '다음', exact: true }).click();
          await page.waitForTimeout(2200);
          await scan.screenshot({ path: `${shots}/after-scan-next.png` });
        }
      }
      await page.goto(origin + '/lab/', { waitUntil: 'networkidle' }); await page.evaluate(() => document.fonts.ready);
      const cards = page.locator('.workbook-planned'); assert.ok(await cards.count() >= 10);
      for (const card of await cards.all()) {
        assert.equal(await card.locator('.workbook-card__state').textContent(), '추후 개발 예정');
        assert.equal(await card.locator('dt').count(), 3);
        for (const a of await card.locator('a').all()) assert.match(await a.getAttribute('href'), /^\/learn\/(projects|security)\/#/);
      }
      assert.equal(await page.getByRole('link', { name: 'NFC 워크북 시작하기' }).getAttribute('href'), '/lab/nfc/');
      assert.equal(await page.locator('.nav').getByRole('link', { name: '실험 워크북' }).getAttribute('href'), '/lab/');
      await layout(page);
      if ([375,1280].includes(width)) await page.screenshot({ path: `${shots}/catalog-${width}-${theme}.png`, fullPage: true });
    }
  }
  // Resize an already hydrated page and increase type size; CSS must recompute maxima.
  await page.goto(origin + '/learn/network/', { waitUntil: 'networkidle' }); await ready(page);
  await page.setViewportSize({ width: 375, height: 900 }); await exercise(page);
  await page.evaluate(() => document.documentElement.style.fontSize = '125%');
  await exercise(page); await layout(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await exercise(page);
  assert.ok(await page.locator('.scene__dot').first().evaluate(e => parseFloat(getComputedStyle(e).animationDuration) <= .001));
  await page.goto(origin + '/lab/nfc/', { waitUntil: 'networkidle' });
  assert.equal(await page.locator('.nav').getByRole('link', { name: '실험 워크북' }).getAttribute('aria-current'), 'true');
  assert.equal(await page.locator('.path-top__all a[aria-current=step]').getAttribute('href'), '/lab/nfc/');
  assert.equal(await page.locator('#report').count(), 1); assert.equal(await page.locator('#interview').count(), 1);
  // Verify background note anchors without following external references.
  await page.goto(origin + '/lab/');
  const links = await page.locator('.workbook-planned a').evaluateAll(as => [...new Set(as.map(a => a.getAttribute('href')))]);
  for (const path of ['/learn/projects/', '/learn/security/']) {
    await page.goto(origin + path);
    for (const href of links.filter(href => href.startsWith(path))) assert.equal(await page.locator(`[id="${href.split('#')[1]}"]`).count(), 1, href);
  }
  const nojs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
  const plain = await nojs.newPage();
  for (const path of ['/learn/nfc/', '/learn/network/']) {
    await plain.goto(origin + path);
    assert.equal(await plain.locator('.stepper__step:visible').count(), await plain.locator('.stepper__step').count());
    assert.equal(await plain.locator('.stepper__controls:visible').count(), 0);
    const detail = plain.locator('.stepper__step details:not(.stepper__reserve)').first();
    await detail.locator('summary').click(); assert.ok(await detail.getAttribute('open') !== null);
    await layout(plain);
  }
  await nojs.close(); await context.close();
  assert.deepEqual(errors, []);
  console.log(`PASS: ${samples} stable geometry samples; ${process.argv.includes('--extras') ? 'resize/fonts/reduced motion/no-JS and nav/anchors' : '4 steppers/all steps/scenarios/previous/reset/replay/questions; 320/375/768/1280 × light/dark; resize/fonts/reduced motion/no-JS; catalog/nav/anchors/layout'}. Console errors: 0. Screenshots: ${shots}`);
} finally { await browser.close(); }
