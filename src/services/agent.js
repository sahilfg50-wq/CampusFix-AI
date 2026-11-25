import { httpsCallable } from 'firebase/functions';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, functions } from '../lib/firebase';

export async function processComplaintWithAgent(complaintId) {
  if (!functions) {
    throw new Error('Firebase Cloud Functions are not configured.');
  }

  if (!complaintId || typeof complaintId !== 'string') {
    throw new Error('A valid complaint ID is required.');
  }

  const call = httpsCallable(
    functions,
    'processComplaintAutonomously',
    { timeout: 125000 }
  );

  const { data } = await call({ complaintId });

  return data;
}

// Student: did the AI self-help steps fix the problem?
export async function respondToSelfHelp(complaintId, solved) {
  if (!functions) throw new Error('Firebase Cloud Functions are not configured.');
  const call = httpsCallable(functions, 'respondToSelfHelp', { timeout: 65000 });
  const { data } = await call({ complaintId, solved });
  return data;
}

// Admin: emails the AI agent sent (or simulated), newest first.
export function subscribeMailOutbox(onData, onError, max = 100) {
  const q = query(collection(db, 'mailOutbox'), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}
