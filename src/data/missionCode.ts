// 미션 코드 읽기. 해설하는 코드는 모두 colab.ts가 실제로 만드는 미션 코드에서 표지 줄로 잘라 온다.
// 표지가 사라지면 빌드가 실패하므로 해설과 원문이 어긋나지 않는다. 예제는 scripts/check-python-intro.ts가 실행해
// mission-code-output.json의 출력과 대조한다(--write로 갱신).
import { csvColab, fieldworkColab, nfcColab } from '../lib/colab.ts';
import { pythonScript } from '../lib/nfc.ts';
import { pseudonymize, readSource } from '../lib/pseudonym.ts';
import { FIELD_WORKBOOKS } from '../lib/workbooks/index.ts';
import * as nfcBook from '../lib/workbooks/nfc.ts';
import * as csvBook from '../lib/workbooks/csv.ts';
import * as wifiBook from '../lib/workbooks/wifi-rssi.ts';
import { wifiColab } from '../lib/colab.ts';

const field = (kind: string) => {
  const w = FIELD_WORKBOOKS.find((x) => x.kind === kind);
  if (!w) throw new Error(`워크북 없음: ${kind}`);
  return fieldworkColab(w.kind, w.golden);
};

/** 13개 미션과 NFC 노트북의 실제 코드. 페이지 링크와 함께 둔다. */
export const MISSIONS: { id: string; n: string; title: string; href: string; code: string }[] = [
  { id: 'nfc', n: '01', title: 'NFC 지갑·가방 인식', href: '/lab/nfc/', code: nfcColab(nfcBook.golden) },
  { id: 'wifi-rssi', n: '02', title: '방별 신호 세기', href: '/lab/wifi-rssi/', code: wifiColab(wifiBook.golden) },
  ...(['ssid-map', 'wpa-pmf', 'channel', 'ble-ad', 'ble-pair', 'interference', 'ir', 'subghz', 'gps', 'firmware'] as const).map((id, i) => ({
    id, n: String(i + 3).padStart(2, '0'), href: `/lab/${id}/`, code: field(id),
    title: ({ 'ssid-map': '같은 이름의 Wi-Fi', 'wpa-pmf': 'WPA·PMF 설정', channel: '채널 혼잡', 'ble-ad': 'BLE 광고와 추적', 'ble-pair': 'BLE 페어링', interference: '2.4GHz 간섭', ir: 'IR 리모컨 명령', subghz: '433MHz 리모컨', gps: 'GPS 위치 신뢰', firmware: '펌웨어 출처 확인' } as Record<string, string>)[id],
  })),
  { id: 'csv', n: '13', title: 'CSV 가명처리', href: '/lab/csv/', code: csvColab(csvBook.golden.original, pseudonymize(readSource(csvBook.golden.original), csvBook.golden.actions).csv) },
];
export const NOTEBOOK = pythonScript();
const code = (id: string) => MISSIONS.find((m) => m.id === id)!.code;

export interface Excerpt { text: string; start: number; end: number }
/** from이 들어 있는 줄부터 그 뒤 처음으로 to가 들어 있는 줄까지. 없으면 빌드를 멈춘다. */
export function excerpt(src: string, from: string, to: string): Excerpt {
  const lines = src.split('\n');
  const a = lines.findIndex((l) => l.includes(from));
  const b = a < 0 ? -1 : lines.findIndex((l, i) => i >= a && l.includes(to));
  if (a < 0 || b < 0) throw new Error(`미션 코드에서 표지를 찾지 못했습니다: ${from} … ${to}`);
  return { text: lines.slice(a, b + 1).join('\n'), start: a + 1, end: b + 1 };
}

export interface Example { id: string; title: string; code: string }
export interface Task { kind: '예측' | '수정'; q: string; example?: Example; answer: string }
export interface Block {
  id: string; title: string; source: string; href: string; excerpt: Excerpt;
  data: string; does: string[]; why: string; care: string;
  example: Example; tasks: Task[];
}

const ex = (id: string, title: string, ...parts: string[]): Example => ({ id, title, code: parts.join('\n') });

/* NFC: 숫자형(성공 0/1과 거리) ----------------------------------------------------------- */
const NFC = code('nfc');
const nfcLoad = excerpt(NFC, 'table = pd.read_csv', "print(f'1. 불러오기");
const nfcProblem = excerpt(NFC, 'def problem(r):', "    return ''");
const nfcCheck = excerpt(NFC, 'def problem(r):', 'raise SystemExit');
const nfcCount = excerpt(NFC, "data['ok'] = ", 'oks.append(s); fails.append(a - s)');
const nfcPlot = excerpt(NFC, "codes = [f'G{i + 1}' for i in range(len(conds))]", 'plt.show()');
const nfcSource = excerpt(NFC, 'def read_text():', 'return f.read()');

const MINI = `import io
import pandas as pd

CSV = """trial,condition,distance_cm,success,data_type
1,단독,1,1,demo
2,단독,3,1,demo
3,지갑,1,1,demo
4,지갑,3,0,demo
5,지갑,5,,demo
6,가방,1,0,demo
1,단독,1,1,real
"""
table = pd.read_csv(io.StringIO(CSV), dtype=str, keep_default_na=False)`;

