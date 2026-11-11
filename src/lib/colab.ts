// 워크북별 Colab 코드. 골든 데이터로 만든 CSV를 코드 안에 넣어 'sample'로 바로 실행되고,
// 'upload'나 'file'로 바꾸면 사이트에서 내려받은 실제 CSV를 같은 방식으로 분석한다.
// 출력 마지막 줄의 JSON은 브라우저 요약(summaryRows 등)과 같은 항목이며 scripts/check-workbooks.ts가 대조한다.
import { csvCell, CSV_COLUMNS, CSV_FILENAME, trialsToCsv, type Trial } from './nfc.ts';
import { FIELDS, rowsCsv, type Kind, type Row } from './fieldwork.ts';
import { CHECKLIST_OPTIONS } from './checklist.ts';
import { wifiObservationsToCsv, WIFI_CSV_COLUMNS, type WifiObservation } from './workbook.ts';

const embed = (csv: string) => {
  const text = csv.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  if (text.includes('"""') || text.includes('\\')) throw new Error('예시 CSV에 파이썬 문자열을 깨는 글자가 있습니다.');
  return text;
};

/** 표본에 일부러 넣는 잘못된 행. 코드가 이 행을 빼고 이유를 출력하는지 보여 준다. */
function badLine(kind: Kind, first: Row) {
  const cells = ['1', kind, 'observation', 'BAD-1', 'demo', ...FIELDS[kind].map((k) => k === 'observation_status' ? 'maybe' : first[k]), '', ''];
  return cells.map(csvCell).join(',') + '\n';
}

const HEAD = (file: string) => String.raw`# 0. 자료 고르기
# 'sample' : 이 페이지의 가상 골든 데이터(데모)로 연습합니다. 결과가 페이지의 예상 분석값과 같아야 합니다.
# 'upload' : Colab에서 내가 내려받은 CSV를 올려 실제 기록(data_type=real)만 분석합니다.
# 'file'   : 내 PC의 Jupyter에서 같은 폴더의 CSV를 실제 기록으로 분석합니다.
# 실제 SSID, BSSID, UID, 이름, 집 주소가 들어 있으면 올리기 전에 가명으로 바꿉니다.
SOURCE = 'sample'
FILE_PATH = '${file}'

import io, json, re
import pandas as pd
import matplotlib.pyplot as plt
`;

const LOAD = String.raw`
def read_text():
    if SOURCE == 'sample':
        return SAMPLE_CSV
    if SOURCE == 'upload':
        from google.colab import files
        uploaded = files.upload()
        name = next(n for n in uploaded if n.endswith('.csv'))
        return uploaded[name].decode('utf-8-sig')
    with open(FILE_PATH, encoding='utf-8-sig') as f:
        return f.read()

def unguard(v):
    # 사이트는 =, +, -, @로 시작하는 글 앞에 작은따옴표를 붙여 저장합니다. 분석 전에 되돌립니다.
    return v[1:] if re.match(r"^'+\s*[=+\-@]", v) else v

def fmt(v):
    v = float(v)
    return str(int(v)) if v.is_integer() else f'{v:.1f}'

def med(values, unit=''):
    values = [float(v) for v in values]
    return fmt(pd.Series(values).median()) + unit if values else '값 없음'

def rng(values, unit=''):
    values = [float(v) for v in values]
    return f'{fmt(min(values))}~{fmt(max(values))}{unit}' if values else '값 없음'

def ratio(rs):
    seen = int((rs['observation_status'] == 'observed').sum())
    tried = int((rs['observation_status'] != 'unchecked').sum())
    return f'{seen}/{tried}' if tried else '계산 불가'

def bar(labels, values, title, ylabel):
    # Colab 기본 글꼴에는 한글이 없어 그림에는 G1, G2 같은 짧은 이름을 쓰고, 뜻은 위에 출력합니다.
    codes = [f'G{i + 1}' for i in range(len(labels))]
    for c, l in zip(codes, labels):
        print(f'  그림 {c} = {l}')
    plt.figure(figsize=(7, 3.6))
    plt.bar(codes, values, color='#2f6b4f')
    plt.title(title)
    plt.ylabel(ylabel)
    plt.tight_layout()
    plt.show()

MODE = 'demo' if SOURCE == 'sample' else 'real'
`;

