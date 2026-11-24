import { NAV } from '../../data/constants';

export default function SideNav({ portal, view, onNavigate }) {
  const admin = portal === 'admin';
  return (
    <nav
      aria-label="Main"
      className={`sticky top-0 z-10 flex gap-1 overflow-x-auto p-2 md:w-[210px] md:shrink-0 md:flex-col md:overflow-visible md:p-3 ${
        admin ? 'bg-slate-900 md:sticky md:top-3 md:m-3 md:self-start md:rounded-2xl' : 'bg-bg md:static'
      }`}
    >
      {NAV[portal].map(([id, label]) => {
        const active = view === id || (view === 'det' && id === 'all');
        return (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            aria-current={active ? 'page' : undefined}
            className={`min-h-10 shrink-0 cursor-pointer whitespace-nowrap rounded-xl px-3 py-2 text-left font-medium ${
              active
                ? admin ? 'bg-blue-900 text-white' : 'nav-on'
                : admin ? 'text-slate-400 hover:text-white' : 'text-mu hover:bg-soft'
            }`}
          >
            {label}
          </button>
        );
      })}
      <div className={`mt-4 hidden rounded-xl border p-2.5 text-[11px] md:block ${admin ? 'border-slate-700 text-slate-400' : 'border-bd text-mu'}`}>
        Live data from Cloud Firestore. AI triage is simulated (keyword rules).
      </div>
    </nav>
  );
}
