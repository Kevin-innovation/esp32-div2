import { Fragment, useState } from 'react';
import { SCAN_EXAMPLE, type StepScenario, type VisualStep } from '../../data/learn';

interface StepperProps {
  label: string;
  actors?: [string, string];
  steps?: VisualStep[];
  /** 서로 다른 방식을 고르는 경우. 고르면 그 방식의 처음으로 돌아간다. */
  scenarios?: StepScenario[];
  note: string;
}

function Signal({ text, dir }: { text: string; dir: 'forward' | 'back' }) {
  return (
    <div className="scene__row" data-dir={dir}>
      <span className="scene__label">{text}</span>
      <span className="scene__track"><span className="scene__dot" /></span>
      <span className="scene__arrow">{dir === 'forward' ? '→' : '←'}</span>
    </div>
  );
}

/** 한 단계의 상태 그림. 문장에 없는 정보를 넣지 않고, 누가 말하는지와 상태만 보여 준다. */
function Scene({ step, actors }: { step: VisualStep; actors?: [string, string] }) {
  if (step.layers) {
    return (
      <div className="layers">
        {step.layers.map((l, i) => <span key={l} className={i === 0 ? 'layer layer--new' : 'layer'}>{i === 0 && <><span aria-hidden="true">+ </span><span className="sr">새로 더해진 층: </span></>}{l}</span>)}
      </div>
    );
  }
  const left = actors?.[0];
  const right = step.peer ?? actors?.[1];
  const speaker = step.from;
  const forward = speaker === 0;
  const rows: { text: string; dir: 'forward' | 'back' }[] = [];
  if (step.signal) rows.push({ text: step.signal, dir: forward ? 'forward' : 'back' });
  if (step.returns) rows.push({ text: step.returns, dir: forward ? 'back' : 'forward' });
  return (
    <div className="scene-wrap">
      {step.channel !== undefined && <p className="scene__channel">지금 채널: {step.channelFrom !== undefined && `${step.channelFrom} → `}<strong>{step.channel}</strong></p>}
      <div className="scene">
        {left && (
          <div className={`scene__actor${speaker === 0 ? ' is-active' : ''}${step.field ? ' has-field' : ''}`}>
            <span className="scene__name">{left}</span>
            {step.field && <span className="scene__state">자기장 켜짐</span>}
          </div>
        )}
        <div className="scene__wire">
          {rows.map((r) => <Signal key={r.text} text={r.text} dir={r.dir} />)}
          {rows.length === 0 && step.state && <span className="scene__label">{step.state}</span>}
        </div>
        {right && (
          <div className={`scene__actor${speaker === 1 ? ' is-active' : ''}${step.powered ? ' is-powered' : ''}`}>
            <span className="scene__name">{right}</span>
            {step.powered !== undefined && <span className="scene__state">{step.powered ? '전원 얻음' : '전원 없음'}</span>}
          </div>
        )}
      </div>
      {step.listed !== undefined && (
        <div className="table-wrap scan-demo">
          <table>
            <caption>스캔 목록 (가상 값, 측정값 아님)</caption>
            <thead><tr><th scope="col">SSID</th><th scope="col">BSSID</th><th scope="col">채널</th><th scope="col">RSSI</th></tr></thead>
            <tbody>
              {SCAN_EXAMPLE.slice(0, step.listed).map((r, i) => (
                <tr key={r.bssid} className={i === step.newRow ? (step.returns ? 'is-new is-late' : 'is-new') : undefined}>
                  <td>{r.ssid}</td><td><code>{r.bssid}</code></td><td>{r.channel}</td><td>{r.rssi}dBm</td>
                </tr>
              ))}
              {step.listed === 0 && <tr><td colSpan={4} className="muted">아직 받은 정보가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** 단계별 원리 그림. 스크립트가 없으면 CSS가 모든 단계를 펼쳐 보여 준다. */
export function Stepper({ label, actors, steps = [], scenarios, note }: StepperProps) {
  const groups: StepScenario[] = scenarios ?? [{ id: 'all', label: '', steps }];
  const [scenario, setScenario] = useState(groups[0].id);
  const [current, setCurrent] = useState(0);
  const [play, setPlay] = useState(0);
  const active = groups.find((g) => g.id === scenario) ?? groups[0];
  const last = active.steps.length - 1;
  const go = (n: number) => { setCurrent(n); setPlay((p) => p + 1); };
  const name = label.replace(/\s/g, '-');

  return (
    <section className="stepper" aria-label={label}>
      <p className="stepper__note">{note}</p>
      {scenarios && (
        <fieldset className="stepper__modes">
          <legend>어느 방식을 볼까요?</legend>
          <div className="seg">
            {scenarios.map((g) => (
              <Fragment key={g.id}>
                <input type="radio" id={`${name}-${g.id}`} name={name} checked={scenario === g.id} onChange={() => { setScenario(g.id); go(0); }} />
                <label htmlFor={`${name}-${g.id}`}>{g.label}</label>
              </Fragment>
            ))}
          </div>
        </fieldset>
      )}
      {groups.map((g) => (
        <div key={g.id} className={g.id === active.id ? 'stepper__group is-current' : 'stepper__group'}>
          {scenarios && <h3 className="stepper__group-title">{g.label}</h3>}
          <ol className="stepper__list">
            {g.steps.map((s, i) => (
              <li key={s.title} className={g.id === active.id && i === current ? 'stepper__step is-current' : 'stepper__step'}>
                <div className="stepper__picture" key={g.id === active.id && i === current ? play : 0}>
                  <Scene step={s} actors={actors} />
                </div>
                <h3><span className="stepper__n">{i + 1}.</span> {s.title}</h3>
                <p>{s.body}</p>
                {s.ask && (
                  <details className="think">
                    <summary>{s.ask[0]}</summary>
                    <div className="think__answer"><p>{s.ask[1]}</p></div>
                  </details>
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}
      <div className="stepper__controls">
        <button className="btn btn--quiet btn--small" type="button" disabled={current === 0} onClick={() => go(0)}>처음</button>
        <button className="btn btn--quiet btn--small" type="button" disabled={current === 0} onClick={() => go(current - 1)}>이전</button>
        <button className="btn btn--small" type="button" disabled={current === last} onClick={() => go(current + 1)}>다음</button>
        <button className="btn btn--quiet btn--small stepper__replay" type="button" onClick={() => setPlay((p) => p + 1)}>이 단계 다시 보기</button>
        <p className="status" role="status">{scenarios ? `${active.label}, ` : ''}{current + 1}/{active.steps.length} 단계: {active.steps[current].title}</p>
      </div>
    </section>
  );
}