const NFC_BLOCKS: Block[] = [
  {
    id: 'nfc-source', title: '자료 고르기: SOURCE와 read_text', source: 'nfc', href: '/lab/nfc/#ch-9', excerpt: nfcSource,
    data: "맨 위의 SOURCE 한 글자열과 코드 안의 SAMPLE_CSV 글자, 또는 올린 CSV 파일",
    does: ["if SOURCE == 'sample'이면 코드 안 글자(SAMPLE_CSV)를 그대로 돌려줍니다(return).", "'upload'면 files.upload()로 파일 고르기 창을 열고, next(...)로 .csv로 끝나는 첫 이름을 고른 뒤 글자로 바꿉니다(decode).", "그 밖이면 with open(...)으로 같은 폴더의 파일을 읽습니다. with는 다 읽으면 파일을 닫아 줍니다."],
    why: '분석 코드는 그대로 두고 자료만 바꾸기 위해서입니다. sample 출력이 9장의 예상 출력과 같으면 코드를 제대로 붙여 넣은 것입니다.',
    care: "MODE = 'demo' if SOURCE == 'sample' else 'real' 줄이 이어서 나옵니다. sample은 데모 행, 그 밖은 실제 행만 분석합니다.",
    example: ex('nfc-source', 'SOURCE에 따라 MODE가 바뀌는지 보기', "for SOURCE in ['sample', 'upload', 'file']:", "    MODE = 'demo' if SOURCE == 'sample' else 'real'", "    print(SOURCE, '→', MODE)"),
    tasks: [
      { kind: '예측', q: "SOURCE = 'upload'로 바꾸고 데모 기록만 있는 CSV를 올리면 어떻게 될까요?", answer: "MODE가 real이 되어 data_type이 real인 행만 남습니다. 데모만 있으면 0행이 되고 '분석할 행이 없습니다'로 멈춥니다. 내 실제 기록을 6장에서 내려받았는지 확인합니다." },
    ],
  },
  {
    id: 'nfc-load', title: '불러오기: 열 확인과 data_type 거르기', source: 'nfc', href: '/lab/nfc/#ch-9', excerpt: nfcLoad,
    data: 'CSV 글자. dtype=str, keep_default_na=False라서 모든 칸이 글자이고 빈 칸은 빈 글자("")입니다.',
    does: ['NEED에 적은 열 가운데 없는 열을 리스트 내포로 모읍니다([c for c in NEED if c not in table.columns]).', '하나라도 없으면 raise ValueError로 멈추고 없는 열 이름을 알려 줍니다.', "apply와 map으로 모든 칸에 unguard를 적용하고, condition 앞뒤 빈칸을 .str.strip()으로 지웁니다.", "table[table['data_type'] == MODE]는 조건이 참인 행만 남깁니다. .copy()는 이후 새 열을 더해도 원본 표가 바뀌지 않게 복사합니다."],
    why: '다른 워크북의 CSV를 올리면 열이 없어 바로 알 수 있고, 데모와 실제 기록이 섞이지 않습니다.',
    care: "'1. 불러오기' 줄의 '다른 구분 N행 제외'가 예상과 다르면 SOURCE나 data_type을 먼저 봅니다.",
    example: ex('nfc-load', '없는 열 찾기와 data_type 거르기', MINI, "NEED = ['trial', 'condition', 'success', 'data_type', 'orientation']", 'lost = [c for c in NEED if c not in table.columns]', "print('없는 열:', lost)", '', "MODE = 'demo'", "data = table[table['data_type'] == MODE].copy()", "print(f'1. 불러오기: {MODE} 관찰 {len(data)}행, 다른 구분 {len(table) - len(data)}행 제외')"),
    tasks: [
      { kind: '수정', q: 'data_type 거르기 줄을 data = table.copy()로 바꾸면 단독의 성공/시도는 어떻게 될까요?', example: ex('nfc-load-mix', '거르지 않은 경우와 비교', MINI, "for name, data in [('거름', table[table['data_type'] == 'demo']), ('안 거름', table.copy())]:", "    rs = data[data['condition'] == '단독']", "    print(name, '단독', f\"{(rs['success'] == '1').sum()}/{len(rs)}\")"), answer: '거르지 않으면 실제 기록 1행이 데모에 섞여 2/2가 아니라 3/3이 됩니다. 비율이 같아 보여도 어느 기록으로 낸 결론인지 알 수 없게 됩니다.' },
    ],
  },
  {
    id: 'nfc-check', title: '검사: problem 함수로 쓸 수 있는 행만 남기기', source: 'nfc', href: '/lab/nfc/#ch-9', excerpt: nfcCheck,
    data: '거른 표 data의 한 행 r. r["success"]처럼 열 이름으로 칸을 꺼냅니다.',
    does: ["problem(r)은 행 하나를 받아 문제가 있으면 이유 글자를, 없으면 빈 글자를 돌려줍니다(return).", "try: float(...) except ValueError:는 숫자로 바꾸다 실패하면 멈추지 않고 이유를 돌려줍니다.", "data.apply(problem, axis=1)은 모든 행에 problem을 적용해 이유 열(reasons)을 만듭니다. axis=1은 '행마다'라는 뜻입니다.", "data.index[reasons != '']로 문제 행 번호를 찾아 출력하고, data[reasons == '']로 깨끗한 행만 남깁니다."],
    why: '빈 칸이나 오타를 실패(0)로 세면 인식률이 실제보다 낮아집니다. 빼면서 이유를 출력해 기록을 고칠 수 있게 합니다.',
    care: "남은 행이 0이면 raise SystemExit로 멈춥니다. 오류가 아니라 '분석할 것이 없다'는 안내입니다.",
    example: ex('nfc-check', '원문 problem 함수를 그대로 실행', 'import pandas as pd', '', nfcProblem.text, '', "rows = pd.DataFrame({'condition': ['단독', '지갑', '가방', ''], 'distance_cm': ['1', '3', '셋', '1'], 'success': ['1', '', '0', '1']})", "rows['이유'] = rows.apply(problem, axis=1)", 'print(rows)'),
    tasks: [
      { kind: '예측', q: '지갑 4회 가운데 1회를 기록하지 못해 빈 칸입니다. 빈 칸을 0으로 채워 계산하면 인식률은 어떻게 달라질까요?', example: ex('nfc-check-zero', '빈 칸을 빼는 경우와 0으로 채우는 경우', 'import pandas as pd', "s = pd.Series(['1', '1', '0', ''])   # 지갑 4회, 마지막은 기록 못 함", "valid = s[s.isin(['0', '1'])]", "print('뺀 경우:', f\"{(valid == '1').sum()}/{len(valid)}\")", "filled = s.replace('', '0')", "print('0으로 채운 경우:', f\"{(filled == '1').sum()}/{len(filled)}\")"), answer: '빼면 2/3(67%), 0으로 채우면 2/4(50%)입니다. 측정하지 못한 시도를 실패로 세어 인식률이 낮아지는 왜곡입니다. 원문 코드가 빈 값을 0으로 바꾸지 않고 빼는 이유입니다.' },
    ],
  },
  {
    id: 'nfc-count', title: '계산: 조건별 성공/시도와 분모', source: 'nfc', href: '/lab/nfc/#ch-9', excerpt: nfcCount,
    data: "검사를 통과한 data. success는 아직 '1', '0' 글자입니다.",
    does: ["(data['success'] == '1')은 True/False 열이고 .astype(int)로 1/0이 됩니다. 이것이 ok 열입니다.", "sorted(..., key=lambda c: (RANK.get(c, 3), c))는 단독, 지갑, 가방 순서로 줄 세웁니다. RANK에 없는 조건은 3번째 뒤에 가나다순입니다.", "for c in conds: 조건마다 rs(그 조건의 행)를 고르고 s = 성공 합, a = 그 조건의 행 수(분모)를 셉니다.", "summary[f'{c} 성공/시도'] = f'{s}/{a}'는 딕셔너리에 이름표와 값을 넣습니다. f-글자열의 {…} 자리에 값이 들어갑니다."],
    why: '분모를 그 조건의 유효 시도로 두어야 조건끼리 비교할 수 있습니다. 미측정 행은 앞 단계에서 이미 빠졌습니다.',
    care: '시도가 5회처럼 적으면 1회 차이가 20%p입니다. 결론에는 성공/시도를 함께 씁니다.',
    example: ex('nfc-count', '체이닝을 한 줄씩 나눠도 같은지, for와 groupby가 같은지', 'import pandas as pd', "data = pd.DataFrame({'condition': ['지갑', '단독', '지갑', '가방', '단독'], 'success': ['1', '1', '0', '0', '1']})", '', '# 원문 한 줄', "data['ok'] = (data['success'] == '1').astype(int)", '# 같은 일을 한 줄씩', "mask = data['success'] == '1'   # True/False 열", 'ok = mask.astype(int)            # True→1, False→0', "print('한 줄과 나눈 줄이 같다:', (ok == data['ok']).all())", '', "RANK = {'단독': 0, '지갑': 1, '가방': 2}", "conds = sorted(data['condition'].unique(), key=lambda c: (RANK.get(c, 3), c))", 'for c in conds:', "    rs = data[data['condition'] == c]", "    s, a = int(rs['ok'].sum()), len(rs)", "    print(c, f'{s}/{a}')", '', '# 같은 표를 groupby로: 묶고(groupby) 합과 개수를 센 뒤(agg) 열로 펼침(reset_index)', '# sort=False라 처음 나온 순서(지갑, 단독, 가방)로 나옵니다', "table = data.groupby('condition', sort=False)['ok'].agg(['sum', 'count']).reset_index()", 'print(table)'),
    tasks: [
      { kind: '수정', q: 'a = len(rs)를 a = len(data)로 바꾸면 단독은 몇이 될까요?', example: ex('nfc-count-denom', '분모를 전체 행으로 바꾼 경우', 'import pandas as pd', "data = pd.DataFrame({'condition': ['지갑', '단독', '지갑', '가방', '단독'], 'ok': [1, 1, 0, 0, 1]})", "rs = data[data['condition'] == '단독']", "print('조건의 시도로 나눔:', f\"{int(rs['ok'].sum())}/{len(rs)}\")", "print('전체 행으로 나눔:', f\"{int(rs['ok'].sum())}/{len(data)}\")"), answer: '2/2가 2/5가 됩니다. 분모가 그 조건의 시도가 아니라 모든 기록이 되어, 시도를 많이 한 조건일수록 유리해지는 잘못된 비교가 됩니다.' },
      { kind: '수정', q: "조건(condition) 대신 거리(distance_cm)로 묶으면 무엇을 비교하게 될까요?", example: ex('nfc-count-group', '묶는 열을 바꾸기', 'import pandas as pd', "data = pd.DataFrame({'condition': ['단독', '단독', '지갑', '지갑'], 'distance_cm': ['1', '3', '1', '3'], 'ok': [1, 1, 1, 0]})", "print(data.groupby('condition', sort=False)['ok'].agg(['sum', 'count']))", "print(data.groupby('distance_cm')['ok'].agg(['sum', 'count']))"), answer: "묶는 열(그룹 키)이 질문을 정합니다. condition으로 묶으면 놓는 곳의 차이, distance_cm로 묶으면 거리의 차이를 봅니다. 두 변수가 함께 바뀐 기록이면 한쪽 표만으로 한 변수의 효과라고 말하지 않습니다. 원문 코드는 두 가지를 각각 계산합니다." },
    ],
  },
  {
    id: 'nfc-plot', title: '그래프: 쌓은 막대의 축과 단위', source: 'nfc', href: '/lab/nfc/#ch-9', excerpt: nfcPlot,
    data: '조건 이름 conds, 조건별 성공 수 oks, 실패 수 fails',
    does: ['G1, G2… 짧은 이름을 만들고 뜻을 먼저 출력합니다(zip은 두 리스트를 짝지어 돌립니다).', 'plt.bar(codes, oks)로 성공 막대를 그리고, 두 번째 plt.bar(..., bottom=oks)로 실패를 그 위에 쌓습니다.', "세로축(ylabel)은 attempts, 곧 시도 횟수입니다. 막대 전체 높이 = 성공 + 실패 = 시도입니다.", 'legend()는 색의 뜻(read, not read)을 표시합니다.'],
    why: '인식률(%)만 그리면 시도 수가 보이지 않습니다. 쌓은 막대는 시도 수와 성공 비율을 함께 보여 줍니다.',
    care: '막대 높이 차이는 시도 수 차이일 수 있습니다. 인식률은 초록 부분이 전체 높이에서 차지하는 비율로 읽습니다.',
    example: ex('nfc-plot', '그래프에 들어가는 숫자만 먼저 보기', "conds = ['단독', '지갑', '가방']", 'oks = [9, 6, 5]', 'fails = [1, 4, 5]', "codes = [f'G{i + 1}' for i in range(len(conds))]", 'for code, c, s, f in zip(codes, conds, oks, fails):', "    print(f'{code} {c}: 초록 {s}, 회색 {f}, 막대 높이(시도) {s + f}, 인식률 {s / (s + f):.0%}')"),
    tasks: [
      { kind: '예측', q: '막대 높이가 모두 10인데 초록 부분만 다릅니다. “가방이 인식을 막는다”고 결론 내릴 수 있나요?', answer: '이 그래프는 조건별로 읽힌 비율만 보여 줍니다. 가방의 재질, 태그 방향, 거리 같은 다른 조건이 함께 달랐을 수 있고 시도도 10회뿐입니다. “이 기록에서는 가방 조건의 인식률이 가장 낮았다”까지가 근거 있는 문장입니다.' },
    ],
  },
];

