// Wi-Fi 첫 수직 슬라이스. NFC 형식은 유지하고 CSV의 안전한 기본 함수만 재사용한다.
import { MAX_BYTES, csvCell, mdEscape, newId, parseCsv, uncsvText } from './nfc.ts';

export type WorkbookDataType = 'real' | 'demo';
export type ObservationStatus = 'observed' | 'not-observed' | 'unchecked';
export interface WifiObservation {
  id: string;
  dataType: WorkbookDataType;
  trial: number;
  room: string;
  condition: string;
  distanceM: number;
  status: ObservationStatus;
  rssiDbm: number | null;
  channel: number | null;
  observedAt: string;
  ssidAlias: string;
  bssidAlias: string;
  note: string;
}
export type WifiNotes = Record<string, string>;
export const WIFI_STORAGE_KEY = 'esp32div.lab.wifi-rssi.v1';
export const WIFI_CSV_FILENAME = 'wifi-rssi-observations.csv';
export const WIFI_CSV_COLUMNS = [
  'schema_version', 'workbook_id', 'observation_id', 'trial', 'room', 'condition', 'distance_m',
  'observation_status', 'rssi_dbm', 'channel', 'observed_at', 'ssid_alias', 'bssid_alias', 'note', 'data_type',
] as const;
export const WIFI_NOTE_COLUMNS = ['schema_version', 'workbook_id', 'field', 'value'] as const;
export const WIFI_NOTE_KEYS = [
  'question', 'motivation', 'hypothesis', 'controls', 'plan', 'interpretation', 'conclusion',
  'security', 'unexpected', 'followup', 'defense', 'limits', 'interview',
] as const;
export const WIFI_DEFAULT_NOTES: WifiNotes = { question: '방마다 Wi-Fi 신호가 다른 이유는 무엇일까?' };
export const WIFI_MAX_ROWS = 5000;
export { MAX_BYTES as WORKBOOK_MAX_BYTES };
const clean = (value: string) => value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();

export function validateWifiObservation(raw: Record<string, string>, dataType?: WorkbookDataType): WifiObservation | string {
  const trial = Number(raw.trial);
  if (!/^\d+$/.test(raw.trial ?? '') || trial < 1 || trial > 9999) return '반복 번호는 1~9999 사이의 정수여야 합니다.';
  const room = clean(raw.room ?? '');
  if (!room || room.length > 40) return '방·위치는 1~40자로 적어 주세요.';
  const condition = clean(raw.condition ?? '');
  if (!condition || condition.length > 40) return '관찰 조건은 1~40자로 적어 주세요.';
  const distanceM = Number(raw.distance_m);
  if (!(raw.distance_m ?? '').trim() || !Number.isFinite(distanceM) || distanceM < 0 || distanceM > 100) return '거리는 0~100m 사이의 숫자여야 합니다.';
  const status = clean(raw.observation_status ?? '') as ObservationStatus;
  if (!['observed', 'not-observed', 'unchecked'].includes(status)) return '관찰 상태를 다시 골라 주세요.';
  let rssiDbm: number | null = null;
  const rssi = (raw.rssi_dbm ?? '').trim();
  if (status === 'observed') {
    rssiDbm = Number(rssi);
    if (!/^-?\d+$/.test(rssi) || rssiDbm < -120 || rssiDbm > 0) return 'RSSI는 -120~0 사이의 정수여야 합니다.';
  } else if (rssi) return '신호를 찾지 못했거나 측정하지 못한 기록은 RSSI를 비워 주세요.';
  const channelText = (raw.channel ?? '').trim();
  const channel = channelText ? Number(channelText) : null;
  if (channel !== null && (!/^\d+$/.test(channelText) || channel < 1 || channel > 14)) return '채널은 1~14 사이의 정수 또는 빈 값이어야 합니다.';
  const observedAt = clean(raw.observed_at ?? '');
  const date = new Date(observedAt);
  const parts = observedAt.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!parts || Number.isNaN(date.getTime()) || [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()].some((n, i) => n !== Number(parts[i + 1]))) return '실제 존재하는 관찰 날짜와 시간을 골라 주세요.';
  const ssidAlias = clean(raw.ssid_alias ?? '');
  const bssidAlias = clean(raw.bssid_alias ?? '');
  if (ssidAlias.length > 40 || bssidAlias.length > 40) return '네트워크 별칭은 40자 이하여야 합니다.';
  const note = clean(raw.note ?? '');
  if (note.length > 500) return '관찰 메모는 500자 이하여야 합니다.';
  const type = dataType ?? clean(raw.data_type ?? 'real');
  if (type !== 'real' && type !== 'demo') return 'data_type은 real 또는 demo여야 합니다.';
  const id = raw.observation_id ?? newId();
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) return '관찰 식별자 형식이 맞지 않습니다.';
  return { id, dataType: type, trial, room, condition, distanceM, status, rssiDbm, channel, observedAt, ssidAlias, bssidAlias, note };
}

