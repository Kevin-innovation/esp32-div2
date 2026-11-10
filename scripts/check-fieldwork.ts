import assert from 'node:assert/strict';
import { emptyNotes, makeRow, readRowsCsv, rowsCsv, validateRow } from '../src/lib/fieldwork.ts';
import { defaultActions, pseudonymize, readSource } from '../src/lib/pseudonym.ts';
for (const kind of ['ble-ad', 'ir'] as const) {
  const row = makeRow({ alias: 'Test-A', condition: '위치 A', distance_m: '1', observation_status: 'observed', rssi_dbm: '', connection: 'not-checked', button: '전원', protocol: '', command_alias: '', note: '=SUM(1,2)' }, 'real');
  assert.equal(validateRow(kind, row), null);
  const notes = { real: emptyNotes(), demo: emptyNotes() }; notes.real.question = '+질문';
  const csv = rowsCsv(kind, [row], notes);
  assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes("'=SUM"));
  const imported = readRowsCsv(kind, csv);
  assert.equal(imported.errors.length, 0); assert.equal(imported.rows[0].note, row.note); assert.equal(imported.notes.real?.question, '+질문');
  assert.equal(readRowsCsv(kind, rowsCsv(kind, [row, row], notes)).errors.length, 1);
  assert.ok(validateRow(kind, { ...row, distance_m: '-1' }));
  if (kind === 'ble-ad') { assert.equal(validateRow(kind, { ...row, rssi_dbm: '-55' }), null); assert.ok(validateRow(kind, { ...row, observation_status: 'unchecked', rssi_dbm: '-55' })); }
  else assert.ok(validateRow(kind, { ...row, observation_status: 'unchecked', command_alias: 'C-A' }));
}
const original = 'uid,room,note,value\r\nA,집,=FORMULA,1\r\nA,집,,\r\n잘못된행\r\n';
const source = readSource(original), before = JSON.stringify(source);
const result = pseudonymize(source, defaultActions(source.header));
assert.equal(source.errors.length, 1); assert.equal(result.rows[0][0], result.rows[1][0]);
assert.equal(result.header.length, 3); assert.equal(result.rows[1][2], ''); assert.equal(JSON.stringify(source), before);
assert.ok(pseudonymize(readSource('note\n=FORMULA\n'), ['keep']).csv.includes("'=FORMULA"));
assert.throws(() => readSource('a,a\n1,2')); assert.throws(() => pseudonymize(source, ['remove','remove','remove','remove']));
console.log('BLE/IR CSV·검증·자료 분리 및 가명처리 원본 불변·오류·결측·수식 방어 통과');
