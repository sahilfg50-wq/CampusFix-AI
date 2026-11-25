
import { useEffect, useState } from 'react';
import {
  saveMealMenu,
  subscribeMealConfirmations,
  lookupDinnerToken,
  markDinnerTokenServed,
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

  const [tokenInput, setTokenInput] = useState('');
  const [tokenDetails, setTokenDetails] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [serving, setServing] = useState(false);

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

  const dinnerNonVegConfirmations = confirmations
    .filter(
      (item) =>
        item.meal === 'Dinner' &&
        item.preference === 'Non-Veg' &&
        item.tokenNumber
    )
    .sort(
      (a, b) =>
        Number(a.tokenNumber) - Number(b.tokenNumber)
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

  const searchToken = async () => {
    if (!/^\d{3}$/.test(tokenInput)) {
      setTokenError('Enter a valid 3-digit token number.');
      setTokenDetails(null);
      return;
    }

    setTokenLoading(true);
    setTokenError('');
    setTokenDetails(null);

    try {
      const result = await lookupDinnerToken(date, tokenInput);
      setTokenDetails(result);
    } catch (err) {
      setTokenError(err.message || 'Could not find this token.');
    } finally {
      setTokenLoading(false);
    }
  };

  const verifyToken = async () => {
    if (!tokenDetails || serving) return;

    setServing(true);
    setTokenError('');

    try {
      const result = await markDinnerTokenServed(date, tokenInput);

      setTokenDetails((previous) => ({
        ...previous,
        status: result.status,
      }));

      setTokenError('');
    } catch (err) {
      setTokenError(err.message || 'Could not verify this token.');
    } finally {
      setServing(false);
    }
  };

  const printNonVegList = () => {
    window.print();
  };

  const current = menu[meal];

  return (
    <div className="space-y-5">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          #non-veg-print-list,
          #non-veg-print-list * {
            visibility: visible !important;
          }

          #non-veg-print-list {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 20px !important;
            color: #000 !important;
            background: #fff !important;
          }

          #non-veg-print-list table {
            width: 100%;
            border-collapse: collapse;
          }

          #non-veg-print-list th,
          #non-veg-print-list td {
            border: 1px solid #333;
            padding: 9px;
            text-align: left;
            color: #000 !important;
          }

          #non-veg-print-list th {
            background: #eee !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print">
        <h2 className="text-2xl font-bold">Mess Management</h2>
        <p className="mt-1 text-sm text-mu">
          Publish daily menus and manage meal confirmation deadlines.
        </p>
      </div>

      <div className="no-print rounded-2xl border border-bd bg-card p-4">
        <label className="mb-2 block text-sm font-medium">
          Menu Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setMessage('');
            setTokenDetails(null);
            setTokenInput('');
            setTokenError('');
          }}
          className="w-full rounded-xl border border-bd bg-bg p-3"
        />
      </div>

      <div className="rounded-2xl border border-orange-500 bg-card p-4 no-print">
        <h3 className="text-lg font-semibold">
          Dinner Token Verification
        </h3>
        <p className="mt-1 text-sm text-mu">
          Enter a student's 3-digit Non-Veg dinner token.
        </p>

        <div className="mt-4 flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            maxLength={3}
            value={tokenInput}
            onChange={(e) => {
              setTokenInput(e.target.value.replace(/\D/g, '').slice(0, 3));
              setTokenDetails(null);
              setTokenError('');
            }}
            placeholder="e.g. 025"
            className="min-w-0 flex-1 rounded-xl border border-bd bg-bg p-3 tracking-widest"
          />

          <button
            type="button"
            onClick={searchToken}
            disabled={tokenLoading || tokenInput.length !== 3}
            className="btn-pr px-5 disabled:opacity-50"
          >
            {tokenLoading ? 'Checking...' : 'Lookup'}
          </button>
        </div>

        {tokenError && (
          <p className="mt-3 text-sm text-red-500">{tokenError}</p>
        )}

        {tokenDetails && (
          <div className="mt-4 rounded-xl border border-bd bg-soft p-4">
            <p className="text-sm text-mu">Student Name</p>
            <p className="text-xl font-bold">
              {tokenDetails.studentName}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-mu">Token</p>
                <p className="font-semibold">{tokenDetails.tokenNumber}</p>
              </div>
              <div>
                <p className="text-xs text-mu">Preference</p>
                <p className="font-semibold">{tokenDetails.preference}</p>
              </div>
              <div>
                <p className="text-xs text-mu">Meal</p>
                <p className="font-semibold">{tokenDetails.meal}</p>
              </div>
              <div>
                <p className="text-xs text-mu">Status</p>
                <p className="font-semibold">{tokenDetails.status}</p>
              </div>
            </div>

            <p className="mt-3 text-xs text-mu">
              Cross-check the student's identity before marking the meal as served.
            </p>

            {tokenDetails.status === 'Pending' ? (
              <button
                type="button"
                onClick={verifyToken}
                disabled={serving}
                className="btn-pr mt-4 w-full disabled:opacity-50"
              >
                {serving ? 'Verifying...' : 'Confirm & Mark as Served'}
              </button>
            ) : (
              <p className="mt-4 text-sm font-semibold text-emerald-600">
                {tokenDetails.status === 'Served'
                  ? 'This token has already been served.'
                  : 'This token is not valid for serving.'}
              </p>
            )}
          </div>
        )}
      </div>

      <div
        id="non-veg-print-list"
        className="rounded-2xl border border-orange-500 bg-card p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">
              Non-Veg Dinner Confirmation List
            </h3>
            <p className="mt-1 text-sm text-mu">
              Date: {date}
            </p>
            <p className="mt-1 text-sm font-semibold">
              Total Confirmations: {dinnerNonVegConfirmations.length}
            </p>
          </div>

          <button
            type="button"
            onClick={printNonVegList}
            disabled={
              dinnerNonVegConfirmations.length === 0 ||
              Boolean(confirmationError)
            }
            className="btn-pr no-print disabled:opacity-50"
          >
            Print Non-Veg List
          </button>
        </div>

        {confirmationError ? (
          <p className="mt-4 text-sm text-red-500">
            {confirmationError}
          </p>
        ) : dinnerNonVegConfirmations.length === 0 ? (
          <p className="mt-4 rounded-xl bg-soft p-4 text-sm text-mu">
            No Non-Veg dinner confirmations found for this date.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="bg-soft">
                  <th className="border border-bd p-3 text-left">S.No.</th>
                  <th className="border border-bd p-3 text-left">Student Name</th>
                  <th className="border border-bd p-3 text-left">Student ID</th>
                  <th className="border border-bd p-3 text-left">Token Code</th>
                </tr>
              </thead>
              <tbody>
                {dinnerNonVegConfirmations.map((item, index) => (
                  <tr key={item.id || item.tokenNumber}>
                    <td className="border border-bd p-3">{index + 1}</td>
                    <td className="border border-bd p-3 font-medium">
                      {item.studentName || 'Name unavailable'}
                    </td>
                    <td className="border border-bd p-3">
                      {item.studentId || item.uid || 'N/A'}
                    </td>
                    <td className="border border-bd p-3 font-bold tracking-widest">
                      {String(item.tokenNumber).padStart(3, '0')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-xs text-mu">
          Staff should match both the student's name and token code before serving.
        </p>
      </div>

      <div className="no-print grid grid-cols-3 gap-2">
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

      <div className="no-print rounded-2xl border border-bd bg-card p-4">
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

      <div className="no-print rounded-2xl border border-bd bg-card p-4">
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

      <p className="no-print text-xs text-mu">
        Published menus are saved in Firestore. Students can view
        the menu for the selected date.
      </p>
    </div>
  );
}