const FIELD_LOAD = (kind: Kind) => String.raw`
table = pd.read_csv(io.StringIO(read_text().lstrip('﻿')), dtype=str, keep_default_na=False)
NEED = ${JSON.stringify(['schema_version', 'workbook_id', 'record_type', 'observation_id', 'data_type', ...FIELDS[kind]])}
lost = [c for c in NEED if c not in table.columns]
if lost:
    raise ValueError(f'이 워크북 CSV가 아닙니다. 없는 열: {lost}')
table = table.apply(lambda col: col.map(unguard))
obs = table[(table['record_type'] == 'observation') & (table['workbook_id'] == '${kind}')]
data = obs[obs['data_type'] == MODE].copy()
print(f'1. 불러오기: {MODE} 관찰 {len(data)}행, 다른 구분 {len(obs) - len(data)}행 제외')

STATES = ('observed', 'not-observed', 'unchecked')
reasons = data.apply(problem, axis=1) if len(data) else pd.Series(dtype=str)
for i in data.index[reasons != '']:
    print('   제외한 행:', data.at[i, 'observation_id'], '-', reasons[i])
data = data[reasons == ''] if len(data) else data
print(f'2. 검사: 분석에 쓰는 행 {len(data)}, 잘못된 행 {int((reasons != "").sum())}')
if data.empty:
    raise SystemExit('분석할 행이 없습니다. SOURCE와 data_type, 입력 기록을 확인하세요.')

summary = {
    '기록 행': str(len(data)),
    '관찰됨': str(int((data['observation_status'] == 'observed').sum())),
    '관찰되지 않음': str(int((data['observation_status'] == 'not-observed').sum())),
    '측정하지 못함': str(int((data['observation_status'] == 'unchecked').sum())),
}
seen = data[data['observation_status'] == 'observed']
`;

const SHOW = String.raw`
print('3. 계산 결과')
for k, v in summary.items():
    print(f'   {k}: {v}')
print('검증용 JSON:', json.dumps(summary, ensure_ascii=False))
`;

const INT = String.raw`
def is_int(v, lo, hi):
    return bool(re.fullmatch(r'-?\d+', v)) and lo <= int(v) <= hi
`;

