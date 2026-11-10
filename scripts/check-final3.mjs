// node scripts/check-final3.mjs [origin] — isolated headless testing Chromium only.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
const require = createRequire(import.meta.url);
const { chromium } = require(execSync('npm root -g').toString().trim() + '/playwright');
const origin = process.argv[2] ?? 'http://127.0.0.1:4335';
const dir = '/tmp/esp32-final3-qa'; await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: homedir() + '/.agents/bin/test-chromium' });
const errors = [], kinds = ['channel', 'ble-pair', 'subghz']; let renders = 0, flows = 0;
const attach = page => {
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
};
try {
  for (const js of process.argv.includes('--storage-only') ? [] : [true, false]) for (const theme of ['light', 'dark']) for (const width of [320, 375, 768, 1280]) {
    const context = await browser.newContext({ javaScriptEnabled: js, colorScheme: theme, viewport: { width, height: 900 } });
    const page = await context.newPage(); attach(page);
    for (const kind of kinds) {
      await page.goto(`${origin}/lab/${kind}/`, { waitUntil: 'networkidle' });
      assert.ok((await page.locator('.page-head').textContent()).includes('교실 파일럿 미검증'));
      if (js) {
        if (width === 375 && theme === 'light') {
          await page.locator(`#${kind}-condition`).fill('허가받은 내 자료 확인');
          await page.locator(`#${kind}-evidence`).fill('내 관리자 화면 또는 공식 설명서 확인');
          if (kind === 'channel') {
            await page.locator('#channel-observed_at').fill('2026-01-01T10:00');
            await page.locator('#channel-channel_alias').fill('CH-A');
            await page.locator('#channel-backup_path').fill('유선 경로 문서 확인, 실제 연결 미확인');
            await page.locator('#channel-ap_count').fill('-1');
          } else if (kind === 'ble-pair') {
            await page.locator('#ble-pair-app_permissions').fill('근처 기기 권한 확인, 나머지 미확인');
            await page.locator('#ble-pair-permission_plan').fill('앱 설명서와 비교해 불필요한 권한을 줄임');
            await page.locator('#ble-pair-pairing_method').selectOption('just-works');
            await page.locator('#ble-pair-link_status').selectOption('disconnected');
            await page.locator('#ble-pair-reconnect_result').selectOption('reconnected');
          } else {
            await page.locator('#subghz-frequency_alias').fill('Freq-A');
            await page.locator('#subghz-code_method').selectOption('fixed');
            await page.locator('#subghz-code_basis').selectOption('screen');
            await page.locator('#subghz-code_document').fill('내 별도 실험 장비 설명서의 코드 방식 항목');
            await page.locator('#subghz-access_defense').fill('잠금 보관과 접근자 제한');
            await page.locator('#subghz-regional_rules').fill('사용 지역 규정 미확인, 송신 보류');
          }
          await page.getByRole('button', { name: '한 번의 관찰 추가', exact: true }).click();
          assert.equal(await page.locator('#record tbody tr').count(), 0);
          assert.ok((await page.getByRole('status').textContent()).includes(kind === 'channel' ? '0~10000' : kind === 'ble-pair' ? '재연결 성공' : '화면 패턴 대신'));
          if (kind === 'channel') await page.locator('#channel-ap_count').fill('0');
          else if (kind === 'ble-pair') await page.locator('#ble-pair-link_status').selectOption('connected');
          else await page.locator('#subghz-code_basis').selectOption('manual');
          await page.locator(`#${kind}-note`).fill('=SUM(1,2)');
          await page.getByRole('button', { name: '한 번의 관찰 추가', exact: true }).click();
          assert.equal(await page.locator('#record tbody tr').count(), 1);
          await page.locator(`#${kind}-note-question`).fill('내가 확인한 증거는 무엇인가?');
          const event = page.waitForEvent('download'); await page.getByRole('button', { name: '전체 CSV 내려받기', exact: true }).click();
          const download = await event, path = `${dir}/${kind}-roundtrip.csv`; await download.saveAs(path);
          const csv = await readFile(path, 'utf8'); assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes("'=SUM"));
          await page.locator(`#${kind}-file`).setInputFiles(path);
          await page.getByRole('button', { name: '유효 행과 서술 반영', exact: true }).click();
          assert.equal(await page.locator('#record tbody tr').count(), 1);
          await page.locator(`#${kind}-file`).setInputFiles({ name: 'invalid.csv', mimeType: 'text/csv', buffer: Buffer.from(csv + 'bad,row\r\n') });
          assert.ok((await page.locator('#data .callout').textContent()).includes('오류 1행'));
          await page.getByRole('button', { name: '취소', exact: true }).click();
          await page.reload({ waitUntil: 'networkidle' });
          assert.equal(await page.locator('#record tbody tr').count(), 1);
          assert.equal(await page.locator(`#${kind}-note-question`).inputValue(), '내가 확인한 증거는 무엇인가?');
          const saved = await page.evaluate(kind => JSON.parse(localStorage.getItem(`esp32div.lab.${kind}.v1`)), kind);
          assert.equal(saved.rows.length, 1); assert.equal(saved.rows[0].data_type, 'real'); flows++;
        }
        await page.getByRole('button', { name: '가상 예시 3행으로 데모 시작·초기화', exact: true }).click();
        assert.equal(await page.locator('#record tbody tr').count(), 3);
        const analysis = await page.locator('#analysis').textContent();
        assert.ok(analysis.includes('미측정 1회'));
        assert.ok(analysis.includes(kind === 'channel' ? '표시 AP 수 표본 2개' : kind === 'ble-pair' ? '해제 후 재연결 확인 1건' : '설명서상 고정 코드 1건'));
        await page.reload({ waitUntil: 'networkidle' }); await page.getByLabel('데모', { exact: true }).check();
        assert.equal(await page.locator('#record tbody tr').count(), 3);
        if (width === 375 && theme === 'light') {
          assert.equal(await page.locator(`#${kind}-note-question`).inputValue(), '');
          await page.getByLabel('실제 관찰', { exact: true }).check(); assert.equal(await page.locator('#record tbody tr').count(), 1);
          const event = page.waitForEvent('download'); await page.getByRole('button', { name: '현재 구분 보고서 내려받기', exact: true }).click();
          const download = await event, path = `${dir}/${kind}-report.txt`; await download.saveAs(path);
          assert.ok((await readFile(path, 'utf8')).includes('실제 관찰'));
          page.once('dialog', d => d.accept()); await page.getByRole('button', { name: '삭제', exact: true }).click(); assert.equal(await page.locator('#record tbody tr').count(), 0);
          await page.getByLabel('데모', { exact: true }).check(); assert.equal(await page.locator('#record tbody tr').count(), 3);
        }
      } else assert.ok((await page.locator('noscript').textContent()).includes('공책'));
      assert.equal(await page.evaluate(() => {
        document.documentElement.style.setProperty('overflow-x', 'visible', 'important'); document.body.style.setProperty('overflow-x', 'visible', 'important');
        return document.documentElement.scrollWidth > innerWidth + 1;
      }), false, `${kind}/${width}/${theme}/JS=${js}`); renders++;
      if (js && [375, 1280].includes(width)) { await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: `${dir}/${kind}-${width}-${theme}.png`, fullPage: true }); }
    }
    await context.close();
  }
  const context = await browser.newContext(); const page = await context.newPage(); attach(page);
  await page.goto(`${origin}/lab/`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('#available .workbook-planned').count(), 12); assert.equal(await page.locator('#planned .workbook-planned').count(), 0);
  assert.ok((await page.locator('.workbook-intro').textContent()).includes('NFC 포함 13개'));
  for (const kind of kinds) assert.equal(await page.locator(`#available a[href="/lab/${kind}/"]`).count(), 1);
  await page.evaluate(() => localStorage.setItem('esp32div.lab.channel.v1', '{broken'));
  await page.goto(`${origin}/lab/channel/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('[role=status]').textContent.includes('원본을 별도 키에 보존'));
  assert.equal(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('esp32div.lab.channel.v1.broken.')).length), 1);
  await context.close();
  const blocked = await browser.newContext(); await blocked.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('blocked'); }; });
  const blockedPage = await blocked.newPage(); attach(blockedPage); await blockedPage.goto(`${origin}/lab/subghz/`, { waitUntil: 'networkidle' });
  await blockedPage.waitForFunction(() => document.querySelector('[role=status]').textContent.includes('CSV를 내려받으세요'));
  await blocked.close(); assert.deepEqual(errors, []);
  const result = process.argv.includes('--storage-only') ? 'PASS broken/blocked storage, catalog12+0, console0 (storage-only follow-up)' : `PASS ${renders} renders (320/375/768/1280 × light/dark × JS on/off), ${flows} input/invalid/CSV/report/reload/delete flows, real/demo separation, topic-specific analysis, broken/blocked storage, catalog12+0, overflow0, console0`;
  await writeFile(`${dir}/result.txt`, result); console.log(result);
} finally { await browser.close(); }
