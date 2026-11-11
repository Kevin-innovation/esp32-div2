import { useEffect, useId, useState } from 'react';
import { downloadFile } from '../../lib/fieldwork';
import { buildCsvReport, csvSummary, defaultActions, pseudonymize, readSource, type Action, type CsvSource } from '../../lib/pseudonym';
import { persisted } from './labStore';
import { NotesEditor, type NoteGuide } from './NotesEditor';
import { SummaryTable } from './SummaryTable';

type Mode = 'real' | 'demo';
const KEYS = ['question', 'hypothesis', 'controls', 'interpretation', 'conclusion', 'defense', 'limits', 'application', 'explain'];
// 이전 버전 서술 항목을 새 항목으로 옮긴다.
const LEGACY: Record<string, string> = { rationale: 'controls', risk: 'interpretation', recovery: 'conclusion' };
interface Work { original: string; actions: Action[]; notes: Record<string, string>; checked: boolean }
interface State { work: Record<Mode, Work>; mode: Mode }
const blank = (): Work => ({ original: '', actions: [], notes: Object.fromEntries(KEYS.map((k) => [k, ''])), checked: false });
const KEY = 'esp32div.lab.csv.v1';

const store = persisted<State>(KEY, { work: { real: blank(), demo: blank() }, mode: 'real' }, (raw) => {
  const saved = JSON.parse(raw);
  if (saved?.schemaVersion !== 1 || saved.workbookId !== 'csv') throw new Error('형식');
  const work = { real: blank(), demo: blank() };
  for (const m of ['real', 'demo'] as const) {
    const w = saved.work?.[m];
    if (typeof w?.original !== 'string' || typeof w.checked !== 'boolean' || !Array.isArray(w.actions)) throw new Error('작업');
    if (w.original) pseudonymize(readSource(w.original), w.actions);
    for (const [k, v] of Object.entries(w.notes ?? {})) {
      if (typeof v !== 'string' || v.length > 4000) throw new Error('서술');
      const key = LEGACY[k] ?? k;
      if (KEYS.includes(key)) work[m].notes[key] = work[m].notes[key] ? `${work[m].notes[key]}\n${v}` : v;
    }
    work[m] = { ...work[m], original: w.original, actions: w.actions, checked: w.checked };
  }
  return { state: { work, mode: saved.mode === 'demo' ? 'demo' : 'real' } };
});
// 저장 형식은 이전 버전과 같은 바깥 구조를 유지한다.
const save = (update: (s: State) => State) => store.set((s) => ({ ...update(s), schemaVersion: 1, workbookId: 'csv' }) as State);

function useCsv() {
  const snap = store.use();
  const current = snap.state.work[snap.state.mode];
  let source: CsvSource | null = null, output: ReturnType<typeof pseudonymize> | null = null, error = '';
  try { if (current.original) { source = readSource(current.original); output = pseudonymize(source, current.actions); } } catch (e) { error = (e as Error).message; }
  const update = (patch: Partial<Work>) => save((s) => ({ ...s, work: { ...s.work, [s.mode]: { ...s.work[s.mode], ...patch } } }));
  return { ...snap, current, source, output, error, update };
}

function ModeSwitch() {
  const { state, ready } = store.use(), id = useId();
  return (
    <fieldset className="mode-switch" disabled={!ready}>
      <legend>지금 다루는 자료</legend>
      <div className="seg">
        {(['real', 'demo'] as const).map((m) => <span key={m} style={{ display: 'contents' }}><input id={`${id}-${m}`} name={id} type="radio" checked={state.mode === m} onChange={() => save((s) => ({ ...s, mode: m }))} /><label htmlFor={`${id}-${m}`}>{m === 'real' ? '직접 준비한 자료' : '가상 데모'}</label></span>)}
      </div>
    </fieldset>
  );
}

