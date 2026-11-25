import { useEffect, useMemo, useState } from 'react';
import { fetchFoodReports } from '../../services/mess';
import {
  RANGES,
  MEALS,
  summarize,
  findInsights,
  rangeStart,
  COST_PER_KG,
} from '../../../functions/src/foodForecast.js';
import FoodStackedBars from '../charts/FoodStackedBars';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 });

export default function FoodAnalytics({ today }) {
  const [range, setRange] = useState('30d');
  const [meal, setMeal] = useState('All');
  const [reports, setReports] = useState([]);
  const [loadedFrom, setLoadedFrom] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load once per needed history length. Shorter ranges reuse what is already loaded.
  useEffect(() => {
    const from = rangeStart(range, today);
    const alreadyCovered = loadedFrom === null || (loadedFrom !== undefined && from && from >= loadedFrom);
    if (alreadyCovered) return undefined;

    let active = true;
    setLoading(true);
    setError('');
    fetchFoodReports(from)
      .then((data) => {
        if (!active) return;
        setReports(data);
        setLoadedFrom(from);
      })
      .catch((err) => active && setError(err.message || 'Could not load food reports.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [range, today, loadedFrom]);

  const summary = useMemo(() => summarize(reports, { range, today, meal }), [reports, range, today, meal]);
  const insights = useMemo(() => findInsights(summary), [summary]);
  const t = summary.totals;

  const kpis = [
    { label: 'Food prepared', value: `${fmt(t.preparedKg)} kg`, tone: 'text-tx' },
    { label: 'Consumed', value: `${fmt(t.consumedKg)} kg`, tone: 'text-emerald-600' },
    { label: 'Left over', value: `${fmt(t.leftoverKg)} kg`, sub: `${t.leftoverPct}% of prepared`, tone: 'text-amber-600' },
    { label: 'Wasted', value: `${fmt(t.wastedKg)} kg`, sub: `${t.wastePct}% of prepared`, tone: 'text-rose-600' },
    { label: 'Meals served', value: fmt(t.servedMeals), sub: `avg ${fmt(t.avgServed)} per meal`, tone: 'text-tx' },
    {
      label: 'Students skipping',
      value: t.avgSkipped == null ? '—' : fmt(t.avgSkipped),
      sub: 'avg per meal',
      tone: 'text-tx',
    },
    {
      label: 'Cost of waste',
      value: `₹${fmt(Math.round(t.wastedKg * COST_PER_KG))}`,
      sub: `at ₹${COST_PER_KG}/kg (estimate)`,
      tone: 'text-rose-600',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(RANGES).map(([key, r]) => (
          <button
            key={key}
            type="button"
            onClick={() => setRange(key)}
            className={`chip ${range === key ? 'chip-on' : ''}`}
          >
            {r.label}
          </button>
        ))}
        <select value={meal} onChange={(e) => setMeal(e.target.value)} className="field ml-auto w-auto" aria-label="Meal">
          <option value="All">All meals</option>
          {MEALS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}

      {loading ? (
        <div className="panel animate-pulse text-mu">Loading food reports…</div>
      ) : t.reports === 0 ? (
        <div className="panel text-center">
          <p className="font-semibold">No food reports in this period</p>
          <p className="mt-1 text-sm text-mu">Save daily reports in the Daily Report tab, or run <code>npm run seed</code> for demo history.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-mu">
            {summary.from} to {summary.to} · {summary.daysWithData} days with reports · {t.reports} meal reports
          </p>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            {kpis.map((k) => (
              <div key={k.label} className="panel !p-4">
                <p className="text-xs text-mu">{k.label}</p>
                <p className={`mt-1 text-xl font-bold ${k.tone}`}>{k.value}</p>
                {k.sub && <p className="mt-0.5 text-[11px] text-mu">{k.sub}</p>}
              </div>
            ))}
          </div>

          <div className="panel">
            <h3 className="panel-title">
              Food prepared per {summary.bucket === 'month' ? 'month' : 'day'}
            </h3>
            <FoodStackedBars series={summary.series} />
          </div>

          {insights.length > 0 && (
            <div className="panel">
              <h3 className="panel-title">Key findings</h3>
              <ul className="space-y-2">
                {insights.map((text) => (
                  <li key={text} className="flex gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pr" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownTable
              title="By meal"
              rows={summary.byMeal.map((m) => ({ key: m.meal, name: m.meal, ...m }))}
            />
            <BreakdownTable
              title="Festivals, breaks and exams"
              empty="No campus events in this period."
              rows={[
                { key: 'normal', name: 'Normal days', ...summary.normalDays },
                ...summary.byEvent.map((e) => ({ ...e, name: e.name })),
              ].filter((r) => r.reports > 0)}
            />
          </div>

          {summary.byWeekday.length > 0 && (
            <div className="panel">
              <h3 className="panel-title">Waste by day of week</h3>
              <div className="grid grid-cols-7 gap-2">
                {summary.byWeekday.map((d) => (
                  <div key={d.day} className="text-center">
                    <div className="mx-auto flex h-24 w-full max-w-[44px] items-end rounded-lg bg-soft">
                      <div
                        className="w-full rounded-lg bg-rose-400"
                        style={{ height: `${Math.min(100, d.wastePct * 4)}%` }}
                        title={`${d.wastePct}% wasted`}
                      />
                    </div>
                    <p className="mt-1 text-xs font-semibold">{d.wastePct}%</p>
                    <p className="text-[11px] text-mu">{d.day}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BreakdownTable({ title, rows, empty }) {
  return (
    <div className="panel overflow-x-auto">
      <h3 className="panel-title">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-mu">{empty}</p>
      ) : (
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-mu">
              <th className="pb-2">Period</th>
              <th className="pb-2 text-right">Avg eating</th>
              <th className="pb-2 text-right">Prepared</th>
              <th className="pb-2 text-right">Wasted</th>
              <th className="pb-2 text-right">Waste %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-bd">
                <td className="py-2 font-medium">{r.name}</td>
                <td className="py-2 text-right">{fmt(r.avgServed)}</td>
                <td className="py-2 text-right">{fmt(r.preparedKg)} kg</td>
                <td className="py-2 text-right">{fmt(r.wastedKg)} kg</td>
                <td className={`py-2 text-right font-semibold ${r.wastePct > 12 ? 'text-rose-600' : 'text-tx'}`}>
                  {r.wastePct}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
