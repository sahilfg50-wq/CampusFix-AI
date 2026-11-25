// Fills the LOCAL Firebase Emulators with demo data:
//   1. a demo student and a demo admin account
//   2. about 2 years of synthetic mess food reports (for the food waste analytics)
//
// Usage (with emulators running):  npm run seed
// Safe to run more than once: existing accounts are reused and existing food reports are never overwritten.
// It only talks to 127.0.0.1 and the demo-campusfix project.

import { generateDemoReports } from '../functions/src/demoFoodData.js';
import { addDays } from '../functions/src/foodForecast.js';

const PROJECT_ID = 'demo-campusfix';
const AUTH_URL = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const DB = `projects/${PROJECT_ID}/databases/(default)`;
const FIRESTORE_URL = `http://127.0.0.1:8080/v1/${DB}/documents`;
const OWNER = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }; // emulator-only rules bypass

const HOSTEL_STRENGTH = 800;
const HISTORY_DAYS = 760;

const USERS = [
  { email: 'student@campusfix.test', password: 'student123', name: 'Demo Student', role: 'student' },
  { email: 'admin@campusfix.test', password: 'admin123', name: 'Demo Admin', role: 'admin' },
];

// ---------- accounts ----------

async function post(path, body) {
  const res = await fetch(`${AUTH_URL}/${path}?key=demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function getOrCreateUid({ email, password }) {
  const created = await post('accounts:signUp', { email, password, returnSecureToken: true });
  if (created.localId) return created.localId;

  if (created.error?.message === 'EMAIL_EXISTS') {
    const signedIn = await post('accounts:signInWithPassword', { email, password, returnSecureToken: true });
    if (signedIn.localId) return signedIn.localId;
    throw new Error(`${email}: exists but password differs (${signedIn.error?.message})`);
  }

  throw new Error(`${email}: ${created.error?.message || 'unknown error'}`);
}

async function writeProfile(uid, { email, name, role }) {
  const res = await fetch(`${FIRESTORE_URL}/users/${uid}`, {
    method: 'PATCH',
    headers: OWNER,
    body: JSON.stringify({
      fields: {
        name: { stringValue: name },
        email: { stringValue: email },
        role: { stringValue: role },
        createdAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });
  if (!res.ok) throw new Error(`${email}: profile write failed (${res.status})`);
}

// ---------- food history ----------

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

function reportFields(r) {
  return {
    date: { stringValue: r.date },
    meal: { stringValue: r.meal },
    preparedKg: { doubleValue: r.preparedKg },
    servedMeals: { integerValue: String(r.servedMeals) },
    leftoverKg: { doubleValue: r.leftoverKg },
    wastedKg: { doubleValue: r.wastedKg },
    totalStudents: { integerValue: String(r.totalStudents) },
    updatedAt: { timestampValue: new Date().toISOString() },
    updatedBy: { stringValue: 'demo-seed' },
  };
}

async function seedFoodHistory() {
  const reports = generateDemoReports({
    from: addDays(today, -HISTORY_DAYS),
    to: addDays(today, -1),
    totalStudents: HOSTEL_STRENGTH,
  });

  let created = 0;
  let skipped = 0;
  for (let i = 0; i < reports.length; i += 400) {
    const writes = reports.slice(i, i + 400).map((r) => ({
      update: {
        name: `${DB}/documents/mealReports/${r.date}_${r.meal.toLowerCase()}`,
        fields: reportFields(r),
      },
      // Never overwrite a report that already exists (for example one entered by an admin).
      currentDocument: { exists: false },
    }));

    // batchWrite applies each write independently, so existing documents are just skipped.
    const res = await fetch(`http://127.0.0.1:8080/v1/${DB}/documents:batchWrite`, {
      method: 'POST',
      headers: OWNER,
      body: JSON.stringify({ writes }),
    });
    if (!res.ok) throw new Error(`Food history write failed (${res.status}): ${await res.text()}`);
    const body = await res.json();
    for (const status of body.status || []) {
      if (!status.code) created += 1;
      else skipped += 1;
    }
  }
  return { created, skipped, from: reports[0]?.date, to: reports.at(-1)?.date };
}

// ---------- mess menus, confirmations and dinner tokens ----------

const MENU_TIMES = {
  Breakfast: { time: '7:30 AM - 9:00 AM', deadline: '07:00' },
  Lunch: { time: '12:30 PM - 2:00 PM', deadline: '11:00' },
  Dinner: { time: '7:30 PM - 9:00 PM', deadline: '18:00' },
};

