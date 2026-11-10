// Pure checks: node scripts/check-wifi-rssi.mjs
// Browser batch: node scripts/check-wifi-rssi.mjs http://127.0.0.1:4331 [--browser-only]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execSync, execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import path from 'node:path';
import {
  WIFI_CSV_COLUMNS, WIFI_NOTE_COLUMNS, WIFI_PYTHON, WIFI_STORAGE_KEY,
  validateWifiObservation, wifiObservationsToCsv, wifiNotesToCsv, importWifiCsv,
  mergeWifiObservations, summarizeWifiByRoom, buildWifiReport, restoreWifiState, demoWifiObservations,
} from '../src/lib/workbook.ts';

const origin = process.argv.find(arg => /^https?:/.test(arg));
const shots = path.join(tmpdir(), 'esp32-wifi-rssi-qa');
await mkdir(shots, { recursive: true });
const raw = (over = {}) => ({ trial: '1', room: '거실', condition: '문 열림', distance_m: '2', observation_status: 'observed', rssi_dbm: '-50', channel: '6', observed_at: '2026-11-04T18:00', ssid_alias: 'AP-A', bssid_alias: '', note: '', ...over });
const make = (over = {}) => { const row = validateWifiObservation(raw(over)); assert.notEqual(typeof row, 'string', String(row)); return row; };
if (!process.argv.includes('--browser-only')) {
  const sameA = make(), sameB = make();
  assert.notEqual(sameA.id, sameB.id);
  assert.equal(mergeWifiObservations([sameA], [sameB]).added, 1, 'Equal readings are distinct observations');
  assert.equal(mergeWifiObservations([sameA], [sameA]).skipped, 1);
  assert.equal(mergeWifiObservations([sameA], [{ ...sameA, rssiDbm: -70 }]).conflicts, 1);
  const missing = make({ room: '미측정 방', observation_status: 'unchecked', rssi_dbm: '', channel: '' });
  const notSeen = make({ observation_status: 'not-observed', rssi_dbm: '', channel: '' });
  const readings = [-40, -70, -55].map((value, i) => make({ trial: String(i + 1), rssi_dbm: String(value) }));
  const summary = summarizeWifiByRoom([...readings, notSeen, missing]);
  assert.deepEqual(summary.find(group => group.room === '거실'), { room: '거실', count: 3, average: -55, median: -55, min: -70, max: -40, notObserved: 1, unchecked: 0 });
  assert.equal(summary.find(group => group.room === '미측정 방').median, null);
  for (const over of [{ rssi_dbm: '' }, { rssi_dbm: '1' }, { rssi_dbm: '-121' }, { rssi_dbm: 'NaN' }, { channel: '15' }, { observation_status: 'unchecked' }, { observed_at: '2026-02-30T18:00' }, { data_type: 'other' }]) assert.equal(typeof validateWifiObservation(raw(over)), 'string');
  const tricky = make({ room: '=방', note: '쉼표, "따옴표"\n줄바꿈 <script>위험</script>', ssid_alias: '@AP' });
  const csv = wifiObservationsToCsv([tricky, ...readings, missing]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes("'=방") && !csv.includes(',=방,'));
  const back = importWifiCsv(csv); assert.equal(back.kind, 'observations'); assert.deepEqual(back.errors, []); assert.deepEqual(back.observations, [tricky, ...readings, missing]);
  const notes = { question: '=질문, "따옴표"', conclusion: '결론\n다음 줄', followup: '<img src=x onerror=alert(1)>' };
  const notesBack = importWifiCsv(wifiNotesToCsv(notes)); assert.equal(notesBack.kind, 'notes'); assert.deepEqual(notesBack.notes, notes); assert.deepEqual(notesBack.errors, []);
  assert.equal(importWifiCsv(csv.replaceAll('wifi-rssi', 'nfc')).kind, 'invalid');
  assert.equal(importWifiCsv('field,value\nquestion,wrong').kind, 'invalid');
  const invalid = importWifiCsv(WIFI_CSV_COLUMNS.join(',') + '\r\n1,wifi-rssi\r\n'); assert.equal(invalid.errors.length, 1);
  assert.equal(importWifiCsv(WIFI_NOTE_COLUMNS.join(',') + '\r\n1,wifi-rssi,unknown,x\r\n').errors.length, 1);
  assert.throws(() => restoreWifiState('{}'));
  assert.throws(() => restoreWifiState(JSON.stringify({ schemaVersion: 2, observations: [], notes: {} })));
  assert.deepEqual(restoreWifiState(JSON.stringify({ observations: [sameA], notes })).observations, [sameA]);
  assert.equal(restoreWifiState(JSON.stringify({ observations: [null, sameA], notes: {} })).dropped, 1);
  assert.equal(restoreWifiState(JSON.stringify({ observations: [sameA, sameA], notes: {} })).dropped, 1);
  assert.equal(mergeWifiObservations([sameA], [{ note: sameA.note, ...sameA }]).skipped, 1);
  const report = buildWifiReport([tricky, ...demoWifiObservations()], notes, 'real', '2026-11-05');
  assert.ok(report.includes('실제 기록 1건') && report.includes('추가 실험') && !report.includes('<script>') && !report.includes('<img'));
  assert.ok(buildWifiReport(demoWifiObservations(), {}, 'demo', '2026-11-05').includes('데모 자료의 가상 값'));
  const pythonDir = await mkdtemp(path.join(tmpdir(), 'wifi-rssi-python-'));
  await writeFile(path.join(pythonDir, 'wifi-rssi-observations.csv'), wifiObservationsToCsv([...readings, notSeen, missing, ...demoWifiObservations()]));
  await writeFile(path.join(pythonDir, 'wifi-rssi-analysis.py'), WIFI_PYTHON);
  const python = execFileSync('python3', ['wifi-rssi-analysis.py'], { cwd: pythonDir, encoding: 'utf8' });
  assert.ok(python.includes('중앙값: -55') && python.includes('유효 n: 0') && python.includes('신호 못 찾음: 1'));
  await writeFile(path.join(shots, 'python-output.txt'), python);
  console.log(`PASS pure: input/null/median/identity/CSV/notes/report/storage; Python stdlib executed in ${pythonDir}`);
}
if (!origin) process.exit(0);
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const browser = await chromium.launch({ headless: true, executablePath: path.join(homedir(), '.agents/bin/test-chromium') });
const errors = [];
let checks = 0;
const nfcSentinel = '{"keep":"NFC 원본은 변경하지 않음"}';
const attach = (page) => {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('dialog', dialog => dialog.accept());
};
const countRows = (page) => page.locator('#record tbody tr').count();
async function ready(page) {
  await page.goto(origin + '/lab/wifi-rssi/', { waitUntil: 'networkidle' });
  await page.waitForFunction(key => localStorage.getItem(key) !== null, WIFI_STORAGE_KEY);
  await page.evaluate(() => document.fonts.ready);
}
async function layout(page) {
  const issues = await page.evaluate(() => {
    const issues = [];
    if (document.documentElement.scrollWidth > innerWidth + 1) issues.push('document overflow');
    for (const el of document.querySelectorAll('.wifi-app, .field, .report, .facts > div, .wifi-app input, .wifi-app select, .wifi-app textarea, .wifi-app button')) {
      let parentElement = el.parentElement;
      while (parentElement && getComputedStyle(parentElement).display === 'contents') parentElement = parentElement.parentElement;
      const r = el.getBoundingClientRect(), parent = parentElement.getBoundingClientRect();
      if (r.width && (r.left < parent.left - 1 || r.right > parent.right + 1)) issues.push(el.className);
    }
    for (const el of document.querySelectorAll('.wifi-app input, .wifi-app select, .wifi-app textarea')) if (!el.labels?.length) issues.push('unlabelled input');
    return issues;
  });
  assert.deepEqual(issues, []); checks++;
}
async function downloaded(page, name) {
  const event = page.waitForEvent('download'); await page.getByRole('button', { name, exact: true }).click();
  const download = await event; return { text: await readFile(await download.path(), 'utf8'), name: download.suggestedFilename() };
}
try {
  if (!process.argv.includes('--interactions-only')) for (const theme of ['light', 'dark']) for (const width of [375, 768, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme });
    const page = await context.newPage(); attach(page); await ready(page);
    assert.equal(await countRows(page), 0); checks++;
    assert.ok((await page.locator('.callout--warn').first().textContent()).includes('아직 확인하지 못했습니다')); checks++;
    await layout(page);
    await page.getByRole('button', { name: '화면 확인용 데모 자료 불러오기', exact: true }).click();
    assert.equal(await countRows(page), 9); assert.ok((await page.locator('#chart').textContent()).includes('데모 가상')); checks += 2;
    assert.ok((await page.locator('.report').textContent()).includes('가상 값으로 만든')); checks++;
    await page.getByText('CSV를 Python으로 분석하기', { exact: true }).click();
    await layout(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(shots, `wifi-${width}-${theme}.png`), fullPage: true });
    await page.goto(origin + '/lab/', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('.workbook-card__state').filter({ hasText: '추후 개발 예정' }).count(), 6);
    assert.equal(await page.locator('#available .workbook-planned').first().getByRole('link', { name: '워크북 시작하기', exact: true }).getAttribute('href'), '/lab/wifi-rssi/'); checks += 2;
    await context.close();
    console.log(`PASS layout/init/demo/catalog ${width} ${theme}`);
  }
  const context = await browser.newContext({ viewport: { width: 375, height: 1000 } });
  await context.addInitScript(sentinel => { if (!localStorage.getItem('esp32div.nfc.v1')) localStorage.setItem('esp32div.nfc.v1', sentinel); }, nfcSentinel);
  const page = await context.newPage(); attach(page); await ready(page);
  const add = page.getByRole('button', { name: /^기록 추가/ });
  await add.click(); assert.ok((await page.locator('#record .status--error').textContent()).includes('거리는')); checks++;
  await page.getByLabel('공유기와 거리(m)', { exact: true }).fill('2');
  await page.getByLabel('관찰 날짜와 시간', { exact: true }).fill('2026-11-04T18:00');
  await page.getByLabel('RSSI(dBm)', { exact: true }).fill('1'); await add.click(); assert.equal(await countRows(page), 0); checks++;
  await page.getByLabel('탐구 질문', { exact: true }).fill('내 방의 신호는 왜 약할까?');
  await page.getByLabel('궁금해진 장면', { exact: true }).fill('영상 통화가 끊겼다.');
  await page.getByLabel('결론', { exact: true }).fill('세 번의 값만으로 원인을 단정할 수 없다.');
  await page.getByLabel('추가 실험', { exact: true }).fill('문 상태만 바꾸어 비교한다.');
  for (const value of ['-40', '-70', '-55']) { await page.getByLabel('RSSI(dBm)', { exact: true }).fill(value); await add.click(); }
  assert.equal(await countRows(page), 3); assert.equal(await page.getByLabel('관찰 날짜와 시간').inputValue(), '2026-11-04T18:00'); checks += 2;
  assert.ok((await page.locator('#chart tbody').textContent()).includes('-55dBm')); checks++;
  await add.click(); assert.equal(await countRows(page), 4); checks++;
  await page.getByLabel('관찰 상태', { exact: true }).selectOption('not-observed');
  assert.equal(await page.getByLabel('RSSI(dBm)', { exact: true }).inputValue(), ''); assert.ok(await page.getByLabel('RSSI(dBm)', { exact: true }).isDisabled()); checks += 2;
  await add.click();
  await page.getByLabel('방·위치', { exact: true }).fill('미측정 방');
  await page.getByLabel('관찰 상태', { exact: true }).selectOption('unchecked'); await add.click();
  assert.equal(await countRows(page), 6); assert.ok((await page.locator('#chart tbody').textContent()).includes('값 없음')); checks += 2;
  await page.getByRole('button', { name: '화면 확인용 데모 자료 불러오기', exact: true }).click();
  assert.equal(await countRows(page), 9); await page.getByText('내 실제 기록', { exact: true }).click(); assert.equal(await countRows(page), 6); checks += 2;
  await page.getByRole('button', { name: '수정', exact: true }).first().click();
  await page.getByLabel('관찰 메모', { exact: true }).fill('=방 메모, "따옴표"'); await page.getByRole('button', { name: '수정 저장', exact: true }).click();
  const csv = await downloaded(page, '전체 관찰 CSV 내려받기'); assert.ok(csv.text.startsWith('\uFEFF') && csv.text.includes("'=방 메모")); checks++;
  await page.getByLabel('CSV 가져오기', { exact: true }).setInputFiles({ name: csv.name, mimeType: 'text/csv', buffer: Buffer.from(csv.text) });
  await page.getByRole('button', { name: '기존 기록에 더하기', exact: true }).click(); assert.equal(await countRows(page), 6); checks++;
  const notesCsv = await downloaded(page, '탐구 서술 CSV 내려받기'); assert.ok(notesCsv.text.includes('conclusion') && notesCsv.text.includes('followup')); checks++;
  await page.getByLabel('결론', { exact: true }).fill('잠깐 바꾼 값');
  await page.getByLabel('CSV 가져오기', { exact: true }).setInputFiles({ name: notesCsv.name, mimeType: 'text/csv', buffer: Buffer.from(notesCsv.text) });
  await page.getByRole('button', { name: '서술 가져오기', exact: true }).click(); assert.equal(await page.getByLabel('결론', { exact: true }).inputValue(), '세 번의 값만으로 원인을 단정할 수 없다.'); checks++;
  await page.getByLabel('CSV 가져오기', { exact: true }).setInputFiles({ name: 'wrong.csv', mimeType: 'text/csv', buffer: Buffer.from('trial,condition,success\n1,x,1') });
  await page.getByText('가져올 수 없습니다.', { exact: true }).waitFor();
  assert.ok((await page.locator('#data').textContent()).includes('가져올 수 없습니다')); await page.getByRole('button', { name: '취소', exact: true }).click(); checks++;
  const md = await downloaded(page, 'Markdown 내려받기'); assert.ok(md.text.includes('실제 기록 6건') && md.text.includes('문 상태만 바꾸어 비교한다.')); checks++;
  await page.reload({ waitUntil: 'networkidle' }); assert.equal(await countRows(page), 6); assert.equal(await page.getByLabel('탐구 질문', { exact: true }).inputValue(), '내 방의 신호는 왜 약할까?'); checks += 2;
  await page.getByRole('button', { name: '지우기', exact: true }).first().click(); assert.equal(await countRows(page), 5);
  await page.getByRole('button', { name: '삭제 되돌리기', exact: true }).click(); assert.equal(await countRows(page), 6); checks += 2;
  assert.equal(await page.evaluate(() => localStorage.getItem('esp32div.nfc.v1')), nfcSentinel); checks++;
  await layout(page); await context.close();
  for (const denied of [false, true]) {
    const recovery = await browser.newContext({ viewport: { width: 375, height: 1000 } });
    await recovery.addInitScript(({ key, denied }) => { const set = Storage.prototype.setItem; set.call(localStorage, key, '{broken'); if (denied) Storage.prototype.setItem = function(k, v) { if (k.startsWith(key)) throw new DOMException('denied'); return set.call(this, k, v); }; }, { key: WIFI_STORAGE_KEY, denied });
    const p = await recovery.newPage(); attach(p); await p.goto(origin + '/lab/wifi-rssi/', { waitUntil: 'networkidle' });
    assert.ok((await p.locator('.save-state--error').textContent()).includes(denied ? '새 저장을 막았습니다' : '별도 키에 보관')); checks++;
    await p.getByLabel('탐구 질문', { exact: true }).fill('원본 보호 검사');
    assert.ok(await p.evaluate(({ key, denied }) => denied ? localStorage.getItem(key) === '{broken' : Object.keys(localStorage).some(k => k.startsWith(key + '.broken.') && localStorage.getItem(k) === '{broken'), { key: WIFI_STORAGE_KEY, denied })); checks++;
    await recovery.close();
  }
  for (const theme of ['light', 'dark']) for (const width of [375, 768, 1280]) {
    const c = await browser.newContext({ javaScriptEnabled: false, colorScheme: theme, viewport: { width, height: 1000 } });
    const p = await c.newPage(); attach(p); await p.goto(origin + '/lab/wifi-rssi/', { waitUntil: 'networkidle' });
    assert.ok(await p.locator('#design').isVisible()); assert.ok(await p.locator('#h-paper').isVisible()); assert.equal(await p.locator('.wifi-app').isVisible(), false); await layout(p); checks += 3;
    await c.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS browser ${checks} checks: layout/themes/no-JS, input/demo/null/CSV/notes/report/reload/edit/delete/undo/recovery/NFC isolation; console 0. ${shots}`);
} finally { await browser.close(); }
