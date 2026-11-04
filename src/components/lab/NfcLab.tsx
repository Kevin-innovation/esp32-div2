import { useEffect, useId, useRef, useState, type ChangeEvent, type SyntheticEvent } from 'react';
import {
  CONDITION_ORDER,
  CSV_FILENAME,
  EMPTY_NOTE,
  MAX_BYTES,
  NOTE_KEYS,
  ORIENTATIONS,
  aggregate,
  buildReport,
  crossTab,
  designWarnings,
  fraction,
  importCsv,
  notebookJson,
  notesToCsv,
  percent,
  pythonScript,
  reportToMarkdown,
  trialsToCsv,
  validateTrial,
  type Block,
  type GroupBy,
  type Imported,
  type Trial,
} from '../../lib/nfc';
import { addTrial, clearDemo, clearReal, download, importNotes, importTrials, loadDemo, removeTrial, restoreTrial, setNote, setView, useLab, visibleTrials } from './store';

const MAX_LIST = 200;
const MAX_GROUPS = 30;

/* 저장 상태 ---------------------------------------------------------------- */

export function SaveState() {
  const { saveError, loadWarning, trials } = useLab();
  return (
    <div role="status" aria-live="polite">
      {saveError ? (
        <p className="save-state save-state--error">{saveError}</p>
      ) : (
        <p className="save-state">입력한 내용은 서버로 보내지 않고 이 브라우저에만 저장합니다. 지금 저장된 기록 {trials.filter((t) => t.dataType === 'real').length}건.</p>
      )}
      {loadWarning && <p className="save-state save-state--error">{loadWarning}</p>}
    </div>
  );
}

/* 서술 입력칸 -------------------------------------------------------------- */

export interface NoteField {
  key: string;
  label: string;
  help?: string;
  rows?: number;
  placeholder?: string;
}

export function NoteFields({ fields }: { fields: NoteField[] }) {
  const { notes } = useLab();
  const base = useId();
  return (
    <div className="fields">
      {fields.map((f) => {
        const id = `${base}-${f.key}`;
        const helpId = f.help ? `${id}-help` : undefined;
        return (
          <div className="field" key={f.key}>
            <label htmlFor={id}>{f.label}</label>
            {f.help && <p className="field__help" id={helpId}>{f.help}</p>}
            <textarea id={id} rows={f.rows ?? 3} maxLength={4000} aria-describedby={helpId} placeholder={f.placeholder} value={notes[f.key] ?? ''} onChange={(e) => setNote(f.key, e.target.value)} />
          </div>
        );
      })}
    </div>
  );
}

/* 결과 입력 ---------------------------------------------------------------- */

function ViewSwitch() {
  const s = useLab();
  const name = useId();
  const hasDemo = s.trials.some((t) => t.dataType === 'demo');
  if (!hasDemo) return null;
  return (
    <fieldset>
      <legend>보고 있는 자료</legend>
      <div className="seg">
        <input type="radio" id={`${name}-real`} name={name} checked={s.view === 'real'} onChange={() => setView('real')} />
        <label htmlFor={`${name}-real`}>내 실제 기록</label>
        <input type="radio" id={`${name}-demo`} name={name} checked={s.view === 'demo'} onChange={() => setView('demo')} />
        <label htmlFor={`${name}-demo`}>데모 자료</label>
      </div>
    </fieldset>
  );
}

function DemoNote() {
  const { view } = useLab();
  if (view !== 'demo') return null;
  return <p className="demo-note">지금 보는 값은 데모 자료(가상 값)입니다. 실제 측정 결과가 아닙니다.</p>;
}

