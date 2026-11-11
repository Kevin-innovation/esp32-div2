// 상세 워크북 검사: 본문 누락, 골든 데이터 유효성, CSV 왕복, 보고서 반영, Colab 코드 실행 결과와 브라우저 계산의 일치.
// 실행: PYTHON=<pandas·matplotlib가 있는 python> node scripts/check-workbooks.ts [--write]
// --write는 sample 실행 출력을 src/lib/workbooks/colab-output.json에 저장한다(페이지의 예상 출력).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildFieldReport, emptyNotes, NOTE_KEYS, readRowsCsv, rowsCsv, summaryRows, validateRow } from '../src/lib/fieldwork.ts';
import { csvColab, fieldworkColab, wifiColab } from '../src/lib/colab.ts';
import { buildWifiReport, importWifiCsv, validateWifiObservation, wifiObservationsToCsv, wifiSummaryRows } from '../src/lib/workbook.ts';
import { buildCsvReport, csvSummary, pseudonymize, readSource } from '../src/lib/pseudonym.ts';
import * as wifi from '../src/lib/workbooks/wifi-rssi.ts';
import * as csvBook from '../src/lib/workbooks/csv.ts';
import { FIELD_WORKBOOKS } from '../src/lib/workbooks/index.ts';
import * as nfcBook from '../src/lib/workbooks/nfc.ts';
import { buildReport, importCsv, NOTE_KEYS as NFC_KEYS, nfcSummaryRows, reportToMarkdown, trialsToCsv, validateTrial } from '../src/lib/nfc.ts';
import { nfcColab } from '../src/lib/colab.ts';
import type { GuideBody, NoteText } from '../src/lib/workbooks/types.ts';

const PY = process.env.PYTHON ?? 'python3';
const WRITE = process.argv.includes('--write');
const OUT = 'src/lib/workbooks/colab-output.json';
const outputs: Record<string, string> = JSON.parse(readFileSync(OUT, 'utf8'));
const dir = mkdtempSync(path.join(tmpdir(), 'workbooks-'));

