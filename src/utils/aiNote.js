// AI notes are stored in the existing `aiNote` field (max 300 characters) as:
//   "Gemini analysis: <analysis> Suggested action: <action>"      (Gemini)
//   "Local AI analysis: <analysis> Suggested action: <action>"    (local Ollama model)
// This keeps the Firestore rules unchanged. Other notes come from the built-in auto-classification rules.
const PREFIXES = [
  ['Gemini analysis: ', 'gemini', 'Gemini AI'],
  ['Local AI analysis: ', 'local-ai', 'Local AI'],
];
const SEPARATOR = ' Suggested action: ';

export function parseAiNote(note = '') {
  const match = PREFIXES.find(([prefix]) => note.startsWith(prefix));
  if (!match) return { source: 'rules', label: 'Auto-classified', analysis: note, action: '' };
  const [prefix, source, label] = match;
  const rest = note.slice(prefix.length);
  const i = rest.indexOf(SEPARATOR);
  return i < 0
    ? { source, label, analysis: rest, action: '' }
    : { source, label, analysis: rest.slice(0, i), action: rest.slice(i + SEPARATOR.length) };
}
