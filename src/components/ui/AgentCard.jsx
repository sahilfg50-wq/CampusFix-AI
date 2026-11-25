import { useState } from 'react';
import { respondToSelfHelp } from '../../services/agent';
import { friendlyError } from '../../lib/errors';

export const ROUTE_INFO = {
  'self-help': { label: 'Self-help fix', tone: 'bg-sky-100 text-sky-700', icon: '🛠️' },
  portal: { label: 'Portal recovery', tone: 'bg-indigo-100 text-indigo-700', icon: '🔄' },
  department: { label: 'Sent to department', tone: 'bg-amber-100 text-amber-700', icon: '📨' },
  emergency: { label: 'Emergency', tone: 'bg-rose-100 text-rose-700', icon: '🚨' },
  admin: { label: 'Admin review', tone: 'bg-violet-100 text-violet-700', icon: '👤' },
};

const STATUS_TEXT = {
  processing: 'AI agent is looking at your complaint…',
  'awaiting-student': 'Try these steps and tell us if they worked',
  resolved: 'Solved',
  forwarded: 'Forwarded to the department',
  escalated: 'Referred to the admin',
};

const MAIL_TONE = { sent: 'text-emerald-600', simulated: 'text-mu', failed: 'text-rose-600' };

// Shows what the CampusFix AI agent did with a complaint.
// `canRespond` = the logged-in student owns it and can answer the self-help question.
export default function AgentCard({ complaint: c, canRespond = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const route = ROUTE_INFO[c.agentRoute];
  const help = c.aiSelfHelp;

  const answer = async (solved) => {
    setBusy(true);
    setError('');
    try {
      await respondToSelfHelp(c.id, solved);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="panel-title !mb-0 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-xs text-white">AI</span>
          CampusFix AI Agent
        </h3>
        {route && (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${route.tone}`}>
            {route.icon} {route.label}
          </span>
        )}
      </div>

      {!c.agentStatus ? (
        <p className="mt-3 animate-pulse text-sm text-mu">Waiting for the AI agent to start…</p>
      ) : (
        <>
          <p className={`mt-3 font-semibold ${c.agentStatus === 'resolved' ? 'text-emerald-600' : ''}`}>
            {STATUS_TEXT[c.agentStatus] || c.agentStatus}
          </p>
          {c.agentResolution && <p className="mt-1 text-sm text-mu">{c.agentResolution}</p>}
        </>
      )}

      {help?.steps?.length > 0 && (
        <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900 dark:bg-sky-950/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{help.title}</p>
            <span className="text-[11px] text-mu">{help.provider || 'Built-in guide'}</span>
          </div>
          <ol className="mt-3 space-y-2">
            {help.steps.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sky-600 text-xs font-bold text-white">{i + 1}</span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>

          {c.agentStatus === 'awaiting-student' && canRespond && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => answer(true)} className="btn-pr !bg-emerald-600">
                ✓ Yes, it is fixed
              </button>
              <button type="button" disabled={busy} onClick={() => answer(false)} className="btn-gh">
                ✗ Still not working, send to department
              </button>
            </div>
          )}
          {c.agentStatus === 'awaiting-student' && !canRespond && (
            <p className="mt-3 text-xs text-mu">Waiting for the student to try these steps.</p>
          )}
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        </div>
      )}

      {c.emailsSent?.length > 0 && (
        <div className="mt-4 border-t border-bd pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-mu">Emails</p>
          <ul className="mt-2 space-y-1 text-sm">
            {c.emailsSent.map((m) => (
              <li key={m.outboxId || m.to} className="flex flex-wrap items-center gap-x-2">
                <span>📧 {m.to}</span>
                {m.cc && <span className="text-xs text-mu">cc {m.cc}</span>}
                <span className={`text-xs font-semibold ${MAIL_TONE[m.status] || ''}`}>
                  {m.status === 'simulated' ? 'demo (not actually sent)' : m.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
