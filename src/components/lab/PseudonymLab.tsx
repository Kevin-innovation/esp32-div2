import { useEffect, useRef, useState } from 'react';
import { downloadFile } from '../../lib/fieldwork';
import { defaultActions, pseudonymize, readSource, type Action, type CsvSource } from '../../lib/pseudonym';
const SAMPLE = 'uid,room,rssi_dbm,note\r\nDEMO-A,가상 거실,-48,가상의 학생 메모\r\nDEMO-A,가상 거실,-53,\r\nDEMO-B,가상 방,-70,가상의 생활 시간\r\n';
const QUESTIONS = { question: '질문과 가설: 어떤 단서로 다시 알아볼 수 있을까?', rationale: '열별 보존·가명·제거 이유', risk: '식별자·장소·시각·자유서술 조합의 재식별 점검', recovery: '원본 분리 보관·복구 확인 결과', defense: '공유 범위·접근 권한·삭제 계획', limits: '한계와 자기 설명: 가명화와 익명화가 다른 이유' };
type Notes = Record<keyof typeof QUESTIONS, string>;
interface Work { original: string; actions: Action[]; notes: Notes; checked: boolean }
const blank = (): Work => ({ original: '', actions: [], notes: Object.fromEntries(Object.keys(QUESTIONS).map(k => [k, ''])) as Notes, checked: false });
const KEY = 'esp32div.lab.csv.v1';
export default function PseudonymLab() {
  const [mode, setMode] = useState<'real' | 'demo'>('real');
  const [work, setWork] = useState({ real: blank(), demo: blank() });
  const [ready, setReady] = useState(false), [message, setMessage] = useState('');
  const blocked = useRef(false);
  const [pending, setPending] = useState<{ text: string; source: CsvSource } | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) try {
        const saved = JSON.parse(raw);
        if (saved.schemaVersion !== 1 || saved.workbookId !== 'csv') throw new Error();
        for (const m of ['real', 'demo'] as const) {
          const w = saved.work?.[m];
          if (typeof w?.original !== 'string' || typeof w.checked !== 'boolean') throw new Error();
          if (w.original) pseudonymize(readSource(w.original), w.actions);
          for (const k of Object.keys(QUESTIONS)) if (typeof w.notes?.[k] !== 'string' || w.notes[k].length > 4000) throw new Error();
        }
        setWork(saved.work);
      } catch { localStorage.setItem(`${KEY}.broken.${Date.now()}`, raw); setMessage('형식이 맞지 않은 저장 원본을 별도 키에 보존했습니다. CSV 원본을 다시 선택하세요.'); }
    } catch { blocked.current = true; setMessage('저장소 접근·원본 보존에 실패해 자동 저장을 중지했습니다. 파일을 내려받아 보관하세요.'); }
    setReady(true);
  }, []);
  useEffect(() => { if (!ready || blocked.current) return; try { localStorage.setItem(KEY, JSON.stringify({ schemaVersion: 1, workbookId: 'csv', work })); } catch { blocked.current = true; setMessage('자동 저장 실패. 원본·가명본과 보고서를 내려받으세요.'); } }, [ready, work]);
  const current = work[mode];
  let source: CsvSource | null = null, output: ReturnType<typeof pseudonymize> | null = null, error = '';
  try { if (current.original) { source = readSource(current.original); output = pseudonymize(source, current.actions); } } catch (e) { error = (e as Error).message; }
  const update = (value: Partial<Work>) => setWork(w => ({ ...w, [mode]: { ...w[mode], ...value } }));
  const report = ['CSV 가명처리 보고서', mode === 'real' ? '직접 준비한 자료' : '가상 샘플 활동', `유효 ${source?.rows.length ?? 0}행, 오류 ${source?.errors.length ?? 0}행`, ...(source?.header.map((h, i) => `${h}: ${{ keep: '유지', alias: '가명', remove: '제거' }[current.actions[i]]}`) ?? []), ...Object.entries(QUESTIONS).map(([k, label]) => `${label}\n${current.notes[k as keyof Notes] || '(미작성)'}`), `재식별 점검: ${current.checked ? '직접 점검함' : '아직 완료하지 않음'}`].join('\n\n');
  return <div>
    <p role="status">{ready ? blocked.current ? '자동 저장 중지' : '이 브라우저에 원본·작업 설정·서술을 저장합니다.' : '저장 자료 확인 중'} {message} {error}</p>
    <p>민감한 실제 자료 대신 가상 샘플을 권장합니다. 입력은 서버로 보내지 않습니다. 공유 PC에서는 활동 후 아래 저장 삭제를 사용하세요. 원본 파일을 수정하거나 덮어쓰지 않으며, 가명 대응표는 공유 파일에 넣지 않습니다.</p>
    <fieldset disabled={!ready}><legend>자료 구분</legend><label><input type="radio" name="csv-mode" checked={mode === 'real'} onChange={() => { setMode('real'); setPending(null); }} /> 직접 준비한 자료</label>{' '}<label><input type="radio" name="csv-mode" checked={mode === 'demo'} onChange={() => { setMode('demo'); setPending(null); }} /> 가상 데모</label><p><button type="button" className="btn" onClick={() => { setWork(w => ({ ...w, demo: { ...blank(), original: SAMPLE, actions: defaultActions(readSource(SAMPLE).header) } })); setMode('demo'); setPending(null); }}>가상 샘플로 시작·초기화</button></p></fieldset>
    <section className="lab-section" id="record"><h2>1. 원본 가져오기와 오류 확인</h2><p>1MB·1000행·30열 이하 CSV를 선택합니다. UTF-8 머리글이 필요합니다. 오류 행은 원본에 그대로 남고 새 가명본에서만 제외합니다. 기존 작업 교체 전 원본·가명본·보고서를 내려받으세요.</p><div className="field"><label htmlFor="csv-source">CSV 파일 선택</label><input id="csv-source" type="file" accept=".csv,text/csv" disabled={!ready} onChange={async e => { setPending(null); const f = e.target.files?.[0]; if (!f) return; try { if (f.size > 1024 * 1024) throw new Error('1MB 이하 파일을 선택하세요.'); const text = await f.text(); setPending({ text, source: readSource(text) }); } catch (e) { setMessage((e as Error).message); } e.target.value = ''; }} /></div>
      {pending && <div className="callout"><p>가져올 자료: {pending.source.header.length}열 · 유효 {pending.source.rows.length}행 · 오류 {pending.source.errors.length}행</p><ul>{pending.source.errors.map((e, i) => <li key={i}>{e}</li>)}</ul><p>열: {pending.source.header.join(' · ')}</p><button type="button" onClick={() => { update({ ...blank(), original: pending.text, actions: defaultActions(pending.source.header) }); setPending(null); setMessage('원본은 보존하고 새 작업을 시작했습니다.'); }}>현재 구분 작업으로 가져오기</button><button type="button" onClick={() => setPending(null)}>취소</button></div>}
    </section>
    {source && <><section className="lab-section" id="analysis"><h2>2. 열별 처리와 가명본 비교</h2><p>자동 제안은 정답이 아닙니다. UID·BSSID는 가명, 구체 장소·시각은 가명 또는 제거, 자유서술은 내용 검토 후 제거를 우선 고려합니다. 같은 열의 같은 값은 같은 별칭이 됩니다. 빈 값은 빈 값으로 유지하고 0으로 만들지 않습니다.</p>
      {source.header.map((h, i) => <div className="field" key={h}><label htmlFor={`action-${i}`}>{h}</label><select id={`action-${i}`} value={current.actions[i]} onChange={e => update({ actions: current.actions.map((a, n) => n === i ? e.target.value as Action : a), checked: false })}><option value="keep">그대로 유지</option><option value="alias">열별 가명으로 교체</option><option value="remove">공유본에서 제거</option></select></div>)}
      <p>원본 {source.header.length}열 → 공유본 {output?.header.length ?? 0}열. 유효 {source.rows.length}행 · 오류 제외 {source.errors.length}행 · 빈 셀 {source.rows.flat().filter(v => !v).length}개. 이 활동의 원본/가명본은 변환 전후이며, 실제/데모 구분과 별개입니다.</p><ul>{source.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
      {[{ label: '원본 미리보기(최대 5행)', data: source }, ...(output ? [{ label: '새 가명본 미리보기(최대 5행)', data: output }] : [])].map(({ label, data }) => <div className="table-wrap" tabIndex={0} role="region" aria-label={label} key={label}><table><caption>{label}</caption><thead><tr>{data.header.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{data.rows.slice(0, 5).map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v || '빈 값'}</td>)}</tr>)}</tbody></table></div>)}
    </section><section className="lab-section" id="data"><h2>3. 새 파일로 보관하고 재식별 점검</h2><p>열 조합·드문 위치·시간·메모로 사람이나 기기를 추정할 수 있는지 확인하세요. 가명화는 익명화가 아닙니다. 가명본을 별도 파일로 저장한 뒤 다시 열어 행·열·빈 값이 맞는지 비교합니다. 원본 백업은 접근을 제한한 별도 장소에 보관합니다.</p><label><input type="checkbox" checked={current.checked} onChange={e => update({ checked: e.target.checked })} /> 식별자·장소·자유서술과 남은 열 조합을 직접 점검했습니다</label><div className="btn-row"><button className="btn btn--quiet" onClick={() => downloadFile(`csv-${mode}-original.csv`, current.original)}>원본 사본 내려받기</button><button className="btn" disabled={!output || !current.checked} onClick={() => output && downloadFile(`csv-${mode}-pseudonymized.csv`, output.csv)}>새 가명본 내려받기</button></div><p>원본 사본은 선택한 내용 그대로이며 수식처럼 보이는 원문도 유지합니다. 표 프로그램에서 바로 열지 말고 텍스트로 확인하세요. 새 가명본은 수식 시작 문자를 문자열로 보호합니다. 복구하려면 원래 보관한 CSV를 다시 선택하세요. 가명본만으로 원래 식별자를 복원할 수 없습니다.</p></section></>}
    <section className="lab-section" id="report"><h2>4. 방어·한계·보고서</h2>{Object.entries(QUESTIONS).map(([k, label]) => <div className="field" key={k}><label htmlFor={`csv-note-${k}`}>{label}</label><textarea id={`csv-note-${k}`} maxLength={4000} rows={3} value={current.notes[k as keyof Notes]} onChange={e => update({ notes: { ...current.notes, [k]: e.target.value } })} /></div>)}<p>완료 기준: 원본과 새 가명본을 분리 보관하고, 오류·결측·남은 재식별 위험을 설명합니다. 가상 샘플로도 완료할 수 있으며 실기기 실행 확인을 뜻하지 않습니다.</p><button className="btn" onClick={() => downloadFile(`csv-${mode}-report.txt`, report, 'text/plain;charset=utf-8')}>현재 구분 보고서 내려받기</button><details><summary>보고서 미리보기</summary><div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{report}</div></details><p><button type="button" onClick={() => { if (!confirm('이 워크북의 브라우저 저장 자료를 지울까요? 내려받은 파일은 남습니다.')) return; try { const keys = Object.keys(localStorage).filter(k => k === KEY || k.startsWith(KEY + '.broken.')); keys.forEach(k => localStorage.removeItem(k)); setWork({ real: blank(), demo: blank() }); setMessage('현재·복구용 브라우저 저장 자료를 삭제했습니다. 내려받은 원본·가명본은 직접 관리하세요.'); } catch { setMessage('브라우저 저장 삭제 실패. 브라우저 설정에서 이 사이트 저장 자료를 확인하세요.'); } }}>이 워크북의 브라우저 저장 삭제</button></p></section>
  </div>;
}
