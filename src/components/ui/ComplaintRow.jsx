import { PriorityBadge, StatusBadge } from './Badges';
import { formatDateTime } from '../../utils/format';

export default function ComplaintRow({ complaint: c, onOpen }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(c.id)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(c.id)}
      className="flex cursor-pointer flex-wrap items-center justify-between gap-2.5 border-b border-bd px-1 py-3 last:border-0 hover:bg-soft"
    >
      <div>
        <span className="id-mono">{c.id}</span>{' '}
        <span className="muted">· {c.category} · {formatDateTime(c.createdAt)}</span>
        <div><b>{c.title}</b></div>
        <div className="muted">{c.building} — {c.location}</div>
      </div>
      <div className="flex gap-1.5">
        <PriorityBadge priority={c.priority} />
        <StatusBadge status={c.status} />
      </div>
    </div>
  );
}
