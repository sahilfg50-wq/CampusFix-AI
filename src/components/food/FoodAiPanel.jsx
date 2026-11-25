import { useMemo, useState } from 'react';
import { analyzeFoodWaste } from '../../services/mess';
import { RANGES, addDays, upcomingEvents } from '../../../functions/src/foodForecast.js';
import { CAMPUS_EVENTS } from '../../../functions/src/festivals.js';

const KIND_STYLE = {
  festival: 'bg-violet-100 text-violet-700',
  break: 'bg-sky-100 text-sky-700',
  exams: 'bg-amber-100 text-amber-700',
};

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 });

const CONFIDENCE_TONE = {
  High: 'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-rose-100 text-rose-700',
};

export default function FoodAiPanel({ today }) {
  const tomorrow = addDays(today, 1);
  const [targetDate, setTargetDate] = useState(tomorrow);
  const [range, setRange] = useState('12m');
  const [strength, setStrength] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const events = useMemo(() => upcomingEvents(today), [today]);

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await analyzeFoodWaste({
        range,
        targetDate,
        totalStudents: strength ? Number(strength) : undefined,
      });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Could not analyse food waste.');
    } finally {
      setLoading(false);
    }
  };

  const ready = result?.forecast.filter((f) => f.ok) || [];
  const dayTotal = ready.reduce((t, f) => t + f.recommendedKg, 0);
  const dayUsual = ready.reduce((t, f) => t + f.usualPreparedKg, 0);
  const daySaving = ready.reduce((t, f) => t + f.estimatedSavingRs, 0);

  return (
    <div className="space-y-4">
      <div className="panel bg-gradient-to-br from-indigo-600 to-violet-600 !border-0 text-white">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15 text-xl">✦</span>
          <div>
            <h3 className="text-lg font-bold">AI Food Waste Analysis</h3>
            <p className="mt-1 text-sm text-white/80">
              Looks at past food reports, including the same festival or break in earlier years, and tells you how
              many students will likely eat and how much to cook.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
          <label className="block text-sm">
            <span className="mb-1 block text-white/80">Plan for date</span>
            <input
              type="date"
              min={tomorrow}
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full rounded-xl border-0 bg-white/95 p-2.5 text-slate-900"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-white/80">Analyse history of</span>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="w-full rounded-xl border-0 bg-white/95 p-2.5 text-slate-900"
            >
              {Object.entries(RANGES).map(([key, r]) => (
                <option key={key} value={key}>{r.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-white/80">Hostel strength (optional)</span>
            <input
              type="number"
              min="1"
              placeholder="From last report"
              value={strength}
              onChange={(e) => setStrength(e.target.value.replace(/\D/g, '').slice(0, 5))}
              className="w-full rounded-xl border-0 bg-white/95 p-2.5 text-slate-900"
            />
          </label>
          <button
            type="button"
            onClick={run}
            disabled={loading || !targetDate}
            className="min-h-11 rounded-xl bg-white px-5 font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50 disabled:opacity-60"
          >
            {loading ? 'Analysing…' : 'Analyze Wastage'}
          </button>
        </div>

        {events.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-white/70">Upcoming:</span>
            {events.map((e) => (
              <button
                key={`${e.key}-${e.start}`}
                type="button"
                onClick={() => setTargetDate(e.firstForecastDate)}
                className="rounded-full bg-white/15 px-3 py-1 hover:bg-white/25"
              >
                {e.name} · {e.start}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}

      {result && (
        <>
          <div className="panel">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold">{result.advice.headline}</h3>
              <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold text-mu">
                {result.source !== 'rules'
                  ? `Written by ${result.aiLabel || 'AI'}`
                  : result.aiConfigured
                    ? 'AI did not answer · rule-based'
                    : 'Rule-based (no AI running)'}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed">{result.advice.summary}</p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-emerald-700">What to do</h4>
                <ul className="space-y-2">
                  {result.advice.recommendations.map((r) => (
                    <li key={r} className="flex gap-2 text-sm">
                      <span className="text-emerald-600">✓</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
              {result.advice.watchOut.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-amber-700">Watch out</h4>
                  <ul className="space-y-2">
                    {result.advice.watchOut.map((w) => (
                      <li key={w} className="flex gap-2 text-sm">
                        <span className="text-amber-600">!</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="panel-title !mb-0">Cooking plan for {result.targetDate}</h3>
              {ready.length > 0 && (
                <p className="text-sm text-mu">
                  Total <strong className="text-tx">{fmt(dayTotal)} kg</strong> (usual {fmt(dayUsual)} kg)
                  {daySaving > 0 && <> · saves about <strong className="text-emerald-600">₹{fmt(daySaving)}</strong></>}
                </p>
              )}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {result.forecast.map((f) => (
                <MealForecast key={f.meal} f={f} />
              ))}
            </div>
          </div>
        </>
      )}

      <CampusCalendar today={today} onPick={setTargetDate} />

      <p className="text-xs text-mu">
        Quantities are calculated from your saved reports (median of recent comparable days, adjusted by how
        attendance changed during the same event in earlier years, plus a 5% safety buffer). The AI only explains
        these numbers. Festival dates are approximate.
      </p>
    </div>
  );
}

function CampusCalendar({ today, onPick }) {
  const [showPast, setShowPast] = useState(false);
  const events = [...CAMPUS_EVENTS]
    .filter((e) => showPast || e.end >= today)
    .sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="panel-title !mb-0">Campus calendar</h3>
          <p className="text-xs text-mu">Demo dates used by the forecast. Replace them with the college holiday list.</p>
        </div>
        <button type="button" onClick={() => setShowPast((v) => !v)} className="chip">
          {showPast ? 'Hide past' : 'Show past years'}
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((e) => {
          const past = e.end < today;
          const now = e.start <= today && today <= e.end;
          return (
            <button
              key={`${e.key}-${e.start}`}
              type="button"
              disabled={past}
              onClick={() => onPick(e.start > today ? e.start : addDays(today, 1))}
              className={`flex items-center justify-between gap-2 rounded-xl border border-bd p-3 text-left text-sm ${
                past ? 'opacity-50' : 'hover:border-pr'
              }`}
            >
              <span>
                <span className="block font-medium">{e.name}</span>
                <span className="text-xs text-mu">
                  {e.start} → {e.end}
                </span>
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${now ? 'bg-emerald-100 text-emerald-700' : KIND_STYLE[e.kind]}`}>
                {now ? 'Now' : e.kind}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MealForecast({ f }) {
  if (!f.ok) {
    return (
      <div className="rounded-2xl border border-dashed border-bd p-4">
        <p className="font-semibold">{f.meal}</p>
        <p className="mt-2 text-sm text-mu">{f.reason}</p>
      </div>
    );
  }

  const less = f.changeKg < 0;
  return (
    <div className="rounded-2xl border border-bd bg-soft p-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{f.meal}</p>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${CONFIDENCE_TONE[f.confidence]}`}>
          {f.confidence} confidence
        </span>
      </div>
      {f.event && <p className="mt-1 text-xs font-medium text-violet-600">{f.event.name}</p>}

      <p className="mt-3 text-3xl font-bold">{fmt(f.recommendedKg)} <span className="text-base font-semibold text-mu">kg</span></p>
      <p className={`text-sm font-medium ${less ? 'text-emerald-600' : f.changeKg > 0 ? 'text-amber-600' : 'text-mu'}`}>
        {less ? `${fmt(-f.changeKg)} kg less` : f.changeKg > 0 ? `${fmt(f.changeKg)} kg more` : 'Same'} than usual ({fmt(f.usualPreparedKg)} kg)
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-mu">Will likely eat</dt>
          <dd className="font-semibold">{fmt(f.expectedServed)}</dd>
          <dd className="text-[11px] text-mu">range {f.expectedRange[0]}–{f.expectedRange[1]}</dd>
        </div>
        <div>
          <dt className="text-xs text-mu">May skip</dt>
          <dd className="font-semibold">{f.expectedSkipped == null ? '—' : fmt(f.expectedSkipped)}</dd>
          {f.totalStudents && <dd className="text-[11px] text-mu">of {fmt(f.totalStudents)}</dd>}
        </div>
        <div>
          <dt className="text-xs text-mu">Normal day</dt>
          <dd className="font-semibold">{fmt(f.baselineServed)} eat</dd>
        </div>
        <div>
          <dt className="text-xs text-mu">Past waste</dt>
          <dd className="font-semibold">{f.usualWastePct}%</dd>
        </div>
      </dl>

      {f.pastEvents.length > 0 && (
        <div className="mt-3 border-t border-bd pt-3">
          <p className="text-xs font-semibold text-mu">Earlier {f.event.name}</p>
          {f.pastEvents.map((p) => (
            <p key={p.start} className="mt-1 text-xs">
              {p.start.slice(0, 4)}: {p.avgServed} ate (normally {p.avgServedBefore}), {p.wastePct}% wasted
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
