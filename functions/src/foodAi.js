// "Analyze Wastage": statistics + forecast (foodForecast.js) and a written explanation.
// The numbers always come from foodForecast.js. Gemini only explains them and suggests actions,
// so a wrong or missing AI answer can never change a quantity shown to mess staff.

import { summarize, findInsights, forecastDay, addDays } from './foodForecast.js';

const MAX_TEXT = 400;
const clip = (s, max = MAX_TEXT) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

const SYSTEM_INSTRUCTION = `You are a food waste analyst for a college hostel mess in India.
You receive JSON with: historical totals, computed insights, and a computed forecast for an upcoming date.
Write advice for the mess manager.

Rules:
- Use ONLY the numbers in the JSON. Never invent, change or recalculate quantities.
- Mention the forecast quantities exactly as given (expectedServed, expectedSkipped, recommendedKg, changeKg).
- If a forecast has ok=false, say that more data is needed for that meal.
- If an event (festival, break, exams) is present, explain how it changes demand, using pastEvents.
- Keep it practical: portion control, batch cooking, menu changes, leftover reuse, donation, confirmation reminders.
- Plain, simple English. No markdown.`;

const schema = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    summary: { type: 'string' },
    recommendations: { type: 'array', items: { type: 'string' } },
    watchOut: { type: 'array', items: { type: 'string' } },
  },
  required: ['headline', 'summary', 'recommendations', 'watchOut'],
};

// llm: a provider from llm.js (Gemini or local Ollama).
export function generateFoodAdvice({ llm, payload }) {
  return llm.generateJson({
    system: SYSTEM_INSTRUCTION,
    prompt: JSON.stringify(payload),
    schema,
  });
}

export function parseFoodAdvice(text) {
  const obj = JSON.parse(String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).slice(0, 6).map((x) => clip(x)) : []);
  const advice = {
    headline: clip(obj?.headline, 160),
    summary: clip(obj?.summary, 900),
    recommendations: list(obj?.recommendations),
    watchOut: list(obj?.watchOut),
  };
  if (!advice.headline || !advice.summary || advice.recommendations.length === 0) {
    throw new Error('Incomplete AI answer.');
  }
  return advice;
}

// Written advice built from the computed numbers when Gemini is not available.
export function fallbackFoodAdvice({ summary, insights, forecast }) {
  const ready = forecast.filter((f) => f.ok);
  const totalKg = ready.reduce((t, f) => t + f.recommendedKg, 0);
  const totalChange = ready.reduce((t, f) => t + f.changeKg, 0);
  const event = ready.find((f) => f.event)?.event;

  const recommendations = ready.map((f) => {
    const direction =
      f.changeKg < -0.5
        ? `${Math.abs(f.changeKg)} kg less than usual`
        : f.changeKg > 0.5
          ? `${f.changeKg} kg more than usual`
          : 'about the usual quantity';
    const skip = f.expectedSkipped != null ? `, about ${f.expectedSkipped} may skip` : '';
    return `${f.meal}: cook about ${f.recommendedKg} kg (${direction}) for around ${f.expectedServed} students${skip}.`;
  });
  if (summary.totals.wastePct > 10) {
    recommendations.push('Serve in two batches: cook 80% first and the rest only if the queue is still long.');
  }
  recommendations.push('Remind students to confirm meals before the deadline so the counts stay accurate.');

  const watchOut = [];
  if (event) watchOut.push(`${event.name} changes attendance. Re-check the count on the day.`);
  for (const f of forecast.filter((x) => !x.ok)) watchOut.push(`${f.meal}: ${f.reason}`);
  for (const f of ready.filter((x) => x.confidence === 'Low')) {
    watchOut.push(`${f.meal} forecast has low confidence because there is little comparable data.`);
  }

  return {
    headline: event
      ? `${event.name}: plan for changed attendance`
      : `Recommended total: about ${Math.round(totalKg)} kg for the day`,
    summary: [
      ...insights.slice(0, 3),
      ready.length
        ? `For ${forecast[0].date}, the forecast suggests ${Math.round(totalKg)} kg in total, ${
            totalChange < 0 ? `${Math.abs(Math.round(totalChange))} kg less` : `${Math.round(totalChange)} kg more`
          } than the mess usually cooks on similar days.`
        : '',
    ]
      .filter(Boolean)
      .join(' '),
    recommendations,
    watchOut,
  };
}

// Runs the full analysis. `generate` is optional; without it (or if it fails) the fallback is used.
// `aiSource` is the provider name reported when `generate` succeeds.
export async function analyzeFoodWaste({ reports, today, range, targetDate, totalStudents, generate, aiSource = 'gemini', log }) {
  const date = targetDate || addDays(today, 1);
  const summary = summarize(reports, { range, today });
  const insights = findInsights(summary);
  const forecast = forecastDay(reports, { date, asOf: today, totalStudents });

  const payload = {
    range: summary.rangeLabel,
    totals: summary.totals,
    normalDays: summary.normalDays,
    byMeal: summary.byMeal,
    byEvent: summary.byEvent,
    insights,
    forecast,
  };

  let advice = null;
  let source = 'rules';
  if (generate) {
    try {
      advice = parseFoodAdvice(await generate(payload));
      source = aiSource;
    } catch (error) {
      log?.(error);
    }
  }
  if (!advice) advice = fallbackFoodAdvice({ summary, insights, forecast });

  return { targetDate: date, summary, insights, forecast, advice, source };
}
