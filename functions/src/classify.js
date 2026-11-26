// Automatic complaint classification: category, priority and department from the student's own words.
// Pure logic, no Firebase and no network. The student app imports this file too, so the
// live preview, the saved complaint and the server-side routing all use the same rules.
//
// AI is optional. When an AI answer is available, mergeWithAi() combines it with these rules.
// The priority is always the HIGHER of the two, so AI can never lower an emergency.

import { CATEGORIES, DEPARTMENTS, PRIORITIES, SLA, DEFAULT_DEPARTMENT } from './constants.js';

// ---------- keyword lists (English + common Hinglish) ----------

// Danger to people. Always Critical. complaintRouter.js uses this same list for the emergency route.
export const EMERGENCY_WORDS = [
  'fire', 'smoke', 'smoking socket', 'spark', 'sparks', 'sparking', 'shock', 'electric shock', 'current laga',
  'electrocuted', 'electrocution', 'gas leak', 'gas smell', 'burning smell', 'short circuit', 'collapse',
  'collapsed', 'injured', 'injury', 'bleeding', 'unconscious', 'fainted', 'medical emergency', 'ambulance',
  'food poisoning', 'stuck in lift', 'stuck in the lift', 'trapped', 'harassment', 'harassed', 'harassing',
  'assault', 'fight', 'threat', 'threatened', 'stalking', 'theft', 'stolen', 'intruder', 'ragging', 'aag',
];

const HIGH_WORDS = [
  'no water', 'pani nahi', 'water leak', 'leak', 'leaking', 'leakage', 'flooding', 'flooded', 'overflow',
  'overflowing', 'sewage', 'power cut', 'no power', 'no electricity', 'no light', 'blackout', 'bijli nahi',
  'light nahi', 'internet down', 'wifi down', 'network down', 'portal down', 'site down', 'website down',
  'not working for anyone', 'not working for everyone', 'whole floor', 'whole block', 'entire floor',
  'entire hostel', 'all rooms', 'lift stuck', 'broken lock', 'lock broken', 'door not locking', 'unsafe',
  'dark', 'stranger', 'unknown person', 'insect in food', 'hair in food', 'cockroach in food', 'stale',
  'spoiled', 'rotten', 'undercooked', 'toilet blocked', 'blocked toilet', 'clogged', 'exam', 'exams',
];

// Only words that mean "minor". Polite words such as "request" or "please" must not lower priority.
const LOW_WORDS = [
  'paint', 'painting', 'squeak', 'squeaky', 'minor', 'cosmetic', 'scratch', 'loose handle', 'curtain',
  'notice board', 'not urgent', 'whenever possible',
];

