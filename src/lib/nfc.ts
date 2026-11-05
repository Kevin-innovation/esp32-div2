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
  'nextQuestions', 'securityAsset', 'threatModel', 'securityFinding', 'defensePlan', 'residualRisk',
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
    blocks.push({ type: 'p', text: '그래프: Colab에서 만든 조건별 성공·실패, 인식률, 거리, 조건×거리, 반복 설정 그림을 여기에 붙입니다. 방향·내용물 그림은 두 종류 이상을 실제로 기록했을 때만 나옵니다.' });
  }

  blocks.push({ type: 'h2', text: '4. 보안 평가: 관찰을 방어로 연결' });
  blocks.push({ type: 'warn', text: '실험용 태그 판독 실험입니다. 시험 조건의 접근 가능성만 관찰하며 암호화, 인증, 복제 저항성, 결제 보안을 검증하지 않았습니다. 성공은 시험 조건에서 읽혔다는 뜻이고, 실패는 그 설정에서 읽지 못했다는 뜻입니다.' });
  const securityEvidence = dataType === 'demo'
    ? '데모 기록은 가상 자료이므로 보안 판단의 증거로 쓸 수 없습니다.'
    : trials.length
      ? `현재 보고서의 실제 기록 ${trials.length}회 중 ${trials.filter((trial) => trial.success).length}회가 정한 판독 성공 기준을 충족했습니다. 이 수치는 이 기기·태그·시험 조건의 관찰이며, 권한 없는 접근이나 공격 성공을 측정한 것이 아닙니다.`
      : '실제 기록이 없습니다. 판독 횟수를 입력한 뒤에만 보안 관찰을 요약할 수 있습니다.';
  blocks.push({ type: 'p', text: `기록에서 나온 보안 근거: ${securityEvidence}` });
  blocks.push({ type: 'p', text: `보호할 자산: ${noteOr(notes, 'securityAsset')}` });
  blocks.push({ type: 'p', text: `위협 모델과 시험 범위: ${noteOr(notes, 'threatModel')}` });
  blocks.push({ type: 'p', text: `실험이 보여 주는 보안 결과: ${noteOr(notes, 'securityFinding')}` });
  blocks.push({ type: 'p', text: `권장 방어: ${noteOr(notes, 'defensePlan')}` });
  blocks.push({ type: 'p', text: `남는 위험: ${noteOr(notes, 'residualRisk')}` });
  blocks.push({ type: 'h2', text: '5. 실험용 태그와 EMV 비접촉 결제의 범위' });
  blocks.push({ type: 'p', text: noteOr(notes, 'security') });
  blocks.push({ type: 'h2', text: '6. 해석과 결론' });
  blocks.push({ type: 'p', text: `결과 해석: ${noteOr(notes, 'interpretation')}` });
  blocks.push({ type: 'p', text: `결론: ${noteOr(notes, 'conclusion')}` });
  blocks.push({ type: 'h2', text: '7. 예상과 다른 결과' });
  blocks.push({ type: 'p', text: `무엇이 달랐나: ${noteOr(notes, 'unexpected')}` });
  blocks.push({ type: 'p', text: `원인 후보: ${noteOr(notes, 'causes')}` });
  blocks.push({ type: 'p', text: `추가 실험: ${noteOr(notes, 'followup')}` });
  blocks.push({ type: 'h2', text: '8. 한계와 배운 점' });
  blocks.push({ type: 'p', text: noteOr(notes, 'limits') });
  blocks.push({ type: 'h2', text: '9. 후속 질문' });
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
    md: '# NFC 인식 실험 · Colab 분석\n왜 분석할까요? 기기에서 본 한 번의 성공·실패만으로 조건 차이를 말할 수 없기 때문입니다. 반복한 원자료를 표와 그림으로 바꿔, 어디까지 말할 수 있는지 확인합니다.\n\nColab: File → Upload notebook으로 이 노트북을 열고 첫 코드 셀에서 nfc-experiment.csv를 업로드합니다. 개인 정보나 실제 결제 태그 정보는 올리지 않습니다. 로컬 Python에서는 CSV와 nfc-analysis.py를 같은 폴더에 둡니다.',
    code: `from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib import font_manager
try:
    from IPython.display import display
except ImportError:
    display = print

try:
    from google.colab import files
    print("분석할 실험 기록 CSV 하나를 선택하세요. 서술 CSV는 필요하지 않습니다.")
    uploaded = files.upload()
    csv_names = [name for name in uploaded if name.lower().endswith(".csv")]
    if "nfc-experiment.csv" in csv_names:
        CSV_PATH = Path("nfc-experiment.csv")
    elif len(csv_names) == 1 and "notes" not in csv_names[0].lower():
        CSV_PATH = Path(csv_names[0])
    else:
        raise ValueError("nfc-experiment.csv 하나를 선택하세요. 탐구 서술 CSV는 분석 파일이 아닙니다.")
except ImportError:
    CSV_PATH = Path("nfc-experiment.csv")

COLUMNS = ["trial", "condition", "contents", "distance_cm", "orientation", "success", "note", "data_type"]
CONDITION_ORDER = ["단독", "지갑", "가방"]
OUTPUTS = []

# Colab과 로컬에서 사용 가능한 한글 글꼴을 찾습니다.
installed = {f.name for f in font_manager.fontManager.ttflist}
for name in ["AppleGothic", "Malgun Gothic", "NanumGothic", "Noto Sans CJK KR"]:
    if name in installed:
        plt.rcParams["font.family"] = name
        break
plt.rcParams["axes.unicode_minus"] = False`,
  },
  {
    md: '## 1. 파일과 기록 확인\n그래프보다 기록 수를 먼저 확인하는 이유는 파일을 잘못 올렸거나 실험을 덜 마친 상태를 발견하기 위해서입니다. 데모 자료는 연습용이므로 실제 분석에서 제외합니다.',
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
if not data["success"].isin([0, 1]).all():
    raise SystemExit("success는 성공 1 또는 실패 0이어야 합니다.")
print(f"실제 기록 {len(data)}건")
print("성공", int(data["success"].sum()), "회 / 실패", int((1 - data["success"]).sum()), "회")
print("조건별 기록 수")
display(data.groupby("condition")["success"].agg(시도="count", 성공="sum"))
print("원자료 앞 10행")
display(data.head(10))`,
  },
  {
    md: '## 2. 성공률과 표본 수\n2번 중 2번과 20번 중 20번은 모두 100%지만 자료의 양이 다릅니다. Wilson 구간은 작은 표본에서 비율이 얼마나 불확실한지 보여 주는 참고 범위이며, 보장이나 유의성 검정은 아닙니다.',
    code: `def summarize(frame, columns):
    table = frame.groupby(columns, dropna=False)["success"].agg(시도="count", 성공="sum")
    table["실패"] = table["시도"] - table["성공"]
    table["인식률"] = table["성공"] / table["시도"]
    return table

def wilson(success, trials, z=1.96):
    if trials == 0:
        return (np.nan, np.nan)
    p = success / trials
    scale = 1 + z * z / trials
    center = (p + z * z / (2 * trials)) / scale
    half = z * np.sqrt(p * (1 - p) / trials + z * z / (4 * trials * trials)) / scale
    return (max(0, center - half), min(1, center + half))

by_condition = summarize(data, ["condition"])
order = [c for c in CONDITION_ORDER if c in by_condition.index]
order += [c for c in by_condition.index if c not in order]
by_condition = by_condition.loc[order]
by_condition[["하한", "상한"]] = by_condition.apply(
    lambda row: wilson(row["성공"], row["시도"]), axis=1, result_type="expand")
display(by_condition.round(3))`,
  },
  {
    md: '## 3. 조건별 성공·실패 횟수와 인식률\n첫 그림은 횟수, 다음 그림은 비율입니다. 비교 전에 조건마다 시도 수가 비슷한지 확인합니다. 시험한 배치 조건에서 태그가 읽힌 비율을 보여 줄 뿐, 공격 성공률이나 결제 보안을 뜻하지 않습니다.',
    code: `def save_plot(fig, filename):
    fig.tight_layout()
    fig.savefig(filename, dpi=160, bbox_inches="tight")
    OUTPUTS.append(filename)

fig, ax = plt.subplots(figsize=(7, 4))
by_condition[["성공", "실패"]].plot(kind="bar", stacked=True, ax=ax,
    color=["#2f6b4f", "#b7b2a7"])
ax.set_ylabel("시도 횟수")
ax.set_xlabel("배치 조건")
ax.set_title("조건별 성공과 실패 횟수")
ax.legend(title="결과")
save_plot(fig, "nfc-outcomes-by-condition.png")

fig, ax = plt.subplots(figsize=(7, 4))
bars = ax.bar(by_condition.index, by_condition["인식률"] * 100, color="#2f6b4f")
lower = (by_condition["인식률"] - by_condition["하한"]) * 100
upper = (by_condition["상한"] - by_condition["인식률"]) * 100
ax.errorbar(by_condition.index, by_condition["인식률"] * 100,
    yerr=[lower, upper], fmt="none", ecolor="#20231f", capsize=5)
for bar, (_, row) in zip(bars, by_condition.iterrows()):
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 3,
        f"{int(row['성공'])}/{int(row['시도'])}회", ha="center")
