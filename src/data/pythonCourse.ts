// Python·pandas·Colab 과정(1~8차시)의 차시 정보와 2~5차시 단계. 6차시는 pythonProject.ts, 8차시는 pythonMissions.ts.
// 모든 코드 조각은 scripts/check-python-course.ts가 실제로 실행해 python-course-output.json과 대조한다(--write로 갱신).
// 단계마다 미션 원문 줄(ref)을 표지로 잘라 오므로 미션 코드가 바뀌어 표지가 사라지면 빌드가 실패한다.
import { MISSIONS, NOTEBOOK, excerpt, type Excerpt } from './missionCode.ts';

/** 백슬래시를 그대로 두는 코드 글자열(정규식 \d 등). 앞뒤 빈 줄 하나는 지운다. */
export const py = (s: TemplateStringsArray, ...v: unknown[]): string => String.raw(s, ...v).replace(/^\n/, '').replace(/\n$/, '');

export interface Blank { code: string; fills: string[]; hint: string }
export interface Write { task: string; setup?: string; answer: string; check: string }
export interface Pitfall { code: string; note: string }
export interface Variant { q: string; code?: string; answer: string }
export interface Ref { id: string; n: string; title: string; href: string; excerpt: Excerpt; note: string }
export interface Step {
  id: string; title: string; learn: string[];
  example?: string; blank: Blank; check?: string; write?: Write;
  pitfall?: Pitfall; why: string; variant?: Variant; refs: Ref[];
}
export interface Lesson {
  n: number; slug: string; href: string; title: string; short: string; minutes: number;
  goal: string; prereq: string; product: string; done: string[]; chain?: boolean; steps: Step[];
}

const SRC: Record<string, { n: string; title: string; href: string; code: string }> = {
  ...Object.fromEntries(MISSIONS.map((m) => [m.id, { n: m.n, title: m.title, href: `${m.href}#ch-9`, code: m.code }])),
  notebook: { n: '노트북', title: 'NFC 노트북', href: '/lab/nfc/#ch-9', code: NOTEBOOK },
};
/** 미션 원문 줄. 표지가 없으면 excerpt가 빌드를 멈춘다. */
export const ref = (id: string, from: string, to: string, note: string): Ref => {
  const s = SRC[id];
  if (!s) throw new Error(`미션 없음: ${id}`);
  return { id, n: s.n, title: s.title, href: s.href, excerpt: excerpt(s.code, from, to), note };
};

/** 빈칸 ___를 차례로 채운 코드. 빈칸 수와 답 수가 다르면 멈춘다. */
export const filled = (b: Blank): string => {
  const parts = b.code.split('___');
  if (parts.length - 1 !== b.fills.length) throw new Error(`빈칸 ${parts.length - 1}개, 답 ${b.fills.length}개: ${b.code.slice(0, 40)}`);
  return parts.map((p, i) => p + (b.fills[i] ?? '')).join('');
};
export const checkCode = (c: string): string => `${c}\nprint('확인 통과')`;
export const TODO = (what: string): string => `# 여기에 직접 작성합니다: ${what}\nraise NotImplementedError('직접 작성 칸입니다. 위 과제를 코드로 쓰고 이 줄을 지우세요.')`;

