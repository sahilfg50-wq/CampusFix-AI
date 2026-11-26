import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { CATEGORIES, DEPARTMENTS, PRIORITIES } from '../data/constants';

const bad = () => Object.assign(new Error('The AI answer could not be used.'), { code: 'ai/invalid-response' });

// Asks the Cloud Function (which asks Gemini). The browser never sees the Gemini API key.
export async function analyzeComplaintWithAI({ title, description }) {
  const call = httpsCallable(functions, 'analyzeComplaint', { timeout: 45000 });
  const { data } = await call({ title, description });

  // Double-check the answer in the browser too. Anything unexpected is rejected.
  const ok =
    data &&
    CATEGORIES.includes(data.category) &&
    PRIORITIES.includes(data.priority) &&
    DEPARTMENTS.includes(data.department) &&
    typeof data.analysis === 'string' && data.analysis &&
    typeof data.suggestedAction === 'string' && data.suggestedAction &&
    typeof data.sla === 'string' && data.sla.length <= 60 &&
    typeof data.aiNote === 'string' && data.aiNote.length <= 300;
  if (!ok) throw bad();
  const { category, priority, department, analysis, suggestedAction, sla, aiNote } = data;
  const provider = typeof data.provider === 'string' ? data.provider.slice(0, 40) : 'AI';
  return { category, priority, department, analysis, suggestedAction, sla, aiNote, provider };
}
