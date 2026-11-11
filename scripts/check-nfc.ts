// 실행: npm run check:nfc. CSV 왕복, 집계, 위험 입력을 한 번에 검사한다.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NFC_STEPS, SCAN_EXAMPLE, SCAN_SCENARIOS } from '../src/data/learn.ts';
import { NOTE_KEYS, aggregate, crossTab, csvCell, designWarnings, demoTrials, importCsv, mergeTrials, notebookJson, notesToCsv, parseCsv, reportToMarkdown, buildReport, trialsToCsv, validateTrial, type Trial } from '../src/lib/nfc.ts';

const make = (over: Record<string, string>): Trial => {
  const t = validateTrial({ trial: '1', condition: '단독', contents: '', distance_cm: '1', orientation: '평행', success: '1', note: '', ...over });
  assert.notEqual(typeof t, 'string', String(t));
  return t as Trial;
};

const tricky = [
  make({ note: '쉼표, "따옴표"\n줄바꿈까지' }),
  make({ trial: '2', condition: '=SUM(A1:A9)', note: '@cmd', success: '0' }),
  make({ trial: '3', condition: '지갑', contents: '-카드 3장', distance_cm: '2.5', note: '<script>alert(1)</script>' }),
  make({ trial: '4', condition: "''=abc", note: "'=직접 쓴 따옴표" }),
];

// 왕복: 내보낸 CSV를 다시 읽으면 값이 그대로여야 한다.
const csv = trialsToCsv(tricky);
assert.ok(csv.startsWith('﻿'), 'Excel용 BOM');
assert.ok(!/(^|,)=SUM/m.test(csv), '수식 칸은 작은따옴표로 막는다');
const back = importCsv(csv, []);
assert.equal(back.kind, 'trials');
if (back.kind === 'trials') {
  assert.deepEqual(back.errors, []);
  const strip = (t: Trial) => ({ ...t, id: '' });
  assert.deepEqual(back.trials.map(strip), tricky.map(strip));
  assert.equal(mergeTrials(tricky, back.trials).added, 0, '같은 백업을 다시 넣어도 늘지 않는다');
}

// 파서: 겹따옴표, CRLF, 닫히지 않은 따옴표.
assert.deepEqual(parseCsv('a,"b ""c"", d"\r\n1,2\r\n').map((r) => r.cells), [['a', 'b "c", d'], ['1', '2']]);
assert.throws(() => parseCsv('a,"b\n1,2'), /닫히지 않았습니다/);
assert.equal(csvCell(-3), '-3', '숫자는 수식 방지 대상이 아니다');
assert.equal(make({ note: "''=abc" }).note, "''=abc", '폼과 저장값은 따옴표를 건드리지 않는다');

// 검증: 잘못된 행은 줄 번호와 함께 남기고 나머지는 살린다.
const mixed = importCsv('trial,condition,distance_cm,orientation,success\n1,단독,1,평행,1\nx,단독,1,평행,1\n2,지갑,-1,평행,1\n3,가방,1,평행,예\n4,가방\n', []);
assert.equal(mixed.kind, 'trials');
if (mixed.kind === 'trials') {
  assert.equal(mixed.trials.length, 1);
  assert.deepEqual(mixed.errors.map((e) => e.line), [3, 4, 5, 6]);
}
assert.equal(importCsv('a,b\n1,2\n', []).kind, 'invalid');
assert.equal(importCsv('', []).kind, 'invalid');

// 서술 CSV 왕복과 허용 목록.
const notes = importCsv(notesToCsv({ hypothesis: '=지갑은, "낮을" 것\n이다', other: 'x' }), ['hypothesis']);
assert.equal(notes.kind, 'notes');
if (notes.kind === 'notes') {
  assert.equal(notes.notes.hypothesis, '=지갑은, "낮을" 것\n이다');
  assert.equal(notes.errors.length, 1);
}

// 서술 행은 정확히 2열, 머리글 중복은 거부.
const wide = importCsv('field,value\nhypothesis,hello,world\nplan\nlimits,ok\n', ['hypothesis', 'plan', 'limits']);
assert.equal(wide.kind, 'notes');
if (wide.kind === 'notes') {
  assert.deepEqual(wide.notes, { limits: 'ok' });
  assert.deepEqual(wide.errors.map((e) => e.line), [2, 3]);
}
assert.equal(importCsv('trial,condition,distance_cm,orientation,success,success\n1,단독,1,평행,1,0\n', []).kind, 'invalid');
assert.equal(importCsv('field,field\na,b\n', []).kind, 'invalid');

