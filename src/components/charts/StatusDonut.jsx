import { StatusBadge } from '../ui/Badges';

export default function StatusDonut({ complaints }) {
  const total = complaints.length;
  const count = (s) => complaints.filter((c) => c.status === s).length;
  const resolved = count('Resolved');
  const progress = count('In Progress');
  const pending = count('Pending');
  const a = total ? (resolved / total) * 360 : 0;
  const b = total ? a + (progress / total) * 360 : 0;
  return (
    <div className="card">
      <h3>Resolution breakdown</h3>
      <div className="flex flex-wrap items-center gap-5">
        <div
          role="img"
          aria-label={`${resolved} resolved, ${progress} in progress, ${pending} pending`}
          className="grid h-[130px] w-[130px] shrink-0 place-items-center rounded-full"
          style={{ background: total ? `conic-gradient(#10b981 0 ${a}deg, #3b82f6 ${a}deg ${b}deg, #f59e0b ${b}deg 360deg)` : 'var(--soft)' }}
        >
          <span className="grid h-[84px] w-[84px] place-items-center rounded-full bg-card text-xl font-bold">{total}</span>
        </div>
        <div className="space-y-3">
          <div><StatusBadge status="Resolved" /> {resolved}</div>
          <div><StatusBadge status="In Progress" /> {progress}</div>
          <div><StatusBadge status="Pending" /> {pending}</div>
        </div>
      </div>
    </div>
  );
}
