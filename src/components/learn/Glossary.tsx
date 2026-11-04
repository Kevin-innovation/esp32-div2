import { useEffect, useMemo, useState } from 'react';
import { GLOSSARY_CATEGORIES, type Term } from '../../data/glossary';
import { normalize } from '../../lib/text';

export function Glossary({ terms, base }: { terms: Term[]; base: string }) {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('전체');

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

  const prepared = useMemo(
    () => terms.map((term) => ({ term, hay: normalize([term.ko, term.en, ...term.aliases, term.mean, term.example, term.confuse].join(' ')), name: normalize([term.ko, term.en, ...term.aliases].join(' ')) })),
    [terms],
  );
  const tokens = q.trim().split(/\s+/).map(normalize).filter(Boolean);
  const matches = prepared
    .filter((p) => (category === '전체' || p.term.category === category) && tokens.every((t) => p.hay.includes(t)))
    // 이름이 맞는 용어를 설명에만 나온 용어보다 먼저 보여 준다.
    .sort((a, b) => Number(tokens.every((t) => b.name.includes(t))) - Number(tokens.every((t) => a.name.includes(t))));

  return (
    <div>
      <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="glossary-q">용어 찾기 (한글, 영문, 약어)</label>
        <input id="glossary-q" type="search" placeholder="예: 부하 변조, rssi, 비콘" autoComplete="off" value={q} onChange={(e) => change(e.target.value)} />
        <fieldset style={{ marginTop: 'var(--space-sm)' }}>
          <legend>분류</legend>
          <div className="seg">
            {['전체', ...GLOSSARY_CATEGORIES].map((c) => (
              <span key={c} style={{ display: 'contents' }}>
                <input type="radio" name="glossary-cat" id={`cat-${c}`} checked={category === c} onChange={() => setCategory(c)} />
                <label htmlFor={`cat-${c}`}>{c}</label>
              </span>
            ))}
          </div>
        </fieldset>
        <p className="status" role="status">{matches.length}개 용어</p>
      </form>
      {matches.length === 0 && <p>찾지 못했습니다. 더 짧은 낱말이나 영문 약어로 다시 찾아보세요.</p>}
      <dl className="glossary">
        {matches.map(({ term: t }) => (
          <div key={t.id} id={t.id} className="glossary__item">
            <dt>{t.ko} <span className="feature__en">{t.en}</span></dt>
            <dd>
              <p>{t.mean}</p>
              <p><strong>예:</strong> {t.example}</p>
              <p><strong>헷갈리는 점:</strong> {t.confuse}</p>
              <p className="small"><a href={`${base}${t.href}`}>{t.hrefLabel}</a> <span className="muted">{t.category}</span></p>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
