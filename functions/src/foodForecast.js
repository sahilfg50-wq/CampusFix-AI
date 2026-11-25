// Food waste statistics and demand forecast.
// Pure functions (no Firebase, no network). The frontend imports this file too,
// so the dashboard numbers and the AI analysis always use the same maths.

import { CAMPUS_EVENTS, eventOn } from './festivals.js';

export const MEALS = ['Breakfast', 'Lunch', 'Dinner'];
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Extra food cooked on top of the forecast so the mess does not run out.
export const SAFETY_BUFFER = 0.05;
// Rough cost of one kg of cooked mess food, used only to show estimated savings.
export const COST_PER_KG = 60;

const DAY_MS = 86400000;

// ---------- dates (YYYY-MM-DD strings, timezone independent) ----------

const toUtc = (date) => new Date(`${date}T00:00:00Z`);
export const formatDate = (d) => d.toISOString().slice(0, 10);
export const addDays = (date, n) => formatDate(new Date(toUtc(date).getTime() + n * DAY_MS));
export const weekdayOf = (date) => toUtc(date).getUTCDay();
export const daysBetween = (a, b) => Math.round((toUtc(b) - toUtc(a)) / DAY_MS);

export const RANGES = {
  '7d': { label: 'Last 7 days', days: 7, bucket: 'day' },
  '30d': { label: 'Last 30 days', days: 30, bucket: 'day' },
  '12m': { label: 'Last 12 months', days: 365, bucket: 'month' },
  '2y': { label: 'Last 2 years', days: 730, bucket: 'month' },
  all: { label: 'All time', days: null, bucket: 'month' },
};

// First date (inclusive) of a range ending today. null means "no lower limit".
export function rangeStart(range, today) {
  const r = RANGES[range];
  if (!r) throw new Error(`Unknown range: ${range}`);
  return r.days ? addDays(today, -(r.days - 1)) : null;
}

// ---------- small maths helpers ----------

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const round1 = (n) => Math.round(n * 10) / 10;
const sum = (list, pick) => list.reduce((total, item) => total + pick(item), 0);
const mean = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);

