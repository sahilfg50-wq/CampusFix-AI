import KpiCard from '../../components/ui/KpiCard';
import ComplaintRow from '../../components/ui/ComplaintRow';
import EmptyState from '../../components/ui/EmptyState';

export default function StudentDashboard({ student, complaints, onNavigate }) {
  const mine = complaints.filter((c) => c.studentId === student.id);
  const count = (s) => mine.filter((c) => c.status === s).length;
  const resolved = count('Resolved');
  const pct = mine.length ? Math.round((resolved / mine.length) * 100) : 0;
  const urgent = mine.filter((c) => c.status !== 'Resolved' && ['Critical', 'High'].includes(c.priority));
  const track = (id) => onNavigate('track', id);

  return (
    <>
      <div className="card border-0 text-white" style={{ background: 'linear-gradient(120deg,#2563eb,#4338ca)' }}>
        <h2>Welcome back, {student.name.split(' ')[0]}</h2>
        <div>Report an issue and follow it until it is fixed.</div>
        <button type="button" className="mt-2.5 min-h-10 cursor-pointer rounded-xl bg-white px-4 py-2 font-semibold text-blue-700" onClick={() => onNavigate('submit')}>
          Submit complaint
        </button>
      </div>

      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">
        <KpiCard label="Total tickets" value={mine.length} sub="All time" color="#2563eb" />
        <KpiCard label="Pending" value={count('Pending')} sub="Awaiting review" color="#d97706" />
        <KpiCard label="In progress" value={count('In Progress')} sub="Being fixed" color="#3b82f6" />
        <KpiCard label="Resolved" value={resolved} sub={`${pct}% of your tickets`} color="#059669" />
      </div>

      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3.5">
        <div className="card mb-0">
          <h3>Needs attention</h3>
          {urgent.length
            ? urgent.map((c) => <ComplaintRow key={c.id} complaint={c} onOpen={track} />)
            : <p className="muted">Nothing urgent. All high-priority tickets are resolved.</p>}
        </div>
        <div className="card mb-0">
          <h3>Resolution progress</h3>
          <div className="mb-3 mt-1 h-3 overflow-hidden rounded-full bg-soft">
            <div className="h-full bg-emerald-600" style={{ width: `${pct}%` }} />
          </div>
          <span className="muted">{resolved} of {mine.length} resolved</span>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h3>Recent complaints</h3>
          <button type="button" className="btn-gh" onClick={() => onNavigate('mine')}>View all</button>
        </div>
        {mine.length === 0 ? (
          <EmptyState title="No complaints yet" message="Submit your first complaint to get a tracking ID." actionLabel="Submit complaint" onAction={() => onNavigate('submit')} />
        ) : (
          mine.slice(0, 4).map((c) => <ComplaintRow key={c.id} complaint={c} onOpen={track} />)
        )}
      </div>
    </>
  );
}
