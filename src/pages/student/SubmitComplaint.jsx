import { useRef, useState } from 'react';
import { CATEGORIES, BUILDINGS } from '../../data/constants';
import { simulateTriage } from '../../utils/triage';
import { PriorityBadge, SimBadge, AiBadge } from '../../components/ui/Badges';
import AiSuggestion from '../../components/ui/AiSuggestion';
import { analyzeComplaintWithAI } from '../../services/ai';
import { parseAiNote } from '../../utils/aiNote';
import { friendlyError } from '../../lib/errors';

const EMPTY = { title: '', description: '', category: CATEGORIES[0], building: BUILDINGS[0], location: '' };

export default function SubmitComplaint({ onSubmit, onNavigate, askConfirm }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [ai, setAi] = useState({ status: 'idle' });
  const [applied, setApplied] = useState(null); // the Gemini suggestion the student accepted
  const refs = { title: useRef(null), description: useRef(null), location: useRef(null) };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const typed = `${form.title}${form.description}`.trim();
  const preview = typed.length >= 8 ? simulateTriage(form) : null;

  // The accepted suggestion is only used while the text and category still match what Gemini analysed.
  const aiValid = !!applied && applied.title === form.title.trim() && applied.description === form.description.trim() && applied.category === form.category;

  const validate = () => {
    const er = {};
    if (form.title.trim().length < 5) er.title = 'Enter a title of at least 5 characters.';
    if (form.description.trim().length < 15) er.description = 'Describe the issue in at least 15 characters.';
    if (!form.location.trim()) er.location = 'Add a floor, room or landmark.';
    setErrors(er);
    const first = Object.keys(er)[0];
    if (first) refs[first].current?.focus();
    return !first;
  };

  const analyse = async () => {
    const title = form.title.trim();
    const description = form.description.trim();
    const er = {
      title: title.length < 5 ? 'Enter a title of at least 5 characters.' : undefined,
      description: description.length < 15 ? 'Describe the issue in at least 15 characters.' : undefined,
    };
    if (er.title || er.description) {
      setErrors((prev) => ({ ...prev, ...er }));
      refs[er.title ? 'title' : 'description'].current?.focus();
      return;
    }
    setErrors((prev) => ({ ...prev, title: undefined, description: undefined }));
    setAi({ status: 'loading' });
    try {
      const result = await analyzeComplaintWithAI({ title, description });
      setAi({ status: 'ready', result, title, description });
    } catch (err) {
      setAi({ status: 'error', error: err });
    }
  };

  const applySuggestion = () => {
    setForm({ ...form, category: ai.result.category });
    setApplied({ ...ai.result, title: ai.title, description: ai.description });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    askConfirm({
      title: 'Submit this complaint?',
      message: aiValid ? 'It will be saved with the Gemini AI suggestions you approved.' : 'It will be routed to a department by simulated AI triage.',
      confirmLabel: 'Submit',
      onConfirm: async () => {
        setSubmitting(true);
        setSubmitError('');
        try {
          setDone(await onSubmit(form, aiValid ? applied : null));
        } catch (err) {
          setSubmitError(friendlyError(err));
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const clear = () => { setForm(EMPTY); setErrors({}); setAi({ status: 'idle' }); setApplied(null); };

  if (done) {
    return (
      <div className="card mx-auto max-w-[640px] text-center">
        <div className="ok-box">Complaint submitted</div>
        <div className="muted">Your complaint ID</div>
        <h2 className="id-mono !text-[26px]">{done.id}</h2>
        <div className="my-3.5 rounded-xl bg-soft p-3 text-left">
          {parseAiNote(done.aiNote).source === 'gemini' ? <AiBadge>Gemini AI triage</AiBadge> : <SimBadge>Simulated AI triage</SimBadge>} <PriorityBadge priority={done.priority} />
          <p className="my-2">{parseAiNote(done.aiNote).analysis}</p>
          <b>{done.department}</b> · Target: {done.sla}
        </div>
        <button type="button" className="btn-pr" onClick={() => onNavigate('track', done.id)}>Track this complaint</button>{' '}
        <button type="button" className="btn-gh" onClick={() => { clear(); setDone(null); }}>Submit another</button>
      </div>
    );
  }

  const invalid = (k) => (errors[k] ? 'true' : 'false');
  return (
    <form className="card mx-auto max-w-[700px]" onSubmit={handleSubmit} noValidate>
      <h2>Report a campus issue</h2>
      <span className="muted">Use “Analyse with AI” for suggestions you can review, or choose manually. Without AI, simple automatic rules set the priority and department.</span>

      <label className="label" htmlFor="f-title">Title *</label>
      <input id="f-title" ref={refs.title} className="field" value={form.title} onChange={set('title')} placeholder="e.g. Wi-Fi down on 3rd floor" aria-invalid={invalid('title')} />
      <div className="err">{errors.title}</div>

      <label className="label" htmlFor="f-desc">Description *</label>
      <textarea id="f-desc" ref={refs.description} className="field" rows={4} value={form.description} onChange={set('description')} placeholder="What happened, since when, and who is affected?" aria-invalid={invalid('description')} />
      <div className="err">{errors.description}</div>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        <button type="button" className="btn-gh" onClick={analyse} disabled={ai.status === 'loading'}>Analyse with AI</button>
        <span className="muted">Optional: Gemini suggests a category, priority and department for you to review.</span>
      </div>
      <AiSuggestion ai={ai} applied={aiValid} stale={!!applied && !aiValid} onApply={applySuggestion} onUndo={() => setApplied(null)} onDismiss={() => setAi({ status: 'idle' })} />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3.5">
        <div>
          <label className="label" htmlFor="f-cat">Category</label>
          <select id="f-cat" className="field" value={form.category} onChange={set('category')}>
            {CATEGORIES.map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-bld">Hostel / building</label>
          <select id="f-bld" className="field" value={form.building} onChange={set('building')}>
            {BUILDINGS.map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
      </div>

      <label className="label" htmlFor="f-loc">Floor or room *</label>
      <input id="f-loc" ref={refs.location} className="field" value={form.location} onChange={set('location')} placeholder="e.g. 2nd Floor, Room 214" aria-invalid={invalid('location')} />
      <div className="err">{errors.location}</div>

      <div className="mt-3 rounded-xl bg-soft px-3 py-2.5 text-mu" aria-live="polite">
        {aiValid ? (
          <>
            <AiBadge>Gemini AI suggestion applied</AiBadge> <PriorityBadge priority={applied.priority} /> → <b className="text-tx">{applied.department}</b> · {applied.sla}
          </>
        ) : preview ? (
          <>
            <SimBadge>Simulated AI preview</SimBadge> <PriorityBadge priority={preview.priority} /> → <b className="text-tx">{preview.department}</b> · {preview.sla}
          </>
        ) : 'Live AI preview appears as you type.'}
      </div>

      <div className="err mt-2" role="alert">{submitError}</div>
      <p className="mt-2 flex gap-2">
        <button type="submit" className="btn-pr" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit complaint'}</button>
        <button type="button" className="btn-gh" onClick={clear}>Clear</button>
      </p>
    </form>
  );
}
