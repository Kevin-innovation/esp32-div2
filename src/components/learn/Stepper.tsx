import { Fragment, useEffect, useId, useState, type CSSProperties } from 'react';
import { SCAN_EXAMPLE, SCREENS, type StepScenario, type VisualStep } from '../../data/learn';

interface StepperProps {
  label: string;
  actors?: [string, string];
  steps?: VisualStep[];
  /** 서로 다른 방식을 고르는 경우. 고르면 그 방식의 처음으로 돌아간다. */
  scenarios?: StepScenario[];
  note: string;
}

type Kind = 'nfc' | 'scan' | 'web' | 'layers';
type Pt = [number, number];
/** 한 도식의 배치. 넓은 화면용과 휴대폰용 두 벌을 그려 CSS로 하나만 보인다(글자가 작아지지 않게). */
interface Geo { w: number; h: number; s: number; L: Pt; R: Pt; nameY: number; lane: [number, number]; laneY: [number, number]; mid: number; band: number }
const GEO: Record<Exclude<Kind, 'layers'>, { wide: Geo; tall: Geo }> = {
  nfc: {
    wide: { w: 640, h: 284, s: 1, L: [110, 92], R: [530, 92], nameY: 162, lane: [205, 435], laneY: [66, 122], mid: 96, band: 212 },
    tall: { w: 320, h: 410, s: 0.72, L: [70, 66], R: [250, 66], nameY: 124, lane: [30, 290], laneY: [196, 248], mid: 222, band: 282 },
  },
  scan: {
    wide: { w: 640, h: 246, s: 1, L: [110, 98], R: [530, 98], nameY: 172, lane: [205, 435], laneY: [72, 124], mid: 98, band: 200 },
    tall: { w: 320, h: 318, s: 0.72, L: [70, 70], R: [250, 70], nameY: 130, lane: [30, 290], laneY: [190, 240], mid: 215, band: 270 },
  },
  web: {
    wide: { w: 640, h: 200, s: 1, L: [110, 92], R: [530, 92], nameY: 166, lane: [205, 435], laneY: [66, 118], mid: 92, band: 0 },
    tall: { w: 320, h: 258, s: 0.72, L: [70, 66], R: [250, 66], nameY: 124, lane: [30, 290], laneY: [188, 238], mid: 212, band: 0 },
  },
};
const WAITING = SCREENS['reader-waiting'].rows[4].text;
const DETECTED = [SCREENS['reader-detected'].rows[1].text, SCREENS['reader-detected'].rows[3].text];

/** 한글은 글자 폭이 넓다. SVG에는 줄바꿈이 없으므로 이름표 폭을 글자 종류로 어림한다. */
const textWidth = (t: string, size: number) => [...t].reduce((a, c) => a + (/[가-힣]/.test(c) ? size : c === ' ' ? size * 0.32 : size * 0.6), 0);
const split = (name: string): [string, string?] => { const m = name.match(/^(.*?) \((.*)\)$/); return m ? [m[1], m[2]] : [name]; };

function Glyph({ name, at, s, className }: { name: string; at: Pt; s: number; className: string }) {
  const t = `translate(${at[0]} ${at[1]}) scale(${s})`;
  if (name.includes('리더')) return (
    <g className={className} transform={t}>
      <rect className="g-board" x={-60} y={-45} width={120} height={90} rx={8} />
      <rect className="g-coil" x={-50} y={-35} width={84} height={70} rx={10} />
      <rect className="g-coil" x={-42} y={-27} width={68} height={54} rx={8} />
      <rect className="g-coil" x={-34} y={-19} width={52} height={38} rx={6} />
      <rect className="g-chip" x={42} y={-12} width={12} height={24} rx={2} />
    </g>
  );
  if (name.includes('태그')) return (
    <g className={className} transform={t}>
      <circle className="g-sticker" r={46} />
      <circle className="g-coil" r={38} />
      <circle className="g-coil" r={31} />
      <circle className="g-coil" r={24} />
      <rect className="g-chip" x={-7} y={12} width={14} height={9} rx={1.5} />
    </g>
  );
  if (name.includes('스캔') || name.includes('단말기')) return (
    <g className={className} transform={t}>
      <rect className="g-board" x={-30} y={-46} width={60} height={92} rx={10} />
      <rect className="g-screen" x={-23} y={-38} width={46} height={58} rx={3} />
      <rect className="g-chip" x={-9} y={30} width={18} height={6} rx={3} />
    </g>
  );
  if (name.includes('서버')) return (
    <g className={className} transform={t}>
      {[-44, -14, 16].map((y) => <Fragment key={y}><rect className="g-board" x={-46} y={y} width={92} height={26} rx={4} /><rect className="g-chip" x={-36} y={y + 11} width={30} height={4} rx={2} /></Fragment>)}
    </g>
  );
  return (
    <g className={className} transform={t}>
      <path className="g-wire" d="M-34 2 L-42 -44 M34 2 L42 -44" />
      <rect className="g-board" x={-56} y={2} width={112} height={36} rx={8} />
      <rect className="g-chip" x={-40} y={17} width={36} height={6} rx={3} />
    </g>
  );
}