/* ───────────────────────── 2차시: 값, 반복, 조건 ───────────────────────── */
const L2: Step[] = [
  {
    id: 'values', title: '값과 자료형: 글자 "1"과 숫자 1은 다르다',
    learn: [
      '값에는 종류(자료형)가 있습니다. 글자(`str`)는 따옴표 안의 값, 정수(`int`)와 실수(`float`)는 계산할 수 있는 수, `True`와 `False`는 참·거짓(`bool`)입니다. `type(값)`으로 종류를 볼 수 있습니다.',
      '미션 코드는 CSV의 모든 칸을 글자로 읽습니다. 그래서 `\'1\' == 1`은 거짓입니다. 비교는 글자끼리 하고, 계산 직전에만 `int(\'1\')`, `float(\'-48\')`처럼 바꿉니다.',
      '`/`는 실수 나눗셈, `//`는 몫, `round(x)`는 반올림입니다. `print(a, b)`는 값 사이에 빈칸 하나를 넣어 출력합니다.',
    ],
    example: py`
success = '1'          # CSV에서 읽은 칸: 글자
distance = float('3')  # 글자 '3'을 실수로
tries = 5              # 정수
print(success, type(success))
print(distance, type(distance))
print(success == 1, success == '1', int(success) == 1)
print(tries / 2, tries // 2, round(2 / 3 * 100))`,
    blank: { code: py`
cell = '-48'          # CSV 칸은 글자
value = ___(cell)     # 실수로 바꾸기
print(value + 120)    # 72.0이 나와야 합니다
print(cell == ___)    # 글자 '-48'과 같은지: True`, fills: ['float', "'-48'"], hint: '숫자로 바꾸는 함수는 int와 float입니다. -48은 소수점이 있을 수 있는 RSSI라 float을 씁니다. 글자는 따옴표로 감쌉니다.' },
    write: {
      task: '성공 수 s와 시도 수 a가 글자로 주어집니다. 숫자로 바꿔 성공률을 퍼센트 정수로 계산해 rate에 담고 출력하세요(round 사용).',
      setup: "s, a = '9', '10'", answer: py`
rate = round(int(s) / int(a) * 100)
print(rate)`,
      check: 'assert rate == 90 and isinstance(rate, int), rate',
    },
    pitfall: { code: "print('3' + 1)", note: '글자와 숫자는 더할 수 없습니다. CSV 칸을 바꾸지 않고 계산하면 이 TypeError가 납니다.' },
    why: '미션 코드는 `dtype=str`로 모든 칸을 글자로 읽습니다. 빈 칸, 0, 잘못 적은 2를 원래 모습 그대로 두고 검사한 뒤 계산 직전에만 숫자로 바꾸기 위해서입니다.',
    variant: { q: "칸 목록 ['1', '0', '1']에서 숫자 1의 개수와 글자 '1'의 개수는 각각 몇일까요?", code: py`
cells = ['1', '0', '1']
print(cells.count(1), cells.count('1'))`, answer: "0과 2입니다. 글자 '1'은 숫자 1과 같지 않습니다. 미션 코드가 `data['success'] == '1'`처럼 따옴표를 붙여 비교하는 이유입니다." },
    refs: [ref('nfc', "data['ok'] = ", "data['d'] = ", "success는 글자 '1'과 비교해 참·거짓을 만들고, 거리는 float으로 바꿉니다.")],
  },
  {
    id: 'lists', title: '리스트·딕셔너리와 인덱스',
    learn: [
      '리스트 `[a, b, c]`는 순서 있는 값 묶음입니다. 번호(인덱스)는 0부터 셉니다. `x[0]`은 첫 값, `x[-1]`은 마지막 값, `x[1:]`은 1번부터 끝까지입니다. `len(x)`는 개수, `x.append(v)`는 끝에 더하기입니다.',
      '딕셔너리 `{이름표: 값}`은 이름표로 값을 찾습니다. `d[\'성공\']`으로 꺼내고, `d[\'실패\'] = \'10\'`처럼 새 이름표를 넣습니다. `d.get(이름표, 기본값)`은 이름표가 없을 때 멈추지 않고 기본값을 돌려줍니다.',
      '글자도 인덱스로 자를 수 있습니다. `"\'-48"[1:]`은 첫 글자(작은따옴표)를 뺀 `-48`입니다.',
    ],
    example: py`
conds = ['단독', '지갑', '가방']
print(conds[0], conds[-1], conds[1:], len(conds))
conds.append('상자')
print(conds)
RANK = {'단독': 0, '지갑': 1, '가방': 2}
print(RANK['지갑'], RANK.get('상자', 3))
summary = {}
summary['기록 행'] = '30'
print(summary)
v = "'-48"
print(v[0], v[1:])`,
    blank: { code: py`
labels = ['G1', 'G2', 'G3']
print(labels[___])          # 마지막 값 G3
summary = {'성공': '20'}
summary[___] = '10'         # '실패' 이름표로 '10'을 넣기
print(summary)`, fills: ['-1', "'실패'"], hint: '마지막 값은 뒤에서 첫 번째라 -1입니다. 이름표도 글자라 따옴표로 감쌉니다.' },
    write: {
      task: '빈 리스트 oks에 9, 6, 5를 차례로 더하고, RANK에서 "상자"의 순위를 기본값 3으로 꺼내 rank에 담으세요.',
      setup: "oks = []\nRANK = {'단독': 0, '지갑': 1, '가방': 2}", answer: py`
oks.append(9)
oks.append(6)
oks.append(5)
rank = RANK.get('상자', 3)
print(oks, rank)`,
      check: 'assert oks == [9, 6, 5], oks\nassert rank == 3, rank',
    },
    pitfall: { code: "RANK = {'단독': 0, '지갑': 1, '가방': 2}\nprint(RANK['상자'])", note: '없는 이름표를 [ ]로 꺼내면 KeyError로 멈춥니다. 미션 코드는 RANK.get(c, 3)을 써서 처음 보는 조건도 맨 뒤로 보냅니다.' },
    why: '미션 코드는 조건별 결과를 리스트(labels, oks, fails)에 모아 그래프에 쓰고, 이름표와 값을 딕셔너리 summary에 모아 "3. 계산 결과"와 검증용 JSON을 출력합니다.',
    variant: { q: '"\'=SUM(A1)"의 [1:]과 [:1]은 각각 무엇일까요?', code: py`
v = "'=SUM(A1)"
print(v[1:], v[:1])`, answer: '[1:]은 첫 글자를 뺀 =SUM(A1), [:1]은 첫 글자 하나인 작은따옴표입니다. 미션의 unguard 함수가 v[1:]로 저장할 때 붙인 따옴표를 뗍니다.' },
    refs: [
      ref('nfc', 'RANK = {', 'RANK = {', '순서표 딕셔너리'),
      ref('nfc', 'def unguard(v):', 'return v[1:]', 'v[1:]로 맨 앞 작은따옴표를 뗍니다(3차시에서 정규식까지 읽습니다).'),
    ],
  },
  {
    id: 'loops', title: 'for 반복과 누적',
    learn: [
      '`for x in 리스트:` 아래에 4칸 들여 쓴 줄들이 값마다 한 번씩 실행됩니다. 들여쓰기가 끝나면 반복도 끝납니다.',
      '누적은 시작값을 먼저 두고(`s = 0`, `oks = []`) 반복하며 더하는 방법입니다. `s += 1`은 `s = s + 1`과 같습니다.',
      '`range(3)`은 0, 1, 2. `zip(a, b)`는 두 리스트를 짝지어 돌립니다. `for k, v in d.items():`는 딕셔너리의 이름표와 값을 함께 꺼냅니다.',
    ],
    example: py`
results = ['1', '1', '0', '1', '0']
s = 0
for r in results:
    if r == '1':
        s = s + 1
print('성공', s, '/ 시도', len(results))

codes = []
for i in range(3):
    codes.append('G' + str(i + 1))
print(codes)
for code, c in zip(codes, ['단독', '지갑', '가방']):
    print(code, '=', c)
summary = {'기록 행': '30', '성공': '20'}
for k, v in summary.items():
    print('  ', k + ':', v)`,
    blank: { code: py`
data = {'단독': ['1', '1', '0'], '지갑': ['1', '0', '0']}
oks = []
for c, rs in data.___():
    s = 0
    for r in rs:
        if r == '1':
            s = s ___ 1
    oks.append(s)
print(oks)`, fills: ['items', '+'], hint: '딕셔너리에서 이름표와 값을 함께 꺼내는 메서드, 그리고 더하기 기호입니다. 결과는 [2, 1]입니다.' },
    write: {
      task: '같은 data에서 조건마다 실패("0") 수를 세어 fails 리스트에 차례로 담으세요. for를 두 번 씁니다.',
      setup: "data = {'단독': ['1', '1', '0'], '지갑': ['1', '0', '0']}", answer: py`
fails = []
for c, rs in data.items():
    f = 0
    for r in rs:
        if r == '0':
            f += 1
    fails.append(f)
print(fails)`,
      check: 'assert fails == [1, 2], fails',
    },
    pitfall: { code: "for r in ['1', '0']:\nprint(r)", note: 'for 아래 줄을 들여 쓰지 않으면 IndentationError입니다. Colab에서 코드를 붙여 넣을 때 앞 칸이 사라지지 않게 합니다.' },
    why: '미션 코드의 `for c in conds:`가 조건마다 성공 수와 시도 수를 누적해 summary와 oks, fails를 채우고, 마지막 `for k, v in summary.items():`가 "3. 계산 결과"를 한 줄씩 출력합니다.',
    variant: { q: 's = 0을 바깥 for 위로 옮기면 oks는 어떻게 될까요?', code: py`
data = {'단독': ['1', '1', '0'], '지갑': ['1', '0', '0']}
oks = []
s = 0
for c, rs in data.items():
    for r in rs:
        if r == '1':
            s = s + 1
    oks.append(s)
print(oks)`, answer: '[2, 3]이 됩니다. 조건마다 0에서 다시 시작하지 않아 지갑의 성공 수에 단독의 성공 2가 더해졌습니다. 누적 시작값은 세고 싶은 묶음 안쪽에 둡니다.' },
    refs: [
      ref('nfc', 'for c in conds:', 'oks.append(s); fails.append(a - s)', '조건마다 rs를 고르고 성공 s와 시도 a를 세어 누적합니다.'),
      ref('nfc', "print('3. 계산 결과')", "    print(f'   {k}: {v}')", 'summary의 이름표와 값을 차례로 출력합니다.'),
    ],
  },
  {
    id: 'conditions', title: 'if와 비교·논리: 허용 범위 검사',
    learn: [
      '비교: `==` 같다, `!=` 다르다, `<`, `<=`. `0 <= d <= 100`처럼 범위를 한 번에 쓸 수 있습니다. `in (\'0\', \'1\')`은 둘 중 하나인지, `not in`은 둘 다 아닌지입니다.',
      '논리: `A and B`는 둘 다 참, `A or B`는 하나라도 참, `not A`는 반대입니다. 헷갈리면 괄호로 묶습니다.',
      '`if … elif … else`는 위에서부터 처음 맞는 하나만 실행합니다. `MODE = \'demo\' if SOURCE == \'sample\' else \'real\'`은 한 줄 조건식입니다.',
    ],
    example: py`
d = 3.0
print(0 <= d <= 100)
success = '2'
print(success in ('0', '1'), success not in ('0', '1'))
status, configured = 'observed', 'wpa2'
print(status == 'observed' and configured != 'unchecked')
print(status != 'observed' or configured == 'unchecked')
SOURCE = 'upload'
MODE = 'demo' if SOURCE == 'sample' else 'real'
print(MODE)`,
    blank: { code: py`
success, d = '1', 120.0
if success ___ ('0', '1'):
    print('success 값이 다릅니다')
elif not 0 <= d <= ___:
    print('거리는 0~100cm입니다')
else:
    print('통과')`, fills: ['not in', '100'], hint: 'success가 0과 1 둘 다 아닐 때를 찾는 말과 거리의 최댓값입니다. 출력은 "거리는 0~100cm입니다"입니다.' },
    write: {
      task: 'cases의 (상태, RSSI) 짝마다 "상태가 observed이고 RSSI가 -120~0"이면 True, 아니면 False를 oks 리스트에 담으세요.',
      setup: "cases = [('observed', -60), ('observed', 5), ('unchecked', -60)]", answer: py`
oks = []
for status, rssi in cases:
    oks.append(status == 'observed' and -120 <= rssi <= 0)
print(oks)`,
      check: 'assert oks == [True, False, False], oks',
    },
    pitfall: { code: "success = '1'\nif success = '1':\n    print('읽힘')", note: '비교는 ==입니다. = 하나는 값을 넣는 기호라 SyntaxError가 납니다.' },
    why: '미션의 problem 함수들이 이런 비교로 값의 허용 범위를 검사해 잘못 적은 행을 찾습니다. MODE 줄은 SOURCE에 따라 데모와 실제 기록 중 무엇을 분석할지 정합니다.',
    variant: { q: '`not 0 <= d <= 100`을 `not 0 <= d or d <= 100`으로 잘못 쓰면 d = 120에서 어떻게 될까요?', code: py`
d = 120.0
print(not 0 <= d <= 100, not 0 <= d or d <= 100)`, answer: '앞은 True(범위 밖), 뒤는 False입니다. not은 바로 뒤 0 <= d에만 붙고, d <= 100도 거짓이라 전체가 거짓이 되어 잘못된 거리를 통과시킵니다. 범위 검사는 한 덩어리로 씁니다.' },
    refs: [
      ref('nfc', 'def problem(r):', "    return ''", 'not in과 범위 비교로 한 행을 검사합니다(try는 3차시).'),
      ref('wifi-rssi', 'def problem(r):', "    return ''", '상태가 observed일 때만 RSSI 범위를 보고, 아니면 RSSI가 비어야 합니다.'),
    ],
  },
  {
    id: 'fstrings', title: 'f-글자열과 숫자 형식, 반올림',
    learn: [
      "`f'{c} 성공/시도: {s}/{a}'`처럼 글자 앞에 f를 붙이면 { } 안의 값이 들어갑니다.",
      "`{x:.1f}`는 소수 첫째 자리, `{x:.0%}`는 퍼센트(100을 곱함)입니다.",
      "파이썬의 `round(2.5)`는 2입니다(짝수 쪽 반올림). 브라우저 계산과 같게 하려고 미션 코드는 `math.floor(x + 0.5)`로 0.5를 늘 올립니다.",
    ],
    example: py`
import math
c, s, a = '지갑', 3, 8
print(f'{c} 성공/시도: {s}/{a}')
print(f'{s / a:.1f}', f'{s / a:.0%}')
print(round(2.5), round(3.5), math.floor(2.5 + 0.5))
v = 3.0
print(str(int(v)) if v.is_integer() else f'{v:.1f}')`,
    blank: { code: py`
d, s, a = 3.0, 6, 10
print(f'거리 {___}cm 성공/시도: {s}/{a}')   # 3.0을 3으로
print(f'인식률 {s / a:___}')               # 60%`, fills: ['int(d)', '.0%'], hint: '실수를 정수로 바꾸는 함수와, 퍼센트로 소수 없이 쓰는 형식입니다.' },
    write: {
      task: 's = 1, a = 8일 때 0.5를 늘 올리는 반올림으로 "13%" 글자를 label에 만드세요. 비교로 round 결과도 출력합니다.',
      setup: 'import math\ns, a = 1, 8', answer: py`
label = f'{math.floor(s / a * 100 + 0.5)}%'
print(label, round(s / a * 100))`,
      check: "assert label == '13%', label",
    },
    pitfall: { code: "s, a = 3, 8\nprint(f'{s / a:.1f%}')", note: '형식 기호를 섞어 쓰면 ValueError입니다. 소수는 .1f, 퍼센트는 .0% 하나만 씁니다.' },
    why: "미션 출력의 '9/10', '90%', '-49dBm'은 모두 f-글자열로 만듭니다. 반올림 방법이 다르면 브라우저 계산(8장)과 Colab 출력이 1%p 어긋나 대조가 실패합니다.",
    variant: { q: 'pct를 round(s / a * 100)로 바꾸면 1/8과 5/8은 몇 %가 될까요?', code: 'print(round(1 / 8 * 100), round(5 / 8 * 100))', answer: '12와 62입니다. 12.5와 62.5가 짝수 쪽으로 내려갑니다. 원문 pct는 13%, 63%로 브라우저와 같습니다.' },
    refs: [
      ref('nfc', 'def pct(s, a):', "return f'{math.floor", '0.5를 늘 올리는 반올림'),
      ref('nfc', 'def fmt(v):', "return str(int(v)) if v.is_integer()", '3.0은 3, 2.5는 2.5로 씁니다.'),
    ],
  },
];

/* ───────────────────────── 3차시: 함수, 검사, 파일 ───────────────────────── */
const NFC = SRC.nfc.code;
const fmtTools = excerpt(NFC, 'def fmt(v):', "return f'{fmt(min(values))}");
const wifiIsInt = excerpt(SRC['wifi-rssi'].code, 'def is_int(v, lo, hi):', 'return bool(re.fullmatch');
const wifiProblem = excerpt(SRC['wifi-rssi'].code, 'def problem(r):', "    return ''");
const fwDecision = excerpt(SRC.firmware.code, 'def decision(r):', "return '설치 보류: 근거 부족'");

