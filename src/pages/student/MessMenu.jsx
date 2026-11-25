import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
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
  const [tokenNumber, setTokenNumber] = useState(null);
  const [studentName, setStudentName] = useState('');
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
      setTokenNumber(null);
      setStudentName('');
      setConfirmed(false);
      setMessage('');
      setError('');

      if (selectedMeal === 'Breakfast') return;

      const user = auth?.currentUser;
      if (!user || !currentMenu) return;

      try {
        const id = `${date}_${selectedMeal.toLowerCase()}_${user.uid}`;
        const snapshot = await getDoc(doc(db, 'mealConfirmations', id));

        if (active && snapshot.exists()) {
          const data = snapshot.data();

          setPreference(data.preference || '');
          setTokenNumber(data.tokenNumber || null);
          setStudentName(
            data.studentName || user.displayName || user.email || 'Student'
          );
          setConfirmed(true);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Could not load your confirmation.');
        }
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
    setTokenNumber(null);
    setConfirmed(false);
    setMessage('');
    setError('');
  };

  const confirmMeal = async () => {
    if (!preference || !currentMenu || saving) return;

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const result = await saveMealConfirmation({
        date,
        meal: selectedMeal,
        preference,
      });

      setPreference(result?.preference || preference);
      setTokenNumber(result?.tokenNumber || null);
      setStudentName(
        auth?.currentUser?.displayName ||
        auth?.currentUser?.email ||
        'Student'
      );
      setConfirmed(true);

      setMessage(
        selectedMeal === 'Dinner' && preference === 'Non-Veg'
          ? 'Your Non-Veg dinner is confirmed. Download your token below.'
          : 'Your meal preference has been saved.'
      );
    } catch (err) {
      setError(err.message || 'Could not save your confirmation.');
    } finally {
      setSaving(false);
    }
  };

  const downloadToken = () => {
    if (!tokenNumber || !confirmed || preference !== 'Non-Veg') return;

    const pdf = new jsPDF();

    pdf.setFillColor(245, 247, 250);
    pdf.roundedRect(15, 15, 180, 115, 5, 5, 'F');

    pdf.setFontSize(19);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CAMPUSFIX AI', 105, 30, { align: 'center' });

    pdf.setFontSize(13);
    pdf.text('DINNER NON-VEG TOKEN', 105, 43, { align: 'center' });

    pdf.setDrawColor(230, 120, 40);
    pdf.roundedRect(65, 51, 80, 27, 4, 4);

    pdf.setFontSize(25);
    pdf.setTextColor(200, 95, 20);
    pdf.text(String(tokenNumber), 105, 70, { align: 'center' });

    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');

    pdf.text(`Student Name: ${studentName}`, 25, 91);
    pdf.text(`Student ID: ${auth?.currentUser?.uid || 'N/A'}`, 25, 101);
    pdf.text(`Meal: Dinner`, 25, 111);
    pdf.text(`Preference: Non-Veg`, 110, 111);
    pdf.text(`Date: ${date}`, 25, 121);

    pdf.setFontSize(9);
    pdf.text(
      'Show this confirmation token to mess staff. Staff will verify your name and code.',
      105,
      145,
      { align: 'center', maxWidth: 175 }
    );

    pdf.save(`Dinner-Token-${date}-${tokenNumber}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="page-title">Mess Menu</h2>
        <p className="mt-1 text-sm text-mu">
          Today's menu · {new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-soft p-1">
        {mealNames.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setSelectedMeal(name)}
            className={`tab ${selectedMeal === name ? 'tab-on' : ''}`}
          >
            {name === 'Breakfast' ? '🌅' : name === 'Lunch' ? '☀️' : '🌙'} {name}
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

          {selectedMeal === 'Breakfast' ? (
            <div className="mt-4 rounded-xl border border-emerald-500 p-4">
              <h3 className="text-emerald-600">Today's Breakfast</h3>
              <ul className="mt-2 list-disc pl-5">
                {parseItems(currentMenu.veg).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-mu">
                Breakfast preference selection is not required.
              </p>
            </div>
          ) : (
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
                  className={`mt-4 w-full ${preference === 'Veg' ? 'btn-pr !bg-emerald-600' : 'btn-gh'}`}
                >
                  {preference === 'Veg' ? '✓ Veg selected' : 'Select Veg'}
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
                  className={`mt-4 w-full ${preference === 'Non-Veg' ? 'btn-pr !bg-orange-600' : 'btn-gh'}`}
                >
                  {preference === 'Non-Veg' ? '✓ Non-Veg selected' : 'Select Non-Veg'}
                </button>
              </div>
            </div>
          )}

          {selectedMeal !== 'Breakfast' && (
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

              {selectedMeal === 'Dinner' &&
                confirmed &&
                preference === 'Non-Veg' &&
                tokenNumber && (
                  <div className="mt-4 rounded-xl border-2 border-orange-500 bg-card p-4 text-center">
                    <p className="text-sm font-semibold text-orange-600">
                      YOUR NON-VEG DINNER TOKEN
                    </p>

                    <p className="mt-2 text-4xl font-bold tracking-widest">
                      {tokenNumber}
                    </p>

                    <p className="mt-2 text-sm text-mu">
                      Student: {studentName}
                    </p>

                    <p className="mt-1 text-sm text-mu">
                      Date: {date}
                    </p>

                    <p className="mt-2 text-xs text-mu">
                      Show this token to mess staff. Your name and confirmation code will be checked against the staff list.
                    </p>

                    <button
                      type="button"
                      onClick={downloadToken}
                      className="btn-pr mt-4 w-full"
                    >
                      Download Token PDF
                    </button>
                  </div>
                )}
            </div>
          )}
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