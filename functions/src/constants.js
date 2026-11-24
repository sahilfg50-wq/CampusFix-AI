// These lists MUST match src/data/constants.js and firestore.rules.
// If a value is not in these lists, Firestore would reject the complaint.
export const CATEGORIES = ['Wi-Fi & IT', 'Electrical', 'Plumbing', 'Furniture & Infrastructure', 'Housekeeping', 'Security & Safety', 'Mess & Dining', 'Other'];
export const DEPARTMENTS = ['IT & Network Cell', 'Electrical Dept', 'Civil & Plumbing', 'Sanitation Services', 'Campus Security', 'Mess Committee', 'Estate & Furniture'];
export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export const SLA = { Critical: 'Within 4 hours', High: 'Within 12 hours', Medium: 'Within 24 hours', Low: 'Within 48 hours' };

// Used only if Gemini picks a valid category but an invalid department.
export const DEFAULT_DEPARTMENT = {
  'Wi-Fi & IT': 'IT & Network Cell',
  Electrical: 'Electrical Dept',
  Plumbing: 'Civil & Plumbing',
  'Furniture & Infrastructure': 'Estate & Furniture',
  Housekeeping: 'Sanitation Services',
  'Security & Safety': 'Campus Security',
  'Mess & Dining': 'Mess Committee',
  Other: 'Estate & Furniture',
};

// Same limits as firestore.rules (title 5-120, description 15-2000, aiNote <= 300, sla <= 60).
export const LIMITS = { titleMin: 5, titleMax: 120, descMin: 15, descMax: 2000, analysisMax: 130, actionMax: 130, aiNoteMax: 300 };

// The student app recognises Gemini notes by this exact format (see src/utils/aiNote.js).
export const NOTE_PREFIX = 'Gemini analysis: ';
export const NOTE_SEPARATOR = ' Suggested action: ';
