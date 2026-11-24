export default function CategoryBars({ complaints }) {
  const counts = {};
  complaints.forEach((c) => { counts[c.category] = (counts[c.category] || 0) + 1; });
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = rows.length ? rows[0][1] : 1;
  return (
    <div className="card">
      <h3>Complaints by category</h3>
      {rows.map(([name, n]) => (
        <div key={name}>
          <div className="flex justify-between"><span>{name}</span><b>{n}</b></div>
          <div className="mb-3 mt-1 h-[9px] overflow-hidden rounded-full bg-soft">
            <div className="h-full bg-pr" style={{ width: `${(n / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
