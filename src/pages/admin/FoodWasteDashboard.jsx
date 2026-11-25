import { useEffect, useState } from 'react';
import {
  saveFoodReport,
  subscribeFoodReports,
  subscribeMealConfirmations,
} from '../../services/mess';
import FoodAnalytics from '../../components/food/FoodAnalytics';
import FoodAiPanel from '../../components/food/FoodAiPanel';

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const TABS = [
  ['report', 'Daily Report'],
  ['analytics', 'Analytics'],
  ['ai', 'AI Analysis'],
];

export default function FoodWasteDashboard() {
  const [tab, setTab] = useState('report');
  const now = today();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Food Waste Dashboard</h2>
        <p className="mt-1 text-sm text-mu">
          Record daily food reports, see waste trends over time, and let AI plan how much to cook.
        </p>
      </div>

      <div className="flex gap-1 rounded-2xl bg-soft p-1" role="tablist">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`tab ${tab === id ? 'tab-on' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'report' && <DailyReport initialDate={now} />}
      {tab === 'analytics' && <FoodAnalytics today={now} />}
      {tab === 'ai' && <FoodAiPanel today={now} />}
    </div>
  );
}

const STRENGTH_KEY = 'campusfix.hostelStrength';
const emptyReport = () => ({
  preparedKg: '',
  servedMeals: '',
  leftoverKg: '',
  wastedKg: '',
  totalStudents: localStorage.getItem(STRENGTH_KEY) || '800',
});

function DailyReport({ initialDate }) {
  const [date, setDate] = useState(initialDate);
  const [meal, setMeal] = useState('Breakfast');
  const [report, setReport] = useState(emptyReport);
  const [savedExists, setSavedExists] = useState(false);
  const [confirmations, setConfirmations] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeMealConfirmations(
      date,
      (data) => setConfirmations(data),
      (err) => setError(err.message || 'Could not load confirmations.')
    );
    return () => unsubscribe();
  }, [date]);

  useEffect(() => {
    setReport(emptyReport());
    setSavedExists(false);
    setMessage('');
    setError('');

    const unsubscribe = subscribeFoodReports(
      date,
      (data) => {
        const saved = data.find((item) => item.meal === meal);
        if (!saved) return;
        setSavedExists(true);
        setReport({
          preparedKg: String(saved.preparedKg ?? ''),
          servedMeals: String(saved.servedMeals ?? ''),
          leftoverKg: String(saved.leftoverKg ?? ''),
          wastedKg: String(saved.wastedKg ?? saved.leftoverKg ?? ''),
          totalStudents: String(saved.totalStudents ?? emptyReport().totalStudents),
        });
      },
      (err) => setError(err.message || 'Could not load food report.')
    );
    return () => unsubscribe();
  }, [date, meal]);

  const n = (v) => Number(v) || 0;
  const prepared = n(report.preparedKg);
  const leftover = n(report.leftoverKg);
  const wasted = report.wastedKg === '' ? leftover : n(report.wastedKg);
  const served = n(report.servedMeals);
  const strength = n(report.totalStudents);
  const wastePct = prepared > 0 ? ((wasted / prepared) * 100).toFixed(1) : '0.0';

  const mealConfirmations = confirmations.filter((item) => item.meal === meal);
  const vegConfirmed = mealConfirmations.filter((item) => item.preference === 'Veg').length;
  const nonVegConfirmed = mealConfirmations.filter((item) => item.preference === 'Non-Veg').length;

  const update = (field, value) => {
    setReport((previous) => ({ ...previous, [field]: value.replace(/[^\d.]/g, '') }));
    setMessage('');
    setError('');
  };

  const saveReport = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await saveFoodReport({
        date,
        meal,
        preparedKg: prepared,
        servedMeals: served,
        leftoverKg: leftover,
        wastedKg: wasted,
        totalStudents: strength,
      });
      localStorage.setItem(STRENGTH_KEY, String(strength));
      setMessage('Food report saved.');
    } catch (err) {
      setError(err.message || 'Could not save food report.');
    } finally {
      setSaving(false);
    }
  };

  const cards = [
    { title: 'Confirmed (Veg / Non-Veg)', value: `${vegConfirmed} / ${nonVegConfirmed}`, unit: 'expected demand' },
    { title: 'Meals served', value: served, unit: strength ? `${Math.max(0, strength - served)} skipped` : 'meals' },
    { title: 'Prepared', value: `${prepared} kg`, unit: `${(prepared - leftover).toFixed(1)} kg consumed` },
    { title: 'Wasted', value: `${wasted} kg`, unit: `${wastePct}% of prepared`, tone: Number(wastePct) > 12 ? 'text-rose-600' : '' },
  ];

  const fields = [
    ['totalStudents', 'Hostel strength (students)', 'Total students who could eat this meal'],
    ['preparedKg', 'Food prepared (kg)', ''],
    ['servedMeals', 'Meals served', 'Count of plates / students served'],
    ['leftoverKg', 'Leftover food (kg)', 'Everything not eaten'],
    ['wastedKg', 'Of that, thrown away (kg)', 'Leftover not reused or donated. Empty = all leftover'],
  ];

  return (
    <div className="space-y-4">
      <div className="panel grid gap-3 md:grid-cols-[1fr_2fr] md:items-end">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Report date</span>
          <input type="date" value={date} max={initialDate} onChange={(e) => setDate(e.target.value)} className="field" />
        </label>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-soft p-1">
          {['Breakfast', 'Lunch', 'Dinner'].map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setMeal(name)}
              className={`tab ${meal === name ? 'tab-on' : ''}`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.title} className="panel !p-4">
            <p className="text-xs text-mu">{card.title}</p>
            <p className={`mt-1 text-2xl font-bold ${card.tone || ''}`}>{card.value}</p>
            <p className="mt-0.5 text-[11px] text-mu">{card.unit}</p>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="panel-title !mb-0">{meal} report · {date}</h3>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${savedExists ? 'bg-emerald-100 text-emerald-700' : 'bg-soft text-mu'}`}>
            {savedExists ? 'Saved' : 'Not saved yet'}
          </span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {fields.map(([field, label, hint]) => (
            <label key={field} className="block">
              <span className="mb-1 block text-sm font-medium">{label}</span>
              <input
                inputMode="decimal"
                value={report[field]}
                onChange={(e) => update(field, e.target.value)}
                placeholder="0"
                className="field"
              />
              {hint && <span className="mt-1 block text-[11px] text-mu">{hint}</span>}
            </label>
          ))}
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-sm">
            <span className="text-mu">Waste rate</span>
            <strong>{wastePct}%</strong>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-soft">
            <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.min(Number(wastePct), 100)}%` }} />
          </div>
        </div>

        <button type="button" onClick={saveReport} disabled={saving || !date} className="btn-pr mt-5 w-full">
          {saving ? 'Saving…' : 'Save Food Report'}
        </button>
        {message && <p className="mt-3 text-sm font-medium text-emerald-600">{message}</p>}
        {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
      </div>

      <p className="text-xs text-mu">
        Confirmations show expected demand, not proof that students ate. Meals served and leftovers must be recorded
        by mess staff. These reports feed the Analytics and AI Analysis tabs.
      </p>
    </div>
  );
}