function Actor({ name, at, g, speaking, extra, className }: { name: string; at: Pt; g: Geo; speaking: boolean; extra?: [string, string]; className?: string }) {
  const [main, sub] = split(name);
  const lines: [string, string][] = [[main, 'scene-name'], ...(sub ? [[sub, 'scene-sub'] as [string, string]] : []), ...(extra ? [extra] : [])];
  return (
    <g className={`scene-actor${speaking ? ' is-speaking' : ''}${className ? ` ${className}` : ''}`}>
      <Glyph name={name} at={at} s={g.s} className="scene-glyph" />
      {lines.map(([text, cls], i) => <text key={text} className={cls} x={at[0]} y={g.nameY + i * 17} textAnchor="middle">{text}</text>)}
    </g>
  );
}

function Lane({ y, text, dir, g, late, marker }: { y: number; text: string; dir: 'forward' | 'back'; g: Geo; late: boolean; marker: string }) {
  const [a, b] = g.lane;
  const [x1, x2] = dir === 'forward' ? [a, b] : [b, a];
  const w = textWidth(text, 14) + 22;
  const len = b - a - 26;
  return (
    <g className={`scene-lane${late ? ' is-late' : ''}`}>
      <line className="lane-line" x1={x1} y1={y} x2={dir === 'forward' ? x2 - 4 : x2 + 4} y2={y} markerEnd={`url(#${marker})`} />
      <rect className="lane-pill" x={(a + b) / 2 - w / 2} y={y - 31} width={w} height={22} rx={11} />
      <text className="lane-text" x={(a + b) / 2} y={y - 15} textAnchor="middle">{text}</text>
      <rect className="scene__dot" x={dir === 'forward' ? a : b - 14} y={y - 5} width={14} height={10} rx={3} style={{ '--len': `${dir === 'forward' ? len : -len}px` } as CSSProperties} />
    </g>
  );
}

/** 리더 칩에서 프로세서를 거쳐 화면에 그려지는 기기 안 흐름. 무선 구간과 따로 그린다. */
function DeviceBand({ g, active, tall }: { g: Geo; active: boolean; tall: boolean }) {
  const box = (x: number, y: number, w: number, h: number, label: string) => <g><rect className="band-box" x={x} y={y} width={w} height={h} rx={6} /><text className="band-label" x={x + w / 2} y={y + h / 2 + 5} textAnchor="middle">{label}</text></g>;
  const screen = active ? DETECTED : [WAITING];
  const [sx, sy, sw, sh] = tall ? [12, 80, 296, 44] : [460, 22, 160, 44];
  return (
    <g className={`scene-band${active ? ' is-active' : ''}`} transform={`translate(0 ${g.band})`}>
      <text className="band-title" x={tall ? 12 : 20} y={12}>{active ? '기기 안에서 처리' : '기기 안'}</text>
      {tall ? <>{box(12, 22, 136, 40, 'PN532')}{box(172, 22, 136, 40, 'ESP32-S3')}<path className="band-arrow" d="M150 42 H168 M240 64 V78" /></>
        : <>{box(20, 22, 150, 44, 'PN532')}{box(240, 22, 150, 44, 'ESP32-S3')}<path className="band-arrow" d="M172 44 H236 M392 44 H456" /></>}
      <rect className="band-screen" x={sx} y={sy} width={sw} height={sh} rx={6} />
      {screen.map((line, i) => <text key={line} className={`band-screen__text${active ? ' is-new' : ''}`} x={sx + 10} y={sy + (screen.length === 1 ? sh / 2 + 5 : 18 + i * 16)}>{line}</text>)}
      {active && <rect className="scene__dot band-dot" x={tall ? 140 : 162} y={tall ? 37 : 39} width={12} height={10} rx={3} />}
    </g>
  );
}