export function wifiObservationsToCsv(rows: WifiObservation[]): string {
  const body = rows.map((r) => [
    1, 'wifi-rssi', r.id, r.trial, r.room, r.condition, r.distanceM, r.status, r.rssiDbm ?? '', r.channel ?? '',
    r.observedAt, r.ssidAlias, r.bssidAlias, r.note, r.dataType,
  ].map(csvCell).join(','));
  return `﻿${[WIFI_CSV_COLUMNS.join(','), ...body].join('\r\n')}\r\n`;
}
export function wifiNotesToCsv(notes: WifiNotes): string {
  return `﻿${[WIFI_NOTE_COLUMNS.join(','), ...WIFI_NOTE_KEYS.filter((key) => notes[key]?.trim()).map((key) => [1, 'wifi-rssi', key, notes[key]].map(csvCell).join(','))].join('\r\n')}\r\n`;
}
export interface WifiImportError { line: number; message: string }
export type WifiImport =
  | { kind: 'observations'; observations: WifiObservation[]; errors: WifiImportError[] }
  | { kind: 'notes'; notes: WifiNotes; errors: WifiImportError[] }
  | { kind: 'invalid'; errors: WifiImportError[] };

export function importWifiCsv(text: string): WifiImport {
  let rows;
  try { rows = parseCsv(text); }
  catch (error) { return { kind: 'invalid', errors: [{ line: 0, message: (error as Error).message }] }; }
  if (!rows.length) return { kind: 'invalid', errors: [{ line: 0, message: '비어 있는 파일입니다.' }] };
  if (rows.length - 1 > WIFI_MAX_ROWS) return { kind: 'invalid', errors: [{ line: 0, message: `한 번에 ${WIFI_MAX_ROWS}행까지 가져올 수 있습니다.` }] };
  const header = rows[0].cells.map((h) => h.trim());
  const isNotes = header.join(',') === WIFI_NOTE_COLUMNS.join(',');
  if (!isNotes && header.join(',') !== WIFI_CSV_COLUMNS.join(',')) return { kind: 'invalid', errors: [{ line: 1, message: '이 Wi-Fi 워크북의 기록 또는 서술 CSV를 골라 주세요. NFC 등 다른 워크북 파일은 해당 페이지에서 엽니다.' }] };
  const observations: WifiObservation[] = [], errors: WifiImportError[] = [];
  const notes: WifiNotes = {};
  for (const row of rows.slice(1)) {
    if (row.cells.length !== header.length) { errors.push({ line: row.line, message: '열 개수가 머리글과 다릅니다.' }); continue; }
    const raw = Object.fromEntries(header.map((h, i) => [h, uncsvText(row.cells[i])]));
    if (raw.schema_version !== '1' || raw.workbook_id !== 'wifi-rssi') return { kind: 'invalid', errors: [{ line: row.line, message: '다른 워크북이나 지원하지 않는 버전입니다. 이 파일은 반영하지 않습니다.' }] };
    if (isNotes) {
      if (!(WIFI_NOTE_KEYS as readonly string[]).includes(raw.field) || raw.value.length > 4000 || Object.hasOwn(notes, raw.field)) errors.push({ line: row.line, message: '서술 항목이 중복되었거나 허용 항목·4000자 제한에 맞지 않습니다.' });
      else notes[raw.field] = raw.value;
    } else {
      const result = validateWifiObservation(raw);
      if (typeof result === 'string') errors.push({ line: row.line, message: result });
      else observations.push(result);
    }
  }
  return isNotes ? { kind: 'notes', notes, errors } : { kind: 'observations', observations, errors };
}

