import { useId } from 'react';

export interface NoteGuide { key: string; label: string; help: string; example: string; why: string }

/** 서술 입력. 작성 예시는 접어서 보여 주고, 학생이 직접 누를 때만 입력란에 넣는다. */
export function NotesEditor({ fields, values, onChange, disabled, modeLabel }: {
  fields: NoteGuide[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
  modeLabel: string;
}) {
  const base = useId();
  return (
    <div className="note-list">
      {fields.map((f) => {
        const id = `${base}-${f.key}`;
        const current = values[f.key] ?? '';
        return (
          <div className="note-field" key={f.key}>
            <label htmlFor={id}>{f.label} <span className="note-field__mode">{modeLabel}</span></label>
            <p id={`${id}-help`} className="field__help">{f.help}</p>
            <textarea id={id} aria-describedby={`${id}-help`} rows={4} maxLength={4000} disabled={disabled} value={current} onChange={(e) => onChange(f.key, e.target.value)} />
            <details className="note-example">
              <summary>작성 예시 보기</summary>
              <p className="note-example__text">{f.example}</p>
              <p className="note-example__why"><strong>이렇게 쓰는 이유:</strong> {f.why}</p>
              <p className="field__help">가상 예시입니다. 실제 측정 결과처럼 제출하지 말고, 내 자료의 수치와 근거로 바꿔 씁니다.</p>
              <button className="btn btn--quiet btn--small" type="button" disabled={disabled} onClick={() => {
                if (current.trim() && !window.confirm(`이미 쓴 '${f.label}' 내용을 작성 예시로 바꿀까요? 지금 쓴 글은 사라집니다.`)) return;
                onChange(f.key, f.example);
              }}>이 예시를 입력란에 넣기</button>
            </details>
          </div>
        );
      })}
    </div>
  );
}
