export default function KpiCard({ label, value, sub, color = 'var(--pr)' }) {
  return (
    <div className="panel relative mb-0 overflow-hidden !p-4">
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
      <span className="text-xs font-medium text-mu">{label}</span>
      <b className="mt-1 block text-[28px] font-bold leading-tight tracking-tight">{value}</b>
      {sub && <span className="text-[11px] text-mu">{sub}</span>}
    </div>
  );
}
