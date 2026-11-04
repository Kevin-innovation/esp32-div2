// NFC 실험의 순수 로직: CSV, 검증, 집계, 보고서, 파이썬. DOM을 쓰지 않아 node로 바로 검사한다.

export type DataType = 'real' | 'demo';

export interface Trial {
  id: string;
  dataType: DataType;
  trial: number;
  condition: string;
  contents: string;
  distanceCm: number;
  orientation: string;
  success: 0 | 1;
  note: string;
}

export type Notes = Record<string, string>;
export type GroupBy = 'condition' | 'distanceCm' | 'orientation' | 'contents';

export interface Group {
  key: string;
  attempts: number;
  successes: number;
  rate: number;
}

export const CSV_FILENAME = 'nfc-experiment.csv';
export const CSV_COLUMNS = ['trial', 'condition', 'contents', 'distance_cm', 'orientation', 'success', 'note', 'data_type'] as const;
export const NOTE_COLUMNS = ['field', 'value'] as const;
export const DEFAULT_QUESTION = 'NFC는 지갑·가방 안에서도 인식될까?';
export const CONDITION_ORDER = ['단독', '지갑', '가방'];
export const ORIENTATIONS = ['평행', '비스듬히', '수직'];

// 탐구 서술 입력칸 전체. 서술 CSV는 이 목록에 있는 항목만 받는다.
export const NOTE_KEYS = [
  'question', 'motivation', 'hypothesis', 'independent', 'controlled', 'plan', 'tag', 'reader',
  'interpretation', 'conclusion', 'unexpected', 'causes', 'followup', 'security', 'limits',
  'nextQuestions',
  'q_curiosity', 'q_design', 'q_unexpected', 'q_verify', 'q_limit',
] as const;

export const MAX_ROWS = 5000;
export const MAX_BYTES = 1024 * 1024;
const MAX_LABEL = 40;
const MAX_NOTE = 500;
const MAX_DISTANCE = 100;
export const MAX_NOTE_FIELD = 4000;

/* CSV ------------------------------------------------------------------ */

export interface CsvRow {
  line: number;
  cells: string[];
}

/** RFC 4180 파서. 따옴표 안의 쉼표·줄바꿈·겹따옴표를 처리하고, 짝이 안 맞으면 오류를 던진다. */
export function parseCsv(input: string): CsvRow[] {
  const text = input.replace(/^﻿/, '');
  const rows: CsvRow[] = [];
  let cells: string[] = [];
  let cell = '';
  let line = 1;
  let rowLine = 1;
  let inQuotes = false;
  let quoteLine = 1;
  let afterQuote = false;

  const endCell = () => {
    cells.push(cell);
    cell = '';
    afterQuote = false;
  };
  const endRow = () => {
    endCell();
    if (cells.length > 1 || cells[0] !== '') rows.push({ line: rowLine, cells });
    cells = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
        afterQuote = true;
      } else {
        if (c === '\n') line++;
        cell += c;
      }
    } else if (c === '"') {
      if (cell !== '' || afterQuote) throw new Error(`${line}행: 따옴표는 칸의 맨 앞에서만 열 수 있습니다.`);
      inQuotes = true;
      quoteLine = line;
    } else if (c === ',') {
      endCell();
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      endRow();
      line++;
      rowLine = line;
    } else {
      if (afterQuote) throw new Error(`${line}행: 닫는 따옴표 뒤에는 쉼표나 줄바꿈만 올 수 있습니다.`);
      cell += c;
    }
  }
  if (inQuotes) throw new Error(`${quoteLine}행: 따옴표가 닫히지 않았습니다.`);
  if (cell !== '' || cells.length) endRow();
  return rows;
}

const FORMULA = /^'*\s*[=+\-@]/;

