import { PriorityBadge, StatusBadge } from './Badges';
import { formatDateTime } from '../../utils/format';
import { ROUTE_INFO } from './AgentCard';

export default function ComplaintRow({ complaint: c, onOpen }) {
  const route = ROUTE_INFO[c.agentRoute];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(c.id)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(c.id)}
      className="-mx-2 flex cursor-pointer flex-wrap items-center justify-between gap-2.5 rounded-xl border-b border-bd px-3 py-3 transition last:border-0 hover:bg-soft"
    >
      <div className="min-w-0">
        <span className="id-mono">{c.id}</span>{' '}
        <span className="muted">· {c.category} · {formatDateTime(c.createdAt)}</span>
        <div className="truncate font-semibold">{c.title}</div>
        <div className="muted">{c.building} — {c.location}</div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {c.agentStatus === 'awaiting-student' && (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">Your answer needed</span>
        )}
        {route && c.agentStatus !== 'awaiting-student' && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${route.tone}`}>{route.icon} {route.label}</span>
        )}
        <PriorityBadge priority={c.priority} />
        <StatusBadge status={c.status} />
      </div>
    </div>
  );
}
