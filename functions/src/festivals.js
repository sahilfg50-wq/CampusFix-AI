// Campus calendar used by the food forecast and by the demo data generator.
// Festival dates change every year. These are approximate. Check them against the
// college's official holiday list before relying on the forecast.
//
// kind:
//   festival  - students stay on campus but many fast or eat out (e.g. Navratri)
//   break     - many students go home (Diwali break, summer vacation)
//   exams     - students stay in and eat in the mess more

export const CAMPUS_EVENTS = [
  // Navratri (Sharad)
  { key: 'navratri', name: 'Navratri', kind: 'festival', start: '2024-10-03', end: '2024-10-11' },
  { key: 'navratri', name: 'Navratri', kind: 'festival', start: '2025-09-22', end: '2025-10-01' },
  { key: 'navratri', name: 'Navratri', kind: 'festival', start: '2026-10-11', end: '2026-10-19' },
  { key: 'navratri', name: 'Navratri', kind: 'festival', start: '2027-09-30', end: '2027-10-08' },

  // Diwali break
  { key: 'diwali', name: 'Diwali break', kind: 'break', start: '2024-10-30', end: '2024-11-03' },
  { key: 'diwali', name: 'Diwali break', kind: 'break', start: '2025-10-19', end: '2025-10-23' },
  { key: 'diwali', name: 'Diwali break', kind: 'break', start: '2026-11-07', end: '2026-11-11' },
  { key: 'diwali', name: 'Diwali break', kind: 'break', start: '2027-10-28', end: '2027-11-01' },

  // Holi
  { key: 'holi', name: 'Holi', kind: 'festival', start: '2025-03-13', end: '2025-03-15' },
  { key: 'holi', name: 'Holi', kind: 'festival', start: '2026-03-03', end: '2026-03-05' },
  { key: 'holi', name: 'Holi', kind: 'festival', start: '2027-03-21', end: '2027-03-23' },

  // Winter break
  { key: 'winter', name: 'Winter break', kind: 'break', start: '2024-12-24', end: '2025-01-01' },
  { key: 'winter', name: 'Winter break', kind: 'break', start: '2025-12-24', end: '2026-01-01' },
  { key: 'winter', name: 'Winter break', kind: 'break', start: '2026-12-24', end: '2027-01-01' },

  // Summer vacation
  { key: 'summer', name: 'Summer vacation', kind: 'break', start: '2025-05-15', end: '2025-07-15' },
  { key: 'summer', name: 'Summer vacation', kind: 'break', start: '2026-05-15', end: '2026-07-15' },
  { key: 'summer', name: 'Summer vacation', kind: 'break', start: '2027-05-15', end: '2027-07-15' },

  // End-semester exams
  { key: 'exams', name: 'End-sem exams', kind: 'exams', start: '2024-11-20', end: '2024-12-10' },
  { key: 'exams', name: 'End-sem exams', kind: 'exams', start: '2025-04-25', end: '2025-05-12' },
  { key: 'exams', name: 'End-sem exams', kind: 'exams', start: '2025-11-20', end: '2025-12-10' },
  { key: 'exams', name: 'End-sem exams', kind: 'exams', start: '2026-04-25', end: '2026-05-12' },
  { key: 'exams', name: 'End-sem exams', kind: 'exams', start: '2026-11-20', end: '2026-12-10' },
  { key: 'exams', name: 'End-sem exams', kind: 'exams', start: '2027-04-25', end: '2027-05-12' },
];

// Returns the event that covers this YYYY-MM-DD date, or null.
// Breaks and festivals take priority over exams when they overlap.
export function eventOn(date, events = CAMPUS_EVENTS) {
  const matches = events.filter((e) => e.start <= date && date <= e.end);
  if (matches.length === 0) return null;
  return matches.find((e) => e.kind !== 'exams') || matches[0];
}
