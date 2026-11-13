import { useEffect, useId, useState } from 'react';
import { downloadFile } from '../../lib/fieldwork';
import { IV_CHECKS, IV_PITCH, IV_TOPICS, interviewMarkdown, ivAnswerKey, ivCheckKey, ivChecked, ivFollow, ivPitch, ivWarnings, type IvContext, type IvQuestion } from '../../lib/interview';
import { NotesEditor, type NoteGuide } from './NotesEditor';

export interface InterviewProps { title: string; questions: IvQuestion[]; explain: NoteGuide }

/**
 * 14장 면접 준비 공통 화면. 각 실습의 저장소가 값(values)과 쓰기(set), 자료 상태(ctx)를 넘긴다.
 * 서버에서 그린 상태로도 질문, 작성 방향, 예시, 후속 질문 예를 읽을 수 있다(자바스크립트 꺼짐).
 */
export function InterviewPrep({ title, questions, explain, values, set, ctx, modeLabel, disabled, file }: InterviewProps & {
  values: Record<string, string | undefined>;
  /** 여러 칸을 한 번에 저장한다(후속 답과 그때의 질문). */
  set: (patch: Record<string, string>) => void;
  ctx: IvContext;
  modeLabel: string;
  disabled?: boolean;
  file: string;
}) {
  const [live, setLive] = useState(false);
  const [date, setDate] = useState('(열어 본 날)');
  const [message, setMessage] = useState('');
  const base = useId();
  useEffect(() => { setLive(true); setDate(new Date().toLocaleDateString('sv')); }, []);
  const write = (key: string, value: string) => set({ [key]: value });
  const pitch = ivPitch(values);
  const demo = ctx.mode === 'demo';

  return (
    <div className="iv">
      <p className={demo ? 'demo-note' : 'save-state'}>
        답 저장: {ctx.storage}. 지금 보는 자료: {demo ? '가상 데모' : '내 실제 기록'} {ctx.viewCount}건. 이 답의 근거가 될 실제 기록: {ctx.realCount}건.
        {demo && ' 데모 값은 가상이므로 면접에서 내 결과로 말하지 않습니다.'}
      </p>

      <section className="iv-block" aria-labelledby={`${base}-sum`}>
        <h4 id={`${base}-sum`}>내 탐구 요약</h4>
        <p className="field__help">앞 장에서 쓴 글과 기록에서 읽어 옵니다. 고치려면 그 장으로 돌아가 고칩니다.</p>
        <dl className="facts facts--stack iv-summary">
          {ctx.summary.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className={v.trim() ? undefined : 'muted'}>{v.trim() || '(미작성)'}</dd></div>)}
        </dl>
        {ctx.calc.length
          ? <><p className="small"><strong>실제 기록의 계산값</strong> (8장과 같은 계산)</p><ul className="small iv-calc">{ctx.calc.slice(0, 10).map(([k, v]) => <li key={k}>{k}: {v}</li>)}</ul>{ctx.calc.length > 10 && <p className="field__help">나머지 {ctx.calc.length - 10}개 값은 8장에서 봅니다.</p>}</>
          : <p className="field__help">{demo ? '데모 계산값은 면접 근거가 아니어서 요약에 넣지 않습니다.' : '실제 기록이 아직 없어 계산값이 없습니다. 기록 없이 답할 때는 기록이 없다고 말합니다.'}</p>}
      </section>

      <section className="iv-block" aria-labelledby={`${base}-qs`}>
        <h4 id={`${base}-qs`}>미션 질문 {questions.length}개</h4>
        <ol className="iv-list">
          {questions.map((q, i) => {
            const checked = ivChecked(values, q), follow = ivFollow(q, values, ctx), warns = ivWarnings(q, values, ctx), fid = `${base}-f-${q.topic}`;
            return (
              <li className="iv-q" key={q.topic}>
                <p className="iv-q__topic">{i + 1}. {IV_TOPICS[q.topic]}</p>
                <NotesEditor fields={[{ key: ivAnswerKey(q), label: q.q, help: `작성 방향: ${q.dir}`, example: q.ex }]} values={values} onChange={write} disabled={disabled} modeLabel={modeLabel} />
                <div className="iv-follow">
                  {!live ? (
                    <p className="field__help"><strong>후속 질문 예.</strong> 기록이 있으면: {q.real} 아직 없으면: {q.plan}</p>
                  ) : follow ? (
                    <div className="note-field">
                      <label htmlFor={fid}>후속 질문{follow.frozen && <> <span className="note-field__mode">답할 때 받은 질문</span></>}</label>
                      <p className="iv-follow__ask" id={`${fid}-q`}>{follow.ask}</p>
                      <textarea id={fid} aria-describedby={`${fid}-q`} rows={3} maxLength={4000} disabled={disabled} value={follow.answer} onChange={(e) => set({ [follow.key]: e.target.value, ...(follow.frozen ? {} : { [follow.askedKey]: follow.ask }) })} />
                    </div>
                  ) : (
                    <p className="field__help">위 답을 쓰면 실제 기록 유무와 아래 근거 점검에 맞춘 후속 질문이 열립니다.</p>
                  )}
                </div>
                <fieldset className="iv-check" disabled={disabled}>
                  <legend>답변 근거 스스로 점검 <span className="field__help">학습 보조입니다. 점수, 완료, 이해를 판정하지 않습니다.</span></legend>
                  {IV_CHECKS.map(([k, label]) => (
                    <label className="check" key={k}>
                      <input type="checkbox" checked={checked.has(k)} onChange={(e) => {
                        const next = new Set(checked);
                        if (e.target.checked) next.add(k); else next.delete(k);
                        write(ivCheckKey(q), IV_CHECKS.map(([c]) => c).filter((c) => next.has(c)).join(','));
                      }} /> {label}
                    </label>
                  ))}
                </fieldset>
                {live && warns.length > 0 && <ul className="iv-warn">{warns.map((w) => <li key={w}>{w}</li>)}</ul>}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="iv-block" aria-labelledby={`${base}-pitch`}>
        <h4 id={`${base}-pitch`}>1분 설명: 질문, 방법, 결과, 한계, 다음 탐구</h4>
        <p className="field__help">다섯 칸을 짧게 쓰고, 단추를 눌러 이어 붙인 글을 아래 완성 문단 칸에 넣습니다. 입력할 때마다 자동으로 덮어쓰지 않습니다.</p>
        <NotesEditor fields={IV_PITCH.map(([k, label, help]) => ({ key: `iv_pitch_${k}`, label, help }))} values={values} onChange={write} disabled={disabled} modeLabel={modeLabel} rows={2} />
        <p className="iv-pitch__preview"><strong>이어 붙인 글:</strong> {pitch || '(다섯 칸이 아직 비어 있습니다)'}</p>
        <div className="btn-row">
          <button className="btn btn--quiet btn--small" type="button" disabled={disabled || !pitch} onClick={() => {
            const current = values[explain.key]?.trim() ?? '';
            if (current && current !== pitch && !window.confirm(`이미 쓴 '${explain.label}' 내용을 이어 붙인 글로 바꿀까요? 지금 쓴 글은 사라집니다.`)) return;
            write(explain.key, pitch);
            setMessage(`'${explain.label}' 칸에 넣었습니다. 소리 내어 읽고 60초 안에 끝나는지 확인하세요.`);
          }}>다섯 칸을 이어 완성 문단 칸에 넣기</button>
        </div>
        <NotesEditor fields={[explain]} values={values} onChange={write} disabled={disabled} modeLabel={modeLabel} />
      </section>

      <section className="iv-block" aria-labelledby={`${base}-memo`}>
        <h4 id={`${base}-memo`}>보완 메모와 내려받기</h4>
        <NotesEditor fields={[{ key: 'iv_memo', label: '보완 메모', help: '답하다 막힌 곳, 다시 볼 장, 더 재야 할 것을 적습니다.' }]} values={values} onChange={write} disabled={disabled} modeLabel={modeLabel} rows={3} />
        <div className="btn-row">
          <button className="btn" type="button" disabled={disabled} onClick={() => { downloadFile(file, interviewMarkdown(title, questions, values, ctx, date, values[explain.key] ?? ''), 'text/markdown;charset=utf-8'); setMessage('면접 준비 Markdown을 내려받았습니다.'); }}>면접 준비 Markdown 내려받기</button>
          <p className="status" role="status">{message}</p>
        </div>
        <p className="field__help">질문, 내 답, 후속 질문과 답, 탐구 요약, 1분 설명, 보완 메모가 들어갑니다. 같은 답은 13장 보고서 끝에도 붙습니다.</p>
      </section>
    </div>
  );
}
