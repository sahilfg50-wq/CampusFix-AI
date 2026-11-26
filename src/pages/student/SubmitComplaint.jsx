import { useRef, useState } from 'react';
import { BUILDINGS } from '../../data/constants';
import { classifyComplaint, autoClassify, autoTitle } from '../../utils/triage';
import { PriorityBadge, SimBadge, AiBadge } from '../../components/ui/Badges';
import { analyzeComplaintWithAI } from '../../services/ai';
import { parseAiNote } from '../../utils/aiNote';
import { friendlyError } from '../../lib/errors';

const EMPTY = { title: '', description: '', building: BUILDINGS[0], location: '' };

// The student only describes the problem. CampusFix decides the category, priority and
// department automatically (built-in rules; an AI, if configured, can help but is never required).
export default function SubmitComplaint({ onSubmit, onNavigate, askConfirm }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(null);
  const [phase, setPhase] = useState('edit'); // edit | classifying | submitting
  const [submitError, setSubmitError] = useState('');
  const refs = { title: useRef(null), description: useRef(null), location: useRef(null) };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const description = form.description.trim();
  const preview = description.length >= 10 ? classifyComplaint({ title: form.title, description }) : null;

  const validate = () => {
    const er = {};
    const title = form.title.trim();
    if (title && title.length < 5) er.title = 'Use at least 5 characters, or leave the title empty.';
    if (description.length < 15) er.description = 'Describe the problem in at least 15 characters.';
    if (!form.location.trim()) er.location = 'Add a floor, room or landmark.';
    setErrors(er);
    const first = Object.keys(er)[0];
    if (first) refs[first].current?.focus();
    return !first;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const title = form.title.trim() || autoTitle(description);
    const ready = { ...form, title, description };

    setSubmitError('');
    setPhase('classifying');
    // AI is optional: if it is not configured, fails or is slow, the built-in rules decide.
    const classification = await autoClassify({ title, description }, { aiAnalyze: analyzeComplaintWithAI });
    setPhase('edit');

    askConfirm({
      title: 'Submit this complaint?',
      message: classification.needsAdminReview
        ? 'The problem type is not clear from the description, so the campus admin will review it and assign it.'
        : `CampusFix detected: ${classification.category} · ${classification.priority} priority · ${classification.department}.`,
      confirmLabel: 'Submit',
      onConfirm: async () => {
        setPhase('submitting');
        try {
          setDone(await onSubmit(ready, classification));
        } catch (err) {
          setSubmitError(friendlyError(err));
        } finally {
          setPhase('edit');
        }
      },
    });
  };

  const clear = () => { setForm(EMPTY); setErrors({}); setSubmitError(''); };

  if (done) {
    const note = parseAiNote(done.aiNote);
    const review = done.needsAdminReview;
    return (
      <div className="card mx-auto max-w-[640px] text-center">
        <div className="ok-box">Complaint submitted</div>
        <div className="muted">Your complaint ID</div>
        <h2 className="id-mono !text-[26px]">{done.id}</h2>
        <div className="my-3.5 rounded-xl bg-soft p-3 text-left">
          {note.source === 'rules' ? <SimBadge>Auto-classified</SimBadge> : <AiBadge>{note.label}</AiBadge>} <PriorityBadge priority={done.priority} />
          <p className="my-2">{note.analysis}</p>
          {review ? (
            <b>Sent to the campus admin for review</b>
          ) : (
            <><b>{done.category}</b> → <b>{done.department}</b> · Target: {done.sla}</>
          )}
        </div>
        <p className="muted mb-3">The CampusFix AI agent is now handling it. Track it to see fix steps or updates.</p>
        <button type="button" className="btn-pr" onClick={() => onNavigate('track', done.id)}>Track this complaint</button>{' '}
        <button type="button" className="btn-gh" onClick={() => { clear(); setDone(null); }}>Submit another</button>
      </div>
    );
  }

  const invalid = (k) => (errors[k] ? 'true' : 'false');
  const busy = phase !== 'edit';
  return (
    <form className="card mx-auto max-w-[700px]" onSubmit={handleSubmit} noValidate>
      <h2>Report a campus issue</h2>
      <span className="muted">Describe the problem in your own words. CampusFix works out the type, priority and department for you.</span>

      <label className="label" htmlFor="f-desc">What is the problem? *</label>
      <textarea
        id="f-desc"
        ref={refs.description}
        className="field"
        rows={5}
        value={form.description}
        onChange={set('description')}
        placeholder="e.g. Wi-Fi keeps disconnecting in my room since yesterday. / Tap in the 2nd floor washroom is leaking. / Pani nahi aa raha."
        aria-invalid={invalid('description')}
      />
      <div className="err">{errors.description}</div>

      <label className="label" htmlFor="f-title">Short title (optional)</label>
      <input id="f-title" ref={refs.title} className="field" value={form.title} onChange={set('title')} placeholder="Leave empty to create one from your description" aria-invalid={invalid('title')} />
      <div className="err">{errors.title}</div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3.5">
        <div>
          <label className="label" htmlFor="f-bld">Hostel / building</label>
          <select id="f-bld" className="field" value={form.building} onChange={set('building')}>
            {BUILDINGS.map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-loc">Floor or room *</label>
          <input id="f-loc" ref={refs.location} className="field" value={form.location} onChange={set('location')} placeholder="e.g. 2nd Floor, Room 214" aria-invalid={invalid('location')} />
          <div className="err">{errors.location}</div>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-soft px-3 py-2.5" aria-live="polite">
        {!preview ? (
          <span className="text-mu">CampusFix will detect the problem type as you type.</span>
        ) : preview.needsAdminReview ? (
          <span className="text-mu">
            <SimBadge>Auto-detect</SimBadge> Not sure what kind of problem this is yet. Add a little more detail, or submit and the campus admin will review it.
          </span>
        ) : (
          <span className="text-mu">
            <SimBadge>Auto-detect</SimBadge> <b className="text-tx">{preview.category}</b> · <PriorityBadge priority={preview.priority} /> → <b className="text-tx">{preview.department}</b> · {preview.sla}
          </span>
        )}
      </div>

      <div className="err mt-2" role="alert">{submitError}</div>
      <p className="mt-2 flex flex-wrap items-center gap-2">
        <button type="submit" className="btn-pr" disabled={busy}>
          {phase === 'classifying' ? 'Checking your complaint…' : phase === 'submitting' ? 'Submitting…' : 'Submit complaint'}
        </button>
        <button type="button" className="btn-gh" onClick={clear} disabled={busy}>Clear</button>
      </p>
    </form>
  );
}
