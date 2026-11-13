// 14장 면접 준비 검사(headless test-chromium만). 미리보기 서버가 떠 있어야 한다.
// 정적: 13개 실습의 질문 데이터(6주제), 서술 CSV 왕복, 빌드된 페이지의 14장 목차와 #ch-14, #interview, 질문 문구.
// 브라우저: NFC, Wi-Fi(공통 서술), GPS(현장 기록), CSV(가명처리) 저장소마다 이전 답 이어 읽기, 입력과 새로고침,
// 예시 덮기 취소와 승인, 후속 질문 분기(기록 유무, 근거 점검), 1분 설명 단추, 면접 Markdown과 보고서 일치, 실제·데모 분리.
// 그리고 375/1280 light/dark 화면, 가로 넘침, console, JS 끔.
// 실행: node scripts/check-interview.mjs [origin] [스크린샷 폴더]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const { INTERVIEW } = await import(`${root}/src/lib/workbooks/interview.ts`);
const { IV_KEYS, IV_TOPIC_IDS } = await import(`${root}/src/lib/interview.ts`);
const nfc = await import(`${root}/src/lib/nfc.ts`);
const wifi = await import(`${root}/src/lib/workbook.ts`);
const field = await import(`${root}/src/lib/fieldwork.ts`);
const origin = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://127.0.0.1:4329';
const shots = process.argv.find((a, i) => i > 1 && !a.startsWith('http'));
if (shots) mkdirSync(shots, { recursive: true });
let checks = 0;
const ok = (cond, msg) => { checks++; assert.ok(cond, msg); };

// 정적 1: 질문 데이터
const IDS = ['nfc', 'wifi-rssi', 'ssid-map', 'wpa-pmf', 'channel', 'ble-ad', 'ble-pair', 'interference', 'ir', 'subghz', 'gps', 'firmware', 'csv'];
ok(Object.keys(INTERVIEW).sort().join() === [...IDS].sort().join(), '13개 실습 질문 목록');
for (const id of IDS) {
  const qs = INTERVIEW[id];
  ok(qs.length >= 6 && IV_TOPIC_IDS.every((t) => qs.some((q) => q.topic === t)), `${id} 6주제`);
  for (const q of qs) ok([q.q, q.dir, q.ex, q.real, q.plan].every((v) => typeof v === 'string' && v.trim()) && q.ex.startsWith('가상 예') && !JSON.stringify(q).includes('·'), `${id} ${q.topic} 문구`);
}
const nfcQ = INTERVIEW.nfc;
ok(nfcQ.find((q) => q.topic === 'motive').key === 'q_curiosity' && nfcQ.find((q) => q.topic === 'result').legacyFollow[0] === 'q_verify', 'NFC 이전 면접 키');

// 정적 2: 서술 CSV 왕복(새 칸 포함)과 이전 형식 복원
const iv = Object.fromEntries(IV_KEYS.map((k, i) => [k, `면접-${i}, "따옴표"\n줄`]));
const nBack = nfc.importCsv(nfc.notesToCsv({ question: '질문', q_curiosity: '이전 답', ...iv }), nfc.NOTE_KEYS_ALL);
ok(nBack.kind === 'notes' && !nBack.errors.length && IV_KEYS.every((k) => nBack.notes[k] === iv[k]) && nBack.notes.q_curiosity === '이전 답', 'NFC 서술 CSV 왕복');
const wBack = wifi.importWifiCsv(wifi.wifiNotesToCsv({ question: '질문', ...iv }));
ok(wBack.kind === 'notes' && !wBack.errors.length && IV_KEYS.every((k) => wBack.notes[k] === iv[k]), 'Wi-Fi 서술 CSV 왕복');
ok(IV_KEYS.every((k) => wifi.restoreWifiState(JSON.stringify({ observations: [], notes: iv })).notes[k] === iv[k]), 'Wi-Fi 저장 복원');
const fBack = field.readRowsCsv('gps', field.rowsCsv('gps', [], { real: { ...field.emptyNotes(), ...iv }, demo: { ...field.emptyNotes(), iv_memo: '데모 메모' } }));
ok(!fBack.errors.length && IV_KEYS.every((k) => fBack.notes.real[k] === iv[k]) && fBack.notes.demo.iv_memo === '데모 메모', '현장 기록 서술 CSV 왕복과 구분');
ok(field.buildFieldReport('gps', 'GPS', [], { ...field.emptyNotes(), iv_motive: '보고서 동기 답' }, 'real', '2026-01-01').includes('보고서 동기 답'), '현장 기록 보고서에 면접 답');