/* WPA-PMF: 설정형(범주와 규칙) ------------------------------------------------------------- */
const WPA = code('wpa-pmf');
const wpaFilter = excerpt(WPA, "obs = table[(table['record_type'] == 'observation')", "print(f'1. 불러오기");
const wpaCategory = excerpt(WPA, 'def category(r):', "return '기타 설정'");
const wpaCount = excerpt(WPA, "data['category'] = data.apply(category, axis=1)", "print(pd.crosstab(data['configured'], data['pmf']))");
const wpaOrder = excerpt(WPA, 'ORDER = [', 'ORDER = [');

const WPA_BLOCKS: Block[] = [
  {
    id: 'wpa-filter', title: '두 조건을 함께 거르기: &와 괄호', source: 'wpa-pmf', href: '/lab/wpa-pmf/#ch-9', excerpt: wpaFilter,
    data: '현장 기록형 CSV. 한 파일에 관찰 행(observation)과 서술 행이 함께 있고, workbook_id로 워크북을 구별합니다.',
    does: ["(조건1) & (조건2)는 두 조건이 모두 참인 행만 남깁니다. pandas에서 '그리고'는 and가 아니라 &입니다.", '각 조건을 괄호로 감싸야 합니다. 괄호가 없으면 & 를 먼저 계산하려다 오류가 납니다.', '이어서 data_type == MODE로 한 번 더 거릅니다.'],
    why: '서술 행이나 다른 워크북의 행이 섞이면 행 수와 범주 개수가 틀어집니다.',
    care: "'다른 구분 N행 제외'의 N은 관찰 행 가운데 data_type이 다른 행 수입니다. 서술 행은 그 앞에서 이미 빠졌습니다.",
    example: ex('wpa-filter', '괄호가 있는 &와 없는 &', 'import pandas as pd', "table = pd.DataFrame({'record_type': ['observation', 'note', 'observation'], 'workbook_id': ['wpa-pmf', 'wpa-pmf', 'channel']})", "obs = table[(table['record_type'] == 'observation') & (table['workbook_id'] == 'wpa-pmf')]", "print('괄호 있음:', len(obs), '행')", 'try:', "    table[table['record_type'] == 'observation' & table['workbook_id'] == 'wpa-pmf']", 'except Exception as e:', "    print('괄호 없음:', type(e).__name__)"),
    tasks: [
      { kind: '예측', q: "& 대신 and를 쓰면(…== 'observation') and (…== 'wpa-pmf') 어떻게 될까요?", example: ex('wpa-filter-and', 'and로 바꿔 보기', 'import pandas as pd', "table = pd.DataFrame({'record_type': ['observation', 'note'], 'workbook_id': ['wpa-pmf', 'wpa-pmf']})", 'try:', "    table[(table['record_type'] == 'observation') and (table['workbook_id'] == 'wpa-pmf')]", 'except Exception as e:', "    print(type(e).__name__)"), answer: "ValueError가 납니다. and는 True/False 하나를 원하지만 열 비교는 행마다 True/False가 있는 열이라 '어느 하나로 정할 수 없다'는 오류입니다. 열끼리는 &, 또는 |(어느 하나라도)를 씁니다." },
    ],
  },
  {
    id: 'wpa-category', title: '규칙 함수: 설정 표시를 보호 범위로 분류', source: 'wpa-pmf', href: '/lab/wpa-pmf/#ch-9', excerpt: wpaCategory,
    data: '한 행 r의 observation_status, configured, pmf 값(모두 글자)',
    does: ['if 문을 위에서부터 차례로 검사하고, 처음 맞는 줄에서 return으로 범주 이름을 돌려줍니다.', "A if 조건 else B는 한 줄 조건식입니다. 'WPA3 전용, PMF 필수' if r['pmf'] == 'required' else …", "in ('disabled', 'unchecked')는 두 값 가운데 하나인지 봅니다.", "맨 앞에서 관찰하지 못했거나 설정을 모르면 '판정 보류'로 보냅니다."],
    why: '설정 화면의 글자를 사람이 매번 판단하지 않고, 같은 규칙으로 모든 행을 분류하기 위해서입니다.',
    care: '함수 안 주석처럼, 이 분류는 화면과 문서의 표시를 읽은 것입니다. 실제 단말이 어떤 방식으로 접속했는지는 알 수 없습니다.',
    example: ex('wpa-category', '원문 category 함수를 그대로 실행', 'import pandas as pd', '', wpaCategory.text, '', "rows = pd.DataFrame({'observation_status': ['observed', 'observed', 'observed', 'unchecked'], 'configured': ['wpa3', 'mixed', 'wpa2', 'unchecked'], 'pmf': ['required', 'capable', 'disabled', 'unchecked']})", "rows['category'] = rows.apply(category, axis=1)", "print(rows[['configured', 'pmf', 'category']])"),
    tasks: [
      { kind: '예측', q: "configured가 'wpa2', pmf가 'required'인 행은 어느 범주가 될까요?", example: ex('wpa-category-q', '한 행만 넣어 확인', wpaCategory.text, '', "print(category({'observation_status': 'observed', 'configured': 'wpa2', 'pmf': 'required'}))"), answer: "'WPA2와 PMF'입니다. wpa2 줄의 조건식에서 pmf가 disabled나 unchecked가 아니므로 else 쪽으로 갑니다." },
    ],
  },
  {
    id: 'wpa-count', title: '범주 세기와 crosstab: 빈도는 원인이 아니다', source: 'wpa-pmf', href: '/lab/wpa-pmf/#ch-9', excerpt: wpaCount,
    data: '행마다 category 열이 붙은 data',
    does: ["ORDER 순서대로 (data['category'] == c).sum()으로 범주별 행 수를 셉니다. True는 1로 더해집니다.", 'if n: 0개인 범주는 summary와 그래프에서 뺍니다.', "pd.crosstab(행, 열)은 configured(줄) × pmf(칸) 조합마다 행 수를 세는 표입니다."],
    why: 'ORDER로 순서를 고정해 보호 범위가 강한 것부터 약한 것 순으로 늘 같은 순서로 보입니다.',
    care: '칸의 숫자는 내가 기록한 공유기·문서의 수입니다. 많다는 것이 원인이나 보안 수준을 뜻하지 않습니다.',
    example: ex('wpa-count', 'ORDER 반복과 value_counts, crosstab', 'import pandas as pd', wpaOrder.text, "data = pd.DataFrame({'configured': ['mixed', 'mixed', 'wpa2', 'wpa3'], 'pmf': ['capable', 'capable', 'disabled', 'required'], 'category': ['전환 모드, PMF 선택 이상', '전환 모드, PMF 선택 이상', 'WPA2, PMF 없음 또는 미확인', 'WPA3 전용, PMF 필수']})", 'for c in ORDER:', "    n = int((data['category'] == c).sum())", '    if n:', '        print(c, n)', "print(data['category'].value_counts().to_dict())", "print(pd.crosstab(data['configured'], data['pmf']))"),
    tasks: [
      { kind: '예측', q: "crosstab에서 mixed × capable 칸이 2로 가장 큽니다. “전환 모드 공유기는 PMF를 선택으로 두는 경향이 있다”고 쓸 수 있나요?", answer: '아니요. 이 표는 내가 고른 공유기 몇 대의 설정 표시를 센 빈도입니다. 같은 공유기를 두 번 기록했을 수도 있고(별칭으로 확인), 표본이 적습니다. “내 기록 4건 가운데 2건이 전환 모드·PMF 선택이었다”처럼 범위를 밝혀 씁니다.' },
    ],
  },
];

