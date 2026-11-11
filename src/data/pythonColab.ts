// Python·Colab 입문의 따라 하기 셀. 위에서부터 한 노트에서 차례로 실행한다고 가정한다.
// 예상 출력은 scripts/check-python-intro.ts --write가 실제로 실행해 python-colab-output.json에 저장하고, 검사 때 대조한다.

export const PRACTICE_CSV = `trial,condition,distance_cm,success,data_type
1,단독,1,1,demo
2,단독,3,1,demo
3,단독,5,0,demo
4,지갑,1,1,demo
5,지갑,3,0,demo
6,지갑,5,,demo
7,가방,1,0,demo
8,가방,3,0,demo
9,단독,1,1,real
`;

export interface Cell { id: string; title: string; code: string }

export const CELLS: Cell[] = [
  {
    id: 'basics',
    title: '셀 1. 변수, 문자열, 숫자, 리스트, 딕셔너리, 조건',
    code: `name = '단독'          # 문자열: 따옴표 안의 글자
distance = 3           # 숫자(정수)
rate = 4 / 5           # 숫자(실수). 나누면 0.8
tries = [1, 1, 0, 1]   # 리스트: 순서 있는 값 묶음
result = {'조건': name, '시도': len(tries), '성공': sum(tries)}  # 딕셔너리: 이름표: 값

print(name, distance, rate)
print(result)
print(result['성공'])  # 딕셔너리에서 값 하나 꺼내기

if result['성공'] >= 3:
    print('3번 이상 읽혔습니다')   # if 아래 줄은 4칸 들여 씁니다
else:
    print('3번 미만입니다')

print(round(rate * 100), '%')   # 함수 호출: 이름(값)`,
  },
  {
    id: 'load',
    title: '셀 2. CSV 글자를 DataFrame(표)으로 읽기',
    code: `import io
import pandas as pd

CSV_TEXT = """${PRACTICE_CSV}"""

df = pd.read_csv(io.StringIO(CSV_TEXT))
print(df.shape)       # (행 수, 열 수)
print(df.head(3))     # 앞의 3행
print(df.dtypes)      # 열마다 읽힌 자료형`,
  },
  {
    id: 'select',
    title: '셀 3. 열 고르기와 행 거르기(data_type)',
    code: `print(df['condition'].unique())         # 열 하나 고르기

demo = df[df['data_type'] == 'demo']     # 조건에 맞는 행만 남기기
print('demo 행:', len(demo), '/ 전체 행:', len(df))

wallet = demo[demo['condition'] == '지갑']
print(wallet[['trial', 'distance_cm', 'success']])   # 열 여러 개 고르기`,
  },
  {
    id: 'blank',
    title: '셀 4. 빈 값과 0을 구분하고 숫자로 바꾸기',
    code: `print(demo['success'].isna().sum(), '칸이 비어 있음')   # 기록하지 않은 칸
print((demo['success'] == 0).sum(), '번 실패(0)')          # 시도했지만 못 읽음

demo = demo.dropna(subset=['success']).copy()   # 빈 칸 행은 계산에서 뺍니다
demo['success'] = demo['success'].astype(int)   # 1.0, 0.0을 정수 1, 0으로
print('분석에 쓰는 행:', len(demo))

# 미션 코드는 모든 칸을 글자로 읽습니다. 빈 칸은 '', 0은 '0'이라 서로 다릅니다.
raw = pd.read_csv(io.StringIO(CSV_TEXT), dtype=str, keep_default_na=False)
print(repr(raw.loc[5, 'success']), repr(raw.loc[4, 'success']))
print(raw['distance_cm'].astype(float).median())   # 계산 직전에 숫자로 바꿉니다`,
  },
  {
    id: 'group',
    title: '셀 5. groupby와 agg로 조건별 시도·성공·인식률 세기',
    code: `table = demo.groupby('condition', sort=False)['success'].agg(['count', 'sum'])
table.columns = ['시도', '성공']
table['인식률(%)'] = (table['성공'] / table['시도'] * 100).round(1)
print(table)`,
  },
  {
    id: 'plot',
    title: '셀 6. 막대그래프 그리기',
    code: `import matplotlib.pyplot as plt

# Colab 기본 글꼴에는 한글이 없어 그림에는 G1, G2 같은 짧은 이름을 씁니다.
codes = [f'G{i + 1}' for i in range(len(table))]
for c, name in zip(codes, table.index):
    print(f'그림 {c} = {name}')

plt.figure(figsize=(5, 3))
plt.bar(codes, table['인식률(%)'], color='#2f6b4f')
plt.ylim(0, 100)                           # 세로축을 0~100으로 고정
plt.title('Read rate by condition (demo)')
plt.ylabel('read rate (%)')                # 세로축 이름과 단위
plt.xlabel('condition code')
plt.tight_layout()
plt.show()`,
  },
  {
    id: 'source',
    title: '셀 7. SOURCE로 연습 자료와 내 파일 바꾸기',
    code: `SOURCE = 'sample'   # 내 CSV를 쓸 때 'upload'로 바꾸고 이 셀을 다시 실행합니다

if SOURCE == 'upload':
    from google.colab import files
    uploaded = files.upload()          # 파일 고르기 창이 열립니다
    name = next(iter(uploaded))        # 올린 파일 이름
    df = pd.read_csv(io.BytesIO(uploaded[name]))
else:
    df = pd.read_csv(io.StringIO(CSV_TEXT))

print(SOURCE, len(df), '행')`,
  },
  {
    id: 'save',
    title: '셀 8. 결과를 CSV로 저장하고 내려받기',
    code: `table.to_csv('summary.csv', encoding='utf-8-sig')   # 런타임 안에 파일 만들기
print(open('summary.csv', encoding='utf-8-sig').read())

# Colab에서 내 컴퓨터로 받으려면 아래 두 줄의 #을 지우고 실행합니다.
# from google.colab import files
# files.download('summary.csv')`,
  },
];