ax.set_ylim(0, 115)
ax.set_ylabel("인식률 (%)")
ax.set_xlabel("배치 조건")
ax.set_title("조건별 인식률과 95% Wilson 참고 구간")
save_plot(fig, "nfc-rate-by-condition.png")`,
  },
  {
    md: '## 4. 거리별 추세와 조건×거리 표\n선 그래프는 거리 변화 방향을 보여 주고, 히트맵 안의 성공/시도는 비율의 실제 표본 수를 다시 확인하게 합니다. 빈 칸은 측정하지 않은 조합이지 0%가 아닙니다.',
    code: `by_cell = summarize(data, ["condition", "distance_cm"])
by_cell[["하한", "상한"]] = by_cell.apply(
    lambda row: wilson(row["성공"], row["시도"]), axis=1, result_type="expand")

fig, ax = plt.subplots(figsize=(7, 4))
for condition in order:
    if condition not in by_cell.index.get_level_values("condition"):
        continue
    part = by_cell.xs(condition, level="condition").sort_index()
    low = (part["인식률"] - part["하한"]) * 100
    high = (part["상한"] - part["인식률"]) * 100
    ax.errorbar(part.index, part["인식률"] * 100, yerr=[low, high],
        marker="o", capsize=3, label=condition)
ax.set_ylim(-5, 105)
ax.set_xlabel("거리 (cm)")
ax.set_ylabel("인식률 (%)")
ax.set_title("배치 조건별 거리와 인식률")
ax.legend(title="배치 조건")
save_plot(fig, "nfc-rate-by-distance.png")