// 집계: 조건 순서와 수치.
const demo = demoTrials();
const byCondition = aggregate(demo, 'condition');
assert.deepEqual(byCondition.map((g) => g.key), ['단독', '지갑', '가방']);
assert.deepEqual(byCondition.map((g) => [g.successes, g.attempts]), [[9, 10], [6, 10], [5, 10]]);
assert.deepEqual(aggregate(demo, 'distanceCm').map((g) => [g.key, g.successes]), [['1', 13], ['3', 7]]);
assert.ok(demo.every((t) => t.dataType === 'demo'));
assert.equal(designWarnings(demo).length, 0);
assert.equal(designWarnings(tricky).length, 2, '반복 부족과 조건별 구성 차이를 모두 알린다');

// 교차표: 칸이 너무 많으면 만들지 않는다.
const many = Array.from({ length: 20 }, (_, i) => make({ condition: `c${i}`, distance_cm: String(i) }));
assert.equal(crossTab(many), null);
assert.deepEqual(crossTab(demo)?.distances, [1, 3]);
assert.deepEqual(crossTab(demo)?.rows[0].cells, [{ attempts: 5, successes: 5 }, { attempts: 5, successes: 4 }]);

// 보고서: 입력값이 HTML로 해석되지 않고, 데모는 표시된다.
const md = reportToMarkdown(buildReport({ trials: tricky, notes: { hypothesis: '<img src=x onerror=alert(1)>' }, dataType: 'real', date: '2026-11-04', sources: [] }));
assert.ok(!md.includes('<script>') && !md.includes('<img'), '보고서에 생 HTML이 없어야 한다');
assert.ok(md.includes('&lt;script&gt;'));
const demoMd = reportToMarkdown(buildReport({ trials: demo, notes: {}, dataType: 'demo', date: '2026-11-04', sources: [] }));
assert.ok(demoMd.includes('데모 자료') && demoMd.includes('(미작성)'));

const securityNotes = { securityAsset: '실험용 태그의 공개 데이터', threatModel: '허가된 근거리 판독만', securityFinding: '시험 조건별 4/5회 판독', defensePlan: '민감정보를 저장하지 않고 인증 사용', residualRisk: '암호 인증은 시험하지 않음' };
const securityCsv = importCsv(notesToCsv(securityNotes), NOTE_KEYS);
assert.equal(securityCsv.kind, 'notes');
if (securityCsv.kind === 'notes') assert.deepEqual(securityCsv.notes, securityNotes, '보안 평가 서술 CSV 왕복');
const securityReport = reportToMarkdown(buildReport({ trials: tricky, notes: securityNotes, dataType: 'real', date: '2026-11-04', sources: [] }));
assert.ok(securityReport.includes('보안 평가: 관찰을 방어로 연결') && securityReport.includes(securityNotes.defensePlan));
assert.ok(securityReport.includes('실제 기록 4회 중 3회') && securityReport.includes('권한 없는 접근이나 공격 성공'));
assert.ok(demoMd.includes('데모 기록은 가상 자료이므로 보안 판단의 증거로 쓸 수 없습니다'));

const notebook = JSON.parse(notebookJson());
const notebookCode = notebook.cells.filter((cell: { cell_type: string }) => cell.cell_type === 'code')
  .map((cell: { source: string[] }) => cell.source.join('')).join('\n');
assert.equal(notebook.nbformat, 4);
assert.ok(notebookCode.includes('files.upload()') && notebookCode.includes('nfc-heatmap-condition-distance.png'));
assert.ok(notebookCode.includes('암호화') === false, '코드 셀에는 실행 가능한 코드만 둔다');
const workbook = readFileSync(new URL('../src/pages/lab/nfc.astro', import.meta.url), 'utf8');
assert.ok(workbook.includes('Europay, Mastercard, Visa') && workbook.includes('일회용 보안 코드(cryptogram)'));
assert.ok(workbook.includes('/images/nfc-colab-example.svg') && workbook.includes('가상 예시입니다'));

// 원리 그림: 두 탐색 방식은 첫 줄의 먼저 말하는 쪽이 다르고, 목록은 줄어들지 않으며 끝에 가상 예시 전체가 찬다.
const [passive, active] = SCAN_SCENARIOS;
assert.equal(passive.steps[1].from, 1, '수동 탐색은 AP가 먼저 말한다');
assert.equal(active.steps[0].from, 0, '능동 탐색은 스캔 장비가 먼저 말한다');
for (const { steps } of SCAN_SCENARIOS) {
  const listed = steps.map((step) => step.listed ?? 0);
  assert.deepEqual(listed, [...listed].sort((a, b) => a - b));
  assert.equal(listed.at(-1), SCAN_EXAMPLE.length);
}
assert.ok(NFC_STEPS.findIndex((step) => step.powered) < NFC_STEPS.findIndex((step) => step.signal), '태그는 전원을 얻은 뒤 신호가 오간다');

console.log('check:nfc 통과');
