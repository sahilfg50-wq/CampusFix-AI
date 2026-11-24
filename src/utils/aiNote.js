// Gemini notes are stored in the existing `aiNote` field (max 300 characters) as:
//   "Gemini analysis: <analysis> Suggested action: <action>"
// This keeps the Firestore rules unchanged. Notes without that prefix come from the simulated rules.
const PREFIX = 'Gemini analysis: ';
const SEPARATOR = ' Suggested action: ';

export function parseAiNote(note = '') {
  if (!note.startsWith(PREFIX)) return { source: 'rules', analysis: note, action: '' };
  const rest = note.slice(PREFIX.length);
  const i = rest.indexOf(SEPARATOR);
  return i < 0
    ? { source: 'gemini', analysis: rest, action: '' }
    : { source: 'gemini', analysis: rest.slice(0, i), action: rest.slice(i + SEPARATOR.length) };
}
