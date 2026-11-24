export default function EmptyState({ title, message, actionLabel, onAction }) {
  return (
    <div className="card border-dashed py-9 text-center">
      <div aria-hidden="true" className="mx-auto mb-2.5 grid h-11 w-11 place-items-center rounded-xl bg-soft text-xl text-mu">∅</div>
      <h3>{title}</h3>
      <p className="muted mx-auto mb-3 max-w-[340px]">{message}</p>
      {actionLabel && <button type="button" className="btn-pr" onClick={onAction}>{actionLabel}</button>}
    </div>
  );
}
