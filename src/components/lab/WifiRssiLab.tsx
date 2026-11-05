import { useEffect, useId, useRef, useState, type ChangeEvent, type SyntheticEvent } from 'react';
import {
  WIFI_CSV_FILENAME,
  WIFI_DEFAULT_NOTES,
  WIFI_MAX_ROWS,
  WIFI_PYTHON,
  WIFI_STORAGE_KEY,
  WORKBOOK_MAX_BYTES,
  buildWifiReport,
  demoWifiObservations,
  importWifiCsv,
  mergeWifiObservations,
  summarizeWifiByRoom,
  validateWifiObservation,
  wifiObservationsToCsv,
  wifiNotesToCsv,
  restoreWifiState,
  type WifiImport,
  type WifiNotes,
  type WifiObservation,
  type WorkbookDataType,
} from '../../lib/workbook';

const MAX_VISIBLE = 200;
const EMPTY_FORM = {
  room: '거실', condition: '문 열림', distanceM: '', status: 'observed', rssiDbm: '', channel: '',
  observedAt: '', ssidAlias: 'AP-A', bssidAlias: '', note: '',
};

function download(filename: string, content: string, type: string) {
  const href = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

function ViewSwitch({ view, setView, hasDemo }: { view: WorkbookDataType; setView: (view: WorkbookDataType) => void; hasDemo: boolean }) {
  const id = useId();
  if (!hasDemo) return null;
  return (
    <fieldset>
      <legend>보고 있는 자료</legend>
      <div className="seg">
        <input id={`${id}-real`} name={id} type="radio" checked={view === 'real'} onChange={() => setView('real')} />
        <label htmlFor={`${id}-real`}>내 실제 기록</label>
        <input id={`${id}-demo`} name={id} type="radio" checked={view === 'demo'} onChange={() => setView('demo')} />
        <label htmlFor={`${id}-demo`}>데모 자료</label>
      </div>
    </fieldset>
  );
}

interface RecordPanelProps {
  observations: WifiObservation[];
  view: WorkbookDataType;
  setView: (view: WorkbookDataType) => void;
  setObservations: (rows: WifiObservation[]) => void;
}

function RecordPanel({ observations, view, setView, setObservations }: RecordPanelProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [undo, setUndo] = useState<WifiObservation | null>(null);
  const [message, setMessage] = useState('');
  const base = useId();
  const rows = observations.filter((row) => row.dataType === view);
  const hasDemo = observations.some((row) => row.dataType === 'demo');
  const realCount = observations.filter((row) => row.dataType === 'real').length;
  const sameSetup = observations.filter((row) => row.dataType === 'real' && row.room === form.room.trim() && row.condition === form.condition.trim() && row.distanceM === Number(form.distanceM));
  const nextTrial = sameSetup.reduce((max, row) => Math.max(max, row.trial), 0) + 1;
  const field = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId && observations.length >= WIFI_MAX_ROWS) { setError(`기록은 ${WIFI_MAX_ROWS}건까지 보관할 수 있습니다. 먼저 CSV로 백업하세요.`); errorRef.current?.focus(); return; }
    const result = validateWifiObservation({
      trial: String(editingId ? observations.find((row) => row.id === editingId)?.trial ?? nextTrial : nextTrial),
      room: form.room,
      condition: form.condition,
      distance_m: form.distanceM,
      observation_status: form.status,
      rssi_dbm: form.status === 'observed' ? form.rssiDbm : '',
      channel: form.channel,
      observed_at: form.observedAt,
      ssid_alias: form.ssidAlias,
      bssid_alias: form.bssidAlias,
      note: form.note,
    }, 'real');
    if (typeof result === 'string') {
      setError(result);
      errorRef.current?.focus();
      return;
    }
    if (editingId) {
      setObservations(observations.map((row) => row.id === editingId ? { ...result, id: editingId } : row));
      setMessage('기록을 수정했습니다.');
    } else {
      setObservations([...observations, result]);
      setMessage(`${result.room} ${result.trial}회차를 기록했습니다.`);
    }
    setEditingId(null);
    setForm((current) => ({ ...current, note: '' }));
    setUndo(null);
    setView('real');
    setError('');
  };

  const edit = (row: WifiObservation) => {
    setEditingId(row.id);
    setForm({ room: row.room, condition: row.condition, distanceM: String(row.distanceM), status: row.status, rssiDbm: row.rssiDbm === null ? '' : String(row.rssiDbm), channel: row.channel === null ? '' : String(row.channel), observedAt: row.observedAt, ssidAlias: row.ssidAlias, bssidAlias: row.bssidAlias, note: row.note });
    setView('real');
    setMessage('선택한 기록을 입력칸에 불러왔습니다. 값을 바꾸고 저장하세요.');
    setError('');
    document.getElementById(`${base}-room`)?.focus();
  };

  const remove = (row: WifiObservation) => {
    if (!window.confirm(`${row.room} ${row.trial}회차 기록을 지울까요?`)) return;
    setObservations(observations.filter((item) => item.id !== row.id));
    setUndo(row);
    if (editingId === row.id) setEditingId(null);
    setMessage('기록 1건을 지웠습니다.');
  };

  return (
    <div className="fields">
      <form className="fields" noValidate onSubmit={submit}>
        <div className="fields fields--grid">
          <div className="field">
            <label htmlFor={`${base}-room`}>방·위치</label>
            <input id={`${base}-room`} type="text" maxLength={40} value={form.room} onChange={field('room')} />
          </div>
          <div className="field">
            <label htmlFor={`${base}-condition`}>관찰 조건</label>
            <input id={`${base}-condition`} type="text" maxLength={40} placeholder="예: 문 닫힘, 저녁" value={form.condition} onChange={field('condition')} />
          </div>
          <div className="field">
            <label htmlFor={`${base}-distance`}>공유기와 거리(m)</label>
            <input id={`${base}-distance`} type="number" inputMode="decimal" min={0} max={100} step={0.1} value={form.distanceM} onChange={field('distanceM')} />
          </div>
          <div className="field">
            <label htmlFor={`${base}-status`}>관찰 상태</label>
            <select id={`${base}-status`} value={form.status} onChange={(event) => { field('status')(event); if (event.target.value !== 'observed') setForm((current) => ({ ...current, status: event.target.value, rssiDbm: '' })); }}>
              <option value="observed">RSSI 값 관찰됨</option>
              <option value="not-observed">신호를 찾지 못함</option>
              <option value="unchecked">측정하지 못함</option>
            </select>
            <p className="field__help">신호를 찾지 못한 것과 측정을 못 한 것을 0dBm으로 적지 않습니다.</p>
          </div>
          <div className="field">
            <label htmlFor={`${base}-rssi`}>RSSI(dBm)</label>
            <input id={`${base}-rssi`} type="number" inputMode="numeric" min={-120} max={0} step={1} disabled={form.status !== 'observed'} value={form.rssiDbm} onChange={field('rssiDbm')} />
            <p className="field__help">앱 입력 범위는 -120~0dBm입니다. 0에 가까울수록 강합니다. 예: -45dBm은 -80dBm보다 강합니다.</p>
          </div>
          <div className="field">
            <label htmlFor={`${base}-channel`}>채널(선택)</label>
            <input id={`${base}-channel`} type="number" inputMode="numeric" min={1} max={14} step={1} value={form.channel} onChange={field('channel')} />
          </div>
          <div className="field">
            <label htmlFor={`${base}-time`}>관찰 날짜와 시간</label>
            <input id={`${base}-time`} type="datetime-local" value={form.observedAt} onChange={field('observedAt')} />
          </div>
          <div className="field">
            <label htmlFor={`${base}-ssid`}>SSID 별칭(선택)</label>
            <input id={`${base}-ssid`} type="text" maxLength={40} placeholder="예: AP-A" value={form.ssidAlias} onChange={field('ssidAlias')} />
          </div>
          <div className="field">
            <label htmlFor={`${base}-bssid`}>BSSID 별칭(선택)</label>
            <input id={`${base}-bssid`} type="text" maxLength={40} placeholder="예: 공유기-거실" value={form.bssidAlias} onChange={field('bssidAlias')} />
          </div>
          <div className="field span-all">
            <p className="field__help">실제 SSID나 BSSID(MAC 주소)는 입력하지 말고 AP-A, 공유기-거실처럼 가명만 적습니다.</p>
            <label htmlFor={`${base}-note`}>관찰 메모</label>
            <input id={`${base}-note`} type="text" maxLength={500} placeholder="예: 문을 닫은 뒤 수치가 흔들림" value={form.note} onChange={field('note')} />
          </div>
        </div>
        <div className="btn-row">
          <button className="btn" type="submit">{editingId ? '수정 저장' : `기록 추가 (${nextTrial}회차)`}</button>
          {editingId && <button className="btn btn--quiet" type="button" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setMessage('수정을 취소했습니다.'); }}>취소</button>}
          <p ref={errorRef} tabIndex={-1} className={error ? 'status status--error' : 'status'} role="status">{error || message}</p>
          {undo && <button className="btn btn--quiet" type="button" onClick={() => { if (observations.length >= WIFI_MAX_ROWS) { setError('기록 한도에 도달했습니다. 먼저 CSV로 백업하세요.'); return; } if (!observations.some(row => row.id === undo.id)) setObservations([...observations, undo]); setUndo(null); setMessage('지운 한 건을 되돌렸습니다.'); }}>삭제 되돌리기</button>}
        </div>
      </form>

      <ViewSwitch view={view} setView={setView} hasDemo={hasDemo} />
      {view === 'demo' && <p className="demo-note">지금 보는 값은 화면 확인용 가상 자료입니다. 실제 측정 결과가 아닙니다.</p>}
      {rows.length ? (
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Wi-Fi RSSI 관찰 기록">
          <table>
            <caption>전체 {rows.length}건{rows.length > MAX_VISIBLE ? `, 최근 ${MAX_VISIBLE}건만 표시` : ''}</caption>
            <thead><tr><th scope="col">반복</th><th scope="col">방·위치</th><th scope="col">조건</th><th scope="col">거리</th><th scope="col">상태</th><th scope="col">RSSI</th><th scope="col">채널</th><th scope="col">시각</th><th scope="col">별칭</th><th scope="col">메모</th><th scope="col"><span className="sr">작업</span></th></tr></thead>
            <tbody>{rows.slice(-MAX_VISIBLE).map((row) => (
              <tr key={row.id}>
                <td>{row.trial}</td><td>{row.room}</td><td>{row.condition}</td><td>{row.distanceM}m</td><td>{{ observed: '값 관찰됨', 'not-observed': '신호 못 찾음', unchecked: '미측정' }[row.status]}</td><td>{row.rssiDbm === null ? '—' : `${row.rssiDbm}dBm`}</td><td>{row.channel ?? '—'}</td><td>{row.observedAt.replace('T', ' ')}</td><td>{row.ssidAlias || row.bssidAlias ? `${row.ssidAlias}${row.ssidAlias && row.bssidAlias ? ' / ' : ''}${row.bssidAlias}` : '—'}</td><td>{row.note || '—'}</td>
                <td>{row.dataType === 'real' && <div className="btn-row"><button className="btn btn--quiet btn--small" type="button" onClick={() => edit(row)}>수정</button><button className="btn btn--quiet btn--small" type="button" onClick={() => remove(row)}>지우기</button></div>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <div className="empty"><p>아직 기록이 없습니다. 같은 공유기를 방·거리·시각별로 관찰해 첫 값을 적어 보세요.</p></div>}

      <div className="btn-row">
        {hasDemo ? <button className="btn btn--quiet btn--small" type="button" onClick={() => { setObservations(observations.filter((row) => row.dataType !== 'demo')); setView('real'); }}>데모 자료 지우기</button> : <button className="btn btn--quiet btn--small" type="button" onClick={() => { const demo = demoWifiObservations(); if (observations.length + demo.length > WIFI_MAX_ROWS) { setError('기록 한도에 도달했습니다. 먼저 CSV로 백업하세요.'); return; } setObservations([...observations, ...demo]); setView('demo'); }}>화면 확인용 데모 자료 불러오기</button>}
        {realCount > 0 && <button className="btn btn--quiet btn--small" type="button" onClick={() => { if (window.confirm(`실제 기록 ${realCount}건을 모두 지울까요? 먼저 CSV로 백업하세요.`)) { setObservations(observations.filter((row) => row.dataType !== 'real')); setEditingId(null); setUndo(null); } }}>실제 기록 전부 지우기</button>}
      </div>
    </div>
  );
}

function ChartPanel({ rows }: { rows: WifiObservation[] }) {
  const summary = summarizeWifiByRoom(rows);
  if (!summary.length) return <div className="empty"><p>기록을 입력하면 방별 중앙값·평균·범위와 유효 표본 수가 나타납니다.</p></div>;
  const targets = new Set(rows.map(row => `${row.ssidAlias}/${row.bssidAlias}`));
  return <div className="fields">
    {targets.size > 1 && <p className="callout">대상 AP 별칭이 여러 개입니다. 같은 공유기를 비교했는지 확인하고 다른 AP의 값을 방 차이로 해석하지 마세요.</p>}
    <div className="table-wrap" tabIndex={0} role="region" aria-label="방별 RSSI 그래프와 요약표">
      <table className="chart wifi-chart">
        <caption>막대는 중앙값의 위치입니다. 왼쪽 -120dBm(약함) → 오른쪽 0dBm(강함). 결측은 제외하며, 평균은 dBm 수치의 산술평균입니다. 실제 전력 평균·속도·침입 여부를 뜻하지 않습니다.</caption>
        <thead><tr><th scope="col">방·위치</th><th scope="col">중앙값 위치</th><th scope="col">중앙값</th><th scope="col">평균</th><th scope="col">최소~최대</th><th scope="col">유효 n</th><th scope="col">신호 못 찾음</th><th scope="col">미측정</th></tr></thead>
        <tbody>{summary.map(group => <tr key={group.room}>
          <th scope="row">{group.room}</th>
          <td className="chart__bar">{group.median === null ? '값 없음' : <div className="bar-track" aria-hidden="true"><span className="bar-fill" style={{ width: `${(group.median + 120) / 1.2}%`, minWidth: 0 }} /></div>}</td>
          <td className="chart__value">{group.median === null ? '—' : `${group.median}dBm`}</td><td>{group.average?.toFixed(1) ?? '—'}</td><td>{group.min ?? '—'}~{group.max ?? '—'}</td><td>{group.count}</td><td>{group.notObserved}</td><td>{group.unchecked}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {summary.some(group => group.count < 5) && <p className="field__help">유효한 값이 5개보다 적은 방이 있습니다. 반복 횟수와 조건을 함께 보고 우연이나 시간 변화의 영향을 고려하세요.</p>}
  </div>;
}

function CsvPanel({ observations, setObservations, notes, setNotes, setView }: {
  observations: WifiObservation[]; setObservations: (rows: WifiObservation[]) => void;
  notes: WifiNotes; setNotes: (notes: WifiNotes) => void; setView: (view: WorkbookDataType) => void;
}) {
  const [pending, setPending] = useState<WifiImport | null>(null);
  const [message, setMessage] = useState('');
  const [fileKey, setFileKey] = useState(0);
  const id = useId();
  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; setPending(null); setMessage('');
    if (!file) return;
    if (file.size > WORKBOOK_MAX_BYTES) { setPending({ kind: 'invalid', errors: [{ line: 0, message: '파일이 1MiB보다 큽니다.' }] }); return; }
    try { setPending(importWifiCsv(await file.text())); }
    catch { setPending({ kind: 'invalid', errors: [{ line: 0, message: '파일을 읽지 못했습니다. 다시 골라 주세요.' }] }); }
  };
  const finish = (message: string) => { setMessage(message); setPending(null); setFileKey(key => key + 1); };
  const apply = (replace: boolean) => {
    if (pending?.kind !== 'observations') return;
    if (replace && observations.length && !window.confirm(`현재 실제·데모 기록 ${observations.length}건을 파일 내용으로 바꿀까요? 먼저 CSV로 백업하세요.`)) return;
    try {
      const merged = mergeWifiObservations(replace ? [] : observations, pending.observations);
      setObservations(merged.observations); setView('real');
      finish(`${merged.added}건을 ${replace ? '반영' : '추가'}했습니다. 같은 기록 ${merged.skipped}건, 식별자가 충돌하는 기록 ${merged.conflicts}건은 건너뛰었습니다.`);
    } catch (error) { setMessage((error as Error).message); }
  };
  return <div className="fields">
    <div className="btn-row">
      <button className="btn btn--small" type="button" disabled={!observations.length} onClick={() => download(WIFI_CSV_FILENAME, wifiObservationsToCsv(observations), 'text/csv;charset=utf-8')}>전체 관찰 CSV 내려받기</button>
      <button className="btn btn--quiet btn--small" type="button" onClick={() => download('wifi-rssi-notes.csv', wifiNotesToCsv(notes), 'text/csv;charset=utf-8')}>탐구 서술 CSV 내려받기</button>
    </div>
    <p className="field__help">전체 관찰 CSV는 실제·데모를 data_type 열로 구분합니다. 서술은 두 보기에 공통입니다. 관찰과 서술 파일을 함께 보관해야 탐구 전체를 복구할 수 있습니다.</p>
    <div className="field"><label htmlFor={id}>CSV 가져오기</label><p className="field__help">이 워크북의 관찰 또는 서술 CSV를 선택한 뒤 미리보기를 확인합니다. 서술 가져오기는 같은 항목을 파일 값으로 바꿉니다.</p><input key={fileKey} id={id} type="file" accept=".csv,text/csv" onChange={choose} /></div>
    {pending && <div className={pending.kind === 'invalid' ? 'callout callout--warn' : 'callout'}>
      <p><strong>{pending.kind === 'invalid' ? '가져올 수 없습니다.' : pending.kind === 'notes' ? `올바른 서술 ${Object.keys(pending.notes).length}개 항목` : `올바른 관찰 ${pending.observations.length}건`}</strong></p>
      {pending.errors.length > 0 && <ul className="small">{pending.errors.slice(0, 8).map((item, i) => <li key={i}>{item.line ? `${item.line}행: ` : ''}{item.message}</li>)}{pending.errors.length > 8 && <li>그 밖에 오류 {pending.errors.length - 8}개</li>}</ul>}
      <div className="btn-row">
        {pending.kind === 'observations' && pending.observations.length > 0 && <><button className="btn btn--small" type="button" onClick={() => apply(false)}>기존 기록에 더하기</button><button className="btn btn--quiet btn--small" type="button" onClick={() => apply(true)}>기존 기록과 바꾸기</button></>}
        {pending.kind === 'notes' && Object.keys(pending.notes).length > 0 && <button className="btn btn--small" type="button" onClick={() => { setNotes({ ...notes, ...pending.notes }); finish('서술을 가져왔습니다.'); }}>서술 가져오기</button>}
        <button className="btn btn--quiet btn--small" type="button" onClick={() => { setPending(null); setFileKey(key => key + 1); }}>취소</button>
      </div>
    </div>}
    <p className="status" role="status">{message}</p>
  </div>;
}

const NOTE_FIELDS: { key: string; label: string; help: string }[] = [
  { key: 'question', label: '탐구 질문', help: '이번 관찰로 답하고 싶은 질문 한 가지를 씁니다.' },
  { key: 'motivation', label: '궁금해진 장면', help: '집에서 실제로 겪은 끊김이나 속도 차이로 시작합니다.' },
  { key: 'hypothesis', label: '가설', help: '어느 방에서 왜 신호가 약할지 예상합니다.' },
  { key: 'controls', label: '고정한 조건', help: '같은 AP, 기기 높이, 잡는 방향처럼 바꾸지 않을 것을 적습니다.' },
  { key: 'plan', label: '반복 계획', help: '각 위치를 몇 번, 어느 시간대에 잴지 적습니다.' },
  { key: 'interpretation', label: '관찰 결과 해석', help: '방별 중앙값·평균·범위·유효 n을 인용하고 결측 수를 함께 적습니다.' },
  { key: 'conclusion', label: '결론', help: '가설을 얼마나 뒷받침했는지 실제 관찰 근거로 답합니다.' },
  { key: 'security', label: '보안 질문에 대한 답', help: 'RSSI만으로 침입을 판단할 수 없는 이유와 추가 확인 근거를 적습니다.' },
  { key: 'unexpected', label: '예상 밖 결과와 원인 후보', help: '문, 사람, 기기 위치, 시간대처럼 다시 확인할 변수를 적습니다.' },
  { key: 'followup', label: '추가 실험', help: '원인 후보를 구분하려면 다음에 무엇 하나를 바꾸어 볼지 씁니다.' },
  { key: 'defense', label: '방어 설계', help: '공유기 위치, 게스트망·IoT 망 분리, 자동 연결 점검처럼 적용할 방법을 씁니다.' },
  { key: 'limits', label: '실험의 한계', help: '이 장치와 이 공간의 수동 관찰이며 침입을 검증한 실험이 아님을 구분합니다.' },
  { key: 'interview', label: '면접에서 1분으로 설명하기', help: '궁금증→설계→수치→예상 밖 결과→배운 점 순서로 씁니다.' },
];

function NotesPanel({ notes, setNotes, fields }: { notes: WifiNotes; setNotes: (notes: WifiNotes) => void; fields: typeof NOTE_FIELDS }) {
  const base = useId();
  return <div className="fields">{fields.map((field) => <div className="field" key={field.key}><label htmlFor={`${base}-${field.key}`}>{field.label}</label><p id={`${base}-${field.key}-help`} className="field__help">{field.help}</p><textarea id={`${base}-${field.key}`} aria-describedby={`${base}-${field.key}-help`} rows={3} maxLength={4000} value={notes[field.key] ?? ''} onChange={(event) => setNotes({ ...notes, [field.key]: event.target.value })} /></div>)}</div>;
}

function ReportPanel({ rows, notes, view }: { rows: WifiObservation[]; notes: WifiNotes; view: WorkbookDataType }) {
  const [date, setDate] = useState('(열어 본 날)');
  const [message, setMessage] = useState('');
  useEffect(() => setDate(new Date().toLocaleDateString('sv')), []);
  const report = buildWifiReport(rows, notes, view, date);
  const summary = summarizeWifiByRoom(rows);
  const copy = async () => {
    try { await navigator.clipboard.writeText(report); setMessage('보고서 초안을 복사했습니다.'); }
    catch { setMessage('복사하지 못했습니다. Markdown 파일을 내려받으세요.'); }
  };
  return <div className="fields">
    <div className="btn-row"><button className="btn" type="button" onClick={copy}>보고서 초안 복사</button><button className="btn btn--quiet" type="button" onClick={() => download(view === 'demo' ? 'wifi-rssi-report-demo.md' : 'wifi-rssi-report.md', report, 'text/markdown;charset=utf-8')}>Markdown 내려받기</button><button className="btn btn--quiet" type="button" onClick={() => window.print()}>보고서 인쇄</button><p className="status" role="status">{message}</p></div>
    <article className="report" aria-label="Wi-Fi RSSI 보고서 미리보기">
      <h1>{notes.question?.trim() || '(아직 작성하지 않음)'}</h1><p>작성일 {date}, {view === 'demo' ? '데모' : '실제'} 기록 {rows.length}건</p>
      {view === 'demo' && <p className="demo-note">가상 값으로 만든 미리보기입니다. 실제 실험 결과가 아닙니다.</p>}
      <h2>방별 결과 (dBm)</h2>{summary.length ? <ul>{summary.map(group => <li key={group.room}>{group.room}: 유효 n {group.count}, 중앙값 {group.median ?? '—'}, 평균 {group.average?.toFixed(1) ?? '—'}, 범위 {group.min ?? '—'}~{group.max ?? '—'}, 신호 못 찾음 {group.notObserved}, 미측정 {group.unchecked}</li>)}</ul> : <p>입력된 기록이 없습니다.</p>}
      <p>결측은 집계에서 제외했습니다. 평균은 dBm 수치의 산술평균이며 실제 전력 평균이 아닙니다.</p>
      {NOTE_FIELDS.filter(field => field.key !== 'question').map(field => <section key={field.key}><h2>{field.label}</h2><p>{notes[field.key]?.trim() || '(아직 작성하지 않음)'}</p></section>)}
      <h2>원자료와 출처</h2><p>관찰 CSV와 탐구 서술 CSV를 함께 보관합니다. 실제로 쓴 관찰 도구와 참고 자료를 보고서에 덧붙이세요.</p>
    </article>
  </div>;
}

export default function WifiRssiLab() {
  const [observations, setObservations] = useState<WifiObservation[]>([]);
  const [notes, setNotes] = useState<WifiNotes>(WIFI_DEFAULT_NOTES);
  const [view, setView] = useState<WorkbookDataType>('real');
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loadWarning, setLoadWarning] = useState('');
  const writeBlocked = useRef(false);

  useEffect(() => {
    let raw: string | null = null;
    try { raw = localStorage.getItem(WIFI_STORAGE_KEY); }
    catch { writeBlocked.current = true; setSaveError('이 브라우저의 저장 공간을 읽지 못해 새 저장을 막았습니다. 창을 닫기 전에 CSV로 백업하세요.'); }
    if (raw) {
      const preserve = () => {
        try { localStorage.setItem(`${WIFI_STORAGE_KEY}.broken.${Date.now()}`, raw); return true; }
        catch { writeBlocked.current = true; return false; }
      };
      try {
        const restored = restoreWifiState(raw);
        setObservations(restored.observations); setNotes(restored.notes);
        if (restored.dropped) setLoadWarning(`저장 자료 중 ${restored.dropped}개 항목을 형식 오류로 제외했습니다.${preserve() ? ' 원본은 별도 키에 보관했습니다.' : ' 원본을 지키려고 새 저장을 막았습니다. 이번 입력은 CSV로 백업하세요.'}`);
      } catch {
        setLoadWarning(`저장된 자료를 읽지 못했습니다.${preserve() ? ' 원본은 별도 키에 보관하고 빈 상태로 시작합니다.' : ' 원본을 지키려고 새 저장을 막았습니다. 이번 입력은 CSV로 백업하세요.'}`);
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded || writeBlocked.current) return;
    try { localStorage.setItem(WIFI_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, workbookId: 'wifi-rssi', observations, notes })); setSaveError(''); }
    catch { setSaveError('이 브라우저에 저장하지 못했습니다. 창을 닫기 전에 CSV로 백업하세요.'); }
  }, [loaded, notes, observations]);

  const visible = observations.filter((row) => row.dataType === view);
  return (
    <div className="wifi-app">
      <div role="status" aria-live="polite"><p className={saveError ? 'save-state save-state--error' : 'save-state'}>{saveError || `입력은 서버로 보내지 않고 이 브라우저에만 저장합니다. 실제 기록 ${observations.filter((row) => row.dataType === 'real').length}건.`}</p>{loadWarning && <p className="save-state save-state--error">{loadWarning}</p>}</div>
      <section className="lab-section" id="record" aria-labelledby="h-record"><h2 id="h-record"><span className="lab-section__n">2</span> 관찰값 기록</h2><p>같은 AP를 같은 높이와 방향에서 확인하고, 화면에 보인 값을 사람이 직접 옮겨 적습니다. 이 사이트는 무선 신호를 자동 측정하지 않습니다.</p><h3>관찰 전 질문과 가설</h3><NotesPanel notes={notes} setNotes={setNotes} fields={NOTE_FIELDS.slice(0, 5)} /><h3>한 번의 관찰</h3><RecordPanel observations={observations} view={view} setView={setView} setObservations={setObservations} /></section>
      <section className="lab-section" id="chart" aria-labelledby="h-chart"><h2 id="h-chart"><span className="lab-section__n">3</span> 방별 RSSI 비교</h2><p className="demo-note">{view === 'demo' ? '현재 그래프는 데모 가상 자료입니다.' : '현재 그래프는 내 실제 기록만 사용합니다.'}</p><ChartPanel rows={visible} /></section>
      <section className="lab-section" id="data" aria-labelledby="h-data"><h2 id="h-data"><span className="lab-section__n">4</span> CSV 백업과 복구</h2><p>실험이 끝날 때마다 관찰과 탐구 서술 CSV를 함께 내려받습니다. =, +, -, @로 시작하는 글은 표 프로그램에서 수식으로 실행되지 않도록 보호합니다.</p><CsvPanel observations={observations} setObservations={setObservations} notes={notes} setNotes={setNotes} setView={setView} /><details><summary>CSV를 Python으로 분석하기</summary><p>관찰 CSV와 분석 파일을 같은 폴더에 두고 PC에서 <code>python3 wifi-rssi-analysis.py</code>를 실행합니다. 표준 라이브러리만 사용하며 실제 기록의 n·중앙값·평균·범위·결측 수가 터미널에 나옵니다. 이 웹페이지에서 실행하지는 않습니다.</p><button className="btn btn--quiet btn--small" type="button" onClick={() => download('wifi-rssi-analysis.py', WIFI_PYTHON, 'text/x-python;charset=utf-8')}>Python 분석 코드 내려받기</button><pre className="code" tabIndex={0}><code>{WIFI_PYTHON}</code></pre><p>수정해 볼 것: 방 대신 관찰 조건으로 묶으려면 <code>row["room"]</code>을 <code>row["condition"]</code>으로 바꾸고 같은 결과인지 비교합니다. 중앙값은 정렬한 가운데 값이며, 짝수 개면 가운데 둘의 평균입니다.</p></details></section>
      <section className="lab-section" id="interpret" aria-labelledby="h-interpret"><h2 id="h-interpret"><span className="lab-section__n">5</span> 해석, 보안 질문, 방어 설계</h2><p><strong>RSSI가 달라졌다는 사실만으로 침입이나 공격을 증명할 수 없습니다.</strong> 내 AP의 별칭, 공간 조건, 시간대와 공유기 설정을 함께 확인하고, 타인 네트워크에는 접속하지 않습니다.</p><NotesPanel notes={notes} setNotes={setNotes} fields={NOTE_FIELDS.slice(5)} /></section>
      <section className="lab-section" id="report" aria-labelledby="h-report"><h2 id="h-report"><span className="lab-section__n">6</span> 보고서와 면접 준비</h2><p>수치를 인용하되, 실제로 확인하지 않은 원인은 결론이 아니라 추가 실험 계획으로 구분합니다.</p><ReportPanel rows={visible} notes={notes} view={view} /></section>
    </div>
  );
}