/* CSV: 검사형(원본과 가명본 비교) -------------------------------------------------------------- */
const CSV = code('csv');
const csvUnguard = excerpt(CSV, 'def unguard(v):', 'return v[1:]');
const csvCols = excerpt(CSV, 'kept = [c for c in orig.columns', 'removed = [c for c in orig.columns');
const csvPairs = excerpt(CSV, 'for c in aliased:', "summary[f'{c} 일대일 대응']");

const PAIR_SETUP = `import pandas as pd
orig = pd.DataFrame({'uid': ['A', 'A', 'B', 'C'], 'rssi_dbm': ['-48', '-53', '-70', '-81']})
pseu = pd.DataFrame({'uid_alias': ['열1-1', '열1-1', '열1-2', '열1-3'], 'rssi_dbm': ['-48', '-53', '-70', '-81']})
aliased = ['uid']
summary = {}`;

const CSV_BLOCKS: Block[] = [
  {
    id: 'csv-unguard', title: '글자 되돌리기: unguard와 인덱스', source: 'csv', href: '/lab/csv/#ch-9', excerpt: csvUnguard,
    data: "칸 하나의 글자 v. 사이트는 =, +, -, @로 시작하는 글 앞에 작은따옴표를 붙여 저장합니다(스프레드시트 수식 실행 방지).",
    does: ["re.match(r\"^'+\\s*[=+\\-@]\", v)는 '작은따옴표 뒤에 =, +, -, @가 오는 글'인지 검사합니다.", 'v[1:]은 첫 글자를 뺀 나머지입니다. 인덱스 0이 첫 글자이고 1:은 1번부터 끝까지입니다.', 'A if 조건 else B로 맞으면 따옴표를 뗀 값, 아니면 원래 값을 돌려줍니다.'],
    why: "되돌리지 않으면 '-48이 숫자로 바뀌지 않고, 원본과 가명본의 값 비교도 틀어집니다.",
    care: "it's처럼 중간에 따옴표가 있는 글은 건드리지 않습니다. 맨 앞 따옴표 + 수식 기호인 경우만 되돌립니다.",
    example: ex('csv-unguard', '원문 unguard를 여러 값에 적용', 'import re', '', csvUnguard.text, '', "for v in [\"'-48\", '-48', \"'=SUM(A1)\", \"it's\", '']:", "    print(repr(v), '→', repr(unguard(v)))"),
    tasks: [
      { kind: '예측', q: "unguard 없이 float(\"'-48\")을 하면 어떻게 될까요?", example: ex('csv-unguard-q', '따옴표가 남은 채 숫자로 바꾸기', 'try:', "    print(float(\"'-48\"))", 'except ValueError as e:', "    print('ValueError:', e)"), answer: '따옴표가 남아 있어 숫자로 바꿀 수 없다는 ValueError가 납니다. 그래서 미션 코드는 읽자마자 모든 칸에 unguard를 적용합니다.' },
    ],
  },
  {
    id: 'csv-cols', title: '열 나누기: 리스트 내포 세 줄', source: 'csv', href: '/lab/csv/#ch-9', excerpt: csvCols,
    data: '원본 열 이름(orig.columns)과 가명본 열 이름(pseu.columns)',
    does: ['[c for c in 원본열 if 조건]은 조건에 맞는 열 이름만 모은 새 리스트입니다(리스트 내포).', "kept: 가명본에도 같은 이름이 있는 열. aliased: 이름 뒤에 _alias가 붙어 있는 열. removed: 둘 다 아닌 열.", "c + '_alias'는 글자 잇기입니다."],
    why: '가명처리가 계획대로 됐는지, 특히 지운다고 한 열이 정말 빠졌는지 숫자로 확인하기 위해서입니다.',
    care: '이 검사는 열 이름만 봅니다. 남긴 열(note 같은 메모)의 내용에 이름이나 위치가 섞여 있는지는 사람이 직접 읽어야 합니다.',
    example: ex('csv-cols', '원문 세 줄을 그대로 실행', 'import pandas as pd', "orig = pd.DataFrame(columns=['uid', 'room', 'rssi_dbm', 'observed_at', 'note'])", "pseu = pd.DataFrame(columns=['uid_alias', 'room_alias', 'rssi_dbm', 'observed_at'])", csvCols.text, "print('kept', kept)", "print('aliased', aliased)", "print('removed', removed)"),
    tasks: [],
  },
  {
    id: 'csv-pairs', title: '일대일 대응: groupby와 nunique', source: 'csv', href: '/lab/csv/#ch-9', excerpt: csvPairs,
    data: '가명으로 바꾼 열마다 원래 값(a)과 별칭(b)을 나란히 둔 작은 표 pairs',
    does: ["pairs[pairs['a'] != '']는 빈 값을 뺍니다.", "pairs.groupby('a')['b'].nunique()는 원래 값 하나에 서로 다른 별칭이 몇 개 붙었는지 셉니다. .max() <= 1이면 모두 하나뿐입니다.", '반대 방향(별칭 하나에 원래 값 몇 개)도 같은 방법으로 보고, 둘 다 1 이하일 때만 일대일입니다.'],
    why: '같은 기기는 늘 같은 별칭, 다른 기기는 다른 별칭이어야 가명본으로도 기기별 분석을 할 수 있습니다.',
    care: '일대일이라고 해서 재식별이 불가능하다는 뜻은 아닙니다. 시각이나 방 같은 다른 열로 사람을 알아볼 수 있는지는 따로 봅니다.',
    example: ex('csv-pairs', '원문 반복문을 그대로 실행', PAIR_SETUP, csvPairs.text, 'print(summary)'),
    tasks: [
      { kind: '수정', q: '서로 다른 uid B와 C에 같은 별칭 열1-2를 붙이면 결과가 어떻게 바뀔까요?', example: ex('csv-pairs-bad', '별칭 하나를 잘못 붙인 경우', PAIR_SETUP.replace("'열1-2', '열1-3'", "'열1-2', '열1-2'"), csvPairs.text, 'print(summary)'), answer: "별칭 종류가 2로 줄고 일대일 대응이 '아니요'가 됩니다. 별칭 열1-2 하나에 원래 값 B, C 두 개가 붙어 nunique가 2이기 때문입니다. 이 가명본으로는 B와 C를 구별할 수 없습니다." },
    ],
  },
];

