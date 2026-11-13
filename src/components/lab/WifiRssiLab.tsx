import { useEffect, useId, useRef, useState, type ChangeEvent, type SyntheticEvent } from 'react';
import { persisted } from './labStore';
import { InterviewPrep, type InterviewProps } from './InterviewPrep';
import { NotesEditor, type NoteGuide } from './NotesEditor';
import { SummaryTable } from './SummaryTable';
import {
  WIFI_CSV_FILENAME,
  WIFI_DEFAULT_NOTES,
  WIFI_MAX_ROWS,
  WIFI_STORAGE_KEY,
  WORKBOOK_MAX_BYTES,
  buildWifiReport,
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
  wifiSummaryRows,
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
        {hasDemo && <button className="btn btn--quiet btn--small" type="button" onClick={() => { setObservations(observations.filter((row) => row.dataType !== 'demo')); setView('real'); }}>데모 자료 지우기</button>}
        {realCount > 0 && <button className="btn btn--quiet btn--small" type="button" onClick={() => { if (window.confirm(`실제 기록 ${realCount}건을 모두 지울까요? 먼저 CSV로 백업하세요.`)) { setObservations(observations.filter((row) => row.dataType !== 'real')); setEditingId(null); setUndo(null); } }}>실제 기록 전부 지우기</button>}
      </div>
    </div>
  );
}

