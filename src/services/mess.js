import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

import { auth, db } from '../lib/firebase';

function requireUser() {
  const user = auth?.currentUser;

  if (!user) {
    throw new Error('Please log in first.');
  }

  return user;
}

function menuId(date, meal) {
  return `${date}_${meal.toLowerCase()}`;
}

function confirmationId(date, meal, uid) {
  return `${date}_${meal.toLowerCase()}_${uid}`;
}

// ---------- MENU ----------

// Admin: save or update a meal menu.
export async function saveMealMenu({
  date,
  meal,
  time,
  deadline,
  veg,
  nonVeg,
}) {
  requireUser();

  if (!date || !meal || !time || !deadline) {
    throw new Error('Date, meal timing and deadline are required.');
  }

  if (!['Breakfast', 'Lunch', 'Dinner'].includes(meal)) {
    throw new Error('Invalid meal type.');
  }

  const deadlineDate = new Date(`${date}T${deadline}:00`);

if (Number.isNaN(deadlineDate.getTime())) {
  throw new Error('Invalid meal deadline.');
}

const deadlineAt = Timestamp.fromDate(deadlineDate);
const id = menuId(date, meal);

  await setDoc(
    doc(db, 'messMenu', id),
    {
      date,
      meal,
      time,
      deadline,
      deadlineAt,
      veg,
      nonVeg,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser.uid,
    },
    { merge: true }
  );

  return id;
}

// Listen to a day's menu.
export function subscribeDailyMenu(date, onData, onError) {
  const q = query(
    collection(db, 'messMenu'),
    where('date', '==', date)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })));
    },
    onError
  );
}

// ---------- STUDENT CONFIRMATIONS ----------

// Student: save or change their meal preference.
export async function saveMealConfirmation({
  date,
  meal,
  preference,
}) {
  const user = requireUser();

  if (!['Breakfast', 'Lunch', 'Dinner'].includes(meal)) {
    throw new Error('Invalid meal type.');
  }

  if (!['Veg', 'Non-Veg'].includes(preference)) {
    throw new Error('Choose Veg or Non-Veg.');
  }

  // Dinner preferences are handled by secure Cloud Functions.
  if (meal === 'Dinner') {
    if (!functions) {
      throw new Error('Firebase Functions are not configured.');
    }

    const call = httpsCallable(functions, 'confirmDinnerPreference');
    const result = await call({ date, preference });
    return result.data;
  }

  // Existing Breakfast and Lunch confirmation flow.
  const id = menuId(date, meal);
  const menuRef = doc(db, 'messMenu', id);
  const menuSnapshot = await getDoc(menuRef);

  if (!menuSnapshot.exists()) {
    throw new Error('The menu has not been published yet.');
  }

  const menu = menuSnapshot.data();
  const deadlineAt = menu.deadlineAt?.toDate();

  if (!deadlineAt || Number.isNaN(deadlineAt.getTime())) {
    throw new Error('The meal deadline is invalid. Please ask admin to republish the menu.');
  }

  if (Date.now() >= deadlineAt.getTime()) {
    throw new Error('The confirmation deadline has passed.');
  }

  const confirmationRef = doc(
    db,
    'mealConfirmations',
    confirmationId(date, meal, user.uid)
  );

  await setDoc(
    confirmationRef,
    {
      studentId: user.uid,
      date,
      meal,
      preference,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return { preference, tokenNumber: null };
}

// Admin: look up a dinner token.
export async function lookupDinnerToken(date, tokenNumber) {
  requireUser();

  const call = httpsCallable(functions, 'lookupDinnerToken');
  const result = await call({ date, tokenNumber });

  return result.data;
}

// Admin: mark a dinner token as served.
export async function markDinnerTokenServed(date, tokenNumber) {
  requireUser();

  const call = httpsCallable(functions, 'markDinnerTokenServed');
  const result = await call({ date, tokenNumber });

  return result.data;
}
// Admin: listen to confirmations for a date.
export function subscribeMealConfirmations(date, onData, onError) {
  const q = query(
    collection(db, 'mealConfirmations'),
    where('date', '==', date)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })));
    },
    onError
  );
}

// ---------- FOOD REPORTS ----------

// Admin: save actual food preparation and wastage report.
export async function saveFoodReport({
  date,
  meal,
  preparedKg,
  servedMeals,
  leftoverKg,
}) {
  const user = requireUser();

  const values = [preparedKg, servedMeals, leftoverKg];

  if (!date || !['Breakfast', 'Lunch', 'Dinner'].includes(meal)) {
    throw new Error('Valid date and meal are required.');
  }

  if (
    values.some((value) => !Number.isFinite(Number(value)) || Number(value) < 0)
  ) {
    throw new Error('Report quantities must be non-negative numbers.');
  }

  const id = menuId(date, meal);

  await setDoc(
    doc(db, 'mealReports', id),
    {
      date,
      meal,
      preparedKg: Number(preparedKg),
      servedMeals: Number(servedMeals),
      leftoverKg: Number(leftoverKg),
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    },
    { merge: true }
  );

  return id;
}

// Admin: listen to food reports for a date.
export function subscribeFoodReports(date, onData, onError) {
  const q = query(
    collection(db, 'mealReports'),
    where('date', '==', date)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })));
    },
    onError
  );
}
