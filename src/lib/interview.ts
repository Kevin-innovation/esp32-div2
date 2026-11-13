// 14장 면접 준비 공통 로직. 질문 본문은 workbooks/interview.ts, 화면은 components/lab/InterviewPrep.tsx.
// 답은 각 실습의 기존 서술 저장에 IV_KEYS 이름으로 더한다(저장 키, CSV 형식은 그대로).

export const IV_TOPICS = { motive: '동기', principle: '통신 원리', design: '변수와 반복', result: '내 결과와 수치', security: '보안과 방어', limits: '한계와 현업 응용' } as const;
export type IvTopic = keyof typeof IV_TOPICS;
export const IV_TOPIC_IDS = Object.keys(IV_TOPICS) as IvTopic[];

export interface IvQuestion {
  topic: IvTopic;
  q: string;
  /** 작성 방향 */
  dir: string;
  /** 가상 예시. 학생이 누를 때만 입력란에 넣는다. */
  ex: string;
  /** 후속 질문: 실제 기록이 있을 때와 아직 없을 때 */
  real: string;
  plan: string;
  /** 이전 버전에서 쓰던 답 키(NFC). 없으면 iv_{topic} */
  key?: string;
  /** 이전 버전의 후속 답 키와 그때의 질문(NFC q_verify) */
  legacyFollow?: [string, string];
}

/** 답변 근거 점검 항목. 학생이 스스로 표시하는 학습 보조이며 점수나 이해 판정이 아니다. */
export const IV_CHECKS = [
  ['num', '내 기록의 수치나 횟수를 근거로 들었다'],
  ['fact', '직접 본 것과 내 추정을 나눠 말했다'],
  ['limit', '이 자료로 말할 수 없는 것을 밝혔다'],
  ['plan', '더 확인할 방법을 말했다'],
] as const;
export type IvCheck = (typeof IV_CHECKS)[number][0];

export const IV_PITCH = [
  ['question', '질문', '무엇이 궁금했고 왜 궁금했는지 한 문장'],
  ['method', '방법', '바꾼 것, 고정한 것, 반복 횟수'],
  ['result', '결과', '내 기록의 핵심 수치 하나와 그 뜻. 기록이 없으면 없다고'],
  ['limit', '한계', '이 결과로 말할 수 없는 것'],
  ['next', '다음 탐구', '다음에 바꿔 볼 한 가지와 이유'],
] as const;

export const ivAnswerKey = (q: IvQuestion) => q.key ?? `iv_${q.topic}`;
const followKey = (q: IvQuestion) => q.legacyFollow?.[0] ?? `iv_${q.topic}_f`;
const followAskedKey = (q: IvQuestion) => `iv_${q.topic}_fq`;
export const ivCheckKey = (q: IvQuestion) => `iv_${q.topic}_c`;
export const IV_KEYS = [
  ...IV_TOPIC_IDS.flatMap((t) => [`iv_${t}`, `iv_${t}_f`, `iv_${t}_fq`, `iv_${t}_c`]),
  ...IV_PITCH.map(([k]) => `iv_pitch_${k}`),
  'iv_memo',
];

export type Notes = Record<string, string | undefined>;
export const ivChecked = (notes: Notes, q: IvQuestion) => new Set((notes[ivCheckKey(q)] ?? '').split(',').filter(Boolean));

/** 지금 자료의 상태. 각 실습의 저장소가 채운다. */
export interface IvContext {
  /** 지금 보고 있는 자료 */
  mode: 'real' | 'demo';
  /** 답이 저장되는 곳(실제와 데모 공통 서술인지, 지금 구분의 서술인지) */
  storage: string;
  /** 실제 기록 수. 면접 근거가 될 수 있는 기록 */
  realCount: number;
  /** 지금 보는 자료의 기록 수 */
  viewCount: number;
  /** 실제 기록 가운데 관찰되지 않음, 측정 못 함 같은 빈 결과 설명. 없으면 빈 문자열 */
  gap: string;
  /** 앞 장에서 쓴 탐구 요약: [항목, 학생이 쓴 글] */
  summary: [string, string][];
  /** 실제 기록의 계산값. 데모만 볼 때는 비운다. */
  calc: [string, string][];
}

export interface IvFollow { key: string; askedKey: string; ask: string; answer: string; frozen: boolean }

/**
 * 후속 질문. 답을 쓰기 전에는 열지 않는다. 답을 쓰면 기록 유무로 미션 질문을 고르고,
 * 학생이 아직 표시하지 않은 근거 항목 하나를 덧붙인다. 후속 답을 쓴 뒤에는 그때의 질문을 그대로 보여 준다.
 */
export function ivFollow(q: IvQuestion, notes: Notes, ctx: Pick<IvContext, 'realCount' | 'gap'>): IvFollow | null {
  const key = followKey(q), askedKey = followAskedKey(q), answer = notes[key] ?? '';
  const asked = notes[askedKey]?.trim() || (q.legacyFollow && answer.trim() ? q.legacyFollow[1] : '');
  if (answer.trim() && asked) return { key, askedKey, ask: asked, answer, frozen: true };
  if (!notes[ivAnswerKey(q)]?.trim()) return answer.trim() ? { key, askedKey, ask: q.real, answer, frozen: false } : null;
  const has = ctx.realCount > 0, checked = ivChecked(notes, q);
  const base = has ? q.real : q.plan;
  const gap = has && ctx.gap && q.topic === 'result' ? ` 내 실제 기록에 ${ctx.gap}이 있습니다. 이것을 결과에서 어떻게 다뤘는지도 말해 보세요.` : '';
  const nudge = (has && !checked.has('num')) ? '그 말을 받치는 내 기록의 수치나 횟수 하나를 대 보세요.'
    : !checked.has('fact') ? '방금 답에서 직접 본 것과 추정한 것을 한 문장씩 나눠 보세요.'
      : !checked.has('limit') ? '이 자료로는 말할 수 없는 것을 하나 덧붙여 보세요.'
        : !checked.has('plan') ? '그 판단을 더 확인하려면 무엇을 바꿔 다시 재야 할까요?'
          : '면접관이 “그 근거가 충분한가요?”라고 되물으면 어떻게 답할까요?';
  return { key, askedKey, ask: `${base}${gap} ${nudge}`, answer, frozen: false };
}

