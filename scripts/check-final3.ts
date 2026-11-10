import assert from 'node:assert/strict';
import { checklistDemo } from '../src/lib/checklist.ts';
import { emptyNotes, makeRow, readRowsCsv, rowsCsv, validateRow } from '../src/lib/fieldwork.ts';
for (const kind of ['channel', 'ble-pair', 'subghz'] as const) {
  const rows = [0, 1, 2].map(i => makeRow(checklistDemo(kind, i), i === 0 ? 'real' : 'demo'));
  for (const row of rows) assert.equal(validateRow(kind, row), null);
  const row = rows[0], notes = { real: emptyNotes(), demo: emptyNotes() };
  row.note = '=SUM(1,2)'; notes.real.question = '+질문'; notes.demo.defense = '문서, "비교"\n한계';
  const csv = rowsCsv(kind, rows, notes), parsed = readRowsCsv(kind, csv);
  assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes("'=SUM")); assert.ok(csv.includes("'+질문"));
  assert.deepEqual(parsed.rows, rows); assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.notes.real?.question, notes.real.question); assert.equal(parsed.notes.demo?.defense, notes.demo.defense);
  assert.equal(readRowsCsv(kind, csv + 'bad,row\r\n').errors.length, 1);
  assert.equal(readRowsCsv(kind, rowsCsv(kind, [row, row], notes)).errors.length, 1);
  assert.throws(() => readRowsCsv(kind, csv + '"unclosed'));
  assert.throws(() => readRowsCsv(kind, 'x'.repeat(1024 * 1024 + 1)));
  assert.throws(() => readRowsCsv(kind === 'channel' ? 'ble-pair' : 'channel', csv));
  assert.ok(validateRow(kind, { ...row, evidence: '' }));
  if (kind === 'channel') {
    for (const values of [{ ap_count: '-1' }, { ap_count: '1.5' }, { rssi_dbm: '1' }, { observed_at: '2026-02-30T10:00' }, { observation_status: 'unchecked' }, { backup_path: '' }, { channel_alias: '' }]) assert.ok(validateRow(kind, { ...row, ...values }));
    assert.equal(validateRow(kind, { ...row, ap_count: '0', rssi_dbm: '' }), null);
    assert.equal(validateRow(kind, { ...row, ap_count: '', rssi_dbm: '' }), null);
  } else if (kind === 'ble-pair') {
    for (const values of [{ pairing_method: 'invented' }, { permission_plan: '' }, { app_permissions: '' }, { link_status: 'disconnected' }, { observation_status: 'unchecked' }]) assert.ok(validateRow(kind, { ...row, ...values }));
    assert.equal(validateRow(kind, { ...row, pairing_method: 'unchecked', reconnect_result: 'unchecked' }), null);
  } else {
    for (const values of [{ code_basis: 'screen' }, { access_defense: '' }, { regional_rules: '' }, { code_document: '' }, { frequency_alias: '' }]) assert.ok(validateRow(kind, { ...row, ...values }));
    assert.equal(validateRow(kind, { ...row, observation_status: 'not-observed' }), null); // Document evidence is independent of reception.
    assert.equal(validateRow(kind, { ...row, code_method: 'unchecked', code_basis: 'screen' }), null);
  }
}
console.log('PASS final3: topic validation, missing/zero distinction, code documentation boundary, real/demo CSV roundtrip, formula defense, import errors/limits');