function ChannelBand({ g, step, tall }: { g: Geo; step: VisualStep; tall: boolean }) {
  const [x0, x1] = tall ? [12, 308] : [70, 620];
  const cw = (x1 - x0) / 13;
  const y = tall ? 14 : 0;
  const ch = step.channel ?? 1;
  const shift = step.channelFrom !== undefined ? (step.channelFrom - ch) * cw : 0;
  return (
    <g className="scene-band is-active" transform={`translate(0 ${g.band})`}>
      <text className="band-title" x={tall ? 12 : 20} y={tall ? 8 : 20}>채널</text>
      {Array.from({ length: 13 }, (_, i) => <g key={i}><rect className="channel-cell" x={x0 + i * cw + 1} y={y} width={cw - 2} height={28} rx={3} /><text className="channel-n" x={x0 + i * cw + cw / 2} y={y + 19} textAnchor="middle">{i + 1}</text></g>)}
      <g className={shift ? 'channel-cursor is-moving' : 'channel-cursor'} style={{ '--from': `${shift}px` } as CSSProperties}>
        <rect className="channel-on" x={x0 + (ch - 1) * cw + 1} y={y} width={cw - 2} height={28} rx={3} />
        <text className="channel-on__n" x={x0 + (ch - 1) * cw + cw / 2} y={y + 19} textAnchor="middle">{ch}</text>
      </g>
    </g>
  );
}

function Diagram({ kind, step, actors, tall }: { kind: Exclude<Kind, 'layers'>; step: VisualStep; actors?: [string, string]; tall: boolean }) {
  const g = GEO[kind][tall ? 'tall' : 'wide'];
  const marker = `${useId().replace(/:/g, '')}-arrow`;
  const left = actors?.[0] ?? '';
  const right = step.peer ?? actors?.[1] ?? '';
  const forward = step.from === 0;
  const rows: { text: string; dir: 'forward' | 'back' }[] = [];
  if (step.signal) rows.push({ text: step.signal, dir: forward ? 'forward' : 'back' });
  if (step.returns) rows.push({ text: step.returns, dir: forward ? 'back' : 'forward' });
  const energy = kind === 'nfc' && step.field;
  const arcFrom = g.L[0] + 64 * g.s, arcTo = g.R[0] - 50 * g.s;
  const arcs = tall ? 3 : 5;
  const state = kind === 'nfc' && step.inside ? undefined : step.state;
  return (
    <svg className={`scene-svg scene-svg--${tall ? 'tall' : 'wide'}`} viewBox={`0 0 ${g.w} ${g.h}`} aria-hidden="true" focusable="false">
      <defs><marker id={marker} viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse"><path className="lane-head" d="M0 0 L10 5 L0 10 z" /></marker></defs>
      {energy && <g className="scene-field">{Array.from({ length: arcs }, (_, k) => { const x = arcFrom + (k * (arcTo - arcFrom)) / arcs; const r = 40 * g.s; return <path key={k} className="field-arc" style={{ animationDelay: `${k * 110}ms` }} d={`M${x} ${g.L[1] - r} Q${x + 24 * g.s} ${g.L[1]} ${x} ${g.L[1] + r}`} />; })}</g>}
      <Actor name={left} at={g.L} g={g} speaking={step.from === 0} className={kind === 'nfc' && step.field ? 'is-field' : undefined} extra={kind === 'nfc' && step.field ? ['자기장 켜짐', 'scene-energy'] : undefined} />
      <Actor name={right} at={g.R} g={g} speaking={step.from === 1} className={kind === 'nfc' ? (step.powered ? 'is-powered' : 'is-off') : undefined} extra={kind === 'nfc' && step.powered !== undefined ? [step.powered ? '전원 얻음' : '전원 없음', step.powered ? 'scene-energy' : 'scene-sub'] : undefined} />
      {rows.map((r, i) => <Lane key={r.text} y={g.laneY[i]} text={r.text} dir={r.dir} g={g} late={i === 1} marker={marker} />)}
      {rows.length === 0 && state && (() => { const w = textWidth(state, 14) + 26; return <g className={`scene-state${energy ? ' is-energy' : ''}`}><rect x={g.w / 2 - w / 2} y={g.mid - 14} width={w} height={28} rx={14} /><text x={g.w / 2} y={g.mid + 5} textAnchor="middle">{state}</text></g>; })()}
      {kind === 'nfc' && <DeviceBand g={g} active={!!step.inside} tall={tall} />}
      {kind === 'scan' && <ChannelBand g={g} step={step} tall={tall} />}
    </svg>
  );
}