const L3: Step[] = [
  {
    id: 'def', title: 'def, 인자, 기본값, return',
    learn: [
      '`def 이름(인자):` 아래 들여 쓴 줄이 함수 몸체입니다. `return 값`은 값을 돌려주고 함수를 바로 끝냅니다. 함수는 정의한 셀을 먼저 실행해야 부를 수 있습니다.',
      "`def med(values, unit=''):`의 `unit=''`은 기본값입니다. `med(xs)`처럼 빼면 빈 글자, `med(xs, 'dBm')`이면 dBm이 붙습니다.",
      '아래 예제는 미션 코드의 공통 도구 fmt, med, rng를 그대로 실행합니다. 값이 없으면 "값 없음"을 돌려줘 분석이 멈추지 않습니다.',
    ],
    example: `import pandas as pd\n\n${fmtTools.text}\n\nprint(med(['-48', '-53', '-70'], 'dBm'))\nprint(rng(['3', '1', '5'], 'cm'))\nprint(med([]), fmt(2.5), fmt('3'))`,
    blank: { code: py`
def ratio_text(s, a, unit=___):
    if a == 0:
        ___ '계산 불가'
    return f'{s}/{a}{unit}'
print(ratio_text(3, 4), ratio_text(0, 0), ratio_text(3, 4, '회'))`, fills: ["''", 'return'], hint: '단위를 빼고 부르면 아무것도 붙지 않아야 하니 빈 글자입니다. 0으로 나누기 전에 값을 돌려주고 끝내는 말을 씁니다.' },
    write: {
      task: '글자 리스트 values를 받아 숫자로 바꾼 뒤 가장 큰 값과 가장 작은 값의 차이를 돌려주는 spread(values)를 만드세요. 값이 없으면 None을 돌려줍니다.',
      answer: py`
def spread(values):
    if not values:
        return None
    nums = []
    for v in values:
        nums.append(float(v))
    return max(nums) - min(nums)
print(spread(['-48', '-70', '-53']), spread([]))`,
      check: "assert spread(['-48', '-70', '-53']) == 22.0\nassert spread([]) is None\nassert spread(['5']) == 0.0",
    },
    pitfall: { code: 'print(double(2))\n\ndef double(x):\n    return x * 2', note: '정의보다 먼저 부르면 NameError입니다. Colab에서는 함수가 있는 셀을 먼저 실행합니다.' },
    why: '미션 코드는 같은 계산을 여러 조건과 미션에 쓰려고 fmt, med, rng, ratio, bar를 함수로 만들어 둡니다. 함수 이름만 읽어도 무엇을 하는지 알 수 있고, 고칠 곳이 한 군데입니다.',
    variant: { q: 'med에서 "if values else \'값 없음\'"을 빼면 빈 리스트일 때 무엇이 나올까요?', code: "import pandas as pd\nprint(pd.Series([], dtype=float).median())", answer: 'nan(숫자 아님)이 나옵니다. 이 값을 fmt에 넣으면 "nan"이 보고서에 그대로 찍힙니다. 값이 없을 때를 따로 처리하는 이유입니다.' },
    refs: [ref('nfc', 'def fmt(v):', "return f'{fmt(min(values))}", '13개 미션 대부분에 같은 도구가 들어 있습니다.')],
  },
  {
    id: 'checker', title: '검사 함수: 처음 걸린 이유를 돌려주기',
    learn: [
      '미션의 problem 함수는 한 행 r을 받아 if를 위에서부터 차례로 검사합니다. 걸리면 그 이유 글자를 return하고 끝, 끝까지 통과하면 빈 글자 \'\'를 돌려줍니다.',
      "빈 글자는 '문제 없음' 신호입니다. 그래서 `reasons != ''`로 문제 행만, `reasons == ''`로 깨끗한 행만 고를 수 있습니다.",
      "행 r은 딕셔너리처럼 `r['열 이름']`으로 칸을 꺼냅니다. 아래 예제는 Wi-Fi 미션의 원문 함수를 딕셔너리 행에 그대로 적용합니다.",
    ],
    example: `import re\n\n${wifiIsInt.text}\n\n${wifiProblem.text}\n\nrows = [\n    {'observation_status': 'observed', 'rssi_dbm': '-48'},\n    {'observation_status': 'observed', 'rssi_dbm': '7'},\n    {'observation_status': 'unchecked', 'rssi_dbm': '-60'},\n    {'observation_status': 'maybe', 'rssi_dbm': ''},\n]\nfor r in rows:\n    print(repr(problem(r)))`,
    blank: { code: py`
def check(r):
    if r['success'] not in ('0', '1'): return ___
    if not r['condition']: return '조건이 비었습니다'
    return ___
for r in [{'success': '2', 'condition': '단독'}, {'success': '1', 'condition': ''}, {'success': '0', 'condition': '지갑'}]:
    print(repr(check(r)))`, fills: ["'success는 0 또는 1입니다'", "''"], hint: '첫 빈칸은 학생이 읽을 이유 글자, 마지막 빈칸은 문제가 없다는 신호(빈 글자)입니다.' },
    write: {
      task: "GPS 위치 규칙을 함수로 쓰세요. place_problem(r)은 r['condition']이 '실내', '창가', '야외' 중 하나가 아니면 '위치는 실내·창가·야외 중 하나입니다'를, 맞으면 ''를 돌려줍니다.",
      answer: py`
def place_problem(r):
    if r['condition'] not in ('실내', '창가', '야외'):
        return '위치는 실내·창가·야외 중 하나입니다'
    return ''
print(repr(place_problem({'condition': '옥상'})))`,
      check: "assert place_problem({'condition': '창가'}) == ''\nassert place_problem({'condition': '옥상'}) == '위치는 실내·창가·야외 중 하나입니다'\nassert place_problem({'condition': ''}) != ''",
    },
    pitfall: { code: "def f(r):\n    if r['success'] == '2':\n        '값이 다릅니다'\n\nprint(f({'success': '2'}))", note: 'return을 빠뜨리면 오류 없이 None이 돌아옵니다. None은 빈 글자가 아니라서, 미션 코드에서는 깨끗한 행까지 모두 문제 행이 됩니다.' },
    why: "빈 칸이나 오타 행을 실패로 세지 않고 빼되, 왜 뺐는지 출력해 학생이 기록을 고칠 수 있게 합니다. 13개 미션 중 12개에 problem이 있고 규칙만 다릅니다.",
    variant: { q: 'success가 비고 거리가 "셋"인 행에서, 검사 순서를 바꾸면 돌려주는 이유가 어떻게 달라질까요?', code: py`
def a(r):
    if r['success'] not in ('0', '1'): return 'success 이유'
    if not r['distance_cm'].isdigit(): return '거리 이유'
    return ''

def b(r):
    if not r['distance_cm'].isdigit(): return '거리 이유'
    if r['success'] not in ('0', '1'): return 'success 이유'
    return ''

row = {'success': '', 'distance_cm': '셋'}
print(a(row), '/', b(row))`, answer: '처음 걸린 이유 하나만 돌려주므로 순서가 이유를 정합니다. 어느 쪽이든 그 행이 빠지는 것은 같습니다. 학생에게 가장 먼저 고칠 것을 알려 주는 순서로 둡니다.' },
    refs: [
      ref('wifi-rssi', 'def problem(r):', "    return ''", '02 Wi-Fi'),
      ref('gps', 'def problem(r):', "    return ''", '11 GPS: 위치, fix, 위성 수, 대기 시간, 타임아웃과 fix의 모순을 차례로 봅니다.'),
      ref('subghz', 'def problem(r):', "    return ''", '10 433MHz: 고정·롤링 코드는 설명서 근거(manual)가 있을 때만 확정합니다.'),
    ],
  },
  {
    id: 'compact', title: 'lambda, sorted key, 리스트 내포, next',
    learn: [
      '`lambda c: 식`은 이름 없는 한 줄 함수입니다. `sorted(목록, key=함수)`는 함수가 돌려준 값으로 줄 세웁니다. `(RANK.get(c, 3), c)`처럼 짝(튜플)을 돌려주면 첫 값, 같으면 둘째 값 순서입니다.',
      '`[c for c in NEED if c not in columns]`는 for와 if와 append를 한 줄로 쓴 리스트 내포입니다. 결과는 새 리스트입니다.',
      '`next(n for n in names if n.endswith(\'.csv\'))`는 조건에 맞는 첫 값 하나를 꺼냅니다.',
    ],
    example: py`
RANK = {'단독': 0, '지갑': 1, '가방': 2}
found = ['가방', '상자', '단독', '지갑']
print(sorted(found))
print(sorted(found, key=lambda c: (RANK.get(c, 3), c)))

NEED = ['trial', 'condition', 'success']
columns = ['trial', 'success', 'note']
lost = [c for c in NEED if c not in columns]
same = []
for c in NEED:
    if c not in columns:
        same.append(c)
print(lost, lost == same)

names = ['memo.txt', 'nfc-experiment.csv', 'b.csv']
print(next(n for n in names if n.endswith('.csv')))
print([f'G{i + 1}' for i in range(3)])`,
    blank: { code: py`
NEED = ['alias', 'rssi_dbm', 'data_type']
columns = ['alias', 'data_type']
lost = [c ___ c in NEED if c ___ columns]
print(lost)`, fills: ['for', 'not in'], hint: '리스트 내포는 [값 for 이름 in 목록 if 조건] 모양입니다. 없는 열을 찾습니다.' },
    write: {
      task: "CSV 미션처럼 원본 열 orig 가운데, 가명본 열 pseu에 '열 이름 + _alias'가 있는 열만 리스트 내포로 모아 aliased에 담으세요.",
      setup: "orig = ['uid', 'room', 'rssi_dbm', 'note']\npseu = ['uid_alias', 'room_alias', 'rssi_dbm']", answer: py`
aliased = [c for c in orig if c + '_alias' in pseu]
print(aliased)`,
      check: "assert aliased == ['uid', 'room'], aliased",
    },
    pitfall: { code: "names = ['memo.txt']\nprint(next(n for n in names if n.endswith('.csv')))", note: '맞는 값이 하나도 없으면 StopIteration으로 멈춥니다. 미션 코드에서 .csv가 아닌 파일만 올렸을 때 나는 오류입니다.' },
    why: '정렬 규칙이 바뀌면 그래프의 G1, G2, G3이 가리키는 조건이 바뀝니다. 없는 열 목록을 한 줄로 만들어, 다른 워크북 CSV를 올렸을 때 무엇이 없는지 정확히 알려 줍니다.',
    variant: { q: 'key에서 RANK.get(c, 3)을 RANK.get(c, -1)로 바꾸면 "상자"는 어디로 갈까요?', code: py`
RANK = {'단독': 0, '지갑': 1, '가방': 2}
print(sorted(['가방', '상자', '단독', '지갑'], key=lambda c: (RANK.get(c, -1), c)))`, answer: '맨 앞으로 갑니다. 순서표에 없는 조건이 G1이 되어, 늘 같은 순서로 비교하려던 목적이 깨집니다.' },
    refs: [
      ref('nfc', 'RANK = {', 'conds = sorted', '조건 순서 고정'),
      ref('nfc', 'lost = [c for c in NEED', 'raise ValueError', '없는 열 찾기'),
      ref('csv', 'kept = [c for c in orig.columns', 'removed = [c for c in orig.columns', '열을 셋으로 나누는 리스트 내포'),
    ],
  },
  {
    id: 'errors', title: 'try/except와 raise: 넘어갈 때와 멈출 때',
    learn: [
      '`try:` 안에서 오류가 나면 바로 `except 오류이름:` 쪽으로 가서 멈추지 않고 이어 갑니다. 미션의 problem은 float 변환이 실패하면 "거리가 숫자가 아닙니다"를 돌려줍니다.',
      '`raise ValueError(\'…\')`는 일부러 멈춥니다. 열이 없는 CSV처럼 파일 전체가 틀렸을 때 엉뚱한 결과를 내지 않기 위해서입니다. `raise SystemExit(\'…\')`는 분석할 행이 없을 때 안내하고 멈춥니다.',
      '정리: 행 하나의 문제는 빼고 계속, 파일 전체의 문제는 멈춤.',
    ],
    example: py`
for text in ['3', '3.5', '셋', '']:
    try:
        d = float(text)
        print(repr(text), '→', d)
    except ValueError:
        print(repr(text), '→ 거리가 숫자가 아닙니다')

NEED = ['trial', 'success']
columns = ['trial']
lost = [c for c in NEED if c not in columns]
try:
    if lost:
        raise ValueError(f'없는 열: {lost}')
except ValueError as e:
    print('멈춤:', e)`,
    blank: { code: py`
def to_float(v):
    ___:
        return float(v)
    except ___:
        return None
print(to_float('-48'), to_float("'-48"))`, fills: ['try', 'ValueError'], hint: '오류가 날 수 있는 줄을 감싸는 말과, float이 글자를 숫자로 못 바꿀 때 내는 오류 이름입니다.' },
    write: {
      task: "간섭 미션 규칙: energy_problem(value, unit)은 value가 비어 있으면 '', 단위가 없으면 '단위 없는 숫자는 쓰지 않습니다', 숫자가 아니면 '에너지 값이 숫자가 아닙니다', 그 밖에는 ''를 돌려줍니다.",
      answer: py`
def energy_problem(value, unit):
    if value:
        if not unit:
            return '단위 없는 숫자는 쓰지 않습니다'
        try:
            float(value)
        except ValueError:
            return '에너지 값이 숫자가 아닙니다'
    return ''
print(repr(energy_problem('-55', '')), repr(energy_problem('높음', 'dBm')))`,
      check: "assert energy_problem('', '') == ''\nassert energy_problem('-55', '') == '단위 없는 숫자는 쓰지 않습니다'\nassert energy_problem('높음', 'dBm') == '에너지 값이 숫자가 아닙니다'\nassert energy_problem('-55', 'dBm') == ''",
    },
    pitfall: { code: "def p(r):\n    try:\n        d = flaot(r)   # float 오타\n    except:\n        return '거리가 숫자가 아닙니다'\n    return ''\n\nprint(p('3'))", note: '이름 없는 except:는 오타(NameError)까지 삼켜 "거리가 숫자가 아닙니다"로 숨깁니다. 미션 코드처럼 except ValueError:로 잡을 오류를 적습니다.' },
    why: '잘못 적은 행 하나 때문에 전체 분석이 멈추면 안 되고, 다른 워크북의 파일을 올렸을 때 계속 계산하면 안 됩니다. try와 raise가 이 두 경우를 나눕니다.',
    variant: { q: '열이 다 있는데 데모 기록만 있는 CSV를 SOURCE = "upload"로 분석하면 어디서 멈출까요?', answer: "MODE가 real이 되어 data가 0행이 됩니다. 검사 뒤 `if data.empty: raise SystemExit('분석할 행이 없습니다…')`에서 멈춥니다. 오류가 아니라 SOURCE와 data_type을 확인하라는 안내입니다." },
    refs: [
      ref('nfc', 'def problem(r):', "    return ''", 'try 안에서 거리를 숫자로 바꿔 봅니다.'),
      ref('interference', 'def problem(r):', "    return ''", '08 간섭: 단위 없는 숫자와 숫자가 아닌 값을 거릅니다.'),
      ref('nfc', 'if data.empty:', 'raise SystemExit', '분석할 행이 없을 때'),
    ],
  },
  {
    id: 'regex', title: '정규식과 글자 메서드: 값의 모양 검사',
    learn: [
      '`re.fullmatch(패턴, v)`는 글자 전체가 패턴 모양인지 봅니다. `re.match`는 앞부분만 봅니다. 패턴 앞의 r은 백슬래시를 그대로 쓰라는 표시입니다.',
      '패턴 조각: `\\d` 숫자 한 자리, `+` 하나 이상, `-?` 마이너스가 있어도 없어도, `[0-9a-fA-F]{64}` 16진수 64자리, `[A-Za-z]` 영문 한 글자, `{0,19}` 0~19번, `^` 맨 앞.',
      '글자 메서드: `.strip()` 앞뒤 빈칸 지우기, `.startswith(\'https://\')`, `.endswith(\'.csv\')`, `.lower()` 소문자로, `.isdigit()` 숫자로만 되어 있나.',
    ],
    example: py`
import re
for v in ['-48', '-48.5', '48dBm']:
    print(v, bool(re.fullmatch(r'-?\d+', v)))
h = 'AB' * 32
print(len(h), bool(re.fullmatch(r'[0-9a-fA-F]{64}', h)), h.lower() == 'ab' * 32)
print('https://example.org/fw.bin'.startswith('https://'))
print(repr('  지갑 '.strip()))
print(bool(re.fullmatch(r'C-[A-Za-z0-9_-]{1,20}', 'C-A')), bool(re.fullmatch(r'C-[A-Za-z0-9_-]{1,20}', 'POWER')))
print(bool(re.match(r"^'+\s*[=+\-@]", "'-48")), bool(re.match(r"^'+\s*[=+\-@]", "it's")))`,
    blank: { code: py`
import re
def is_int(v, lo, hi):
    return bool(re.fullmatch(r'-?\d+', v)) ___ lo <= int(v) <= hi
print(is_int('-48', -120, 0), is_int('5', -120, 0), is_int('-4.8', -120, 0))`, fills: ['and'], hint: '모양이 정수이고 그리고 범위 안이어야 합니다. 앞이 거짓이면 뒤는 계산하지 않아 int("-4.8") 오류가 나지 않습니다.' },
    write: {
      task: 'SSID 미션 규칙: is_alias(v)는 v가 영문으로 시작하고 영문·숫자·_·-로만 된 1~20글자이면 True를 돌려줍니다(re.fullmatch 사용).',
      setup: 'import re', answer: py`
def is_alias(v):
    return bool(re.fullmatch(r'[A-Za-z][A-Za-z0-9_-]{0,19}', v))
print(is_alias('AP-A'), is_alias('우리집'))`,
      check: "assert is_alias('AP-A') and is_alias('A' * 20)\nassert not is_alias('우리집') and not is_alias('1AP') and not is_alias('A' * 21) and not is_alias('')",
    },
    pitfall: { code: "import re\nv = '-4.8'\nprint(-120 <= int(v) <= 0 and bool(re.fullmatch(r'-?\\d+', v)))", note: '순서를 바꿔 범위를 먼저 보면 int("-4.8")에서 ValueError로 멈춥니다. 모양 검사를 먼저 둡니다.' },
    why: '실제 SSID나 BSSID가 별칭 칸에 그대로 들어가는 것을 막고(개인 정보), 숫자 칸에 단위·소수·오타가 섞인 행을 걸러 냅니다. 해시는 64자리 16진수인지 먼저 봐야 비교가 의미 있습니다.',
    variant: { q: '펌웨어 판단에서 해시를 .lower() 없이 비교하면, 대문자로 적은 같은 해시는 어떻게 판단될까요?', code: `${fwDecision.text}\n\nh = 'ab' * 32\nr = {'observation_status': 'observed', 'expected_sha256': h.upper(), 'actual_sha256': h, 'signature': 'valid', 'recovery': 'ready'}\nprint(decision(r))\nprint(r['expected_sha256'] == r['actual_sha256'])`, answer: "원문 decision은 .lower()로 맞춰 비교해 '설치 검토 가능'입니다. 그냥 ==로 비교하면 False라 같은 파일을 '해시 불일치'로 잘못 판단합니다. 16진수는 대소문자가 같은 값입니다." },
    refs: [
      ref('wifi-rssi', 'def is_int(v, lo, hi):', 'return bool(re.fullmatch', '02·05·06·11 미션의 정수 검사'),
      ref('ssid-map', 'def problem(r):', "    return ''", '03 SSID: 별칭 모양 검사'),
      ref('ir', 'def problem(r):', "    return ''", '09 IR: 명령은 C-A 같은 별칭'),
      ref('firmware', 'def problem(r):', "    return ''", '12 펌웨어: SHA-256 64자리, HTTPS 출처'),
    ],
  },
  {
    id: 'files', title: '파일: StringIO, open, upload, JSON',
    learn: [
      "`io.StringIO(글자)`는 글자를 파일처럼 읽게 해 줍니다. 코드 안의 SAMPLE_CSV를 read_csv에 넣을 때 씁니다.",
      "`with open(경로, encoding='utf-8-sig') as f:` 아래에서 `f.read()`로 파일 전체를 글자로 읽고, 블록이 끝나면 파일이 닫힙니다. utf-8-sig는 엑셀 등이 맨 앞에 붙이는 표시(BOM)를 떼어 줍니다. 미션 원문의 `read_text().lstrip('')`도 따옴표 안에 보이지 않는 BOM 글자가 들어 있어 같은 일을 합니다.",
      "Colab의 `files.upload()`는 `{파일 이름: 바이트}` 딕셔너리를 돌려주고, `.decode('utf-8-sig')`로 글자로 바꿉니다. `json.dumps(summary, ensure_ascii=False)`는 딕셔너리를 한글 그대로 JSON 글자로 만듭니다. 아래 예제는 업로드 결과를 같은 모양의 딕셔너리로 흉내 냅니다.",
    ],
    example: py`
import io, json
uploaded = {'memo.txt': b'x', 'nfc-experiment.csv': '\ufefftrial,success\n1,1\n'.encode('utf-8')}
name = next(n for n in uploaded if n.endswith('.csv'))
text = uploaded[name].decode('utf-8-sig')
print(name, repr(text))
with open('saved.csv', 'w', encoding='utf-8') as f:
    f.write(text)
with open('saved.csv', encoding='utf-8-sig') as f:
    print(repr(f.read()))
f = io.StringIO(text)
print(f.readline().strip())
print(json.dumps({'성공': '1'}, ensure_ascii=False), json.dumps({'성공': '1'}))`,
    blank: { code: py`
import json
summary = {'기록 행': '30', '단독 성공/시도': '9/10'}
print('검증용 JSON:', json.___(summary, ensure_ascii=___))`, fills: ['dumps', 'False'], hint: '딕셔너리를 JSON 글자로 바꾸는 함수와, 한글을 \\uc131 같은 기호로 바꾸지 말라는 값입니다.' },
    write: {
      task: "CSV 미션의 업로드처럼 uploaded에서 이름에 'original'이 들어간 파일과 'pseudonym'이 들어간 파일을 골라 글자로 바꿔 o_text, p_text에 담으세요.",
      setup: "uploaded = {'csv-real-pseudonymized.csv': 'uid_alias\\n열1-1\\n'.encode('utf-8'), 'csv-real-original.csv': '\\ufeffuid\\nA\\n'.encode('utf-8')}", answer: py`
names = sorted(uploaded)
orig = next(n for n in names if 'original' in n)
pseu = next(n for n in names if 'pseudonym' in n)
o_text, p_text = uploaded[orig].decode('utf-8-sig'), uploaded[pseu].decode('utf-8-sig')
print(repr(o_text), repr(p_text))`,
      check: "assert o_text == 'uid\\nA\\n', o_text\nassert p_text.startswith('uid_alias')",
    },
    pitfall: { code: "raw = '\\ufefftrial,success'.encode('utf-8')\nfirst = raw.decode('utf-8').split(',')[0]\nprint(repr(first), first == 'trial')", note: "utf-8로만 풀면 맨 앞의 BOM 기호가 남아 첫 열 이름이 'trial'과 달라집니다. 그러면 열 확인에서 trial이 없다고 멈춥니다. 미션은 utf-8-sig와 lstrip('\\ufeff')를 씁니다." },
    why: '같은 분석 코드가 sample(코드 안 글자), upload(Colab), file(내 PC) 세 경우에 똑같이 돌도록 read_text가 늘 "글자"를 돌려줍니다. 마지막 검증용 JSON은 8장 브라우저 결과와 한 줄로 대조하기 위한 것입니다.',
    variant: { q: 'ensure_ascii=False를 빼도 JSON을 다시 읽으면 같은 값일까요?', code: "import json\ntext = json.dumps({'성공': '1'})\nprint(text, json.loads(text) == {'성공': '1'})", answer: '네, 값은 같습니다. 보이는 모양만 \\uc131\\uacf5처럼 바뀌어 사람이 읽기 어렵습니다. 미션은 눈으로 대조하므로 False를 씁니다.' },
    refs: [
      ref('nfc', 'def read_text():', 'return f.read()', 'sample, upload, file 세 경우 모두 글자를 돌려줍니다.'),
      ref('csv', 'def read_pair():', 'return f.read(), g.read()', '13 CSV: 원본과 가명본 두 파일'),
      ref('notebook', 'import zipfile', 'files.download("nfc-analysis-results.zip")', 'NFC 노트북: 그림과 원자료를 zip으로 묶어 내려받기'),
    ],
  },
];

