
import { useEffect, useRef, useState } from 'react';
import {
  saveMealMenu,
  subscribeDailyMenu,
  subscribeMealConfirmations,
  lookupDinnerToken,
  markDinnerTokenServed,
} from '../../services/mess';
import { formatTimeRange, parseTimeRange } from '../../utils/mealTime';

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

  // Menus already published in Firestore for the selected date, keyed by meal.
  const [published, setPublished] = useState({});
  // Meals the admin has edited but not yet published. Live updates never overwrite these.
  const dirty = useRef(new Set());

  useEffect(() => {
    dirty.current = new Set();
    setPublished({});
    setMenu(initialMenu);

    const unsubscribe = subscribeDailyMenu(
      date,
      (items) => {
        const byMeal = Object.fromEntries(items.map((item) => [item.meal, item]));
        setPublished(byMeal);
        setMenu((previous) => {
          const next = { ...previous };
          for (const name of Object.keys(initialMenu)) {
            const saved = byMeal[name];
            if (saved && !dirty.current.has(name)) {
              next[name] = {
                time: saved.time ?? initialMenu[name].time,
                deadline: saved.deadline ?? initialMenu[name].deadline,
                veg: saved.veg ?? '',
                nonVeg: saved.nonVeg ?? '',
              };
            }
          }
          return next;
        });
      },
      (err) => setError(err.message || 'Could not load published menus.')
    );

    return () => unsubscribe();
  }, [date]);

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
    dirty.current.add(meal);
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

      dirty.current.delete(meal);
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
  const timeRange = parseTimeRange(current.time);
  const publishedMenu = published[meal];
  const hasUnsavedChanges = dirty.current.has(meal);

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

      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="page-title">Mess Management</h2>
          <p className="mt-1 text-sm text-mu">Publish menus, watch confirmations and verify dinner tokens.</p>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-mu">Menu date</span>
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
            className="field !w-auto"
          />
        </label>
      </div>

      <div className="no-print grid grid-cols-3 gap-1 rounded-2xl bg-soft p-1">
        {Object.keys(menu).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => {
              setMeal(name);
              setMessage('');
              setError('');
            }}
            className={`tab ${meal === name ? 'tab-on' : ''}`}
          >
            {name === 'Breakfast' ? '🌅' : name === 'Lunch' ? '☀️' : '🌙'} {name}
            {published[name] && <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500" title="Published" />}
          </button>
        ))}
      </div>

      <div className="no-print grid gap-5 lg:grid-cols-[3fr_2fr]">
        <div className="panel">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="panel-title !mb-0">{meal} menu</h3>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                hasUnsavedChanges
                  ? 'bg-amber-100 text-amber-700'
                  : publishedMenu
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-soft text-mu'
              }`}
            >
              {hasUnsavedChanges ? 'Unsaved changes' : publishedMenu ? 'Published' : 'Not published yet'}
            </span>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Starts</span>
              <input
                type="time"
                value={timeRange.start}
                onChange={(e) => updateField('time', formatTimeRange(e.target.value, timeRange.end))}
                className="field"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Ends</span>
              <input
                type="time"
                value={timeRange.end}
                onChange={(e) => updateField('time', formatTimeRange(timeRange.start, e.target.value))}
                className="field"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Confirm by</span>
              <input
                type="time"
                value={current.deadline}
                onChange={(e) => updateField('deadline', e.target.value)}
                className="field"
              />
            </label>
          </div>
          <p className="mt-1.5 text-xs text-mu">Students will see: {current.time || 'not set'} · confirm before {current.deadline}</p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                <i className="h-2.5 w-2.5 rounded-sm border-2 border-emerald-600" /> Veg menu
              </span>
              <textarea rows={3} value={current.veg} onChange={(e) => updateField('veg', e.target.value)} className="field" />
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                <i className="h-2.5 w-2.5 rounded-sm border-2 border-rose-600" /> Non-veg menu
              </span>
              <textarea rows={3} value={current.nonVeg} onChange={(e) => updateField('nonVeg', e.target.value)} className="field" />
            </label>
          </div>
          <p className="mt-1 text-xs text-mu">Separate dishes with commas.</p>

          <button type="button" onClick={publishMenu} disabled={saving || !date} className="btn-pr mt-5 w-full">
            {saving ? 'Publishing…' : publishedMenu ? `Update ${meal} menu` : `Publish ${meal} menu`}
          </button>
          {message && <p className="mt-3 text-sm font-medium text-emerald-600">{message}</p>}
          {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
        </div>

        <div className="space-y-5">
          <div className="panel">
            <h3 className="panel-title">{meal} confirmations</h3>
            {confirmationError ? (
              <p className="text-sm text-rose-600">{confirmationError}</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['Total', totalCount, 'text-tx'],
                    ['Veg', vegCount, 'text-emerald-600'],
                    ['Non-Veg', nonVegCount, 'text-rose-600'],
                  ].map(([label, value, tone]) => (
                    <div key={label} className="rounded-xl bg-soft p-3">
                      <p className="text-xs text-mu">{label}</p>
                      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
                    </div>
                  ))}
                </div>
                {totalCount > 0 && (
                  <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-soft">
                    <div className="bg-emerald-500" style={{ width: `${(vegCount / totalCount) * 100}%` }} />
                    <div className="bg-rose-500" style={{ width: `${(nonVegCount / totalCount) * 100}%` }} />
                  </div>
                )}
              </>
            )}
            <p className="mt-3 text-xs text-mu">Updates live when students confirm or change.</p>
          </div>

          <div className="panel">
            <h3 className="panel-title">🎟️ Dinner token check</h3>
            <p className="-mt-2 text-xs text-mu">Enter the student's 3-digit non-veg dinner token.</p>
            <div className="mt-3 flex gap-2">
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
                placeholder="025"
                className="field min-w-0 flex-1 text-center text-lg font-bold tracking-[0.4em]"
              />
              <button type="button" onClick={searchToken} disabled={tokenLoading || tokenInput.length !== 3} className="btn-pr">
                {tokenLoading ? 'Checking…' : 'Lookup'}
              </button>
            </div>

            {tokenError && <p className="mt-3 text-sm text-rose-600">{tokenError}</p>}

            {tokenDetails && (
              <div className="mt-4 rounded-xl border border-bd bg-soft p-4">
                <p className="text-xs text-mu">Student</p>
                <p className="text-lg font-bold">{tokenDetails.studentName}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-mu">Token</p><p className="font-semibold">{tokenDetails.tokenNumber}</p></div>
                  <div><p className="text-xs text-mu">Status</p><p className="font-semibold">{tokenDetails.status}</p></div>
                </div>
                <p className="mt-3 text-xs text-mu">Check the student's ID card before serving.</p>
                {tokenDetails.status === 'Pending' ? (
                  <button type="button" onClick={verifyToken} disabled={serving} className="btn-pr mt-3 w-full">
                    {serving ? 'Verifying…' : 'Confirm & mark as served'}
                  </button>
                ) : (
                  <p className="mt-3 text-sm font-semibold text-emerald-600">
                    {tokenDetails.status === 'Served' ? 'Already served.' : 'This token is not valid for serving.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div id="non-veg-print-list" className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="panel-title !mb-0">Non-veg dinner list</h3>
            <p className="mt-1 text-sm text-mu">
              {date} · {dinnerNonVegConfirmations.length} confirmed
            </p>
          </div>
          <button
            type="button"
            onClick={printNonVegList}
            disabled={dinnerNonVegConfirmations.length === 0 || Boolean(confirmationError)}
            className="btn-gh no-print"
          >
            🖨️ Print list
          </button>
        </div>

        {confirmationError ? (
          <p className="mt-4 text-sm text-rose-600">{confirmationError}</p>
        ) : dinnerNonVegConfirmations.length === 0 ? (
          <p className="mt-4 rounded-xl bg-soft p-4 text-sm text-mu">No non-veg dinner confirmations for this date.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-mu">
                  <th className="p-3">#</th>
                  <th className="p-3">Student name</th>
                  <th className="p-3">Student ID</th>
                  <th className="p-3">Token</th>
                </tr>
              </thead>
              <tbody>
                {dinnerNonVegConfirmations.map((item, index) => (
                  <tr key={item.id || item.tokenNumber} className="border-t border-bd">
                    <td className="p-3">{index + 1}</td>
                    <td className="p-3 font-medium">{item.studentName || 'Name unavailable'}</td>
                    <td className="p-3 text-xs text-mu">{item.studentId || item.uid || 'N/A'}</td>
                    <td className="p-3 font-bold tracking-widest">{String(item.tokenNumber).padStart(3, '0')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-mu">Staff should match both the student's name and token before serving.</p>
      </div>
    </div>
  );
}
