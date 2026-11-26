// Pure logic (no Firebase, no network) so it can be unit-tested.
import { CATEGORIES, DEPARTMENTS, PRIORITIES, SLA, DEFAULT_DEPARTMENT, LIMITS, NOTE_PREFIX, NOTE_SEPARATOR } from './constants.js';

export class AppError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code; // matches Firebase HttpsError codes
  }
}

// Remove control characters (keep tab / new line), trim spaces.
const clean = (s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();

export function clip(text, max) {
  const t = String(text).replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function validateInput(data) {
  if (!data || typeof data !== 'object' || typeof data.title !== 'string' || typeof data.description !== 'string') {
    throw new AppError('invalid-argument', 'Please send a title and a description (text).');
  }
  const title = clean(data.title);
  const description = clean(data.description);
  if (title.length < LIMITS.titleMin || title.length > LIMITS.titleMax) {
    throw new AppError('invalid-argument', `The title must be ${LIMITS.titleMin}-${LIMITS.titleMax} characters.`);
  }
  if (description.length < LIMITS.descMin || description.length > LIMITS.descMax) {
    throw new AppError('invalid-argument', `The description must be ${LIMITS.descMin}-${LIMITS.descMax} characters.`);
  }
  return { title, description };
}

// Case-insensitive match against an allowed list. Returns the canonical value or null.
const pick = (list, value) => (typeof value === 'string' ? list.find((x) => x.toLowerCase() === value.trim().toLowerCase()) || null : null);

const stripFence = (t) => t.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

// Turn Gemini's text into a fully validated result. Anything unexpected is rejected or repaired.
// Only these fields are ever returned. Extra fields (even "role": "admin") are ignored.
export function parseModelOutput(text) {
  let obj;
  try {
    obj = JSON.parse(stripFence(String(text || '')));
  } catch {
    throw new AppError('unavailable', 'The AI returned an answer we could not read. Please try again or choose manually.');
  }
  const category = pick(CATEGORIES, obj?.category);
  const priority = pick(PRIORITIES, obj?.priority);
  const analysisRaw = typeof obj?.analysis === 'string' ? clean(obj.analysis) : '';
  const actionRaw = typeof obj?.suggestedAction === 'string' ? clean(obj.suggestedAction) : '';
  if (!category || !priority || !analysisRaw || !actionRaw) {
    throw new AppError('unavailable', 'The AI answer was incomplete. Please try again or choose manually.');
  }
  const department = pick(DEPARTMENTS, obj?.department) || DEFAULT_DEPARTMENT[category];
  const analysis = clip(analysisRaw, LIMITS.analysisMax);
  const suggestedAction = clip(actionRaw, LIMITS.actionMax);
  return {
    category,
    priority,
    department,
    analysis,
    suggestedAction,
    sla: `${SLA[priority]} (Demo SLA)`,
    aiNote: clip(`${NOTE_PREFIX}${analysis}${NOTE_SEPARATOR}${suggestedAction}`, LIMITS.aiNoteMax),
  };
}

function mapUpstreamError(e) {
  const status = Number(e?.status || e?.code);
  if (status === 429) return new AppError('resource-exhausted', 'The AI service is busy right now. Please try again in a minute.');
  if ([400, 401, 403, 404].includes(status)) {
    return new AppError('failed-precondition', 'The AI service is not set up correctly. Please tell the administrator.');
  }
  return new AppError('unavailable', 'The AI service is not reachable right now. The complaint will be classified automatically by CampusFix rules.');
}

// deps: { checkRateLimit(uid), generate({title, description}) -> text, log?(error) }
export async function analyzeComplaint({ data, uid, deps }) {
  if (!uid) throw new AppError('unauthenticated', 'Please log in first.');
  const input = validateInput(data);
  await deps.checkRateLimit(uid);
  let text;
  try {
    text = await deps.generate(input);
  } catch (e) {
    deps.log?.(e);
    throw mapUpstreamError(e);
  }
  return parseModelOutput(text);
}