/** 일부러 오류를 내는 짧은 코드. 각 코드는 새 노트에서 따로 실행한 결과를 보여 준다. */
export interface Trouble { id: string; error: string; when: string; fix: string; code: string }

const SETUP = `import io
import pandas as pd
CSV_TEXT = """${PRACTICE_CSV}"""
df = pd.read_csv(io.StringIO(CSV_TEXT))
`;

export const TROUBLES: Trouble[] = [
  {
    id: 'name',
    error: 'NameError',
    when: '위 셀을 실행하지 않았거나, 런타임이 다시 시작되어 변수가 사라졌을 때',
    fix: 'Runtime → Run before(이전 셀 모두 실행)를 누르거나 맨 위 셀부터 차례로 다시 실행합니다.',
    code: `print(table)`,
  },
  {
    id: 'file',
    error: 'FileNotFoundError',
    when: '파일을 올리지 않았거나, 세션이 끝나 올린 파일이 사라졌거나, 파일 이름이 다를 때',
    fix: '왼쪽 파일 패널에서 파일 이름을 확인하고 다시 올립니다. 미션 코드는 SOURCE = \'upload\'로 바꾸면 파일 고르기 창이 열립니다.',
    code: `${SETUP}pd.read_csv('nfc-experiment.csv')`,
  },
  {
    id: 'column',
    error: 'KeyError',
    when: '열 이름에 오타가 있거나 다른 워크북의 CSV를 올렸을 때',
    fix: 'print(df.columns)로 실제 열 이름을 봅니다. 미션 코드는 이 경우 "없는 열: [...]"을 알려 줍니다.',
    code: `${SETUP}df['conditon']`,
  },
  {
    id: 'empty',
    error: 'Empty DataFrame',
    when: '거르는 조건에 맞는 행이 하나도 없을 때. 예: 데모 기록만 있는데 real로 거름',
    fix: 'print(df[\'data_type\'].value_counts())로 어떤 구분이 몇 행인지 보고 SOURCE와 기록 구분을 맞춥니다. 미션 코드는 "분석할 행이 없습니다"로 멈춥니다.',
    code: `${SETUP}real = df[df['data_type'] == 'real']
print(real[real['condition'] == '지갑'])`,
  },
  {
    id: 'type',
    error: 'TypeError',
    when: '글자로 읽은 숫자를 바로 계산할 때',
    fix: '계산 직전에 astype(float) 또는 astype(int)로 바꿉니다. 빈 칸이 있으면 먼저 빼거나 따로 셉니다.',
    code: `${SETUP}raw = pd.read_csv(io.StringIO(CSV_TEXT), dtype=str, keep_default_na=False)
raw['distance_cm'] + 1`,
  },
];

/** 미션 9장 코드를 줄 묶음으로 읽는 표. 대표 줄은 모든 미션 코드에 실제로 있는 줄이다. */
export const MISSION_GROUPS: [string, string, string][] = [
  ["# 0. 자료 고르기\nSOURCE = 'sample'", "골든 데이터로 연습할지(sample), 내 CSV를 올릴지(upload) 고릅니다.", '셀 7'],
  ['import io, json, re\nimport pandas as pd', '쓸 도구를 불러옵니다. pd는 pandas, plt는 matplotlib의 짧은 이름입니다.', '셀 2, 6'],
  ['SAMPLE_CSV = """trial,...', '페이지의 골든 데이터를 CSV 글자 그대로 코드 안에 넣은 것입니다. 마지막에 일부러 잘못된 행이 한 줄 있습니다.', '셀 2'],
  ['def read_text():', 'SOURCE에 따라 글자를 가져오는 함수입니다. def는 함수를 만들고, 이름() 으로 부릅니다.', '셀 1, 7'],
  ["MODE = 'demo' if SOURCE == 'sample' else 'real'", 'sample이면 demo 행, 내 파일이면 real 행만 분석하도록 정합니다.', '셀 3'],
  ['table = pd.read_csv(..., dtype=str, keep_default_na=False)', '모든 칸을 글자로 읽어 빈 칸과 0을 구분합니다. 이어서 필요한 열(NEED)이 있는지 확인합니다.', '셀 2, 4'],
  ["data = table[table['data_type'] == MODE].copy()", "data_type이 맞는 행만 남기고 '1. 불러오기' 줄을 출력합니다.", '셀 3'],
  ["def problem(r):\nreasons = data.apply(problem, axis=1)", "행마다 값이 허용 범위인지 검사하고, 잘못된 행은 이유와 함께 빼고 '2. 검사' 줄을 출력합니다.", '셀 4'],
  ["summary = {...}\nfor ... in data.groupby(...):", '조건별로 묶어 시도, 성공, 비율, 중앙값 같은 값을 딕셔너리에 모읍니다.', '셀 1, 5'],
  ['bar(labels, values, ...) 또는 plt.bar(...)', 'G1, G2 이름으로 막대그래프를 그리고, 각 이름의 뜻을 먼저 출력합니다.', '셀 6'],
  ["print('3. 계산 결과')\nprint('검증용 JSON:', ...)", '계산값을 출력합니다. 이 값이 페이지 7장의 예상 분석값, 8장의 브라우저 계산과 같아야 합니다.', '셀 5'],
];

export const fullScript = (): string => CELLS.map((c) => `# ${c.title}\n${c.code}`).join('\n\n') + '\n';
