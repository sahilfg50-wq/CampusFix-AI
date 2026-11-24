import { formatDateTime } from '../../utils/format';

export default function Timeline({ updates }) {
  return (
    <ol className="ml-1.5 border-l-2 border-bd pl-3.5">
      {updates.map((u, i) => (
        <li key={i} className="relative mb-3">
          <span aria-hidden="true" className="absolute -left-5 top-1.5 h-[9px] w-[9px] rounded-full bg-pr" />
          <b>{u.actor}</b> <span className="muted">{formatDateTime(u.time)}</span>
          <br />
          {u.note}
        </li>
      ))}
    </ol>
  );
}
