import { useEffect, useRef } from 'react';

// `confirm` is null (closed) or { title, message, confirmLabel, onConfirm }.
export default function ConfirmDialog({ confirm, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (confirm && !d.open) d.showModal();
    if (!confirm && d.open) d.close();
  }, [confirm]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      className="m-auto w-[min(380px,92vw)] rounded-2xl border border-bd bg-card p-5 text-tx backdrop:bg-slate-900/60"
    >
      {confirm && (
        <>
          <h3>{confirm.title}</h3>
          <p className="muted mb-4">{confirm.message}</p>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-gh" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="btn-pr"
              onClick={() => { const fn = confirm.onConfirm; onClose(); fn(); }}
            >
              {confirm.confirmLabel || 'Confirm'}
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