const observationKey = (row: WifiObservation) => JSON.stringify([row.dataType, row.trial, row.room, row.condition, row.distanceM, row.status, row.rssiDbm, row.channel, row.observedAt, row.ssidAlias, row.bssidAlias, row.note]);
export function mergeWifiObservations(existing: WifiObservation[], incoming: WifiObservation[]) {
  const seen = new Map(existing.map((row) => [row.id, observationKey(row)]));
  const fresh: WifiObservation[] = [];
  let skipped = 0, conflicts = 0;
  for (const row of incoming) {
    const previous = seen.get(row.id), key = observationKey(row);
    if (previous !== undefined) { if (previous === key) skipped++; else conflicts++; }
    else { seen.set(row.id, key); fresh.push(row); }
  }
  if (existing.length + fresh.length > WIFI_MAX_ROWS) throw new Error(`저장 가능한 기록은 ${WIFI_MAX_ROWS}건까지입니다.`);
  return { observations: [...existing, ...fresh], added: fresh.length, skipped, conflicts };
}

export interface WifiRoomSummary {
  room: string; count: number; average: number | null; median: number | null; min: number | null; max: number | null;
  notObserved: number; unchecked: number;
}
export function summarizeWifiByRoom(rows: WifiObservation[]): WifiRoomSummary[] {
  const groups = new Map<string, WifiObservation[]>();
  for (const row of rows) { const group = groups.get(row.room) ?? []; group.push(row); groups.set(row.room, group); }
  return [...groups.entries()].map(([room, group]) => {
    const values = group.filter((row) => row.status === 'observed' && row.rssiDbm !== null).map((row) => row.rssiDbm as number).sort((a, b) => a - b);
    const count = values.length;
    return { room, count, average: count ? values.reduce((a, b) => a + b, 0) / count : null,
      median: count ? (values[Math.floor((count - 1) / 2)] + values[Math.floor(count / 2)]) / 2 : null,
      min: count ? values[0] : null, max: count ? values[count - 1] : null,
      notObserved: group.filter((row) => row.status === 'not-observed').length, unchecked: group.filter((row) => row.status === 'unchecked').length };
  }).sort((a, b) => a.room.localeCompare(b.room, 'ko'));
}

export function demoWifiObservations(): WifiObservation[] {
  return ['거실', '방 1', '방 2'].flatMap((room, i) => [-1, 2, 0].map((offset, j) => ({
    id: newId(), dataType: 'demo' as const, trial: j + 1, room, condition: '문 열림', distanceM: 2 + i * 4,
    status: 'observed' as const, rssiDbm: -42 - i * 18 + offset, channel: 6, observedAt: `2026-11-04T18:${String(i * 15 + j * 5).padStart(2, '0')}`,
    ssidAlias: 'AP-A', bssidAlias: '공유기-거실', note: '가상 값',
  })));
}

/** 초기 개발본의 저장 객체도 읽되, 알 수 없는 형식은 덮어쓰지 않도록 호출자에게 알린다. */
export function restoreWifiState(raw: string): { observations: WifiObservation[]; notes: WifiNotes; dropped: number } {
  const stored = JSON.parse(raw);
  if (!stored || typeof stored !== 'object' || Array.isArray(stored) || !Array.isArray(stored.observations) || !stored.notes || typeof stored.notes !== 'object' || Array.isArray(stored.notes) || (stored.schemaVersion !== undefined && stored.schemaVersion !== 1) || (stored.workbookId !== undefined && stored.workbookId !== 'wifi-rssi')) throw new Error('저장 형식 또는 버전이 맞지 않습니다.');
  const observations: WifiObservation[] = [];
  const notes: WifiNotes = { ...WIFI_DEFAULT_NOTES };
  let dropped = 0;
  const seenIds = new Set<string>();
  for (const row of stored.observations) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) { dropped++; continue; }
    const checked = validateWifiObservation({ trial: String(row.trial ?? ''), room: String(row.room ?? ''), condition: String(row.condition ?? ''), distance_m: String(row.distanceM ?? ''), observation_status: String(row.status ?? ''), rssi_dbm: row.rssiDbm === null ? '' : String(row.rssiDbm ?? ''), channel: row.channel === null ? '' : String(row.channel ?? ''), observed_at: String(row.observedAt ?? ''), ssid_alias: String(row.ssidAlias ?? ''), bssid_alias: String(row.bssidAlias ?? ''), note: String(row.note ?? ''), data_type: String(row.dataType ?? ''), ...(typeof row.id === 'string' ? { observation_id: row.id } : {}) });
    if (typeof checked === 'string' || seenIds.has(checked.id)) dropped++;
    else { seenIds.add(checked.id); observations.push(checked); }
  }
  for (const [key, value] of Object.entries(stored.notes)) {
    if (!(WIFI_NOTE_KEYS as readonly string[]).includes(key) || typeof value !== 'string' || value.length > 4000) dropped++;
    else notes[key] = value;
  }
  return { observations, notes, dropped };
}