// One menu per weekday (0 = Sunday).
const WEEK_MENU = [
  { Breakfast: ['Aloo Paratha, Curd, Pickle, Tea', 'Egg Bhurji, Paratha, Tea'], Lunch: ['Chole Bhature, Jeera Rice, Salad, Gulab Jamun', 'Chicken Biryani, Raita, Salad, Gulab Jamun'], Dinner: ['Paneer Butter Masala, Naan, Dal Fry, Rice', 'Butter Chicken, Naan, Dal Fry, Rice'] },
  { Breakfast: ['Poha, Jalebi, Milk, Banana', 'Boiled Eggs, Bread Butter, Milk'], Lunch: ['Rajma, Rice, Roti, Salad', 'Rajma, Rice, Egg Curry, Roti'], Dinner: ['Mix Veg, Dal Tadka, Roti, Rice', 'Chicken Curry, Dal Tadka, Roti, Rice'] },
  { Breakfast: ['Idli, Sambar, Coconut Chutney, Coffee', 'Omelette, Toast, Coffee'], Lunch: ['Kadhi Pakoda, Rice, Aloo Gobi, Roti', 'Kadhi Pakoda, Rice, Fish Fry, Roti'], Dinner: ['Matar Paneer, Dal, Roti, Rice', 'Egg Curry, Dal, Roti, Rice'] },
  { Breakfast: ['Upma, Banana, Milk', 'Egg Sandwich, Milk'], Lunch: ['Dal Makhani, Jeera Rice, Bhindi, Roti', 'Dal Makhani, Jeera Rice, Chicken Kassa, Roti'], Dinner: ['Veg Pulao, Raita, Dal, Papad', 'Chicken Pulao, Raita, Dal, Papad'] },
  { Breakfast: ['Methi Thepla, Curd, Tea', 'Masala Omelette, Thepla, Tea'], Lunch: ['Sambar, Rice, Cabbage Poriyal, Rasam', 'Sambar, Rice, Egg Masala, Rasam'], Dinner: ['Kadai Paneer, Roti, Dal, Rice, Kheer', 'Kadai Chicken, Roti, Dal, Rice, Kheer'] },
  { Breakfast: ['Masala Dosa, Sambar, Chutney', 'Egg Dosa, Sambar, Chutney'], Lunch: ['Chana Masala, Rice, Roti, Salad', 'Chana Masala, Rice, Fish Curry, Roti'], Dinner: ['Veg Fried Rice, Manchurian, Soup', 'Chicken Fried Rice, Chilli Chicken, Soup'] },
  { Breakfast: ['Puri Bhaji, Tea', 'Egg Curry, Puri, Tea'], Lunch: ['Veg Biryani, Raita, Salad', 'Mutton Biryani, Raita, Salad'], Dinner: ['Aloo Matar, Dal, Roti, Rice, Halwa', 'Egg Bhurji, Dal, Roti, Rice, Halwa'] },
];

const DEMO_STUDENTS = [
  'Aarav Sharma', 'Ananya Gupta', 'Rohan Verma', 'Priya Singh', 'Karan Mehta', 'Sneha Patel', 'Vikram Rao',
  'Isha Nair', 'Aditya Joshi', 'Meera Iyer', 'Arjun Reddy', 'Kavya Menon', 'Rahul Yadav', 'Pooja Mishra',
  'Siddharth Jain', 'Neha Kapoor', 'Manish Tiwari', 'Riya Das', 'Harsh Agarwal', 'Tanvi Kulkarni',
  'Yash Chauhan', 'Divya Pillai', 'Nikhil Bansal', 'Shruti Saxena',
].map((name, i) => ({ uid: `demo-student-${String(i + 1).padStart(2, '0')}`, name }));

const ts = () => ({ timestampValue: new Date().toISOString() });
const str = (v) => ({ stringValue: v });
const doc = (path, fields) => ({
  update: { name: `${DB}/documents/${path}`, fields },
  currentDocument: { exists: false },
});

async function batchWrite(writes) {
  let created = 0;
  for (let i = 0; i < writes.length; i += 400) {
    const res = await fetch(`http://127.0.0.1:8080/v1/${DB}/documents:batchWrite`, {
      method: 'POST',
      headers: OWNER,
      body: JSON.stringify({ writes: writes.slice(i, i + 400) }),
    });
    if (!res.ok) throw new Error(`Write failed (${res.status}): ${await res.text()}`);
    const body = await res.json();
    created += (body.status || []).filter((s) => !s.code).length;
  }
  return created;
}

