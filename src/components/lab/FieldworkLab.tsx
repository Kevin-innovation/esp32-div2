import { useEffect, useRef, useState } from 'react';
import { CHECKLIST_LABELS, CHECKLIST_OPTIONS, CHECKLIST_TITLES, checklistDemo, checklistDraft, fieldMaxLength, isChecklist } from '../../lib/checklist';
import { ChecklistSummary, FileDigest } from './ChecklistLab';
import { downloadFile, emptyNotes, FIELDS, makeRow, NOTE_LABELS, readRowsCsv, rowsCsv, validateRow, type Kind, type Mode, type Notes, type Row } from '../../lib/fieldwork';

const STATUS: Record<string, string> = { observed: '관찰됨', 'not-observed': '관찰되지 않음', unchecked: '측정하지 못함' };
const LABELS: Record<string, string> = { ...CHECKLIST_LABELS, alias: '내 기기 별칭', condition: '관찰 조건·위치 별칭', distance_m: '거리(m)', observation_status: '관찰 상태', rssi_dbm: '표시된 RSSI(dBm, 없으면 빈 값)', connection: '별도로 확인한 연결 상태', button: '내 리모컨 버튼', protocol: '표시된 프로토콜(없으면 빈 값)', command_alias: '명령 별칭(예: C-A)', note: '관찰 메모·결측 이유', observed_at: '관찰 날짜·시각', channel: '화면에 표시된 채널·주파수(없으면 빈 값)', display_text: '화면의 실제 막대·문구 관찰', energy_value: '화면 에너지 숫자(값·단위가 함께 표시될 때만)', energy_unit: '화면 에너지 단위(없으면 빈 값)', satellites: '표시된 위성 수(없으면 빈 값)', fix: '화면의 위치 고정(fix) 여부', wait_seconds: '실제로 기다린 시간(초, 미측정은 빈 값)', timed_out: '정한 대기 상한에 도달했나요?', crosscheck: '휴대폰·지도 교차확인 결과 또는 미확인 이유' };
const CONNECTION: Record<string, string> = { 'not-checked': '연결 확인 안 함', 'not-connected': '연결되지 않음 확인', connected: '내 기기에서 연결 상태 확인' };
const FIX = { fixed: '위치 고정 확인', 'no-fix': '아직 위치 고정 안 됨 확인', unchecked: '확인 안 함' };
const TIMEOUT = { no: '아니요', yes: '예 · 대기 상한 도달' };
const TITLES: Record<Kind, string> = { ...CHECKLIST_TITLES, 'ble-ad': 'BLE 광고 관찰', ir: 'IR 수신 관찰', interference: '2.4GHz 간섭 증거 비교', gps: 'GPS 수신과 교차확인' };
const FLOW = ['질문', '준비', '골든 케이스', '반복 관찰', '분석', '방어·보고서'];
const FLOW_HELP = ['탐구 질문을 먼저 적습니다.', '가설·고정 조건·반복 계획과 준비물을 확인합니다.', '기본 경로를 한 번 확인하거나 가상 예시로 연습합니다.', '바꿀 조건과 고정 조건을 구분해 한 행씩 기록합니다.', '단위·결측·근거를 대조하고 결론과 추가 확인을 적습니다.', '근거·방어·한계를 보고서로 정리합니다.'];
const GUIDES: Record<Kind, { value: string; meaning: string; limit: string }> = {
  'ble-ad': { value: '광고가 보이는 거리·RSSI·연결 여부', meaning: '공개 광고와 수신 세기의 관찰 기록', limit: '광고만으로 신원·인증·위치 추적을 확정하지 않음' },
  ir: { value: '버튼·거리·방향·명령 별칭', meaning: '같은 조건에서 명령이 반복되는지', limit: '수신만으로 재전송 성공이나 인증 부재를 증명하지 않음' },
  interference: { value: '시간·채널·막대·표시 단위', meaning: '간섭 후보와 화면 변화의 동시성', limit: '에너지 막대만으로 송신자·공격 의도를 식별하지 않음' },
  gps: { value: '조건·위성 수·fix·대기 시간', meaning: '수신 환경과 위치 고정 상태', limit: '위치 불일치만으로 위조 신호를 단정하지 않음' },
  'ssid-map': { value: 'SSID 별칭·BSSID 별칭·자동 연결', meaning: '같은 이름과 실제 장치 주소의 차이', limit: '주소 대조만으로 가짜 AP나 안전성을 확정하지 않음' },
  'wpa-pmf': { value: 'WPA 지원·현재 설정·PMF 표시', meaning: '암호화와 관리 프레임 보호의 범위', limit: '스캔 화면만으로 전체 보안 수준을 판정하지 않음' },
  firmware: { value: '출처·파일명·버전·해시·서명', meaning: '무결성과 배포자 신뢰를 분리해 확인', limit: '해시 일치만으로 서명·공급망 안전을 증명하지 않음' },
  channel: { value: '시간·채널 별칭·AP 수·RSSI', meaning: '혼잡 후보와 가용성 변화를 비교', limit: 'AP 수 하나만으로 속도 저하 원인을 단정하지 않음' },
  'ble-pair': { value: '페어링 방식·권한·재연결', meaning: '연결 성공과 상대 인증을 구분', limit: 'Just Works 연결만으로 상대를 인증했다고 보지 않음' },
  subghz: { value: '주파수 별칭·코드 문서·접근 방어', meaning: '고정·롤링 코드의 방어 차이를 문서로 확인', limit: '실제 코드 분석·재전송 공격을 수행하지 않음' },
};
const GOLDEN: Record<Kind, [string, string, string]> = {
  'ble-ad': ['내 이어폰을 가까이 두고 광고만 관찰', '벽 하나를 사이에 두고 광고와 RSSI 비교', '연결을 하지 않고 보이는 정보만 기록'],
  ir: ['같은 리모컨 전원 버튼을 세 번 관찰', '거리와 방향을 바꿔 같은 버튼 관찰', '다른 버튼은 별칭만 남기고 비교'],
  interference: ['정상 상태에서 같은 위치의 막대 기록', '내 생활 기기가 평소 작동한 조건을 기록해 비교', '시간·채널·문구를 함께 기록하고 원인 보류'],
  gps: ['실내에서 정한 시간만큼 기다림', '창가에서 같은 절차 반복', '야외에서 지도·시간과 함께 교차확인'],
  'ssid-map': ['내 공유기의 이름·주소를 별칭으로 기록', '같은 이름의 다른 주소가 있는지 대조', '자동 연결 설정을 바꾸지 않고 읽기'],
  'wpa-pmf': ['공유기 관리자 화면의 현재 설정 읽기', 'WPA2·WPA3 지원 표시와 설정 비교', 'PMF 의미와 보호 범위를 문서로 확인'],
  firmware: ['공식 배포 문서의 출처·파일 정보를 확인하고 없으면 미확인', '선택 확인: 파일과 공식 해시가 있으면 로컬 계산·대조', '서명·복구 안내는 문서로 확인하고 없으면 미확인, 설치하지 않음'],
  channel: ['아침·저녁 같은 위치에서 채널 기록', '표시 AP 수·RSSI를 비교하되 점유율·속도로 환산하지 않기', '유선·모바일 백업 경로를 확인'],
  'ble-pair': ['페어링 방식과 앱 권한 화면 읽기', '선택 확인: 내 기기 해제·재연결 결과 또는 미시도 이유 기록', '필요 권한만 남기는 제안 작성'],
  subghz: ['설명서에서 주파수·코드 방식 확인', '수신은 내 실험기 신호만 관찰', '지역 규정과 장비 보관 방어 확인'],
};
function choices(kind: Kind, field: string): Record<string, string> | null {
  if (field === 'observation_status') return STATUS;
  if (field === 'connection') return CONNECTION;
  if (field === 'fix') return FIX;
  if (field === 'timed_out') return TIMEOUT;
  if (kind === 'gps' && field === 'condition') return { 실내: '실내', 창가: '창가', 야외: '야외' };
  return isChecklist(kind) ? CHECKLIST_OPTIONS[field] ?? null : null;
}
interface State { schemaVersion: 1; workbookId: Kind; rows: Row[]; notes: Record<Mode, Notes> }
const initial = (kind: Kind): State => ({ schemaVersion: 1, workbookId: kind, rows: [], notes: { real: emptyNotes(), demo: emptyNotes() } });
const draftRow = (kind: Kind): Row => isChecklist(kind) ? checklistDraft(kind) : ({ ...Object.fromEntries(FIELDS[kind].map(k => [k, ''])), alias: { ir: 'IR-A', 'ble-ad': 'BLE-A', interference: 'Radio-A', gps: 'GPS-A' }[kind], observation_status: 'observed', connection: 'not-checked', ...(kind === 'gps' ? { condition: '실내', fix: 'unchecked', timed_out: 'no' } : {}) });

