import { useEffect, useId, useState } from 'react';
import { checklistDraft, fieldMaxLength, isChecklist } from '../../lib/checklist';
import { buildFieldReport, choices, downloadFile, emptyNotes, FIELDS, groupFields, LABELS, makeRow, NOTE_KEYS, NOTE_KEYS_ALL, readRowsCsv, rowsCsv, STATUS, summaryRows, validateRow, type Kind, type Mode, type NoteKey, type Notes, type Row } from '../../lib/fieldwork';
import { persisted } from './labStore';
import { NotesEditor, type NoteGuide } from './NotesEditor';
import { FileDigest } from './ChecklistLab';
import { SummaryTable } from './SummaryTable';
import { InterviewPrep, type InterviewProps } from './InterviewPrep';

interface State { schemaVersion: 1; workbookId: Kind; rows: Row[]; notes: Record<Mode, Notes>; mode: Mode }
const MAX_ROWS = 900;
const initial = (kind: Kind): State => ({ schemaVersion: 1, workbookId: kind, rows: [], notes: { real: emptyNotes(), demo: emptyNotes() }, mode: 'real' });

function restore(kind: Kind, raw: string) {
  const saved = JSON.parse(raw);
  const ids = new Set<string>();
  if (saved?.schemaVersion !== 1 || saved.workbookId !== kind || !Array.isArray(saved.rows) || saved.rows.length > MAX_ROWS) throw new Error('형식');
  for (const r of saved.rows) { if (validateRow(kind, r) || ids.has(r.id)) throw new Error('행'); ids.add(r.id); }
  const notes = { real: emptyNotes(), demo: emptyNotes() };
  for (const m of ['real', 'demo'] as const) for (const k of NOTE_KEYS_ALL) {
    const v = saved.notes?.[m]?.[k];
    if (v === undefined) continue; // 이전 버전에는 없던 서술 항목
    if (typeof v !== 'string' || v.length > 4000) throw new Error('서술');
    notes[m][k] = v;
  }
  return { state: { schemaVersion: 1 as const, workbookId: kind, rows: saved.rows as Row[], notes, mode: saved.mode === 'demo' ? 'demo' as const : 'real' as const } };
}
const stores = new Map<Kind, ReturnType<typeof persisted<State>>>();
function store(kind: Kind) {
  let s = stores.get(kind);
  if (!s) { s = persisted<State>(`esp32div.lab.${kind}.v1`, initial(kind), (raw) => restore(kind, raw)); stores.set(kind, s); }
  return s;
}
const modeName = (m: Mode) => m === 'real' ? '내 실제 기록' : '가상 데모';
const draftRow = (kind: Kind): Row => isChecklist(kind) ? checklistDraft(kind) : ({ ...Object.fromEntries(FIELDS[kind].map((k) => [k, ''])), alias: { ir: 'IR-A', 'ble-ad': 'BLE-A', interference: 'Radio-A', gps: 'GPS-A' }[kind as 'ir'], observation_status: 'observed', connection: 'not-checked', ...(kind === 'gps' ? { condition: '실내', fix: 'unchecked', timed_out: 'no' } : {}) });

function ModeSwitch({ kind }: { kind: Kind }) {
  const s = store(kind), { state, ready } = s.use(), id = useId();
  return (
    <fieldset className="mode-switch" disabled={!ready}>
      <legend>지금 다루는 자료</legend>
      <div className="seg">
        {(['real', 'demo'] as const).map((m) => <span key={m} style={{ display: 'contents' }}><input id={`${id}-${m}`} name={id} type="radio" checked={state.mode === m} onChange={() => s.set((st) => ({ ...st, mode: m }))} /><label htmlFor={`${id}-${m}`}>{modeName(m)}</label></span>)}
      </div>
    </fieldset>
  );
}

