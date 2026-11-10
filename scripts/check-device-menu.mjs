// node scripts/check-device-menu.mjs [http://127.0.0.1:4331]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { MAIN_MENU, DEVICE_MENU_MAP } from '../src/data/learn.ts';
const expected = {
  wifi: ['packet-monitor', 'beacon-spammer', 'wifi-deauther', 'probe-flood', 'deauth-detector', 'wifi-scanner', 'captive-portal', 'hidden-ssid', 'wps-scanner', 'arp-scanner', 'karma'],
  bluetooth: ['ble-jammer', 'ble-spoofer', 'sour-apple', 'airtag-spoofer', 'airtag-sniffer', 'ble-sniffer', 'ble-scanner', 'rubber-ducky', 'skimmer-detect'],
  '24ghz': ['24-scanner', 'proto-kill', 'esb-sniffer', 'esb-replay', 'mousejack-scan', 'mousejack-inject'],
  subghz: ['replay-attack', 'subghz-jammer', 'de-bruijn', 'jamming-detector', 'subghz-saved'],
  more: ['ir', 'nfc', 'gps', 'games'],
  tools: ['serial-monitor', 'update-firmware', 'touch-calibrate', 'sd-file-manager', 'nrf-tuning'],
  settings: ['settings'], about: ['about'],
};
assert.equal(MAIN_MENU.length, 8);
assert.deepEqual(DEVICE_MENU_MAP.map(menu => menu.id), MAIN_MENU.map(menu => menu.id));
for (const menu of DEVICE_MENU_MAP) {
  assert.deepEqual(menu.pages.flatMap(page => page.items), expected[menu.id]);
  for (const key of ['learn', 'risk', 'permit', 'checked']) assert.ok(menu[key].length > 15);
}
console.log('PASS menu data: 8 groups/42 entries; Skimmer in BLE, Saved Profile in SubGHz; four explanation boundaries.');
if (!process.argv[2]) process.exit(0);
const origin = process.argv[2], shots = '/tmp/esp32-device-menu-qa';
await mkdir(shots, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require(execSync('npm root -g').toString().trim() + '/playwright');
const browser = await chromium.launch({ headless: true, executablePath: homedir() + '/.agents/bin/test-chromium' });
const errors = []; let checks = 0;
const links = new Set();
try {
  for (const js of [true, false]) for (const theme of ['light', 'dark']) for (const width of [375, 768, 1280]) {
    const context = await browser.newContext({ javaScriptEnabled: js, colorScheme: theme, viewport: { width, height: 1000 } });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(origin + '/device/', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('nav[aria-label="메인 메뉴별 설명"] a').count(), 8); checks++;
    const destinations = await page.locator('nav[aria-label="메인 메뉴별 설명"] a').evaluateAll(as => as.map(a => a.getAttribute('href')));
    await page.goto(origin + '/learn/device/', { waitUntil: 'networkidle' });
    if (js) await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('#menu-map > details').count(), 8); checks++;
    for (const href of destinations) assert.equal(await page.locator(href.slice(href.indexOf('#'))).count(), 1);
    const first = page.locator('#menu-wifi > summary');
    await first.focus(); await page.keyboard.press('Space');
    assert.equal(await page.locator('#menu-wifi').getAttribute('open'), ''); checks++;
    for (const detail of await page.locator('#menu-map > details').all()) if (!(await detail.getAttribute('open') !== null)) await detail.locator(':scope > summary').click();
    assert.equal(await page.locator('.menu-map__page li').count(), 42); checks++;
    assert.equal(await page.locator('#menu-map .facts dt').count(), 32); checks++;
    assert.equal(await page.locator('#menu-bluetooth .menu-map__page a').filter({ hasText: 'Skimmer Detect' }).count(), 1);
    assert.equal(await page.locator('#menu-subghz .menu-map__page a').filter({ hasText: 'Skimmer Detect' }).count(), 0); checks += 2;
    assert.ok((await page.locator('#nrf-tuning').textContent()).includes('세부 조정값·효과·송신 여부·복구 방법은 확인하지 못했으므로')); checks++;
    for (const href of await page.locator('.menu-map__page a').evaluateAll(as => as.map(a => a.getAttribute('href')))) if (!href.startsWith('#')) links.add(href);
    const issues = await page.evaluate(() => {
      const bad = [];
      if (document.documentElement.scrollWidth > innerWidth + 1) bad.push('document overflow');
      for (const el of document.querySelectorAll('.menu-map, .menu-map__page, .menu-map .facts > div')) {
        const r = el.getBoundingClientRect(), p = el.parentElement.getBoundingClientRect();
        if (r.left < p.left - 1 || r.right > p.right + 1) bad.push('parent bounds');
      }
      for (const el of document.querySelectorAll('.menu-map .facts > div')) {
        const a = el.querySelector('dt').getBoundingClientRect(), b = el.querySelector('dd').getBoundingClientRect();
        if (Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1) bad.push('dt/dd overlap');
      }
      if ([...document.images].some(img => /IMG_59\d\d/i.test(img.src + img.srcset))) bad.push('source photo exposed');
      return bad;
    });
    assert.deepEqual(issues, []); checks++;
    if (js && [375,1280].includes(width)) {
      const style = '.site-head, .path-top { visibility: hidden !important; }';
      await page.locator('#menu-wifi').screenshot({ path: `${shots}/wifi-${width}-${theme}.png`, style });
      await page.locator('#menu-tools').screenshot({ path: `${shots}/tools-${width}-${theme}.png`, style });
      await page.locator('#menu-subghz').screenshot({ path: `${shots}/subghz-${width}-${theme}.png`, style });
    }
    if (!js) assert.equal(await page.locator('.explorer__panel:visible').count(), 8);
    console.log(`PASS menu layout/keyboard/links ${width} ${theme} JS=${js}`);
    await context.close();
  }
  const context = await browser.newContext(); const page = await context.newPage();
  for (const href of links) {
    const [route, id] = href.split('#');
    const response = await page.goto(origin + route);
    assert.equal(response.status(), 200, route);
    if (id) assert.equal(await page.locator(`[id="${id}"]`).count(), 1, href);
  }
  await context.close(); assert.deepEqual(errors, []);
  console.log(`PASS browser ${checks} checks, ${links.size} guide targets; console 0. Screenshots ${shots}`);
} finally { await browser.close(); }
