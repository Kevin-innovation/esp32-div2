import { useEffect, useMemo, useState } from 'react';
import type { SearchItem } from '../data/guide';
import { normalize } from '../lib/text';


export function GuideSearch({ index, base }: { index: SearchItem[]; base: string }) {
  const [q, setQ] = useState('');

  useEffect(() => {
    const initial = new URLSearchParams(location.search).get('q');
    if (initial) setQ(initial);
  }, []);

  const change = (value: string) => {
    setQ(value);
    const url = new URL(location.href);
    if (value) url.searchParams.set('q', value);
    else url.searchParams.delete('q');
    history.replaceState(null, '', url);
  };

  const prepared = useMemo(() => index.map((item) => ({ item, hay: normalize(`${item.title} ${item.sub} ${item.terms}`) })), [index]);
  const tokens = q.trim().split(/\s+/).map(normalize).filter(Boolean);
  const results = tokens.length ? prepared.filter((p) => tokens.every((t) => p.hay.includes(t))).map((p) => p.item) : [];

  return (
    <form className="search" id="search" role="search" onSubmit={(e) => e.preventDefault()}>
      <label htmlFor="guide-q">기능 찾기 (한글, 영문 모두)</label>
      <input id="guide-q" type="search" placeholder="예: 패킷, Packet Monitor, firmware.bin, 지갑" autoComplete="off" value={q} onChange={(e) => change(e.target.value)} />
      <div className="search__results" aria-live="polite">
        {tokens.length > 0 && <p className="small muted">검색 결과 {results.length}건</p>}
        {tokens.length > 0 && results.length === 0 && <p className="small">찾지 못했습니다. 메뉴의 영문 이름이나 더 짧은 낱말로 다시 찾아보세요.</p>}
        {results.length > 0 && (
          <ol>
            {results.slice(0, 20).map((r) => (
              <li key={r.href + r.title}>
                <a href={`${base}${r.href}`}><strong>{r.title}</strong><span>{r.sub}</span></a>
              </li>
            ))}
          </ol>
        )}
      </div>
    </form>
  );
}
