// node scripts/check-signal.mjs [origin] — isolated headless Chromium only.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
const require = createRequire(import.meta.url);
const { chromium } = require(execSync('npm root -g').toString().trim() + '/playwright');
const origin = process.argv[2] ?? 'http://127.0.0.1:4333';
const dir = '/tmp/esp32-signal-qa'; await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: homedir() + '/.agents/bin/test-chromium' });
const errors = []; let renders = 0, interactions = 0;
try {
  for (const js of [true, false]) for (const theme of ['light', 'dark']) for (const width of [320, 375, 768, 1280]) {
    const context = await browser.newContext({ javaScriptEnabled: js, colorScheme: theme, viewport: { width, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    for (const kind of ['interference', 'gps']) {
      await page.goto(origin + '/lab/' + kind + '/', { waitUntil: 'networkidle' });
      if (js) {
        if (width === 375 && theme === 'light') {
          await page.locator(`#${kind}-observed_at`).fill('2026-01-01T10:00');
          if (kind === 'interference') {
            await page.locator(`#${kind}-condition`).fill('가상 위치 A');
            await page.locator(`#${kind}-display_text`).fill('높은 막대');
            await page.locator(`#${kind}-energy_value`).fill('5');
            await page.getByRole('button', { name: '한 번의 관찰 추가', exact: true }).click();
            assert.ok((await page.getByRole('status').textContent()).includes('단위 없는'));
            await page.locator(`#${kind}-energy_unit`).fill('dBm');
          } else {
            await page.locator('#gps-fix').selectOption('fixed');
            await page.locator('#gps-timed_out').selectOption('yes');
            await page.locator('#gps-wait_seconds').fill('60');
            await page.locator('#gps-crosscheck').fill('휴대폰 대조 못 함');
            await page.getByRole('button', { name: '한 번의 관찰 추가', exact: true }).click();
            assert.ok((await page.getByRole('status').textContent()).includes('타임아웃'));
            await page.locator('#gps-fix').selectOption('no-fix');
          }
          await page.getByRole('button', { name: '한 번의 관찰 추가', exact: true }).click();
          assert.equal(await page.locator('#record tbody tr').count(), 1);
          await page.locator(`#${kind}-note-question`).fill('내가 확인한 증거는 무엇인가?');
          const downloadEvent = page.waitForEvent('download'); await page.getByRole('button', { name: '전체 CSV 내려받기', exact: true }).click();
          const file = await downloadEvent; const path = dir + '/' + kind + '-roundtrip.csv'; await file.saveAs(path);
          assert.ok((await readFile(path, 'utf8')).startsWith('\uFEFF'));
          await page.locator(`#${kind}-file`).setInputFiles(path);
          await page.getByRole('button', { name: '유효 행과 서술 반영', exact: true }).click();
          assert.equal(await page.locator('#record tbody tr').count(), 1);
          const bad = (await readFile(path, 'utf8')) + '잘못된,행\r\n';
          await page.locator(`#${kind}-file`).setInputFiles({ name: 'invalid.csv', mimeType: 'text/csv', buffer: Buffer.from(bad) });
          assert.ok((await page.locator('#data .callout').textContent()).includes('오류 1행'));
          await page.getByRole('button', { name: '취소', exact: true }).click();
          await page.reload({ waitUntil: 'networkidle' }); assert.equal(await page.locator('#record tbody tr').count(), 1);
          assert.equal(await page.locator(`#${kind}-note-question`).inputValue(), '내가 확인한 증거는 무엇인가?');
          page.once('dialog', d => d.accept()); await page.getByRole('button', { name: '삭제', exact: true }).click();
          assert.equal(await page.locator('#record tbody tr').count(), 0); interactions++;
        }
        await page.getByRole('button', { name: '가상 예시 3행으로 데모 시작·초기화', exact: true }).click();
        assert.equal(await page.locator('#record tbody tr').count(), 3);
        assert.ok((await page.locator('#analysis').textContent()).includes(kind === 'gps' ? '타임아웃 2회' : '수치·단위가 함께 있는 기록 0건'));
        await page.reload({ waitUntil: 'networkidle' }); await page.getByLabel('데모', { exact: true }).check();
        assert.equal(await page.locator('#record tbody tr').count(), 3);
      } else assert.ok((await page.locator('noscript').textContent()).includes('공책'));
      const over = await page.evaluate(() => {
        document.documentElement.style.setProperty('overflow-x', 'visible', 'important'); document.body.style.setProperty('overflow-x', 'visible', 'important');
        return document.documentElement.scrollWidth > innerWidth + 1;
      }); assert.equal(over, false, `${kind}/${width}/${theme}/JS=${js}`); renders++;
      if (js && width === 375 && theme === 'light') {
        await page.screenshot({ path: dir + '/' + kind + '-375-light.png', fullPage: true });
        await page.locator('#analysis').screenshot({ path: dir + '/' + kind + '-analysis.png', style: '.site-head,.path-top{visibility:hidden!important;}' });
      }
    }
    await context.close();
  }
  const page = await browser.newPage(); await page.goto(origin + '/lab/', { waitUntil: 'networkidle' });
  assert.equal(await page.locator('#available .workbook-planned').count(), 12); assert.equal(await page.locator('#planned .workbook-planned').count(), 0);
  for (const slug of ['interference', 'gps']) assert.equal(await page.locator(`#available a[href="/lab/${slug}/"]`).count(), 1);
  const result = `PASS ${renders} renders (320/375/768/1280 × light/dark × JS on/off); ${interactions} full input/invalid/CSV roundtrip/error/reload/delete flows; demo separation/reload; unclipped overflow0; catalog12+0; console${errors.length}`;
  assert.deepEqual(errors, []); await writeFile(dir + '/result.txt', result); console.log(result);
} finally { await browser.close(); }
