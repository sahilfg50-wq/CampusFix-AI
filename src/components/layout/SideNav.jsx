import { NAV } from '../../data/constants';

export default function SideNav({ portal, view, onNavigate }) {
  const admin = portal === 'admin';
  return (
    <nav
      aria-label="Main"
      className={`sticky top-[57px] z-10 flex gap-1 overflow-x-auto border-b border-bd p-2 md:top-[73px] md:m-3 md:w-[220px] md:shrink-0 md:flex-col md:self-start md:overflow-visible md:rounded-2xl md:border md:p-3 ${
        admin ? 'bg-slate-900 md:border-slate-800' : 'glass md:bg-card'
      }`}
    >
      <p className={`hidden px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider md:block ${admin ? 'text-slate-500' : 'text-mu'}`}>
        {admin ? 'Admin' : 'Menu'}
      </p>
      {NAV[portal].map(([id, label, icon]) => {
        const active = view === id || (view === 'det' && id === 'all');
        return (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-10 shrink-0 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-left font-medium transition ${
              active
                ? admin
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                  : 'nav-on'
                : admin
                  ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  : 'text-mu hover:bg-soft hover:text-tx'
            }`}
          >
            <span aria-hidden="true" className="text-base">{icon}</span>
            {label}
          </button>
        );
      })}
      <div className={`mt-4 hidden rounded-xl p-3 text-[11px] leading-relaxed md:block ${admin ? 'bg-slate-800/70 text-slate-400' : 'bg-soft text-mu'}`}>
        <p className={`mb-1 font-semibold ${admin ? 'text-slate-200' : 'text-tx'}`}>🤖 CampusFix AI agent</p>
        Fixes simple IT issues with the student, emails departments for repairs and refers the rest to admin.
      </div>
    </nav>
  );
}
