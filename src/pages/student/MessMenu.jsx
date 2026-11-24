
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import {
  subscribeDailyMenu,
  saveMealConfirmation,
} from '../../services/mess';

const mealNames = ['Breakfast', 'Lunch', 'Dinner'];

const today = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseItems = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

export default function MessMenu() {
  const [selectedMeal, setSelectedMeal] = useState('Lunch');
  const [menus, setMenus] = useState([]);
  const [preference, setPreference] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const date = today();

  useEffect(() => {
    setLoading(true);

    const unsubscribe = subscribeDailyMenu(
      date,
      (items) => {
        setMenus(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Could not load the menu.');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [date]);

  const currentMenu = menus.find((item) => item.meal === selectedMeal);

  useEffect(() => {
    let active = true;

    async function loadConfirmation() {
      setPreference('');
      setConfirmed(false);
      setMessage('');

      const user = auth?.currentUser;
      if (!user || !currentMenu) return;

      try {
        const id = `${date}_${selectedMeal.toLowerCase()}_${user.uid}`;
        const snapshot = await getDoc(doc(db, 'mealConfirmations', id));

        if (active && snapshot.exists()) {
          setPreference(snapshot.data().preference || '');
          setConfirmed(true);
        }
      } catch (err) {
        if (active) setError(err.message || 'Could not load your confirmation.');
      }
    }

    loadConfirmation();

    return () => {
      active = false;
    };
  }, [date, selectedMeal, currentMenu]);

  const deadlinePassed = () => {
    if (!currentMenu?.deadline) return true;

    const deadline = new Date(`${date}T${currentMenu.deadline}:00`);
    return Number.isNaN(deadline.getTime()) || Date.now() >= deadline.getTime();
  };

  const choosePreference = (value) => {
    if (deadlinePassed()) {
      setMessage('The confirmation deadline has passed.');
      return;
    }

    setPreference(value);
    setConfirmed(false);
    setMessage('');
  };

  const confirmMeal = async () => {
    if (!preference || !currentMenu || saving) return;

    setSaving(true);
    setMessage('');
    setError('');

    try {
      await saveMealConfirmation({
        date,
        meal: selectedMeal,
        preference,
      });

      setConfirmed(true);
      setMessage('Your meal preference has been saved.');
    } catch (err) {
      setError(err.message || 'Could not save your confirmation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <h2>Mess Menu</h2>
        <p className="muted">
          Today's menu and meal confirmation.
        </p>
        <p className="mt-1 text-sm text-mu">{date}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {mealNames.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setSelectedMeal(name)}
            className={`rounded-xl p-3 font-semibold ${
              selectedMeal === name
                ? 'bg-blue-600 text-white'
                : 'bg-soft text-tx'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card">Loading today's menu...</div>
      ) : !currentMenu ? (
        <div className="card">
          <h3 className="font-semibold">Menu not published yet</h3>
          <p className="mt-2 text-sm text-mu">
            The mess administrator has not published today's {selectedMeal.toLowerCase()} menu.
          </p>
        </div>
      ) : (
        <div className="card">
          <h3>{selectedMeal} Menu</h3>
          <p className="muted text-sm">
            Meal timing: {currentMenu.time}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-500 p-4">
              <h3 className="text-emerald-600">Veg Menu</h3>
              <ul className="mt-2 list-disc pl-5">
                {parseItems(currentMenu.veg).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <button
                type="button"
                disabled={deadlinePassed() || saving}
                onClick={() => choosePreference('Veg')}
                className="btn-pr mt-4 w-full disabled:opacity-50"
              >
                Select Veg
              </button>
            </div>

            <div className="rounded-xl border border-orange-500 p-4">
              <h3 className="text-orange-600">Non-Veg Menu</h3>
              <ul className="mt-2 list-disc pl-5">
                {parseItems(currentMenu.nonVeg).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <button
                type="button"
                disabled={deadlinePassed() || saving}
                onClick={() => choosePreference('Non-Veg')}
                className="btn-pr mt-4 w-full disabled:opacity-50"
              >
                Select Non-Veg
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-soft p-3">
            <p className="font-medium">
              Confirmation deadline: {currentMenu.deadline}
            </p>

            {preference && (
              <p className="mt-2">
                Selected: <strong>{preference}</strong>
              </p>
            )}

            <button
              type="button"
              onClick={confirmMeal}
              disabled={!preference || saving || deadlinePassed()}
              className="btn-pr mt-3 w-full disabled:opacity-50"
            >
              {saving ? 'Saving...' : confirmed ? 'Update Confirmation' : 'Confirm Meal'}
            </button>

            {confirmed && (
              <p className="mt-3 text-sm font-medium text-emerald-600">
                Your preference is saved.
              </p>
            )}
          </div>
        </div>
      )}

      {message && <p className="text-sm text-emerald-600">{message}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      <p className="text-xs text-mu">
        A confirmation records your meal preference, not proof that you ate the meal.
      </p>
    </div>
  );
}