function SignalSummary({ kind, rows }: { kind: 'interference' | 'gps'; rows: Row[] }) {
  if (kind === 'interference') {
    const units = [...new Set(rows.filter(r=>r.observation_status==='observed' && r.energy_value && r.energy_unit).map(r=>r.energy_unit))];
    return <><p>수치·단위가 함께 있는 기록 {rows.filter(r=>r.observation_status==='observed' && r.energy_value && r.energy_unit).length}건. 단위 없는 막대·문구는 정성 관찰로 남기고 평균에 섞지 않습니다. 같은 기기·채널·위치·시각 조건을 맞춘 기록끼리 원자료를 대조하세요.</p>{units.map(unit=>{ const values=rows.filter(r=>r.observation_status==='observed' && r.energy_value && r.energy_unit===unit).map(r=>Number(r.energy_value));return <p key={unit}>표시 단위 {unit}: {values.length}개 · 범위 {Math.min(...values)}~{Math.max(...values)}. 단위가 같아도 화면 정의·장비가 다르면 직접 비교할 수 없습니다.</p>; })}<p>막대 변화만으로 특정 송신자나 공격 의도를 판별할 수 없습니다. 정상 사용 중인 내 기기·거리·벽·시간대 등의 대안 원인과 추가 확인 방법을 보고서에 적습니다.</p></>;
  }
  return <><p>타임아웃 {rows.filter(r=>r.timed_out==='yes').length}회는 ‘대기 상한에 도달’한 기록이며 0초 성공이나 위성 0개가 아닙니다. 빈 위성 수는 계산에서 제외합니다.</p>{['실내','창가','야외'].map(place=>{
    const group=rows.filter(r=>r.condition===place), fixes=group.filter(r=>r.fix==='fixed'), waits=fixes.filter(r=>r.wait_seconds!=='').map(r=>Number(r.wait_seconds)), sats=group.filter(r=>r.observation_status==='observed' && r.satellites!=='').map(r=>Number(r.satellites));
    return <p key={place}>{place}: 기록 {group.length}회 · fix {fixes.length}회 · 미고정 확인 {group.filter(r=>r.fix==='no-fix').length}회 · fix 미확인 {group.filter(r=>r.fix==='unchecked').length}회 · 성공 시 대기 평균 {waits.length ? (waits.reduce((a,b)=>a+b,0)/waits.length).toFixed(1)+'초' : '계산 불가'} · 표시 위성 표본 {sats.length}개{ sats.length ? ` (${Math.min(...sats)}~${Math.max(...sats)}개)` : ''}.</p>;
  })}<p>위성 수만으로 정확도를 보장하지 않습니다. 휴대폰·지도도 독립된 정답으로 가정하지 말고 같은 시각의 대조 근거·수신 환경·확인하지 못한 점을 적습니다. 위치 불일치만으로 위조 송신을 단정하지 않습니다.</p></>;
}