/** 빈 칸과 수치 표시만 보는 안내. 글의 뜻을 해석하거나 이해를 판정하지 않는다(AI 평가 아님). */
export function ivWarnings(q: IvQuestion, notes: Notes, ctx: Pick<IvContext, 'realCount' | 'mode'>): string[] {
  const answer = notes[ivAnswerKey(q)] ?? '', checked = ivChecked(notes, q), out: string[] = [];
  if (!answer.trim()) out.push('아직 답을 쓰지 않았습니다.');
  if (checked.size && !answer.trim()) out.push('점검 표시가 있지만 답이 비어 있습니다.');
  if (checked.has('num') && !ctx.realCount) out.push('실제 기록이 아직 없습니다. 데모나 예시의 수치는 내 근거가 아닙니다.');
  else if (checked.has('num') && answer.trim() && !/\d/.test(answer)) out.push('수치를 근거로 표시했지만 답에 숫자가 보이지 않습니다.');
  return out;
}

export const ivPitch = (notes: Notes) => IV_PITCH.map(([k]) => notes[`iv_pitch_${k}`]?.trim() ?? '').filter(Boolean).join(' ');

const or = (v: string | undefined) => v?.trim() || '(미작성)';

/** 전체 보고서 끝에 붙이는 면접 준비 항목. 쓴 후속 답만 넣는다. */
export function ivReportItems(questions: IvQuestion[], notes: Notes): string[] {
  const items = questions.map((q, i) => {
    const f = ivFollow(q, notes, { realCount: 0, gap: '' });
    const follow = f?.answer.trim() ? `\n후속 질문: ${f.ask}\n후속 답: ${f.answer.trim()}` : '';
    return `${i + 1}) [${IV_TOPICS[q.topic]}] ${q.q}\n내 답: ${or(notes[ivAnswerKey(q)])}${follow}`;
  });
  items.push(`1분 설명 다섯 칸: ${IV_PITCH.map(([k, label]) => `${label}: ${or(notes[`iv_pitch_${k}`])}`).join(' / ')}`);
  items.push(`보완 메모: ${or(notes.iv_memo)}`);
  return items;
}

/** 면접 준비 Markdown. 질문, 내 답, 후속 질문과 답, 탐구 요약, 1분 설명, 보완 메모. */
export function interviewMarkdown(title: string, questions: IvQuestion[], notes: Notes, ctx: IvContext, date: string, explain: string): string {
  const lines = [
    `# 면접 준비: ${title}`,
    `작성일 ${date}. 답의 저장 위치: ${ctx.storage}. 지금 보는 자료: ${ctx.mode === 'real' ? `내 실제 기록 ${ctx.viewCount}건` : `가상 데모 ${ctx.viewCount}건(실제 결과 아님)`}. 실제 기록 ${ctx.realCount}건.`,
    ctx.mode === 'demo' ? '> **데모 자료는 가상 값입니다. 면접에서 내 실험 결과로 말하지 않습니다.**' : '',
    '## 내 탐구 요약',
    ctx.summary.map(([k, v]) => `- ${k}: ${or(v)}`).join('\n'),
    ctx.calc.length ? `실제 기록의 계산값:\n${ctx.calc.map(([k, v]) => `- ${k}: ${v}`).join('\n')}` : '실제 기록의 계산값: (실제 기록 없음 또는 데모만 보는 중)',
    '## 질문과 내 답',
    ...questions.map((q, i) => {
      const f = ivFollow(q, notes, ctx), checked = ivChecked(notes, q);
      return [
        `### ${i + 1}. [${IV_TOPICS[q.topic]}] ${q.q}`,
        `내 답: ${or(notes[ivAnswerKey(q)])}`,
        f ? `후속 질문: ${f.ask}\n\n후속 답: ${or(f.answer)}` : '후속 질문: (위 답을 쓰면 열립니다)',
        `스스로 표시한 근거 점검: ${IV_CHECKS.filter(([k]) => checked.has(k)).map(([, l]) => l).join(', ') || '없음'}`,
      ].join('\n\n');
    }),
    '## 1분 설명',
    IV_PITCH.map(([k, label]) => `- ${label}: ${or(notes[`iv_pitch_${k}`])}`).join('\n'),
    `완성 문단: ${or(explain)}`,
    '## 보완 메모',
    or(notes.iv_memo),
    '---',
    '직접 한 것만 썼는지 다시 읽습니다. 근거 점검 표시는 스스로 한 학습 보조이며 이해를 판정하지 않습니다. 이 질문들로 모든 면접 질문에 대비되는 것은 아닙니다.',
  ];
  return lines.filter(Boolean).join('\n\n') + '\n';
}
