import { friendlyError } from '../../lib/errors';

export default function ErrorCard({ title = 'Something went wrong', error, onRetry, onSecondary, secondaryLabel }) {
  return (
    <div className="card mx-auto max-w-[560px] text-center" role="alert">
      <h3 className="text-rose-600">{title}</h3>
      <p className="muted mb-3">{friendlyError(error)}</p>
      <div className="flex justify-center gap-2">
        {onRetry && <button type="button" className="btn-pr" onClick={onRetry}>Try again</button>}
        {onSecondary && <button type="button" className="btn-gh" onClick={onSecondary}>{secondaryLabel}</button>}
      </div>
    </div>
  );
}