function walk(v: unknown, where: string) {
  if (typeof v === 'string') assert.ok(v.trim(), `빈 글: ${where}`);
  else if (Array.isArray(v)) { assert.ok(v.length, `빈 목록: ${where}`); v.forEach((x, i) => walk(x, `${where}[${i}]`)); }
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${where}.${k}`);
}
function checkGuide(g: GuideBody, notes: Record<string, NoteText> = (g as { notes?: Record<string, NoteText> }).notes!, keys: readonly string[] = NOTE_KEYS) {
  walk(g, g.id); walk(notes, `${g.id}.notes`);
  for (const [k, n] of Object.entries(notes)) assert.ok(n.example.trim() && n.why.trim(), `${g.id} ${k} 작성 예시`);
  assert.equal(Object.keys(notes).sort().join(), [...keys].sort().join(), `${g.id} 서술 항목`);
  assert.equal(Object.keys(g.checks).length, 13, `${g.id} 장별 확인 질문`);
  assert.ok(g.industry.projects.length >= 2 && g.threats.rows.length >= 3 && g.trouble.length >= 5 && g.terms.length >= 6 && g.refs.length >= 4, `${g.id} 분량`);
  for (const t of JSON.stringify([g, notes]).match(/·/g) ?? []) assert.fail(`${g.id} 가운뎃점 사용: ${t}`);
}
function run(code: string, name: string, cwd = dir) {
  const file = path.join(cwd, `wb_${name}.py`);
  writeFileSync(file, code);
  return execFileSync(PY, [file], { cwd, env: { ...process.env, MPLBACKEND: 'Agg', PYTHONWARNINGS: 'ignore' }, encoding: 'utf8' });
}
const jsonOf = (out: string) => JSON.parse(out.split('\n').find((l) => l.startsWith('검증용 JSON:'))!.slice('검증용 JSON:'.length));

for (const w of FIELD_WORKBOOKS) {
  checkGuide(w.guide);
  for (const r of w.golden) assert.equal(validateRow(w.kind, r), null, `${w.kind} 골든 ${r.id}: ${validateRow(w.kind, r)}`);
  const want = Object.fromEntries(summaryRows(w.kind, w.golden));

  // CSV 왕복과 보고서: 서술 아홉 칸을 서로 다른 값으로 채워 모두 보고서에 들어가는지
  const notes = { real: emptyNotes(), demo: emptyNotes() };
  NOTE_KEYS.forEach((k, i) => { notes.demo[k] = `서술-${k}-${i}`; });
  notes.demo.limits = '';
  const back = readRowsCsv(w.kind, rowsCsv(w.kind, w.golden, notes));
  assert.equal(back.errors.length, 0); assert.equal(back.rows.length, w.golden.length);
  const report = buildFieldReport(w.kind, w.guide.title, w.golden, notes.demo, 'demo', '2026-01-01');
  for (const k of NOTE_KEYS) if (k !== 'limits') assert.ok(report.includes(`서술-${k}-`), `${w.kind} 보고서에 ${k} 누락`);
  assert.ok(report.includes('(미작성)') && report.includes('가상 데모 자료'), `${w.kind} 미작성·데모 표시`);
  for (const [k, v] of summaryRows(w.kind, w.golden)) assert.ok(report.includes(`- ${k}: ${v}`), `${w.kind} 보고서 계산 ${k}`);

  // Colab: sample(데모)과 file(실제 CSV) 두 경로가 모두 브라우저 계산과 같아야 한다
  const code = fieldworkColab(w.kind, w.golden);
  const sample = run(code, w.kind);
  assert.deepEqual(jsonOf(sample), want, `${w.kind} sample 결과`);
  assert.ok(sample.includes('BAD-1') && sample.includes('잘못된 행 1'), `${w.kind} 잘못된 행 처리`);
  const real = w.golden.map((r) => ({ ...r, id: `R${r.id}`, data_type: 'real' }));
  writeFileSync(path.join(dir, `${w.kind}-observations.csv`), rowsCsv(w.kind, [...real, ...w.golden], { real: { question: '=실제 질문' }, demo: {} }));
  const fileRun = run(code.replace("SOURCE = 'sample'", "SOURCE = 'file'"), `${w.kind}-file`);
  assert.deepEqual(jsonOf(fileRun), want, `${w.kind} 실제 CSV 결과`);
  assert.ok(fileRun.includes(`real 관찰 ${real.length}행, 다른 구분 ${w.golden.length}행 제외`), `${w.kind} 실제/데모 분리`);

  const shown = sample.replace(/\s+$/, '');
  if (WRITE) outputs[w.kind] = shown;
  else assert.equal(outputs[w.kind], shown, `${w.kind} 페이지의 예상 출력이 실행 결과와 다릅니다. --write로 갱신하세요.`);
  console.log(`PASS ${w.kind}: 본문, 골든 ${w.golden.length}행, CSV 왕복, 보고서, Colab sample·file`);
}
const keep = (key: string, out: string) => {
  const shown = out.replace(/\s+$/, '');
  if (WRITE) outputs[key] = shown;
  else assert.equal(outputs[key], shown, `${key} 페이지의 예상 출력이 실행 결과와 다릅니다. --write로 갱신하세요.`);
};
const distinctNotes = () => Object.fromEntries(NOTE_KEYS.map((k, i) => [k, `서술-${k}-${i}`]));

{ // Wi-Fi RSSI
  checkGuide(wifi.guide);
  for (const r of wifi.golden) {
    const back = validateWifiObservation({ trial: String(r.trial), room: r.room, condition: r.condition, distance_m: String(r.distanceM), observation_status: r.status, rssi_dbm: r.rssiDbm === null ? '' : String(r.rssiDbm), channel: r.channel === null ? '' : String(r.channel), observed_at: r.observedAt, ssid_alias: r.ssidAlias, bssid_alias: r.bssidAlias, note: r.note, data_type: r.dataType, observation_id: r.id });
    assert.deepEqual(back, r, `wifi 골든 ${r.id}`);
  }
  const csv = wifiObservationsToCsv(wifi.golden), back = importWifiCsv(csv);
  assert.equal(back.kind, 'observations'); assert.equal(back.errors.length, 0);
  const want = Object.fromEntries(wifiSummaryRows(wifi.golden));
  const notes = { ...distinctNotes(), limits: '' };
  const report = buildWifiReport(wifi.golden, notes, 'demo', '2026-01-01');
  for (const k of NOTE_KEYS) if (k !== 'limits') assert.ok(report.includes(`서술-${k}-`), `wifi 보고서에 ${k} 누락`);
  assert.ok(report.includes('(미작성)') && report.includes('데모 자료의 가상 값'));
  for (const [k, v] of wifiSummaryRows(wifi.golden)) assert.ok(report.includes(`- ${k}: ${v}`), `wifi 보고서 계산 ${k}`);
  const code = wifiColab(wifi.golden), sample = run(code, 'wifi');
  assert.deepEqual(jsonOf(sample), want, 'wifi sample 결과');
  assert.ok(sample.includes('BAD-1') && sample.includes('잘못된 행 1'));
  const real = wifi.golden.map((r) => ({ ...r, id: `R${r.id}`, dataType: 'real' as const }));
  writeFileSync(path.join(dir, 'wifi-rssi-observations.csv'), wifiObservationsToCsv([...real, ...wifi.golden]));
  const fileRun = run(code.replace("SOURCE = 'sample'", "SOURCE = 'file'"), 'wifi-file');
  assert.deepEqual(jsonOf(fileRun), want, 'wifi 실제 CSV 결과');
  assert.ok(fileRun.includes(`real 관찰 ${real.length}행, 다른 구분 ${wifi.golden.length}행 제외`));
  keep('wifi-rssi', sample);
  console.log(`PASS wifi-rssi: 본문, 골든 ${wifi.golden.length}행, CSV 왕복, 보고서, Colab sample, file`);
}

{ // CSV 가명처리
  checkGuide(csvBook.guide);
  const source = readSource(csvBook.golden.original);
  assert.equal(source.errors.length, 0);
  const pseudo = pseudonymize(source, csvBook.golden.actions);
  const want = Object.fromEntries(csvSummary(source, pseudo));
  assert.ok(!pseudo.header.includes('note') && pseudo.rows.length === source.rows.length, 'csv 제거와 행 수');
  const labels = Object.fromEntries(NOTE_KEYS.map((k) => [k, csvBook.guide.notes[k].label]));
  const notes = { ...distinctNotes(), limits: '' };
  const report = buildCsvReport(csvBook.guide.title, source, csvBook.golden.actions, notes, labels, 'demo', true, '2026-01-01');
  for (const k of NOTE_KEYS) if (k !== 'limits') assert.ok(report.includes(`서술-${k}-`), `csv 보고서에 ${k} 누락`);
  assert.ok(report.includes('(미작성)') && report.includes('가상 데모 자료') && report.includes('재식별 단서 직접 점검: 완료'));
  for (const [k, v] of csvSummary(source, pseudo)) assert.ok(report.includes(`- ${k}: ${v}`), `csv 보고서 계산 ${k}`);
  const code = csvColab(csvBook.golden.original, pseudo.csv), sample = run(code, 'csv');
  assert.deepEqual(jsonOf(sample), want, 'csv sample 결과');
  writeFileSync(path.join(dir, 'csv-real-original.csv'), csvBook.golden.original);
  writeFileSync(path.join(dir, 'csv-real-pseudonymized.csv'), pseudo.csv);
  assert.deepEqual(jsonOf(run(code.replace("SOURCE = 'sample'", "SOURCE = 'file'"), 'csv-file')), want, 'csv 실제 파일 결과');
  keep('csv', sample);
  console.log('PASS csv: 본문, 골든 원본, 가명본 대조, 보고서, Colab sample, file');
}
{ // 01 NFC 기본 실습: 서술 항목은 기존 NOTE_KEYS(저장, CSV 호환) 그대로
  const { guide, notes, golden } = nfcBook;
  checkGuide(guide, Object.fromEntries(Object.entries(notes).map(([k, n]) => [k, { ...n, help: n.help || '면접 질문은 화면에서 채움' }])), NFC_KEYS);
  for (const t of golden) assert.notEqual(typeof validateTrial({ trial: String(t.trial), condition: t.condition, contents: t.contents, distance_cm: String(t.distanceCm), orientation: t.orientation, success: String(t.success), note: t.note }, 'demo'), 'string', 'nfc 골든');
  const back = importCsv(trialsToCsv(golden), NFC_KEYS);
  assert.ok(back.kind === 'trials' && back.errors.length === 0 && back.trials.length === golden.length, 'nfc CSV 왕복');
  const want = Object.fromEntries(nfcSummaryRows(golden));
  const filled = Object.fromEntries(NFC_KEYS.map((k, i) => [k, `서술 ${i}번 칸`]));
  const report = reportToMarkdown(buildReport({ trials: golden, notes: { ...filled, limits: '' }, dataType: 'demo', date: '2026-01-01', sources: [] }));
  NFC_KEYS.forEach((k, i) => { if (k !== 'limits') assert.ok(report.includes(`서술 ${i}번 칸`), `nfc 보고서에 ${k} 누락`); });
  assert.ok(report.includes('(미작성)') && report.includes('데모 자료'), 'nfc 미작성, 데모 표시');
  for (const [k, v] of nfcSummaryRows(golden)) assert.ok(report.includes(`- ${k}: ${v}`), `nfc 보고서 계산 ${k}`);
  const code = nfcColab(golden), sample = run(code, 'nfc');
  assert.deepEqual(jsonOf(sample), want, 'nfc sample 결과');
  assert.ok(sample.includes('BAD-1') && sample.includes('잘못된 행 1'));
  const real = golden.map((t) => ({ ...t, dataType: 'real' as const }));
  writeFileSync(path.join(dir, 'nfc-experiment.csv'), trialsToCsv([...real, ...golden]));
  const fileRun = run(code.replace("SOURCE = 'sample'", "SOURCE = 'file'"), 'nfc-file');
  assert.deepEqual(jsonOf(fileRun), want, 'nfc 실제 CSV 결과');
  assert.ok(fileRun.includes(`real 관찰 ${real.length}행, 다른 구분 ${golden.length}행 제외`));
  keep('nfc', sample);
  console.log(`PASS nfc: 본문, 서술 ${NFC_KEYS.length}칸 예시, 골든 ${golden.length}행, CSV 왕복, 보고서, Colab sample, file`);
}
if (WRITE) writeFileSync(OUT, JSON.stringify(outputs, null, 2) + '\n');