const KIND: Record<Kind, string> = {
  'ble-ad': String.raw`${INT}
def problem(r):
    if r['observation_status'] not in STATES: return '관찰 상태 값이 다릅니다'
    try:
        float(r['distance_m'])
    except ValueError:
        return '거리가 숫자가 아닙니다'
    if r['connection'] not in ('not-checked', 'not-connected', 'connected'): return '연결 상태 값이 다릅니다'
    if r['rssi_dbm'] and (r['observation_status'] != 'observed' or not is_int(r['rssi_dbm'], -120, 0)):
        return 'RSSI는 광고가 보인 행에만 -120~0 정수로 적습니다'
    return ''
`,
  ir: String.raw`
def problem(r):
    if r['observation_status'] not in STATES: return '관찰 상태 값이 다릅니다'
    if not r['button'].strip(): return '버튼 이름이 없습니다'
    if r['command_alias'] and not re.fullmatch(r'C-[A-Za-z0-9_-]{1,20}', r['command_alias']): return '명령은 C-A 같은 별칭이어야 합니다'
    if r['observation_status'] != 'observed' and (r['protocol'] or r['command_alias']): return '수신하지 못한 행에 프로토콜·명령이 있습니다'
    return ''
`,
  interference: String.raw`
def problem(r):
    if r['observation_status'] not in STATES: return '관찰 상태 값이 다릅니다'
    if r['observation_status'] == 'observed' and not r['display_text'].strip(): return '화면 관찰 문구가 없습니다'
    if r['energy_value']:
        if not r['energy_unit']: return '단위 없는 숫자는 쓰지 않습니다'
        try:
            float(r['energy_value'])
        except ValueError:
            return '에너지 값이 숫자가 아닙니다'
    return ''
`,
  gps: String.raw`${INT}
def problem(r):
    if r['observation_status'] not in STATES: return '관찰 상태 값이 다릅니다'
    if r['condition'] not in ('실내', '창가', '야외'): return '위치는 실내·창가·야외 중 하나입니다'
    if r['fix'] not in ('fixed', 'no-fix', 'unchecked') or r['timed_out'] not in ('yes', 'no'): return 'fix 또는 타임아웃 값이 다릅니다'
    if r['satellites'] and not is_int(r['satellites'], 0, 100): return '위성 수는 0~100 정수입니다'
    if r['wait_seconds'] and not is_int(r['wait_seconds'], 0, 3600): return '대기 시간은 0~3600초 정수입니다'
    if r['timed_out'] == 'yes' and r['fix'] == 'fixed': return '타임아웃과 fix 성공이 함께 적혀 있습니다'
    return ''
`,
  channel: String.raw`${INT}
def problem(r):
    if r['observation_status'] not in STATES: return '관찰 상태 값이 다릅니다'
    if r['ap_count'] and not is_int(r['ap_count'], 0, 10000): return 'AP 수는 0 이상 정수입니다'
    if r['rssi_dbm'] and not is_int(r['rssi_dbm'], -120, 0): return 'RSSI는 -120~0 정수입니다'
    if r['observation_status'] != 'observed' and (r['ap_count'] or r['rssi_dbm']): return '관찰하지 못한 행에 숫자가 있습니다'
    return ''
`,
  'ble-pair': String.raw`
METHODS = ${JSON.stringify(CHECKLIST_OPTIONS.pairing_method)}
def problem(r):
    if r['observation_status'] not in STATES: return '관찰 상태 값이 다릅니다'
    if r['pairing_method'] not in METHODS: return '페어링 방식 값이 다릅니다'
    if r['reconnect_result'] not in ('reconnected', 'disconnected', 'failed', 'unchecked'): return '재연결 결과 값이 다릅니다'
    return ''
`,
  subghz: String.raw`
CODES = ${JSON.stringify(CHECKLIST_OPTIONS.code_method)}
def problem(r):
    if r['observation_status'] not in STATES: return '관찰 상태 값이 다릅니다'
    if r['code_method'] not in CODES: return '코드 방식 값이 다릅니다'
    if r['code_method'] in ('fixed', 'rolling') and r['code_basis'] != 'manual': return '코드 방식은 설명서 근거가 있을 때만 확정합니다'
    return ''
`,
  'ssid-map': String.raw`
def problem(r):
    if r['observation_status'] not in STATES: return '관찰 상태 값이 다릅니다'
    for k in ('ssid_alias', 'bssid_alias'):
        if r[k] and not re.fullmatch(r'[A-Za-z][A-Za-z0-9_-]{0,19}', r[k]): return '식별자는 영문 별칭이어야 합니다(원래 이름·주소 금지)'
    if r['observation_status'] == 'observed' and not (r['ssid_alias'] and r['bssid_alias']): return '관찰 행에 별칭이 비어 있습니다'
    return ''
`,
  'wpa-pmf': String.raw`
def problem(r):
    if r['observation_status'] not in STATES: return '관찰 상태 값이 다릅니다'
    if r['configured'] not in ('wpa2', 'wpa3', 'mixed', 'other', 'unchecked'): return '현재 설정 값이 다릅니다'
    if r['pmf'] not in ('required', 'capable', 'disabled', 'unchecked'): return 'PMF 값이 다릅니다'
    if r['configured'] in ('wpa3', 'mixed') and r['wpa3_support'] == 'no': return 'WPA3 미지원인데 WPA3 설정으로 적혀 있습니다'
    return ''

def category(r):
    # 화면·문서 표시를 읽은 분류입니다. 실제로 어떤 단말이 어떤 방식으로 접속했는지는 알 수 없습니다.
    if r['observation_status'] != 'observed' or r['configured'] == 'unchecked': return '판정 보류'
    if r['configured'] == 'wpa3': return 'WPA3 전용, PMF 필수' if r['pmf'] == 'required' else 'WPA3 표시, PMF 표시 재확인'
    if r['configured'] == 'mixed': return '전환 모드, PMF 선택 이상'
    if r['configured'] == 'wpa2': return 'WPA2, PMF 없음 또는 미확인' if r['pmf'] in ('disabled', 'unchecked') else 'WPA2와 PMF'
    return '기타 설정'
`,
  firmware: String.raw`
def problem(r):
    if r['observation_status'] not in STATES: return '관찰 상태 값이 다릅니다'
    for k in ('expected_sha256', 'actual_sha256'):
        if r[k] and not re.fullmatch(r'[0-9a-fA-F]{64}', r[k]): return 'SHA-256은 64자리 16진수입니다'
    if r['source_url'] and not r['source_url'].startswith('https://'): return '출처는 HTTPS 주소여야 합니다'
    return ''

def decision(r):
    if r['observation_status'] != 'observed': return '판정 보류'
    both = r['expected_sha256'] and r['actual_sha256']
    if both and r['expected_sha256'].lower() != r['actual_sha256'].lower(): return '설치 중단: 해시 불일치'
    if both and r['signature'] == 'valid' and r['recovery'] == 'ready': return '설치 검토 가능'
    return '설치 보류: 근거 부족'
`,
};