function ChartPanel({ rows }: { rows: WifiObservation[] }) {
  const summary = summarizeWifiByRoom(rows);
  if (!summary.length) return <div className="empty"><p>기록을 입력하면 방별 중앙값, 평균, 범위와 유효 표본 수가 나타납니다.</p></div>;
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

interface WifiState { observations: WifiObservation[]; notes: WifiNotes; view: WorkbookDataType }
const store = persisted<WifiState>(WIFI_STORAGE_KEY, { observations: [], notes: WIFI_DEFAULT_NOTES, view: 'real' }, (raw) => {
  const restored = restoreWifiState(raw);
  let warning = '';
  if (restored.dropped) {
    try { localStorage.setItem(`${WIFI_STORAGE_KEY}.broken.${Date.now()}`, raw); warning = `저장 자료 중 ${restored.dropped}개 항목을 형식 오류로 제외했습니다. 원본은 별도 키에 보관했습니다.`; }
    catch { warning = `저장 자료 중 ${restored.dropped}개 항목을 형식 오류로 제외했습니다.`; }
  }
  const view = JSON.parse(raw)?.view === 'demo' ? 'demo' as const : 'real' as const;
  return { state: { observations: restored.observations, notes: restored.notes, view }, warning };
});
const useWifi = () => {
  const snap = store.use();
  const set = (patch: Partial<WifiState>) => store.set((s) => ({ ...s, ...patch }));
  return { ...snap, set };
};

function SaveLine() {
  const { state, ready, blocked, message } = useWifi();
  return <p className={blocked ? 'save-state save-state--error' : 'save-state'} role="status">{!ready ? '저장 자료를 확인하는 중입니다.' : blocked ? '자동 저장이 멈췄습니다. CSV를 내려받아 보관하세요.' : `입력은 서버로 보내지 않고 이 브라우저에만 저장합니다. 실제 기록 ${state.observations.filter((r) => r.dataType === 'real').length}건.`} {message}</p>;
}

export function WifiRecord({ golden }: { golden: WifiObservation[] }) {
  const { state, ready, set } = useWifi();
  return <div className="lab-tool">
    <SaveLine />
    <div className="btn-row"><button className="btn btn--quiet btn--small" type="button" disabled={!ready} onClick={() => set({ observations: [...state.observations.filter((r) => r.dataType !== 'demo'), ...golden.map((r) => ({ ...r }))], view: 'demo' })}>가상 골든 데이터 {golden.length}행으로 데모 시작</button><span className="field__help">데모 행만 바꾸며 실제 기록은 그대로 둡니다.</span></div>
    <RecordPanel observations={state.observations} view={state.view} setView={(view) => set({ view })} setObservations={(observations) => set({ observations })} />
  </div>;
}
export function WifiChart() {
  const { state, set } = useWifi();
  const rows = state.observations.filter((r) => r.dataType === state.view);
  return <div className="lab-tool">
    <ViewSwitch view={state.view} setView={(view) => set({ view })} hasDemo={state.observations.some((r) => r.dataType === 'demo')} />
    <SummaryTable rows={wifiSummaryRows(rows)} total={0} caption={`${state.view === 'demo' ? '가상 데모' : '내 실제 기록'}의 방별 계산 결과`} />
    <ChartPanel rows={rows} />
  </div>;
}
export function WifiData() {
  const { state, set } = useWifi();
  return <CsvPanel observations={state.observations} setObservations={(observations) => set({ observations })} notes={state.notes} setNotes={(notes) => set({ notes })} setView={(view) => set({ view })} />;
}
export function WifiNotes({ fields }: { fields: NoteGuide[] }) {
  const { state, ready, set } = useWifi();
  return <NotesEditor fields={fields} disabled={!ready} modeLabel="실제와 데모 공통" values={state.notes} onChange={(key, value) => set({ notes: { ...state.notes, [key]: value } })} />;
}
export function WifiReport({ labels }: { labels: Record<string, string> }) {
  const { state, set } = useWifi();
  const [date, setDate] = useState('(열어 본 날)');
  const [message, setMessage] = useState('');
  useEffect(() => setDate(new Date().toLocaleDateString('sv')), []);
  const report = buildWifiReport(state.observations, state.notes, state.view, date, labels);
  return <div className="lab-tool">
    <ViewSwitch view={state.view} setView={(view) => set({ view })} hasDemo={state.observations.some((r) => r.dataType === 'demo')} />
    <div className="btn-row"><button className="btn" type="button" onClick={() => download(state.view === 'demo' ? 'wifi-rssi-report-demo.md' : 'wifi-rssi-report.md', report, 'text/markdown;charset=utf-8')}>보고서 Markdown 내려받기</button><button className="btn btn--quiet" type="button" onClick={async () => { try { await navigator.clipboard.writeText(report); setMessage('보고서를 복사했습니다.'); } catch { setMessage('복사하지 못했습니다. 파일로 내려받으세요.'); } }}>보고서 복사</button><p className="status" role="status">{message}</p></div>
    <pre className="report-preview" tabIndex={0} aria-label="보고서 미리보기">{report}</pre>
  </div>;
}
/** Wi-Fi 서술은 실제와 데모가 함께 쓴다. 근거와 계산값은 실제 기록에서만 읽는다. */
export function WifiInterview(props: InterviewProps) {
  const { state, ready } = useWifi();
  const real = state.observations.filter((r) => r.dataType === 'real'), n = state.notes;
  const lost = real.filter((r) => r.status === 'not-observed').length, skipped = real.filter((r) => r.status === 'unchecked').length;
  return <InterviewPrep {...props} values={n} disabled={!ready} modeLabel="실제와 데모 공통" file="wifi-rssi-interview.md"
    set={(patch) => store.set((s) => ({ ...s, notes: { ...s.notes, ...patch } }))} ctx={{
      mode: state.view, storage: '실제와 데모 공통 서술(이 브라우저)', realCount: real.length, viewCount: state.observations.filter((r) => r.dataType === state.view).length,
      gap: [lost && `신호 못 찾음 ${lost}건`, skipped && `측정 못 함 ${skipped}건`].filter(Boolean).join(', '),
      summary: [['탐구 질문', n.question ?? ''], ['가설', n.hypothesis ?? ''], ['고정 조건과 반복', n.controls ?? ''], ['결론', n.conclusion ?? ''], ['한계', n.limits ?? '']],
      calc: real.length ? wifiSummaryRows(real) : [],
    }} />;
}
