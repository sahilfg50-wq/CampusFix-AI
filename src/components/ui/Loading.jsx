export default function Loading({ text = 'Loading…' }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-mu">
      <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-bd border-t-pr" />
      {text}
    </div>
  );
}
