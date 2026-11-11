import { csvCell, MAX_BYTES, parseCsv, uncsvText } from './nfc.ts';
export type Action = 'keep' | 'alias' | 'remove';
export interface CsvSource { header: string[]; rows: string[][]; errors: string[] }
export function readSource(text: string): CsvSource {
  if (new Blob([text]).size > MAX_BYTES) throw new Error('1MB 이하 CSV를 사용하세요.');
  const parsed = parseCsv(text);
  const header = parsed[0]?.cells.map(uncsvText) ?? [];
  if (!header.length || header.length > 30 || header.some(h => !h.trim() || h.length > 80) || new Set(header).size !== header.length) throw new Error('머리글은 중복 없이 1~30개, 각 1~80자로 적습니다.');
  if (parsed.length > 1001) throw new Error('1000행 이하 CSV를 사용하세요.');
  const rows: string[][] = [], errors: string[] = [];
  for (const row of parsed.slice(1)) {
    if (row.cells.length !== header.length || row.cells.some(c => c.length > 4000)) errors.push(`${row.line}행: 열 개수 또는 셀 4000자 제한이 맞지 않아 제외했습니다.`);
    else rows.push(row.cells.map(uncsvText));
  }
  return { header, rows, errors };
}
export function defaultActions(header: string[]): Action[] {
  return header.map(h => /note|memo|text|서술|메모|이름|name|time|시각/i.test(h) ? 'remove' : /uid|bssid|ssid|address|mac|room|place|location|주소|장소|위치/i.test(h) ? 'alias' : 'keep');
}
export function pseudonymize(source: CsvSource, actions: Action[]) {
  if (actions.length !== source.header.length || actions.some(a => !['keep', 'alias', 'remove'].includes(a))) throw new Error('열마다 처리 방식을 골라 주세요.');
  const included = source.header.map((_, i) => i).filter(i => actions[i] !== 'remove');
  if (!included.length) throw new Error('공유할 열을 하나 이상 남겨 주세요.');
  const mappings = source.header.map(() => new Map<string, string>());
  const rows = source.rows.map(row => included.map(i => {
    const value = row[i];
    if (actions[i] === 'keep' || !value) return value;
    const map = mappings[i];
    if (!map.has(value)) map.set(value, `열${i + 1}-${map.size + 1}`);
    return map.get(value)!;
  }));
  const header = included.map(i => actions[i] === 'alias' ? `${source.header[i]}_alias` : source.header[i]);
  return { header, rows, csv: '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n' };
}

/** 원본과 가명본을 대조한 점검표. Colab 코드도 두 파일만 보고 같은 항목을 계산한다. */
export function csvSummary(source: CsvSource, output: { header: string[]; rows: string[][] }): [string, string][] {
  const out: [string, string][] = [['원본 행', String(source.rows.length)], ['가명본 행', String(output.rows.length)]];
  const kept: string[] = [], aliased: string[] = [], removed: string[] = [];
  source.header.forEach((h) => (output.header.includes(h) ? kept : output.header.includes(`${h}_alias`) ? aliased : removed).push(h));
  out.push(['유지한 열', kept.join(', ') || '없음'], ['가명으로 바꾼 열', aliased.join(', ') || '없음'], ['제거한 열', removed.join(', ') || '없음']);
  for (const h of aliased) {
    const i = source.header.indexOf(h), j = output.header.indexOf(`${h}_alias`);
    const pairs = source.rows.map((r, n) => [r[i], output.rows[n][j]]).filter(([a]) => a);
    const fwd = new Map<string, string>(), back = new Map<string, string>();
    let oneToOne = true;
    for (const [a, b] of pairs) { if ((fwd.get(a) ?? b) !== b || (back.get(b) ?? a) !== a) oneToOne = false; fwd.set(a, b); back.set(b, a); }
    out.push([`${h} 원래 값 종류`, String(fwd.size)], [`${h} 별칭 종류`, String(back.size)], [`${h} 일대일 대응`, oneToOne ? '예' : '아니요']);
  }
  for (const h of [...kept, ...aliased]) {
    const i = source.header.indexOf(h), j = output.header.indexOf(output.header.includes(h) ? h : `${h}_alias`);
    out.push([`${h} 빈 값(원본→가명본)`, `${source.rows.filter((r) => !r[i]).length}→${output.rows.filter((r) => !r[j]).length}`]);
  }
  return out;
}

const ACTION_LABEL: Record<Action, string> = { keep: '유지', alias: '가명', remove: '제거' };
/** 학생 서술, 열별 처리, 원본과 가명본 대조 결과로 만드는 보고서. 비어 있는 서술은 (미작성)으로 남긴다. */
export function buildCsvReport(title: string, source: CsvSource | null, actions: Action[], notes: Record<string, string>, labels: Record<string, string>, mode: 'real' | 'demo', checked: boolean, date: string): string {
  const text = (k: string) => notes[k]?.trim() || '(미작성)';
  let summary = '(원본을 아직 가져오지 않음)';
  if (source) { try { summary = csvSummary(source, pseudonymize(source, actions)).map(([k, v]) => `- ${k}: ${v}`).join('\n'); } catch (e) { summary = `(가명본을 만들 수 없음: ${(e as Error).message})`; } }
  return [
    `# ${title}`,
    `작성일 ${date}. 자료 구분: ${mode === 'real' ? '직접 준비한 자료' : '가상 데모 자료(실제 결과 아님)'}.`,
    `## 1. ${labels.question}`, text('question'),
    `## 2. ${labels.hypothesis}`, text('hypothesis'),
    `## 3. ${labels.controls}`, text('controls'),
    '## 4. 열별 처리', source ? source.header.map((h, i) => `- ${h}: ${ACTION_LABEL[actions[i]] ?? '미선택'}`).join('\n') : '(원본 없음)',
    '## 5. 원본과 가명본 대조', summary, `재식별 단서 직접 점검: ${checked ? '완료' : '아직 하지 않음'}`,
    `## 6. ${labels.interpretation}`, text('interpretation'),
    `## 7. ${labels.conclusion}`, text('conclusion'),
    `## 8. ${labels.defense}`, text('defense'),
    `## 9. ${labels.limits}`, text('limits'),
    `## 10. ${labels.application}`, text('application'),
    `## 11. ${labels.explain}`, text('explain'),
    '## 경계', '가명처리는 익명화가 아닙니다. 대응표와 원본은 공유본에 넣지 않고 따로 보관합니다.',
  ].join('\n\n') + '\n';
}
