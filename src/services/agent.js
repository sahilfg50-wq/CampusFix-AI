import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

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