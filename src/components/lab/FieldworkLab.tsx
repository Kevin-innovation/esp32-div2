import { useEffect, useRef, useState } from 'react';
import { downloadFile, emptyNotes, FIELDS, makeRow, NOTE_LABELS, readRowsCsv, rowsCsv, validateRow, type Kind, type Mode, type Notes, type Row } from '../../lib/fieldwork';

const STATUS: Record<string, string> = { observed: '관찰됨', 'not-observed': '관찰되지 않음', unchecked: '측정하지 못함' };
const LABELS: Record<string, string> = { alias: '내 기기 별칭', condition: '관찰 조건·위치 별칭', distance_m: '거리(m)', observation_status: '관찰 상태', rssi_dbm: '표시된 RSSI(dBm, 없으면 빈 값)', connection: '별도로 확인한 연결 상태', button: '내 리모컨 버튼', protocol: '표시된 프로토콜(없으면 빈 값)', command_alias: '명령 별칭(예: C-A)', note: '관찰 메모·결측 이유' };
const CONNECTION: Record<string, string> = { 'not-checked': '연결 확인 안 함', 'not-connected': '연결되지 않음 확인', connected: '내 기기에서 연결 상태 확인' };
interface State { schemaVersion: 1; workbookId: Kind; rows: Row[]; notes: Record<Mode, Notes> }
const initial = (kind: Kind): State => ({ schemaVersion: 1, workbookId: kind, rows: [], notes: { real: emptyNotes(), demo: emptyNotes() } });
const draftRow = (kind: Kind): Row => ({ ...Object.fromEntries(FIELDS[kind].map(k => [k, ''])), alias: kind === 'ir' ? 'IR-A' : 'BLE-A', observation_status: 'observed', connection: 'not-checked' });

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
  const report = [kind === 'ble-ad' ? 'BLE 광고 관찰 보고서' : 'IR 수신 관찰 보고서', mode === 'real' ? '실제 관찰' : '가상 데모 — 실제 결과 아님', `총 ${rows.length}회: 관찰 ${observed.length}, 미관찰 ${missing}, 미측정 ${unchecked}`, ...Object.entries(NOTE_LABELS).map(([k, label]) => `${label}\n${notes[k as keyof Notes] || '(미작성)'}`), '실행 경계: 이 기기의 해당 기능 실행과 교실 파일럿은 미검증. 광고/명령 수신은 연결·인증 또는 재전송 성공을 증명하지 않음.'].join('\n\n');
  function demo() {
    const values = ['observed', 'not-observed', 'unchecked'].map((status, i) => makeRow({ ...draftRow(kind), condition: '가상 위치 A', distance_m: String(i + 1), observation_status: status, ...(kind === 'ble-ad' ? { rssi_dbm: i === 0 ? '-52' : '' } : { button: '전원', protocol: i === 0 ? '예시 규격' : '', command_alias: i === 0 ? 'C-A' : '' }), note: '가상 자료' }, 'demo'));
    setState(s => ({ ...s, rows: [...s.rows.filter(r => r.data_type !== 'demo'), ...values] })); setMode('demo');
  }
  return <div>
    <p role="status" aria-live="polite">{!ready ? '저장 자료 확인 중' : blocked.current ? '자동 저장 중지 · CSV 백업 필요' : '이 브라우저에 자동 저장됩니다. CSV로 별도 백업하세요.'} {message}</p>
    <fieldset disabled={!ready}><legend>자료 구분</legend><label><input type="radio" name={`${kind}-mode`} checked={mode === 'real'} onChange={() => setMode('real')} /> 실제 관찰</label>{' '}<label><input type="radio" name={`${kind}-mode`} checked={mode === 'demo'} onChange={() => setMode('demo')} /> 데모</label><p><button className="btn btn--quiet" type="button" onClick={demo}>가상 예시 3행으로 데모 시작·초기화</button></p></fieldset>
    <section className="lab-section" id="record" aria-labelledby={`${kind}-record`}><h2 id={`${kind}-record`}>관찰 기록 · {mode === 'real' ? '실제' : '데모'}</h2>
      <form onSubmit={e => { e.preventDefault(); const row = makeRow(draft, mode), error = validateRow(kind, row); if (error) { setMessage(error); return; } if (state.rows.length >= 900) { setMessage('최대 900건입니다. CSV로 백업한 뒤 정리하세요.'); return; } setState(s => ({ ...s, rows: [...s.rows, row] })); setMessage('기록을 추가했습니다. 반복할 때마다 한 행씩 남기세요.'); }}>
        {FIELDS[kind].map(field => <div className="field" key={field}><label htmlFor={`${kind}-${field}`}>{LABELS[field]}</label>{field === 'observation_status' || field === 'connection' ? <select id={`${kind}-${field}`} value={draft[field]} onChange={e => setDraft(d => ({ ...d, [field]: e.target.value }))}>{Object.entries(field === 'connection' ? CONNECTION : STATUS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select> : <input id={`${kind}-${field}`} value={draft[field]} maxLength={field === 'note' ? 500 : 80} inputMode={field === 'distance_m' || field === 'rssi_dbm' ? 'decimal' : undefined} onChange={e => setDraft(d => ({ ...d, [field]: e.target.value }))} />}</div>)}
        <button className="btn" disabled={!ready}>한 번의 관찰 추가</button>
      </form>
      <div className="table-wrap" tabIndex={0} role="region" aria-label="관찰 결과 표"><table><caption>{mode === 'real' ? '실제 관찰' : '가상 데모'} {rows.length}건</caption><thead><tr><th>순서</th>{FIELDS[kind].map(k => <th key={k}>{LABELS[k]}</th>)}<th>정리</th></tr></thead><tbody>{rows.map((r, i) => <tr key={r.id}><td>{i + 1}</td>{FIELDS[kind].map(k => <td key={k}>{k === 'observation_status' ? STATUS[r[k]] : k === 'connection' ? CONNECTION[r[k]] : r[k] || '미확인'}</td>)}<td><button type="button" onClick={() => { if (confirm('이 기록 한 건을 삭제할까요? 먼저 CSV 백업을 권장합니다.')) setState(s => ({ ...s, rows: s.rows.filter(v => v.id !== r.id) })); }}>삭제</button></td></tr>)}</tbody></table></div>
    </section>
    <section className="lab-section" id="analysis"><h2>간단 분석</h2><p>관찰 {observed.length}회 · 미관찰 {missing}회 · 미측정 {unchecked}회. 관찰/측정 시도는 {observed.length}/{rows.length - unchecked}회이며, 미측정은 분모에서 제외합니다.</p>
      {kind === 'ble-ad' ? <p>표시된 RSSI 표본 {rssi.length}개 · 평균 {rssi.length ? (rssi.reduce((a, b) => a + b, 0) / rssi.length).toFixed(1) + 'dBm' : '계산 불가'} · 범위 {rssi.length ? `${Math.min(...rssi)}~${Math.max(...rssi)}dBm` : '없음'}. 광고가 보여도 RSSI 표시가 없으면 평균에서 제외합니다. 같은 거리·조건끼리 표를 비교하세요. 광고 관찰은 연결이나 사용자 식별의 증거가 아닙니다.</p> : <p>수신한 명령 별칭 {new Set(observed.map(r => r.command_alias).filter(Boolean)).size}종. 같은 버튼·거리·방향에서 별칭이 반복되는지 표를 대조하세요. 표시 정보가 부족하면 동일 명령인지 판단 보류합니다. 같은 코드의 수신은 인증 부재나 재전송 성공을 입증하지 않습니다.</p>}
    </section>
    <section className="lab-section" id="data"><h2>CSV 백업과 복구</h2><p>실제·데모 관찰과 두 구분의 서술을 한 CSV에 보관합니다. 원본 파일은 바꾸지 않습니다. 가져오기 전 아래 오류와 미리보기를 확인하세요. 같은 ID는 기존 기록을 유지합니다. 서술은 가져온 항목으로 바뀝니다.</p><button className="btn" disabled={!ready} onClick={() => downloadFile(`${kind}-observations.csv`, rowsCsv(kind, state.rows, state.notes))}>전체 CSV 내려받기</button><div className="field"><label htmlFor={`${kind}-file`}>이 워크북 CSV 가져오기(1MB 이하)</label><input id={`${kind}-file`} type="file" accept=".csv,text/csv" onChange={async e => { setPending(null); const file = e.target.files?.[0]; if (!file) return; try { if (file.size > 1024 * 1024) throw new Error('1MB 이하 파일을 선택하세요.'); setPending(readRowsCsv(kind, await file.text())); } catch (error) { setMessage((error as Error).message); } e.target.value = ''; }} /></div>
      {pending && <div className="callout"><p>유효 관찰 {pending.rows.length}건 · 오류 {pending.errors.length}행 · 서술 구분 {Object.keys(pending.notes).join(', ') || '없음'}</p><ul>{pending.errors.map((error, i) => <li key={i}>{error}</li>)}</ul><p>{pending.rows.slice(0, 3).map(r => `${r.alias} / ${r.data_type} / ${STATUS[r.observation_status]}`).join(' · ')}</p><button type="button" onClick={() => { const known = new Set(state.rows.map(r => r.id)), fresh = pending.rows.filter(r => !known.has(r.id)); if (state.rows.length + fresh.length > 900) { setMessage('900건을 초과해 반영하지 않았습니다.'); return; } setState(s => ({ ...s, rows: [...s.rows, ...fresh], notes: { real: { ...s.notes.real, ...pending.notes.real }, demo: { ...s.notes.demo, ...pending.notes.demo } } })); setMessage(`${fresh.length}건 추가, 중복 ${pending.rows.length - fresh.length}건 유지, 오류 ${pending.errors.length}행 제외. 가져온 서술을 반영했습니다.`); setPending(null); }}>유효 행과 서술 반영</button><button type="button" onClick={() => setPending(null)}>취소</button></div>}
    </section>
    <section className="lab-section" id="report"><h2>방어·한계·보고서</h2>{Object.entries(NOTE_LABELS).map(([name, label]) => <div className="field" key={name}><label htmlFor={`${kind}-note-${name}`}>{label} · {mode === 'real' ? '실제' : '데모'}</label><textarea id={`${kind}-note-${name}`} maxLength={4000} rows={3} value={notes[name as keyof Notes]} onChange={e => setState(s => ({ ...s, notes: { ...s.notes, [mode]: { ...s.notes[mode], [name]: e.target.value } } }))} /></div>)}<p>완료 기준: 원자료와 상태·결측을 확인하고, 근거·방어·한계·다음 관찰을 내 말로 설명합니다. 빈 항목은 미완료이며 데모 보고서는 실제 실험 보고서와 구분합니다.</p><button className="btn" onClick={() => downloadFile(`${kind}-${mode}-report.txt`, report, 'text/plain;charset=utf-8')}>현재 구분 보고서 내려받기</button><details><summary>보고서 미리보기</summary><div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{report}</div></details></section>
  </div>;
}