const note = (notes: WifiNotes, key: string) => notes[key]?.trim() || '(아직 작성하지 않음)';
const mdTableCell = (value: string) => mdEscape(value).replace(/\r?\n/g, ' ');
export function buildWifiReport(rows: WifiObservation[], notes: WifiNotes, dataType: WorkbookDataType, date: string): string {
  const selected = rows.filter((row) => row.dataType === dataType);
  const summary = summarizeWifiByRoom(selected);
  const table = summary.length ? ['| 방·위치 | 유효 n | 중앙값 | 평균 | 최소~최대 | 신호 못 찾음 | 미측정 |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: |', ...summary.map((g) => `| ${mdTableCell(g.room)} | ${g.count} | ${g.median ?? '—'} | ${g.average?.toFixed(1) ?? '—'} | ${g.min ?? '—'}~${g.max ?? '—'} | ${g.notObserved} | ${g.unchecked} |`)].join('\n') : '입력된 기록이 없습니다.';
  const fields = [
    ['motivation', '탐구 동기'], ['hypothesis', '가설'], ['controls', '고정 조건'], ['plan', '반복 계획'],
    ['interpretation', '결과 해석'], ['conclusion', '결론'], ['security', '보안 질문'], ['unexpected', '예상 밖 결과와 원인 후보'],
    ['followup', '추가 실험'], ['defense', '방어 설계'], ['limits', '한계'], ['interview', '면접에서 설명하기'],
  ];
  return `# ${mdEscape(note(notes, 'question'))}\n\n작성일 ${date}, ${dataType === 'demo' ? '데모' : '실제'} 기록 ${selected.length}건\n\n${dataType === 'demo' ? '> **데모 자료의 가상 값입니다. 실제 실험 결과가 아닙니다.**\n\n' : ''}## 방별 결과 (dBm)\n\n${table}\n\n결측 RSSI는 집계에서 제외했습니다. 평균은 dBm 수치의 산술평균이며 전력의 평균이나 속도·침입 가능성을 뜻하지 않습니다.\n\n${fields.map(([key, label]) => `## ${label}\n\n${mdEscape(note(notes, key))}`).join('\n\n')}\n\n## 원자료와 출처\n\n관찰 CSV와 탐구 서술 CSV를 함께 보관합니다. 실제로 쓴 관찰 도구와 참고 자료를 보고서에 덧붙이세요.\n`;
}

export const WIFI_PYTHON = `# 같은 폴더에 실제 기록 CSV를 놓고 실행: python3 wifi-rssi-analysis.py
import csv
import re
from collections import defaultdict
from statistics import mean, median

def restore(text):
    return text[1:] if re.match(r"^'+\\s*[=+\\-@]", text) else text

with open("wifi-rssi-observations.csv", encoding="utf-8-sig", newline="") as f:
    reader = csv.DictReader(f)
    required = {"schema_version", "workbook_id", "room", "data_type", "observation_status", "rssi_dbm"}
    if not required.issubset(reader.fieldnames or []):
        raise ValueError("이 워크북의 관찰 CSV를 사용하세요.")
    rooms = defaultdict(lambda: {"values": [], "not-observed": 0, "unchecked": 0})
    for row in reader:
        if row["schema_version"] != "1" or row["workbook_id"] != "wifi-rssi":
            raise ValueError("워크북 또는 버전이 다릅니다.")
        if row["data_type"] == "demo":
            continue
        if row["data_type"] != "real":
            raise ValueError("자료 종류가 올바르지 않습니다.")
        group = rooms[restore(row["room"])]
        status = row["observation_status"]
        if status == "observed":
            value = int(row["rssi_dbm"])
            if not -120 <= value <= 0:
                raise ValueError("RSSI 범위를 확인하세요.")
            group["values"].append(value)
        elif status in ("not-observed", "unchecked") and not row["rssi_dbm"]:
            group[status] += 1
        else:
            raise ValueError("관찰 상태와 결측값을 확인하세요.")
for room, group in sorted(rooms.items()):
    values = group["values"]
    print(room, "유효 n:", len(values), "중앙값:", median(values) if values else None,
          "평균:", round(mean(values), 1) if values else None,
          "범위:", (min(values), max(values)) if values else None,
          "신호 못 찾음:", group["not-observed"], "미측정:", group["unchecked"])
if not rooms:
    print("실제 기록이 없습니다.")
`;
