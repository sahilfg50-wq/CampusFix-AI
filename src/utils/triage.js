// Built-in automatic complaint classification (no AI, no network).
// The rules live in functions/src/classify.js so the app and the Cloud Functions use the same logic.
export { classifyComplaint, autoClassify, autoTitle } from '../../functions/src/classify.js';
import { classifyComplaint } from '../../functions/src/classify.js';

// Kept for existing callers: same result as classifyComplaint (category, priority, department, sla, aiNote).
export function simulateTriage({ title, description }) {
  return classifyComplaint({ title, description });
}