const ANALYZE: Record<Kind, string> = {
  'ble-ad': String.raw`
data['group'] = data['condition'] + ' ' + data['distance_m'] + 'm'
labels, rates = [], []
for g, rs in data.groupby('group', sort=False):
    summary[f'{g} 광고 관찰 비율'] = ratio(rs)
    summary[f'{g} RSSI 중앙값'] = med(rs.loc[rs['rssi_dbm'] != '', 'rssi_dbm'], 'dBm')
    tried = (rs['observation_status'] != 'unchecked').sum()
    labels.append(g); rates.append((rs['observation_status'] == 'observed').sum() / tried if tried else 0)
bar(labels, rates, 'Advertising seen / tried', 'ratio')
`,
  ir: String.raw`
data['group'] = data['button'] + ' ' + data['condition']
labels, rates = [], []
for g, rs in data.groupby('group', sort=False):
    summary[f'{g} 수신 비율'] = ratio(rs)
    summary[f'{g} 명령 별칭 종류'] = str(rs.loc[rs['command_alias'] != '', 'command_alias'].nunique())
    tried = (rs['observation_status'] != 'unchecked').sum()
    labels.append(g); rates.append((rs['observation_status'] == 'observed').sum() / tried if tried else 0)
bar(labels, rates, 'IR received / tried', 'ratio')
`,
  interference: String.raw`
labels, counts = [], []
for g, rs in data.groupby('condition', sort=False):
    summary[f'{g} 화면 관찰'] = ratio(rs)
    unit_rows = rs[rs['energy_unit'] != '']
    unit = unit_rows['energy_unit'].iloc[0] if len(unit_rows) else ''
    summary[f'{g} 단위 있는 수치'] = rng(unit_rows.loc[unit_rows['energy_value'] != '', 'energy_value'], unit)
    labels.append(g); counts.append(int((rs['observation_status'] == 'observed').sum()))
bar(labels, counts, 'Observed screen changes', 'rows')
print('   막대·문구는 정성 관찰입니다. 송신자나 의도는 이 표로 알 수 없습니다.')
`,
  gps: String.raw`
labels, waits = [], []
for place in ('실내', '창가', '야외'):
    rs = data[data['condition'] == place]
    if rs.empty: continue
    fixed = rs[rs['fix'] == 'fixed']
    summary[f'{place} fix 성공'] = f"{len(fixed)}/{int((rs['observation_status'] == 'observed').sum())}"
    summary[f'{place} fix까지 대기 중앙값'] = med(fixed.loc[fixed['wait_seconds'] != '', 'wait_seconds'], '초')
    summary[f'{place} 위성 수 범위'] = rng(rs.loc[rs['satellites'] != '', 'satellites'], '개')
    summary[f'{place} 타임아웃'] = str(int((rs['timed_out'] == 'yes').sum()))
    labels.append(place); waits.append(fixed['wait_seconds'].replace('', '0').astype(float).median() if len(fixed) else 0)
bar(labels, waits, 'Median seconds to fix (0 = no fix)', 'seconds')
`,
  channel: String.raw`
labels, aps = [], []
for g, rs in seen.groupby('condition', sort=False):
    summary[f'{g} AP 수 중앙값'] = med(rs.loc[rs['ap_count'] != '', 'ap_count'], '개')
    summary[f'{g} RSSI 중앙값'] = med(rs.loc[rs['rssi_dbm'] != '', 'rssi_dbm'], 'dBm')
    labels.append(g); aps.append(rs.loc[rs['ap_count'] != '', 'ap_count'].astype(float).median() if (rs['ap_count'] != '').any() else 0)
bar(labels, aps, 'Median AP count shown by the tool', 'APs')
print('   AP 수는 화면에 보인 개수입니다. 채널 점유율이나 속도가 아닙니다.')
`,
  'ble-pair': String.raw`
for v, label in METHODS.items():
    summary[f'페어링 방식: {label}'] = str(int((seen['pairing_method'] == v).sum()))
summary['해제 후 재연결 확인'] = str(int((seen['reconnect_result'] == 'reconnected').sum()))
summary['재연결 실패 확인'] = str(int((seen['reconnect_result'] == 'failed').sum()))
print(pd.crosstab(seen['pairing_method'], seen['reconnect_result']))
bar(list(METHODS.values()), [int((seen['pairing_method'] == v).sum()) for v in METHODS], 'Pairing method shown', 'rows')
`,
  subghz: String.raw`
for v, label in CODES.items():
    summary[f'코드 방식: {label}'] = str(int((data['code_method'] == v).sum()))
summary['설명서 명시 항목으로 판단'] = str(int((data['code_basis'] == 'manual').sum()))
print(pd.crosstab(data['code_method'], data['code_basis']))
bar(list(CODES.values()), [int((data['code_method'] == v).sum()) for v in CODES], 'Code method by document', 'rows')
`,
  'ssid-map': String.raw`
labels, counts = [], []
for g, rs in seen.groupby('ssid_alias', sort=False):
    summary[f'{g} 서로 다른 BSSID 별칭 수'] = str(rs['bssid_alias'].nunique())
    summary[f'{g} 자동 연결 켜짐 기록'] = str(int((rs['auto_connect'] == 'enabled').sum()))
    labels.append(g); counts.append(rs['bssid_alias'].nunique())
print(pd.crosstab(seen['ssid_alias'], seen['bssid_alias']))
bar(labels, counts, 'Distinct BSSID aliases per SSID alias', 'BSSIDs')
`,
  'wpa-pmf': String.raw`
data['category'] = data.apply(category, axis=1)
ORDER = ['WPA3 전용, PMF 필수', 'WPA3 표시, PMF 표시 재확인', '전환 모드, PMF 선택 이상', 'WPA2와 PMF', 'WPA2, PMF 없음 또는 미확인', '기타 설정', '판정 보류']
labels, counts = [], []
for c in ORDER:
    n = int((data['category'] == c).sum())
    if n:
        summary[f'보호 범위: {c}'] = str(n)
        labels.append(c); counts.append(n)
print(pd.crosstab(data['configured'], data['pmf']))
bar(labels, counts, 'Protection category from settings and documents', 'rows')
`,
  firmware: String.raw`
data['decision'] = data.apply(decision, axis=1)
labels, counts = [], []
for c in ['설치 검토 가능', '설치 보류: 근거 부족', '설치 중단: 해시 불일치', '판정 보류']:
    n = int((data['decision'] == c).sum())
    if n:
        summary[f'판단: {c}'] = str(n)
        labels.append(c); counts.append(n)
print(data[['alias', 'version', 'signature', 'recovery', 'decision']].to_string(index=False))
bar(labels, counts, 'Install decision', 'files')
`,
};

