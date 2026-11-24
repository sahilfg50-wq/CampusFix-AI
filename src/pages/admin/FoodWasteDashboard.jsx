import { useEffect, useState } from 'react';
import {
  saveFoodReport,
  subscribeFoodReports,
  subscribeMealConfirmations,
} from '../../services/mess';

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function FoodWasteDashboard() {
  const [date, setDate] = useState(today());
  const [meal, setMeal] = useState('Breakfast');

  const [report, setReport] = useState({
    preparedKg: 0,
    servedMeals: 0,
    leftoverKg: 0,
  });

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
    setReport({
      preparedKg: 0,
      servedMeals: 0,
      leftoverKg: 0,
    });
    setMessage('');
    setError('');

    const unsubscribe = subscribeFoodReports(
      date,
      (data) => {
        const savedReport = data.find((item) => item.meal === meal);

        setReport({
          preparedKg: savedReport?.preparedKg ?? 0,
          servedMeals: savedReport?.servedMeals ?? 0,
          leftoverKg: savedReport?.leftoverKg ?? 0,
        });
      },
      (err) => setError(err.message || 'Could not load food report.')
    );

    return () => unsubscribe();
  }, [date, meal]);

  const mealConfirmations = confirmations.filter(
    (item) => item.meal === meal
  );

  const vegConfirmed = mealConfirmations.filter(
    (item) => item.preference === 'Veg'
  ).length;

  const nonVegConfirmed = mealConfirmations.filter(
    (item) => item.preference === 'Non-Veg'
  ).length;

  const totalConfirmed = vegConfirmed + nonVegConfirmed;

  const wastage = report.preparedKg > 0
    ? ((report.leftoverKg / report.preparedKg) * 100).toFixed(1)
    : '0.0';

  const update = (field, value) => {
    setReport((previous) => ({
      ...previous,
      [field]: Math.max(0, Number(value) || 0),
    }));

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
        ...report,
      });

      setMessage('Food report saved successfully.');
    } catch (err) {
      setError(err.message || 'Could not save food report.');
    } finally {
      setSaving(false);
    }
  };

  const cards = [
    {
      title: 'Veg Confirmations',
      value: vegConfirmed,
      unit: 'students',
    },
    {
      title: 'Non-Veg Confirmations',
      value: nonVegConfirmed,
      unit: 'students',
    },
    {
      title: 'Total Confirmations',
      value: totalConfirmed,
      unit: 'students',
    },
    {
      title: 'Food Prepared',
      value: report.preparedKg,
      unit: 'kg',
    },
    {
      title: 'Meals Served',
      value: report.servedMeals,
      unit: 'meals',
    },
    {
      title: 'Leftover Food',
      value: report.leftoverKg,
      unit: 'kg',
    },
    {
      title: 'Wastage Percentage',
      value: `${wastage}%`,
      unit: 'of prepared food',
    },
  ];

  const fields = [
    ['preparedKg', 'Food prepared (kg)'],
    ['servedMeals', 'Actual meals served'],
    ['leftoverKg', 'Leftover food (kg)'],
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">
          Food Waste Dashboard
        </h2>
        <p className="mt-1 text-sm text-mu">
          Monitor meal demand, food preparation and leftover quantity.
        </p>
      </div>

      <div className="rounded-2xl border border-bd bg-card p-4">
        <label className="mb-2 block text-sm font-medium">
          Report Date
        </label>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-xl border border-bd bg-bg p-3"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {['Breakfast', 'Lunch', 'Dinner'].map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setMeal(name)}
            className={`rounded-xl p-3 text-sm font-semibold ${
              meal === name
                ? 'bg-blue-600 text-white'
                : 'bg-soft text-tx'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold">
          {meal} Overview
        </h3>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-bd bg-card p-4"
            >
              <p className="text-sm text-mu">{card.title}</p>
              <p className="mt-2 text-3xl font-bold">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-mu">{card.unit}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-bd bg-card p-4">
        <h3 className="text-lg font-semibold">
          Enter {meal} Food Report
        </h3>

        <p className="mt-1 text-sm text-mu">
          Enter actual quantities recorded by mess staff.
        </p>

        <div className="mt-4 space-y-4">
          {fields.map(([field, label]) => (
            <div key={field}>
              <label className="mb-1 block text-sm font-medium">
                {label}
              </label>

              <input
                type="number"
                min="0"
                step="0.1"
                value={report[field]}
                onChange={(e) => update(field, e.target.value)}
                className="w-full rounded-xl border border-bd bg-bg p-3"
              />
            </div>
          ))}

          <button
            type="button"
            onClick={saveReport}
            disabled={saving || !date}
            className="btn-pr w-full disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Food Report'}
          </button>

          {message && (
            <p className="text-sm font-medium text-emerald-600">
              {message}
            </p>
          )}

          {error && (
            <p className="text-sm font-medium text-red-500">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-bd bg-card p-4">
        <h3 className="font-semibold">Food Waste Summary</h3>

        <div className="mt-4 flex justify-between gap-3 text-sm">
          <span className="text-mu">Wastage rate</span>
          <strong>{wastage}%</strong>
        </div>

        <div className="mt-3 h-3 overflow-hidden rounded-full bg-soft">
          <div
            className="h-full rounded-full bg-orange-500"
            style={{
              width: `${Math.min(Number(wastage), 100)}%`,
            }}
          />
        </div>
      </div>

      <p className="text-xs text-mu">
        Confirmations represent expected demand, not verified meal
        consumption. Actual meals served and leftover food must be
        recorded by mess staff.
      </p>
    </div>
  );
}