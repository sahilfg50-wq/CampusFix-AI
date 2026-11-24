import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { friendlyError } from '../../lib/errors';

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

  return (
    <div className="mx-auto max-w-[420px] p-4 pt-10">
      <div className="mb-4 text-center text-lg font-bold">
        CampusFix AI
        <small className="block text-[11px] font-medium text-pr">Smarter complaints. Faster campus solutions.</small>
      </div>
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
    </div>
  );
}
