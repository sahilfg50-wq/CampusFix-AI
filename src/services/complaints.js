import { collection, doc, query, where, onSnapshot, setDoc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';

const toIso = (ts) => (ts && ts.toDate ? ts.toDate().toISOString() : ts || null);

// Convert a Firestore document into the plain object the UI already uses.
const fromDoc = (d) => {
  const x = d.data({ serverTimestamps: 'estimate' });
  return { ...x, id: d.id, createdAt: toIso(x.createdAt), updatedAt: toIso(x.updatedAt), updates: x.updates || [] };
};

const listen = (q, onData, onError) => onSnapshot(q, (snap) => onData(snap.docs.map(fromDoc)), onError);

// Students: only their own complaints (the rules also enforce this on the server).
export const subscribeStudentComplaints = (uid, onData, onError) =>
  listen(query(collection(db, 'complaints'), where('studentId', '==', uid)), onData, onError);

// Admins: every complaint.
export const subscribeAllComplaints = (onData, onError) => listen(collection(db, 'complaints'), onData, onError);

// Readable ID such as CFX-2026-K7Q2M9. It is also the Firestore document ID.
function newComplaintId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `CFX-${new Date().getFullYear()}-${[...bytes].map((b) => chars[b % chars.length]).join('')}`;
}

// triage = automatic classification (src/utils/triage.js, optionally merged with AI):
// { category, priority, department, sla, aiNote, source: 'rules' | 'ai', provider?, needsAdminReview? }
export async function createComplaint(user, profile, form, triage) {
  const id = newComplaintId();
  const now = new Date().toISOString();
  const actor = triage.source === 'ai' ? `CampusFix AI (${triage.provider || 'AI'})` : 'CampusFix AI (auto-classification)';
  const routedNote = triage.needsAdminReview
    ? 'Problem type not clear from the description. Sent to the campus admin for review.'
    : `Auto-categorised as ${triage.category}, ${triage.priority} priority, assigned to ${triage.department}.`;
  const data = {
    complaintId: id,
    title: form.title.trim(),
    description: form.description.trim(),
    category: triage.category || form.category,
    building: form.building,
    location: form.location.trim(),
    department: triage.department,
    priority: triage.priority, // set automatically; admins can change it
    status: 'Pending',
    reporter: profile.name,
    studentId: user.uid,
    studentEmail: user.email,
    aiNote: triage.aiNote,
    sla: triage.sla,
    updates: [
      { time: now, actor: 'Student Portal', note: 'Complaint submitted.' },
      { time: now, actor, note: routedNote },
    ],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, 'complaints', id), data);
  // needsAdminReview is only returned to the screen, not stored (the Firestore document shape is unchanged).
  return { ...data, id, createdAt: now, updatedAt: now, needsAdminReview: Boolean(triage.needsAdminReview) };
}

// Admin only (enforced by Firestore rules).
export function updateComplaint(id, { status, priority, department, note }) {
  return updateDoc(doc(db, 'complaints', id), {
    status,
    priority,
    department,
    updatedAt: serverTimestamp(),
    updates: arrayUnion({
      time: new Date().toISOString(),
      actor: 'Campus Admin',
      note: note || `Status ${status}, priority ${priority}, assigned to ${department}.`,
    }),
  });
}
