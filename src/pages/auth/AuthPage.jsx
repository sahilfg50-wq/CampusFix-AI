import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { friendlyError } from '../../lib/errors';
import { Logo } from '../../components/layout/Header';

export default function AuthPage() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const isSignup = mode === 'signup';

  const submit = async (e) => {
    e.preventDefault();
    if (isSignup && form.name.trim().length < 2) return setError('Enter your full name.');
    if (!form.email.trim()) return setError('Enter your email address.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    setBusy(true);
    setError('');
    try {
      if (isSignup) await signup(form.name, form.email.trim(), form.password);
      else await login(form.email.trim(), form.password);
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
    // On success the app switches pages automatically.
  };

  const tab = (id, label) => (
    <button
      type="button"
      onClick={() => { setMode(id); setError(''); }}
      aria-pressed={mode === id}
      className={`min-h-10 flex-1 cursor-pointer rounded-lg px-3.5 py-1.5 font-medium ${mode === id ? 'bg-card text-pr shadow-sm' : 'text-mu'}`}
    >
      {label}
    </button>
  );

  const demo = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
  const fill = (email, password) => {
    setMode('login');
    setForm({ name: '', email, password });
    setError('');
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <Logo size="lg" />
          <div>
            <p className="text-xl font-bold">CampusFix AI</p>
            <p className="text-sm text-white/70">Smart campus complaints & mess</p>
          </div>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">Report it once. AI gets it to the right people.</h1>
          <ul className="mt-8 space-y-4 text-white/90">
            {[
              ['🛠️', 'Simple IT problems are fixed with step-by-step AI help.'],
              ['📨', 'Repairs are emailed to the right department automatically.'],
              ['♻️', 'AI forecasts mess demand for festivals and cuts food waste.'],
            ].map(([icon, text]) => (
              <li key={text} className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15">{icon}</span>
                <span className="pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/60">Hackathon prototype · Firebase + Gemini</p>
      </section>

      <div className="flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
      <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
        <Logo />
        <p className="text-lg font-bold">CampusFix AI</p>
      </div>
      <h2 className="!mb-1 text-2xl">{isSignup ? 'Create your account' : 'Welcome back'}</h2>
      <p className="mb-5 text-sm text-mu">{isSignup ? 'Sign up with your college email.' : 'Log in to report and track campus issues.'}</p>
      <form className="card" onSubmit={submit} noValidate>
        <div className="mb-2 flex rounded-xl bg-soft p-[3px]">{tab('login', 'Log in')}{tab('signup', 'Sign up')}</div>
        {isSignup && (
          <>
            <label className="label" htmlFor="au-name">Full name</label>
            <input id="au-name" className="field" autoComplete="name" value={form.name} onChange={set('name')} />
          </>
        )}
        <label className="label" htmlFor="au-email">Email</label>
        <input id="au-email" type="email" className="field" autoComplete="email" value={form.email} onChange={set('email')} />
        <label className="label" htmlFor="au-pass">Password</label>
        <input id="au-pass" type="password" className="field" autoComplete={isSignup ? 'new-password' : 'current-password'} value={form.password} onChange={set('password')} />
        <div className="err mt-2" role="alert">{error}</div>
        <button type="submit" className="btn-pr mt-3 w-full" disabled={busy}>
          {busy ? 'Please wait…' : isSignup ? 'Create student account' : 'Log in'}
        </button>
        {isSignup && <p className="muted mt-3">New accounts are student accounts. Admin access is given by the project owner.</p>}
      </form>
      {demo && (
        <div className="rounded-2xl border border-dashed border-bd p-4 text-sm">
          <p className="font-semibold">Local demo accounts</p>
          <p className="mt-0.5 text-xs text-mu">Created by <code>npm run seed</code>. Only shown in emulator mode.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className="btn-gh" onClick={() => fill('student@campusfix.test', 'student123')}>🎓 Student</button>
            <button type="button" className="btn-gh" onClick={() => fill('admin@campusfix.test', 'admin123')}>🛡️ Admin</button>
          </div>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