/** 스프레드시트 수식으로 실행되지 않도록 앞에 작은따옴표를 붙이고, CSV 규칙대로 감싼다. */
export function csvCell(value: string | number): string {
  let s = String(value);
  if (typeof value === 'string' && FORMULA.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** csvCell이 붙인 작은따옴표만 되돌린다. */
export function uncsvText(value: string): string {
  return /^'+\s*[=+\-@]/.test(value) ? value.slice(1) : value;
}

const BOM = '﻿';

export function trialsToCsv(trials: Trial[]): string {
  const rows = trials.map((t) =>
    [t.trial, t.condition, t.contents, t.distanceCm, t.orientation, t.success, t.note, t.dataType].map(csvCell).join(','),
  );
  return `${BOM}${[CSV_COLUMNS.join(','), ...rows].join('\r\n')}\r\n`;
}

export function notesToCsv(notes: Notes): string {
  const rows = Object.entries(notes)
    .filter(([, v]) => v.trim() !== '')
    .map(([k, v]) => [csvCell(k), csvCell(v)].join(','));
  return `${BOM}${[NOTE_COLUMNS.join(','), ...rows].join('\r\n')}\r\n`;
}

export interface ImportError {
  line: number;
  message: string;
}

export type Imported =
  | { kind: 'trials'; trials: Trial[]; errors: ImportError[] }
  | { kind: 'notes'; notes: Notes; errors: ImportError[] }
  | { kind: 'invalid'; errors: ImportError[] };

const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();

let counter = 0;
export const newId = () => `t${Date.now().toString(36)}${(counter++).toString(36)}`;

/** 한 행을 Trial로 바꾼다. 형식이 틀리면 이유를 문자열로 돌려준다. */
export function validateTrial(raw: Record<string, string>, dataType?: DataType): Trial | string {
  const trial = Number(raw.trial);
  if (!/^\d+$/.test(raw.trial ?? '') || trial < 1 || trial > 9999) return 'trial은 1 이상의 정수여야 합니다.';
  const condition = clean(raw.condition ?? '');
  if (!condition || condition.length > MAX_LABEL) return `condition은 1~${MAX_LABEL}자여야 합니다.`;
  const contents = clean(raw.contents ?? '');
  if (contents.length > MAX_LABEL) return `contents는 ${MAX_LABEL}자 이하여야 합니다.`;
  const distanceCm = Number(raw.distance_cm);
  if (raw.distance_cm === undefined || raw.distance_cm.trim() === '' || !Number.isFinite(distanceCm) || distanceCm < 0 || distanceCm > MAX_DISTANCE) {
    return `distance_cm은 0~${MAX_DISTANCE} 사이의 숫자여야 합니다.`;
  }
  const orientation = clean(raw.orientation ?? '');
  if (!orientation || orientation.length > MAX_LABEL) return `orientation은 1~${MAX_LABEL}자여야 합니다.`;
  const s = (raw.success ?? '').trim().toLowerCase();
  const success = s === '1' || s === 'true' || s === '성공' ? 1 : s === '0' || s === 'false' || s === '실패' ? 0 : null;
  if (success === null) return 'success는 1 또는 0이어야 합니다.';
  const note = clean(raw.note ?? '');
  if (note.length > MAX_NOTE) return `note는 ${MAX_NOTE}자 이하여야 합니다.`;
  const type = dataType ?? ((raw.data_type ?? 'real').trim() || 'real');
  if (type !== 'real' && type !== 'demo') return 'data_type은 real 또는 demo여야 합니다.';
  return { id: newId(), dataType: type, trial, condition, contents, distanceCm, orientation, success, note };
}

/** 사용자가 고른 CSV를 읽는다. 머리글로 기록/서술을 구분하고, 틀린 행은 번호와 이유를 남긴다. */
export function importCsv(text: string, noteKeys: readonly string[]): Imported {
  let rows: CsvRow[];
  try {
    rows = parseCsv(text);
  } catch (e) {
    return { kind: 'invalid', errors: [{ line: 0, message: (e as Error).message }] };
  }
  if (!rows.length) return { kind: 'invalid', errors: [{ line: 0, message: '비어 있는 파일입니다.' }] };
  if (rows.length - 1 > MAX_ROWS) return { kind: 'invalid', errors: [{ line: 0, message: `한 번에 ${MAX_ROWS}행까지 가져올 수 있습니다.` }] };

  const header = rows[0].cells.map((h) => h.trim());
  const errors: ImportError[] = [];

  const repeated = header.filter((h, i) => header.indexOf(h) !== i);
  if (repeated.length) {
    return { kind: 'invalid', errors: [{ line: rows[0].line, message: `머리글이 중복되었습니다: ${[...new Set(repeated)].join(', ')}` }] };
  }

  if (header.join(',') === NOTE_COLUMNS.join(',')) {
    const notes: Notes = {};
    for (const r of rows.slice(1)) {
      if (r.cells.length !== NOTE_COLUMNS.length) {
        errors.push({ line: r.line, message: `열 개수가 ${NOTE_COLUMNS.length}개가 아니라 ${r.cells.length}개입니다.` });
        continue;
      }
      const [field, value] = [r.cells[0].trim(), uncsvText(r.cells[1])];
      if (!noteKeys.includes(field)) errors.push({ line: r.line, message: `알 수 없는 항목 ${field || '(빈 값)'}` });
      else if (value.length > MAX_NOTE_FIELD) errors.push({ line: r.line, message: `${MAX_NOTE_FIELD}자를 넘습니다.` });
      else notes[field] = value;
    }
    return { kind: 'notes', notes, errors };
  }

  const required = ['trial', 'condition', 'distance_cm', 'orientation', 'success'];
  const missing = required.filter((c) => !header.includes(c));
  if (missing.length) {
    return { kind: 'invalid', errors: [{ line: rows[0].line, message: `필수 열이 없습니다: ${missing.join(', ')}` }] };
  }

  const trials: Trial[] = [];
  for (const r of rows.slice(1)) {
    if (r.cells.length !== header.length) {
      errors.push({ line: r.line, message: `열 개수가 ${header.length}개가 아니라 ${r.cells.length}개입니다.` });
      continue;
    }
    const raw = Object.fromEntries(header.map((h, i) => [h, uncsvText(r.cells[i])]));
    const result = validateTrial(raw);
    if (typeof result === 'string') errors.push({ line: r.line, message: result });
    else trials.push(result);
  }
  return { kind: 'trials', trials, errors };
}

const trialKey = (t: Trial) => JSON.stringify([t.dataType, t.trial, t.condition, t.contents, t.distanceCm, t.orientation, t.success, t.note]);

/** 백업을 다시 가져와도 기록이 두 배가 되지 않도록, 값이 완전히 같은 행은 건너뛴다. */
export function mergeTrials(existing: Trial[], incoming: Trial[]): { trials: Trial[]; added: number; skipped: number } {
  const seen = new Set(existing.map(trialKey));
  const fresh = incoming.filter((t) => {
    const k = trialKey(t);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { trials: [...existing, ...fresh], added: fresh.length, skipped: incoming.length - fresh.length };
}

/* 집계 ------------------------------------------------------------------ */

const conditionRank = (k: string) => {
  const i = CONDITION_ORDER.indexOf(k);
  return i === -1 ? CONDITION_ORDER.length : i;
};

export function groupKey(t: Trial, by: GroupBy): string {
  if (by === 'distanceCm') return String(t.distanceCm);
  return t[by] || '(비어 있음)';
}

export function aggregate(trials: Trial[], by: GroupBy): Group[] {
  const map = new Map<string, Group>();
  for (const t of trials) {
    const key = groupKey(t, by);
    const g = map.get(key) ?? { key, attempts: 0, successes: 0, rate: 0 };
    map.set(key, { ...g, attempts: g.attempts + 1, successes: g.successes + t.success });
  }
  const groups = [...map.values()].map((g) => ({ ...g, rate: g.successes / g.attempts }));
  if (by === 'distanceCm') return groups.sort((a, b) => Number(a.key) - Number(b.key));
  if (by === 'condition') return groups.sort((a, b) => conditionRank(a.key) - conditionRank(b.key) || a.key.localeCompare(b.key, 'ko'));
  return groups.sort((a, b) => a.key.localeCompare(b.key, 'ko'));
}

export interface CrossTab {
  distances: number[];
  rows: { condition: string; cells: ({ attempts: number; successes: number } | null)[] }[];
}

export const MAX_CROSS_ROWS = 12;
export const MAX_CROSS_COLS = 12;

/** 조건×거리 표. 칸이 너무 많으면 읽을 수 없으므로 null을 돌려주고, 화면이 이유를 안내한다. */
export function crossTab(trials: Trial[]): CrossTab | null {
  const distances = [...new Set(trials.map((t) => t.distanceCm))].sort((a, b) => a - b);
  const groups = aggregate(trials, 'condition');
  if (groups.length > MAX_CROSS_ROWS || distances.length > MAX_CROSS_COLS) return null;
  const counts = new Map<string, { attempts: number; successes: number }>();
  for (const t of trials) {
    const key = `${t.condition}|${t.distanceCm}`;
    const c = counts.get(key) ?? { attempts: 0, successes: 0 };
    counts.set(key, { attempts: c.attempts + 1, successes: c.successes + t.success });
  }
  const rows = groups.map((g) => ({ condition: g.key, cells: distances.map((d) => counts.get(`${g.key}|${d}`) ?? null) }));
  return { distances, rows };
}

export const percent = (rate: number) => `${Math.round(rate * 100)}%`;
export const fraction = (g: { successes: number; attempts: number }) => `${g.successes}/${g.attempts}`;

/** 해석을 흐리는 설계 문제를 찾아 문장으로 알려 준다. 결과를 대신 판단하지는 않는다. */
export function designWarnings(trials: Trial[], minRepeats = 5): string[] {
  if (!trials.length) return [];
  const out: string[] = [];
  const conditions = aggregate(trials, 'condition');
  const thin = conditions.filter((g) => g.attempts < minRepeats).map((g) => `${g.key} ${g.attempts}회`);
  if (thin.length) out.push(`반복이 ${minRepeats}회보다 적은 조건이 있습니다: ${thin.join(', ')}. 우연의 영향이 큽니다.`);
  const setup = (cond: string) =>
    [...new Set(trials.filter((t) => t.condition === cond).map((t) => `${t.distanceCm}/${t.orientation}`))].sort().join('|');
  if (conditions.length > 1 && new Set(conditions.map((g) => setup(g.key))).size > 1) {
    out.push('조건마다 거리·방향 구성이 다릅니다. 인식률 차이가 조건 때문인지 거리·방향 때문인지 나눌 수 없습니다.');
  }
  return out;
}

/* 데모 자료 --------------------------------------------------------------- */

/** 화면 동작을 보여 주는 가상 값. 측정값이 아니므로 data_type=demo로 고정한다. */
export function demoTrials(): Trial[] {
  const plan: [string, string, number, number[]][] = [
    ['단독', '없음', 1, [1, 1, 1, 1, 1]],
    ['단독', '없음', 3, [1, 1, 1, 1, 0]],
    ['지갑', '빈 지갑', 1, [1, 1, 1, 1, 0]],
    ['지갑', '빈 지갑', 3, [1, 0, 1, 0, 0]],
    ['가방', '천 가방', 1, [1, 1, 1, 0, 1]],
    ['가방', '천 가방', 3, [0, 1, 0, 0, 0]],
  ];
  return plan.flatMap(([condition, contents, distanceCm, results]) =>
    results.map((r, i) => ({
      id: newId(),
      dataType: 'demo' as const,
      trial: i + 1,
      condition,
      contents,
      distanceCm,
      orientation: '평행',
      success: r as 0 | 1,
      note: '가상 값',
    })),
  );
}

/* 보고서 ------------------------------------------------------------------ */

export type Block =
  | { type: 'h1' | 'h2' | 'p' | 'warn'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; head: string[]; rows: string[][] };

export const EMPTY_NOTE = '(아직 작성하지 않음)';
const noteOr = (notes: Notes, key: string) => notes[key]?.trim() || EMPTY_NOTE;

export interface ReportInput {
  trials: Trial[];
  notes: Notes;
  dataType: DataType;
  date: string;
  sources: { title: string; url: string }[];
}

export function buildReport({ trials, notes, dataType, date, sources }: ReportInput): Block[] {
  const blocks: Block[] = [{ type: 'h1', text: notes.question?.trim() || DEFAULT_QUESTION }];
  blocks.push({ type: 'p', text: `작성일 ${date}, ${dataType === 'demo' ? '데모' : '실제'} 기록 ${trials.length}건을 바탕으로 만들었습니다.` });
  if (dataType === 'demo') blocks.push({ type: 'warn', text: '이 보고서의 수치는 데모 자료(가상 값)입니다. 실제 실험 결과로 제출하거나 인용하면 안 됩니다.' });

  blocks.push({ type: 'h2', text: '1. 궁금했던 점과 가설' });
  blocks.push({ type: 'p', text: `탐구 동기: ${noteOr(notes, 'motivation')}` });
  blocks.push({ type: 'p', text: `가설: ${noteOr(notes, 'hypothesis')}` });
  blocks.push({ type: 'h2', text: '2. 실험 설계' });
  blocks.push({
    type: 'list',
    items: [
      `바꾼 변수: ${noteOr(notes, 'independent')}`,
      `고정한 조건: ${noteOr(notes, 'controlled')}`,
      `반복 계획: ${noteOr(notes, 'plan')}`,
      `실험용 태그: ${noteOr(notes, 'tag')}`,
      `리더: ${noteOr(notes, 'reader')}`,
    ],
  });

  blocks.push({ type: 'h2', text: '3. 결과' });
  if (!trials.length) {
    blocks.push({ type: 'p', text: '입력된 기록이 없습니다. 결과는 기록을 입력한 뒤에 채워집니다.' });
  } else {
    const groupTable = (by: GroupBy, label: string): Block => ({
      type: 'table',
      head: [label, '성공/시도', '인식률'],
      rows: aggregate(trials, by).map((g) => [by === 'distanceCm' ? `${g.key} cm` : g.key, fraction(g), percent(g.rate)]),
    });
    blocks.push(groupTable('condition', '조건'), groupTable('distanceCm', '거리'), groupTable('orientation', '방향'));
    const warnings = designWarnings(trials);
    if (warnings.length) blocks.push({ type: 'list', items: warnings.map((w) => `주의: ${w}`) });
    blocks.push({ type: 'p', text: '그래프: 파이썬 분석으로 만든 nfc-rate-by-condition.png, nfc-rate-by-distance.png를 여기에 붙입니다.' });
  }

  blocks.push({ type: 'h2', text: '4. 해석과 결론' });
  blocks.push({ type: 'p', text: `결과 해석: ${noteOr(notes, 'interpretation')}` });
  blocks.push({ type: 'p', text: `결론: ${noteOr(notes, 'conclusion')}` });
  blocks.push({ type: 'h2', text: '5. 예상과 다른 결과' });
  blocks.push({ type: 'p', text: `무엇이 달랐나: ${noteOr(notes, 'unexpected')}` });
  blocks.push({ type: 'p', text: `원인 후보: ${noteOr(notes, 'causes')}` });
  blocks.push({ type: 'p', text: `추가 실험: ${noteOr(notes, 'followup')}` });
  blocks.push({ type: 'h2', text: '6. 일반 태그와 EMV 비접촉 결제의 차이' });
  blocks.push({ type: 'p', text: noteOr(notes, 'security') });
  blocks.push({ type: 'h2', text: '7. 한계와 배운 점' });
  blocks.push({ type: 'p', text: noteOr(notes, 'limits') });
  blocks.push({ type: 'h2', text: '8. 후속 질문' });
  blocks.push({ type: 'p', text: noteOr(notes, 'nextQuestions') });

  if (trials.length) {
    blocks.push({ type: 'h2', text: '부록. 원자료' });
    blocks.push({
      type: 'table',
      head: ['반복', '조건', '내용물', '거리(cm)', '방향', '인식', '관찰'],
      rows: trials.map((t) => [String(t.trial), t.condition, t.contents, String(t.distanceCm), t.orientation, t.success ? '성공' : '실패', t.note]),
    });
  }
  blocks.push({ type: 'h2', text: '참고 자료' });
  blocks.push({ type: 'list', items: sources.map((s) => `${s.title}: ${s.url}`) });
  return blocks;
}

/** 입력값이 마크다운·HTML로 해석되지 않게 막는다. */
export function mdEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/([\\`*_[\]|#~])/g, '\\$1')
    .replace(/^(\s*)(\d+)\./gm, '$1$2\\.')
    .replace(/^(\s*)([-+])(\s)/gm, '$1\\$2$3');
}

const mdCell = (s: string) => mdEscape(s).replace(/\r?\n/g, ' ');

export function reportToMarkdown(blocks: Block[]): string {
  return `${blocks
    .map((b) => {
      switch (b.type) {
        case 'h1':
          return `# ${mdCell(b.text)}`;
        case 'h2':
          return `## ${mdCell(b.text)}`;
        case 'warn':
          return `> **${mdCell(b.text)}**`;
        case 'p':
          return mdEscape(b.text);
        case 'list':
          return b.items.map((i) => `- ${mdCell(i)}`).join('\n');
        case 'table':
          return [`| ${b.head.map(mdCell).join(' | ')} |`, `| ${b.head.map(() => '---').join(' | ')} |`, ...b.rows.map((r) => `| ${r.map(mdCell).join(' | ')} |`)].join('\n');
      }
    })
    .join('\n\n')}\n`;
}

/* 파이썬 ------------------------------------------------------------------ */

export const PY_CELLS: { md?: string; code: string }[] = [
  {
    md: '# NFC 인식 실험 분석\n이 사이트에서 내보낸 `nfc-experiment.csv`를 이 파일과 같은 폴더에 두고 실행합니다.\n준비: `pip install pandas matplotlib`',
    code: `from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
from matplotlib import font_manager

CSV_PATH = Path("nfc-experiment.csv")
COLUMNS = ["trial", "condition", "contents", "distance_cm", "orientation", "success", "note", "data_type"]
CONDITION_ORDER = ["단독", "지갑", "가방"]

# 한글 그래프 글꼴: 설치된 것 중 첫 번째를 쓴다.
installed = {f.name for f in font_manager.fontManager.ttflist}
for name in ["AppleGothic", "Malgun Gothic", "NanumGothic", "Noto Sans CJK KR"]:
    if name in installed:
        plt.rcParams["font.family"] = name
        break
plt.rcParams["axes.unicode_minus"] = False`,
  },
  {
    md: '## 1. 읽기와 검사\n사이트가 스프레드시트 수식 방지용으로 붙인 작은따옴표를 되돌리고, 실제 기록(`data_type == "real"`)만 남깁니다.',
    code: `df = pd.read_csv(CSV_PATH, encoding="utf-8-sig", keep_default_na=False)
missing = set(COLUMNS) - set(df.columns)
if missing:
    raise SystemExit(f"CSV에 없는 열: {sorted(missing)}")

for col in ["condition", "contents", "orientation", "note"]:
    df[col] = df[col].astype(str).str.replace(r"^'(?='*\\s*[=+\\-@])", "", regex=True)

data = df[df["data_type"] == "real"].copy()
if data.empty:
    raise SystemExit("실제 기록이 없습니다. 실험 기록을 입력한 뒤 CSV를 다시 내보내세요.")
data["distance_cm"] = pd.to_numeric(data["distance_cm"])
data["success"] = data["success"].astype(int)
print(f"실제 기록 {len(data)}건")`,
  },
  {
    md: '## 2. 조건별 인식률',
    code: `def summarize(frame, column):
    table = frame.groupby(column)["success"].agg(시도="count", 성공="sum")
    table["인식률"] = table["성공"] / table["시도"]
    return table

by_condition = summarize(data, "condition")
order = [c for c in CONDITION_ORDER if c in by_condition.index]
order += [c for c in by_condition.index if c not in order]
by_condition = by_condition.loc[order]
print(by_condition)

by_distance = summarize(data, "distance_cm")
print(by_distance)

print(data.pivot_table(index="condition", columns="distance_cm", values="success", aggfunc="mean"))`,
  },
  {
    md: '## 3. 조건별 인식률 그래프\n막대 위 숫자는 성공/시도입니다. 시도가 적은 조건은 차이를 크게 해석하지 않습니다.',
    code: `fig, ax = plt.subplots(figsize=(6, 3.5))
bars = ax.bar(by_condition.index, by_condition["인식률"] * 100, color="#2f6b4f")
for bar, (_, row) in zip(bars, by_condition.iterrows()):
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 2, f"{int(row['성공'])}/{int(row['시도'])}", ha="center")
ax.set_ylim(0, 110)
ax.set_ylabel("인식률 (%)")
ax.set_title("조건별 NFC 인식률")
fig.tight_layout()
fig.savefig("nfc-rate-by-condition.png", dpi=160)`,
  },
  {
    md: '## 4. 거리에 따른 인식률\n조건마다 선 하나입니다.',
    code: `fig, ax = plt.subplots(figsize=(6, 3.5))
for condition in order:
    part = summarize(data[data["condition"] == condition], "distance_cm")
    ax.plot(part.index, part["인식률"] * 100, marker="o", label=condition)
ax.set_ylim(0, 110)
ax.set_xlabel("거리 (cm)")
ax.set_ylabel("인식률 (%)")
ax.legend(title="조건")
fig.tight_layout()
fig.savefig("nfc-rate-by-distance.png", dpi=160)
print("저장: nfc-rate-by-condition.png, nfc-rate-by-distance.png")`,
  },
];

export const pythonScript = () =>
  `${PY_CELLS.map((c) => {
    const comment = c.md ? `${c.md.split('\n').map((l) => `# ${l.replace(/^#+\s*/, '')}`).join('\n')}\n` : '';
    return `${comment}${c.code}`;
  }).join('\n\n')}\n`;

const nbLines = (s: string) => s.split('\n').map((l, i, all) => (i < all.length - 1 ? `${l}\n` : l));

export function notebookJson(): string {
  const cells = PY_CELLS.flatMap((c) => [
    ...(c.md ? [{ cell_type: 'markdown', metadata: {}, source: nbLines(c.md) }] : []),
    { cell_type: 'code', execution_count: null, metadata: {}, outputs: [], source: nbLines(c.code) },
  ]);
  return JSON.stringify(
    {
      cells,
      metadata: {
        kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
        language_info: { name: 'python' },
      },
      nbformat: 4,
      nbformat_minor: 5,
    },
    null,
    1,
  );
}
