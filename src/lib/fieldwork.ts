import { csvCell, MAX_BYTES, newId, parseCsv, uncsvText } from './nfc.ts';
import { CHECKLIST_FIELDS, CHECKLIST_LABELS, CHECKLIST_OPTIONS, fieldMaxLength, isChecklist, validateChecklist, type ChecklistKind } from './checklist.ts';

export type Kind = 'ble-ad' | 'ir' | 'interference' | 'gps' | ChecklistKind;
export type Mode = 'real' | 'demo';
export type Row = Record<string, string>;
/** 보고서 순서와 같다. 앞의 여섯 항목은 초기 버전과 같은 키다. */
export const NOTE_LABELS = {
  question: '탐구 질문',
  hypothesis: '가설과 그 이유',
  controls: '고정 조건과 반복 계획',
  interpretation: '자료 해석',
  conclusion: '결론',
  defense: '위협과 방어 제안',
  limits: '한계와 예상 밖 결과',
  application: '응용 아이디어와 확장 프로젝트',
  explain: '1분 자기 설명',
};
export type NoteKey = keyof typeof NOTE_LABELS;
export type Notes = Record<NoteKey, string>;
export const NOTE_KEYS = Object.keys(NOTE_LABELS) as NoteKey[];
export const emptyNotes = (): Notes => Object.fromEntries(NOTE_KEYS.map((k) => [k, ''])) as Notes;
export const FIELDS = {
  ...CHECKLIST_FIELDS,
  'ble-ad': ['alias', 'condition', 'distance_m', 'observation_status', 'rssi_dbm', 'connection', 'note'],
  ir: ['alias', 'button', 'condition', 'distance_m', 'observation_status', 'protocol', 'command_alias', 'note'],
  interference: ['alias', 'condition', 'observed_at', 'channel', 'observation_status', 'display_text', 'energy_value', 'energy_unit', 'note'],
  gps: ['alias', 'condition', 'observed_at', 'observation_status', 'satellites', 'fix', 'wait_seconds', 'timed_out', 'crosscheck', 'note'],
};