rates = by_cell["인식률"].unstack("distance_cm").reindex(order)
counts = (by_cell["성공"].astype(str) + "/" + by_cell["시도"].astype(str))
counts = counts.unstack("distance_cm").reindex(order)
fig, ax = plt.subplots(figsize=(max(6, len(rates.columns) * 1.1), max(3, len(rates.index) * 0.8)))
image = ax.imshow(np.ma.masked_invalid(rates.to_numpy(dtype=float) * 100),
    aspect="auto", cmap="Greens", vmin=0, vmax=100)
ax.set_xticks(range(len(rates.columns)), [f"{x:g}cm" for x in rates.columns])
ax.set_yticks(range(len(rates.index)), rates.index)
ax.set_xlabel("거리")
ax.set_ylabel("배치 조건")
ax.set_title("조건×거리 인식률 · 칸 안은 성공/시도")
for y, condition in enumerate(rates.index):
    for x, distance in enumerate(rates.columns):
        rate = rates.loc[condition, distance]
        if pd.notna(rate):
            ax.text(x, y, f"{counts.loc[condition, distance]}\\n{rate:.0%}",
                ha="center", va="center", color="black")
fig.colorbar(image, ax=ax, label="인식률 (%)")
save_plot(fig, "nfc-heatmap-condition-distance.png")`,
  },
  {
    md: '## 5. 방향과 내용물 비교 (선택 확장)\n방향과 내용물을 동시에 바꾸면 원인을 구분하기 어렵습니다. 본 실험 뒤 한 번에 하나씩 바꾼 자료가 있을 때만 그림을 만듭니다. 해당 값이 한 종류뿐이면 그림을 억지로 만들지 않습니다.',
    code: `def compare_category(column, title, filename):
    values = [value for value in data[column].dropna().unique() if str(value).strip()]
    within_condition = data.groupby("condition")[column].nunique()
    if len(values) < 2 or not (within_condition >= 2).any():
        print(f"{title}: 같은 조건 안에서 비교값을 바꿔 기록하지 않아 그림을 건너뜁니다.")
        return
    table = summarize(data[data[column].isin(values)], ["condition", column])
    pivot = (table["인식률"] * 100).unstack("condition").reindex(columns=order)
    pivot.plot(kind="bar", figsize=(max(7, len(pivot) * 0.8), 4))
    ax = plt.gca()
    ax.set_ylabel("인식률 (%)")
    ax.set_xlabel(title)
    ax.set_ylim(0, 105)
    ax.set_title(f"{title}별 인식률 · 조건별 비교")
    ax.legend(title="배치 조건")
    save_plot(ax.figure, filename)