// strong = clearly about this category, weak = a hint. A category needs a score of 2 to be chosen.
const CATEGORY_WORDS = {
  'Security & Safety': {
    strong: [
      'harassment', 'harassed', 'harassing', 'ragging', 'fight', 'assault', 'threat', 'threatened', 'stalking',
      'stalker', 'theft', 'stolen', 'thief', 'chor', 'intruder', 'stranger', 'unknown person', 'trespass',
      'unsafe', 'cctv', 'security guard', 'guard', 'drunk', 'drugs', 'ladai', 'chori', 'eve teasing',
      'fire', 'smoke', 'gas leak', 'gas smell', 'aag',
    ],
    weak: ['security', 'gate', 'safety', 'camera'],
  },
  Electrical: {
    strong: [
      'electricity', 'power cut', 'power outage', 'no power', 'bijli', 'light', 'lights', 'tubelight',
      'tube light', 'bulb', 'fan', 'ceiling fan', 'pankha', 'switch', 'switchboard', 'switch board', 'socket',
      'plug', 'plug point', 'wiring', 'wire', 'wires', 'mcb', 'fuse', 'inverter', 'ac', 'air conditioner',
      'geyser', 'cooler', 'voltage', 'generator', 'lift', 'elevator', 'heater', 'short circuit', 'spark',
      'sparks', 'sparking',
    ],
    weak: ['power', 'current', 'charging', 'electric'],
  },
  Plumbing: {
    strong: [
      'water', 'pani', 'tap', 'taps', 'nal', 'pipe', 'pipeline', 'leak', 'leaking', 'leakage', 'drain',
      'drainage', 'clogged', 'flush', 'toilet', 'urinal', 'sink', 'wash basin', 'basin', 'shower', 'sewage',
      'overflow', 'overflowing', 'water cooler', 'ro water', 'ro purifier', 'water purifier', 'drinking water',
      'water tank', 'tank',
      'seepage', 'plumber', 'flooding', 'flooded',
    ],
    weak: ['washroom', 'bathroom', 'wet', 'dripping', 'damp'],
  },
  'Mess & Dining': {
    strong: [
      'mess food', 'mess hall', 'food', 'khana', 'canteen', 'cafeteria', 'dining', 'meal', 'meals', 'lunch',
      'dinner', 'breakfast', 'menu', 'roti', 'chapati', 'rice', 'dal', 'curry', 'sabzi', 'tiffin', 'undercooked',
      'stale', 'insect in food', 'hair in food', 'cockroach in food', 'food poisoning', 'tasteless', 'non-veg',
      'mess token', 'dinner token',
    ],
    weak: ['mess', 'cook', 'cooking', 'taste', 'oily', 'spicy', 'plates', 'utensils', 'quantity'],
  },
  'Wi-Fi & IT': {
    strong: [
      'wifi', 'internet', 'network', 'router', 'lan', 'ethernet', 'portal', 'erp', 'lms', 'moodle', 'website',
      'login', 'log in', 'password', 'otp', 'email', 'projector', 'smart board', 'smartboard', 'printer',
      'printing', 'computer', 'desktop', 'laptop', 'software', 'server', 'broadband', 'hotspot', 'vpn',
      'net nahi', 'net slow', 'computer lab', 'it cell',
    ],
    weak: ['net', 'slow', 'connect', 'connection', 'connecting', 'signal', 'app', 'online', 'system', 'account'],
  },
  Housekeeping: {
    strong: [
      'dirty', 'cleaning', 'unclean', 'garbage', 'trash', 'dustbin', 'waste bin', 'sweeping', 'mopping',
      'cobweb', 'cobwebs', 'stink', 'stinks', 'smelly', 'foul smell', 'bad smell', 'cockroach', 'cockroaches',
      'rat', 'rats', 'mouse', 'mice', 'pest', 'pests', 'mosquito', 'mosquitoes', 'bedbugs', 'bed bugs',
      'lizard', 'kachra', 'safai', 'housekeeping', 'sweeper',
    ],
    weak: ['clean', 'dust', 'smell', 'hygiene', 'messy'],
  },
  'Furniture & Infrastructure': {
    strong: [
      'chair', 'chairs', 'table', 'desk', 'bench', 'benches', 'bed', 'mattress', 'cupboard', 'almirah',
      'wardrobe', 'door', 'lock', 'latch', 'window', 'windows', 'glass', 'ceiling', 'wall', 'walls', 'crack',
      'cracks', 'plaster', 'paint', 'floor', 'tiles', 'roof', 'stairs', 'staircase', 'railing', 'whiteboard',
      'blackboard', 'green board', 'notice board', 'furniture', 'shelf', 'hinge', 'handle', 'mirror',
      'darwaza', 'khidki', 'carpenter',
    ],
    weak: ['classroom', 'lecture hall', 'broken', 'repair', 'damaged', 'maintenance', 'loose', 'curtain'],
  },
};

// When two categories score the same, the safer / more urgent one wins.
const TIE_ORDER = [
  'Security & Safety', 'Electrical', 'Plumbing', 'Mess & Dining', 'Wi-Fi & IT', 'Housekeeping',
  'Furniture & Infrastructure',
];

const PRIORITY_RANK = { Low: 0, Medium: 1, High: 2, Critical: 3 };

// ---------- helpers ----------

const escape = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const matches = (text, word) => new RegExp(`(^|[^a-z0-9])${escape(word)}($|[^a-z0-9])`).test(text);
const found = (text, words) => words.filter((w) => matches(text, w));

export function normalizeText(...parts) {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/wi[\s-]?fi/g, 'wifi')
    .replace(/e-mail/g, 'email')
    .replace(/\s+/g, ' ')
    .trim();
}

export const higherPriority = (a, b) => ((PRIORITY_RANK[b] ?? -1) > (PRIORITY_RANK[a] ?? -1) ? b : a);
export const slaFor = (priority) => `${SLA[priority]} (Demo SLA)`;
const clip = (s, max) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

// ---------- rule-based classification ----------

