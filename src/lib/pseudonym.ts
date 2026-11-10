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