// 정적 3: 빌드된 13개 페이지
for (const id of IDS) {
  const html = readFileSync(`${root}/dist/lab/${id}/index.html`, 'utf8');
  const toc = html.match(/<nav class="wb-toc"[^>]*>([\s\S]*?)<\/nav>/)[1];
  ok((toc.match(/href="#ch-\d+"/g) ?? []).length === 14 && toc.includes('href="#ch-14"'), `${id} 목차 14장`);
  ok(html.includes('id="ch-14"') && (html.match(/id="interview"/g) ?? []).length === 1 && html.includes('href="#ch-14"'), `${id} #ch-14, #interview 하나`);
  for (const q of INTERVIEW[id]) ok(html.includes(q.q.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')) || html.includes(q.q), `${id} 질문 서버 렌더 ${q.topic}`);
  ok(!html.includes('slot="explain"'), `${id} 13장 1분 설명 이동`);
}
console.log(`정적 PASS ${checks}건`);

// 브라우저
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const browser = await chromium.launch({ headless: true, executablePath: path.join(homedir(), '.agents/bin/test-chromium') });
const STORES = [
  { id: 'nfc', key: 'esp32div.nfc.v1', shared: true, report: 'article.report',
    seed: { trials: [], notes: { question: '지갑 질문', q_curiosity: '이전 버전 동기 답', q_verify: '이전 버전 검증 답' } },
    addReal: (s) => ({ ...s, trials: [{ id: 'r1', dataType: 'real', trial: 1, condition: '단독', contents: '없음', distanceCm: 1, orientation: '평행', success: 0, note: '' }] }) },
  { id: 'wifi-rssi', key: 'esp32div.lab.wifi-rssi.v1', shared: true, report: 'pre.report-preview',
    seed: { observations: [], notes: { question: '방 질문' }, view: 'real' },
    addReal: (s) => ({ ...s, observations: [{ id: 'r1', dataType: 'real', trial: 1, room: '거실', condition: '문 열림', distanceM: 2, status: 'observed', rssiDbm: -50, channel: 6, observedAt: '2026-11-01T10:00', ssidAlias: 'AP-A', bssidAlias: 'B-A', note: '' }] }) },
  { id: 'gps', key: 'esp32div.lab.gps.v1', shared: false, report: 'pre.report-preview',
    seed: { schemaVersion: 1, workbookId: 'gps', rows: [], notes: { real: { question: '이전 버전 GPS 질문' }, demo: {} }, mode: 'real' },
    addReal: (s) => ({ ...s, rows: [{ id: 'r1', data_type: 'real', alias: 'GPS-A', condition: '야외', observed_at: '2026-11-01T10:00', observation_status: 'observed', satellites: '8', fix: 'fixed', wait_seconds: '40', timed_out: 'no', crosscheck: '지도와 같은 건물', note: '' }] }) },
  { id: 'csv', key: 'esp32div.lab.csv.v1', shared: false, report: 'pre.report-preview',
    seed: { schemaVersion: 1, workbookId: 'csv', mode: 'real', work: { real: { original: '', actions: [], notes: { rationale: '이전 버전 처리 이유' }, checked: false }, demo: { original: '', actions: [], notes: {}, checked: false } } },
    addReal: (s) => ({ ...s, work: { ...s.work, real: { ...s.work.real, original: 'uid,result\nA1,1\nA2,0\n', actions: ['alias', 'keep'] } } }) },
];

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
for (const st of STORES) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const url = `${origin}/lab/${st.id}/`;
  const qs = INTERVIEW[st.id];
  await page.goto(`${origin}/lab/`);
  await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(v)); }, [st.key, st.seed]);
  // 같은 주소에서 #만 바꾸면 다시 읽지 않으므로 두 번째부터는 새로고침한다.
  const load = async () => {
    if (page.url().startsWith(url)) await page.reload({ waitUntil: 'networkidle' }); else await page.goto(`${url}#ch-14`, { waitUntil: 'networkidle' });
    await page.locator('#ch-14 .iv-q textarea').first().waitFor(); await page.waitForTimeout(150);
  };
  await load();
  const item = (i) => page.locator('#ch-14 .iv-q').nth(i);
  const answer = (i) => item(i).locator('textarea').first();
  const status = () => page.locator('#ch-14 .iv > p').first().innerText();

  // 이전 버전 자료 이어 읽기, 저장 위치 표시
  if (st.id === 'nfc') {
    ok(await answer(0).inputValue() === '이전 버전 동기 답', 'NFC 이전 동기 답이 14장에 보임');
    ok((await item(3).locator('.iv-follow').innerText()).includes('이전 버전 검증 답') || await item(3).locator('.iv-follow textarea').inputValue() === '이전 버전 검증 답', 'NFC 이전 검증 답이 후속 답으로 보임');
  }
  if (st.id === 'gps') ok((await page.locator('#ch-14 .iv-summary').innerText()).includes('이전 버전 GPS 질문'), 'GPS 이전 서술이 요약에 보임');
  if (st.id === 'csv') ok((await page.locator('#ch-14 .iv-summary').innerText()).includes('이전 버전 처리 이유'), 'CSV 이전 버전 서술이 요약에 보임');
  ok((await status()).includes(st.shared ? '실제와 데모 공통' : '따로 저장'), `${st.id} 저장 위치 표시`);

  // 입력, 후속 질문(기록 없음), 예시 취소와 승인, 새로고침
  const mine = `${st.id} 내 동기 답 3회`;
  await answer(0).fill(mine);
  ok((await item(0).locator('.iv-follow__ask').innerText()).includes(qs[0].plan), `${st.id} 기록 없을 때 후속 질문`);
  await answer(1).fill('내가 쓴 원리 답');
  await item(1).locator('summary').click();
  page.once('dialog', (d) => d.dismiss());
  await item(1).getByRole('button', { name: '이 예시를 입력란에 넣기' }).click();
  ok(await answer(1).inputValue() === '내가 쓴 원리 답', `${st.id} 예시 덮기 취소`);
  page.once('dialog', (d) => d.accept());
  await item(1).getByRole('button', { name: '이 예시를 입력란에 넣기' }).click();
  ok(await answer(1).inputValue() === qs[1].ex, `${st.id} 예시 덮기 승인`);
  await load();
  ok(await answer(0).inputValue() === mine && await answer(1).inputValue() === qs[1].ex, `${st.id} 새로고침 뒤 유지`);

  // 실제 기록이 생기면 후속 질문이 바뀌고, 근거 점검 표시에 따라 덧붙는 질문도 바뀐다
  await page.evaluate(([k, f]) => { localStorage.setItem(k, JSON.stringify((0, eval)(f)(JSON.parse(localStorage.getItem(k))))); }, [st.key, st.addReal.toString()]);
  await load();
  const ask = () => item(0).locator('.iv-follow__ask').innerText();
  ok((await ask()).includes(qs[0].real) && (await ask()).includes('수치나 횟수'), `${st.id} 실제 기록 있을 때 후속 질문`);
  await item(0).locator('.iv-check input').nth(0).check();
  ok((await ask()).includes('직접 본 것과 추정한 것'), `${st.id} 근거 점검에 따라 후속 질문 변화`);
  ok(!(await item(0).innerText()).includes('숫자가 보이지'), `${st.id} 숫자 있는 답에 수치 경고 없음`);
  await answer(2).fill('수치 없는 설계 답');
  await item(2).locator('.iv-check input').nth(0).check();
  ok((await item(2).locator('.iv-warn').innerText()).includes('숫자가 보이지'), `${st.id} 수치 표시 경고`);
  const askedNow = await ask();
  await item(0).locator('.iv-follow textarea').fill(`${st.id} 후속 답`);
  await item(0).locator('.iv-check input').nth(1).check();
  await load();
  ok(await item(0).locator('.iv-follow textarea').inputValue() === `${st.id} 후속 답` && (await ask()) === askedNow && (await item(0).locator('.iv-follow label').innerText()).includes('답할 때 받은 질문'), `${st.id} 후속 답과 그때 질문 유지`);

  // 1분 설명: 단추로만 넣고, 기존 글은 확인 뒤에만 바꾼다
  const pitch = page.locator('#ch-14 .iv-block').nth(2);
  const parts = pitch.locator('textarea');
  for (let i = 0; i < 5; i++) await parts.nth(i).fill(`칸${i + 1}`);
  const explainBox = parts.nth(5);
  ok(await explainBox.inputValue() === '' || st.id === 'nfc', `${st.id} 다섯 칸 입력만으로 완성 문단을 덮지 않음`);
  await explainBox.fill('내가 직접 쓴 1분 설명');
  page.once('dialog', (d) => d.dismiss());
  await pitch.getByRole('button', { name: '다섯 칸을 이어 완성 문단 칸에 넣기' }).click();
  ok(await explainBox.inputValue() === '내가 직접 쓴 1분 설명', `${st.id} 1분 설명 덮기 취소`);
  page.once('dialog', (d) => d.accept());
  await pitch.getByRole('button', { name: '다섯 칸을 이어 완성 문단 칸에 넣기' }).click();
  ok(await explainBox.inputValue() === '칸1 칸2 칸3 칸4 칸5', `${st.id} 1분 설명 덮기 승인`);

  // 면접 Markdown과 13장 보고서에 같은 답
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '면접 준비 Markdown 내려받기' }).click()]);
  const md = readFileSync(await dl.path(), 'utf8');
  for (const want of [mine, `${st.id} 후속 답`, askedNow, '칸1 칸2 칸3 칸4 칸5', '내 탐구 요약', st.shared ? '실제와 데모 공통' : '따로 저장']) ok(md.includes(want), `${st.id} 면접 Markdown: ${want.slice(0, 20)}`);
  const report = await page.locator(st.report).innerText();
  ok(report.includes(mine) && report.includes(`${st.id} 후속 답`) && report.includes('면접 준비(14장)'), `${st.id} 보고서에 면접 답`);

  // 실제와 데모: 공통 서술은 같은 답, 구분 서술은 따로
  if (st.shared) {
    await page.getByRole('button', { name: /가상 골든 데이터/ }).click();
    await page.waitForTimeout(100);
    // 공통 서술: 데모를 보고 있어도 답은 같고, 요약의 계산값은 실제 기록 1건에서만 나온다.
    const summary = await page.locator('#ch-14 .iv-block').first().innerText();
    ok((await status()).includes('가상 데모') && (await status()).includes('실제 기록: 1건') && await answer(0).inputValue() === mine && summary.includes('실제 기록의 계산값'), `${st.id} 데모 보기: 공통 서술 유지, 계산값은 실제 기록만`);
  } else {
    await page.locator('label', { hasText: '가상 데모' }).first().click();
    await page.waitForTimeout(100);
    ok((await status()).includes('가상 데모') && await answer(0).inputValue() === '', `${st.id} 데모 서술은 실제 답과 분리`);
    await answer(0).fill('데모 연습 답');
    await page.locator('label', { hasText: st.id === 'csv' ? '직접 준비한 자료' : '내 실제 기록' }).first().click();
    await page.waitForTimeout(100);
    ok(await answer(0).inputValue() === mine, `${st.id} 실제로 돌아오면 실제 답`);
  }
  ok(errors.length === 0, `${st.id} console: ${errors.join(' | ')}`);
  console.log(`PASS ${st.id}`);
  await page.close();
}
await ctx.close();