export const BLOCK_GROUPS = [
  { id: 'nfc', title: 'NFC: 숫자형 기록 읽기', mission: '01 NFC 지갑·가방 인식', href: '/lab/nfc/#ch-9', lead: 'success 0/1과 거리를 세어 인식률을 내는 코드입니다. 01 NFC와 02 Wi-Fi RSSI, 05 채널, 11 GPS처럼 숫자를 세고 중앙값·비율을 내는 미션이 같은 흐름입니다.', blocks: NFC_BLOCKS },
  { id: 'wpa', title: 'WPA-PMF: 설정형 기록 분류하기', mission: '04 WPA·PMF 설정', href: '/lab/wpa-pmf/#ch-9', lead: '글자로 된 설정 값을 규칙 함수로 범주에 나누고 세는 코드입니다. 03 SSID, 07 페어링, 10 433MHz, 12 펌웨어처럼 범주를 세는 미션이 같은 흐름입니다.', blocks: WPA_BLOCKS },
  { id: 'csv', title: 'CSV: 두 파일을 비교해 검사하기', mission: '13 CSV 가명처리', href: '/lab/csv/#ch-9', lead: '원본과 가명본을 나란히 읽어 열 처리와 일대일 대응을 검사하는 코드입니다.', blocks: CSV_BLOCKS },
];