/** 계층: 헤더가 왼쪽(휴대폰에서는 위)에 하나씩 붙는 프레임. 네 칸을 늘 두어 높이가 같다. */
function Layers({ step }: { step: VisualStep }) {
  const layers = step.layers ?? [];
  const slots: (string | undefined)[] = [undefined, undefined, undefined, undefined];
  layers.forEach((l, i) => { slots[4 - layers.length + i] = l; });
  const newest = 4 - layers.length;
  return (
    <div className={step.layers ? 'frame' : 'frame is-wave'}>
      <ol className="frame__slots" aria-label={step.layers ? '프레임 구성, 바깥 헤더부터' : undefined}>
        {slots.map((l, i) => <li key={i} className={l ? (i === newest ? 'frame__slot is-new' : 'frame__slot') : 'frame__slot is-empty'} aria-hidden={l ? undefined : 'true'}>{l && i === newest && <span className="sr">새로 더해진 층: </span>}{l ?? ''}</li>)}
      </ol>
      {!step.layers && (
        <div className="frame__wave">
          <svg viewBox="0 0 320 40" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 20 Q10 4 20 20 T40 20 T60 20 T80 20 T100 20 T120 20 T140 20 T160 20 T180 20 T200 20 T220 20 T240 20 T260 20 T280 20 T300 20 T320 20" /></svg>
          <span>{step.state}</span>
        </div>
      )}
    </div>
  );
}

