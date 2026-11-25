const TITLES = { student: 'Student portal', admin: 'Admin console' };

export function Logo({ size = 'md' }) {
  const box = size === 'lg' ? 'h-11 w-11 text-lg' : 'h-9 w-9 text-sm';
  return (
    <span className={`grid ${box} shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 font-black text-white shadow-md shadow-indigo-500/30`}>
      CF
    </span>
  );
}

export default function Header({ portal, name, onSignOut }) {
  const initials = (name || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="glass sticky top-0 z-20 border-b border-bd">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-3 py-2.5 md:px-5">
        <div className="flex items-center gap-3">
          <Logo />
          <div className="leading-tight">
            <p className="text-base font-bold tracking-tight">CampusFix AI</p>
            <p className="text-[11px] font-medium text-pr">{TITLES[portal]}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-soft text-xs font-bold text-pr">{initials}</span>
            <span className="text-sm font-medium">{name}</span>
          </div>
          <button type="button" className="btn-gh !min-h-9 !py-1.5" onClick={onSignOut}>Sign out</button>
        </div>
      </div>
    </header>
  );
}
