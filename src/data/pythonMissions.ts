// 8차시: 13개 미션 코드 지도, 10개 미션 고유 계산 과제, 함수 사전, NFC 원문 통합 과제, BLE 전이 과제, 졸업 체크.
// 영역·과제 준비 셀·확인 값은 모두 실제 미션 코드와 9장 실행 결과(colab-output.json)에서 만든다.
// 표지가 사라지거나 미션 코드에 함수 사전에 없는 이름이 새로 생기면 빌드가 멈춘다.
import colab from '../lib/workbooks/colab-output.json' with { type: 'json' };
import { MISSIONS, NOTEBOOK, OTHER } from './missionCode.ts';
import { py } from './pythonCourse.ts';
import { stepHref } from './pythonCourseMap.ts';

const OUT = colab as Record<string, string>;
export const missionJson = (id: string): Record<string, string> => {
  const line = OUT[id]?.split('\n').find((l) => l.startsWith('검증용 JSON: '));
  if (!line) throw new Error(`9장 출력에 검증용 JSON이 없습니다: ${id}`);
  return JSON.parse(line.slice('검증용 JSON: '.length));
};

/* ── 영역: 표지 줄로 미션 코드를 빠짐없이 나눈다 ─────────────────────────────────────── */
interface RegionDef { key: string; label: string; marker: string | RegExp; learn: string[] }
const GENERIC: RegionDef[] = [
  { key: 'source', label: '자료 고르기: SOURCE, FILE_PATH', marker: '# 0. 자료 고르기', learn: ['python-colab#source', 'project#upload'] },
  { key: 'import', label: 'import', marker: 'import io, json, re', learn: ['python-colab#csv'] },
  { key: 'sample', label: '골든 데이터(가상)', marker: /^(SAMPLE_CSV|ORIGINAL_CSV) = """/, learn: ['project#csv', 'functions#files'] },
  { key: 'read', label: '파일 읽기 함수', marker: /^def read_(text|pair)\(\):/, learn: ['functions#files'] },
  { key: 'unguard', label: '따옴표 되돌리기 unguard', marker: 'def unguard(v):', learn: ['functions#regex', 'basics#lists'] },
  { key: 'tools', label: '공통 도구 fmt·med·rng', marker: 'def fmt(v):', learn: ['functions#def'] },
  { key: 'ratio', label: '분모 함수 ratio', marker: 'def ratio(rs):', learn: ['group#denominator'] },
  { key: 'bar', label: '막대 함수 bar', marker: 'def bar(', learn: ['group#plot'] },
  { key: 'need', label: '꼭 있어야 하는 열 NEED', marker: /^NEED = \[/, learn: ['functions#compact', 'project#columns'] },
  { key: 'mode', label: 'MODE: 데모/실제', marker: "MODE = 'demo' if SOURCE", learn: ['basics#conditions', 'project#mode'] },
  { key: 'isint', label: '정수 검사 is_int', marker: 'def is_int(', learn: ['functions#regex'] },
  { key: 'consts', label: '허용 값 목록', marker: /^(METHODS|CODES) = /, learn: ['basics#lists'] },
  { key: 'problem', label: '검사 함수 problem', marker: 'def problem(r):', learn: ['functions#checker', 'functions#errors', 'project#invalid'] },
  { key: 'rule', label: '규칙 함수', marker: /^def (category|decision)\(r\):/, learn: ['mission-code#wpa-category', 'functions#checker'] },
  { key: 'load', label: '불러오기와 열 확인', marker: /^table = pd\.read_csv|^o_text, p_text = read_pair\(\)/, learn: ['table#frame', 'functions#errors', 'project#columns'] },
  { key: 'clean', label: '모든 칸 unguard', marker: 'table = table.apply(lambda col', learn: ['table#apply'] },
  { key: 'filter', label: '거르기: 워크북·관찰 행·데모/실제', marker: /^(obs|data) = (table|obs)\[/, learn: ['table#mask', 'project#mode'] },
  { key: 'states', label: '상태 값 STATES', marker: 'STATES = ', learn: ['basics#conditions'] },
  { key: 'apply', label: '검사 적용과 제외한 행', marker: 'reasons = data.apply(problem, axis=1)', learn: ['table#apply', 'table#loc', 'project#invalid'] },
  { key: 'count', label: '상태별 개수', marker: /^summary = \{$/, learn: ['group#count'] },
  { key: 'print', label: '계산 결과와 검증용 JSON', marker: "print('3. 계산 결과')", learn: ['basics#loops', 'functions#files'] },
];

interface MissionInfo { unique: string; learn: string[]; logic: string; limit: string; group?: string; denom?: string }
const INFO: Record<string, MissionInfo> = {
  nfc: { unique: 'def pct(s, a):', learn: ['basics#fstrings', 'project#count', 'project#table', 'project#plot'], logic: 'success 0/1을 ok 열로 바꿔 조건(단독·지갑·가방 순)과 거리마다 성공/시도를 세고, 0.5를 늘 올리는 반올림으로 인식률을 냅니다.', limit: '태그가 읽힌 비율만 보여 줍니다. 결제 승인, 카드 복제, 공격 성공률이 아닙니다(원문 주석).', group: 'condition, 거리 d', denom: '그 조건(거리)의 유효 시도 len(rs)' },
  'wifi-rssi': { unique: 'summary = {}', learn: ['group#count', 'group#plot', 'missions#m-wifi-rssi'], logic: '방마다 관찰된 RSSI만 골라 유효 n, 중앙값, 범위를 내고, 신호 못 찾음과 미측정은 개수만 셉니다. 막대는 음수 dBm을 위로 그리려고 120을 더합니다.', limit: '그 시각·그 휴대폰에서 본 신호 세기입니다. 속도나 연결 품질을 직접 뜻하지 않고, 막대 높이(dBm + 120)는 비율로 읽지 않습니다.' },
  'ssid-map': { unique: 'labels, counts = [], []', learn: ['group#count', 'group#reshape', 'missions#m-ssid-map'], logic: '관찰된 행만 SSID 별칭으로 묶어 서로 다른 BSSID 별칭 수와 자동 연결 기록을 셉니다.', limit: '같은 이름에 주소가 여럿이어도 메시·5GHz일 수 있어 가짜 AP라 단정하지 않습니다. 관리자 목록에 없는 주소는 판단 보류입니다.' },
  'wpa-pmf': { unique: "data['category'] = data.apply(category", learn: ['mission-code#wpa-category', 'mission-code#wpa-count', 'group#reshape'], logic: 'category 규칙 함수가 설정 표시를 보호 범위로 나누고, ORDER 순서로 범주별 행 수와 configured × pmf crosstab을 냅니다.', limit: '화면·문서 표시를 읽은 분류입니다. 실제 단말이 어떤 방식으로 접속했는지는 알 수 없습니다(원문 주석).', group: 'category (category 함수가 만든 범주)', denom: '비율 없음(개수)' },
  channel: { unique: 'labels, aps = [], []', learn: ['table#loc', 'group#count', 'missions#m-channel'], logic: '시간대(condition)마다 비어 있지 않은 AP 수와 RSSI만 골라 중앙값을 냅니다.', limit: 'AP 수는 화면에 보인 개수입니다. 채널 점유율이나 속도가 아닙니다(원문 출력).' },
  'ble-ad': { unique: "data['group'] = data['condition']", learn: ['table#apply', 'group#groupby', 'group#denominator', 'missions#m-ble-ad'], logic: '조건과 거리를 이어 그룹을 만들고, 그룹마다 측정하지 못함을 뺀 광고 관찰 비율과 RSSI 중앙값을 냅니다.', limit: '광고가 보인 비율과 신호 세기만 봅니다. 추적 가능성이나 정확한 거리를 단정하지 않고, 연결 중에는 광고가 보이지 않을 수 있습니다.' },
  'ble-pair': { unique: 'for v, label in METHODS.items():', learn: ['group#count', 'group#reshape', 'missions#m-ble-pair'], logic: 'METHODS의 네 방식을 차례로 돌며 관찰된 행의 개수를 세므로, 0개인 방식도 summary와 그래프에 남습니다.', limit: '화면에 보인 페어링 방식의 개수입니다. 그 방식의 보안 강도를 시험하지 않습니다.' },
  interference: { unique: 'labels, counts = [], []', learn: ['group#groupby', 'table#loc', 'missions#m-interference'], logic: '조건마다 화면 관찰 비율을 내고, 단위가 함께 적힌 수치만 범위로 보여 줍니다. 단위 없는 숫자는 검사에서 뺍니다.', limit: '막대·문구는 정성 관찰입니다. 송신자나 의도는 이 표로 알 수 없습니다(원문 출력).' },
  ir: { unique: "data['group'] = data['button']", learn: ['group#groupby', 'group#denominator', 'missions#m-ir'], logic: '버튼과 조건을 이어 그룹을 만들고, 그룹마다 수신 비율과 명령 별칭 종류 수를 냅니다.', limit: '수신 표시 비율과 별칭 종류만 셉니다. 실제 신호 값을 기록하거나 다른 기기를 조작하지 않습니다.' },
  subghz: { unique: 'for v, label in CODES.items():', learn: ['functions#checker', 'group#reshape', 'missions#m-subghz'], logic: '코드 방식 네 가지를 개수로 세고, 설명서(manual) 근거가 있을 때만 고정·롤링을 확정합니다. 이 규칙은 problem 함수에 있습니다.', limit: '설명서에 적힌 코드 방식만 셉니다. 화면 모양으로 고정·롤링을 판단하지 않고, 송신하지 않습니다.' },
  gps: { unique: 'labels, waits = [], []', learn: ['group#denominator', 'table#convert', 'group#plot', 'missions#m-gps'], logic: '실내·창가·야외마다 fix 성공/관찰, fix된 행의 대기 시간 중앙값, 위성 수 범위, 타임아웃 수를 냅니다.', limit: '위치가 맞는지는 휴대폰 지도 대조(crosscheck) 기록으로 따로 봅니다. 그래프의 0은 fix 못 함입니다.' },
  firmware: { unique: "data['decision'] = data.apply(decision", learn: ['functions#regex', 'table#apply', 'missions#m-firmware'], logic: 'decision 규칙이 해시 불일치를 먼저 막고, 해시·서명·복구 준비가 모두 갖춰질 때만 설치 검토 가능으로 판단합니다.', limit: '기록한 해시·서명·복구 준비로 판단할 뿐 파일이 안전하다는 보증이 아닙니다.' },
  csv: { unique: 'kept = [c for c in orig.columns', learn: ['functions#compact', 'mission-code#csv-cols', 'mission-code#csv-pairs'], logic: '원본과 가명본의 열 이름으로 유지·가명·제거 열을 나누고, 가명 열마다 원래 값과 별칭이 일대일인지 groupby와 nunique로 봅니다.', limit: '열 이름과 대응만 검사합니다. 남긴 열 내용의 재식별 위험은 사람이 직접 읽어 확인합니다.', group: '가명 열마다 원래 값(a) ↔ 별칭(b)', denom: '비율 없음(개수)' },
};
const REQUIRED = ['source', 'import', 'sample', 'read', 'unguard', 'load', 'unique', 'print'];
const FIELD_REQUIRED = ['mode', 'problem', 'filter', 'apply', 'need'];

export interface Region { key: string; label: string; start: number; end: number; learn: { href: string; label: string }[] }
const hit = (line: string, m: string | RegExp) => (typeof m === 'string' ? line.includes(m) : m.test(line));

function regions(id: string, code: string): Region[] {
  const lines = code.split('\n');
  const info = INFO[id];
  const defs = [...GENERIC, { key: 'unique', label: '이 미션의 고유 계산과 그래프', marker: info.unique, learn: info.learn }];
  const found = defs.flatMap((d) => {
    const i = lines.findIndex((l) => hit(l, d.marker));
    return i < 0 ? [] : [{ d, i }];
  }).sort((x, y) => x.i - y.i);
  const keys = found.map((f) => f.d.key);
  for (const k of [...REQUIRED, ...(id === 'csv' ? [] : FIELD_REQUIRED)]) if (!keys.includes(k)) throw new Error(`${id}: 영역 표지 없음 ${k}`);
  if (found[0].i !== 0) throw new Error(`${id}: 첫 영역이 1줄에서 시작하지 않습니다`);
  const end = lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
  return found.map((f, j) => ({ key: f.d.key, label: f.d.label, start: f.i + 1, end: j + 1 < found.length ? found[j + 1].i : end, learn: f.d.learn.map(stepHref) }));
}

/* ── 미션별 지도 ─────────────────────────────────────────────────────────────── */
const problemRules = (code: string): string[] => {
  const lines = code.split('\n');
  const a = lines.findIndex((l) => l.startsWith('def problem(r):'));
  if (a < 0) return [];
  const b = lines.findIndex((l, i) => i > a && l === "    return ''");
  return [...lines.slice(a, b).join('\n').matchAll(/return '([^']+)'/g)].map((m) => m[1]);
};
const units = (code: string): string[] => [...new Set([...code.matchAll(/(?:med|rng)\([^\n]*?, '([^'\n]+)'\)/g)].map((m) => m[1]))];
const states = (code: string): string[] => {
  const s = code.match(/^STATES = \(([^)]*)\)/m)?.[1];
  const named = code.match(/^(?:METHODS|CODES) = (\{.*\})$/m)?.[1];
  return [...(s ? s.split(',').map((x) => x.trim().replace(/'/g, '')) : []), ...(named ? Object.keys(JSON.parse(named)) : [])];
};

export interface MissionMap {
  id: string; n: string; title: string; href: string; need: string[]; rules: string[]; units: string[]; states: string[];
  group: string; cross: string; chart: string; ylabel: string; denom: string; logic: string; limit: string;
  regions: Region[]; unique: Region; lines: number;
}
export const MAPS: MissionMap[] = MISSIONS.map((m) => {
  const info = INFO[m.id];
  const other = OTHER.find((o) => o.id === m.id);
  const rs = regions(m.id, m.code);
  const need = m.code.match(/^NEED = (\[.*\])$/m);
  const title = m.code.match(/plt\.title\('([^']+)'\)/)?.[1];
  const ylabel = m.code.match(/plt\.ylabel\('([^']+)'\)/)?.[1];
  return {
    id: m.id, n: m.n, title: m.title, href: `${m.href}#ch-9`,
    need: need ? JSON.parse(need[1]) : ['원본 CSV의 모든 열', '가명본 CSV(열 이름 + _alias)'],
    rules: m.id === 'csv' ? ['원본과 가명본 행 수가 다르면 경고', '제거한 열이 가명본에 남았는지 확인'] : problemRules(m.code),
    units: m.id === 'nfc' ? ['%(인식률)', 'cm(거리)'] : m.id === 'interference' ? ['기록된 energy_unit'] : units(m.code),
    states: m.id === 'nfc' ? ["success '1'(읽힘)", "'0'(안 읽힘)"] : states(m.code),
    group: info.group ?? other?.group ?? '—', cross: other?.cross ?? (m.id === 'wpa-pmf' ? 'configured × pmf' : '—'),
    chart: other?.chart ?? title ?? '—', ylabel: other?.ylabel ?? ylabel ?? '—', denom: info.denom ?? other?.denom ?? '—',
    logic: info.logic, limit: info.limit, regions: rs, unique: rs.find((r) => r.key === 'unique')!, lines: m.code.split('\n').length - 1,
  };
});

/* ── 고유 계산 과제: 원문의 고유 계산 앞까지를 준비 셀로, 고유 계산은 직접 쓴다 ───────────────────── */
export interface MissionTask { id: string; title: string; q: string; pick: RegExp; answer: string; reason: string }
const TASKS: MissionTask[] = [
  { id: 'wifi-rssi', title: '방별 RSSI 중앙값과 범위를 groupby로', q: '원문은 sorted(unique)로 방을 돌립니다. groupby로 바꿔 방마다 유효 n, 중앙값, 범위를 my에 담고, 막대 높이(dBm + 120)도 출력하세요. med와 rng는 준비 셀의 원문 도구를 씁니다.', pick: /유효 n$|중앙값$|범위$/, answer: py`
my = {}
for room, rs in data.groupby('room'):
    values = rs.loc[rs['observation_status'] == 'observed', 'rssi_dbm']
    my[f'{room} 유효 n'] = str(len(values))
    my[f'{room} 중앙값'] = med(values, 'dBm')
    my[f'{room} 범위'] = rng(values, 'dBm')
    print(room, '막대 높이(dBm + 120):', values.astype(float).median() + 120)
print(my)`, reason: 'groupby의 기본 정렬은 sorted(unique)와 같은 가나다순이라 결과가 같습니다. not-observed와 unchecked 행은 RSSI가 비어 있어 중앙값에 넣지 않고 개수만 따로 셉니다. 현관은 5번 중 3번만 값이 있어 유효 n이 3입니다.' },
  { id: 'ssid-map', title: 'SSID별 서로 다른 BSSID 수', q: '관찰된 행(seen)을 SSID 별칭으로 묶어 서로 다른 BSSID 별칭 수를 groupby와 nunique 한 줄로 구하고, 미션과 같은 이름표로 my에 담으세요.', pick: /서로 다른 BSSID 별칭 수$/, answer: py`
counts = seen.groupby('ssid_alias')['bssid_alias'].nunique()
print(counts)
my = {}
for g, n in counts.items():
    my[f'{g} 서로 다른 BSSID 별칭 수'] = str(n)
print(my)`, reason: "SSID-A에 주소가 4개입니다. 그중 3개는 관리자 화면·메시 앱에서 확인한 같은 집의 주소이고, BSSID-X1은 어디에도 없는 주소라 판단 보류입니다. 개수만으로 가짜 AP라고 쓰지 않습니다." },
  { id: 'channel', title: '빈 칸을 뺀 AP 수 중앙값', q: '관찰된 행에서 시간대마다 ap_count가 비어 있지 않은 값만 골라 med(값, \'개\')로 중앙값을 my에 담으세요. .loc에 마스크 두 개를 &로 씁니다.', pick: /AP 수 중앙값$/, answer: py`
my = {}
for g in seen['condition'].unique():
    aps = seen.loc[(seen['condition'] == g) & (seen['ap_count'] != ''), 'ap_count']
    my[f'{g} AP 수 중앙값'] = med(aps, '개')
    print(g, aps.tolist())
print(my)`, reason: "저녁 G-07은 측정하지 못한 행이라 seen에 없습니다. 이 행을 AP 0개로 넣으면 저녁 중앙값이 11에서 10으로 내려갑니다. 화면에 보인 AP 수일 뿐 속도가 아니라는 것도 함께 씁니다." },
  { id: 'ble-ad', title: '조건+거리 그룹의 RSSI 중앙값', q: "group 열(condition + ' ' + distance_m + 'm')을 만들고, 그룹마다 RSSI가 비어 있지 않은 값의 중앙값을 my에 담으세요. groupby 대신 unique와 마스크로 써 봅니다.", pick: /RSSI 중앙값$/, answer: py`
data['group'] = data['condition'] + ' ' + data['distance_m'] + 'm'
my = {}
for g in data['group'].unique():
    values = data.loc[(data['group'] == g) & (data['rssi_dbm'] != ''), 'rssi_dbm']
    my[f'{g} RSSI 중앙값'] = med(values, 'dBm')
print(my)`, reason: "'휴대폰과 연결 중 1m'은 광고가 한 번도 보이지 않아 RSSI가 없고 '값 없음'이 됩니다. 0이나 -120을 넣지 않습니다. 거리 글자 '1'에 'm'을 이어 그룹 이름에 단위를 남깁니다." },
  { id: 'ble-pair', title: '0개인 방식까지 남기는 방식별 개수', q: 'value_counts로 방식별 개수를 센 뒤 METHODS의 네 방식을 모두 돌며 없는 방식은 0으로 넣으세요. 재연결 확인·실패 수도 같은 방법으로 셉니다.', pick: /^페어링 방식|재연결/, answer: py`
counts = seen['pairing_method'].value_counts()
print(counts.to_dict())
my = {}
for v, label in METHODS.items():
    my[f'페어링 방식: {label}'] = str(int(counts.get(v, 0)))
results = seen['reconnect_result'].value_counts()
my['해제 후 재연결 확인'] = str(int(results.get('reconnected', 0)))
my['재연결 실패 확인'] = str(int(results.get('failed', 0)))
print(my)`, reason: 'value_counts는 0개인 값을 아예 보여 주지 않습니다. METHODS를 기준으로 돌면 기록이 없는 방식도 0으로 남아, 무엇을 관찰하지 못했는지 보입니다.' },
  { id: 'interference', title: '단위가 있는 수치만 범위로', q: '조건마다 화면 관찰 비율(ratio)과, energy_unit과 energy_value가 모두 있는 행의 수치 범위(rng, 첫 단위)를 my에 담으세요.', pick: /화면 관찰$|단위 있는 수치$/, answer: py`
my = {}
for g in data['condition'].unique():
    rs = data[data['condition'] == g]
    my[f'{g} 화면 관찰'] = ratio(rs)
    nums = rs[(rs['energy_unit'] != '') & (rs['energy_value'] != '')]
    unit = nums['energy_unit'].iloc[0] if len(nums) else ''
    my[f'{g} 단위 있는 수치'] = rng(nums['energy_value'], unit)
print(my)`, reason: '조건마다 단위가 있는 수치는 하나씩이라 범위가 -82~-82dBm처럼 나옵니다. 단위 없는 숫자는 problem이 미리 빼므로, 남은 수치는 모두 화면에 단위가 함께 보인 값입니다. 측정하지 못한 4m 3회차는 분모에서 빠져 2/2입니다.' },
  { id: 'ir', title: '버튼+조건 그룹의 수신 비율과 명령 종류', q: "group 열(button + ' ' + condition)을 만들고, 그룹마다 ratio와 비어 있지 않은 명령 별칭의 종류 수를 my에 담으세요.", pick: /수신 비율$|명령 별칭 종류$/, answer: py`
data['group'] = data['button'] + ' ' + data['condition']
my = {}
for g in data['group'].unique():
    rs = data[data['group'] == g]
    my[f'{g} 수신 비율'] = ratio(rs)
    my[f'{g} 명령 별칭 종류'] = str(rs['command_alias'][rs['command_alias'] != ''].nunique())
print(my)`, reason: "'손으로 가림 1m'은 3번 중 1번이 배터리 문제로 측정하지 못한 행이라 분모가 2(0/2)입니다. 같은 버튼은 늘 같은 별칭(C-A)이라 종류가 1입니다. 종류가 2 이상이면 별칭을 잘못 적었는지 봅니다." },
  { id: 'subghz', title: '설명서 근거와 코드 방식', q: 'CODES의 네 방식마다 행 수를, 그리고 code_basis가 manual인 행 수를 my에 담으세요. crosstab으로 방식 × 근거도 출력해 G-06이 왜 unchecked인지 설명합니다.', pick: /^코드 방식|설명서 명시/, answer: py`
print(pd.crosstab(data['code_method'], data['code_basis']))
my = {}
for v, label in CODES.items():
    my[f'코드 방식: {label}'] = str(int((data['code_method'] == v).sum()))
my['설명서 명시 항목으로 판단'] = str(int((data['code_basis'] == 'manual').sum()))
print(my)`, reason: "G-06은 수신 표시 화면만 보고(screen) 방식을 정하지 않았습니다. problem은 fixed·rolling을 manual 근거가 있을 때만 허용하므로, 화면만 보고 'fixed'라 적었다면 그 행은 검사에서 빠집니다." },
  { id: 'gps', title: '위치별 fix·대기·위성·타임아웃', q: "실내·창가·야외 순서로 돌며 fix 성공/관찰, fix된 행의 대기 시간 중앙값(초), 위성 수 범위(개), 타임아웃 수를 my에 담으세요. 비어 있는 칸은 값에 넣지 않습니다.", pick: /fix 성공$|대기 중앙값$|위성 수 범위$|타임아웃$/, answer: py`
my = {}
for place in ('실내', '창가', '야외'):
    rs = data[data['condition'] == place]
    if rs.empty:
        continue
    fixed = rs[rs['fix'] == 'fixed']
    observed = int((rs['observation_status'] == 'observed').sum())
    my[f'{place} fix 성공'] = f'{len(fixed)}/{observed}'
    my[f'{place} fix까지 대기 중앙값'] = med(fixed.loc[fixed['wait_seconds'] != '', 'wait_seconds'], '초')
    my[f'{place} 위성 수 범위'] = rng(rs.loc[rs['satellites'] != '', 'satellites'], '개')
    my[f'{place} 타임아웃'] = str(int((rs['timed_out'] == 'yes').sum()))
print(my)`, reason: '분모는 관찰한 행입니다. 야외 G-10은 비로 측정하지 못해 3/3입니다. 대기 시간 중앙값은 fix된 행만 쓰므로 300초 타임아웃은 들어가지 않습니다. 창가는 95초와 120초의 중앙값 107.5초입니다.' },
  { id: 'firmware', title: '판단 규칙을 직접 쓰고 원문과 비교', q: "원문 decision을 보지 않고 my_decision(r)을 쓰세요. 관찰하지 못했으면 '판정 보류', 두 해시가 있고 대소문자를 무시해 다르면 '설치 중단: 해시 불일치', 두 해시가 있고 서명 valid·복구 ready면 '설치 검토 가능', 나머지는 '설치 보류: 근거 부족'. 판단별 개수를 my에 담습니다.", pick: /^판단:/, answer: py`
def my_decision(r):
    if r['observation_status'] != 'observed':
        return '판정 보류'
    e, a = r['expected_sha256'].lower(), r['actual_sha256'].lower()
    if e and a and e != a:
        return '설치 중단: 해시 불일치'
    if e and a and r['signature'] == 'valid' and r['recovery'] == 'ready':
        return '설치 검토 가능'
    return '설치 보류: 근거 부족'

data['mine'] = data.apply(my_decision, axis=1)
print('원문 decision과 같다:', (data['mine'] == data.apply(decision, axis=1)).all())
my = {}
for c in ['설치 검토 가능', '설치 보류: 근거 부족', '설치 중단: 해시 불일치', '판정 보류']:
    n = int((data['mine'] == c).sum())
    if n:
        my[f'판단: {c}'] = str(n)
print(data[['alias', 'mine']].to_string(index=False))
print(my)`, reason: "해시 불일치 검사를 서명 검사보다 먼저 둬야 서명이 valid여도 다른 파일을 막습니다. 기대 해시가 없는 File-D는 '근거 부족'입니다. 해시가 없다고 불일치로 보지 않고, 있다고 안전하다고 보지도 않습니다." },
];

export interface BuiltTask extends MissionTask { n: string; title: string; mission: string; href: string; setupLines: number; setup: string; check: string; expect: Record<string, string>; unique: Region }
const pyDict = (o: Record<string, string>) => `{\n${Object.entries(o).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}\n}`;
export const CHECK_LOOP = "for k, v in MISSION.items():\n    assert my.get(k) == v, f'{k}: 내 값 {my.get(k)!r}, 미션 {v!r}'";
export const BUILT_TASKS: BuiltTask[] = TASKS.map((t) => {
  const m = MISSIONS.find((x) => x.id === t.id)!;
  const map = MAPS.find((x) => x.id === t.id)!;
  const expect = Object.fromEntries(Object.entries(missionJson(t.id)).filter(([k]) => t.pick.test(k)));
  if (!Object.keys(expect).length) throw new Error(`${t.id}: 확인할 값이 없습니다 ${t.pick}`);
  const setupLines = map.unique.start - 1;
  return {
    ...t, n: m.n, mission: m.title, href: `${m.href}#ch-9`, unique: map.unique, setupLines, expect,
    setup: m.code.split('\n').slice(0, setupLines).join('\n'),
    check: `MISSION = ${pyDict(expect)}  # ${m.n} 미션 9장 검증용 JSON의 값\n${CHECK_LOOP}`,
  };
});

/* ── 통합 과제: NFC 원문을 영역별로 이어 붙이면 원문과 같아야 한다 ─────────────────────────── */
const nfc = MAPS.find((m) => m.id === 'nfc')!;
const nfcLines = MISSIONS.find((m) => m.id === 'nfc')!.code.split('\n');
export const INTEGRATION = nfc.regions.map((r) => ({ ...r, text: nfcLines.slice(r.start - 1, r.end).join('\n') }));
export const INTEGRATED = INTEGRATION.map((r) => `# ── ${r.start}~${r.end}줄 ${r.label} · 배우는 곳: ${r.learn.map((l) => l.label).join(', ')}\n${r.text}`).join('\n');
if (INTEGRATION.map((r) => r.text).join('\n') + '\n' !== MISSIONS.find((m) => m.id === 'nfc')!.code) throw new Error('NFC 영역을 이어 붙인 코드가 원문과 다릅니다');
/** 통합 과제에서 6차시 7·8단계 코드로 바꿔 넣는 NFC 원문 줄(조건별·거리별 계산) */
export const NFC_CALC = (() => {
  const start = nfcLines.findIndex((l) => l.startsWith("data['ok'] = ")) + 1;
  const end = nfcLines.findIndex((l) => l.includes("summary[f'거리 {fmt(d)}cm 인식률']")) + 1;
  if (start < 1 || end < start) throw new Error('NFC 원문에서 계산 줄을 찾지 못했습니다');
  return { start, end, swap: (mine: string) => [...nfcLines.slice(0, start - 1), mine, ...nfcLines.slice(end)].join('\n') };
})();

/* ── 전이 과제: BLE 광고 관찰률을 예제 없이 설계 ───────────────────────────────────────── */
const ble = MISSIONS.find((m) => m.id === 'ble-ad')!.code.split('\n');
const s0 = ble.findIndex((l) => l.startsWith('SAMPLE_CSV = """'));
const s1 = ble.findIndex((l, i) => i > s0 && l === '"""');
const bleExpect = Object.fromEntries(Object.entries(missionJson('ble-ad')).filter(([k]) => /^(기록 행|관찰됨|관찰되지 않음|측정하지 못함)$|광고 관찰 비율$/.test(k)));
export const TRANSFER = {
  setup: `import io\nimport pandas as pd\n\n${ble.slice(s0, s1 + 1).join('\n')}`,
  plan: [
    ['입력 열', '어느 열이 조건, 거리, 상태, RSSI인가?'],
    ['거를 행', 'record_type, workbook_id, data_type 가운데 무엇으로 거르나?'],
    ['검사 규칙', '상태 값이 세 가지가 아닌 행(BAD-1)을 어떻게 빼나? 다른 규칙은?'],
    ['그룹 키', '조건만으로 묶으면 무엇이 섞이나?'],
    ['분모', 'not-observed와 unchecked 가운데 무엇을 분모에서 빼나?'],
    ['출력 이름표', '"기록 행", "관찰됨", "같은 방 1m 광고 관찰 비율"처럼 미션과 같은 이름'],
    ['한계', '이 비율로 말할 수 없는 것은?'],
  ] as [string, string][],
  answer: py`
t = pd.read_csv(io.StringIO(SAMPLE_CSV), dtype=str, keep_default_na=False)
t = t[(t['record_type'] == 'observation') & (t['workbook_id'] == 'ble-ad') & (t['data_type'] == 'demo')].copy()
bad = ~t['observation_status'].isin(['observed', 'not-observed', 'unchecked'])
print('뺀 행:', t.loc[bad, 'observation_id'].tolist())
t = t[~bad].copy()

my = {'기록 행': str(len(t))}
for s, name in [('observed', '관찰됨'), ('not-observed', '관찰되지 않음'), ('unchecked', '측정하지 못함')]:
    my[name] = str(int((t['observation_status'] == s).sum()))

t['group'] = t['condition'] + ' ' + t['distance_m'] + 'm'
for g, rs in t.groupby('group', sort=False):
    seen = int((rs['observation_status'] == 'observed').sum())
    tried = int((rs['observation_status'] != 'unchecked').sum())
    my[f'{g} 광고 관찰 비율'] = f'{seen}/{tried}' if tried else '계산 불가'
print(my)`,
  check: `MISSION = ${pyDict(bleExpect)}  # 06 BLE 광고 미션 9장 검증용 JSON의 값\n${CHECK_LOOP}`,
  note: '이 정답은 상태 값만 검사합니다. 원문 problem은 거리 숫자, 연결 상태 값, RSSI가 관찰 행에만 -120~0 정수로 있는지도 검사합니다. 골든 데이터에서는 결과가 같지만, 내 기록에 오타가 있으면 원문만 걸러 냅니다. 내 설계에 넣은 검사와 원문 검사를 비교해 적으세요.',
};

/* ── 졸업 체크 ──────────────────────────────────────────────────────────────────── */
export const GRADUATION: [string, string, string][] = [
  ['결과 예측', 'BLE 골든 데이터의 벽 너머 5m에 not-observed 행 하나를 더 기록하면 그 그룹의 광고 관찰 비율은?', '1/3이 1/4가 됩니다. not-observed는 보러 갔지만 못 본 시도라 분모에 들어갑니다. unchecked를 더했다면 1/3 그대로입니다.'],
  ['잘못된 입력', 'Wi-Fi 기록에 RSSI 7(양수)이 적힌 observed 행이 있으면 어떻게 처리되나?', "problem이 'RSSI는 -120~0 정수입니다…'를 돌려줘 '제외한 행'으로 출력되고 계산에서 빠집니다. 골든 데이터의 BAD-1이 그 예입니다. 실패나 0으로 세지 않습니다."],
  ['데모 제외', "SOURCE = 'upload'로 데모 기록만 든 CSV를 올리면?", "MODE가 real이라 0행이 남고 '분석할 행이 없습니다'로 멈춥니다. 데모는 연습용이라 실제 결론에 섞지 않습니다. 6장에서 실제 기록을 입력했는지 확인합니다."],
  ['0과 결측', 'NFC success의 빈 칸과 0, GPS 대기 시간의 빈 칸과 0은 각각 무엇이 다른가?', 'NFC 0은 시도했지만 못 읽음(분모에 들어감), 빈 칸은 기록 못 함(검사에서 빠짐)입니다. GPS 요약은 빈 대기 시간을 빼고 중앙값을 내지만, 그래프 줄은 빈 칸을 0으로 바꾸므로 막대가 요약과 다를 수 있습니다. 결론은 요약 값으로 씁니다.'],
];

/* ── 함수 사전: 13개 미션과 노트북에서 실제로 부르는 이름 전부 ──────────────────────────── */
const KEYWORDS = ['lambda', 'try', 'except', 'raise', 'with', 'for', 'if', 'elif', 'else', 'def', 'return', 'in', 'not', 'and', 'or', 'import', 'from', 'continue'];
/** 코드에서 부르는 함수·메서드·키워드·속성 이름. 글자열과 주석은 빼고 f-글자열의 { } 안은 남긴다. */
export function names(src: string): Set<string> {
  const s = src
    .replace(/"""[\s\S]*?"""/g, "''")
    .replace(/\bf'([^'\n]*)'|\bf"([^"\n]*)"/g, (_, a, b) => ` ${((a ?? b).match(/\{[^}]*\}/g) ?? []).join(' ')} `)
    .replace(/'[^'\n]*'|"[^"\n]*"/g, "''")
    .replace(/#.*$/gm, '');
  const out = new Set<string>();
  for (const m of s.matchAll(/(\.?)\b([A-Za-z_]\w*)\s*\(/g)) if (m[1] || !KEYWORDS.includes(m[2])) out.add(m[1] + m[2]);
  for (const k of KEYWORDS) if (new RegExp(`\\b${k}\\b`).test(s)) out.add(`kw:${k}`);
  for (const m of s.matchAll(/\.(loc|at|iloc|index|columns|str|values)\b(?!\s*\()/g)) out.add(`attr:${m[1]}`);
  return out;
}

type Entry = [name: string, learn: string | null, note: string];
const NB = '노트북 전용 · 읽기';
const FUNC: Entry[] = [
  // 값·기본 함수
  ['print', 'basics#values', '값을 출력합니다. 쉼표로 여러 값을 빈칸 하나씩 띄워 씁니다.'],
  ['str', 'basics#values', '값을 글자로 바꿉니다.'], ['int', 'basics#values', '정수로 바꿉니다. 실수는 소수점 아래를 버립니다.'], ['float', 'basics#values', '실수로 바꿉니다. 못 바꾸면 ValueError.'],
  ['bool', 'functions#regex', '참·거짓으로 바꿉니다. re.fullmatch 결과(맞으면 객체, 아니면 None)를 True/False로.'],
  ['len', 'basics#lists', '개수(리스트 길이, 표의 행 수).'], ['range', 'basics#loops', 'range(n)은 0부터 n-1까지.'], ['zip', 'basics#loops', '두 리스트를 짝지어 돌립니다. 짧은 쪽에 맞춰 자릅니다.'],
  ['list', 'basics#lists', 'list(…)는 값 묶음을 리스트로 바꿉니다. list(METHODS.values())는 딕셔너리 값만 리스트로.'],
  ['sorted', 'functions#compact', '정렬한 새 리스트. key=함수로 순서 규칙을 줍니다.'], ['next', 'functions#compact', '조건에 맞는 첫 값 하나. 없으면 StopIteration.'],
  ['max', 'functions#def', '가장 큰 값.'], ['min', 'functions#def', '가장 작은 값.'], ['open', 'functions#files', "파일 열기. with open(경로, encoding='utf-8-sig') as f:"],
  ['enumerate', 'project#records', '(번호, 값) 짝으로 돌립니다. start=1이면 1부터. 노트북은 그림 칸 위치를 셀 때 씁니다.'],
  ['set', null, `${NB}: set(목록)은 중복 없는 모음입니다. set(COLUMNS) - set(df.columns)는 없는 열이며, 미션의 [c for c in NEED if c not in table.columns]와 같습니다.`],
  ['tuple', null, `${NB}: tuple(…)은 바꿀 수 없는 리스트(짝)입니다. 노트북은 행의 네 칸을 짝으로 묶어 설정 목록에서 위치를 찾습니다.`],
  ['Path', null, `${NB}: pathlib.Path(이름)은 파일 경로 객체입니다. 글자 'nfc-experiment.csv'를 쓴 것과 같이 읽으면 됩니다.`],
  ['display', null, `${NB}: Colab에서 표를 보기 좋게 출력합니다. Colab 밖에서는 print로 대신합니다(노트북 맨 위 try 참고).`],
  ['ValueError', 'functions#errors', '값이 잘못됐을 때의 오류. raise ValueError(…)로 일부러 멈추고, except ValueError:로 잡습니다.'],
  ['SystemExit', 'functions#errors', "raise SystemExit('…')는 '분석할 행이 없다'처럼 안내하고 멈춥니다."],
  // 미션 안에서 정의한 함수
  ['read_text', 'functions#files', 'SOURCE에 따라 코드 안 글자, 올린 파일, 같은 폴더 파일을 글자로 돌려줍니다.'],
  ['read_pair', 'functions#files', '13 CSV: 원본과 가명본 두 파일을 글자로 돌려줍니다.'],
  ['unguard', 'functions#regex', '저장할 때 수식 기호 앞에 붙인 작은따옴표를 뗍니다.'],
  ['fmt', 'functions#def', '3.0은 "3", 2.5는 "2.5"로 씁니다.'], ['med', 'functions#def', '값들의 중앙값 + 단위, 없으면 "값 없음".'], ['rng', 'functions#def', '"최솟값~최댓값단위", 없으면 "값 없음".'],
  ['ratio', 'group#denominator', '관찰됨 / 측정하지 못함을 뺀 시도. 분모가 0이면 "계산 불가".'],
  ['bar', 'group#plot', '현장 기록형 미션의 막대 함수. G 코드와 뜻을 출력하고 그립니다.'],
  ['pct', 'basics#fstrings', '0.5를 늘 올리는 반올림 퍼센트.'], ['is_int', 'functions#regex', '정수 모양이고 범위 안인가.'],
  ['problem', 'functions#checker', '행 하나의 처음 걸린 문제 이유, 없으면 빈 글자.'],
  ['category', 'mission-code#wpa-category', '04 WPA-PMF: 설정 표시를 보호 범위 범주로.'], ['decision', 'missions#m-firmware', '12 펌웨어: 해시·서명·복구 준비로 설치 판단.'],
  ['summarize', 'group#reshape', `노트북: groupby(columns)['success'].agg(시도='count', 성공='sum')에 실패·인식률 열을 더한 표를 돌려줍니다.`],
  ['wilson', null, `${NB}: 작은 표본에서 비율이 얼마나 불확실한지 보는 Wilson 참고 구간(하한, 상한)을 계산합니다. 공식은 읽기만 하고, 결과는 "범위가 넓으면 시도가 적다"로 해석합니다. 보장이나 검정이 아닙니다.`],
  ['save_plot', null, `${NB}: 그림을 tight_layout 뒤 PNG로 저장(savefig)하고 파일 이름을 OUTPUTS에 모읍니다.`],
  ['compare_category', null, `${NB}: 방향·내용물을 같은 조건 안에서 바꿔 기록했을 때만 비교 막대를 그립니다. 한 종류뿐이면 건너뜁니다.`],
  // 글자·파일
  ['.endswith', 'functions#regex', '글자가 …로 끝나는가.'], ['.startswith', 'functions#regex', '글자가 …로 시작하는가.'], ['.strip', 'functions#regex', '앞뒤 빈칸 지우기(.str.strip()은 열 전체).'],
  ['.lower', 'functions#regex', '소문자로. 16진수 해시를 대소문자 무시하고 비교합니다.'], ['.lstrip', 'functions#files', "왼쪽 글자 지우기. 미션 원문의 lstrip('')은 따옴표 안에 눈에 보이지 않는 BOM 글자가 들어 있는 것으로, lstrip('\\ufeff')와 같습니다. 엑셀 등이 파일 맨 앞에 붙이는 표시를 뗍니다."],
  ['.decode', 'functions#files', "바이트를 글자로. decode('utf-8-sig')"], ['.read', 'functions#files', '파일 전체를 글자로 읽습니다.'], ['.write', 'functions#files', '파일(또는 zip)에 씁니다.'],
  ['.join', 'project#csv', "','.join(글자 리스트)로 잇습니다. CSV 미션은 열 이름을 ', '로 잇습니다."],
  ['.match', 'functions#regex', 're.match(패턴, v): 글자 앞부분이 패턴과 맞는가.'], ['.fullmatch', 'functions#regex', 're.fullmatch(패턴, v): 글자 전체가 패턴과 맞는가.'],
  ['.StringIO', 'functions#files', '글자를 파일처럼 읽게 합니다.'], ['.dumps', 'functions#files', '딕셔너리를 JSON 글자로.'],
  ['.upload', 'python-colab#source', 'Colab 파일 고르기 창. {이름: 바이트}를 돌려줍니다.'], ['.download', 'functions#files', 'Colab에서 내 컴퓨터로 내려받기.'],
  ['.ZipFile', 'functions#files', "노트북: zipfile.ZipFile(이름, 'w')로 압축 파일을 만들고 archive.write(파일)로 넣습니다."],
  ['.is_integer', 'basics#fstrings', '실수가 정수 값인가(3.0이면 True).'], ['.get', 'basics#lists', 'd.get(이름표, 기본값)'], ['.items', 'basics#loops', '딕셔너리의 (이름표, 값) 짝.'],
  ['.values', 'basics#loops', '딕셔너리의 값만. list(METHODS.values())는 네 방식의 화면 이름 리스트.'],
  ['.append', 'basics#lists', '리스트 끝에 더하기.'],
  ['.index', 'group#plot', "리스트.index(값)은 그 값이 몇 번째인지. 노트북은 설정이 목록의 몇 번째 줄인지 찾을 때 씁니다."],
  ['.floor', 'basics#fstrings', 'math.floor(x)는 x 이하의 가장 큰 정수. floor(x + 0.5)는 0.5를 늘 올리는 반올림입니다.'],
  ['.sqrt', null,`${NB}: np.sqrt(x)는 제곱근입니다(Wilson 공식 안).`],
  // pandas
  ['.read_csv', 'table#frame', "CSV 글자를 표로. dtype=str, keep_default_na=False"], ['.Series', 'table#frame', '열 하나 모양의 값 묶음. pd.Series(dtype=str)는 빈 이유 열.'],
  ['.DataFrame', 'group#count', "pd.DataFrame({'열': [값들]})로 표를 직접 만듭니다(13 CSV의 pairs)."],
  ['.copy', 'table#mask', '거른 표를 떼어 내 새 열을 더해도 원본이 바뀌지 않게.'], ['.apply', 'table#apply', 'apply(함수, axis=1)은 행마다, table.apply(lambda col: …)는 열마다.'],
  ['.map', 'table#apply', '칸마다 함수 적용.'], ['.astype', 'table#convert', '열 전체를 int·float·str로.'], ['.replace', 'table#convert', "replace('', '0'): 빈 칸을 '0'으로(GPS 그래프 줄). 결측을 실패로 바꾸지 않게 주의."],
  ['.to_numeric', 'table#convert', '노트북: 열을 숫자로. 못 바꾸면 멈춥니다.'], ['.isin', 'table#mask', '목록 중 하나인가.'],
  ['.dropna', 'python-colab#csv', 'NaN이 있는 행 빼기(1차시 셀 4, 노트북의 values 고르기).'], ['.head', 'python-colab#csv', '앞 몇 행.'],
  ['.unique', 'group#count', '서로 다른 값 목록.'], ['.nunique', 'group#count', '서로 다른 값의 개수.'], ['.median', 'group#count', '중앙값.'], ['.sum', 'group#count', '합. 마스크의 합은 참인 행 수.'],
  ['.max', 'group#count', '가장 큰 값. 13 CSV는 nunique().max() <= 1로 일대일을 봅니다.'],
  ['.any', 'group#count', "하나라도 참인가. 05 채널은 빈 칸이 아닌 AP 수가 하나라도 있을 때만 중앙값을 그립니다."],
  ['.all', 'table#convert', '모두 참인가. 노트북은 success가 모두 0 또는 1인지 봅니다.'],
  ['.groupby', 'group#groupby', '같은 값끼리 묶기. for g, rs in … 또는 [열].agg(…).'], ['.agg', 'group#reshape', "그룹마다 여러 계산: agg(시도='count', 성공='sum')."],
  ['.reset_index', 'group#reshape', '그룹 이름표를 보통 열로 내립니다.'], ['.crosstab', 'group#reshape', '두 범주 조합의 행 수 표.'],
  ['.unstack', 'group#reshape', '두 단 이름표의 한 단을 칸으로 펼칩니다(조건 × 거리 표).'], ['.reindex', 'group#reshape', '행 순서를 고정합니다. 없는 행은 NaN(측정 안 함).'],
  ['.notna', 'group#reshape', "노트북: NaN이 아닌가. 히트맵에서 측정한 칸에만 글자를 씁니다(pd.notna(rate))."],
  ['.round', 'basics#values', '노트북: 표 전체를 소수 셋째 자리로 반올림해 보여 줍니다(display(by_condition.round(3))).'],
  ['.to_string', 'missions#m-firmware', '12 펌웨어: 표를 글자로. index=False면 행 이름표 없이.'],
  ['.get_level_values', null, `${NB}: 두 단 이름표 가운데 한 단의 값 목록. by_cell.index.get_level_values('condition')은 [c for c, d in by_cell.index]와 같습니다.`],
  ['.xs', null, `${NB}: 두 단 표에서 한 조건의 부분만. by_cell.xs(condition, level='condition')은 by_cell.loc[condition]과 같습니다.`],
  ['.sort_index', null, `${NB}: 이름표 순서로 정렬(거리 1, 3, 5 순).`], ['.sort_values', null, `${NB}: 값 순서로 정렬. ascending=False면 큰 것부터.`],
  ['.size', null, `${NB}: 그룹마다 행 수. groupby(cols).size()는 groupby(cols)['trial'].count()와 같습니다(빈 값이 없을 때).`],
  ['.set_index', null, `${NB}: 열을 행 이름표로 올립니다(reset_index의 반대). .loc[설정들]로 고르기 위해서입니다.`],
  ['.iterrows', null, `${NB}: 행을 (이름표, 행) 짝으로 하나씩. for i in df.index: row = df.loc[i]와 같습니다.`],
  ['.to_numpy', null, `${NB}: 표를 숫자 배열로 바꿔 imshow에 넘깁니다.`], ['.masked_invalid', null, `${NB}: np.ma.masked_invalid는 NaN 칸을 가려 그리지 않습니다. 측정하지 않은 조합을 0%로 칠하지 않으려는 것입니다.`],
  // matplotlib
  ['.figure', 'group#plot', '새 그림. figsize=(가로, 세로) 인치.'], ['.bar', 'group#plot', '막대. bottom=으로 쌓기.'], ['.title', 'group#plot', '그림 제목.'], ['.ylabel', 'group#plot', '세로축 이름과 단위.'],
  ['.legend', 'group#plot', '색의 뜻(범례).'], ['.tight_layout', 'group#plot', '글자가 잘리지 않게 여백 정리.'], ['.show', 'group#plot', 'Colab에 그림 표시.'],
  ['.subplots', null, `${NB}: fig, ax = plt.subplots()는 그림(fig)과 축(ax)을 함께 만듭니다. 이후 ax.bar, ax.set_ylabel처럼 축에 그립니다.`],
  ['.set_title', 'group#plot', '노트북: ax.set_title(…) = plt.title(…).'], ['.set_xlabel', 'group#plot', '노트북: ax.set_xlabel(…) = plt.xlabel(…).'], ['.set_ylabel', 'group#plot', '노트북: ax.set_ylabel(…) = plt.ylabel(…).'],
  ['.set_ylim', 'group#plot', '노트북: ax.set_ylim(0, 115) = plt.ylim(…). 세로축 범위.'], ['.set_xticks', null, `${NB}: 가로축 눈금 위치와 이름(거리 1cm, 3cm…).`], ['.set_yticks', null, `${NB}: 세로축 눈금 위치와 이름(조건 이름).`],
  ['.gca', null, `${NB}: plt.gca()는 지금 그림의 축(ax)을 가져옵니다. pandas .plot이 그린 축에 이름을 붙일 때.`],
  ['.plot', null, `${NB}: 표.plot(kind='bar', stacked=True)는 표의 열마다 막대를 그립니다. 열마다 plt.bar(…, bottom=…)을 부른 것과 같습니다.`],
  ['.errorbar', null, `${NB}: 막대·점 위아래로 범위 선(Wilson 참고 구간)을 긋습니다.`], ['.text', null, `${NB}: ax.text(x, y, 글자)는 그림 위 좌표에 글자(성공/시도)를 씁니다.`],
  ['.get_x', null, `${NB}: 막대의 왼쪽 x 위치.`], ['.get_width', null, `${NB}: 막대의 너비.`], ['.get_height', null, `${NB}: 막대의 높이. 셋으로 막대 가운데 위에 글자를 놓습니다.`],
  ['.imshow', null, `${NB}: 표 값을 색 칸(히트맵)으로 그립니다.`], ['.colorbar', null, `${NB}: 색이 몇 %인지 보여 주는 색 막대.`],
  ['.scatter', null, `${NB}: 점 그래프. 회차마다 성공·실패를 점으로 찍습니다.`], ['.invert_yaxis', null, `${NB}: 세로축 위아래를 뒤집어 첫 설정을 위에 둡니다.`],
  ['.savefig', null, `${NB}: 그림을 PNG 파일로 저장합니다.`],
  // 키워드와 속성
  ['kw:if', 'basics#conditions', '조건이 참일 때만 실행.'], ['kw:elif', 'basics#conditions', '앞 조건이 거짓일 때 다음 조건.'], ['kw:else', 'basics#conditions', '모든 조건이 거짓일 때. A if 조건 else B 한 줄 조건식에도.'],
  ['kw:and', 'basics#conditions', '둘 다 참.'], ['kw:or', 'basics#conditions', '하나라도 참.'], ['kw:not', 'basics#conditions', '반대. not in은 목록에 없음.'], ['kw:in', 'basics#conditions', '목록·글자 안에 있음. for … in에도.'],
  ['kw:for', 'basics#loops', '값마다 반복.'], ['kw:continue', 'group#denominator', '이번 반복의 나머지를 건너뛰고 다음 값으로(11 GPS의 빈 위치).'],
  ['kw:def', 'functions#def', '함수 정의.'], ['kw:return', 'functions#def', '값을 돌려주고 함수를 끝냅니다.'], ['kw:lambda', 'functions#compact', '이름 없는 한 줄 함수.'],
  ['kw:try', 'functions#errors', '오류가 날 수 있는 줄 감싸기.'], ['kw:except', 'functions#errors', '그 오류일 때 할 일.'], ['kw:raise', 'functions#errors', '일부러 오류를 내고 멈춤.'],
  ['kw:with', 'functions#files', '파일을 열고 블록이 끝나면 닫기.'], ['kw:import', 'python-colab#csv', '도구 묶음 불러오기. import pandas as pd'], ['kw:from', 'python-colab#source', 'from google.colab import files처럼 묶음의 일부만.'],
  ['attr:columns', 'table#frame', '표의 열 이름 목록.'], ['attr:index', 'table#loc', '행 이름표. 거른 뒤에도 원래 번호.'], ['attr:loc', 'table#loc', '.loc[행 조건, 열]'], ['attr:at', 'table#loc', '.at[행 이름표, 열]은 칸 하나.'],
  ['attr:iloc', 'table#loc', '.iloc[0]은 위치로 첫 번째.'], ['attr:str', 'table#apply', '열 전체에 글자 메서드: .str.strip(), .str.replace(…).'],
];

export interface DictRow { name: string; label: string; learn: { href: string; label: string } | null; note: string; used: string[] }
const ALL = [...MISSIONS.map((m) => ({ n: m.n, code: m.code })), { n: '노트북', code: NOTEBOOK }];
const used = new Map<string, string[]>();
for (const m of ALL) for (const t of names(m.code)) used.set(t, [...(used.get(t) ?? []), m.n]);
const dict = new Map<string, Entry>();
for (const e of FUNC) {
  if (dict.has(e[0])) throw new Error(`함수 사전 항목이 겹칩니다: ${e[0]}`);
  dict.set(e[0], e);
}
const missing = [...used.keys()].filter((t) => !dict.has(t));
if (missing.length) throw new Error(`함수 사전에 없는 이름: ${missing.join(', ')}`);
const stale = [...dict.keys()].filter((t) => !used.has(t));
if (stale.length) throw new Error(`미션 코드에 없는 함수 사전 항목: ${stale.join(', ')}`);
export const DICT: DictRow[] = [...dict.values()].map(([name, learn, note]) => ({
  name, label: name.startsWith('kw:') ? name.slice(3) : name.startsWith('attr:') ? `.${name.slice(5)}` : name.startsWith('.') ? `${name}()` : `${name}()`,
  learn: learn ? stepHref(learn) : null, note, used: used.get(name)!,
}));
