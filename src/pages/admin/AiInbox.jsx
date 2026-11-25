import { useEffect, useMemo, useState } from 'react';
import { subscribeMailOutbox } from '../../services/agent';
import { ROUTE_INFO } from '../../components/ui/AgentCard';
import { PriorityBadge, StatusBadge } from '../../components/ui/Badges';

const MAIL_STATUS = {
  sent: 'bg-emerald-100 text-emerald-700',
  simulated: 'bg-slate-100 text-slate-600',
  failed: 'bg-rose-100 text-rose-700',
};

const ago = (iso) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
  return new Date(iso).toLocaleDateString('en-IN');
};

export default function AiInbox({ complaints, onNavigate }) {
  const [mails, setMails] = useState([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const [filter, setFilter] = useState('open');

  useEffect(() => subscribeMailOutbox(setMails, (e) => setError(e.message || 'Could not load the outbox.')), []);

  const agentDone = complaints.filter((c) => c.agentRoute);
  const referred = useMemo(
    () =>
      complaints
        .filter((c) => c.referredToAdmin && (filter === 'all' || c.status !== 'Resolved'))
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
    [complaints, filter]
  );

  const count = (pred) => agentDone.filter(pred).length;
  const stats = [
    { label: 'Handled by AI', value: agentDone.length },
    { label: 'Solved by AI / self-help', value: count((c) => c.agentStatus === 'resolved'), tone: 'text-emerald-600' },
    { label: 'Waiting for student', value: count((c) => c.agentStatus === 'awaiting-student'), tone: 'text-sky-600' },
    { label: 'Sent to departments', value: count((c) => c.agentStatus === 'forwarded'), tone: 'text-amber-600' },
    { label: 'Emergency / admin', value: count((c) => c.agentStatus === 'escalated'), tone: 'text-rose-600' },
  ];

  const simulated = mails.some((m) => m.status === 'simulated');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">AI Inbox</h2>
        <p className="mt-1 text-sm text-mu">What the CampusFix AI agent solved, forwarded and referred to you.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="panel !p-4">
            <p className="text-xs text-mu">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.tone || ''}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="panel-title !mb-0">Referred to admin</h3>
          <div className="flex gap-1">
            {[['open', 'Open'], ['all', 'All']].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setFilter(id)} className={`chip ${filter === id ? 'chip-on' : ''}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {referred.length === 0 ? (
          <p className="mt-3 text-sm text-mu">Nothing referred right now.</p>
        ) : (
          <ul className="mt-3 divide-y divide-bd">
            {referred.map((c) => {
              const route = ROUTE_INFO[c.agentRoute];
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => onNavigate('det', c.id)} className="flex w-full flex-wrap items-center gap-2 rounded-lg px-2 py-3 text-left hover:bg-soft">
                    <span className="id-mono">{c.id}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{c.title}</span>
                    {route && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${route.tone}`}>{route.icon} {route.label}</span>}
                    <PriorityBadge priority={c.priority} />
                    <StatusBadge status={c.status} />
                    <span className="w-full text-xs text-mu">{c.department} · {c.agentResolution}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="panel">
        <h3 className="panel-title">Email outbox</h3>
        {simulated && (
          <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Demo mode: emails marked “simulated” were not actually sent. Add a Gmail address and App Password
            (SMTP_USER, SMTP_PASS) in functions/.env.local to send real emails for free.
          </p>
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {mails.length === 0 ? (
          <p className="text-sm text-mu">No emails yet. Submit a complaint as a student to see the agent work.</p>
        ) : (
          <ul className="divide-y divide-bd">
            {mails.map((m) => (
              <li key={m.id} className="py-3">
                <button type="button" onClick={() => setOpen(open === m.id ? null : m.id)} className="flex w-full flex-wrap items-center gap-2 text-left">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${MAIL_STATUS[m.status] || ''}`}>{m.status}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{m.subject}</span>
                  <span className="text-xs text-mu">{ago(m.createdAt)}</span>
                  <span className="w-full text-xs text-mu">
                    To {m.to}{m.cc ? ` · cc ${m.cc}` : ''}
                  </span>
                </button>
                {open === m.id && (
                  <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-soft p-3 font-sans text-xs leading-relaxed">
                    {m.text}
                    {m.error ? `\n\nError: ${m.error}` : ''}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
