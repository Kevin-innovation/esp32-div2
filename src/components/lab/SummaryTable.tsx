/** 계산 결과 표. 'a/b' 비율과 개수는 막대로도 보여 주고, 값 자체는 늘 글자로 적는다. */
export function SummaryTable({ rows, total, caption }: { rows: [string, string][]; total: number; caption: string }) {
  const share = (value: string) => {
    const r = value.match(/^(\d+)\/(\d+)$/);
    if (r) return Number(r[2]) ? Number(r[1]) / Number(r[2]) : null;
    return /^\d+$/.test(value) && total ? Math.min(1, Number(value) / total) : null;
  };
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={caption}>
      <table className="summary-table">
        <caption>{caption}</caption>
        <thead><tr><th scope="col">항목</th><th scope="col">값</th><th scope="col"><span className="sr">비율 막대</span></th></tr></thead>
        <tbody>{rows.map(([k, v]) => {
          const p = share(v);
          return <tr key={k}><th scope="row">{k}</th><td className="summary-table__value">{v}</td><td className="summary-table__bar">{p !== null && <span className="bar-track" aria-hidden="true"><span className="bar-fill" style={{ transform: `scaleX(${p})` }} /></span>}</td></tr>;
        })}</tbody>
      </table>
    </div>
  );
}