export const STATUS: Record<string, string> = { observed: '관찰됨', 'not-observed': '관찰되지 않음', unchecked: '측정하지 못함' };
export const LABELS: Record<string, string> = { ...CHECKLIST_LABELS, alias: '내 기기 별칭', condition: '관찰 조건·위치 별칭', distance_m: '거리(m)', observation_status: '관찰 상태', rssi_dbm: '표시된 RSSI(dBm, 없으면 빈 값)', connection: '별도로 확인한 연결 상태', button: '내 리모컨 버튼', protocol: '표시된 프로토콜(없으면 빈 값)', command_alias: '명령 별칭(예: C-A)', note: '관찰 메모·결측 이유', observed_at: '관찰 날짜·시각', channel: '화면에 표시된 채널·주파수(없으면 빈 값)', display_text: '화면의 실제 막대·문구 관찰', energy_value: '화면 에너지 숫자(값·단위가 함께 표시될 때만)', energy_unit: '화면 에너지 단위(없으면 빈 값)', satellites: '표시된 위성 수(없으면 빈 값)', fix: '화면의 위치 고정(fix) 여부', wait_seconds: '실제로 기다린 시간(초, 미측정은 빈 값)', timed_out: '정한 대기 상한에 도달했나요?', crosscheck: '휴대폰·지도 교차확인 결과 또는 미확인 이유' };
const CONNECTION = { 'not-checked': '연결 확인 안 함', 'not-connected': '연결되지 않음 확인', connected: '내 기기에서 연결 상태 확인' };
const FIX = { fixed: '위치 고정 확인', 'no-fix': '아직 위치 고정 안 됨 확인', unchecked: '확인 안 함' };
const TIMEOUT = { no: '아니요', yes: '예, 대기 상한 도달' };
export function choices(kind: Kind, field: string): Record<string, string> | null {
  if (field === 'observation_status') return STATUS;
  if (field === 'connection') return CONNECTION;
  if (field === 'fix') return FIX;
  if (field === 'timed_out') return TIMEOUT;
  if (kind === 'gps' && field === 'condition') return { 실내: '실내', 창가: '창가', 야외: '야외' };
  return isChecklist(kind) ? CHECKLIST_OPTIONS[field] ?? null : null;
}
/** 입력 양식을 '무엇을, 어디서' / '무엇을 보았나' / '근거와 계획'으로 나눈다. */
export const FIELD_GROUPS: [string, string, string[]][] = [
  ['target', '관찰 대상과 조건', ['alias', 'button', 'condition', 'distance_m', 'observed_at', 'channel', 'channel_alias', 'frequency_alias', 'ssid_alias', 'bssid_alias', 'source_url', 'file_name', 'version']],
  ['result', '관찰 결과', ['observation_status', 'rssi_dbm', 'connection', 'protocol', 'command_alias', 'display_text', 'energy_value', 'energy_unit', 'satellites', 'fix', 'wait_seconds', 'timed_out', 'ap_count', 'different_bssid', 'auto_connect', 'wpa2_support', 'wpa3_support', 'configured', 'pmf', 'pairing_method', 'link_status', 'app_permissions', 'reconnect_result', 'code_method', 'code_basis', 'expected_sha256', 'actual_sha256', 'signature', 'recovery']],
  ['evidence', '근거와 계획', ['evidence', 'crosscheck', 'backup_path', 'permission_plan', 'code_document', 'access_defense', 'regional_rules', 'signature_evidence', 'recovery_plan', 'note']],
];
export const groupFields = (kind: Kind) => FIELD_GROUPS.map(([id, label, keys]) => [id, label, FIELDS[kind].filter((f) => keys.includes(f))] as const).filter(([, , f]) => f.length);

