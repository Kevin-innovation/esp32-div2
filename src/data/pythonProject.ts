// 6차시 관통 프로젝트: 빈 셀에서 NFC 분석을 끝까지 다시 만든다. 단계는 앞 단계의 결과를 이어 쓴다(chain).
// 확인 셀은 미션 원문의 SAMPLE_CSV, 9장 실행 결과의 검증용 JSON과 직접 대조하므로 미션 코드가 바뀌면 검사가 실패한다.
import colab from '../lib/workbooks/colab-output.json' with { type: 'json' };
import { MISSIONS } from './missionCode.ts';
import { py, ref, type Lesson, type Step } from './pythonCourse.ts';

const NFC = MISSIONS.find((m) => m.id === 'nfc')!.code;
const lines = NFC.split('\n');
const a = lines.findIndex((l) => l.startsWith('SAMPLE_CSV = """'));
const b = lines.findIndex((l, i) => i > a && l === '"""');
if (a < 0 || b < 0) throw new Error('NFC 미션 코드에서 SAMPLE_CSV를 찾지 못했습니다');
/** 미션 원문의 골든 데이터 대입 줄 전체 */
export const SAMPLE_ASSIGN = lines.slice(a, b + 1).join('\n');
const jsonLine = (colab as Record<string, string>).nfc.split('\n').find((l) => l.startsWith('검증용 JSON: '));
if (!jsonLine) throw new Error('NFC 9장 출력에서 검증용 JSON을 찾지 못했습니다');
/** NFC 미션 9장을 sample로 실행한 결과 */
export const MISSION_JSON: Record<string, string> = JSON.parse(jsonLine.slice('검증용 JSON: '.length));
const MISSION_PY = `MISSION = ${JSON.stringify(MISSION_JSON, null, 1).replace(/\n\s*/g, ' ')}`;