compare_category("orientation", "태그 방향", "nfc-rate-by-orientation.png")
compare_category("contents", "사이에 둔 내용물", "nfc-rate-by-contents.png")`,
  },
  {
    md: '## 6. 반복 결과가 일정한지 보기\n각 줄은 조건·내용물·거리·방향이 같은 설정입니다. 점은 설정 안의 회차이며 색은 성공/실패입니다. 회차는 전체 시간 순서가 아니므로 시간에 따른 원인이나 숙련 효과를 증명하지 않습니다. 설정이 20개보다 많으면 횟수가 많은 20개만 그립니다.',
    code: `setup_columns = ["condition", "contents", "distance_cm", "orientation"]
setup_counts = data.groupby(setup_columns, dropna=False).size().sort_values(ascending=False)
shown_setups = setup_counts.head(20).index
setup_data = data.set_index(setup_columns).loc[shown_setups].reset_index()
setup_labels = [" · ".join(str(value) or "내용물 없음" for value in setup)
    for setup in shown_setups]
fig, ax = plt.subplots(figsize=(10, max(4, len(shown_setups) * 0.38)))
for success, label, color in [(1, "인식됨", "#2f6b4f"), (0, "인식 안 됨", "#b45c42")]:
    subset = setup_data[setup_data["success"] == success]
    y_positions = [list(shown_setups).index(tuple(row[column] for column in setup_columns))
        for _, row in subset.iterrows()]
    ax.scatter(subset["trial"], y_positions, label=label, color=color, s=55)
ax.set_yticks(range(len(setup_labels)), setup_labels)
ax.invert_yaxis()
ax.set_xlabel("같은 설정 안의 회차")
ax.set_ylabel("조건 · 내용물 · 거리 · 방향")
ax.set_title("반복마다 결과가 일정한가?")
ax.legend(title="관찰 결과")
if len(setup_counts) > 20:
    print(f"설정 {len(setup_counts)}개 중 시도 수가 많은 20개를 그림으로 표시했습니다.")
save_plot(fig, "nfc-rate-by-trial.png")`,
  },
  {
    md: '## 7. 결과 묶음과 보안 해석\n그래프 파일과 원자료 CSV를 함께 보관합니다. 이 시험은 실험용 태그의 제한된 판독 가능성만 확인합니다. 읽힌 결과는 시험 조건에서 가까이 접근하면 읽을 수 있었다는 뜻이고, 실패는 그 설정에서 읽지 못했다는 뜻입니다. 암호화·인증·복제 저항성·결제 보안은 시험하지 않았습니다.',
    code: `import zipfile

with zipfile.ZipFile("nfc-analysis-results.zip", "w", zipfile.ZIP_DEFLATED) as archive:
    archive.write(CSV_PATH, arcname="nfc-experiment.csv")
    for filename in OUTPUTS:
        archive.write(filename)
print("만든 그림:", ", ".join(OUTPUTS))
print("원자료와 그림 묶음: nfc-analysis-results.zip")
try:
    from google.colab import files
    files.download("nfc-analysis-results.zip")
except ImportError:
    print("로컬 실행에서는 PNG와 ZIP이 현재 폴더에 저장됐습니다.")`,
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