export function validateRow(kind: Kind, row: Row): string | null {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(row.id ?? '')) return '기록 ID 형식이 맞지 않습니다.';
  if (!['real', 'demo'].includes(row.data_type)) return '실제·데모 구분을 확인하세요.';
  if (!['observed', 'not-observed', 'unchecked'].includes(row.observation_status)) return '관찰 상태를 골라 주세요.';
  for (const key of FIELDS[kind]) if (typeof row[key] !== 'string' || row[key].length > fieldMaxLength(key)) return '입력 항목 누락 또는 글자 수 초과입니다.';
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,19}$/.test(row.alias)) return '기기 별칭은 BLE-A, IR-A, GPS-A처럼 영문으로 시작하는 20자 이내로 적습니다. 원래 주소는 넣지 않습니다.';
  if (!row.condition.trim()) return '관찰 조건을 적어 주세요.';
  if (isChecklist(kind)) return validateChecklist(kind, row);
  if (kind === 'interference' || kind === 'gps') {
    const parts = row.observed_at.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/), date = new Date(row.observed_at);
    if (!parts || Number.isNaN(date.getTime()) || [date.getFullYear(),date.getMonth()+1,date.getDate(),date.getHours(),date.getMinutes()].some((v,i)=>v!==Number(parts[i+1]))) return '실제 존재하는 관찰 날짜와 시간을 골라 주세요.';
    if (kind === 'interference') {
      if (row.observation_status === 'observed' && !row.display_text.trim()) return '실제로 본 화면의 막대·문구를 적어 주세요.';
      if (row.observation_status !== 'observed' && (row.energy_value || row.energy_unit || row.display_text)) return '미관찰·미측정이면 화면 관찰과 에너지 값·단위를 비우고 이유를 메모합니다.';
      if (!row.energy_unit.trim() && (row.energy_value || /\d/.test(row.display_text))) return '단위 없는 화면은 임의 수치 대신 막대·문구를 설명합니다. 에너지 숫자를 적지 않습니다.';
      if (row.energy_value && (!row.energy_value.trim() || !Number.isFinite(Number(row.energy_value)) || Math.abs(Number(row.energy_value)) > 1e9)) return '에너지 값은 화면에 표시된 유한한 숫자만 적습니다.';
    } else {
      if (!['실내','창가','야외'].includes(row.condition)) return '위치는 실내·창가·야외 중에서 골라 주세요.';
      if (!['fixed','no-fix','unchecked'].includes(row.fix) || !['yes','no'].includes(row.timed_out)) return 'fix 여부와 타임아웃을 골라 주세요.';
      if (row.satellites && (!/^\d+$/.test(row.satellites) || Number(row.satellites)>100)) return '위성 수는 표시될 때만 0~100 사이 정수로 적습니다.';
      if (row.wait_seconds && (!/^\d+$/.test(row.wait_seconds) || Number(row.wait_seconds)>3600)) return '대기 시간은 0~3600초 정수로 적습니다.';
      if (row.observation_status !== 'observed' && (row.satellites || row.fix !== 'unchecked')) return '화면을 관찰하지 못했으면 위성 수를 비우고 fix는 확인 안 함으로 둡니다.';
      if (row.observation_status === 'unchecked' && (row.wait_seconds || row.timed_out==='yes')) return '측정하지 못한 기록은 대기 시간을 비우고 타임아웃 없음으로 둡니다.';
      if (row.timed_out==='yes' && (row.fix==='fixed' || !row.wait_seconds || Number(row.wait_seconds)===0)) return '타임아웃은 fix 성공이 아니며 실제 기다린 시간을 1초 이상으로 남깁니다.';
      if (row.fix==='fixed' && !row.wait_seconds) return 'fix를 확인했다면 대기 시간을 적습니다.';
      if (!row.crosscheck.trim()) return '휴대폰·지도 대조 결과 또는 확인하지 못한 이유를 적어 주세요.';
    }
    return null;
  }
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
export function rowsCsv(kind: Kind, rows: Row[], notes: Record<Mode, Partial<Notes>>) {
  const header = ['schema_version', 'workbook_id', 'record_type', 'observation_id', 'data_type', ...FIELDS[kind], 'note_key', 'note_value'];
  const records = rows.map(r => ['1', kind, 'observation', r.id, r.data_type, ...FIELDS[kind].map(k => r[k]), '', '']);
  for (const mode of ['real', 'demo'] as const) for (const key of NOTE_KEYS) if (notes[mode][key]) records.push(['1', kind, 'notes', '', mode, ...FIELDS[kind].map(() => ''), key, notes[mode][key]!]);
  return '﻿' + [header, ...records].map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
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
      const key = raw.note_key as NoteKey, mode = raw.data_type as Mode;
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

// 브라우저 요약. Colab 코드도 같은 항목 이름으로 같은 값을 출력하며 scripts/check-workbooks.ts가 둘을 대조한다.
export type Summary = [string, string][];
export const fmt = (v: number) => Number.isInteger(v) ? String(v) : v.toFixed(1);
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const num = (rows: Row[], key: string) => rows.filter((r) => r[key] !== '').map((r) => Number(r[key]));
const ratio = (rows: Row[]) => { const seen = rows.filter((r) => r.observation_status === 'observed').length, tried = rows.filter((r) => r.observation_status !== 'unchecked').length; return tried ? `${seen}/${tried}` : '계산 불가'; };
const medText = (values: number[], unit = '') => { const m = median(values); return m === null ? '값 없음' : `${fmt(m)}${unit}`; };
const range = (values: number[], unit = '') => values.length ? `${fmt(Math.min(...values))}~${fmt(Math.max(...values))}${unit}` : '값 없음';
const count = (rows: Row[], key: string, value: string) => String(rows.filter((r) => r[key] === value).length);
function groups(rows: Row[], key: (r: Row) => string) {
  const map = new Map<string, Row[]>();
  for (const r of rows) map.set(key(r), [...(map.get(key(r)) ?? []), r]);
  return [...map.entries()];
}
/** WPA·PMF 행 하나가 어떤 보호 범위인지. 화면·문서 표시를 읽은 분류일 뿐 실제 협상 결과가 아니다. */
export function wpaCategory(r: Row): string {
  if (r.observation_status !== 'observed' || r.configured === 'unchecked') return '판정 보류';
  if (r.configured === 'wpa3') return r.pmf === 'required' ? 'WPA3 전용, PMF 필수' : 'WPA3 표시, PMF 표시 재확인';
  if (r.configured === 'mixed') return '전환 모드, PMF 선택 이상';
  if (r.configured === 'wpa2') return r.pmf === 'disabled' || r.pmf === 'unchecked' ? 'WPA2, PMF 없음 또는 미확인' : 'WPA2와 PMF';
  return '기타 설정';
}
export function firmwareDecision(r: Row): string {
  if (r.observation_status !== 'observed') return '판정 보류';
  const comparable = r.expected_sha256 && r.actual_sha256;
  if (comparable && r.expected_sha256.toLowerCase() !== r.actual_sha256.toLowerCase()) return '설치 중단: 해시 불일치';
  if (comparable && r.signature === 'valid' && r.recovery === 'ready') return '설치 검토 가능';
  return '설치 보류: 근거 부족';
}
export function summaryRows(kind: Kind, rows: Row[]): Summary {
  const out: Summary = [['기록 행', String(rows.length)], ['관찰됨', count(rows, 'observation_status', 'observed')], ['관찰되지 않음', count(rows, 'observation_status', 'not-observed')], ['측정하지 못함', count(rows, 'observation_status', 'unchecked')]];
  const seen = rows.filter((r) => r.observation_status === 'observed');
  if (kind === 'ble-ad') for (const [g, rs] of groups(rows, (r) => `${r.condition} ${r.distance_m}m`)) out.push([`${g} 광고 관찰 비율`, ratio(rs)], [`${g} RSSI 중앙값`, medText(num(rs, 'rssi_dbm'), 'dBm')]);
  if (kind === 'ir') for (const [g, rs] of groups(rows, (r) => `${r.button} ${r.condition}`)) out.push([`${g} 수신 비율`, ratio(rs)], [`${g} 명령 별칭 종류`, String(new Set(rs.filter((r) => r.command_alias).map((r) => r.command_alias)).size)]);
  if (kind === 'interference') for (const [g, rs] of groups(rows, (r) => r.condition)) out.push([`${g} 화면 관찰`, ratio(rs)], [`${g} 단위 있는 수치`, range(num(rs.filter((r) => r.energy_unit), 'energy_value'), rs.find((r) => r.energy_unit)?.energy_unit ?? '')]);
  if (kind === 'gps') for (const place of ['실내', '창가', '야외']) {
    const rs = rows.filter((r) => r.condition === place);
    if (!rs.length) continue;
    const fixed = rs.filter((r) => r.fix === 'fixed');
    out.push([`${place} fix 성공`, `${fixed.length}/${rs.filter((r) => r.observation_status === 'observed').length}`], [`${place} fix까지 대기 중앙값`, medText(num(fixed, 'wait_seconds'), '초')], [`${place} 위성 수 범위`, range(num(rs, 'satellites'), '개')], [`${place} 타임아웃`, count(rs, 'timed_out', 'yes')]);
  }
  if (kind === 'channel') for (const [g, rs] of groups(seen, (r) => r.condition)) out.push([`${g} AP 수 중앙값`, medText(num(rs, 'ap_count'), '개')], [`${g} RSSI 중앙값`, medText(num(rs, 'rssi_dbm'), 'dBm')]);
  if (kind === 'ble-pair') {
    for (const [v, label] of Object.entries(CHECKLIST_OPTIONS.pairing_method)) out.push([`페어링 방식: ${label}`, count(seen, 'pairing_method', v)]);
    out.push(['해제 후 재연결 확인', count(seen, 'reconnect_result', 'reconnected')], ['재연결 실패 확인', count(seen, 'reconnect_result', 'failed')]);
  }
  if (kind === 'subghz') {
    for (const [v, label] of Object.entries(CHECKLIST_OPTIONS.code_method)) out.push([`코드 방식: ${label}`, count(rows, 'code_method', v)]);
    out.push(['설명서 명시 항목으로 판단', count(rows, 'code_basis', 'manual')]);
  }
  if (kind === 'ssid-map') for (const [g, rs] of groups(seen, (r) => r.ssid_alias)) out.push([`${g} 서로 다른 BSSID 별칭 수`, String(new Set(rs.map((r) => r.bssid_alias)).size)], [`${g} 자동 연결 켜짐 기록`, count(rs, 'auto_connect', 'enabled')]);
  if (kind === 'wpa-pmf') for (const c of ['WPA3 전용, PMF 필수', 'WPA3 표시, PMF 표시 재확인', '전환 모드, PMF 선택 이상', 'WPA2와 PMF', 'WPA2, PMF 없음 또는 미확인', '기타 설정', '판정 보류']) { const n = rows.filter((r) => wpaCategory(r) === c).length; if (n) out.push([`보호 범위: ${c}`, String(n)]); }
  if (kind === 'firmware') for (const c of ['설치 검토 가능', '설치 보류: 근거 부족', '설치 중단: 해시 불일치', '판정 보류']) { const n = rows.filter((r) => firmwareDecision(r) === c).length; if (n) out.push([`판단: ${c}`, String(n)]); }
  return out;
}

/** 학생이 쓴 서술과 지금 보고 있는 자료(실제 또는 데모)로 만드는 보고서. 비어 있는 항목은 비어 있다고 적는다. */
export function buildFieldReport(kind: Kind, title: string, rows: Row[], notes: Partial<Notes>, mode: Mode, date: string, labels: Partial<Record<NoteKey, string>> = {}): string {
  const label = (k: NoteKey) => labels[k] ?? NOTE_LABELS[k];
  const text = (k: NoteKey) => notes[k]?.trim() || '(미작성)';
  const cell = (r: Row, k: string) => choices(kind, k)?.[r[k]] ?? (r[k] || '미확인');
  const lines = [
    `# ${title}`,
    `작성일 ${date}. 자료 구분: ${mode === 'real' ? '내 실제 관찰' : '가상 데모 자료(실제 결과 아님)'}. 기록 ${rows.length}행.`,
    `## 1. ${label('question')}`, text('question'),
    `## 2. ${label('hypothesis')}`, text('hypothesis'),
    `## 3. ${label('controls')}`, text('controls'),
    '## 4. 관찰 원자료',
    rows.length ? rows.map((r, i) => `${i + 1}) ${FIELDS[kind].map((k) => `${LABELS[k]}: ${cell(r, k)}`).join('; ')}`).join('\n') : '(기록 없음)',
    '## 5. 계산 결과',
    summaryRows(kind, rows).map(([k, v]) => `- ${k}: ${v}`).join('\n'),
    '빈 값과 미확인은 0이나 실패로 바꾸지 않고 따로 셌습니다.',
    `## 6. ${label('interpretation')}`, text('interpretation'),
    `## 7. ${label('conclusion')}`, text('conclusion'),
    `## 8. ${label('defense')}`, text('defense'),
    `## 9. ${label('limits')}`, text('limits'),
    `## 10. ${label('application')}`, text('application'),
    `## 11. ${label('explain')}`, text('explain'),
    '## 실행 경계',
    '이 기기의 해당 기능 실행은 미검증입니다. 관찰 하나만으로 공격, 의도, 인증, 위치 위조를 증명하지 않습니다.',
  ];
  return lines.join('\n\n') + '\n';
}