const STEPS: Step[] = [
  {
    id: 'records', title: '1. 원자료를 리스트로 옮기기',
    learn: [
      '실험 기록지의 숫자를 파이썬 값으로 옮기는 것부터 시작합니다. 설정(조건, 내용물, 거리)마다 다섯 번 시도한 결과를 1(읽힘)과 0(안 읽힘) 리스트로 적습니다.',
      "딕셔너리의 이름표 자리에 `('단독', '없음', 1)` 같은 짝(튜플)을 쓸 수 있습니다. `for (condition, contents, distance), results in records.items():`는 짝을 세 이름으로 풀어 받습니다.",
      '`enumerate(results, start=1)`은 (1, 첫 결과), (2, 둘째 결과)…처럼 회차 번호를 붙여 줍니다. 마지막에 일부러 잘못 적은 행(success = 2) 하나를 더합니다. 미션 골든 데이터의 BAD-1 행입니다.',
    ],
    blank: { code: py`
records = {
    ('단독', '없음', 1): [1, 1, 1, 1, 1],
    ('단독', '없음', 3): [1, 1, 1, 1, 0],
    ('지갑', '빈 지갑', 1): [1, 1, 1, 1, 0],
    ('지갑', '빈 지갑', 3): [1, 0, 1, 0, 0],
    ('가방', '천 가방', 1): [1, 1, 1, 0, 1],
    ('가방', '천 가방', 3): [0, 1, 0, 0, 0],
}
rows = []
for (condition, contents, distance), results in records.___():
    for trial, success in enumerate(results, start=___):
        rows.append([trial, condition, contents, distance, '평행', success, '가상 값', 'demo'])
rows.___([1, '단독', '없음', 1, '평행', 2, 'BAD-1 결과 칸에 2를 잘못 적음', 'demo'])
print(len(rows), '행')
print(rows[0])
print(rows[-1])`, fills: ['items', '1', 'append'], hint: '딕셔너리에서 짝을 꺼내는 메서드, 회차를 1부터 세는 시작값, 리스트 끝에 더하는 메서드입니다.' },
    check: "assert len(rows) == 31, len(rows)\nassert rows[9] == [5, '단독', '없음', 3, '평행', 0, '가상 값', 'demo'], rows[9]",
    pitfall: { code: 'for condition, contents, distance, results in records.items():\n    pass', note: 'items()는 (이름표, 값) 두 개짜리 짝을 줍니다. 괄호 없이 네 이름으로 받으면 ValueError(not enough values to unpack)입니다.' },
    why: '브라우저 워크북에 입력하는 표와 같은 정보를 코드로 만들면, 다음 단계에서 미션 9장의 SAMPLE_CSV와 한 글자도 다르지 않은지 대조할 수 있습니다.',
    variant: { q: '가방 3cm에서 여섯 번째 시도(0)를 더 기록하면 rows는 몇 행이 되고, 그 행의 trial은 몇일까요?', answer: "records[('가방', '천 가방', 3)] 리스트 끝에 0을 더하면 32행이 되고, enumerate가 붙인 trial은 6입니다. 다른 설정의 회차는 그대로입니다." },
    refs: [ref('nfc', 'SAMPLE_CSV = """', '5,단독,없음,1,평행,1,가상 값,demo', '미션 골든 데이터의 첫 다섯 행(단독 1cm)')],
  },
  {
    id: 'csv', title: '2. CSV 글자 만들고 파일로 저장',
    learn: [
      "CSV는 한 줄에 한 기록, 칸은 쉼표로 나눈 글자입니다. `','.join(글자 리스트)`는 리스트를 쉼표로 이어 한 줄을 만들고, `'\\n'.join(줄 리스트)`는 줄바꿈으로 잇습니다. join은 글자만 이을 수 있어 `str(v)`로 먼저 바꿉니다.",
      "`with open('nfc-experiment.csv', 'w', encoding='utf-8') as f:` 아래 `f.write(…)`는 Colab 런타임에 파일을 만듭니다. 11단계에서 이 파일을 다시 읽습니다.",
      '확인 셀은 미션 9장 코드의 SAMPLE_CSV를 그대로 옮겨 와 내 csv_text와 같은지 봅니다.',
    ],
    blank: { code: py`
HEADER = 'trial,condition,contents,distance_cm,orientation,success,note,data_type'
lines = [HEADER]
for r in rows:
    lines.append(','.___([str(v) for v in r]))
csv_text = '\n'.join(lines) + ___
print(csv_text[:86])
with open('nfc-experiment.csv', 'w', encoding='utf-8') as f:
    f.write(csv_text)
print(len(csv_text.splitlines()), '줄을 nfc-experiment.csv로 저장')`, fills: ['join', "'\\n'"], hint: '글자 리스트를 쉼표로 잇는 메서드와, 파일 끝의 마지막 줄바꿈 글자입니다.' },
    check: `${SAMPLE_ASSIGN}\nassert csv_text == SAMPLE_CSV, '미션 9장의 SAMPLE_CSV와 다릅니다'`,
    pitfall: { code: "print(','.join(rows[0]))", note: '숫자가 섞인 리스트를 바로 join하면 TypeError입니다. str(v)로 바꿔 잇습니다.' },
    why: '브라우저 워크북이 내려 주는 CSV와 같은 모양을 직접 만들어 보면, 미션 코드가 읽는 파일이 무엇인지 정확히 압니다.',
    variant: { q: 'note 칸에 "가상, 연습"처럼 쉼표가 들어가면 그 줄은 몇 칸으로 나뉠까요?', code: "print('1,단독,가상, 연습,demo'.split(','))", answer: "다섯 칸으로 나뉘어 뒤 칸이 하나씩 밀립니다. 사이트는 쉼표가 있는 글을 큰따옴표로 감싸 저장합니다(WPA-PMF 골든 데이터의 \"가상 사례: …, …\"). pandas read_csv는 따옴표 안의 쉼표를 칸 구분으로 보지 않습니다." },
    refs: [ref('nfc', 'SAMPLE_CSV = """', '1,단독,없음,1,평행,2,BAD-1', '미션 9장의 골든 데이터 전체')],
  },
  {
    id: 'read', title: '3. 글자 표로 읽기',
    learn: [
      "`io.StringIO(csv_text)`로 글자를 파일처럼 만들고 `pd.read_csv(…, dtype=str, keep_default_na=False)`로 읽습니다. 모든 칸이 글자, 빈 칸은 ''입니다.",
      '`table.shape`는 (행 수, 열 수)입니다. 31행 8열이어야 합니다. `unique()`로 success에 어떤 글자가 있는지 먼저 봅니다.',
    ],
    blank: { code: py`
import io
import pandas as pd
table = pd.read_csv(io.___(csv_text), dtype=___, keep_default_na=False)
print(table.shape)
print(table.head(3))
print(table['success'].unique().tolist())`, fills: ['StringIO', 'str'], hint: '글자를 파일처럼 만드는 io의 이름과, 모든 칸을 글자로 읽는 자료형입니다.' },
    check: "assert table.shape == (31, 8), table.shape\nassert table.loc[30, 'success'] == '2'",
    pitfall: { code: "print((pd.read_csv(io.StringIO(csv_text))['success'] == '1').sum(), '행이 글자 1')", note: '기본으로 읽으면 success가 숫자라 글자 1과 하나도 같지 않습니다(0행). 오류 없이 틀리는 함정입니다.' },
    why: '읽자마자 행 수와 값 종류를 확인하면, 파일을 잘못 골랐거나 이상한 값(여기서는 2)이 들어 있는 것을 계산 전에 알 수 있습니다.',
    variant: { q: "unique에 '2'가 보입니다. 이 단계에서 지워야 할까요?", answer: '지우지 않습니다. 읽기 단계는 있는 그대로 보여 주는 곳이고, 6단계 검사 함수가 이유를 출력하며 뺍니다. 그래야 어떤 행을 왜 뺐는지 기록이 남습니다.' },
    refs: [ref('nfc', 'table = pd.read_csv', 'table = pd.read_csv', '미션은 BOM을 떼고(lstrip) 같은 방법으로 읽습니다.')],
  },
  {
    id: 'columns', title: '4. 열 검사와 정리',
    learn: [
      '꼭 있어야 하는 열 NEED 가운데 없는 열을 리스트 내포로 모으고, 하나라도 있으면 `raise ValueError`로 멈춥니다. 탐구 서술 CSV처럼 다른 파일을 올렸을 때 엉뚱한 표를 계산하지 않게 합니다.',
      "condition 앞뒤 빈칸은 `.str.strip()`으로 지웁니다. ' 지갑'과 '지갑'이 다른 조건으로 갈라지지 않게 합니다.",
    ],
    blank: { code: py`
NEED = ['trial', 'condition', 'contents', 'distance_cm', 'orientation', 'success', 'note', 'data_type']
lost = [c for c in NEED if c ___ table.columns]
if lost:
    raise ___(f'NFC 관찰 CSV가 아닙니다. 없는 열: {lost}')
table['condition'] = table['condition'].str.strip()
print('없는 열:', lost, '/ 조건:', table['condition'].unique().tolist())`, fills: ['not in', 'ValueError'], hint: '표의 열 목록에 없는 열을 찾는 말과, 값이 잘못돼 멈출 때 쓰는 오류 이름입니다.' },
    check: "assert lost == []\nassert table['condition'].unique().tolist() == ['단독', '지갑', '가방']",
    pitfall: { code: "notes = pd.read_csv(io.StringIO('student,question\\n가상,왜 지갑?\\n'), dtype=str)\nlost = [c for c in NEED if c not in notes.columns]\nif lost:\n    raise ValueError(f'NFC 관찰 CSV가 아닙니다. 없는 열: {lost}')", note: '탐구 서술 CSV를 잘못 올리면 이렇게 없는 열 이름과 함께 멈춥니다. 오류 문장을 읽고 파일을 바꿉니다.' },
    why: '열이 다르면 이후 모든 줄이 KeyError로 엉뚱한 곳에서 멈춥니다. 맨 앞에서 무엇이 없는지 한 번에 알려 주는 편이 고치기 쉽습니다.',
    refs: [ref('nfc', 'NEED = ', "table['condition'] = ", '미션은 이 사이에 모든 칸 unguard도 합니다(4차시 apply).')],
  },
  {
    id: 'mode', title: '5. 데모와 실제 기록 구분',
    learn: [
      "`MODE = 'demo'`로 연습 자료만 고르고, 내 실제 기록을 분석할 때는 'real'을 씁니다. `table[table['data_type'] == MODE].copy()`는 그 구분만 담은 새 표입니다.",
      '미션 출력의 "1. 불러오기: demo 관찰 31행, 다른 구분 0행 제외"와 같은 줄을 만듭니다.',
    ],
    blank: { code: py`
MODE = 'demo'
data = table[table['data_type'] == ___].copy()
print(f'1. 불러오기: {MODE} 관찰 {len(data)}행, 다른 구분 {len(table) ___ len(data)}행 제외')`, fills: ['MODE', '-'], hint: '고를 구분을 담은 변수 이름과, 전체에서 고른 행을 뺀 수입니다.' },
    check: 'assert len(data) == 31',
    pitfall: { code: "print(len(table[table['data_type'] == 'real']), '행')", note: '골든 데이터에는 real이 없어 0행입니다. 데모 파일을 real로 분석하면 뒤에서 "분석할 행이 없습니다"로 멈춥니다.' },
    why: '데모 기록이 실제 결론에 섞이지 않게 합니다. 같은 파일에 둘이 함께 있어도 구분이 분명합니다.',
    variant: { q: '실제 기록 3행이 섞인 파일을 MODE = "demo"로 분석하면 출력 1번 줄은 어떻게 바뀔까요?', answer: '"demo 관찰 31행, 다른 구분 3행 제외"가 됩니다. 계산 결과는 데모 31행으로만 나와 실제 기록 3행은 결론에 들어가지 않습니다.' },
    refs: [ref('nfc', "MODE = 'demo' if SOURCE", "MODE = 'demo' if SOURCE", 'SOURCE가 sample이면 demo, 아니면 real'), ref('nfc', "data = table[table['data_type'] == MODE].copy()", "print(f'1. 불러오기", '같은 두 줄')],
  },
  {
    id: 'invalid', title: '6. 무효 행 분리: 검사 함수 직접 쓰기',
    learn: [
      'problem(r)은 행 하나를 받아 처음 걸린 이유를 돌려주고, 통과하면 빈 글자를 돌려줍니다. success는 0 또는 1, 조건은 비어 있지 않음, 거리는 0~100의 숫자여야 합니다.',
      "`data.apply(problem, axis=1)`로 모든 행의 이유를 만들고, 문제 행은 이유와 함께 출력한 뒤 `data[reasons == ''].copy()`로 깨끗한 행만 남깁니다(미션 원문은 .copy() 없이 씁니다).",
    ],
    blank: { code: py`
def problem(r):
    if r['success'] not in ('0', '1'): return 'success는 1(읽힘) 또는 0(안 읽힘)만 씁니다'
    if not r['condition']: return '조건이 비었습니다'
    try:
        d = float(r['distance_cm'])
    except ___:
        return '거리가 숫자가 아닙니다'
    if not 0 <= d <= 100: return '거리는 0~100cm입니다'
    return ''

reasons = data.apply(problem, axis=___)
for i in data.index[reasons != '']:
    print('   제외한 행:', data.at[i, 'condition'], data.at[i, 'trial'] + '회차', data.at[i, 'note'], '-', reasons[i])
data = data[reasons ___ ''].copy()
print(f'2. 검사: 분석에 쓰는 행 {len(data)}, 잘못된 행 {int((reasons != "").sum())}')`, fills: ['ValueError', '1', '=='], hint: 'float이 못 바꿀 때의 오류 이름, 행마다 적용하는 axis 값, 이유가 빈 글자와 같은 행입니다.' },
    check: "assert len(data) == 30, len(data)\nassert int((reasons != '').sum()) == 1\nassert problem({'success': '', 'condition': '지갑', 'distance_cm': '1'}) != ''",
    pitfall: { code: "def problem2(r):\n    if r['success'] not in ('0', '1'): return 'success 이유'\n\nprint(len(data[data.apply(problem2, axis=1) == '']), '행 남음')", note: "마지막 return ''를 빠뜨리면 통과한 행이 None을 돌려줘 모두 빠집니다(0행). 오류가 나지 않아 더 위험합니다." },
    why: '잘못 적은 값을 실패(0)로 세지 않고 빼되, 어떤 행을 왜 뺐는지 출력합니다. 빈 success(기록 못 함)도 여기서 빠지므로 분모에 들어가지 않습니다.',
    variant: { q: '지갑 3cm 5회차의 success(0)를 지우고 빈 칸으로 두면 지갑의 성공/시도는 어떻게 될까요? 빈 칸을 0으로 채우면요?', answer: '빈 칸은 이 검사에서 빠져 6/9(67%), 0으로 채우면 6/10(60%)입니다. 기록하지 못한 시도를 실패로 세면 인식률이 낮아집니다.' },
    refs: [ref('nfc', 'def problem(r):', 'raise SystemExit', '원문의 검사와 제외한 행 출력')],
  },
  {
    id: 'count', title: '7. 조건별 성공/시도와 분모',
    learn: [
      "`(data['success'] == '1').astype(int)`로 ok 열(1/0)을 만들고, 조건을 단독·지갑·가방 순서로 정렬해 반복합니다. 조건마다 s = 성공 합, a = 그 조건의 행 수(분모)입니다.",
      'summary 딕셔너리에 미션과 같은 이름표("단독 성공/시도", "단독 인식률")로 값을 넣습니다. 인식률은 0.5를 늘 올리는 pct로 씁니다.',
    ],
    blank: { code: py`
import math
def pct(s, a):
    return f'{math.floor(s / a * 100 + 0.5)}%'

data['ok'] = (data['success'] == '1').astype(int)
data['d'] = data['distance_cm'].astype(float)
summary = {'기록 행': str(len(data)), '성공': str(int(data['ok'].sum())), '실패': str(int((1 - data['ok']).sum()))}
RANK = {'단독': 0, '지갑': 1, '가방': 2}
conds = sorted(data['condition'].unique(), key=lambda c: (RANK.get(c, 3), c))
oks, fails = [], []
for c in conds:
    rs = data[data['condition'] == ___]
    s, a = int(rs['ok'].sum()), ___(rs)
    summary[f'{c} 성공/시도'] = f'{s}/{a}'
    summary[f'{c} 인식률'] = pct(s, a)
    oks.append(s)
    fails.append(a ___ s)
print(summary)`, fills: ['c', 'len', '-'], hint: '지금 반복 중인 조건, 행 수를 세는 함수, 시도에서 성공을 뺀 실패 수입니다.' },
    check: "assert summary['단독 성공/시도'] == '9/10' and summary['지갑 성공/시도'] == '6/10' and summary['가방 성공/시도'] == '5/10'\nassert summary['지갑 인식률'] == '60%' and oks == [9, 6, 5] and fails == [1, 4, 5]",
    pitfall: { code: "rs = data[data['condition'] == '단독']\nprint(f\"{int(rs['ok'].sum())}/{len(data)}\")", note: '분모를 전체 행 len(data)로 쓰면 9/30이 됩니다. 조건끼리 비교하려면 분모는 그 조건의 시도입니다.' },
    why: '분모를 조건의 유효 시도로 두어야 조건끼리 비교할 수 있습니다. 시도가 10회뿐이라 1회 차이가 10%p라는 것도 함께 씁니다.',
    variant: { q: '정렬 key를 빼고 sorted(data["condition"].unique())만 쓰면 conds와 G1은 어떻게 바뀔까요?', code: "print(sorted(data['condition'].unique()))", answer: "가나다순 ['가방', '단독', '지갑']이 되어 G1이 가방이 됩니다. 값은 같아도 그래프 순서와 summary 순서가 미션과 달라집니다. 딕셔너리 비교는 순서를 보지 않아 10단계 대조는 통과하지만, 그림을 읽을 때 헷갈립니다." },
    refs: [ref('nfc', "data['ok'] = ", 'oks.append(s); fails.append(a - s)', '원문의 같은 계산')],
  },
  {
    id: 'table', title: '8. 거리별 값과 확인 표',
    learn: [
      '같은 방법으로 거리마다 성공/시도를 셉니다. 이름표의 거리는 fmt로 3.0을 3으로 씁니다.',
      'for로 만든 값을 groupby와 agg로 다시 계산해 표로 보고, 두 방법이 같은지 확인합니다. 한 계산을 두 방법으로 해 보는 것이 가장 쉬운 검산입니다.',
    ],
    blank: { code: py`
def fmt(v):
    v = float(v)
    return str(int(v)) if v.is_integer() else f'{v:.1f}'

for d in sorted(data['d'].unique()):
    rs = data[data['d'] == d]
    s, a = int(rs['ok'].sum()), len(rs)
    summary[f'거리 {fmt(d)}cm 성공/시도'] = f'{s}/{a}'
    summary[f'거리 {fmt(d)}cm 인식률'] = pct(s, a)

check_table = data.groupby('condition')['ok'].___(시도='count', 성공='sum').reindex(___)
check_table['인식률'] = [pct(s, a) for s, a in zip(check_table['성공'], check_table['시도'])]
print(check_table)
print(summary['거리 1cm 성공/시도'], summary['거리 3cm 성공/시도'])`, fills: ['agg', 'conds'], hint: '그룹마다 여러 계산을 이름 붙여 하는 메서드와, 7단계에서 만든 조건 순서 리스트입니다.' },
    check: "assert summary['거리 1cm 성공/시도'] == '13/15' and summary['거리 3cm 성공/시도'] == '7/15'\nassert check_table['성공'].tolist() == oks",
    pitfall: { code: "print(data.groupby('condition')['ok'].agg(시도='count', 성공='sum'))", note: 'reindex를 빼면 가나다순(가방, 단독, 지갑)으로 나옵니다. 오류는 없지만 for로 만든 oks와 순서가 달라 비교가 틀립니다.' },
    why: '조건과 거리를 각각 세면 두 변수의 영향을 따로 봅니다. 두 변수가 함께 바뀐 기록이면 한쪽 표만으로 한 변수의 효과라고 쓰지 않습니다.',
    refs: [ref('nfc', "for d in sorted(data['d'].unique()):", "summary[f'거리 {fmt(d)}cm 인식률']", '원문의 거리별 계산')],
  },
  {
    id: 'plot', title: '9. 쌓은 막대그래프',
    learn: [
      '성공 막대 위에 실패 막대를 bottom=oks로 쌓으면 막대 전체 높이가 시도 수입니다. 세로축 이름은 attempts입니다.',
      '그림에는 G1~G3을 쓰고 뜻을 먼저 출력합니다(Colab 기본 글꼴에 한글이 없음).',
    ],
    blank: { code: py`
import matplotlib.pyplot as plt
codes = [f'G{i + 1}' for i in range(len(conds))]
for code, c in zip(codes, conds):
    print(f'  그림 {code} = {c}')
plt.figure(figsize=(7, 3.6))
plt.bar(codes, oks, color='#2f6b4f', label='read')
plt.bar(codes, fails, bottom=___, color='#b7b2a7', label='not read')
plt.title('NFC reads per placement (stacked: read + not read = attempts)')
plt.ylabel(___)
plt.legend()
plt.tight_layout()
plt.show()`, fills: ['oks', "'attempts'"], hint: '실패 막대가 시작할 높이와, 세로축 이름 글자입니다.' },
    check: 'assert len(codes) == len(oks) == len(fails) == 3',
    pitfall: { code: "plt.bar(codes, oks[:2])", note: '막대 이름과 높이의 개수가 다르면 ValueError(shape mismatch)입니다.' },
    why: '인식률(%)만 그리면 시도 수가 보이지 않습니다. 쌓은 막대는 시도 수와 성공 비율을 함께 보여 줍니다.',
    variant: { q: '막대 높이가 모두 10인데 초록 부분만 다릅니다. "가방이 인식을 막는다"고 쓸 수 있나요?', answer: '아니요. 재질, 방향, 거리 같은 다른 조건이 함께 달랐을 수 있고 시도도 10회뿐입니다. "이 기록에서는 가방 조건의 인식률이 5/10으로 가장 낮았다"까지가 근거 있는 문장입니다.' },
    refs: [ref('nfc', "codes = [f'G{i + 1}' for i in range(len(conds))]", 'plt.show()', '원문의 그래프')],
  },
  {
    id: 'function', title: '10. 함수로 묶어 미션 결과와 대조',
    learn: [
      '3~8단계를 analyze(text, mode) 하나로 묶습니다. 글자와 구분을 받아 summary 딕셔너리를 돌려줍니다. 셀을 다시 실행해도 같은 결과가 나오고, 파일만 바꿔 다시 쓸 수 있습니다.',
      "검사할 행이 0개인 표에 apply를 하면 pandas가 빈 행으로 함수를 한 번 시험해 결과 모양을 정하므로, 함수와 버전에 따라 이유 Series 대신 빈 표가 돌아올 수 있습니다. 원문처럼 `if len(data) else pd.Series(dtype=str)`로 늘 빈 이유 Series를 쓰게 막고, 남은 행이 없으면 `raise SystemExit`로 안내합니다.",
      '확인 셀은 NFC 미션 9장 코드를 sample로 실행한 검증용 JSON과 내 결과가 같은지 봅니다. 같다면 미션 코드를 처음부터 혼자 다시 만든 것입니다.',
    ],
    blank: { code: py`
import json

def analyze(text, mode):
    table = pd.read_csv(io.StringIO(text.lstrip('\ufeff')), dtype=str, keep_default_na=False)
    lost = [c for c in NEED if c not in table.columns]
    if lost:
        raise ValueError(f'NFC 관찰 CSV가 아닙니다. 없는 열: {lost}')
    table['condition'] = table['condition'].str.strip()
    data = table[table['data_type'] == mode].___()
    reasons = data.apply(problem, axis=1) if len(data) else pd.Series(dtype=str)
    data = data[reasons == ''].copy() if len(data) else data
    if data.___:
        raise SystemExit('분석할 행이 없습니다. SOURCE와 data_type, 입력 기록을 확인하세요.')
    data['ok'] = (data['success'] == '1').astype(int)
    data['d'] = data['distance_cm'].astype(float)
    out = {'기록 행': str(len(data)), '성공': str(int(data['ok'].sum())), '실패': str(int((1 - data['ok']).sum()))}
    for c in sorted(data['condition'].unique(), key=lambda c: (RANK.get(c, 3), c)):
        rs = data[data['condition'] == c]
        s, a = int(rs['ok'].sum()), len(rs)
        out[f'{c} 성공/시도'] = f'{s}/{a}'
        out[f'{c} 인식률'] = pct(s, a)
    for d in sorted(data['d'].unique()):
        rs = data[data['d'] == d]
        s, a = int(rs['ok'].sum()), len(rs)
        out[f'거리 {fmt(d)}cm 성공/시도'] = f'{s}/{a}'
        out[f'거리 {fmt(d)}cm 인식률'] = pct(s, a)
    return ___

result = analyze(csv_text, 'demo')
print('7·8단계 summary와 같다:', result == summary)
print('검증용 JSON:', json.dumps(result, ensure_ascii=False))`, fills: ['copy', 'empty', 'out'], hint: '거른 표를 떼어 내는 메서드, 표가 비었는지 보는 속성, 다 채운 딕셔너리 이름입니다.' },
    check: `${MISSION_PY}\nassert analyze(csv_text, 'demo') == MISSION, '미션 9장 검증용 JSON과 다릅니다'`,
    pitfall: { code: "analyze(csv_text, 'real')", note: '골든 데이터를 real로 분석하면 남는 행이 없어 SystemExit로 멈춥니다. 오류가 아니라 SOURCE와 data_type을 확인하라는 안내입니다.' },
    why: '긴 미션 코드는 이렇게 "읽기 → 열 검사 → 구분 → 무효 행 → 세기"를 이어 붙인 것입니다. 각 줄을 어느 단계에서 썼는지 알면 미션 코드에서 고칠 곳을 바로 찾습니다.',
    variant: { q: '검사할 행이 0개인 표에 apply를 하면 무엇이 돌아올까요? 함수를 바꾸면요?', code: "empty = table.iloc[0:0]\nprint(type(empty.apply(problem, axis=1)).__name__)\nprint(type(empty.apply(lambda r: r['success'].strip(), axis=1)).__name__)", answer: '이 Colab·pandas에서는 problem이면 Series, 빈 행에서 오류가 나는 함수(빈칸 지우기)면 DataFrame이 돌아옵니다. pandas가 빈 행으로 함수를 시험해 보고 성공 여부로 모양을 정하기 때문입니다. 어느 쪽이 나올지 코드만 보고 알기 어려우니 원문과 analyze는 len(data)를 먼저 보고 빈 이유 Series를 직접 만듭니다.' },
    refs: [ref('nfc', 'table = pd.read_csv', "print('검증용 JSON:'", '원문 94줄부터 끝까지가 analyze와 같은 일을 합니다.')],
  },
  {
    id: 'upload', title: '11. SOURCE로 내 CSV 읽고 기록 해석',
    learn: [
      "SOURCE 스위치로 같은 analyze를 연습 글자(sample), Colab 업로드(upload), 같은 폴더의 파일(file)에 씁니다. 여기서는 2단계에서 저장한 nfc-experiment.csv를 file로 읽습니다.",
      "아직 실제 기록이 없다면 저장한 파일의 data_type을 real로 바꿔 흐름만 연습합니다. 실제 분석에서는 replace 줄을 지우고 SOURCE = 'upload'로 내 CSV를 고릅니다.",
      '마지막으로 결과를 문장으로 씁니다. 성공/시도와 분모, 비교한 조건, 말할 수 없는 것을 함께 적습니다.',
    ],
    blank: { code: py`
SOURCE = 'file'          # 'sample' 연습 글자, 'upload' Colab에서 내 파일, 'file' 같은 폴더의 파일

def read_text():
    if SOURCE == 'sample':
        return csv_text
    if SOURCE == 'upload':
        from google.colab import files
        uploaded = files.upload()
        name = next(n for n in uploaded if n.endswith('.csv'))
        return uploaded[name].decode('utf-8-sig')
    with open('nfc-experiment.csv', encoding=___) as f:
        return f.read()

MODE = 'demo' if SOURCE == 'sample' else ___
my = read_text().replace(',demo\n', ',real\n')   # 연습용: 실제 기록이 생기면 이 줄을 지웁니다
result = analyze(my, MODE)
for k, v in result.items():
    print(f'   {k}: {v}')`, fills: ["'utf-8-sig'", "'real'"], hint: '엑셀 BOM을 떼어 주는 인코딩 이름과, 내 파일일 때의 구분입니다.' },
    check: "assert MODE == 'real'\nassert result == analyze(csv_text, 'demo')",
    pitfall: { code: "MODE = 'real'\nanalyze(read_text(), MODE)", note: 'replace 없이 데모 파일을 real로 읽으면 분석할 행이 없어 멈춥니다. 6장에서 실제 기록을 입력하고 내려받았는지 확인합니다.' },
    why: 'sample로 검산한 코드를 그대로 내 기록에 씁니다. 분석 코드는 고치지 않고 자료만 바꾸므로, 결과가 달라진 이유는 자료에 있습니다.',
    variant: { q: '위 결과로 해석 문장 세 개를 써 보세요. 범위와 한계를 함께 씁니다.', answer: '예시: ① 이 데모 기록에서 인식률은 단독 9/10(90%), 지갑 6/10(60%), 가방 5/10(50%)였다. ② 거리별로는 1cm 13/15, 3cm 7/15로 3cm에서 낮았다. ③ 조건마다 10회뿐이라 1회 차이가 10%p이고, 이 값은 실험용 태그가 읽힌 비율일 뿐 결제·복제 위험을 뜻하지 않는다.' },
    refs: [ref('nfc', 'def read_text():', 'return f.read()', '원문의 같은 스위치'), ref('nfc', "# 이 표는 태그를 읽은 비율만", "# 이 표는 태그를 읽은 비율만", '원문이 적어 둔 한계')],
  },
];

export const PROJECT: Lesson = {
  n: 6, slug: 'project', href: '/learn/python-colab/project/', title: 'NFC 분석을 빈 셀에서 끝까지', short: '원자료 → CSV → 읽기 → 열 검사 → 구분 → 무효 행 → 성공/시도 → 표 → 그래프 → 함수 → 내 CSV와 해석',
  minutes: 90, goal: '미션 9장 코드를 보지 않고 같은 결과(검증용 JSON)를 내는 분석을 단계별로 직접 작성한다.', prereq: '2~5차시', product: '미션 9장 검증용 JSON과 같은 결과를 내는 analyze 함수와 해석 문장 세 개',
  done: ['원자료 리스트에서 미션과 같은 CSV를 만든다', '열 검사와 무효 행 검사를 직접 쓴다', '조건·거리별 성공/시도와 분모를 설명한다', 'analyze 결과가 9장 검증용 JSON과 같다', '성공/시도와 한계를 넣어 해석을 쓴다'],
  chain: true, steps: STEPS,
};