export function fieldworkColab(kind: Kind, golden: Row[]): string {
  const sample = embed(rowsCsv(kind, golden, { real: {}, demo: {} })) + badLine(kind, golden[0]);
  return `${HEAD(`${kind}-observations.csv`)}\nSAMPLE_CSV = """${sample}"""\n${LOAD}${KIND[kind]}${FIELD_LOAD(kind)}${ANALYZE[kind]}${SHOW}`;
}

export function wifiColab(golden: WifiObservation[]): string {
  const first = golden[0];
  const bad = [1, 'wifi-rssi', 'BAD-1', first.trial, first.room, first.condition, first.distanceM, 'observed', '7', '', first.observedAt, first.ssidAlias, first.bssidAlias, '잘못 적은 양수 RSSI', 'demo'].map(csvCell).join(',') + '\n';
  const sample = embed(wifiObservationsToCsv(golden)) + bad;
  return `${HEAD('wifi-rssi-observations.csv')}\nSAMPLE_CSV = """${sample}"""\n${LOAD}${INT}` + String.raw`
table = pd.read_csv(io.StringIO(read_text().lstrip('﻿')), dtype=str, keep_default_na=False)
NEED = ${JSON.stringify([...WIFI_CSV_COLUMNS])}
lost = [c for c in NEED if c not in table.columns]
if lost:
    raise ValueError(f'Wi-Fi RSSI 관찰 CSV가 아닙니다. 없는 열: {lost}')
table = table.apply(lambda col: col.map(unguard))
obs = table[table['workbook_id'] == 'wifi-rssi']
data = obs[obs['data_type'] == MODE].copy()
print(f'1. 불러오기: {MODE} 관찰 {len(data)}행, 다른 구분 {len(obs) - len(data)}행 제외')

def problem(r):
    s = r['observation_status']
    if s not in ('observed', 'not-observed', 'unchecked'): return '관찰 상태 값이 다릅니다'
    if s == 'observed' and not is_int(r['rssi_dbm'], -120, 0): return 'RSSI는 -120~0 정수입니다(0보다 크면 단위나 부호를 잘못 적은 것)'
    if s != 'observed' and r['rssi_dbm']: return '신호 못 찾음·미측정 행에는 RSSI를 비웁니다'
    return ''

reasons = data.apply(problem, axis=1) if len(data) else pd.Series(dtype=str)
for i in data.index[reasons != '']:
    print('   제외한 행:', data.at[i, 'observation_id'], '-', reasons[i])
data = data[reasons == ''] if len(data) else data
print(f'2. 검사: 분석에 쓰는 행 {len(data)}, 잘못된 행 {int((reasons != "").sum())}')
if data.empty:
    raise SystemExit('분석할 행이 없습니다.')

summary = {}
labels, medians = [], []
for room in sorted(data['room'].unique()):
    rs = data[data['room'] == room]
    values = rs.loc[rs['observation_status'] == 'observed', 'rssi_dbm']
    summary[f'{room} 유효 n'] = str(len(values))
    summary[f'{room} 중앙값'] = med(values, 'dBm')
    summary[f'{room} 범위'] = rng(values, 'dBm')
    summary[f'{room} 신호 못 찾음'] = str(int((rs['observation_status'] == 'not-observed').sum()))
    summary[f'{room} 미측정'] = str(int((rs['observation_status'] == 'unchecked').sum()))
    labels.append(room); medians.append(values.astype(float).median() if len(values) else -120)
bar(labels, [m + 120 for m in medians], 'Median RSSI per room (bar = dBm + 120, higher is stronger)', 'dBm + 120')
${SHOW}`;
}