export function Records() {
  const s = useLab();
  const rows = visibleTrials(s);
  const realCount = s.trials.filter((t) => t.dataType === 'real').length;
  const [condition, setCondition] = useState('단독');
  const [contents, setContents] = useState('');
  const [distance, setDistance] = useState('1');
  const [orientation, setOrientation] = useState('평행');
  const [success, setSuccess] = useState<'1' | '0' | ''>('');
  const [note, setNoteText] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [undo, setUndo] = useState<Trial | null>(null);
  const base = useId();
  const successRef = useRef<HTMLInputElement>(null);

  const sameSetup = s.trials.filter((t) => t.dataType === 'real' && t.condition === condition.trim() && t.contents === contents.trim() && t.distanceCm === Number(distance) && t.orientation === orientation.trim());
  const nextTrial = sameSetup.reduce((max, t) => Math.max(max, t.trial), 0) + 1;

  const submit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!success) {
      setError('인식 결과를 골라 주세요.');
      successRef.current?.focus();
      return;
    }
    const t = validateTrial({ trial: String(nextTrial), condition, contents, distance_cm: distance, orientation, success, note }, 'real');
    if (typeof t === 'string') {
      setError(t.replace('condition은', '조건은').replace('distance_cm은', '거리는').replace('orientation은', '방향은').replace('contents는', '내용물은').replace('note는', '관찰은'));
      return;
    }
    addTrial(t);
    setError('');
    setMessage(`${t.condition} ${t.distanceCm}cm ${t.trial}회차를 기록했습니다.`);
    setSuccess('');
    setNoteText('');
    setUndo(null);
    successRef.current?.focus();
  };

  const remove = (t: Trial) => {
    setUndo(t);
    removeTrial(t.id);
    setMessage('기록 1건을 지웠습니다.');
  };

  return (
    <div className="fields">
      <form onSubmit={submit} noValidate className="fields">
        <div className="fields fields--grid">
          <div className="field">
            <label htmlFor={`${base}-c`}>조건</label>
            <input id={`${base}-c`} type="text" list={`${base}-cl`} maxLength={40} value={condition} onChange={(e) => setCondition(e.target.value)} />
            <datalist id={`${base}-cl`}>{CONDITION_ORDER.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div className="field">
            <label htmlFor={`${base}-k`}>내용물</label>
            <input id={`${base}-k`} type="text" maxLength={40} placeholder="예: 빈 지갑, 플라스틱 카드 3장" value={contents} onChange={(e) => setContents(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor={`${base}-d`}>거리(cm)</label>
            <input id={`${base}-d`} type="number" inputMode="decimal" min={0} max={100} step={0.5} value={distance} onChange={(e) => setDistance(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor={`${base}-o`}>방향</label>
            <input id={`${base}-o`} type="text" list={`${base}-ol`} maxLength={40} value={orientation} onChange={(e) => setOrientation(e.target.value)} />
            <datalist id={`${base}-ol`}>{ORIENTATIONS.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <fieldset className="span-all">
            <legend>인식 결과 (이 설정의 {nextTrial}회차)</legend>
            <div className="seg">
              <input ref={successRef} type="radio" id={`${base}-s1`} name={`${base}-s`} checked={success === '1'} onChange={() => setSuccess('1')} />
              <label htmlFor={`${base}-s1`}>인식됨</label>
              <input type="radio" id={`${base}-s0`} name={`${base}-s`} checked={success === '0'} onChange={() => setSuccess('0')} />
              <label htmlFor={`${base}-s0`}>인식 안 됨</label>
            </div>
          </fieldset>
          <div className="field span-all">
            <label htmlFor={`${base}-n`}>관찰</label>
            <input id={`${base}-n`} type="text" maxLength={500} placeholder="눈으로 본 것만 적기. 예: 두 번째 시도에서 인식, 태그가 살짝 밀림" value={note} onChange={(e) => setNoteText(e.target.value)} />
          </div>
        </div>
        <div className="btn-row">
          <button className="btn" type="submit">기록 추가</button>
          <p className={error ? 'status status--error' : 'status'} role="status">{error || message}</p>
          {undo && (
            <button className="btn btn--quiet btn--small" type="button" onClick={() => { restoreTrial(undo); setUndo(null); setMessage('지운 기록을 되돌렸습니다.'); }}>
              되돌리기
            </button>
          )}
        </div>
      </form>

      <ViewSwitch />
      <DemoNote />

      {rows.length === 0 ? (
        <div className="empty">
          <p>아직 기록이 없습니다. 위 입력칸에 첫 시도를 적으면 표와 그래프가 함께 채워집니다.</p>
        </div>
      ) : (
        <div className="table-wrap" tabIndex={0} role="region" aria-label="입력한 실험 기록">
          <table>
            <caption>
              전체 {rows.length}건{rows.length > MAX_LIST ? `, 화면에는 최근 ${MAX_LIST}건만 표시. CSV에는 전부 들어 있습니다.` : ''}
            </caption>
            <thead>
              <tr><th scope="col">회차</th><th scope="col">조건</th><th scope="col">내용물</th><th scope="col">거리</th><th scope="col">방향</th><th scope="col">결과</th><th scope="col">관찰</th><th scope="col"><span className="sr">지우기</span></th></tr>
            </thead>
            <tbody>
              {rows.slice(-MAX_LIST).map((t) => (
                <tr key={t.id}>
                  <td>{t.trial}</td>
                  <td>{t.condition}</td>
                  <td>{t.contents}</td>
                  <td>{t.distanceCm}cm</td>
                  <td>{t.orientation}</td>
                  <td>{t.success ? '인식됨' : '안 됨'}</td>
                  <td>{t.note}</td>
                  <td>
                    <button className="btn btn--quiet btn--small" type="button" onClick={() => remove(t)} aria-label={`${t.condition} ${t.distanceCm}cm ${t.trial}회차 지우기`}>지우기</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="btn-row">
        {s.trials.some((t) => t.dataType === 'demo') ? (
          <button className="btn btn--quiet btn--small" type="button" onClick={clearDemo}>데모 자료 지우기</button>
        ) : (
          <button className="btn btn--quiet btn--small" type="button" onClick={loadDemo}>화면 확인용 데모 자료 불러오기</button>
        )}
        {realCount > 0 && (
          <button
            className="btn btn--quiet btn--small"
            type="button"
            onClick={() => {
              if (window.confirm(`실제 기록 ${realCount}건을 모두 지울까요? 되돌릴 수 없으니 먼저 CSV로 백업하세요.`)) clearReal();
            }}
          >
            실제 기록 전부 지우기
          </button>
        )}
      </div>
      <p className="field__help">데모 자료는 동작을 보여 주는 가상 값입니다. 실제 기록과 섞이지 않고, 누를 때만 불러옵니다.</p>
    </div>
  );
}

/* 그래프 ------------------------------------------------------------------ */

const GROUP_LABEL: Record<GroupBy, string> = { condition: '조건', distanceCm: '거리', orientation: '방향', contents: '내용물' };

export function Chart() {
  const s = useLab();
  const rows = visibleTrials(s);
  const [by, setBy] = useState<GroupBy>('condition');
  const name = useId();
  const allGroups = aggregate(rows, by);
  const groups = allGroups.slice(0, MAX_GROUPS);
  const cross = crossTab(rows);
  const warnings = designWarnings(rows);

  return (
    <div className="fields">
      <fieldset>
        <legend>묶는 기준</legend>
        <div className="seg">
          {(Object.keys(GROUP_LABEL) as GroupBy[]).map((k) => (
            <span key={k} style={{ display: 'contents' }}>
              <input type="radio" id={`${name}-${k}`} name={name} checked={by === k} onChange={() => setBy(k)} />
              <label htmlFor={`${name}-${k}`}>{GROUP_LABEL[k]}</label>
            </span>
          ))}
        </div>
      </fieldset>
      <DemoNote />
      {rows.length === 0 ? (
        <div className="empty"><p>기록을 입력하면 {GROUP_LABEL[by]}별 인식률이 여기에 그려집니다.</p></div>
      ) : (
        <>
          <div className="table-wrap" tabIndex={0} role="region" aria-label="인식률 그래프">
          <table className="chart">
            <caption>{GROUP_LABEL[by]}별 인식률. 막대는 0%에서 시작하고 눈금은 25%입니다. {allGroups.length > MAX_GROUPS ? `묶음이 많아 앞 ${MAX_GROUPS}개만 표시합니다.` : ''}</caption>
            <thead>
              <tr><th scope="col">{GROUP_LABEL[by]}</th><th scope="col">인식률</th><th scope="col">성공/시도</th></tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.key}>
                  <th scope="row">{by === 'distanceCm' ? `${g.key}cm` : g.key}</th>
                  <td className="chart__bar"><div className="bar-track"><span className="bar-fill" style={{ width: `${g.rate * 100}%` }} /></div></td>
                  <td className="chart__value">{percent(g.rate)} ({fraction(g)})</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {cross ? (
            <div className="table-wrap" tabIndex={0} role="region" aria-label="조건과 거리 교차표">
              <table>
                <caption>조건과 거리를 함께 본 성공/시도. 빈칸은 하지 않은 조합입니다.</caption>
                <thead>
                  <tr><th scope="col">조건</th>{cross.distances.map((d) => <th scope="col" key={d}>{d}cm</th>)}</tr>
                </thead>
                <tbody>
                  {cross.rows.map((r) => (
                    <tr key={r.condition}>
                      <th scope="row">{r.condition}</th>
                      {r.cells.map((c, i) => <td key={i}>{c ? fraction(c) : ''}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="field__help">조건이나 거리 종류가 많아 교차표를 생략했습니다. 조건은 12개, 거리는 12개까지 표시합니다. 파이썬 분석에서는 전체를 볼 수 있습니다.</p>
          )}
          {warnings.length > 0 && (
            <div className="callout callout--warn">
              {warnings.map((w) => <p key={w}>{w}</p>)}
            </div>
          )}
          <p className="field__help">이 수치는 직접 입력한 성공 여부를 센 것입니다. 사이트가 응답 시간이나 신호 세기를 재지는 않습니다.</p>
        </>
      )}
    </div>
  );
}

/* CSV -------------------------------------------------------------------- */

export function CsvPanel() {
  const s = useLab();
  const [pending, setPending] = useState<Imported | null>(null);
  const [message, setMessage] = useState('');
  const [fileKey, setFileKey] = useState(0);
  const id = useId();

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setMessage('');
    setPending(null);
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setPending({ kind: 'invalid', errors: [{ line: 0, message: '파일이 1MB보다 큽니다.' }] });
      return;
    }
    try {
      setPending(importCsv(await file.text(), NOTE_KEYS));
    } catch {
      setPending({ kind: 'invalid', errors: [{ line: 0, message: '파일을 읽지 못했습니다. 다시 골라 주세요.' }] });
    }
  };

  const finish = (text: string) => {
    setMessage(text);
    setPending(null);
    setFileKey((k) => k + 1);
  };

  const applyTrials = (replace: boolean) => {
    if (pending?.kind !== 'trials') return;
    const realCount = s.trials.length;
    if (replace && realCount && !window.confirm(`지금 있는 기록 ${realCount}건을 지우고 파일 내용으로 바꿀까요?`)) return;
    const r = importTrials(pending.trials, replace);
    finish(`${r.added}건을 가져왔습니다.${r.skipped ? ` 완전히 같은 ${r.skipped}건은 건너뛰었습니다.` : ''}`);
  };

  return (
    <div className="fields">
      <div>
        <h3>내보내기</h3>
        <div className="btn-row" style={{ marginTop: 'var(--space-xs)' }}>
          <button className="btn btn--small" type="button" disabled={!s.trials.length} onClick={() => download(CSV_FILENAME, trialsToCsv(s.trials), 'text/csv;charset=utf-8')}>실험 기록 CSV 내려받기</button>
          <button className="btn btn--quiet btn--small" type="button" onClick={() => download('nfc-notes.csv', notesToCsv(s.notes), 'text/csv;charset=utf-8')}>탐구 서술 CSV 내려받기</button>
        </div>
        {!s.trials.length && <p className="field__help">기록을 입력하면 실험 기록 CSV를 내려받을 수 있습니다.</p>}
      </div>
      <div className="field">
        <label htmlFor={id}>CSV 가져오기</label>
        <p className="field__help">이 사이트에서 내려받은 파일이나 같은 열을 가진 파일을 고르세요. 머리글로 실험 기록과 탐구 서술을 구분합니다. 고른 뒤 확인을 눌러야 반영됩니다.</p>
        <input key={fileKey} id={id} type="file" accept=".csv,text/csv" onChange={onFile} />
      </div>
      {pending && (
        <div className={pending.kind === 'invalid' ? 'callout callout--warn' : 'callout'}>
          {pending.kind === 'invalid' && <p><strong>가져올 수 없습니다.</strong></p>}
          {pending.kind === 'trials' && <p><strong>올바른 기록 {pending.trials.length}건{pending.errors.length ? `, 건너뛸 행 ${pending.errors.length}개` : ''}.</strong></p>}
          {pending.kind === 'notes' && <p><strong>탐구 서술 {Object.keys(pending.notes).length}개 항목{pending.errors.length ? `, 건너뛸 행 ${pending.errors.length}개` : ''}.</strong></p>}
          {pending.errors.length > 0 && (
            <ul className="small">
              {pending.errors.slice(0, 8).map((err, i) => <li key={i}>{err.line ? `${err.line}행: ` : ''}{err.message}</li>)}
              {pending.errors.length > 8 && <li>그 밖에 {pending.errors.length - 8}개</li>}
            </ul>
          )}
          <div className="btn-row">
            {pending.kind === 'trials' && pending.trials.length > 0 && (
              <>
                <button className="btn btn--small" type="button" onClick={() => applyTrials(false)}>기존 기록에 더하기</button>
                <button className="btn btn--quiet btn--small" type="button" onClick={() => applyTrials(true)}>기존 기록과 바꾸기</button>
              </>
            )}
            {pending.kind === 'notes' && Object.keys(pending.notes).length > 0 && (
              <button className="btn btn--small" type="button" onClick={() => { if (pending.kind === 'notes') { importNotes(pending.notes); finish('탐구 서술을 가져왔습니다.'); } }}>서술 가져오기</button>
            )}
            <button className="btn btn--quiet btn--small" type="button" onClick={() => finish('')}>취소</button>
          </div>
        </div>
      )}
      <p className="status" role="status">{message}</p>
    </div>
  );
}

/* 파이썬 ------------------------------------------------------------------ */

export function PythonPanel() {
  const [message, setMessage] = useState('');
  const code = pythonScript();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setMessage('코드를 복사했습니다.');
    } catch {
      setMessage('복사하지 못했습니다. 코드 파일을 내려받으세요.');
    }
  };
  return (
    <div className="fields">
      <div className="btn-row">
        <button className="btn btn--small" type="button" onClick={() => download('nfc-analysis.ipynb', notebookJson(), 'application/x-ipynb+json')}>분석 노트북 내려받기</button>
        <button className="btn btn--quiet btn--small" type="button" onClick={() => download('nfc-analysis.py', code, 'text/x-python;charset=utf-8')}>파이썬 파일 내려받기</button>
        <button className="btn btn--quiet btn--small" type="button" onClick={copy}>코드 복사</button>
        <p className="status" role="status">{message}</p>
      </div>
      <pre className="code" tabIndex={0} aria-label="파이썬 분석 코드"><code>{code}</code></pre>
    </div>
  );
}

/* 보고서 ------------------------------------------------------------------ */

function RenderBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'h1': return <h1 key={i}>{b.text}</h1>;
          case 'h2': return <h2 key={i}>{b.text}</h2>;
          case 'warn': return <p key={i} className="demo-note">{b.text}</p>;
          case 'p': return <p key={i} style={{ whiteSpace: 'pre-wrap' }} className={b.text.endsWith(EMPTY_NOTE) ? 'muted' : undefined}>{b.text}</p>;
          case 'list': return <ul key={i}>{b.items.map((t, j) => <li key={j}>{t}</li>)}</ul>;
          case 'table':
            return (
              <div className="table-wrap" key={i}>
                <table>
                  <thead><tr>{b.head.map((h) => <th scope="col" key={h}>{h}</th>)}</tr></thead>
                  <tbody>{b.rows.slice(0, MAX_LIST).map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody>
                </table>
                {b.rows.length > MAX_LIST && <p className="field__help">표가 길어 앞 {MAX_LIST}행만 표시합니다. Markdown 파일에는 전부 들어 있습니다.</p>}
              </div>
            );
        }
      })}
    </>
  );
}

export function Report({ sources }: { sources: { title: string; url: string }[] }) {
  const s = useLab();
  const trials = visibleTrials(s);
  const [date, setDate] = useState('(열어 본 날)');
  useEffect(() => setDate(new Date().toLocaleDateString('sv')), []);
  const blocks = buildReport({ trials, notes: s.notes, dataType: s.view, date, sources });
  return (
    <div className="fields">
      <ViewSwitch />
      <div className="btn-row">
        <button className="btn" type="button" onClick={() => download(s.view === 'demo' ? 'nfc-report-demo.md' : 'nfc-report.md', reportToMarkdown(blocks), 'text/markdown;charset=utf-8')}>Markdown 내려받기</button>
        <button className="btn btn--quiet" type="button" onClick={() => window.print()}>인쇄하기</button>
      </div>
      <article className="report" aria-label="보고서 미리보기">
        <RenderBlocks blocks={blocks} />
      </article>
    </div>
  );
}

/* 자소서·면접 -------------------------------------------------------------- */

export function Interview() {
  const s = useLab();
  const real = s.trials.filter((t) => t.dataType === 'real');
  const groups = aggregate(real, 'condition');
  const low = groups.length > 1 ? [...groups].sort((a, b) => a.rate - b.rate)[0] : null;
  const high = groups.length > 1 ? [...groups].sort((a, b) => b.rate - a.rate)[0] : null;
  const base = useId();

  const items = [
    { key: 'q_curiosity', title: '궁금한 점', q: '왜 이 질문이 궁금했나요? 어떤 장면에서 시작했나요?', tip: '“NFC에 관심이 있었다”보다 직접 겪은 장면을 먼저 쓰세요.' },
    { key: 'q_design', title: '설계 이유', q: '왜 그 변수를 고르고 나머지는 고정했나요? 반복 횟수는 왜 그만큼인가요?', tip: '다른 방법을 버린 이유까지 말하면 설계를 직접 했다는 점이 드러납니다.' },
    {
      key: 'q_unexpected',
      title: '예상 밖 결과',
      q: low && high ? `내 기록에서 ${high.key}는 ${percent(high.rate)}(${fraction(high)}), ${low.key}는 ${percent(low.rate)}(${fraction(low)})입니다. 이 차이가 가설과 맞나요? 다르다면 무엇을 먼저 의심했나요?` : '예상과 다른 결과가 나왔다면 무엇을 먼저 의심했나요? 기록을 두 조건 이상 입력하면 이 질문에 내 수치가 들어갑니다.',
      tip: '예상과 달랐던 결과는 약점이 아니라 가장 좋은 답변 재료입니다.',
    },
    { key: 'q_verify', title: '검증', q: '그 원인 후보를 어떻게 확인했나요? 무엇을 바꿔 다시 실험했나요?', tip: '하지 않은 재실험은 쓰지 말고, 하려던 계획이라고 구분해 쓰세요.' },
    { key: 'q_limit', title: '한계', q: '이 실험으로 말할 수 없는 것은 무엇인가요? 신용카드 보안에 대해 이 결과로 결론 내릴 수 있나요?', tip: '일반 태그 실험은 EMV 결제 보안을 검증한 것이 아닙니다. 이 구분을 말할 수 있어야 합니다.' },
  ];

  return (
    <ol className="iv">
      {items.map((it) => (
        <li key={it.key}>
          <h3>{it.title}</h3>
          <p>{it.q}</p>
          <p className="field__help">{it.tip}</p>
          <div className="field">
            <label htmlFor={`${base}-${it.key}`} className="sr">{it.title} 답변 메모</label>
            <textarea id={`${base}-${it.key}`} rows={3} maxLength={4000} placeholder="내 답변 메모" value={s.notes[it.key] ?? ''} onChange={(e) => setNote(it.key, e.target.value)} />
          </div>
        </li>
      ))}
    </ol>
  );
}