export default function FieldworkLab({ kind }: { kind: Kind }) {
  const [state, setState] = useState(() => initial(kind));
  const [mode, setMode] = useState<Mode>('real');
  const [draft, setDraft] = useState(() => draftRow(kind));
  const [ready, setReady] = useState(false), [message, setMessage] = useState('');
  const blocked = useRef(false);
  const [pending, setPending] = useState<ReturnType<typeof readRowsCsv> | null>(null);
  const key = `esp32div.lab.${kind}.v1`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const saved = JSON.parse(raw) as State;
          const ids = new Set<string>();
          if (saved.schemaVersion !== 1 || saved.workbookId !== kind || !Array.isArray(saved.rows) || saved.rows.length > 900 || saved.rows.some(r => { if (validateRow(kind, r) || ids.has(r.id)) return true; ids.add(r.id); return false; })) throw new Error();
          for (const m of ['real', 'demo'] as const) for (const n of Object.keys(NOTE_LABELS) as (keyof Notes)[]) if (typeof saved.notes?.[m]?.[n] !== 'string' || saved.notes[m][n].length > 4000) throw new Error();
          setState(saved);
        } catch {
          localStorage.setItem(`${key}.broken.${Date.now()}`, raw);
          setMessage('저장 형식이 맞지 않아 원본을 별도 키에 보존했습니다. CSV 백업에서 복구하거나 새 기록을 시작하세요.');
        }
      }
    } catch { blocked.current = true; setMessage('저장소를 읽거나 원본을 보존하지 못했습니다. 자동 저장을 중지했습니다. 창을 닫기 전에 CSV를 내려받으세요.'); }
    setReady(true);
  }, [key, kind]);
  useEffect(() => {
    if (!ready || blocked.current) return;
    try { localStorage.setItem(key, JSON.stringify(state)); }
    catch { blocked.current = true; setMessage('저장 공간에 기록하지 못했습니다. 창을 닫기 전에 CSV를 내려받으세요.'); }
  }, [ready, state, key]);
  const rows = state.rows.filter(r => r.data_type === mode);
  const notes = state.notes[mode];
  const observed = rows.filter(r => r.observation_status === 'observed');
  const missing = rows.filter(r => r.observation_status === 'not-observed').length;
  const unchecked = rows.length - observed.length - missing;
  const rssi = observed.filter(r => r.rssi_dbm).map(r => Number(r.rssi_dbm));
  const currentStep = !notes.question.trim() ? 0 : !notes.hypothesis.trim() ? 1 : rows.length === 0 ? 2 : rows.length < 3 ? 3 : !notes.conclusion.trim() ? 4 : 5;
  const report = [TITLES[kind] + ' 보고서', mode === 'real' ? '실제 관찰' : '가상 데모 — 실제 결과 아님', `총 ${rows.length}회: 관찰 ${observed.length}, 미관찰 ${missing}, 미측정 ${unchecked}`, ...rows.map((r,i)=>`${i+1}. ${FIELDS[kind].map(k=>`${LABELS[k]}: ${choices(kind,k)?.[r[k]] ?? (r[k] || '미확인')}`).join(' / ')}`), ...Object.entries(NOTE_LABELS).map(([k, label]) => `${label}\n${notes[k as keyof Notes] || '(미작성)'}`), '실행 경계: 이 기기의 해당 기능 실행과 교실 파일럿은 미검증. 관찰 하나만으로 공격·의도·인증 또는 위치 위조를 증명할 수 없음.'].join('\n\n');
  function demo() {
    const values = isChecklist(kind) ? [0,1,2].map(i=>makeRow(checklistDemo(kind,i),'demo')) : ['observed', 'not-observed', 'unchecked'].map((status, i) => makeRow({ ...draftRow(kind), condition: '가상 위치 A', distance_m: String(i + 1), observation_status: status, ...(kind === 'ble-ad' ? { rssi_dbm: i === 0 ? '-52' : '' } : kind === 'ir' ? { button: '전원', protocol: i === 0 ? '예시 규격' : '', command_alias: i === 0 ? 'C-A' : '' } : kind === 'interference' ? { observed_at: '2026-01-01T10:00', channel: '가상 채널 A', display_text: i === 0 ? '막대가 간헐적으로 높아짐' : '', energy_value: '', energy_unit: '' } : { condition: ['실내','창가','야외'][i], observed_at: '2026-01-01T10:00', satellites: i === 0 ? '5' : '', fix: i === 0 ? 'no-fix' : 'unchecked', wait_seconds: i < 2 ? '60' : '', timed_out: i < 2 ? 'yes' : 'no', crosscheck: '가상 사례: 휴대폰·지도 대조 안 함' }), note: '가상 자료' }, 'demo'));
    setState(s => ({ ...s, rows: [...s.rows.filter(r => r.data_type !== 'demo'), ...values] })); setMode('demo');
  }
  return <div>
    <section className="lab-section fieldwork-guide" aria-labelledby={`${kind}-guide`}>
      <h2 id={`${kind}-guide`}>실험 흐름</h2>
      <p aria-live="polite"><strong>{mode === 'real' ? '실제 기록' : '가상 데모'} · 현재 단계 {currentStep + 1}/6 · {FLOW[currentStep]}</strong> — {FLOW_HELP[currentStep]}</p>
      <p className="field__help">현재 구분의 입력 상태를 안내합니다. 단계 표시는 실제 기기 실행·실험 완료 판정이 아닙니다.</p>
      <ol className="fieldwork-flow">{FLOW.map((step, i) => <li aria-current={i === currentStep ? 'step' : undefined} className={i === currentStep ? 'is-current' : i < currentStep ? 'is-done' : ''} key={step}><span>{i + 1}</span>{step}</li>)}</ol>
      <div className="fieldwork-guide-grid"><div><strong>이번에 확인하는 값</strong><p>{GUIDES[kind].value}</p></div><div><strong>값의 의미</strong><p>{GUIDES[kind].meaning}</p></div><div><strong>아직 증명하지 못하는 것</strong><p>{GUIDES[kind].limit}</p></div></div>
      <div className="fieldwork-golden"><div><h3>안전한 골든 케이스</h3><p className="field__help">실제 장비는 직접 준비한 대상만 사용하고, 데모는 실제 결과와 섞지 않습니다.</p></div><button className="btn btn--quiet btn--small" type="button" disabled={!ready} onClick={demo}>가상 예시 3행 불러오기 · 기존 데모 행 초기화</button><ol>{GOLDEN[kind].map((item, i) => <li key={item}><span className="tag">{i === 0 ? '기본 경로' : '선택·대조'}</span> {item}</li>)}</ol></div>
    </section>
    <p role="status" aria-live="polite">{!ready ? '저장 자료 확인 중' : blocked.current ? '자동 저장 중지 · CSV 백업 필요' : '이 브라우저에 자동 저장됩니다. CSV로 별도 백업하세요.'} {message}</p>
    <fieldset disabled={!ready}><legend>자료 구분</legend><label><input type="radio" name={`${kind}-mode`} checked={mode === 'real'} onChange={() => setMode('real')} /> 실제 관찰</label>{' '}<label><input type="radio" name={`${kind}-mode`} checked={mode === 'demo'} onChange={() => setMode('demo')} /> 데모</label><p><button className="btn btn--quiet" type="button" onClick={demo}>가상 예시 3행으로 데모 시작·초기화</button></p></fieldset>
    <section className="lab-section" id="record" aria-labelledby={`${kind}-record`}><h2 id={`${kind}-record`}>관찰 기록 · {mode === 'real' ? '실제' : '데모'}</h2>
      {kind === 'firmware' && <FileDigest onHash={(hash,name)=>setDraft(d=>({...d,actual_sha256:hash,file_name:name}))} />}
      <form onSubmit={e => { e.preventDefault(); const row = makeRow(draft, mode), error = validateRow(kind, row); if (error) { setMessage(error); return; } if (state.rows.length >= 900) { setMessage('최대 900건입니다. CSV로 백업한 뒤 정리하세요.'); return; } setState(s => ({ ...s, rows: [...s.rows, row] })); setMessage('기록을 추가했습니다. 반복할 때마다 한 행씩 남기세요.'); }}>
        {FIELDS[kind].map(field => { const options = choices(kind, field); return <div className="field" key={field}><label htmlFor={`${kind}-${field}`}>{LABELS[field]}</label>{options ? <select id={`${kind}-${field}`} value={draft[field]} onChange={e => setDraft(d => ({ ...d, [field]: e.target.value }))}>{Object.entries(options).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select> : <input id={`${kind}-${field}`} type={field === 'observed_at' ? 'datetime-local' : 'text'} value={draft[field]} maxLength={fieldMaxLength(field)} inputMode={['distance_m','rssi_dbm','ap_count','energy_value','satellites','wait_seconds'].includes(field) ? 'decimal' : undefined} onChange={e => setDraft(d => ({ ...d, [field]: e.target.value }))} />}</div>; })}
        <button className="btn" disabled={!ready}>한 번의 관찰 추가</button>
      </form>
      <div className="table-wrap" tabIndex={0} role="region" aria-label="관찰 결과 표"><table><caption>{mode === 'real' ? '실제 관찰' : '가상 데모'} {rows.length}건</caption><thead><tr><th>순서</th>{FIELDS[kind].map(k => <th key={k}>{LABELS[k]}</th>)}<th>정리</th></tr></thead><tbody>{rows.map((r, i) => <tr key={r.id}><td>{i + 1}</td>{FIELDS[kind].map(k => <td key={k}>{choices(kind,k)?.[r[k]] ?? (r[k] || '미확인')}</td>)}<td><button type="button" onClick={() => { if (confirm('이 기록 한 건을 삭제할까요? 먼저 CSV 백업을 권장합니다.')) setState(s => ({ ...s, rows: s.rows.filter(v => v.id !== r.id) })); }}>삭제</button></td></tr>)}</tbody></table></div>
    </section>
    <section className="lab-section" id="analysis"><h2>분석과 다음 확인</h2><p>관찰 {observed.length}회 · 미관찰 {missing}회 · 미측정 {unchecked}회. 관찰/측정 시도는 {observed.length}/{rows.length - unchecked}회이며, 미측정은 분모에서 제외합니다.</p><ul className="fieldwork-analysis-checklist"><li>□ 바꾼 조건 외에 대상·도구·관찰 기준을 고정했는가?</li><li>□ 실제·데모·미측정을 섞지 않았는가?</li><li>□ 측정값과 화면 문구의 단위를 확인했는가?</li><li>□ 관찰한 사실과 해석·추정을 분리했는가?</li></ul>
      {kind === 'ble-ad' ? <p>표시된 RSSI 표본 {rssi.length}개 · 평균 {rssi.length ? (rssi.reduce((a, b) => a + b, 0) / rssi.length).toFixed(1) + 'dBm' : '계산 불가'} · 범위 {rssi.length ? `${Math.min(...rssi)}~${Math.max(...rssi)}dBm` : '없음'}. 광고가 보여도 RSSI 표시가 없으면 평균에서 제외합니다. 같은 거리·조건끼리 표를 비교하세요. 광고 관찰은 연결이나 사용자 식별의 증거가 아닙니다.</p> : kind === 'ir' ? <p>수신한 명령 별칭 {new Set(observed.map(r => r.command_alias).filter(Boolean)).size}종. 같은 버튼·거리·방향에서 별칭이 반복되는지 표를 대조하세요. 표시 정보가 부족하면 동일 명령인지 판단 보류합니다. 같은 코드의 수신은 인증 부재나 재전송 성공을 입증하지 않습니다.</p> : isChecklist(kind) ? <ChecklistSummary kind={kind} rows={rows} /> : <SignalSummary kind={kind} rows={rows} />}
      <details className="fieldwork-conclusion"><summary>결론 문장 템플릿 보기</summary><p>“{TITLES[kind]}에서 <strong>[관찰한 값]</strong>을 <strong>[조건]</strong>에서 확인했다. 이는 <strong>[값의 의미]</strong>를 보여 주지만, <strong>[아직 증명하지 못하는 것]</strong>까지 증명하지는 않는다. 다음에는 <strong>[추가 확인]</strong>을 하겠다.”</p></details>
    </section>
    <section className="lab-section" id="data"><h2>CSV 백업과 복구</h2><p>실제·데모 관찰과 두 구분의 서술을 한 CSV에 보관합니다. 원본 파일은 바꾸지 않습니다. 가져오기 전 아래 오류와 미리보기를 확인하세요. 같은 ID는 기존 기록을 유지합니다. 서술은 가져온 항목으로 바뀝니다.</p><button className="btn" disabled={!ready} onClick={() => downloadFile(`${kind}-observations.csv`, rowsCsv(kind, state.rows, state.notes))}>전체 CSV 내려받기</button><div className="field"><label htmlFor={`${kind}-file`}>이 워크북 CSV 가져오기(1MB 이하)</label><input id={`${kind}-file`} type="file" accept=".csv,text/csv" onChange={async e => { setPending(null); const file = e.target.files?.[0]; if (!file) return; try { if (file.size > 1024 * 1024) throw new Error('1MB 이하 파일을 선택하세요.'); setPending(readRowsCsv(kind, await file.text())); } catch (error) { setMessage((error as Error).message); } e.target.value = ''; }} /></div>
      {pending && <div className="callout"><p>유효 관찰 {pending.rows.length}건 · 오류 {pending.errors.length}행 · 서술 구분 {Object.keys(pending.notes).join(', ') || '없음'}</p><ul>{pending.errors.map((error, i) => <li key={i}>{error}</li>)}</ul><p>{pending.rows.slice(0, 3).map(r => `${r.alias} / ${r.data_type} / ${STATUS[r.observation_status]}`).join(' · ')}</p><button type="button" onClick={() => { const known = new Set(state.rows.map(r => r.id)), fresh = pending.rows.filter(r => !known.has(r.id)); if (state.rows.length + fresh.length > 900) { setMessage('900건을 초과해 반영하지 않았습니다.'); return; } setState(s => ({ ...s, rows: [...s.rows, ...fresh], notes: { real: { ...s.notes.real, ...pending.notes.real }, demo: { ...s.notes.demo, ...pending.notes.demo } } })); setMessage(`${fresh.length}건 추가, 중복 ${pending.rows.length - fresh.length}건 유지, 오류 ${pending.errors.length}행 제외. 가져온 서술을 반영했습니다.`); setPending(null); }}>유효 행과 서술 반영</button><button type="button" onClick={() => setPending(null)}>취소</button></div>}
    </section>
    <section className="lab-section" id="report"><h2>방어·한계·보고서</h2>{Object.entries(NOTE_LABELS).map(([name, label]) => <div className="field" key={name}><label htmlFor={`${kind}-note-${name}`}>{label} · {mode === 'real' ? '실제' : '데모'}</label><textarea id={`${kind}-note-${name}`} maxLength={4000} rows={3} value={notes[name as keyof Notes]} onChange={e => setState(s => ({ ...s, notes: { ...s.notes, [mode]: { ...s.notes[mode], [name]: e.target.value } } }))} /></div>)}<p>완료 기준: 원자료와 상태·결측을 확인하고, 근거·방어·한계·다음 관찰을 내 말로 설명합니다. 빈 항목은 미완료이며 데모 보고서는 실제 실험 보고서와 구분합니다.</p><button className="btn" onClick={() => downloadFile(`${kind}-${mode}-report.txt`, report, 'text/plain;charset=utf-8')}>현재 구분 보고서 내려받기</button><details><summary>보고서 미리보기</summary><div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{report}</div></details></section>
  </div>;
}
