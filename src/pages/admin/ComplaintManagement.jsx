import { useState } from 'react';
import { CATEGORIES, DEPARTMENTS, STATUSES, PRIORITIES } from '../../data/constants';
import { PriorityBadge, StatusBadge } from '../../components/ui/Badges';
import EmptyState from '../../components/ui/EmptyState';
import { sortComplaints } from '../../utils/sort';
import { formatDateTime } from '../../utils/format';

const NO_FILTERS = { q: '', category: '', department: '', status: '', priority: '' };
const COLUMNS = [['id', 'ID'], ['title', 'Complaint'], [null, 'Department'], ['priority', 'Priority'], ['status', 'Status'], ['createdAt', 'Filed']];

function FilterSelect({ label, all, options, value, onChange }) {
  return (
    <select className="field" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{all}</option>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}

export default function ComplaintManagement({ complaints, onNavigate }) {
  const [f, setF] = useState(NO_FILTERS);
  const [sort, setSort] = useState({ key: 'createdAt', dir: -1 });
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const open = (id) => onNavigate('det', id);

  const q = f.q.toLowerCase();
  const filtered = complaints.filter(
    (c) =>
      (!q || `${c.id}${c.title}${c.reporter}${c.building}`.toLowerCase().includes(q)) &&
      (!f.category || c.category === f.category) &&
      (!f.department || c.department === f.department) &&
      (!f.status || c.status === f.status) &&
      (!f.priority || c.priority === f.priority)
  );
  const list = sortComplaints(filtered, sort.key, sort.dir);
  const anyFilter = Object.values(f).some(Boolean);
  const sortBy = (key) => setSort(sort.key === key ? { key, dir: -sort.dir } : { key, dir: 1 });

  return (
    <>
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2>Complaint management <span className="muted">{list.length} of {complaints.length}</span></h2>
          {anyFilter && <button type="button" className="btn-gh" onClick={() => setF(NO_FILTERS)}>Clear filters</button>}
        </div>
        <div className="mt-2.5 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3.5">
          <input className="field" aria-label="Search complaints" value={f.q} onChange={(e) => set('q')(e.target.value)} placeholder="Search ID, title, student" />
          <FilterSelect label="Category" all="All categories" options={CATEGORIES} value={f.category} onChange={set('category')} />
          <FilterSelect label="Department" all="All departments" options={DEPARTMENTS} value={f.department} onChange={set('department')} />
          <FilterSelect label="Status" all="All statuses" options={STATUSES} value={f.status} onChange={set('status')} />
          <FilterSelect label="Priority" all="All priorities" options={PRIORITIES} value={f.priority} onChange={set('priority')} />
          <select className="field md:hidden" aria-label="Sort by" value={`${sort.key}:${sort.dir}`} onChange={(e) => { const [key, dir] = e.target.value.split(':'); setSort({ key, dir: Number(dir) }); }}>
            <option value="createdAt:-1">Newest first</option>
            <option value="createdAt:1">Oldest first</option>
            <option value="priority:1">Priority (high first)</option>
            <option value="status:1">Status</option>
          </select>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState title="No complaints match" message="Adjust or clear the filters to see more tickets." actionLabel="Clear filters" onAction={() => setF(NO_FILTERS)} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  {COLUMNS.map(([key, label]) => (
                    <th key={label} scope="col" aria-sort={key && sort.key === key ? (sort.dir > 0 ? 'ascending' : 'descending') : undefined} className="p-2 text-[11px] text-mu">
                      {key ? (
                        <button type="button" className="cursor-pointer hover:text-pr" onClick={() => sortBy(key)}>
                          {label}{sort.key === key ? (sort.dir > 0 ? ' ▲' : ' ▼') : ''}
                        </button>
                      ) : label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} tabIndex={0} onClick={() => open(c.id)} onKeyDown={(e) => e.key === 'Enter' && open(c.id)} className="cursor-pointer border-t border-bd hover:bg-soft">
                    <td className="id-mono p-2.5">{c.id}</td>
                    <td className="p-2.5"><b>{c.title}</b><div className="muted">{c.building} · {c.reporter}</div></td>
                    <td className="p-2.5">{c.department}</td>
                    <td className="p-2.5"><PriorityBadge priority={c.priority} /></td>
                    <td className="p-2.5"><StatusBadge status={c.status} /></td>
                    <td className="p-2.5">{formatDateTime(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden">
            {list.map((c) => (
              <div key={c.id} role="button" tabIndex={0} onClick={() => open(c.id)} onKeyDown={(e) => e.key === 'Enter' && open(c.id)} className="card cursor-pointer space-y-1.5">
                <div className="flex justify-between"><span className="id-mono">{c.id}</span><span className="muted">{formatDateTime(c.createdAt)}</span></div>
                <b>{c.title}</b>
                <div className="muted">{c.building} · {c.reporter}</div>
                <div className="muted">{c.department}</div>
                <div className="flex gap-1.5"><PriorityBadge priority={c.priority} /><StatusBadge status={c.status} /></div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