/* 문법 대조표: 실제 미션 코드에 있는 것만, 원문 한 줄과 함께 ------------------------------------------ */
interface SyntaxRow { name: string; re: RegExp; where: string }
const SYNTAX: SyntaxRow[] = [
  { name: 'import와 별칭(as)', re: /^import pandas as pd$/, where: '입문 셀 2' },
  { name: '변수와 글자열', re: /^SOURCE = 'sample'$/, where: '입문 셀 1 · nfc-source' },
  { name: '조건식 A if 조건 else B', re: /^MODE = 'demo' if SOURCE == 'sample' else 'real'$/, where: 'nfc-source · wpa-category' },
  { name: '함수 def, 인자 기본값, return', re: /^def med\(values, unit=''\):$/, where: 'nfc-check · wpa-category' },
  { name: '리스트 내포 [x for x in … if …]', re: /^lost = \[c for c in NEED if c not in table\.columns\]$/, where: 'nfc-load · csv-cols' },
  { name: '딕셔너리 {이름표: 값}', re: /^RANK = \{'단독': 0/, where: '입문 셀 1 · nfc-count' },
  { name: '인덱스와 잘라내기 v[1:]', re: /return v\[1:\] if re\.match/, where: 'csv-unguard' },
  { name: 'f-글자열과 형식 {v:.1f}', re: /f'\{v:\.1f\}'/, where: 'nfc-count · nfc-plot' },
  { name: 'for와 zip', re: /^\s*for c, l in zip\(codes, labels\):$/, where: 'nfc-plot' },
  { name: '비교와 in / not in', re: /if r\['success'\] not in \('0', '1'\)/, where: 'nfc-check · wpa-category' },
  { name: '열 조건 거르기 df[조건]', re: /^data = table\[table\['data_type'\] == MODE\]\.copy\(\)$/, where: '입문 셀 3 · nfc-load' },
  { name: '두 조건 & 와 괄호', re: /\(table\['record_type'\] == 'observation'\) & \(table\['workbook_id'\]/, where: 'wpa-filter' },
  { name: 'apply(…, axis=1)와 lambda, map', re: /^table = table\.apply\(lambda col: col\.map\(unguard\)\)$/, where: 'nfc-load · nfc-check' },
  { name: '빈 값: keep_default_na=False와 ""', re: /dtype=str, keep_default_na=False\)$/, where: '입문 셀 4 · nfc-check' },
  { name: '타입 변환 astype, float, int', re: /\.astype\(int\)$/, where: '입문 셀 4 · nfc-count' },
  { name: 'try / except ValueError', re: /^\s*except ValueError:$/, where: 'nfc-check' },
  { name: 'raise로 멈추기 (ValueError, SystemExit)', re: /^\s*raise SystemExit\(/, where: 'nfc-load · nfc-check' },
  { name: 'io.StringIO와 with open', re: /^\s*with open\(FILE_PATH, encoding='utf-8-sig'\) as f:$/, where: 'nfc-source' },
  { name: 'next(… for … if …)', re: /next\(n for n in uploaded if n\.endswith\('\.csv'\)\)/, where: 'nfc-source' },
  { name: 'sorted(…, key=lambda …)', re: /sorted\(data\['condition'\]\.unique\(\), key=lambda/, where: 'nfc-count' },
  { name: '.at[행, 열]과 .loc[조건, 열]', re: /\.loc\[rs\['rssi_dbm'\] != '', 'rssi_dbm'\]/, where: 'nfc-check(at) · 02 Wi-Fi(loc)' },
  { name: '.str 글자 메서드', re: /\.str\.strip\(\)$/, where: 'nfc-load' },
  { name: 'groupby와 nunique, median', re: /groupby\('a'\)\['b'\]\.nunique\(\)/, where: 'nfc-count · csv-pairs' },
  { name: 'pd.crosstab', re: /^print\(pd\.crosstab\(data\['configured'\], data\['pmf'\]\)\)$/, where: 'wpa-count' },
  { name: 'json.dumps(검증용 JSON)', re: /json\.dumps\(summary, ensure_ascii=False\)/, where: '모든 미션의 마지막 줄' },
  { name: 'matplotlib: bar, bottom, ylabel, legend', re: /bottom=oks/, where: 'nfc-plot' },
  { name: '노트북: agg(이름="count"), isin, to_numeric, unstack', re: /\.agg\(시도="count", 성공="sum"\)/, where: 'nfc-count(agg, reset_index) · nfc-check(isin)' },
];

export const SYNTAX_TABLE = SYNTAX.map((s) => {
  const all = [...MISSIONS.map((m) => ({ n: m.n, code: m.code })), { n: '노트북', code: NOTEBOOK }];
  const hits = all.filter((m) => m.code.split('\n').some((l) => s.re.test(l)) || s.re.test(m.code));
  if (!hits.length) throw new Error(`문법 대조표: 미션 코드에 없는 줄입니다 ${s.re}`);
  const line = hits[0].code.split('\n').find((l) => s.re.test(l))!.trim();
  return { name: s.name, line, from: hits[0].n, where: s.where };
});

/* 나머지 미션 요약: 묶는 열, 그래프 세로축, 비율의 분모 ------------------------------------------------- */
export const OTHER = MISSIONS.filter((m) => !['nfc', 'wpa-pmf', 'csv'].includes(m.id)).map((m) => {
  const c = m.code;
  const keys = [...new Set([...c.matchAll(/groupby\('([\w_]+)'/g)].map((x) => x[1]))];
  const joined = c.match(/data\['group'\] = data\['(\w+)'\] \+ ' ' \+ data\['(\w+)'\]/);
  const ruled = c.match(/data\['(\w+)'\] = data\.apply\((\w+), axis=1\)/);
  const counted = c.match(/\w+\['(\w+)'\] == v\)\.sum\(\)/);
  const placed = c.match(/data\[data\['(\w+)'\] == place\]/) ?? c.match(/for \w+ in sorted\(data\['(\w+)'\]\.unique\(\)\)/);
  const group = keys.map((k) => (k === 'group' && joined ? `${joined[1]} + ${joined[2]}` : k)).join(', ')
    || (ruled ? `${ruled[1]} (${ruled[2]} 함수가 만든 범주)` : counted ? `${counted[1]} 값별 개수` : placed ? placed[1] : '—');
  const cross = [...c.matchAll(/crosstab\(\w+\['(\w+)'\], \w+\['(\w+)'\]\)/g)].map((x) => `${x[1]} × ${x[2]}`).join(', ') || '—';
  const bar = [...c.matchAll(/^bar\(.*, '([^']*)', '([^']*)'\)$/gm)].pop();
  const denom = /= ratio\(rs\)/.test(c) ? '측정하지 못함(unchecked)을 뺀 시도'
    : /f"\{len\(fixed\)\}\/\{int\(\(rs\['observation_status'\] == 'observed'\)\.sum\(\)\)\}"/.test(c) ? '관찰된 행(observed)'
    : '비율 없음(개수·중앙값)';
  return { ...m, group, cross, chart: bar?.[1] ?? '—', ylabel: bar?.[2] ?? '—', denom };
});

/** 독해 완료 체크. 세 대표 미션에서 각자 찾아 설명한다. */
export const CHECKLIST: [string, string, string][] = [
  ['SOURCE 선택', '세 미션 맨 위에서 SOURCE와 FILE_PATH를 찾고, sample·upload일 때 어떤 행을 분석하는지 말한다.', "모두 SOURCE = 'sample'로 시작합니다. sample이면 데모, upload면 내가 올린 실제 기록입니다. CSV 미션은 원본과 가명본 두 파일을 받습니다."],
  ['CSV 열', 'NEED 리스트에서 꼭 있어야 하는 열 세 개를 고르고, 없으면 어떤 줄에서 멈추는지 찾는다.', "NFC는 condition, distance_cm, success 등. 없으면 raise ValueError 줄에서 '없는 열'을 출력하고 멈춥니다."],
  ['유효 행 필터', 'data_type 거르기와 problem 검사로 빠지는 행이 각각 무엇인지 말한다.', '거르기는 데모·실제가 다른 행, 검사는 값이 허용 범위를 벗어난 행(빈 success, 숫자가 아닌 거리, 없는 설정 값)을 뺍니다.'],
  ['그룹 키', 'NFC와 WPA-PMF에서 무엇으로 묶어 세는지 찾는다.', 'NFC는 condition과 거리(d), WPA-PMF는 category(규칙 함수가 만든 범주), crosstab은 configured × pmf입니다.'],
  ['분모', 'NFC 인식률의 분모가 무엇이고, 미측정이 왜 들어가지 않는지 말한다.', '분모는 그 조건에서 검사를 통과한 시도 수 len(rs)입니다. 빈 success는 검사에서 빠져 분모에 없습니다.'],
  ['축과 단위', '각 미션 그래프의 세로축 이름과 단위를 말한다.', 'NFC는 attempts(시도 횟수, 쌓은 막대), WPA-PMF는 rows(기록 행 수), CSV는 columns(열 개수)입니다.'],
  ['결론의 한계', '각 그래프에서 말할 수 없는 것을 한 가지씩 적는다.', 'NFC: 결제·복제 위험이 아님(코드 주석). WPA-PMF: 실제 접속 방식이 아님(category 주석). CSV: 남긴 열 내용의 재식별 위험은 따로 확인.'],
];

/** 페이지에 나오는 모든 예제. 검사 스크립트가 모두 실행한다. */
export const EXAMPLES: Example[] = BLOCK_GROUPS.flatMap((g) => g.blocks.flatMap((b) => [b.example, ...b.tasks.flatMap((t) => (t.example ? [t.example] : []))]));