export function csvColab(original: string, pseudo: string): string {
  return `${HEAD('csv-real-original.csv')}FILE_PATH_PSEUDO = 'csv-real-pseudonymized.csv'\n\nORIGINAL_CSV = """${embed(original)}"""\n\nPSEUDO_CSV = """${embed(pseudo)}"""\n` + String.raw`
def read_pair():
    if SOURCE == 'sample':
        return ORIGINAL_CSV, PSEUDO_CSV
    if SOURCE == 'upload':
        from google.colab import files
        print('원본 사본과 가명본, 두 파일을 함께 선택하세요. 원본은 Colab에 남기지 말고 확인 뒤 지웁니다.')
        up = files.upload()
        names = sorted(up)
        orig = next(n for n in names if 'original' in n)
        pseu = next(n for n in names if 'pseudonym' in n)
        return up[orig].decode('utf-8-sig'), up[pseu].decode('utf-8-sig')
    with open(FILE_PATH, encoding='utf-8-sig') as f, open(FILE_PATH_PSEUDO, encoding='utf-8-sig') as g:
        return f.read(), g.read()

def unguard(v):
    return v[1:] if re.match(r"^'+\s*[=+\-@]", v) else v

o_text, p_text = read_pair()
orig = pd.read_csv(io.StringIO(o_text.lstrip('﻿')), dtype=str, keep_default_na=False).apply(lambda c: c.map(unguard))
pseu = pd.read_csv(io.StringIO(p_text.lstrip('﻿')), dtype=str, keep_default_na=False).apply(lambda c: c.map(unguard))
print(f'1. 불러오기: 원본 {len(orig)}행 {len(orig.columns)}열, 가명본 {len(pseu)}행 {len(pseu.columns)}열')
if len(orig) != len(pseu):
    print('   경고: 행 수가 다릅니다. 오류 행이 빠졌는지 사이트 미리보기에서 확인하세요.')

kept = [c for c in orig.columns if c in pseu.columns]
aliased = [c for c in orig.columns if c not in pseu.columns and c + '_alias' in pseu.columns]
removed = [c for c in orig.columns if c not in kept and c not in aliased]
summary = {'원본 행': str(len(orig)), '가명본 행': str(len(pseu)),
           '유지한 열': ', '.join(kept) or '없음', '가명으로 바꾼 열': ', '.join(aliased) or '없음', '제거한 열': ', '.join(removed) or '없음'}
for c in aliased:
    pairs = pd.DataFrame({'a': orig[c], 'b': pseu[c + '_alias']})
    pairs = pairs[pairs['a'] != '']
    one = pairs.groupby('a')['b'].nunique().max() <= 1 and pairs.groupby('b')['a'].nunique().max() <= 1
    summary[f'{c} 원래 값 종류'] = str(pairs['a'].nunique())
    summary[f'{c} 별칭 종류'] = str(pairs['b'].nunique())
    summary[f'{c} 일대일 대응'] = '예' if one else '아니요'
for c in kept + aliased:
    col = c if c in pseu.columns else c + '_alias'
    summary[f'{c} 빈 값(원본→가명본)'] = f"{int((orig[c] == '').sum())}→{int((pseu[col] == '').sum())}"
leak = [c for c in removed if c in pseu.columns]
print('2. 제거한 열이 가명본에 남았나:', '남음 ' + str(leak) if leak else '없음')
counts = [len(kept), len(aliased), len(removed)]
plt.figure(figsize=(6, 3.2)); plt.bar(['kept', 'alias', 'removed'], counts, color='#2f6b4f'); plt.title('Columns by action'); plt.ylabel('columns'); plt.tight_layout(); plt.show()
${SHOW}`;
}

