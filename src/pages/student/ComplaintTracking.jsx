import { useState } from 'react';
import { StatusBadge, PriorityBadge, SimBadge, AiBadge } from '../../components/ui/Badges';
import { parseAiNote } from '../../utils/aiNote';
import Timeline from '../../components/ui/Timeline';
import EmptyState from '../../components/ui/EmptyState';

const STEPS = ['Submitted', 'AI triage & routed', 'Technician assigned', 'Resolved'];
const STEP_INDEX = { Pending: 1, 'In Progress': 2, Resolved: 3 };

export default function ComplaintTracking({ complaints, selectedId, onSelect }) {
  const [query, setQuery] = useState(selectedId || '');
  const ticket = complaints.find((c) => c.id.toLowerCase() === (selectedId || '').trim().toLowerCase());
  const reached = ticket ? STEP_INDEX[ticket.status] : 0;

  return (
    <>
      <form className="card" onSubmit={(e) => { e.preventDefault(); onSelect(query.trim()); }}>
        <h2>Track complaint</h2>
        <div className="mt-2 flex gap-2">
          <input className="field" aria-label="Complaint ID" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="CFX-2026-1048" />
          <button type="submit" className="btn-pr">Track</button>
        </div>
      </form>

      {!ticket ? (
        <EmptyState
          title={selectedId ? `No ticket found for “${selectedId}”` : 'Enter a complaint ID'}
          message={selectedId ? 'Check the ID and try again.' : 'Type an ID such as CFX-2026-1048 and press Track.'}
        />
      ) : (
        <>
          <div className="card">
            <span className="id-mono">{ticket.id}</span> <StatusBadge status={ticket.status} /> <PriorityBadge priority={ticket.priority} />
            <h2 className="mt-1.5">{ticket.title}</h2>
            <div className="my-3.5 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
              {STEPS.map((s, i) => (
                <div key={s} className={`rounded-xl p-2.5 font-medium ${i <= reached ? 'nav-on' : 'bg-soft text-mu'}`}>{s}</div>
              ))}
            </div>
            <div className="muted">{ticket.category} · {ticket.building} · {ticket.location}</div>
<div className="mt-3 rounded-xl bg-soft p-3">
  <h3 className="font-semibold">CampusFix AI Agent</h3>

  {!ticket.agentStatus && (
    <p className="muted mt-2">
      Agent processing status will appear shortly.
    </p>
  )}

  {ticket.agentStatus === 'processing' && (
    <p className="mt-2">
      AI agent is investigating the complaint...
    </p>
  )}

  {ticket.agentStatus === 'resolved' && (
    <>
      <p className="mt-2 font-semibold text-green-700">
        AI Agent: Resolved
      </p>
      <p className="muted mt-1">
        {ticket.agentResolution}
      </p>
    </>
  )}

  {ticket.agentStatus === 'escalated' && (
    <>
      <p className="mt-2 font-semibold">
        AI Agent: Admin review required
      </p>
      <p className="muted mt-1">
        {ticket.agentResolution}
      </p>
    </>
  )}

  {ticket.agentStatus === 'pending' && (
    <p className="muted mt-2">
      Agent processing has not started or could not be completed.
    </p>
  )}
</div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3.5">
            <div className="card">
              <h3>Activity timeline</h3>
              <Timeline updates={ticket.updates} />
            </div>
            <div className="card">
              <h3>Department &amp; SLA</h3>
              {parseAiNote(ticket.aiNote).source === 'gemini' ? <AiBadge>Gemini AI</AiBadge> : <SimBadge>Simulated AI</SimBadge>}
              <p className="my-2"><b>{ticket.department}</b><br />Target: {ticket.sla}</p>
              <p className="muted">{parseAiNote(ticket.aiNote).analysis}</p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
