import { useState } from 'react';
import type { MenuItem } from '../../data/learn';

/** 메인 메뉴 8칸 설명. 실제 기기를 조작하지 않는다. 스크립트가 없으면 설명을 모두 펼친다. */
export function DeviceExplorer({ items, base }: { items: MenuItem[]; base: string }) {
  const [current, setCurrent] = useState(items[0].id);
  const href = (h: string) => (h.startsWith('#') ? h : `${base}${h}`);

  return (
    <div className="explorer">
      <div className="explorer__grid" role="group" aria-label="메인 메뉴 8개. 고르면 아래에 설명이 나옵니다.">
        {items.map((m) => (
          <button key={m.id} type="button" className="explorer__key" aria-pressed={current === m.id} onClick={() => setCurrent(m.id)}>
            {m.name}
          </button>
        ))}
      </div>
      <div className="explorer__panels" aria-live="polite">
        {items.map((m) => (
          <div key={m.id} className={current === m.id ? 'explorer__panel is-current' : 'explorer__panel'}>
            <h3>{m.name} <span className="feature__en">{m.ko}</span></h3>
            <dl className="facts">
              <div><dt>역할</dt><dd>{m.role}</dd></div>
              <div><dt>다음 화면</dt><dd>{m.next}</dd></div>
              <div><dt>확인 수준</dt><dd>{m.checked}</dd></div>
            </dl>
            <p><a href={href(m.href)}>{m.linkLabel}</a></p>
          </div>
        ))}
      </div>
      <p className="field__help">이 버튼은 설명을 고르는 것입니다. 실제 기기를 원격으로 움직이지 않습니다.</p>
    </div>
  );
}