export function classifyComplaint({ title = '', description = '' } = {}) {
  const text = normalizeText(title, description);

  // Category: highest keyword score. Phrases count 3, strong words 2, weak words 1.
  const scores = TIE_ORDER.map((category) => {
    const { strong, weak } = CATEGORY_WORDS[category];
    const hitsStrong = found(text, strong);
    const hitsWeak = found(text, weak);
    const score =
      hitsStrong.reduce((t, w) => t + (w.includes(' ') ? 3 : 2), 0) + hitsWeak.length;
    return { category, score, hits: [...hitsStrong, ...hitsWeak] };
  }).sort((a, b) => b.score - a.score || TIE_ORDER.indexOf(a.category) - TIE_ORDER.indexOf(b.category));

  const best = scores[0];
  const runnerUp = scores[1];

  // Priority: emergency > high-impact > minor > normal.
  const emergency = found(text, EMERGENCY_WORDS);
  const high = found(text, HIGH_WORDS);
  const low = found(text, LOW_WORDS);
  let priority = 'Medium';
  let priorityReason = 'normal fault';
  if (emergency.length) {
    priority = 'Critical';
    priorityReason = `possible danger (${emergency.slice(0, 2).join(', ')})`;
  } else if (high.length) {
    priority = 'High';
    priorityReason = `serious disruption (${high.slice(0, 2).join(', ')})`;
  } else if (low.length) {
    priority = 'Low';
    priorityReason = `minor issue (${low[0]})`;
  }

  let category = best.score >= 2 ? best.category : 'Other';
  // A danger with no clear category is a safety matter, never "unclear".
  if (category === 'Other' && priority === 'Critical') category = 'Security & Safety';

  const department = DEFAULT_DEPARTMENT[category];
  const unclear = category === 'Other';
  const confidence = unclear
    ? 'none'
    : best.score >= 4 && best.score - runnerUp.score >= 2
      ? 'high'
      : 'medium';

  const aiNote = unclear
    ? 'Auto-classification could not identify the problem type. Sent to the campus admin for review.'
    : clip(
        `Auto-classified as ${category} (${best.hits.slice(0, 3).join(', ')}). ${priority} priority: ${priorityReason}. Routed to ${department}.`,
        300
      );

  return {
    category,
    priority,
    department,
    sla: slaFor(priority),
    aiNote,
    confidence,
    needsAdminReview: unclear,
    keywords: best.score >= 2 ? best.hits : [],
    source: 'rules',
  };
}

// ---------- combining with an optional AI answer ----------

// ai: { category, priority, department, aiNote, provider? } already validated by the caller.
export function mergeWithAi(rules, ai) {
  if (!ai || !CATEGORIES.includes(ai.category) || !PRIORITIES.includes(ai.priority)) {
    return { ...rules, source: 'rules' };
  }

  // Never lower the priority: take the higher of rules and AI.
  const priority = higherPriority(rules.priority, ai.priority);

  // Emergencies keep the rule-based category and department (safety first).
  // A clear rule-based match is also kept if the AI gives up with "Other".
  const keepRules = rules.priority === 'Critical' || (ai.category === 'Other' && rules.category !== 'Other');
  const category = keepRules ? rules.category : ai.category;
  const department = keepRules
    ? rules.department
    : DEPARTMENTS.includes(ai.department)
      ? ai.department
      : DEFAULT_DEPARTMENT[category];

  return {
    category,
    priority,
    department,
    sla: slaFor(priority),
    aiNote: typeof ai.aiNote === 'string' && ai.aiNote.length <= 300 ? ai.aiNote : rules.aiNote,
    confidence: rules.confidence,
    needsAdminReview: category === 'Other',
    keywords: rules.keywords,
    source: 'ai',
    provider: ai.provider || 'AI',
  };
}

// Full automatic classification for a new complaint.
// aiAnalyze is optional; if it is missing, fails or is too slow, the rules decide.
export async function autoClassify({ title, description }, { aiAnalyze, timeoutMs = 15000 } = {}) {
  const rules = classifyComplaint({ title, description });
  if (!aiAnalyze) return rules;
  let timer;
  try {
    const ai = await Promise.race([
      aiAnalyze({ title, description }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('AI timeout')), timeoutMs);
      }),
    ]);
    return mergeWithAi(rules, ai);
  } catch {
    return rules;
  } finally {
    clearTimeout(timer);
  }
}

// Short title from the description when the student does not type one (Firestore needs 5-120 chars).
export function autoTitle(description = '') {
  const clean = String(description).replace(/\s+/g, ' ').trim();
  const firstSentence = clean.split(/(?<=[.!?])\s/)[0] || clean;
  let title = firstSentence.length <= 80 ? firstSentence : `${firstSentence.slice(0, 80).replace(/\s+\S*$/, '')}…`;
  title = title.replace(/[.!?]+$/, '');
  if (title.length < 5) title = clean.slice(0, 80);
  return title.charAt(0).toUpperCase() + title.slice(1);
}
