import { useState } from 'react';
import type { VisualStep } from '../../data/learn';

interface StepperProps {
  label: string;
  actors?: [string, string];
  steps: VisualStep[];
  note: string;
}

/** 단계별 원리 그림. 스크립트가 없으면 CSS가 모든 단계를 펼쳐 보여 준다. */
export function Stepper({ label, actors, steps, note }: StepperProps) {
  const [current, setCurrent] = useState(0);
  const last = steps.length - 1;

  return (
    <section className="stepper" aria-label={label}>
      <p className="stepper__note">{note}</p>
      <ol className="stepper__list">
        {steps.map((s, i) => (
          <li key={s.title} className={i === current ? 'stepper__step is-current' : 'stepper__step'}>
            <div className="stepper__picture" aria-hidden="true">
              {s.layers ? (
                <div className="layers">
                  {s.layers.map((l) => <span key={l} className={l === s.layers?.[0] ? 'layer layer--new' : 'layer'}>{l}</span>)}
                </div>
              ) : (
                <div className="seq">
                  {actors && <span className="seq__actor">{actors[0]}</span>}
                  <span className="seq__wire">
                    <span className="seq__signal">{s.signal ?? s.state}</span>
                    <span className="seq__arrow">{s.from === 0 ? '→' : s.from === 1 ? '←' : ''}</span>
                  </span>
                  {actors && <span className="seq__actor">{actors[1]}</span>}
                </div>
              )}
            </div>
            <h3><span className="stepper__n">{i + 1}.</span> {s.title}</h3>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>
      <div className="stepper__controls">
        <button className="btn btn--quiet btn--small" type="button" disabled={current === 0} onClick={() => setCurrent(0)}>처음</button>
        <button className="btn btn--quiet btn--small" type="button" disabled={current === 0} onClick={() => setCurrent(current - 1)}>이전</button>
        <button className="btn btn--small" type="button" disabled={current === last} onClick={() => setCurrent(current + 1)}>다음</button>
        <p className="status" role="status">{current + 1}/{steps.length} 단계: {steps[current].title}</p>
      </div>
    </section>
  );
}
