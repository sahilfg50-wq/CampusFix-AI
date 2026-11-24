import KpiCard from '../../components/ui/KpiCard';
import ComplaintRow from '../../components/ui/ComplaintRow';
import CategoryBars from '../../components/charts/CategoryBars';
import StatusDonut from '../../components/charts/StatusDonut';

export default function AdminOverview({ complaints, onNavigate }) {
  const total = complaints.length;
  const open = complaints.filter((c) => c.status !== 'Resolved');
  const pending = complaints.filter((c) => c.status === 'Pending').length;
  const resolved = total - open.length;
  const critical = open.filter((c) => c.priority === 'Critical').length;
  const urgent = open.filter((c) => ['Critical', 'High'].includes(c.priority));
  const depts = new Set(open.map((c) => c.department)).size;

  return (
    <>
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2>Operations overview</h2>
          <span className="muted">{open.length} open tickets across {depts} departments</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {critical > 0 && <span className="badge text-rose-600">{critical} critical needs action</span>}
          <button type="button" className="btn-pr" onClick={() => onNavigate('all')}>Manage complaints</button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">
        <KpiCard label="Total" value={total} />
        <KpiCard label="Pending" value={pending} />
        <KpiCard label="Resolved" value={resolved} sub={`${total ? Math.round((resolved / total) * 100) : 0}% rate`} />
        <KpiCard label="High priority open" value={urgent.length} />
      </div>

      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3.5 [&>.card]:mb-0">
        <CategoryBars complaints={complaints} />
        <StatusDonut complaints={complaints} />
      </div>

      <div className="card">
        <h3>High-priority action queue</h3>
        {urgent.length
          ? urgent.map((c) => <ComplaintRow key={c.id} complaint={c} onOpen={(id) => onNavigate('det', id)} />)
          : <p className="muted">No urgent open tickets.</p>}
      </div>
    </>
  );
}
