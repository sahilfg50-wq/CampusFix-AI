import test from 'node:test';
import assert from 'node:assert/strict';
import {
  summarize,
  findInsights,
  forecastMeal,
  normalizeReport,
  rangeStart,
  addDays,
  median,
} from '../src/foodForecast.js';
import { analyzeFoodWaste, parseFoodAdvice, fallbackFoodAdvice } from '../src/foodAi.js';
import { generateDemoReports } from '../src/demoFoodData.js';
import { eventOn } from '../src/festivals.js';

const TODAY = '2026-09-20';
const history = generateDemoReports({ from: '2024-09-01', to: addDays(TODAY, -1) });

test('normalizeReport clamps bad numbers', () => {
  const r = normalizeReport({ date: '2026-01-01', meal: 'Lunch', preparedKg: 10, leftoverKg: 50, wastedKg: -3, servedMeals: 'x' });
  assert.equal(r.leftoverKg, 10);
  assert.equal(r.wastedKg, 0);
  assert.equal(r.servedMeals, 0);
  assert.equal(r.consumedKg, 0);
  const d = normalizeReport({ date: '2026-01-01', meal: 'Lunch', preparedKg: 10, leftoverKg: 2, servedMeals: 20 });
  assert.equal(d.wastedKg, 2, 'old reports without wastedKg count all leftover as waste');
});

test('rangeStart and median', () => {
  assert.equal(rangeStart('7d', '2026-09-20'), '2026-09-14');
  assert.equal(rangeStart('all', '2026-09-20'), null);
  assert.throws(() => rangeStart('5y', '2026-09-20'));
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.equal(median([]), 0);
});

test('summarize respects the range and totals add up', () => {
  const week = summarize(history, { range: '7d', today: TODAY });
  assert.equal(week.daysWithData, 6); // today itself has no report yet
  assert.equal(week.totals.reports, 18);
  const sumSeries = week.series.reduce((t, s) => t + s.servedMeals, 0);
  assert.equal(sumSeries, week.totals.servedMeals);

  const twoYears = summarize(history, { range: '2y', today: TODAY });
  assert.equal(twoYears.bucket, 'month');
  assert.ok(twoYears.series.length >= 24);
  assert.ok(twoYears.totals.preparedKg > twoYears.totals.consumedKg);
  assert.ok(twoYears.byEvent.some((e) => e.key === 'navratri'));
});

test('insights find the Navratri attendance drop', () => {
  const s = summarize(history, { range: 'all', today: TODAY });
  const insights = findInsights(s);
  assert.ok(insights.some((i) => i.includes('Navratri') && i.includes('fewer')));
});

test('forecast for Navratri uses last years and cooks less than usual', () => {
  const navratriDay = '2026-10-14';
  assert.equal(eventOn(navratriDay)?.key, 'navratri');
  const f = forecastMeal(history, { date: navratriDay, meal: 'Dinner', asOf: TODAY });
  assert.equal(f.ok, true);
  assert.equal(f.event.key, 'navratri');
  assert.ok(f.pastEvents.length >= 2, 'uses Navratri 2024 and 2025');
  assert.ok(f.eventFactor < 0.8, `factor ${f.eventFactor}`);
  assert.ok(f.expectedServed < f.baselineServed);
  assert.ok(f.changeKg < 0 && f.estimatedSavingKg > 0);
  assert.equal(f.expectedSkipped, 800 - f.expectedServed);
  assert.ok(f.expectedRange[0] <= f.expectedServed && f.expectedServed <= f.expectedRange[1]);
});

test('forecast on a normal day stays close to the baseline', () => {
  const f = forecastMeal(history, { date: '2026-09-23', meal: 'Lunch', asOf: TODAY });
  assert.equal(f.ok, true);
  assert.equal(f.event, null);
  assert.equal(f.expectedServed, f.baselineServed);
  assert.ok(Math.abs(f.recommendedKg - f.expectedServed * f.kgPerPlate * 1.05) < 0.2);
});

test('forecast never uses future data and reports missing data', () => {
  const f = forecastMeal(history, { date: '2026-09-23', meal: 'Lunch', asOf: '2024-09-02' });
  assert.equal(f.ok, false);
  assert.match(f.reason, /Not enough/);
});

test('analyzeFoodWaste falls back to rules when Gemini fails', async () => {
  let logged = false;
  const r = await analyzeFoodWaste({
    reports: history,
    today: TODAY,
    range: '12m',
    targetDate: '2026-10-14',
    generate: async () => { throw new Error('quota'); },
    log: () => { logged = true; },
  });
  assert.equal(r.source, 'rules');
  assert.ok(logged);
  assert.equal(r.forecast.length, 3);
  assert.ok(r.advice.headline.includes('Navratri'));
  assert.ok(r.advice.recommendations.length >= 3);
});

test('analyzeFoodWaste uses a valid Gemini answer', async () => {
  const answer = { headline: 'Cook less', summary: 'Demand drops.', recommendations: ['Cook 10 kg less.'], watchOut: [] };
  let payloadSeen;
  const r = await analyzeFoodWaste({
    reports: history,
    today: TODAY,
    range: '30d',
    generate: async (payload) => { payloadSeen = payload; return JSON.stringify(answer); },
  });
  assert.equal(r.source, 'gemini');
  assert.deepEqual(r.advice, answer);
  assert.equal(r.targetDate, '2026-09-21');
  assert.ok(Array.isArray(payloadSeen.forecast) && payloadSeen.totals.reports > 0);
});

test('parseFoodAdvice rejects incomplete answers', () => {
  assert.throws(() => parseFoodAdvice('not json'));
  assert.throws(() => parseFoodAdvice(JSON.stringify({ headline: 'x', summary: '', recommendations: [] })));
});

test('fallback advice works with no data at all', () => {
  const summary = summarize([], { range: '7d', today: TODAY });
  const advice = fallbackFoodAdvice({ summary, insights: [], forecast: [{ meal: 'Lunch', ok: false, reason: 'Not enough recent data.' }] });
  assert.ok(advice.headline);
  assert.ok(advice.watchOut.some((w) => w.includes('Lunch')));
});