function ScanList({ step }: { step: VisualStep }) {
  return (
    <div className="table-wrap scan-demo">
      <table>
        <caption>스캔 목록 (가상 값, 측정값 아님)</caption>
        <thead><tr><th scope="col">SSID</th><th scope="col">BSSID</th><th scope="col">채널</th><th scope="col">RSSI</th></tr></thead>
        <tbody>
          {/* 받지 않은 줄도 같은 값을 숨겨 그려 두어 줄 높이가 같다. 표가 자라도 도식 높이는 그대로다. */}
          {SCAN_EXAMPLE.map((r, i) => {
            const got = i < (step.listed ?? 0);
            const wait = !got && i === (step.listed ?? 0) && (i === 0 ? '아직 받은 정보가 없습니다.' : '아직 받지 않음');
            return (
              <tr key={r.bssid} className={got ? (i === step.newRow ? (step.returns ? 'is-new is-late' : 'is-new') : undefined) : 'is-empty'}>
                <td>{wait && <span className="scan-demo__wait">{wait}</span>}{r.ssid}</td><td><code>{r.bssid}</code></td><td>{r.channel}</td><td>{r.rssi}dBm</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** 한 단계의 도식. 문장에 없는 정보를 넣지 않고, 누가 말하는지와 상태만 보여 준다. */
function Scene({ step, actors, kind }: { step: VisualStep; actors?: [string, string]; kind: Kind }) {
  if (kind === 'layers') return <Layers step={step} />;
  const left = actors?.[0] ?? '';
  const right = step.peer ?? actors?.[1] ?? '';
  const [from, to] = step.from === 1 ? [right, left] : [left, right];
  const said = [step.signal && `${from}에서 ${to}(으)로 ${step.signal}`, step.returns && `${to}에서 ${from}(으)로 ${step.returns}`].filter(Boolean).join(', ');
  return (
    <>
      <div className="scene-art" role="img" aria-label={`도식: ${step.title}. ${said || step.state || ''}`}>
        <Diagram kind={kind} step={step} actors={actors} tall={false} />
        <Diagram kind={kind} step={step} actors={actors} tall />
      </div>
      {kind === 'nfc' && <p className="scene-key"><span className="scene-key__energy">초록 곡선: 자기장 에너지</span><span className="scene-key__data">검은 화살표: 데이터 프레임</span></p>}
      {kind === 'scan' && <ScanList step={step} />}
    </>
  );
}

/** 단계별 원리 그림. 스크립트가 없으면 CSS가 모든 단계를 펼쳐 보여 준다. */
export function Stepper({ label, actors, steps = [], scenarios, note }: StepperProps) {
  const groups: StepScenario[] = scenarios ?? [{ id: 'all', label: '', steps }];
  const all = groups.flatMap((g) => g.steps);
  const kind: Kind = all.some((s) => s.layers) ? 'layers' : all.some((s) => s.field !== undefined) ? 'nfc' : all.some((s) => s.channel !== undefined) ? 'scan' : 'web';
  const [scenario, setScenario] = useState(groups[0].id);
  const [current, setCurrent] = useState(0);
  const [play, setPlay] = useState(0);
  const [interactive, setInteractive] = useState(false);
  useEffect(() => setInteractive(true), []);
  const active = groups.find((g) => g.id === scenario) ?? groups[0];
  const last = active.steps.length - 1;
  const go = (n: number) => { setCurrent(n); setPlay((p) => p + 1); };
  const name = label.replace(/\s/g, '-');

  return (
    <section className={`stepper stepper--${kind}`} aria-label={label}>
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
      <ol className="stepper__progress" aria-hidden="true">
        {active.steps.map((s, i) => <li key={s.title} className={i < current ? 'is-done' : i === current ? 'is-current' : undefined} />)}
      </ol>
      <div className="stepper__stages">
        {groups.map((g) => (
          <div key={g.id} className={g.id === active.id ? 'stepper__group is-current' : 'stepper__group'}>
            {scenarios && <h3 className="stepper__group-title">{g.label}</h3>}
            <ol className="stepper__list">
              {g.steps.map((s, i) => (
                <li key={s.title} className={g.id === active.id && i === current ? 'stepper__step is-current' : 'stepper__step'} inert={interactive && (g.id !== active.id || i !== current)}>
                  <h3><span className="stepper__n">{i + 1}.</span> {s.title}</h3>
                  <div className="stepper__picture" key={g.id === active.id && i === current ? play : 0}>
                    <Scene step={s} actors={actors} kind={kind} />
                  </div>
                  <p>{s.body}</p>
                  {s.ask && (
                    <details className="think stepper__question">
                      <summary>{s.ask[0]}</summary>
                      <div className="think__answer"><p>{s.ask[1]}</p></div>
                    </details>
                  )}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      <div className="stepper__controls">
        <button className="btn btn--quiet btn--small" type="button" disabled={current === 0} onClick={() => go(0)}>처음</button>
        <button className="btn btn--quiet btn--small" type="button" disabled={current === 0} onClick={() => go(current - 1)}>이전</button>
        <button className="btn btn--small" type="button" disabled={current === last} onClick={() => go(current + 1)}>다음</button>
        <button className="btn btn--quiet btn--small stepper__replay" type="button" onClick={() => setPlay((p) => p + 1)}>이 단계 다시 보기</button>
        <div className="stepper__status">
          {groups.flatMap((g) => g.steps.map((s, i) => <p key={`${g.id}-${i}`} className="status stepper__reserve" aria-hidden="true">{scenarios ? `${g.label}, ` : ''}{i + 1}/{g.steps.length} 단계: {s.title}</p>))}
          <p className="status" role="status">{scenarios ? `${active.label}, ` : ''}{current + 1}/{active.steps.length} 단계: {active.steps[current].title}</p>
        </div>
      </div>
      {/* 관찰 질문은 무대 밖에 둔다. 답을 펼쳐도 도식과 단추는 움직이지 않고, 질문 없는 단계에 빈자리를 남기지 않는다. */}
      {active.steps[current].ask && (
        <details className="think stepper__ask" key={`${active.id}-${current}`}>
          <summary>생각해 보기: {active.steps[current].ask![0]}</summary>
          <div className="think__answer"><p>{active.steps[current].ask![1]}</p></div>
        </details>
      )}
    </section>
  );
}
