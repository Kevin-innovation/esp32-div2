import assert from 'node:assert/strict';
import { emptyNotes, makeRow, readRowsCsv, rowsCsv, validateRow, type Row } from '../src/lib/fieldwork.ts';
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
const signal: Row = makeRow({ alias: 'Radio-A', condition: '위치 A', observed_at: '2026-01-01T10:00', channel: 'CH-A', observation_status: 'observed', display_text: '간헐적으로 높은 막대', energy_value: '', energy_unit: '', note: '=수식' }, 'real');
assert.equal(validateRow('interference', signal), null);
assert.ok(validateRow('interference', { ...signal, energy_value: '5' }));
assert.ok(validateRow('interference', { ...signal, display_text: '높이 5' }));
assert.equal(validateRow('interference', { ...signal, energy_value: '-50', energy_unit: 'dBm' }), null);
assert.ok(validateRow('interference', { ...signal, observation_status: 'not-observed' }));
assert.ok(validateRow('interference', { ...signal, observed_at: '2026-02-30T10:00' }));
const gps: Row = makeRow({ alias: 'GPS-A', condition: '실내', observed_at: '2026-01-01T10:00', observation_status: 'observed', satellites: '', fix: 'no-fix', wait_seconds: '60', timed_out: 'yes', crosscheck: '휴대폰 대조 못 함', note: '' }, 'real');
assert.equal(validateRow('gps', gps), null);
assert.ok(validateRow('gps', { ...gps, fix: 'fixed' }));
assert.ok(validateRow('gps', { ...gps, wait_seconds: '0' }));
assert.ok(validateRow('gps', { ...gps, satellites: '-1' }));
assert.ok(validateRow('gps', { ...gps, observation_status: 'unchecked' }));
assert.equal(validateRow('gps', { ...gps, satellites: '0' }), null);
assert.equal(validateRow('gps', { ...gps, observation_status: 'unchecked', fix: 'unchecked', wait_seconds: '', timed_out: 'no' }), null);
for (const [kind, row] of [['interference', signal], ['gps', gps]] as const) {
  const notes = { real: emptyNotes(), demo: emptyNotes() }; notes.real.hypothesis = '대안 원인 비교';
  const output = rowsCsv(kind, [row], notes), imported = readRowsCsv(kind, output);
  assert.equal(imported.errors.length, 0); assert.deepEqual(imported.rows[0], row);
  assert.equal(imported.notes.real?.hypothesis, '대안 원인 비교');
  assert.throws(()=>readRowsCsv(kind === 'gps' ? 'interference' : 'gps', output));
}
console.log('BLE/IR·간섭·GPS CSV/검증/결측/타임아웃, 가명처리 원본 보존·수식 방어 통과');