/* ───────────────────────── 4차시: pandas 표 다루기 ───────────────────────── */
const T = py`
import io
import pandas as pd
T = """trial,condition,distance_cm,success,note,data_type
1,단독,1,1,,demo
2,단독,3,1,,demo
3, 지갑,1,0,,demo
4,지갑,3,,기록 못 함,demo
5,가방,셋,1,,demo
1,단독,1,1,,real
"""
table = pd.read_csv(io.StringIO(T), dtype=str, keep_default_na=False)`;
const withT = (code: string) => `${T}\n\n${code}`;
const nfcUnguard = excerpt(NFC, 'def unguard(v):', 'return v[1:]');

const L4: Step[] = [
  {
    id: 'frame', title: 'read_csv(dtype=str)와 DataFrame, Series',
    learn: [
      'DataFrame은 행과 열이 있는 표, Series는 그 열 하나입니다. Series는 왼쪽에 행 이름표(index)를 달고 있습니다. `table[\'success\']`는 Series, `table[[\'condition\', \'success\']]`는 열 두 개짜리 DataFrame입니다.',
      "기본 read_csv는 숫자처럼 보이는 열을 숫자로 바꾸고 빈 칸을 NaN(숫자 아님)으로 만듭니다. 미션은 `dtype=str, keep_default_na=False`로 읽어 모든 칸이 글자, 빈 칸은 빈 글자 ''가 됩니다.",
      '이 차시의 예제는 모두 아래 6행짜리 가상 CSV T를 씁니다. 지갑 앞의 빈칸, 비어 있는 success, 숫자가 아닌 거리 "셋", real 1행이 일부러 들어 있습니다.',
    ],
    example: withT(py`
print(table.shape, list(table.columns))
print(table.head(3))
print(type(table['success']).__name__, type(table[['condition', 'success']]).__name__)
default = pd.read_csv(io.StringIO(T))
print(default['success'].tolist())
print(table['success'].tolist())`),
    blank: { code: withT(py`
raw = pd.read_csv(io.StringIO(T), dtype=___, keep_default_na=___)
print(repr(raw.loc[3, 'success']), repr(raw.loc[0, 'success']))`), fills: ['str', 'False'], hint: "모든 칸을 글자로 읽는 자료형 이름과, 빈 칸을 NaN으로 바꾸지 말라는 값입니다. 출력은 '' 와 '1'입니다." },
    write: {
      task: 'table에서 condition과 success 두 열만 고른 표 two를 만들고, 전체 행 수를 n에 담으세요.',
      setup: T, answer: py`
two = table[['condition', 'success']]
n = len(table)
print(two.shape, n)`,
      check: "assert list(two.columns) == ['condition', 'success']\nassert n == 6",
    },
    pitfall: { code: withT(py`
default = pd.read_csv(io.StringIO(T))
print((default['success'] == '1').sum(), '개가 글자 1과 같음')`), note: "기본으로 읽으면 success가 1.0 같은 실수라서 글자 '1'과 하나도 같지 않습니다. 오류 없이 성공 0회로 계산되는 함정입니다." },
    why: "빈 칸(측정 안 함), 0(실패), '셋'(잘못 적음)을 원래 모습 그대로 보존해야 검사 함수가 셋을 구별할 수 있습니다. 그래서 13개 미션 모두 dtype=str로 읽습니다.",
    variant: { q: 'keep_default_na=False만 빼면 비어 있는 success 칸은 무엇이 될까요?', code: withT("print(repr(pd.read_csv(io.StringIO(T), dtype=str).loc[3, 'success']))"), answer: "nan이 됩니다. 빈 글자 비교(r['success'] == '')가 맞지 않고, 글자 메서드도 쓸 수 없어 검사가 꼬입니다." },
    refs: [ref('nfc', 'table = pd.read_csv', 'raise ValueError', '읽고 바로 열을 확인합니다.')],
  },
  {
    id: 'mask', title: '마스크로 행 거르기: ==, &, |, ~, isin, .copy()',
    learn: [
      "`table['data_type'] == 'demo'`는 행마다 True/False가 든 Series(마스크)입니다. `table[마스크]`는 True인 행만 남긴 새 표입니다. 원래 table은 바뀌지 않습니다.",
      '두 조건은 `(조건1) & (조건2)` 그리고, `(조건1) | (조건2)` 또는, `~조건` 아님입니다. 조건마다 괄호를 씁니다. `.isin([\'0\', \'1\'])`은 목록 중 하나인지 봅니다.',
      '거른 표에 새 열을 더할 거라면 `.copy()`로 따로 떼어 둡니다. 미션 코드는 표를 그 자리에서 고치지(inplace) 않고 data, seen 같은 새 표를 만들어 이름을 붙입니다.',
    ],
    example: withT(py`
mask = table['data_type'] == 'demo'
print(mask.tolist())
demo = table[mask].copy()
print(len(table), len(demo))
both = table[(table['data_type'] == 'demo') & (table['success'] == '1')]
print(both['trial'].tolist())
either = table[(table['condition'] == '단독') | (table['condition'] == '가방')]
print(either['trial'].tolist())
print(table[~table['success'].isin(['0', '1'])]['trial'].tolist())`),
    blank: { code: withT(py`
obs = table[(table['data_type'] == 'demo') ___ (table['distance_cm'] == '1')]
print(obs['trial'].tolist())`), fills: ['&'], hint: '두 조건이 모두 참인 행입니다. 출력은 ["1", "3"]입니다.' },
    write: {
      task: 'data_type이 demo이고 success가 비어 있지 않은 행만 담은 새 표 valid를 .copy()로 만드세요.',
      setup: T, answer: py`
valid = table[(table['data_type'] == 'demo') & (table['success'] != '')].copy()
print(valid['trial'].tolist())`,
      check: "assert valid['trial'].tolist() == ['1', '2', '3', '5'], valid['trial'].tolist()\nassert valid is not table and len(table) == 6",
    },
    pitfall: { code: withT("print(len(table[table['data_type'] == 'Demo']), '행')"), note: "대소문자 하나만 달라도 0행입니다. 오류는 나지 않고, 미션 코드에서는 '분석할 행이 없습니다'로 멈춥니다." },
    why: '한 CSV에 데모와 실제, 관찰 행과 서술 행, 여러 워크북의 행이 함께 있을 수 있습니다. 거르지 않으면 행 수와 비율이 섞입니다.',
    variant: { q: '단독 또는 가방을 고르려다 | 대신 &를 쓰면 몇 행일까요?', code: withT("print(len(table[(table['condition'] == '단독') & (table['condition'] == '가방')]))"), answer: '0행입니다. 한 칸이 동시에 단독이면서 가방일 수는 없습니다. "또는"은 |입니다.' },
    refs: [
      ref('wpa-pmf', "obs = table[(table['record_type'] == 'observation')", "print(f'1. 불러오기", '관찰 행이면서 이 워크북인 행, 그다음 데모/실제'),
      ref('nfc', "data = table[table['data_type'] == MODE].copy()", "print(f'1. 불러오기", '01 NFC'),
    ],
  },
  {
    id: 'loc', title: 'index, .loc, .at, .iloc: 칸과 열 집어내기',
    learn: [
      '행 이름표(index)는 거른 뒤에도 원래 번호를 유지합니다. demo의 index는 0~4, real 행은 5입니다.',
      "`.loc[마스크, '열']`은 조건에 맞는 행의 한 열(Series), `.at[행 이름표, '열']`은 칸 하나, `data.index[마스크]`는 조건에 맞는 행 이름표들입니다.",
      "`.iloc[0]`은 이름표와 상관없이 위치로 첫 번째입니다. `.tolist()`는 Series를 리스트로 바꿉니다.",
    ],
    example: withT(py`
demo = table[table['data_type'] == 'demo']
print(demo.index.tolist())
print(demo.loc[demo['condition'] == '단독', 'success'].tolist())
print(demo.at[3, 'note'])
bad = demo.index[demo['success'] == '']
print(bad.tolist())
print(demo['condition'].iloc[0], demo['condition'].iloc[-1])`),
    blank: { code: withT(py`
demo = table[table['data_type'] == 'demo']
values = demo.loc[demo['success'] ___ '', ___]
print(values.tolist())`), fills: ['!=', "'distance_cm'"], hint: 'success가 빈 글자가 아닌 행의 거리 열입니다. 출력은 ["1", "3", "1", "셋"]입니다.' },
    write: {
      task: 'data_type이 real인 행을 고르고, 그 행의 이름표 i와 trial 칸 값 t를 .at으로 꺼내세요.',
      setup: T, answer: py`
real = table[table['data_type'] == 'real']
i = real.index[0]
t = real.at[i, 'trial']
print(i, t)`,
      check: "assert i == 5 and t == '1', (i, t)",
    },
    pitfall: { code: withT("demo = table[table['data_type'] == 'demo']\nprint(demo.at[5, 'trial'])"), note: '거른 표에는 5번 행이 없어 KeyError입니다. 번호는 원래 표의 이름표를 따릅니다.' },
    why: "미션의 '제외한 행' 출력은 `data.index[reasons != '']`로 문제 행 이름표를 찾고 `.at`으로 칸을 꺼냅니다. `.loc[rs['rssi_dbm'] != '', 'rssi_dbm']`은 빈 RSSI를 뺀 값만 중앙값에 넣습니다.",
    variant: { q: "간섭 미션의 `unit_rows['energy_unit'].iloc[0]`을 `.loc[0]`으로 바꾸면 어떻게 될까요?", code: withT("units = pd.Series(['dBm', 'dBm'], index=[4, 7])\nprint(units.iloc[0])\ntry:\n    print(units.loc[0])\nexcept KeyError as e:\n    print('KeyError', e)"), answer: '거른 행의 이름표가 0이 아니면 KeyError입니다. "남은 것 중 첫 번째"는 위치인 iloc으로 꺼냅니다.' },
    refs: [
      ref('nfc', 'for i in data.index[reasons != ', "data = data[reasons == ''] if len(data) else data", '문제 행을 출력하고 깨끗한 행만 남깁니다.'),
      ref('channel', "summary[f'{g} AP 수 중앙값']", "summary[f'{g} RSSI 중앙값']", '05 채널: 빈 칸을 뺀 값만 중앙값에'),
      ref('interference', "unit_rows = rs[rs['energy_unit'] != '']", "unit = unit_rows['energy_unit'].iloc[0]", '08 간섭: 단위가 있는 행 가운데 첫 단위'),
    ],
  },
  {
    id: 'convert', title: '변환: astype, to_numeric, 빈 값과 0',
    learn: [
      "`Series.astype(int)`·`astype(float)`은 모든 값을 바꿉니다. 하나라도 못 바꾸면 오류입니다. 그래서 검사로 이상한 값을 먼저 뺍니다.",
      "`pd.to_numeric(s, errors='coerce')`는 못 바꾸는 값을 NaN으로 둡니다(노트북은 errors 없이 써서 이상한 값이 있으면 멈춥니다).",
      "`(s == '1').astype(int)`는 True→1, False→0입니다. 빈 칸 ''를 '0'으로 바꾸면 '측정 안 함'이 '실패'가 됩니다.",
    ],
    example: py`
import pandas as pd
s = pd.Series(['1', '0', '', '1'])
print((s == '1').astype(int).tolist())
print(pd.to_numeric(s, errors='coerce').tolist())
print(s.replace('', '0').astype(int).tolist())
valid = s[s != '']
print(round(valid.astype(int).mean(), 3), s.replace('', '0').astype(int).mean())`,
    blank: { code: withT(py`
d = table.loc[table['distance_cm'] != '셋', 'distance_cm'].astype(___)
print(d.tolist(), d.___())`), fills: ['float', 'median'], hint: '거리는 실수로, 가운데 값은 중앙값입니다. 출력의 중앙값은 1.0입니다.' },
    write: {
      task: "table의 success 가운데 '0' 또는 '1'인 값만 골라 정수로 바꾸고, 성공률(%)을 소수 첫째 자리로 rate에 담으세요.",
      setup: T, answer: py`
ok = table.loc[table['success'].isin(['0', '1']), 'success'].astype(int)
rate = round(ok.sum() / len(ok) * 100, 1)
print(ok.tolist(), rate)`,
      check: 'assert rate == 80.0, rate',
    },
    pitfall: { code: withT("print(table['distance_cm'].astype(float))"), note: "'셋'이 있어 ValueError입니다. 미션은 problem 검사로 이런 행을 먼저 뺀 다음에 astype을 씁니다." },
    why: '변환은 검사가 끝난 뒤에만 합니다. 빈 칸은 "기록하지 않음"이라 0으로 채우지 않습니다. 0으로 채우면 인식률·관찰률이 실제보다 낮아집니다.',
    variant: { q: "GPS 미션에서 fix된 행의 대기 시간이 ['30', '', '90']이라면, 요약의 중앙값과 그래프 막대 값은 같을까요?", code: py`
import pandas as pd
waits = pd.Series(['30', '', '90'])
print('요약(빈 칸 뺌):', waits[waits != ''].astype(float).median())
print("그래프(replace('', '0')):", waits.replace('', '0').astype(float).median())`, answer: "다릅니다. 요약은 빈 대기 시간을 빼 60초, 그래프 줄은 빈 칸을 0으로 바꿔 30초입니다. GPS 원문의 그래프는 fix된 행만 쓰고 골든 데이터에는 빈 대기 시간이 없어 같게 나오지만, 내 기록에 빈 칸이 있으면 막대가 요약보다 낮게 보일 수 있습니다. 결론은 요약 값으로 씁니다." },
    refs: [
      ref('nfc', "data['ok'] = ", "data['d'] = ", '검사 뒤에 1/0과 실수 거리로 바꿉니다.'),
      ref('gps', "labels.append(place); waits.append", "labels.append(place); waits.append", '11 GPS: 그래프 막대는 빈 대기를 0으로 바꿔 계산합니다.'),
      ref('notebook', 'data["distance_cm"] = pd.to_numeric', 'raise SystemExit("success는', 'NFC 노트북: to_numeric, astype, isin으로 검사'),
    ],
  },
  {
    id: 'apply', title: 'map과 apply: 모든 칸·모든 행에 함수 쓰기, 열 만들기',
    learn: [
      "`Series.map(함수)`는 칸마다 함수를 적용합니다. `table.apply(lambda col: col.map(unguard))`는 열마다 → 칸마다, 곧 모든 칸에 unguard를 씁니다.",
      "`data.apply(problem, axis=1)`은 행마다 problem을 불러 이유 Series를 만듭니다. axis=1이 '행마다'입니다.",
      "`data['group'] = data['condition'] + ' ' + data['distance_m'] + 'm'`처럼 글자 열끼리 이어 새 열을 만들 수 있고, `.str.strip()`은 열 전체의 앞뒤 빈칸을 지웁니다.",
    ],
    example: `import re\nimport pandas as pd\n\n${nfcUnguard.text}\n\nt = pd.DataFrame({'rssi_dbm': ["'-48", '-50'], 'note': ["'=1+1", "it's"]})\nt = t.apply(lambda col: col.map(unguard))\nprint(t.values.tolist())\nrows = pd.DataFrame({'condition': ['같은 방', ' 벽 너머 '], 'distance_m': ['1', '5']})\nrows['condition'] = rows['condition'].str.strip()\nrows['group'] = rows['condition'] + ' ' + rows['distance_m'] + 'm'\nprint(rows['group'].tolist())`,
    blank: { code: py`
import pandas as pd
rows = pd.DataFrame({'condition': ['같은 방', '벽 너머'], 'distance_m': ['1', '5']})
rows['group'] = rows['condition'] + ' ' + rows['distance_m'] + ___
print(rows['group'].tolist())
reasons = rows.apply(lambda r: '' if r['distance_m'] != '5' else '멀다', axis=___)
print(reasons.tolist())`, fills: ["'m'", '1'], hint: "끝에 붙일 단위 글자와, 행마다 적용하라는 axis 값입니다." },
    write: {
      task: "table의 condition 앞뒤 빈칸을 .str.strip()으로 지우고, success가 '1'이면 1, 아니면 0인 새 열 ok를 만드세요.",
      setup: T, answer: py`
table['condition'] = table['condition'].str.strip()
table['ok'] = (table['success'] == '1').astype(int)
print(table['condition'].tolist(), table['ok'].tolist())`,
      check: "assert table['condition'].tolist()[2] == '지갑'\nassert table['ok'].tolist() == [1, 1, 0, 0, 1, 1]",
    },
    pitfall: { code: "import pandas as pd\nrows = pd.DataFrame({'distance_m': ['1', '5']})\nprint(rows.apply(lambda r: r['distance_m']))", note: 'axis=1을 빼면 행이 아니라 열마다 함수가 불려 KeyError입니다.' },
    why: '수십 행을 for로 직접 돌리지 않고 같은 규칙을 한 번에 적용합니다. 결과가 행 이름표에 맞춰 붙어 reasons != \'\' 같은 마스크로 바로 쓸 수 있습니다.',
    variant: { q: "unguard를 적용하지 않으면 \"'-48\"이 정수 검사를 통과할까요?", code: `import re\n\n${wifiIsInt.text}\n\nprint(is_int("'-48", -120, 0), is_int('-48', -120, 0))`, answer: "통과하지 못합니다(False). 저장할 때 붙인 따옴표가 남아 있으면 BLE·채널 미션의 RSSI 행이 모두 '잘못된 행'으로 빠집니다. 그래서 읽자마자 모든 칸에 unguard를 씁니다." },
    refs: [
      ref('nfc', 'table = table.apply(lambda col', "table['condition'] = ", '모든 칸 unguard, 조건 빈칸 지우기'),
      ref('ble-ad', "data['group'] = data['condition']", "data['group'] = data['condition']", '06 BLE 광고: 조건과 거리를 이어 그룹 이름'),
      ref('nfc', 'reasons = data.apply(problem, axis=1)', 'reasons = data.apply(problem, axis=1)', '행마다 검사'),
    ],
  },
];