export function nfcColab(golden: Trial[]): string {
  const bad = [1, '단독', '없음', 1, '평행', '2', 'BAD-1 결과 칸에 2를 잘못 적음', 'demo'].map(csvCell).join(',') + '\n';
  return `${HEAD(CSV_FILENAME)}import math\n\nSAMPLE_CSV = """${embed(trialsToCsv(golden)) + bad}"""\n${LOAD}` + String.raw`
table = pd.read_csv(io.StringIO(read_text().lstrip('﻿')), dtype=str, keep_default_na=False)
NEED = ${JSON.stringify([...CSV_COLUMNS])}
lost = [c for c in NEED if c not in table.columns]
if lost:
    raise ValueError(f'NFC 관찰 CSV(${CSV_FILENAME})가 아닙니다. 탐구 서술 CSV를 올렸는지 확인하세요. 없는 열: {lost}')
table = table.apply(lambda col: col.map(unguard))
table['condition'] = table['condition'].str.strip()
data = table[table['data_type'] == MODE].copy()
print(f'1. 불러오기: {MODE} 관찰 {len(data)}행, 다른 구분 {len(table) - len(data)}행 제외')

def problem(r):
    # success=1은 정한 시간 안에 새 태그를 읽은 관찰, 0은 읽지 못한 관찰입니다.
    # 빈 값이나 다른 값은 미측정 또는 잘못 적은 행이라 0(실패)으로 바꾸지 않고 뺍니다.
    if r['success'] not in ('0', '1'): return 'success는 1(읽힘) 또는 0(안 읽힘)만 씁니다'
    if not r['condition']: return '조건이 비었습니다'
    try:
        d = float(r['distance_cm'])
    except ValueError:
        return '거리가 숫자가 아닙니다'
    if not 0 <= d <= 100: return '거리는 0~100cm입니다'
    return ''

reasons = data.apply(problem, axis=1) if len(data) else pd.Series(dtype=str)
for i in data.index[reasons != '']:
    print('   제외한 행:', data.at[i, 'condition'], data.at[i, 'trial'] + '회차', data.at[i, 'note'], '-', reasons[i])
data = data[reasons == ''] if len(data) else data
print(f'2. 검사: 분석에 쓰는 행 {len(data)}, 잘못된 행 {int((reasons != "").sum())}')
if data.empty:
    raise SystemExit('분석할 행이 없습니다. SOURCE와 data_type, 입력 기록을 확인하세요.')

def pct(s, a):
    # 브라우저와 같은 반올림(0.5는 올림)입니다.
    return f'{math.floor(s / a * 100 + 0.5)}%'

data['ok'] = (data['success'] == '1').astype(int)
data['d'] = data['distance_cm'].astype(float)
summary = {'기록 행': str(len(data)), '성공': str(int(data['ok'].sum())), '실패': str(int((1 - data['ok']).sum()))}
RANK = {'단독': 0, '지갑': 1, '가방': 2}
conds = sorted(data['condition'].unique(), key=lambda c: (RANK.get(c, 3), c))
oks, fails = [], []
for c in conds:
    rs = data[data['condition'] == c]
    s, a = int(rs['ok'].sum()), len(rs)
    summary[f'{c} 성공/시도'] = f'{s}/{a}'
    summary[f'{c} 인식률'] = pct(s, a)
    oks.append(s); fails.append(a - s)
for d in sorted(data['d'].unique()):
    rs = data[data['d'] == d]
    s, a = int(rs['ok'].sum()), len(rs)
    summary[f'거리 {fmt(d)}cm 성공/시도'] = f'{s}/{a}'
    summary[f'거리 {fmt(d)}cm 인식률'] = pct(s, a)

# Colab 기본 글꼴에는 한글이 없어 그림에는 G1, G2 같은 짧은 이름을 쓰고, 뜻은 위에 출력합니다.
codes = [f'G{i + 1}' for i in range(len(conds))]
for code, c in zip(codes, conds):
    print(f'  그림 {code} = {c}')
plt.figure(figsize=(7, 3.6))
plt.bar(codes, oks, color='#2f6b4f', label='read')
plt.bar(codes, fails, bottom=oks, color='#b7b2a7', label='not read')
plt.title('NFC reads per placement (stacked: read + not read = attempts)')
plt.ylabel('attempts')
plt.legend()
plt.tight_layout()
plt.show()
# 이 표는 태그를 읽은 비율만 보여 줍니다. 결제 승인, 카드 복제, 공격 성공률은 계산하지 않습니다.
${SHOW}`;
}
