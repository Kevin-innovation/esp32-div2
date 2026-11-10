import assert from 'node:assert/strict';
import { checklistDemo, checklistDraft, type ChecklistKind } from '../src/lib/checklist.ts';
import { emptyNotes, makeRow, readRowsCsv, rowsCsv, validateRow } from '../src/lib/fieldwork.ts';

for (const kind of ['ssid-map', 'wpa-pmf', 'firmware'] as ChecklistKind[]) {
  const rows = [0, 1, 2].map(i => makeRow(checklistDemo(kind, i), i === 0 ? 'real' : 'demo'));
  for (const row of rows) assert.equal(validateRow(kind, row), null);
  const notes = { real: emptyNotes(), demo: emptyNotes() };
  notes.real.question = '=SUM(1,2)'; notes.demo.question = '가상 질문\n"한계", 비교';
  rows[0].note = '@수식';
  const csv = rowsCsv(kind, rows, notes), loaded = readRowsCsv(kind, csv);
  assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes("'@수식")); assert.ok(csv.includes("'=SUM"));
  assert.deepEqual(loaded.rows, rows); assert.equal(loaded.notes.real?.question, notes.real.question);
  assert.equal(loaded.notes.demo?.question, notes.demo.question); assert.deepEqual(loaded.errors, []);
  assert.equal(readRowsCsv(kind, csv + 'bad,row\r\n').errors.length, 1);
  assert.equal(readRowsCsv(kind, rowsCsv(kind, [rows[0], rows[0]], notes)).errors.length, 1);
  assert.throws(() => readRowsCsv(kind, csv + '"unterminated'));
  assert.throws(() => readRowsCsv(kind, 'x'.repeat(1024 * 1024 + 1)));
  assert.throws(() => readRowsCsv(kind === 'firmware' ? 'ssid-map' : 'firmware', csv));
  assert.ok(validateRow(kind, makeRow(checklistDraft(kind), 'real')));
  assert.ok(validateRow(kind, { ...rows[0], evidence: '' }));
  assert.ok(validateRow(kind, { ...rows[0], observation_status: 'unchecked' }));
  if (kind === 'ssid-map') assert.ok(validateRow(kind, { ...rows[0], bssid_alias: 'aa:bb:cc:dd:ee:ff' }));
  if (kind === 'wpa-pmf') {
    assert.ok(validateRow(kind, { ...rows[0], wpa3_support: 'no' }));
    assert.equal(validateRow(kind, { ...rows[0], pmf: 'disabled' }), null);
  }
  if (kind === 'firmware') {
    for (const url of ['http://example.org', 'https://user:secret@example.org', 'javascript:alert(1)']) assert.ok(validateRow(kind, { ...rows[0], source_url: url }));
    assert.ok(validateRow(kind, { ...rows[0], actual_sha256: 'not-a-hash' }));
    assert.ok(validateRow(kind, { ...rows[0], signature: 'valid', signature_evidence: '' }));
    assert.ok(validateRow(kind, { ...rows[0], recovery: 'ready', recovery_plan: '' }));
    assert.equal(validateRow(kind, { ...rows[0], expected_sha256: '', actual_sha256: '' }), null);
  }
}
console.log('PASS checklist validation, real/demo CSV roundtrip, formula defense, malformed/oversized/duplicate rows, firmware trust boundaries');