function SaveLine({ kind }: { kind: Kind }) {
  const { state, ready, blocked, message } = store(kind).use();
  return <p className={blocked ? 'save-state save-state--error' : 'save-state'} role="status">{!ready ? '저장 자료를 확인하는 중입니다.' : blocked ? '자동 저장이 멈췄습니다. CSV를 내려받아 보관하세요.' : `이 브라우저에만 저장합니다. 실제 기록 ${state.rows.filter((r) => r.data_type === 'real').length}행, 데모 ${state.rows.filter((r) => r.data_type === 'demo').length}행.`} {message}</p>;
}

/** 한 번의 관찰을 입력하고 기록 표를 본다. */
export function FieldRecord({ kind, golden, help = {} }: { kind: Kind; golden: Row[]; help?: Record<string, string> }) {
  const s = store(kind), { state, ready } = s.use();
  const [draft, setDraft] = useState(() => draftRow(kind));
  const [error, setError] = useState('');
  const base = useId();
  const rows = state.rows.filter((r) => r.data_type === state.mode);
  const set = (field: string, value: string) => setDraft((d) => ({ ...d, [field]: value }));
  return (
    <div className="lab-tool">
      <SaveLine kind={kind} />
      <ModeSwitch kind={kind} />
      <div className="btn-row">
        <button className="btn btn--quiet btn--small" type="button" disabled={!ready} onClick={() => { s.set((st) => ({ ...st, rows: [...st.rows.filter((r) => r.data_type !== 'demo'), ...golden.map((r) => ({ ...r }))], mode: 'demo' })); setError(''); }}>가상 골든 데이터 {golden.length}행으로 데모 시작</button>
        <span className="field__help">데모 행만 바꾸며 실제 기록은 그대로 둡니다.</span>
      </div>
      {kind === 'firmware' && <FileDigest onHash={(hash, name) => setDraft((d) => ({ ...d, actual_sha256: hash, file_name: name }))} />}
      <form className="record-form" noValidate onSubmit={(e) => {
        e.preventDefault();
        const row = makeRow(draft, state.mode), problem = validateRow(kind, row);
        if (problem) { setError(problem); return; }
        if (state.rows.length >= MAX_ROWS) { setError(`최대 ${MAX_ROWS}행입니다. CSV로 백업한 뒤 정리하세요.`); return; }
        s.set((st) => ({ ...st, rows: [...st.rows, row] }));
        setError(''); setDraft((d) => ({ ...d, note: '' }));
      }}>
        {groupFields(kind).map(([gid, legend, fields]) => (
          <fieldset className="record-form__group" key={gid} disabled={!ready}>
            <legend>{legend}</legend>
            <div className="fields fields--grid">
              {fields.map((field) => {
                const options = choices(kind, field), id = `${base}-${field}`;
                return (
                  <div className={`field${fieldMaxLength(field) > 80 ? ' span-all' : ''}`} key={field}>
                    <label htmlFor={id}>{LABELS[field]}</label>
                    {help[field] && <p className="field__help" id={`${id}-help`}>{help[field]}</p>}
                    {options
                      ? <select id={id} aria-describedby={help[field] ? `${id}-help` : undefined} value={draft[field]} onChange={(e) => set(field, e.target.value)}>{Object.entries(options).map(([v, l]) => <option value={v} key={v}>{l}</option>)}</select>
                      : <input id={id} aria-describedby={help[field] ? `${id}-help` : undefined} type={field === 'observed_at' ? 'datetime-local' : 'text'} value={draft[field]} maxLength={fieldMaxLength(field)} inputMode={['distance_m', 'rssi_dbm', 'ap_count', 'energy_value', 'satellites', 'wait_seconds'].includes(field) ? 'decimal' : undefined} onChange={(e) => set(field, e.target.value)} />}
                  </div>
                );
              })}
            </div>
          </fieldset>
        ))}
        <div className="btn-row">
          <button className="btn" disabled={!ready}>{modeName(state.mode)}에 한 행 추가</button>
          <p className={error ? 'status status--error' : 'status'} role="status">{error}</p>
        </div>
      </form>
      <div className="table-wrap" tabIndex={0} role="region" aria-label={`${modeName(state.mode)} 관찰 기록 표`}>
        <table>
          <caption>{modeName(state.mode)} {rows.length}행{state.mode === 'demo' ? '. 가상 값이며 실제 측정이 아닙니다.' : ''}</caption>
          <thead><tr><th scope="col">순서</th>{FIELDS[kind].map((k) => <th scope="col" key={k}>{LABELS[k]}</th>)}<th scope="col"><span className="sr">정리</span></th></tr></thead>
          <tbody>
            {rows.length ? rows.map((r, i) => (
              <tr key={r.id}><td>{i + 1}</td>{FIELDS[kind].map((k) => <td key={k}>{choices(kind, k)?.[r[k]] ?? (r[k] || '빈 값')}</td>)}<td><button className="btn btn--quiet btn--small" type="button" onClick={() => { if (window.confirm('이 기록 한 행을 지울까요? 먼저 CSV 백업을 권장합니다.')) s.set((st) => ({ ...st, rows: st.rows.filter((v) => v.id !== r.id) })); }}>지우기</button></td></tr>
            )) : <tr><td colSpan={FIELDS[kind].length + 2}>아직 기록이 없습니다. 위 양식으로 첫 관찰을 적거나 골든 데이터로 데모를 시작하세요.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** 지금 구분(실제 또는 데모)의 계산 결과. Colab 코드와 같은 항목을 같은 방식으로 센다. */
export function FieldAnalysis({ kind }: { kind: Kind }) {
  const { state } = store(kind).use();
  const rows = state.rows.filter((r) => r.data_type === state.mode);
  return <div className="lab-tool"><ModeSwitch kind={kind} /><SummaryTable rows={summaryRows(kind, rows)} total={rows.length} caption={`${modeName(state.mode)}의 계산 결과${state.mode === 'demo' ? ' (가상 값)' : ''}`} /></div>;
}

export function FieldNotes({ kind, fields }: { kind: Kind; fields: NoteGuide[] }) {
  const s = store(kind), { state, ready } = s.use();
  return <NotesEditor fields={fields} disabled={!ready} modeLabel={modeName(state.mode)} values={state.notes[state.mode]} onChange={(key, value) => s.set((st) => ({ ...st, notes: { ...st.notes, [st.mode]: { ...st.notes[st.mode], [key]: value } } }))} />;
}

export function FieldData({ kind }: { kind: Kind }) {
  const s = store(kind), { state, ready } = s.use();
  const [pending, setPending] = useState<ReturnType<typeof readRowsCsv> | null>(null);
  const [message, setMessage] = useState('');
  const id = useId();
  return (
    <div className="lab-tool">
      <div className="btn-row"><button className="btn" type="button" disabled={!ready} onClick={() => downloadFile(`${kind}-observations.csv`, rowsCsv(kind, state.rows, state.notes))}>관찰과 서술 CSV 내려받기</button></div>
      <p className="field__help">실제와 데모 기록, 두 구분의 서술이 한 파일에 들어갑니다. data_type 열로 구분합니다.</p>
      <div className="field">
        <label htmlFor={id}>이 워크북 CSV 가져오기(1MB 이하)</label>
        <input id={id} type="file" accept=".csv,text/csv" disabled={!ready} onChange={async (e) => {
          setPending(null); const file = e.target.files?.[0]; if (!file) return;
          try { if (file.size > 1024 * 1024) throw new Error('1MB 이하 파일을 선택하세요.'); setPending(readRowsCsv(kind, await file.text())); }
          catch (error) { setMessage((error as Error).message); }
          e.target.value = '';
        }} />
      </div>
      {pending && <div className="callout">
        <p>올바른 관찰 {pending.rows.length}행, 오류 {pending.errors.length}행, 서술 구분 {Object.keys(pending.notes).map((m) => modeName(m as Mode)).join(', ') || '없음'}.</p>
        {pending.errors.length > 0 && <ul className="small">{pending.errors.slice(0, 8).map((e, i) => <li key={i}>{e}</li>)}</ul>}
        <div className="btn-row">
          <button className="btn btn--small" type="button" onClick={() => {
            const known = new Set(state.rows.map((r) => r.id)), fresh = pending.rows.filter((r) => !known.has(r.id));
            if (state.rows.length + fresh.length > MAX_ROWS) { setMessage(`${MAX_ROWS}행을 넘어 반영하지 않았습니다.`); return; }
            s.set((st) => ({ ...st, rows: [...st.rows, ...fresh], notes: { real: { ...st.notes.real, ...pending.notes.real }, demo: { ...st.notes.demo, ...pending.notes.demo } } }));
            setMessage(`${fresh.length}행 추가, 같은 ID ${pending.rows.length - fresh.length}행은 기존 기록 유지, 오류 ${pending.errors.length}행 제외. 가져온 서술을 반영했습니다.`); setPending(null);
          }}>올바른 행과 서술 반영</button>
          <button className="btn btn--quiet btn--small" type="button" onClick={() => setPending(null)}>취소</button>
        </div>
      </div>}
      <p className="status" role="status">{message}</p>
    </div>
  );
}

/** 학생의 서술과 지금 구분의 기록·계산 결과로 만든 보고서. */
export function FieldReport({ kind, title, labels }: { kind: Kind; title: string; labels: Partial<Record<NoteKey, string>> }) {
  const { state } = store(kind).use();
  const [date, setDate] = useState('(열어 본 날)');
  const [message, setMessage] = useState('');
  useEffect(() => setDate(new Date().toLocaleDateString('sv')), []);
  const rows = state.rows.filter((r) => r.data_type === state.mode);
  const report = buildFieldReport(kind, title, rows, state.notes[state.mode], state.mode, date, labels);
  const empty = NOTE_KEYS.filter((k) => !state.notes[state.mode][k]?.trim()).length;
  return (
    <div className="lab-tool">
      <ModeSwitch kind={kind} />
      <p className="field__help">미작성 {empty}개 항목은 보고서에 (미작성)으로 표시됩니다. 데모 보고서는 실제 실험 보고서로 제출하지 않습니다.</p>
      <div className="btn-row">
        <button className="btn" type="button" onClick={() => downloadFile(`${kind}-${state.mode}-report.md`, report, 'text/markdown;charset=utf-8')}>보고서 Markdown 내려받기</button>
        <button className="btn btn--quiet" type="button" onClick={async () => { try { await navigator.clipboard.writeText(report); setMessage('보고서를 복사했습니다.'); } catch { setMessage('복사하지 못했습니다. 파일로 내려받으세요.'); } }}>보고서 복사</button>
        <p className="status" role="status">{message}</p>
      </div>
      <pre className="report-preview" tabIndex={0} aria-label="보고서 미리보기">{report}</pre>
    </div>
  );
}

/** 현장 기록 워크북은 실제와 데모의 서술을 따로 둔다. 데모 서술의 답은 실제 기록을 근거로 삼지 않는다. */
export function FieldInterview({ kind, ...props }: InterviewProps & { kind: Kind }) {
  const s = store(kind), { state, ready } = s.use();
  const mode = state.mode, n = state.notes[mode];
  const real = state.rows.filter((r) => r.data_type === 'real');
  const own = mode === 'real' ? real : [];
  const lost = own.filter((r) => r.observation_status === 'not-observed').length, skipped = own.filter((r) => r.observation_status === 'unchecked').length;
  return <InterviewPrep {...props} values={n} disabled={!ready} modeLabel={modeName(mode)} file={`${kind}-${mode}-interview.md`}
    set={(patch) => s.set((st) => ({ ...st, notes: { ...st.notes, [st.mode]: { ...st.notes[st.mode], ...patch } } }))} ctx={{
      mode, storage: `${modeName(mode)}의 서술(이 브라우저, 다른 구분과 따로 저장)`, realCount: own.length, viewCount: state.rows.filter((r) => r.data_type === mode).length,
      gap: [lost && `관찰되지 않음 ${lost}건`, skipped && `측정하지 못함 ${skipped}건`].filter(Boolean).join(', '),
      summary: [['탐구 질문', n.question], ['가설', n.hypothesis], ['고정 조건과 반복', n.controls], ['결론', n.conclusion], ['한계', n.limits]],
      calc: own.length ? summaryRows(kind, own) : [],
    }} />;
}