/* ───────────────────────── 5차시: 묶고 세고 그리기 ───────────────────────── */
const D = py`
import pandas as pd
D = pd.DataFrame({
    'condition': ['같은 방', '같은 방', '같은 방', '벽 너머', '벽 너머', '벽 너머'],
    'distance_m': ['1', '1', '3', '5', '5', '5'],
    'observation_status': ['observed', 'observed', 'not-observed', 'observed', 'unchecked', 'not-observed'],
    'rssi_dbm': ['-50', '-48', '', '-79', '', ''],
})`;
const withD = (code: string) => `${D}\n\n${code}`;
const ratioFn = excerpt(NFC, 'def ratio(rs):', "return f'{seen}/{tried}'");
const N = py`
import pandas as pd
data = pd.DataFrame({
    'condition': ['단독', '단독', '단독', '지갑', '지갑', '지갑'],
    'distance_cm': [1.0, 1.0, 3.0, 1.0, 3.0, 3.0],
    'ok': [1, 1, 1, 1, 0, 1],
})`;

const L5: Step[] = [
  {
    id: 'count', title: '참의 개수와 요약 값: sum, unique, nunique, median',
    learn: [
      "마스크에 `.sum()`을 하면 True가 1로 더해져 '조건에 맞는 행 수'가 됩니다. 미션 summary의 '관찰됨', '측정하지 못함'이 이렇게 셉니다.",
      '`.unique()`는 서로 다른 값 목록, `.nunique()`는 그 개수, `.median()`은 가운데 값, `min`·`max`는 가장 작은·큰 값입니다.',
      '중앙값은 튀는 값 하나에 덜 흔들립니다. 그래서 RSSI·AP 수·대기 시간 미션은 평균 대신 중앙값을 씁니다.',
    ],
    example: withD(py`
print(int((D['observation_status'] == 'observed').sum()), '행 관찰됨')
print(D['condition'].unique().tolist(), D['condition'].nunique())
values = D.loc[D['rssi_dbm'] != '', 'rssi_dbm'].astype(float)
print(values.tolist(), values.median(), values.min(), values.max())
print(D['observation_status'].value_counts().to_dict())`),
    blank: { code: withD(py`
print(int((D['observation_status'] == ___).sum()))
print(D['distance_m'].___())`), fills: ["'unchecked'", 'nunique'], hint: "측정하지 못함은 unchecked입니다. 서로 다른 거리 값의 개수를 세는 메서드입니다. 출력은 1과 3입니다." },
    write: {
      task: 'RSSI가 비어 있지 않은 값만 실수로 바꿔 중앙값을 m에, 관찰되지 않음(not-observed) 행 수를 miss에 담으세요.',
      setup: D, answer: py`
m = D.loc[D['rssi_dbm'] != '', 'rssi_dbm'].astype(float).median()
miss = int((D['observation_status'] == 'not-observed').sum())
print(m, miss)`,
      check: 'assert m == -50.0 and miss == 2, (m, miss)',
    },
    pitfall: { code: withD("print(D['rssi_dbm'].astype(float).median())"), note: '빈 칸까지 바꾸려 해서 ValueError입니다. 값이 있는 칸만 .loc으로 고른 뒤 바꿉니다.' },
    why: '현장 기록형 미션은 모두 관찰됨·관찰되지 않음·측정하지 못함을 먼저 세어 출력합니다. 숫자 열은 빈 칸을 뺀 값으로 중앙값과 범위를 냅니다.',
    variant: { q: 'RSSI [-50, -48, -79]의 평균과 중앙값은 얼마이고, 어느 쪽이 -79 하나에 더 끌려갈까요?', code: "import pandas as pd\nv = pd.Series([-50.0, -48.0, -79.0])\nprint(round(v.mean(), 1), v.median())", answer: '평균 -59.0, 중앙값 -50.0입니다. 평균이 튀는 값 -79 쪽으로 끌려갑니다. 측정 몇 번 가운데 하나가 튀는 경우가 흔해 미션은 중앙값을 씁니다.' },
    refs: [
      ref('wifi-rssi', 'for room in sorted(', "    summary[f'{room} 미측정']", '02 Wi-Fi: 방마다 유효 n, 중앙값, 범위, 못 찾음, 미측정'),
      ref('ssid-map', "for g, rs in seen.groupby('ssid_alias', sort=False):", "labels.append(g); counts.append(rs['bssid_alias'].nunique())", '03 SSID: 같은 이름에 서로 다른 BSSID 별칭 수'),
    ],
  },
  {
    id: 'groupby', title: 'groupby로 묶어 반복: for g, rs in data.groupby(...)',
    learn: [
      "`data.groupby('condition', sort=False)`는 condition 값이 같은 행끼리 작은 표로 나눕니다. `for g, rs in …:`에서 g는 그룹 이름, rs는 그 그룹의 행들입니다.",
      'sort=False는 처음 나온 순서, 기본(sort=True)은 가나다순입니다. 순서가 곧 그래프의 G1, G2 순서입니다.',
      "`for c in data['condition'].unique():` 다음 줄에 `rs = data[data['condition'] == c]`라고 써도 같은 일을 합니다. 6개 미션이 groupby 모양, NFC·Wi-Fi·GPS가 이 모양입니다.",
    ],
    example: withD(py`
for g, rs in D.groupby('condition', sort=False):
    print(g, len(rs), '행, 관찰됨', int((rs['observation_status'] == 'observed').sum()))
for c in D['condition'].unique():
    rs = D[D['condition'] == c]
    print(c, len(rs))`),
    blank: { code: withD(py`
for g, rs in D.groupby(___, sort=False):
    print(g, rs['rssi_dbm'].tolist())`), fills: ["'distance_m'"], hint: '거리 열 이름으로 묶습니다. 1, 3, 5 세 그룹이 나옵니다.' },
    write: {
      task: "D에 group 열(condition + ' ' + distance_m + 'm')을 만들고 groupby로 반복해, 그룹 이름을 이름표로 '관찰됨 수/전체 행 수' 글자를 out 딕셔너리에 담으세요.",
      setup: D, answer: py`
D['group'] = D['condition'] + ' ' + D['distance_m'] + 'm'
out = {}
for g, rs in D.groupby('group', sort=False):
    out[g] = f"{int((rs['observation_status'] == 'observed').sum())}/{len(rs)}"
print(out)`,
      check: "assert out == {'같은 방 1m': '2/2', '같은 방 3m': '0/1', '벽 너머 5m': '1/3'}, out",
    },
    pitfall: { code: "import pandas as pd\nd = pd.DataFrame({'condition': ['지갑', ' 지갑', '단독']})\nprint([g for g, rs in d.groupby('condition', sort=False)])", note: "앞에 빈칸이 있는 ' 지갑'은 다른 그룹이 됩니다. 오류 없이 조건이 둘로 갈라져 시도 수가 나뉩니다. NFC 코드가 .str.strip()을 먼저 하는 이유입니다." },
    why: '그룹마다 같은 계산을 반복해 summary에 넣고, labels와 값 리스트를 모아 그래프로 넘깁니다. 모든 현장 기록형 미션의 "계산" 부분이 이 반복입니다.',
    variant: { q: "조건이 '지갑', '단독' 순으로 처음 나올 때 sort=False를 빼면 G1은 무엇이 될까요?", code: "import pandas as pd\nd = pd.DataFrame({'condition': ['지갑', '단독', '지갑']})\nprint([g for g, rs in d.groupby('condition', sort=False)], [g for g, rs in d.groupby('condition')])", answer: "sort=False면 ['지갑', '단독'], 기본이면 가나다순 ['단독', '지갑']입니다. 그래프 G1의 뜻이 바뀌므로 그림 위에 출력된 'G1 = …'을 꼭 읽습니다." },
    refs: [
      ref('ble-ad', "for g, rs in data.groupby('group', sort=False):", "labels.append(g); rates.append", '06 BLE 광고'),
      ref('interference', "for g, rs in data.groupby('condition', sort=False):", "labels.append(g); counts.append", '08 간섭'),
      ref('ir', "data['group'] = data['button']", "labels.append(g); rates.append", '09 IR: 버튼과 조건을 이어 묶기'),
    ],
  },
  {
    id: 'denominator', title: '분모: ratio와 "측정하지 못함"',
    learn: [
      "비율은 분자/분모입니다. 미션의 ratio는 분자 = 관찰됨(observed), 분모 = 측정하지 못함(unchecked)을 뺀 시도입니다.",
      'not-observed는 "보러 갔지만 못 봄"이라 시도에 넣고, unchecked는 "보지 못하고 지나감"이라 뺍니다. NFC에서 빈 success를 검사에서 빼는 것과 같은 생각입니다.',
      'GPS는 fix 성공 / 관찰한 행, NFC는 성공 / 그 조건의 유효 시도처럼 미션마다 분모가 다르니 코드에서 확인합니다.',
    ],
    example: withD(`${ratioFn.text}\n\nfor g, rs in D.groupby('condition', sort=False):\n    print(g, ratio(rs), '| 행 수로 나누면', f"{int((rs['observation_status'] == 'observed').sum())}/{len(rs)}")`),
    blank: { code: withD(py`
def my_ratio(rs):
    seen = int((rs['observation_status'] == 'observed').sum())
    tried = int((rs['observation_status'] ___ 'unchecked').sum())
    return f'{seen}/{tried}' if tried else ___
print(my_ratio(D[D['condition'] == '벽 너머']), my_ratio(D[D['observation_status'] == 'unchecked']))`), fills: ['!=', "'계산 불가'"], hint: '분모는 unchecked가 아닌 행입니다. 분모가 0이면 나누지 않고 안내 글자를 돌려줍니다. 출력은 1/2 계산 불가입니다.' },
    write: {
      task: "GPS 규칙으로 위치마다 'fix 성공 수/관찰한 행 수' 글자를 fix 딕셔너리에 담으세요. 관찰은 observation_status == 'observed', 성공은 fix == 'fixed'입니다.",
      setup: py`
import pandas as pd
g = pd.DataFrame({'condition': ['실내', '실내', '야외', '야외', '야외'],
                  'observation_status': ['observed', 'observed', 'observed', 'observed', 'unchecked'],
                  'fix': ['no-fix', 'fixed', 'fixed', 'fixed', 'unchecked']})`,
      answer: py`
fix = {}
for place in ('실내', '창가', '야외'):
    rs = g[g['condition'] == place]
    if rs.empty: continue
    fix[place] = f"{int((rs['fix'] == 'fixed').sum())}/{int((rs['observation_status'] == 'observed').sum())}"
print(fix)`,
      check: "assert fix == {'실내': '1/2', '야외': '2/2'}, fix",
    },
    pitfall: { code: withD("rs = D[D['condition'] == '벽 너머']\nprint(f\"{int((rs['observation_status'] == 'observed').sum())}/{len(rs)}\")"), note: '분모를 len(rs)로 두면 측정하지 못한 행까지 실패처럼 세어 1/3(33%)이 됩니다. ratio는 1/2(50%)입니다.' },
    why: '측정하지 못한 시도를 실패로 세면 관찰률이 실제보다 낮아 보입니다. 반대로 못 본 시도(not-observed)까지 빼면 높아 보입니다. 결론에는 분모가 무엇인지 함께 씁니다.',
    variant: { q: 'not-observed까지 분모에서 빼면 벽 너머의 비율은?', code: withD("rs = D[D['condition'] == '벽 너머']\nprint(f\"{int((rs['observation_status'] == 'observed').sum())}/{int((rs['observation_status'] == 'observed').sum())}\")"), answer: '1/1, 곧 100%가 됩니다. 실제로는 두 번 시도해 한 번만 보였는데 늘 보이는 것처럼 과장됩니다.' },
    refs: [
      ref('nfc', 'def ratio(rs):', "return f'{seen}/{tried}'", '모든 현장 기록형 코드에 들어 있는 분모 함수'),
      ref('ble-ad', "summary[f'{g} 광고 관찰 비율'] = ratio(rs)", 'tried = (rs', '06 BLE: 요약과 그래프 모두 unchecked를 뺀 분모'),
      ref('gps', "    summary[f'{place} fix 성공']", "    summary[f'{place} fix 성공']", '11 GPS: 분모는 관찰한 행'),
    ],
  },
  {
    id: 'reshape', title: 'agg, crosstab, unstack·reindex: 표 모양 바꾸기',
    learn: [
      "`groupby('condition')['ok'].agg(['sum', 'count'])`는 그룹마다 합과 개수를 한 표로 냅니다. 노트북은 `agg(시도='count', 성공='sum')`처럼 열 이름을 붙입니다. `.reset_index()`는 그룹 이름을 보통 열로 내립니다.",
      "`pd.crosstab(a, b)`는 a 값 × b 값 조합마다 행 수를 세는 표입니다(WPA·SSID·페어링·433MHz 미션).",
      "두 열로 묶으면(`groupby(['condition', 'distance_cm'])`) 이름표가 두 단입니다. `.unstack('distance_cm')`은 거리를 칸으로 펼쳐 조건 × 거리 표를 만들고, `.reindex(순서)`는 행 순서를 고정합니다. 없는 조합은 NaN(측정 안 함)이며 0%가 아닙니다.",
    ],
    example: `${N}\n\nprint(data.groupby('condition')['ok'].agg(['sum', 'count']))\nprint(data.groupby('condition')['ok'].agg(시도='count', 성공='sum').reset_index())\nprint(pd.crosstab(data['condition'], data['distance_cm']))\nrate = data.groupby(['condition', 'distance_cm'])['ok'].mean().unstack('distance_cm')\nprint(rate.reindex(['단독', '지갑', '가방']))`,
    blank: { code: py`
import pandas as pd
df = pd.DataFrame({'configured': ['mixed', 'mixed', 'wpa2', 'wpa3'], 'pmf': ['capable', 'capable', 'disabled', 'required']})
print(pd.___(df['configured'], df['pmf']))`, fills: ['crosstab'], hint: '두 범주의 조합 개수를 세는 pandas 함수입니다.' },
    write: {
      task: "data로 조건 × 거리 성공 수 표 t를 groupby(['condition', 'distance_cm'])['ok'].sum()과 unstack으로 만들고, reindex(['단독', '지갑', '가방'])로 순서를 고정하세요.",
      setup: N, answer: py`
t = data.groupby(['condition', 'distance_cm'])['ok'].sum().unstack('distance_cm').reindex(['단독', '지갑', '가방'])
print(t)`,
      check: "assert t.loc['단독', 1.0] == 2 and t.loc['지갑', 3.0] == 1\nassert t.loc['가방'].isna().all()",
    },
    pitfall: { code: `${N}\n\nt = data.groupby(['condition', 'distance_cm'])['ok'].mean().unstack('distance_cm').reindex(['단독', '지갑', '가방'])\nprint(t.fillna(0))`, note: 'fillna(0)으로 빈칸을 채우면 시험하지 않은 가방이 0%로 보입니다. 오류는 없지만 "측정 안 함"이 "전부 실패"로 바뀝니다. 노트북 히트맵이 빈칸을 비워 두는 이유입니다.' },
    why: 'crosstab은 두 범주의 조합 빈도를 보여 줄 뿐 원인을 보여 주지 않습니다. 노트북의 조건 × 거리 히트맵은 unstack과 reindex로 만든 표를 그린 것입니다.',
    variant: { q: '노트북의 한 줄 `data.groupby("condition")["ok"].agg(시도="count", 성공="sum")`을 중간 변수로 나누면 표가 어떻게 변할까요? 같은 결과일까요?', code: `${N}\n\none = data.groupby('condition')['ok'].agg(시도='count', 성공='sum')\ng = data.groupby('condition')      # 1. 조건별로 나눈 묶음(아직 표 아님)\nprint(type(g).__name__, list(g.groups))\ns = g['ok']                          # 2. 묶음마다 ok 열만\nprint(s.sum().tolist())\nt = s.agg(시도='count', 성공='sum')   # 3. 묶음마다 개수와 합 → 표\nprint(t)\nprint('한 줄과 같다:', t.equals(one))`, answer: '1단계는 아직 표가 아닌 묶음, 2단계는 묶음마다 ok 열, 3단계에서 조건이 행이고 시도·성공이 열인 표가 됩니다. 마지막 줄이 True라 한 줄과 같은 결과입니다. 긴 체이닝은 이렇게 끊어 중간 결과를 출력해 보면 읽힙니다.' },
    refs: [
      ref('wpa-pmf', 'print(pd.crosstab(', 'print(pd.crosstab(', '04 WPA-PMF: 설정 × PMF'),
      ref('ble-pair', 'print(pd.crosstab(', 'print(pd.crosstab(', '07 BLE 페어링: 방식 × 재연결'),
      ref('notebook', 'def summarize(frame, columns):', 'return table', 'NFC 노트북: agg로 시도·성공·실패·인식률 표'),
      ref('notebook', 'rates = by_cell["인식률"].unstack', 'counts = counts.unstack', 'NFC 노트북: 조건 × 거리 표'),
    ],
  },
  {
    id: 'plot', title: '그래프: bar, bottom, 축 이름과 단위',
    learn: [
      "`plt.figure(figsize=(7, 3.6))`로 새 그림, `plt.bar(x, 높이)`로 막대, `bottom=`으로 위에 쌓기, `title`·`ylabel`·`legend`·`ylim`으로 제목·세로축 이름·범례·범위, `tight_layout()`과 `show()`로 표시합니다.",
      'Colab 기본 글꼴에는 한글이 없어 미션은 G1, G2 같은 짧은 이름을 그림에 쓰고 뜻을 위에 출력합니다. `zip`으로 코드와 이름을 짝짓습니다.',
      "세로축부터 읽습니다: attempts(시도 횟수), ratio(0~1 비율), rows(행 수), 'dBm + 120'(RSSI를 위로 그리려고 120을 더한 값, 높을수록 강함), seconds(0 = no fix는 '못 잡음').",
    ],
    example: py`
import matplotlib.pyplot as plt
conds = ['단독', '지갑', '가방']
oks, fails = [9, 6, 5], [1, 4, 5]
codes = [f'G{i + 1}' for i in range(len(conds))]
for code, c in zip(codes, conds):
    print(f'  그림 {code} = {c}')
plt.figure(figsize=(7, 3.6))
plt.bar(codes, oks, color='#2f6b4f', label='read')
plt.bar(codes, fails, bottom=oks, color='#b7b2a7', label='not read')
plt.ylabel('attempts')
plt.legend()
plt.tight_layout()
plt.show()
print('막대 높이(시도):', [o + f for o, f in zip(oks, fails)])
medians = [-44.0, -64.0, -78.0]
print('Wi-Fi 막대 높이(dBm + 120):', [m + 120 for m in medians])`,
    blank: { code: py`
import matplotlib.pyplot as plt
codes, oks, fails = ['G1', 'G2'], [9, 6], [1, 4]
plt.bar(codes, oks, color='#2f6b4f', label='read')
plt.bar(codes, fails, bottom=___, color='#b7b2a7', label='not read')
plt.___('attempts')
plt.show()
print([o + f for o, f in zip(oks, fails)])`, fills: ['oks', 'ylabel'], hint: '실패 막대는 성공 막대 위에서 시작합니다. 세로축 이름을 붙이는 함수입니다.' },
    write: {
      task: "방 rooms와 RSSI 중앙값 medians가 있습니다. 막대 높이(dBm + 120) 리스트 heights와 가장 높은 막대의 방 이름 strongest를 만드세요.",
      setup: "rooms = ['거실', '내 방', '현관']\nmedians = [-44.0, -64.0, -78.0]", answer: py`
heights = [m + 120 for m in medians]
strongest = rooms[heights.index(max(heights))]
print(heights, strongest)`,
      check: "assert heights == [76.0, 56.0, 42.0] and strongest == '거실'",
    },
    pitfall: { code: "print(list(zip(['G1', 'G2', 'G3'], ['단독', '지갑'])))", note: 'zip은 짧은 쪽에 맞춰 말없이 자릅니다. G3의 뜻이 출력되지 않아도 오류가 나지 않으니 labels와 값의 개수를 확인합니다.' },
    why: '그래프는 숫자표를 대신하지 않습니다. 세로축 이름과 단위로 무엇을 비교하는지 먼저 확인하고, 값은 "3. 계산 결과"의 숫자로 씁니다.',
    variant: { q: 'GPS 그래프에서 막대가 0인 위치는 "0초 만에 잡혔다"는 뜻일까요?', answer: "아닙니다. 원문 제목이 'Median seconds to fix (0 = no fix)'입니다. fix된 행이 없으면 0을 넣습니다. 요약의 'fix 성공 0/3'과 함께 읽어야 합니다." },
    refs: [
      ref('nfc', "codes = [f'G{i + 1}' for i in range(len(conds))]", 'plt.show()', '01 NFC: 쌓은 막대'),
      ref('nfc', 'def bar(labels, values, title, ylabel):', 'plt.show()', '현장 기록형 미션의 공통 막대 함수'),
      ref('wifi-rssi', 'bar(labels, [m + 120', 'bar(labels, [m + 120', '02 Wi-Fi: dBm + 120'),
      ref('gps', 'bar(labels, waits', 'bar(labels, waits', '11 GPS: 0 = no fix'),
    ],
  },
];

