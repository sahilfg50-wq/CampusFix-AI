const TITLES = { student: 'Student portal', admin: 'Admin console' };

export default function Header({ portal, name, onSignOut }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-bd bg-card px-3 py-2.5 md:px-5 md:py-3">
      <div className="text-base font-bold">
        CampusFix AI
        <small className="block text-[11px] font-medium text-pr">{TITLES[portal]}</small>
      </div>
      <div className="flex items-center gap-3">
        <span className="muted hidden sm:inline">{name}</span>
        <button type="button" className="btn-gh" onClick={onSignOut}>Sign out</button>
      </div>
    </header>
  );
}
