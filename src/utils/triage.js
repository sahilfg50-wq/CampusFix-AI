import { DEPARTMENTS } from '../data/constants';

/**
 * SIMULATED AI triage. This is a fixed keyword rule set, not a real AI model.
 * No network request is made.
 */
const DEPT_BY_CATEGORY = {
  'Wi-Fi & IT': DEPARTMENTS[0],
  Electrical: DEPARTMENTS[1],
  Plumbing: DEPARTMENTS[2],
  Housekeeping: DEPARTMENTS[3],
  'Security & Safety': DEPARTMENTS[4],
  'Mess & Dining': DEPARTMENTS[5],
};
const SLA = { Critical: 'Within 4 hours', High: 'Within 12 hours', Medium: 'Within 24 hours', Low: 'Within 48 hours' };
const has = (text, words) => words.some((w) => text.includes(w));

export function simulateTriage({ title, description, category }) {
  const text = `${title} ${description}`.toLowerCase();
  const department = DEPT_BY_CATEGORY[category] || DEPARTMENTS[6];
  let priority = 'Medium';
  let reason = `Categorised under ${category}`;
  if (has(text, ['spark', 'fire', 'shock', 'emergency', 'smoke', 'hazard'])) {
    priority = 'Critical'; reason = 'Safety-critical keywords detected';
  } else if (has(text, ['leak', 'dark', 'no water', 'wifi', 'wi-fi', 'disconnect', 'slippery'])) {
    priority = 'High'; reason = 'High-impact disruption detected';
  } else if (has(text, ['chair', 'paint', 'minor', 'squeak'])) {
    priority = 'Low'; reason = 'Routine maintenance pattern';
  }
  return { department, priority, sla: `${SLA[priority]} (Demo SLA)`, aiNote: `${reason}. Routed to ${department}.` };
}