/** 원본 CSV를 가져오거나 골든 데이터로 데모를 시작한다. 원본 파일은 바꾸지 않는다. */
export function CsvSourcePart({ golden }: { golden: { original: string; actions: Action[] } }) {
  const { ready, blocked, message, error } = useCsv();
  const [pending, setPending] = useState<{ text: string; source: CsvSource } | null>(null);
  const [note, setNote] = useState('');
  const id = useId();
  return (
    <div className="lab-tool">
      <p className={blocked ? 'save-state save-state--error' : 'save-state'} role="status">{!ready ? '저장 자료를 확인하는 중입니다.' : '원본, 열별 처리, 서술을 이 브라우저에만 저장합니다. 서버로 보내지 않습니다.'} {message} {error}</p>
      <ModeSwitch />
      <div className="btn-row"><button className="btn btn--quiet btn--small" type="button" disabled={!ready} onClick={() => save((s) => ({ ...s, mode: 'demo', work: { ...s.work, demo: { ...blank(), notes: s.work.demo.notes, original: golden.original, actions: [...golden.actions] } } }))}>가상 골든 데이터로 데모 시작</button><span className="field__help">데모 작업만 바꾸며, 데모 서술은 그대로 둡니다.</span></div>
      <div className="field">
        <label htmlFor={id}>지금 구분으로 가져올 CSV(1MB, 1000행, 30열 이하, UTF-8 머리글)</label>
        <input id={id} type="file" accept=".csv,text/csv" disabled={!ready} onChange={async (e) => {
          setPending(null); const f = e.target.files?.[0]; if (!f) return;
          try { if (f.size > 1024 * 1024) throw new Error('1MB 이하 파일을 선택하세요.'); const text = await f.text(); setPending({ text, source: readSource(text) }); }
          catch (err) { setNote((err as Error).message); }
          e.target.value = '';
        }} />
      </div>
      {pending && <div className="callout">
        <p>가져올 자료: {pending.source.header.length}열, 올바른 행 {pending.source.rows.length}, 오류 행 {pending.source.errors.length}.</p>
        {pending.source.errors.length > 0 && <ul className="small">{pending.source.errors.slice(0, 8).map((x, i) => <li key={i}>{x}</li>)}</ul>}
        <p>열: {pending.source.header.join(', ')}</p>
        <div className="btn-row">
          <button className="btn btn--small" type="button" onClick={() => { save((s) => ({ ...s, work: { ...s.work, [s.mode]: { ...blank(), notes: s.work[s.mode].notes, original: pending.text, actions: defaultActions(pending.source.header) } } })); setPending(null); setNote('원본은 그대로 두고 새 작업을 시작했습니다. 열별 처리는 자동 제안이니 다음 장에서 검토하세요.'); }}>지금 구분 작업으로 가져오기</button>
          <button className="btn btn--quiet btn--small" type="button" onClick={() => setPending(null)}>취소</button>
        </div>
      </div>}
      <p className="status" role="status">{note}</p>
    </div>
  );
}

/** 열마다 유지, 가명, 제거를 고르고 원본과 가명본을 대조한다. */
export function CsvWorkPart() {
  const { current, source, output, update, state } = useCsv();
  if (!source) return <div className="lab-tool"><ModeSwitch /><p className="empty">원본을 가져오거나 골든 데이터로 데모를 시작하면 열별 처리와 대조 결과가 나타납니다.</p></div>;
  return (
    <div className="lab-tool">
      <ModeSwitch />
      <fieldset className="record-form__group">
        <legend>열별 처리</legend>
        <div className="fields fields--grid">
          {source.header.map((h, i) => <div className="field" key={h}><label htmlFor={`csv-action-${i}`}>{h}</label><select id={`csv-action-${i}`} value={current.actions[i]} onChange={(e) => update({ actions: current.actions.map((a, n) => (n === i ? e.target.value as Action : a)), checked: false })}><option value="keep">그대로 유지</option><option value="alias">열별 가명으로 교체</option><option value="remove">공유본에서 제거</option></select></div>)}
        </div>
      </fieldset>
      {output && <SummaryTable rows={csvSummary(source, output)} total={0} caption={`${state.mode === 'real' ? '직접 준비한 자료' : '가상 데모'}의 원본과 가명본 대조`} />}
      {[{ label: '원본 미리보기(최대 5행)', data: source }, ...(output ? [{ label: '가명본 미리보기(최대 5행)', data: output }] : [])].map(({ label, data }) => (
        <div className="table-wrap" tabIndex={0} role="region" aria-label={label} key={label}>
          <table><caption>{label}</caption><thead><tr>{data.header.map((h) => <th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{data.rows.slice(0, 5).map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v || '빈 값'}</td>)}</tr>)}</tbody></table>
        </div>
      ))}
    </div>
  );
}