async function seedMess() {
  const writes = [];

  // Menus for today and the next 6 days.
  for (let d = 0; d < 7; d += 1) {
    const date = addDays(today, d);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    for (const meal of ['Breakfast', 'Lunch', 'Dinner']) {
      const [veg, nonVeg] = WEEK_MENU[weekday][meal];
      const { time, deadline } = MENU_TIMES[meal];
      writes.push(
        doc(`messMenu/${date}_${meal.toLowerCase()}`, {
          date: str(date),
          meal: str(meal),
          time: str(time),
          deadline: str(deadline),
          deadlineAt: { timestampValue: new Date(`${date}T${deadline}:00+05:30`).toISOString() },
          veg: str(veg),
          nonVeg: str(nonVeg),
          updatedAt: ts(),
          updatedBy: str('demo-seed'),
        })
      );
    }
  }

  // Demo student profiles (no login; they only appear in counts and the staff list).
  for (const s of DEMO_STUDENTS) {
    writes.push(
      doc(`users/${s.uid}`, {
        name: str(s.name),
        email: str(`${s.uid}@campusfix.test`),
        role: str('student'),
        createdAt: ts(),
      })
    );
  }

  // Today's lunch and dinner confirmations. Every 5th student skips, roughly 40% pick non-veg.
  let token = 0;
  DEMO_STUDENTS.forEach((s, i) => {
    if (i % 5 === 4) return;
    const lunchPref = i % 3 === 0 ? 'Non-Veg' : 'Veg';
    writes.push(
      doc(`mealConfirmations/${today}_lunch_${s.uid}`, {
        studentId: str(s.uid),
        date: str(today),
        meal: str('Lunch'),
        preference: str(lunchPref),
        updatedAt: ts(),
      })
    );

    const dinnerPref = i % 5 < 2 ? 'Non-Veg' : 'Veg';
    let tokenNumber = null;
    if (dinnerPref === 'Non-Veg') {
      token += 1;
      tokenNumber = String(token).padStart(3, '0');
      writes.push(
        doc(`mealTokens/${today}_${tokenNumber}`, {
          date: str(today),
          tokenNumber: str(tokenNumber),
          studentId: str(s.uid),
          studentName: str(s.name),
          meal: str('Dinner'),
          preference: str('Non-Veg'),
          status: str(i === 0 ? 'Served' : 'Pending'),
          createdAt: ts(),
        })
      );
    }
    writes.push(
      doc(`mealConfirmations/${today}_dinner_${s.uid}`, {
        studentId: str(s.uid),
        studentName: str(s.name),
        date: str(today),
        meal: str('Dinner'),
        preference: str(dinnerPref),
        tokenNumber: tokenNumber ? str(tokenNumber) : { nullValue: null },
        updatedAt: ts(),
      })
    );
  });
  writes.push(
    doc(`mealTokenCounters/${today}`, {
      lastNumber: { integerValue: String(token) },
      updatedAt: ts(),
    })
  );

  const created = await batchWrite(writes);
  return { created, total: writes.length, tokens: token };
}

// ---------- run ----------

try {
  for (const user of USERS) {
    const uid = await getOrCreateUid(user);
    await writeProfile(uid, user);
    console.log(`${user.role.padEnd(7)}  ${user.email}  /  ${user.password}`);
  }

  const food = await seedFoodHistory();
  console.log(
    `\nDemo food reports ${food.from} to ${food.to}: ${food.created} added, ${food.skipped} already existed.`
  );
  console.log('This food history is SYNTHETIC demo data for testing the analytics, not real mess records.');

  const mess = await seedMess();
  console.log(
    `Demo mess data: menus for ${today} + 6 days, ${DEMO_STUDENTS.length} demo students, today's confirmations and ${mess.tokens} non-veg dinner tokens (${mess.created}/${mess.total} new).`
  );
  console.log('\nDemo data ready. Open http://localhost:5173');
} catch (error) {
  if (error.cause?.code === 'ECONNREFUSED') {
    console.error('Emulators are not running. Start them first:');
    console.error('  firebase emulators:start --only auth,firestore,functions --project demo-campusfix');
  } else {
    console.error(error.message);
  }
  process.exit(1);
}