export function median(list) {
  if (!list.length) return 0;
  const sorted = [...list].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdev(list) {
  if (list.length < 2) return 0;
  const m = mean(list);
  return Math.sqrt(mean(list.map((x) => (x - m) ** 2)));
}

const pct = (part, whole) => (whole > 0 ? round1((part / whole) * 100) : 0);

// ---------- normalising raw Firestore reports ----------

// Cleans one mealReports document. Bad or missing numbers become 0, and
// leftover/wasted can never be more than what was prepared.
export function normalizeReport(raw) {
  const preparedKg = num(raw.preparedKg);
  const leftoverKg = Math.min(num(raw.leftoverKg), preparedKg);
  const wastedKg = raw.wastedKg == null ? leftoverKg : Math.min(num(raw.wastedKg), leftoverKg);
  const servedMeals = Math.round(num(raw.servedMeals));
  const totalStudents = Math.round(num(raw.totalStudents)) || null;
  return {
    date: raw.date,
    meal: raw.meal,
    preparedKg,
    leftoverKg,
    wastedKg,
    consumedKg: preparedKg - leftoverKg,
    servedMeals,
    totalStudents,
    skipped: totalStudents ? Math.max(0, totalStudents - servedMeals) : null,
  };
}

// Totals for a list of normalised reports.
function totalsOf(rows) {
  const preparedKg = sum(rows, (r) => r.preparedKg);
  const consumedKg = sum(rows, (r) => r.consumedKg);
  const leftoverKg = sum(rows, (r) => r.leftoverKg);
  const wastedKg = sum(rows, (r) => r.wastedKg);
  const servedMeals = sum(rows, (r) => r.servedMeals);
  const withStrength = rows.filter((r) => r.skipped != null);
  return {
    reports: rows.length,
    preparedKg: round1(preparedKg),
    consumedKg: round1(consumedKg),
    leftoverKg: round1(leftoverKg),
    wastedKg: round1(wastedKg),
    servedMeals,
    wastePct: pct(wastedKg, preparedKg),
    leftoverPct: pct(leftoverKg, preparedKg),
    avgServed: rows.length ? Math.round(servedMeals / rows.length) : 0,
    avgSkipped: withStrength.length ? Math.round(sum(withStrength, (r) => r.skipped) / withStrength.length) : null,
    kgPerPlate: servedMeals > 0 ? Math.round((consumedKg / servedMeals) * 1000) / 1000 : 0,
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function bucketKey(date, bucket) {
  if (bucket === 'month') return date.slice(0, 7);
  return date;
}

function bucketLabel(key, bucket) {
  if (bucket === 'month') return `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`;
  return `${Number(key.slice(8, 10))} ${MONTHS[Number(key.slice(5, 7)) - 1]}`;
}

// Everything the analytics dashboard shows for one range.
export function summarize(rawReports, { range = '30d', today, meal = 'All' } = {}) {
  const from = rangeStart(range, today);
  const { bucket } = RANGES[range];
  const rows = rawReports
    .map(normalizeReport)
    .filter((r) => r.date && r.date <= today && (!from || r.date >= from))
    .filter((r) => meal === 'All' || r.meal === meal);

  const buckets = new Map();
  for (const r of rows) {
    const key = bucketKey(r.date, bucket);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(r);
  }
  const series = [...buckets.keys()].sort().map((key) => ({
    key,
    label: bucketLabel(key, bucket),
    ...totalsOf(buckets.get(key)),
  }));

  const byMeal = MEALS.map((name) => ({ meal: name, ...totalsOf(rows.filter((r) => r.meal === name)) }))
    .filter((m) => m.reports > 0);

  const byWeekday = WEEKDAYS.map((name, index) => ({
    day: name,
    ...totalsOf(rows.filter((r) => weekdayOf(r.date) === index)),
  })).filter((d) => d.reports > 0);

  const eventRows = new Map();
  const normalRows = [];
  for (const r of rows) {
    const event = eventOn(r.date);
    if (!event) {
      normalRows.push(r);
      continue;
    }
    if (!eventRows.has(event.key)) eventRows.set(event.key, { name: event.name, kind: event.kind, rows: [] });
    eventRows.get(event.key).rows.push(r);
  }
  const byEvent = [...eventRows.entries()].map(([key, value]) => ({
    key,
    name: value.name,
    kind: value.kind,
    ...totalsOf(value.rows),
  }));

  const dates = rows.map((r) => r.date).sort();
  return {
    range,
    rangeLabel: RANGES[range].label,
    from: from || dates[0] || null,
    to: today,
    firstDataDate: dates[0] || null,
    daysWithData: new Set(dates).size,
    bucket,
    totals: totalsOf(rows),
    normalDays: totalsOf(normalRows),
    series,
    byMeal,
    byWeekday,
    byEvent,
  };
}

// Plain-language findings computed from a summary. These are facts, not AI guesses.
export function findInsights(summary) {
  const insights = [];
  const { totals } = summary;
  if (!totals.reports) return insights;

  insights.push(
    `${totals.wastedKg} kg of ${totals.preparedKg} kg prepared food was wasted (${totals.wastePct}%) in ${summary.rangeLabel.toLowerCase()}.`
  );

  const worstMeal = [...summary.byMeal].sort((a, b) => b.wastePct - a.wastePct)[0];
  if (worstMeal && summary.byMeal.length > 1) {
    insights.push(`${worstMeal.meal} has the highest waste rate at ${worstMeal.wastePct}%.`);
  }

  const worstDay = [...summary.byWeekday].sort((a, b) => b.wastePct - a.wastePct)[0];
  if (worstDay && summary.byWeekday.length > 3) {
    insights.push(`${worstDay.day} is the worst day of the week with ${worstDay.wastePct}% waste.`);
  }

  const normal = summary.normalDays;
  for (const event of summary.byEvent) {
    if (!normal.reports || !normal.avgServed) continue;
    const change = Math.round(((event.avgServed - normal.avgServed) / normal.avgServed) * 100);
    if (Math.abs(change) >= 10) {
      insights.push(
        `During ${event.name}, ${Math.abs(change)}% ${change < 0 ? 'fewer' : 'more'} students ate per meal than on normal days, and waste was ${event.wastePct}% (normal: ${normal.wastePct}%).`
      );
    }
  }

  if (totals.kgPerPlate > 0 && totals.wastedKg > 0) {
    insights.push(
      `The wasted food equals about ${Math.round(totals.wastedKg / totals.kgPerPlate)} plates, roughly ₹${Math.round(totals.wastedKg * COST_PER_KG).toLocaleString('en-IN')} at ₹${COST_PER_KG}/kg.`
    );
  }
  return insights;
}

// ---------- forecast ----------

// Ratio "students who eat during this event" / "students who eat on normal days just before it",
// measured on every earlier occurrence of the same event that has data.
function eventFactor(rows, event, meal) {
  const occurrences = CAMPUS_EVENTS.filter((e) => e.key === event.key && e.end < event.start);
  const ratios = [];
  const past = [];
  for (const occ of occurrences) {
    const during = rows.filter((r) => r.meal === meal && r.date >= occ.start && r.date <= occ.end);
    const beforeStart = addDays(occ.start, -28);
    const before = rows.filter(
      (r) => r.meal === meal && r.date >= beforeStart && r.date < occ.start && !eventOn(r.date)
    );
    if (during.length < 2 || before.length < 5) continue;
    const duringAvg = mean(during.map((r) => r.servedMeals));
    const beforeAvg = mean(before.map((r) => r.servedMeals));
    if (beforeAvg <= 0) continue;
    ratios.push(duringAvg / beforeAvg);
    past.push({
      start: occ.start,
      end: occ.end,
      avgServed: Math.round(duringAvg),
      avgServedBefore: Math.round(beforeAvg),
      avgPreparedKg: round1(mean(during.map((r) => r.preparedKg))),
      wastePct: pct(sum(during, (r) => r.wastedKg), sum(during, (r) => r.preparedKg)),
    });
  }
  return { factor: ratios.length ? mean(ratios) : null, past };
}

// Forecast for one meal on one date, using only reports dated before `asOf`.
export function forecastMeal(rawReports, { date, meal, asOf, totalStudents }) {
  const rows = rawReports.map(normalizeReport).filter((r) => r.date < asOf && r.meal === meal);
  const strength =
    totalStudents ||
    [...rows].reverse().find((r) => r.totalStudents)?.totalStudents ||
    null;

  // Normal (non-event) days in the last 8 weeks.
  const windowStart = addDays(asOf, -56);
  const recentNormal = rows.filter((r) => r.date >= windowStart && !eventOn(r.date));
  const sameWeekday = recentNormal.filter((r) => weekdayOf(r.date) === weekdayOf(date));
  const sample = sameWeekday.length >= 3 ? sameWeekday : recentNormal;

  if (sample.length < 3) {
    return {
      date,
      meal,
      ok: false,
      reason: 'Not enough recent data. Record at least 3 normal days for this meal.',
    };
  }

  const served = sample.map((r) => r.servedMeals);
  const baseline = median(served);
  const event = eventOn(date);
  const { factor, past } = event ? eventFactor(rows, event, meal) : { factor: null, past: [] };
  const applied = factor ?? 1;

  const cap = strength || Infinity;
  const expected = Math.min(cap, Math.max(0, Math.round(baseline * applied)));
  const spread = Math.round(stdev(served) * applied);

  const plates = sample.filter((r) => r.servedMeals > 0).map((r) => r.consumedKg / r.servedMeals);
  const kgPerPlate = median(plates);
  const recommendedKg = round1(expected * kgPerPlate * (1 + SAFETY_BUFFER));

  // What the mess usually cooks on comparable days.
  const comparablePrepared = past.length ? past.map((p) => p.avgPreparedKg) : sample.map((r) => r.preparedKg);
  const usualPreparedKg = round1(median(comparablePrepared));
  const changeKg = round1(recommendedKg - usualPreparedKg);
  const comparableWaste = past.length
    ? mean(past.map((p) => p.wastePct))
    : pct(sum(sample, (r) => r.wastedKg), sum(sample, (r) => r.preparedKg));

  let confidence = 'High';
  if (sample.length < 6 || (event && factor == null)) confidence = 'Medium';
  if (sample.length < 4 || (event && factor == null && event.kind === 'break')) confidence = 'Low';

  return {
    date,
    meal,
    ok: true,
    weekday: WEEKDAYS[weekdayOf(date)],
    event: event ? { key: event.key, name: event.name, kind: event.kind } : null,
    eventFactor: factor == null ? null : Math.round(factor * 100) / 100,
    pastEvents: past,
    baselineServed: Math.round(baseline),
    expectedServed: expected,
    expectedRange: [Math.max(0, expected - spread), Math.min(cap, expected + spread)],
    totalStudents: strength,
    expectedSkipped: strength ? Math.max(0, strength - expected) : null,
    kgPerPlate: Math.round(kgPerPlate * 1000) / 1000,
    recommendedKg,
    usualPreparedKg,
    changeKg,
    usualWastePct: round1(comparableWaste),
    estimatedSavingKg: changeKg < 0 ? -changeKg : 0,
    estimatedSavingRs: changeKg < 0 ? Math.round(-changeKg * COST_PER_KG) : 0,
    sampleDays: sample.length,
    confidence,
  };
}

export function forecastDay(rawReports, { date, asOf, totalStudents }) {
  return MEALS.map((meal) => forecastMeal(rawReports, { date, meal, asOf, totalStudents }));
}

// Upcoming campus events, for the "plan ahead" picker.
export function upcomingEvents(today, limit = 4) {
  return CAMPUS_EVENTS.filter((e) => e.end >= today)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, limit)
    .map((e) => ({ ...e, firstForecastDate: e.start > today ? e.start : addDays(today, 1) }));
}
