import { choices, FIELDS, LABELS, NOTE_KEYS, STATUS, type Kind, type Row } from '../fieldwork.ts';
import type { Guide } from './types.ts';

export interface Table { caption: string; head: string[]; rows: string[][] }

export const fieldTable = (kind: Kind, rows: Row[]): Table => ({
  caption: `가상 골든 데이터 ${rows.length}행. 실제 측정값이 아닙니다.`,
  head: FIELDS[kind].map((k) => LABELS[k]),
  rows: rows.map((r) => FIELDS[kind].map((k) => choices(kind, k)?.[r[k]] ?? (r[k] || '빈 값'))),
});

export const noteFields = (guide: Guide, keys: readonly string[] = NOTE_KEYS) =>
  keys.map((key) => ({ key, ...guide.notes[key as keyof Guide['notes']] }));

export const noteLabels = (guide: Guide) => Object.fromEntries(NOTE_KEYS.map((k) => [k, guide.notes[k].label]));

export { STATUS };

export const wifiTable = (rows: import('../workbook.ts').WifiObservation[]): Table => ({
  caption: `가상 골든 데이터 ${rows.length}행. 실제 측정값이 아닙니다.`,
  head: ['반복', '방', '조건', '거리', '상태', 'RSSI', '채널', '시각', '별칭', '메모'],
  rows: rows.map((r) => [String(r.trial), r.room, r.condition, `${r.distanceM}m`, { observed: '값 관찰됨', 'not-observed': '신호 못 찾음', unchecked: '측정하지 못함' }[r.status], r.rssiDbm === null ? '빈 값' : `${r.rssiDbm}dBm`, r.channel === null ? '빈 값' : String(r.channel), r.observedAt.replace('T', ' '), `${r.ssidAlias}, ${r.bssidAlias}`, r.note || '빈 값']),
});

export const csvTable = (source: import('../pseudonym.ts').CsvSource): Table => ({
  caption: `가상 원본 ${source.rows.length}행. 값은 모두 가짜입니다.`,
  head: source.header,
  rows: source.rows.map((r) => r.map((v) => v || '빈 값')),
});
