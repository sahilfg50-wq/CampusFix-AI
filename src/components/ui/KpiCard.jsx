export default function KpiCard({ label, value, sub, color }) {
  return (
    <div className="card mb-0" style={color ? { borderTop: `3px solid ${color}` } : undefined}>
      <span className="muted">{label}</span>
      <b className="block text-[26px]">{value}</b>
      {sub && <span className="muted">{sub}</span>}
    </div>
  );
}
