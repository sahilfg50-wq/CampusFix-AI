import { getFirestore } from 'firebase-admin/firestore';
import { AppError } from './analyze.js';

// Protects your Gemini quota/bill: 1 request per 3 seconds and 30 per day for each user.
// Counters live in the "aiUsage" collection. Only this server code can touch it
// (the Firestore rules deny all browser access to collections they do not list).
export async function checkRateLimit(uid, { cooldownMs = 3000, dailyMax = 30 } = {}) {
  const db = getFirestore();
  const ref = db.collection('aiUsage').doc(uid);
  const day = new Date().toISOString().slice(0, 10);
  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists ? snap.data() : {};
    const count = d.day === day ? d.count || 0 : 0;
    if (d.lastAt && now - d.lastAt < cooldownMs) {
      throw new AppError('resource-exhausted', 'Please wait a few seconds before analysing again.');
    }
    if (count >= dailyMax) {
      throw new AppError('resource-exhausted', 'Daily AI analysis limit reached. You can still submit your complaint manually.');
    }
    tx.set(ref, { day, count: count + 1, lastAt: now });
  });
}