// 목차 이동과 scrollspy, 화면(375/1280 × light/dark), 넘침, console
for (const scheme of ['light', 'dark']) for (const width of [375, 1280]) {
  const c = await browser.newContext({ viewport: { width, height: 860 }, colorScheme: scheme });
  const page = await c.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  for (const id of ['nfc', 'gps']) {
    await page.goto(`${origin}/lab/${id}/#interview`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(200);
    const top = await page.locator('#interview').evaluate((e) => e.getBoundingClientRect().top);
    ok(top >= 0 && top < 400, `${id} ${width} #interview 진입 위치 ${top}`);
    ok(await page.locator('[data-toc] a[aria-current="location"]').getAttribute('href') === '#ch-14', `${id} ${width} 지금 절 14장`);
    ok(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, `${id} ${width} ${scheme} 가로 넘침`);
    if (shots && id === 'nfc') {
      await page.locator('#ch-14 .iv-q').first().locator('summary').click();
      await page.locator('#ch-14').screenshot({ path: `${shots}/ch14-${id}-${width}-${scheme}.png` });
    }
  }
  if (width === 1280) {
    await page.goto(`${origin}/lab/gps/#ch-13`, { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: '보고서를 검토했다면 14장 면접 준비로' }).click();
    await page.waitForTimeout(300);
    ok(await page.evaluate(() => location.hash) === '#ch-14', `13장 끝 안내로 14장 이동`);
    if (shots && scheme === 'light') await page.locator('.wb-toc').screenshot({ path: `${shots}/toc-1280-${scheme}.png` });
  }
  ok(errors.length === 0, `${width} ${scheme} console: ${errors.join(' | ')}`);
  await c.close();
}

// JS 끔: 질문, 작성 방향, 후속 질문 예, 종이 안내가 읽힌다
{
  const c = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 860 } });
  const page = await c.newPage();
  for (const id of ['gps', 'csv']) {
    await page.goto(`${origin}/lab/${id}/#ch-14`);
    const text = await page.locator('#ch-14').innerText();
    ok(INTERVIEW[id].every((q) => text.includes(q.q)) && text.includes('작성 방향') && text.includes('후속 질문 예') && text.includes('종이에 쓸 때'), `JS 끔 ${id} 14장 읽힘`);
    ok(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, `JS 끔 ${id} 넘침`);
  }
  if (shots) await page.locator('#ch-14 .iv-q').first().screenshot({ path: `${shots}/ch14-jsoff-375.png` });
  await c.close();
}
await browser.close();
console.log(`PASS interview ${checks}건: 13개 실습 질문·서버 렌더·목차 14장, 서술 CSV 왕복, 4개 저장소 입력·새로고침·예시·후속 분기·1분 설명·Markdown·보고서·실제/데모, 375/1280 light/dark, JS 끔. console 0${shots ? `, 스크린샷 ${shots}` : ''}`);
