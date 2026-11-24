import { useState } from 'react';
import ComplaintRow from '../../components/ui/ComplaintRow';
import EmptyState from '../../components/ui/EmptyState';
import { sortComplaints } from '../../utils/sort';
import { STATUSES } from '../../data/constants';

const SORTS = [['createdAt', 'Newest first'], ['priority', 'Priority'], ['status', 'Status']];

export default function MyComplaints({ student, complaints, onNavigate }) {
  const [tab, setTab] = useState('All');
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState('createdAt');

  const mine = complaints.filter((c) => c.studentId === student.id);
  const query = q.toLowerCase();
  const filtered = mine.filter(
    (c) => (tab === 'All' || c.status === tab) && (!query || `${c.id}${c.title}${c.building}${c.category}`.toLowerCase().includes(query))
  );
  const list = sortComplaints(filtered, sortKey, sortKey === 'createdAt' ? -1 : 1);
  const reset = () => { setTab('All'); setQ(''); };

  return (
    <>
      <div className="card">
        <h2>My complaints</h2>
        <div className="my-2.5 flex flex-wrap gap-1.5">
          {['All', ...STATUSES].map((t) => (
            <button key={t} type="button" className={t === tab ? 'btn-pr' : 'btn-gh'} onClick={() => setTab(t)}>
              {t} ({t === 'All' ? mine.length : mine.filter((c) => c.status === t).length})
            </button>
          ))}
        </div>
        <div className="grid grid-cols-[2fr_1fr] gap-3.5">
          <input className="field" aria-label="Search complaints" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID, title, building" />
          <select className="field" aria-label="Sort" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            {SORTS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>
      </div>

      {list.length ? (
        <div className="card">
          {list.map((c) => <ComplaintRow key={c.id} complaint={c} onOpen={(id) => onNavigate('track', id)} />)}
        </div>
      ) : (
        <EmptyState
          title="No complaints found"
          message={mine.length ? 'Try a different search or status filter.' : 'You have not filed any complaints yet.'}
          actionLabel={mine.length ? 'Reset filters' : 'Submit complaint'}
          onAction={mine.length ? reset : () => onNavigate('submit')}
        />
      )}
    </>
  );
}