export const LESSONS_BASIC: Lesson[] = [
  { n: 2, slug: 'basics', href: '/learn/python-colab/basics/', title: '값, 반복, 조건', short: '값과 자료형, 리스트·딕셔너리, for 누적, if와 비교, f-글자열', minutes: 45, goal: 'CSV 칸이 글자라는 것을 알고, 조건별 성공 수를 for로 누적해 f-글자열로 출력한다.', prereq: '1차시(Colab에서 셀 실행)', product: '2차시 학생 파일의 빈칸 10칸과 직접 작성 5개를 채워 확인 통과', done: ["글자 '1'과 숫자 1의 차이를 예로 설명한다", '리스트에 append하고 딕셔너리에 이름표를 넣는다', 'for로 성공·실패 수를 누적한다', 'not in과 범위 비교로 값을 검사한다', '0.5를 늘 올리는 반올림을 f-글자열로 쓴다'], steps: L2 },
  { n: 3, slug: 'functions', href: '/learn/python-colab/functions/', title: '함수, 검사, 파일', short: 'def·return, 검사 함수, lambda·리스트 내포, try·raise, 정규식, 파일·JSON', minutes: 90, goal: '미션의 공통 도구와 problem 함수를 읽고, 같은 모양의 검사 함수를 빈 셀에서 쓴다.', prereq: '2차시', product: '검사 함수 4개(spread, place_problem, energy_problem, is_alias)를 혼자 작성', done: ['기본값이 있는 함수를 정의하고 return 값을 쓴다', '처음 걸린 이유를 돌려주는 검사 함수를 쓴다', 'sorted key와 리스트 내포를 for로 풀어 설명한다', 'try로 넘어갈 때와 raise로 멈출 때를 구별한다', 'fullmatch로 정수·별칭·해시 모양을 검사한다', 'upload 결과를 글자로 바꾸고 JSON을 만든다'], steps: L3 },
  { n: 4, slug: 'table', href: '/learn/python-colab/table/', title: 'pandas 표 다루기', short: 'read_csv(dtype=str), 마스크와 &·|·~, .loc·.at, 변환과 빈 값, apply·map', minutes: 45, goal: 'CSV를 글자 표로 읽고, 조건에 맞는 행·칸만 골라 새 표를 만든다.', prereq: '3차시', product: '유효 행 표 valid와 ok 열을 혼자 작성', done: ['dtype=str로 읽는 이유를 말한다', '& | ~로 행을 거르고 .copy()로 새 표를 만든다', '.loc·.at·.iloc를 구별해 쓴다', '빈 칸과 0을 구별해 변환한다', 'apply(axis=1)와 map을 설명한다'], steps: L4 },
  { n: 5, slug: 'group', href: '/learn/python-colab/group/', title: '묶고 세고 그리기', short: '마스크 합·중앙값, groupby 반복, 분모, agg·crosstab·unstack, 그래프', minutes: 45, goal: '그룹마다 개수·중앙값·비율을 내고, 분모와 세로축 단위를 설명한다.', prereq: '4차시', product: '그룹별 관찰 비율 딕셔너리와 막대 높이를 혼자 작성', done: ['마스크 합으로 행 수를 센다', 'for g, rs in groupby로 그룹마다 계산한다', 'ratio의 분모에서 unchecked를 빼는 이유를 말한다', 'crosstab·unstack 결과를 읽고 NaN을 0으로 채우지 않는다', '그래프 세로축 이름과 단위를 먼저 읽는다'], steps: L5 },
];
