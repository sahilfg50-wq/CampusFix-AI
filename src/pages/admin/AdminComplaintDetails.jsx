import { useState } from 'react';
import { DEPARTMENTS, STATUSES, PRIORITIES } from '../../data/constants';
import { PriorityBadge, StatusBadge, SimBadge, AiBadge } from '../../components/ui/Badges';
import { parseAiNote } from '../../utils/aiNote';
import Timeline from '../../components/ui/Timeline';
import EmptyState from '../../components/ui/EmptyState';
import { friendlyError } from '../../lib/errors';
import AgentCard from '../../components/ui/AgentCard';

function Select({ label, value, onChange, options }) {
  const id = `a-${label.toLowerCase()}`;
  return (
    <>
      <label className="label" htmlFor={id}>{label}</label>
      <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </>
  );
}

export default function AdminComplaintDetails({ complaint: c, onNavigate, onUpdate, askConfirm }) {
  const [status, setStatus] = useState(c?.status);
  const [priority, setPriority] = useState(c?.priority);
  const [department, setDepartment] = useState(c?.department);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!c) {
    return <EmptyState title="No complaint selected" message="Open a complaint from the list to review and update it." actionLabel="Back to complaints" onAction={() => onNavigate('all')} />;
  }

  const ai = parseAiNote(c.aiNote);

  const apply = async () => {
    setSaving(true);
    setError('');
    try {
      await onUpdate(c.id, { status, priority, department, note: note.trim() });
      setNote('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (status === 'Resolved') {
      askConfirm({ title: 'Mark as resolved?', message: 'The student will see this ticket as resolved.', confirmLabel: 'Mark resolved', onConfirm: apply });
    } else {
      apply();
    }
  };

  return (
    <>
      <button type="button" className="btn-gh" onClick={() => onNavigate('all')}>← Back to complaints</button>
      <div className="mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3.5">
        <div>
          <div className="card">
            <span className="id-mono">{c.id}</span> <StatusBadge status={c.status} /> <PriorityBadge priority={c.priority} />
            <h2 className="mt-1.5">{c.title}</h2>
            <p className="my-2">{c.description}</p>
            <div className="muted">Reported by {c.reporter} · {c.category} · {c.building}, {c.location}</div>
            <div className="mt-3 rounded-xl bg-soft p-2.5">
              {ai.source === 'rules' ? <SimBadge>Auto-classified (built-in rules)</SimBadge> : <AiBadge>{ai.label} analysis</AiBadge>}
              <p className="my-1.5">{ai.analysis}</p>
              {ai.action && <p><b>Suggested action:</b> {ai.action}</p>}
            </div>
          </div>
          <div className="mb-4">
            <AgentCard complaint={c} />
          </div>
          <div className="card">
            <h3>Audit timeline</h3>
            <Timeline updates={c.updates} />
          </div>
        </div>

        <form className="card" onSubmit={handleSubmit}>
          <h3>Status &amp; assignment</h3>
          {saved && <div className="ok-box" role="status">Complaint updated</div>}
          <Select label="Status" value={status} onChange={setStatus} options={STATUSES} />
          <Select label="Priority" value={priority} onChange={setPriority} options={[...PRIORITIES].reverse()} />
          <Select label="Department" value={department} onChange={setDepartment} options={DEPARTMENTS} />
          <label className="label" htmlFor="a-note">Resolution note (optional)</label>
          <textarea id="a-note" className="field" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="err mt-2" role="alert">{error}</div>
          <p className="mt-2"><button type="submit" className="btn-pr" disabled={saving}>{saving ? 'Saving…' : 'Update complaint'}</button></p>
        </form>
      </div>
    </>
  );
}
