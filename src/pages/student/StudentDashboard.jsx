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

  const waiting = mine.filter((c) => c.agentStatus === 'awaiting-student');

  return (
    <>
      <div className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-lg shadow-indigo-500/20">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <h2 className="!text-2xl">Welcome back, {student.name.split(' ')[0]} 👋</h2>
          <p className="text-white/85">Report an issue. CampusFix AI routes it and helps you fix simple problems right away.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="min-h-10 cursor-pointer rounded-xl bg-white px-4 py-2 font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50" onClick={() => onNavigate('submit')}>
              ✍️ Submit complaint
            </button>
            <button type="button" className="min-h-10 cursor-pointer rounded-xl bg-white/15 px-4 py-2 font-semibold text-white transition hover:bg-white/25" onClick={() => onNavigate('menu')}>
              🍽️ Today's mess menu
            </button>
          </div>
        </div>
      </div>

      {waiting.length > 0 && (
        <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950/40">
          <p className="font-semibold text-sky-800 dark:text-sky-200">🛠️ The AI sent you steps to fix {waiting.length === 1 ? 'a problem' : `${waiting.length} problems`}</p>
          <p className="mt-0.5 text-sm text-sky-700 dark:text-sky-300">Try them and tell us if it worked. If not, it goes to the department automatically.</p>
          <div className="mt-2">
            {waiting.map((c) => <ComplaintRow key={c.id} complaint={c} onOpen={track} />)}
          </div>
        </div>
      )}

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
