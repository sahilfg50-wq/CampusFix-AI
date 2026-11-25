// Generates realistic DEMO mess reports for testing the food waste analytics.
// This is synthetic data, not real campus records. Same seed -> same data.

import { eventOn } from './festivals.js';
import { addDays, weekdayOf } from './foodForecast.js';

// Share of hostel students who eat each meal on a normal day.
const BASE_RATE = { Breakfast: 0.56, Lunch: 0.74, Dinner: 0.81 };
// Cooked food eaten per student (kg).
const KG_PER_PLATE = { Breakfast: 0.28, Lunch: 0.42, Dinner: 0.4 };

// How attendance changes during campus events, per meal.
const EVENT_EFFECT = {
  navratri: { Breakfast: 0.8, Lunch: 0.62, Dinner: 0.58 },
  diwali: { Breakfast: 0.25, Lunch: 0.24, Dinner: 0.22 },
  holi: { Breakfast: 0.45, Lunch: 0.5, Dinner: 0.6 },
  winter: { Breakfast: 0.33, Lunch: 0.35, Dinner: 0.36 },
  summer: { Breakfast: 0.14, Lunch: 0.15, Dinner: 0.15 },
  exams: { Breakfast: 1.12, Lunch: 1.06, Dinner: 1.08 },
};

// How much the mess adjusts its cooking to an event (0 = ignores it, 1 = perfect).
// Low values on festivals are what create the extra waste the AI should find.
const KITCHEN_ADJUSTS = { navratri: 0.35, diwali: 0.75, holi: 0.3, winter: 0.8, summer: 0.9, exams: 0.5 };

function weekdayEffect(meal, weekday) {
  if (weekday === 0 && meal === 'Breakfast') return 0.78; // Sunday late wake-up
  if (weekday === 0 && meal === 'Lunch') return 1.06; // Sunday special lunch
  if (weekday === 6 && meal === 'Dinner') return 0.84; // Saturday night out
  if (weekday === 5 && meal === 'Dinner') return 0.92;
  return 1;
}

// Small deterministic random generator (mulberry32).
function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round1 = (n) => Math.round(n * 10) / 10;

export function generateDemoReports({ from, to, totalStudents = 800, seed = 42 } = {}) {
  const rand = random(seed);
  const noise = (spread) => 1 + (rand() * 2 - 1) * spread;
  const reports = [];

  for (let date = from; date <= to; date = addDays(date, 1)) {
    const weekday = weekdayOf(date);
    const event = eventOn(date);

    for (const meal of ['Breakfast', 'Lunch', 'Dinner']) {
      const normalRate = BASE_RATE[meal] * weekdayEffect(meal, weekday);
      const eventEffect = event ? EVENT_EFFECT[event.key]?.[meal] ?? 1 : 1;
      const served = Math.min(
        totalStudents,
        Math.max(0, Math.round(totalStudents * normalRate * eventEffect * noise(0.05)))
      );

      // The kitchen plans from the normal count and only partly adjusts for events.
      const adjust = event ? KITCHEN_ADJUSTS[event.key] ?? 0.5 : 1;
      const plannedRate = normalRate * (1 + (eventEffect - 1) * adjust);
      const planned = totalStudents * plannedRate * 1.08; // usual 8% extra
      const preparedKg = round1(planned * KG_PER_PLATE[meal] * noise(0.04));

      const eatenKg = Math.min(preparedKg, served * KG_PER_PLATE[meal] * noise(0.06));
      const leftoverKg = round1(Math.max(0, preparedKg - eatenKg));
      // Part of the leftover is reused or donated. The rest is thrown away.
      const wastedKg = round1(leftoverKg * (0.7 + rand() * 0.25));

      reports.push({
        date,
        meal,
        preparedKg,
        servedMeals: served,
        leftoverKg,
        wastedKg,
        totalStudents,
      });
    }
  }
  return reports;
}
