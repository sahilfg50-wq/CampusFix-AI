import { useEffect, useState } from 'react';
import {
  saveMealMenu,
  subscribeMealConfirmations,
} from '../../services/mess';

const initialMenu = {
  Breakfast: {
    time: '7:30 AM - 9:00 AM',
    deadline: '07:00',
    veg: 'Poha, Bread & Butter, Milk, Banana',
    nonVeg: 'Boiled Eggs, Bread, Milk, Banana',
  },
  Lunch: {
    time: '12:30 PM - 2:00 PM',
    deadline: '10:00',
    veg: 'Rice, Dal, Paneer Curry, Roti, Salad',
    nonVeg: 'Rice, Dal, Chicken Curry, Roti, Salad',
  },
  Dinner: {
    time: '7:30 PM - 9:00 PM',
    deadline: '17:00',
    veg: 'Rice, Dal, Mix Veg, Roti',
    nonVeg: 'Rice, Dal, Egg Curry, Roti',
  },
};

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function MessManagement() {
  const [menu, setMenu] = useState(initialMenu);
  const [meal, setMeal] = useState('Breakfast');
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [confirmations, setConfirmations] = useState([]);
  const [confirmationError, setConfirmationError] = useState('');

  useEffect(() => {
    setConfirmations([]);
    setConfirmationError('');

    const unsubscribe = subscribeMealConfirmations(
      date,
      (data) => {
        setConfirmations(data);
        setConfirmationError('');
      },
      (err) => {
        setConfirmationError(
          err.message || 'Could not load meal confirmations.'
        );
      }
    );

    return () => unsubscribe();
  }, [date]);

  const mealConfirmations = confirmations.filter(
    (item) => item.meal === meal
  );

  const vegCount = mealConfirmations.filter(
    (item) => item.preference === 'Veg'
  ).length;

  const nonVegCount = mealConfirmations.filter(
    (item) => item.preference === 'Non-Veg'
  ).length;

  const totalCount = mealConfirmations.length;

  const updateField = (field, value) => {
    setMenu((previous) => ({
      ...previous,
      [meal]: {
        ...previous[meal],
        [field]: value,
      },
    }));

    setMessage('');
    setError('');
  };

  const publishMenu = async () => {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      await saveMealMenu({
        date,
        meal,
        ...menu[meal],
      });

      setMessage(`${meal} menu published successfully.`);
    } catch (err) {
      setError(err.message || 'Could not publish the menu.');
    } finally {
      setSaving(false);
    }
  };

  const current = menu[meal];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Mess Management</h2>
        <p className="mt-1 text-sm text-mu">
          Publish daily menus and manage meal confirmation deadlines.
        </p>
      </div>

      <div className="rounded-2xl border border-bd bg-card p-4">
        <label className="mb-2 block text-sm font-medium">
          Menu Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setMessage('');
          }}
          className="w-full rounded-xl border border-bd bg-bg p-3"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {Object.keys(menu).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => {
              setMeal(name);
              setMessage('');
              setError('');
            }}
            className={`rounded-xl p-3 font-semibold ${
              meal === name
                ? 'bg-blue-600 text-white'
                : 'bg-soft text-tx'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-bd bg-card p-4">
        <h3 className="text-lg font-semibold">
          {meal} Confirmations
        </h3>

        {confirmationError ? (
          <p className="mt-3 text-sm text-red-500">
            {confirmationError}
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-soft p-3">
              <p className="text-xs text-mu">Total</p>
              <p className="mt-1 text-2xl font-bold">{totalCount}</p>
            </div>

            <div className="rounded-xl bg-soft p-3">
              <p className="text-xs text-mu">Veg</p>
              <p className="mt-1 text-2xl font-bold">{vegCount}</p>
            </div>

            <div className="rounded-xl bg-soft p-3">
              <p className="text-xs text-mu">Non-Veg</p>
              <p className="mt-1 text-2xl font-bold">{nonVegCount}</p>
            </div>
          </div>
        )}

        <p className="mt-3 text-xs text-mu">
          Counts update automatically when students confirm or change
          their meal preference.
        </p>
      </div>

      <div className="rounded-2xl border border-bd bg-card p-4">
        <h3 className="text-lg font-semibold">{meal} Settings</h3>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Meal Timing
            </label>
            <input
              value={current.time}
              onChange={(e) => updateField('time', e.target.value)}
              className="w-full rounded-xl border border-bd bg-bg p-3"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Confirmation Deadline
            </label>
            <input
              type="time"
              value={current.deadline}
              onChange={(e) => updateField('deadline', e.target.value)}
              className="w-full rounded-xl border border-bd bg-bg p-3"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Veg Menu
            </label>
            <textarea
              rows={3}
              value={current.veg}
              onChange={(e) => updateField('veg', e.target.value)}
              className="w-full rounded-xl border border-bd bg-bg p-3"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Non-Veg Menu
            </label>
            <textarea
              rows={3}
              value={current.nonVeg}
              onChange={(e) => updateField('nonVeg', e.target.value)}
              className="w-full rounded-xl border border-bd bg-bg p-3"
            />
          </div>

          <button
            type="button"
            onClick={publishMenu}
            disabled={saving || !date}
            className="btn-pr w-full disabled:opacity-50"
          >
            {saving ? 'Publishing...' : 'Publish Menu'}
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

      <p className="text-xs text-mu">
        Published menus are saved in Firestore. Students can view
        the menu for the selected date.
      </p>
    </div>
  );
}