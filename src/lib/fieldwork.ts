import { csvCell, MAX_BYTES, newId, parseCsv, uncsvText } from './nfc.ts';

export type Kind = 'ble-ad' | 'ir';
export type Mode = 'real' | 'demo';
export type Row = Record<string, string>;
export const NOTE_LABELS = { question: '탐구 질문', hypothesis: '가설과 고정 조건·반복 계획', conclusion: '자료 해석과 결론', defense: '실생활 위험과 방어 제안', limits: '한계·예상 밖 결과·추가 관찰', explain: '1분 자기 설명: 근거와 아직 모르는 것' };
export type Notes = Record<keyof typeof NOTE_LABELS, string>;
export const emptyNotes = (): Notes => ({ question: '', hypothesis: '', conclusion: '', defense: '', limits: '', explain: '' });
export const FIELDS = {
  'ble-ad': ['alias', 'condition', 'distance_m', 'observation_status', 'rssi_dbm', 'connection', 'note'],
  ir: ['alias', 'button', 'condition', 'distance_m', 'observation_status', 'protocol', 'command_alias', 'note'],
};
export function validateRow(kind: Kind, row: Row): string | null {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(row.id ?? '')) return '기록 ID 형식이 맞지 않습니다.';
  if (!['real', 'demo'].includes(row.data_type)) return '실제·데모 구분을 확인하세요.';
  if (!['observed', 'not-observed', 'unchecked'].includes(row.observation_status)) return '관찰 상태를 골라 주세요.';
  for (const key of FIELDS[kind]) if (typeof row[key] !== 'string' || row[key].length > (key === 'note' ? 500 : 80)) return '입력 항목 누락 또는 글자 수 초과입니다.';
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,19}$/.test(row.alias)) return '기기 별칭은 BLE-A, IR-A처럼 영문으로 시작하는 20자 이내로 적습니다. 원래 주소는 넣지 않습니다.';
  if (!row.condition.trim()) return '관찰 조건을 적어 주세요.';
  if (!row.distance_m.trim() || !Number.isFinite(Number(row.distance_m)) || Number(row.distance_m) < 0 || Number(row.distance_m) > 100) return '거리는 0~100m로 적어 주세요.';
  if (kind === 'ble-ad') {
    if (!['not-checked', 'not-connected', 'connected'].includes(row.connection)) return '연결 상태를 골라 주세요.';
    if (row.rssi_dbm && (row.observation_status !== 'observed' || !/^-?\d+$/.test(row.rssi_dbm) || Number(row.rssi_dbm) < -120 || Number(row.rssi_dbm) > 0)) return 'RSSI는 광고가 보이고 값이 표시된 경우에만 -120~0dBm으로 적습니다. 그 외에는 비웁니다.';
  } else {
    if (!row.button.trim()) return '내 리모컨의 버튼 이름을 적어 주세요.';
    if (row.command_alias && !/^C-[A-Za-z0-9_-]{1,20}$/.test(row.command_alias)) return '명령은 원시 코드 대신 C-A처럼 별칭으로 적습니다.';
    if (row.observation_status !== 'observed' && (row.protocol || row.command_alias)) return '미관찰·미측정은 프로토콜과 명령 별칭을 비웁니다.';
  }
  return null;
}
export const makeRow = (values: Row, mode: Mode): Row => ({ ...values, id: newId(), data_type: mode });
export function rowsCsv(kind: Kind, rows: Row[], notes: Record<Mode, Notes>) {
  const header = ['schema_version', 'workbook_id', 'record_type', 'observation_id', 'data_type', ...FIELDS[kind], 'note_key', 'note_value'];
  const records = rows.map(r => ['1', kind, 'observation', r.id, r.data_type, ...FIELDS[kind].map(k => r[k]), '', '']);
  for (const mode of ['real', 'demo'] as const) for (const key of Object.keys(NOTE_LABELS) as (keyof Notes)[]) if (notes[mode][key]) records.push(['1', kind, 'notes', '', mode, ...FIELDS[kind].map(() => ''), key, notes[mode][key]]);
  return '\uFEFF' + [header, ...records].map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
export function readRowsCsv(kind: Kind, text: string) {
  if (new Blob([text]).size > MAX_BYTES) throw new Error('1MB 이하 파일을 선택하세요.');
  const parsed = parseCsv(text), rows: Row[] = [], errors: string[] = [];
  const notes: Partial<Record<Mode, Partial<Notes>>> = {};
  const header = ['schema_version', 'workbook_id', 'record_type', 'observation_id', 'data_type', ...FIELDS[kind], 'note_key', 'note_value'];
  if (parsed[0]?.cells.join(',') !== header.join(',')) throw new Error('이 워크북에서 내보낸 CSV를 선택하세요.');
  if (parsed.length > 1001) throw new Error('관찰과 서술을 합쳐 1000행까지 가져올 수 있습니다.');
  const ids = new Set<string>();
  for (const line of parsed.slice(1)) {
    const raw = Object.fromEntries(header.map((k, i) => [k, uncsvText(line.cells[i] ?? '')]));
    let error: string | null = null;
    if (line.cells.length !== header.length || raw.schema_version !== '1' || raw.workbook_id !== kind || !['real', 'demo'].includes(raw.data_type)) error = '열·버전·워크북·자료 구분이 맞지 않습니다.';
    else if (raw.record_type === 'notes') {
      const key = raw.note_key as keyof Notes, mode = raw.data_type as Mode;
      if (!Object.hasOwn(NOTE_LABELS, key) || raw.note_value.length > 4000 || Object.hasOwn(notes[mode] ?? {}, key)) error = '서술 항목·길이 또는 중복을 확인하세요.';
      else { notes[mode] ??= {}; notes[mode]![key] = raw.note_value; }
    } else if (raw.record_type === 'observation') {
      const row: Row = Object.fromEntries(FIELDS[kind].map(k => [k, raw[k]]));
      row.id = raw.observation_id; row.data_type = raw.data_type;
      error = validateRow(kind, row);
      if (!error && ids.has(row.id)) error = '파일 안에 같은 기록 ID가 있습니다.';
      if (!error) { ids.add(row.id); rows.push(row); }
    } else error = '지원하지 않는 기록 종류입니다.';
    if (error) errors.push(`${line.line}행: ${error}`);
  }
  return { rows, notes, errors };
}
export function downloadFile(name: string, value: string, type = 'text/csv;charset=utf-8') {
  const href = URL.createObjectURL(new Blob([value], { type }));
  const anchor = document.createElement('a'); anchor.href = href; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
