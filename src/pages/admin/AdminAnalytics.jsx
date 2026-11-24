import { DEPARTMENTS } from '../../data/constants';
import { buildWeeklyTrend } from '../../utils/trend';
import WeeklyTrend from '../../components/charts/WeeklyTrend';
import CategoryBars from '../../components/charts/CategoryBars';
import StatusDonut from '../../components/charts/StatusDonut';

export default function AdminAnalytics({ complaints }) {
  const rows = DEPARTMENTS.map((d) => {
    const items = complaints.filter((c) => c.department === d);
    const done = items.filter((c) => c.status === 'Resolved').length;
    return { d, total: items.length, done };
  }).filter((r) => r.total > 0);

  return (
    <>
      <WeeklyTrend data={buildWeeklyTrend(complaints)} />
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3.5 [&>.card]:mb-0">
        <CategoryBars complaints={complaints} />
        <StatusDonut complaints={complaints} />
      </div>
      <div className="card overflow-x-auto">
        <h3>Department workload</h3>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>{['Department', 'Assigned', 'Open', 'Resolved', 'Completion'].map((h) => <th key={h} scope="col" className="p-2 text-[11px] text-mu">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map(({ d, total, done }) => (
              <tr key={d} className="border-t border-bd">
                <td className="p-2.5">{d}</td>
                <td className="p-2.5">{total}</td>
                <td className="p-2.5">{total - done}</td>
                <td className="p-2.5">{done}</td>
                <td className="w-[180px] p-2.5">
                  <div className="h-[9px] overflow-hidden rounded-full bg-soft"><div className="h-full bg-pr" style={{ width: `${(done / total) * 100}%` }} /></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
