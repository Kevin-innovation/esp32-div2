// Run against npm run preview/dev: node scripts/check-stepper.mjs [origin].
// Uses the existing global Playwright and isolated headless testing browser.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
const require = createRequire(import.meta.url);
const { chromium } = require(`${execSync('npm root -g').toString().trim()}/playwright`);
const origin = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://127.0.0.1:4331';
// --stepper: 원리 그림 단계 검사만(375·1280 × light/dark). 목록·탐색·추가 검사는 건너뛴다.
const only = process.argv.includes('--stepper');
const shots = '/tmp/esp32-stable-qa';
await mkdir(shots, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: `${homedir()}/.agents/bin/test-chromium` });
const errors = [];
let samples = 0;
const ready = async (page) => { await page.evaluate(() => document.fonts.ready); await page.locator('.stepper__step[inert]').first().waitFor({ state: 'attached' }); };
const metric = (s) => s.evaluate((e) => ({
  height: e.querySelector('.stepper__step.is-current .stepper__picture').getBoundingClientRect().height,
  controls: e.querySelector('.stepper__controls').getBoundingClientRect().top + scrollY,
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
        // 자식의 visibility:visible은 숨긴 조상을 뚫으므로 비활성 단계 안의 보이는 요소도 본다.
        for (const leak of el.querySelectorAll('.stepper__step:not(.is-current) *')) if (getComputedStyle(leak).visibility === 'visible' && leak.getBoundingClientRect().width) issues.push(`inactive leak: ${leak.className || leak.tagName} "${leak.textContent.slice(0, 20)}"`);
        // 지금 단계의 빈 줄 안내는 받은 줄과 겹치지 않는다.
        for (const wait of visible.querySelectorAll('.scan-demo__wait')) {
          const w = wait.getBoundingClientRect();
          for (const row of visible.querySelectorAll('.scan-demo tbody tr:not(.is-empty)')) { const r = row.getBoundingClientRect(); if (Math.min(w.bottom, r.bottom) - Math.max(w.top, r.top) > 1) issues.push(`wait overlaps row: ${wait.textContent}`); }
        }
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
        const question = s.locator('.stepper__ask');
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
    for (const width of only ? [375, 1280] : [320, 375, 768, 1280]) {
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
      if (only) continue;
      await page.goto(origin + '/lab/', { waitUntil: 'networkidle' }); await page.evaluate(() => document.fonts.ready);
      const cards = page.locator('.workbook-planned'); assert.equal(await cards.count(), 13);
      assert.equal(await page.locator('.workbook-card__state').filter({ hasText: '추후 개발 예정' }).count(), 0);
      assert.equal(await cards.first().getByRole('link', { name: '워크북 시작하기' }).getAttribute('href'), '/lab/nfc/');
      assert.equal(await page.locator('.workbook-scene svg').count(), 0);
      assert.equal(await page.locator('.workbook-scene img').count(), 13);
      for (const card of await cards.all()) {
        assert.equal(await card.locator('.workbook-card__state').textContent(), await card.locator('.workbook-card__start').count() ? '웹 워크북 사용 가능' : '추후 개발 예정');
        assert.equal(await card.locator('dt').count(), 3);
        const image = card.locator('.workbook-scene img');
        assert.ok(await image.getAttribute('alt'));
        assert.equal(await image.getAttribute('loading'), 'lazy');
        assert.equal(await image.getAttribute('decoding'), 'async');
        for (const a of await card.locator('.workbook-card__links a').all()) assert.match(await a.getAttribute('href'), /^\/learn\/(projects|security)\/#/);
      }
      assert.equal(await page.getByRole('link', { name: '01 NFC는 지갑과 가방 안에서도 인식될까? 워크북 시작하기' }).getAttribute('href'), '/lab/nfc/');
      assert.equal(await page.locator('.nav').getByRole('link', { name: '실습 미션' }).getAttribute('href'), '/lab/');
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
  if (!only) {
  await page.goto(origin + '/lab/nfc/', { waitUntil: 'networkidle' });
  assert.equal(await page.locator('.nav').getByRole('link', { name: '실습 미션' }).getAttribute('aria-current'), 'true');
  assert.equal(await page.locator('.path-top a[aria-current=step]').getAttribute('href'), '/lab/nfc/');
  assert.equal(await page.locator('#report').count(), 1); assert.equal(await page.locator('#interview').count(), 1);
  // Verify background note anchors without following external references.
  await page.goto(origin + '/lab/');
  const links = await page.locator('.workbook-planned a').evaluateAll(as => [...new Set(as.map(a => a.getAttribute('href')))]);
  for (const path of ['/learn/projects/', '/learn/security/']) {
    await page.goto(origin + path);
    for (const href of links.filter(href => href.startsWith(path))) assert.equal(await page.locator(`[id="${href.split('#')[1]}"]`).count(), 1, href);
  }
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
  console.log(`PASS: ${samples} stable geometry samples; ${only ? 'steppers only: all steps/scenarios/previous/reset/replay/questions; 375/1280 × light/dark; resize/fonts/reduced motion/no-JS' : process.argv.includes('--extras') ? 'resize/fonts/reduced motion/no-JS and nav/anchors' : '4 steppers/all steps/scenarios/previous/reset/replay/questions; 320/375/768/1280 × light/dark; resize/fonts/reduced motion/no-JS; catalog/nav/anchors/layout'}. Console errors: 0. Screenshots: ${shots}`);
} finally { await browser.close(); }
