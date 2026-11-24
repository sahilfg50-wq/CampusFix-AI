export default function WeeklyTrend({ data }) {
  const max = Math.max(...data.flatMap((d) => [d.submitted, d.resolved]), 1);
  return (
    <div className="card">
      <h3>Last 7 days</h3>
      <div className="muted">Submitted (dark) vs resolved (light, counted on the day of the last update)</div>
      <div className="mt-3.5 grid h-[150px] grid-cols-7 items-end gap-2">
        {data.map((d) => (
          <div key={d.day} title={`${d.day}: ${d.submitted} submitted, ${d.resolved} resolved`} className="flex h-full items-end justify-center gap-[3px]">
            <i className="w-3.5 rounded-t bg-pr" style={{ height: `${(d.submitted / max) * 100}%` }} />
            <i className="w-3.5 rounded-t bg-indigo-300" style={{ height: `${(d.resolved / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-2 text-center">
        {data.map((d) => <span key={d.day} className="muted">{d.day}</span>)}
      </div>
    </div>
  );
}
