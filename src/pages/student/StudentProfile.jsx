import { useState } from 'react';
import { friendlyError } from '../../lib/errors';

export default function StudentProfile({ student, onSave }) {
  const [name, setName] = useState(student.name);
  const [phone, setPhone] = useState(student.phone);
  const [residence, setResidence] = useState(student.residence);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({ name: name.trim() || student.name, phone, residence });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card max-w-[640px]" onSubmit={handleSubmit}>
      <h2>Profile</h2>
      {saved && <div className="ok-box" role="status">Profile saved</div>}
      <label className="label" htmlFor="p-name">Full name</label>
      <input id="p-name" className="field" value={name} onChange={(e) => setName(e.target.value)} />
      <label className="label" htmlFor="p-phone">Phone</label>
      <input id="p-phone" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <label className="label" htmlFor="p-res">Residence</label>
      <input id="p-res" className="field" value={residence} onChange={(e) => setResidence(e.target.value)} placeholder="e.g. Aryabhatta Hostel, Room 314" />
      <div className="err mt-2" role="alert">{error}</div>
      <p className="mt-2"><button type="submit" className="btn-pr" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button></p>
    </form>
  );
}