export function CsvExportPart() {
  const { current, output, update, state, ready } = useCsv();
  const [note, setNote] = useState('');
  return (
    <div className="lab-tool">
      <label className="check"><input type="checkbox" checked={current.checked} disabled={!ready || !output} onChange={(e) => update({ checked: e.target.checked })} /> 남은 열의 조합(장소, 시각, 서술)으로 사람이나 기기를 짐작할 수 있는지 직접 점검했습니다</label>
      <div className="btn-row">
        <button className="btn btn--quiet" type="button" disabled={!current.original} onClick={() => downloadFile(`csv-${state.mode}-original.csv`, current.original)}>원본 사본 내려받기</button>
        <button className="btn" type="button" disabled={!output || !current.checked} onClick={() => output && downloadFile(`csv-${state.mode}-pseudonymized.csv`, output.csv)}>가명본 내려받기</button>
      </div>
      <p className="field__help">원본 사본은 선택한 내용 그대로입니다. 가명본은 수식처럼 보이는 글 앞에 작은따옴표를 붙여 저장합니다. 가명 대응표는 어떤 파일에도 넣지 않으므로, 가명본만으로 원래 값을 되살릴 수 없습니다.</p>
      <button className="btn btn--quiet btn--small" type="button" onClick={() => { if (!window.confirm('이 워크북의 브라우저 저장 자료를 지울까요? 내려받은 파일은 남습니다.')) return; try { Object.keys(localStorage).filter((k) => k === KEY || k.startsWith(`${KEY}.broken.`)).forEach((k) => localStorage.removeItem(k)); save(() => ({ work: { real: blank(), demo: blank() }, mode: 'real' })); setNote('브라우저 저장 자료를 지웠습니다.'); } catch { setNote('저장 자료를 지우지 못했습니다. 브라우저 설정에서 이 사이트 저장 자료를 확인하세요.'); } }}>이 워크북의 브라우저 저장 지우기(공용 PC)</button>
      <p className="status" role="status">{note}</p>
    </div>
  );
}

export function CsvNotesPart({ fields }: { fields: NoteGuide[] }) {
  const { current, update, ready, state } = useCsv();
  return <NotesEditor fields={fields} disabled={!ready} modeLabel={state.mode === 'real' ? '직접 준비한 자료' : '가상 데모'} values={current.notes} onChange={(k, v) => update({ notes: { ...current.notes, [k]: v } })} />;
}

export function CsvReportPart({ title, labels }: { title: string; labels: Record<string, string> }) {
  const { current, source, state } = useCsv();
  const [date, setDate] = useState('(열어 본 날)');
  const [message, setMessage] = useState('');
  useEffect(() => setDate(new Date().toLocaleDateString('sv')), []);
  const report = buildCsvReport(title, source, current.actions, current.notes, labels, state.mode, current.checked, date);
  const empty = KEYS.filter((k) => !current.notes[k]?.trim()).length;
  return (
    <div className="lab-tool">
      <ModeSwitch />
      <p className="field__help">미작성 {empty}개 항목은 보고서에 (미작성)으로 표시됩니다. 데모 보고서는 실제 활동 보고서로 제출하지 않습니다.</p>
      <div className="btn-row">
        <button className="btn" type="button" onClick={() => downloadFile(`csv-${state.mode}-report.md`, report, 'text/markdown;charset=utf-8')}>보고서 Markdown 내려받기</button>
        <button className="btn btn--quiet" type="button" onClick={async () => { try { await navigator.clipboard.writeText(report); setMessage('보고서를 복사했습니다.'); } catch { setMessage('복사하지 못했습니다. 파일로 내려받으세요.'); } }}>보고서 복사</button>
        <p className="status" role="status">{message}</p>
      </div>
      <pre className="report-preview" tabIndex={0} aria-label="보고서 미리보기">{report}</pre>
    </div>
  );
}
