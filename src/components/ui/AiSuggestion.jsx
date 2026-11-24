import { AiBadge, PriorityBadge } from './Badges';
import { friendlyError } from '../../lib/errors';

// Shows the Gemini suggestion so the student can review it BEFORE submitting.
// ai = { status: 'idle' | 'loading' | 'ready' | 'error', result?, error? }
export default function AiSuggestion({ ai, applied, stale, onApply, onUndo, onDismiss }) {
  if (ai.status === 'idle') return null;

  if (ai.status === 'loading') {
    return (
      <div role="status" className="mt-3 flex items-center gap-2.5 rounded-xl bg-soft px-3 py-2.5 text-mu">
        <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-bd border-t-pr" />
        Gemini is analysing your complaint…
      </div>
    );
  }

  if (ai.status === 'error') {
    return (
      <div role="alert" className="mt-3 rounded-xl border border-bd bg-soft px-3 py-2.5">
        <b className="text-rose-600">AI suggestions are not available right now.</b>
        <div className="muted my-1">{friendlyError(ai.error)}</div>
        <div className="muted">You can still choose the category yourself and submit. The priority and department will then be set by simple automatic rules.</div>
      </div>
    );
  }

  const r = ai.result;
  return (
    <div className="mt-3 rounded-xl border border-bd bg-soft p-3" aria-live="polite">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <AiBadge>Gemini AI suggestion</AiBadge>
        <span className="muted">Review it, then accept or ignore it.</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
        <div><span className="muted">Category</span><div><b>{r.category}</b></div></div>
        <div><span className="muted">Priority</span><div><PriorityBadge priority={r.priority} /></div></div>
        <div><span className="muted">Department</span><div><b>{r.department}</b></div></div>
        <div><span className="muted">Target</span><div><b>{r.sla}</b></div></div>
      </div>
      <p className="mt-2.5"><span className="muted">Analysis: </span>{r.analysis}</p>
      <p className="mt-1"><span className="muted">Suggested action for the admin: </span>{r.suggestedAction}</p>
      {stale && (
        <p className="mt-2 text-amber-600" role="status">
          Your text or category changed after the analysis, so this suggestion is not being used. Click “Analyse with AI” again to refresh it, or continue with the automatic rules.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {applied ? (
          <>
            <span className="ok-box !mb-0 !py-1.5">Suggestion applied</span>
            <button type="button" className="btn-gh" onClick={onUndo}>Undo</button>
          </>
        ) : (
          <>
            <button type="button" className="btn-pr" onClick={onApply}>Use these suggestions</button>
            <button type="button" className="btn-gh" onClick={onDismiss}>Ignore</button>
          </>
        )}
      </div>
    </div>
  );
}
