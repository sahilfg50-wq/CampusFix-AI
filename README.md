# CampusFix AI (React + Vite + Tailwind + Firebase)

Students sign up, log in, file complaints and track them. Admins see all complaints and update their status.
Data is stored in **Cloud Firestore**; login uses **Firebase Authentication (email + password)**.

> **AI:** students can click **Analyse with AI**. A Firebase Cloud Function asks **Google Gemini** for a suggested category, priority, department, a short analysis and a suggested admin action. The student reviews it before submitting. If Gemini is unavailable, students choose manually and the old keyword rules (labelled "Simulated") set priority and department.

---

## Part A: One-time Firebase setup (in your browser)

Open https://console.firebase.google.com and open **your existing project**.

### 1. Turn on email/password login
1. Left menu → **Build → Authentication** → **Get started** (if shown).
2. Tab **Sign-in method** → click **Email/Password** → switch **Enable** on → **Save**.

### 2. Create the database
1. Left menu → **Build → Firestore Database** → **Create database**.
2. Choose a location near you (for India, `asia-south1` is a good choice). You cannot change it later.
3. Choose **Production mode** (locked) → **Create**. (We add safe rules in step 4.)

### 3. Get your web app settings
1. Click the **gear icon ⚙ → Project settings**.
2. Scroll to **Your apps**. If there is no web app, click the **`</>`** icon, give it a name (for example `campusfix-web`) and click **Register app**. (Skip the hosting checkbox.)
3. You will see a block called `firebaseConfig` with `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`. Keep this page open.

### 4. Publish the security rules
1. **Firestore Database → Rules** tab.
2. Delete everything in the editor.
3. Open the file `firestore.rules` from this project (Notepad is fine), copy **all** of it and paste it into the editor.
4. Click **Publish**.

---

## Part B: Run the app on Windows 11

1. Install **Node.js LTS** from https://nodejs.org (one time). Check with `node -v` in Command Prompt.
2. Extract the ZIP, open the `campusfix-ai` folder, click the address bar, type `cmd`, press Enter.
3. Create your settings file:
   ```
   copy .env.example .env.local
   notepad .env.local
   ```
   Replace each `your-...` value with the matching value from Firebase's `firebaseConfig`
   (`apiKey` → `VITE_FIREBASE_API_KEY`, `authDomain` → `VITE_FIREBASE_AUTH_DOMAIN`, and so on). **No quotes, no spaces.** Save and close Notepad.
4. Install packages (one time, needs internet):
   ```
   npm install
   ```
5. Start the app:
   ```
   npm run dev
   ```
6. Open http://localhost:5173. Press **Ctrl + C** to stop.

> If you change `.env.local` later, stop the app (Ctrl + C) and run `npm run dev` again.
> `.env.local` is ignored by git on purpose. Do not share it casually. The values are web settings (not secret keys), and your data is protected by the rules, but keep it tidy.

---

## Part C: Make yourself an admin (one time)

For safety, nobody can make themselves admin from the app. You do it by hand:

1. In the app, **Sign up** with your own email (this creates a *student* account).
2. In Firebase Console → **Firestore Database → Data** → open the **`users`** collection.
3. Click the document that has your email. Find the field **`role`**, click it, change `student` to `admin`, and click **Update**.
4. Go back to the app. It switches to the **Admin console** by itself (or refresh the page).

---

## Part D: Test checklist

1. **Student A:** sign up → dashboard shows "No complaints yet" (empty state).
2. Submit a complaint, for example title `Sparks from socket`, description `possible fire hazard in the lab`. Confirm. You get an ID like `CFX-2026-K7Q2M9` and priority **Critical** (simulated).
3. In Firebase Console → Firestore → `complaints` you should see the new document (its ID equals the complaint ID).
4. **Sign out, sign up Student B.** Student B must see **no** complaints. In *Track complaint*, pasting Student A's ID must say "No ticket found".
5. **Admin:** sign up a third account, make it admin (Part C), log in. *All complaints* shows Student A's complaint.
6. Open it → change Status to **In Progress** or **Resolved**, add a note → **Update complaint**.
7. Log in as Student A → *Track complaint* → the new status and the note appear in the timeline.
8. **Test the rules (recommended):** Firestore → **Rules** tab → **Rules Playground**. Try:
   - Simulation type `get`, path `/databases/(default)/documents/complaints/<A's complaint ID>`, **Authenticated** on, with Student B's UID → should be **Denied**.
   - Simulation type `update` on the same path with Student A's UID → should be **Denied** (students can never update).
   - Same `update` as the admin's UID changing only `status` → should be **Allowed** (the playground may ask you to provide the new data).

---

## What is stored in Firestore

**`users/{uid}`**: `name`, `email`, `role` (`student` or `admin`), `createdAt`, optional `phone`, `residence`

**`complaints/{complaintId}`**: `complaintId`, `title`, `description`, `category`, `building`, `location`, `priority`, `status`, `department`, `reporter`, `studentId`, `studentEmail`, `aiNote`, `sla`, `updates` (timeline list), `createdAt`, `updatedAt`

## Security rules in plain words (`firestore.rules`)

- Everything is **closed by default**. Nobody can read or write without logging in.
- A student can read **only complaints where `studentId` is their own user ID**.
- A student can create a complaint only for themselves, and only with status `Pending` and valid values. They can **never edit or delete** a complaint.
- Only an **admin** (`role == 'admin'` in their `users` document) can read all complaints and change `status`, `priority`, `department`, `updates` and `updatedAt`. Nothing else.
- Nobody can change their own `role`. Users can edit only `name`, `phone`, `residence` on their own profile.
- No service-account key or admin credentials are used anywhere in this frontend.

### Honest limits
- **Priority at creation** is chosen by the simulated triage in the browser. A technically skilled student could submit a different valid priority. Admins can correct it. Stopping this completely needs a backend (Cloud Functions), which is not included.
- No email verification and no password reset page yet.
- Timeline entry times are the browser's clock; `createdAt`/`updatedAt` use the server clock.

## Troubleshooting

| Message / problem | Fix |
|---|---|
| "Firebase is not connected yet" | `.env.local` missing or still has `your-...` values. Fill it and restart `npm run dev`. |
| "Email/password sign-in is turned off" | Part A, step 1. |
| "Firestore refused this request" | Rules not published (Part A, step 4), or the account has the wrong role. |
| "Could not load your account" | Same as above, or no internet. Click Sign out and try again. |
| Cannot log in as admin | Check `role` is exactly `admin` (lowercase) in the right user's document. |
| PowerShell blocks `npm` | Use **Command Prompt (cmd)** instead. |

## Project structure (new parts)

```
.env.example            template for .env.local
firestore.rules         security rules (paste into Firebase Console)
src/lib/firebase.js     Firebase initialisation (reads .env.local)
src/lib/errors.js       friendly error messages
src/context/AuthContext.jsx   login, signup, role
src/services/complaints.js    Firestore read/write
src/hooks/useComplaints.js    live complaint list + loading/error
src/pages/auth/AuthPage.jsx   login / signup screen
```
All other files are the same UI components and pages as before.

## Testing status (honest note)

I could not connect to the internet, so this was **not** tested against real Firebase, **not** built with Vite/Tailwind, and the **security rules were not run** (please use the Rules Playground in step 8).
What *was* checked: the React code was bundled with esbuild and run in headless Chromium against an in-memory **fake** Firebase (signup, login, role switch, saving and reading complaints, privacy between two students, admin update, profile save, error and retry states): 20 checks passed with no console errors. That test used React 19 and no Tailwind CSS.

---

# Gemini AI (Cloud Functions) setup, Windows PowerShell

## What was added
- `functions/`: Cloud Function **`analyzeComplaint`** (2nd gen, Node 22) that calls Gemini with the official **Google Gen AI SDK** (`@google/genai`).
- `firebase.json`: tells the Firebase CLI about `functions/` and your existing `firestore.rules`.
- Frontend: **Analyse with AI** button and a review card on the Submit page; `src/services/ai.js`, `src/components/ui/AiSuggestion.jsx`, `src/utils/aiNote.js`; small label changes so Gemini results say "Gemini AI" and rule-based ones still say "Simulated".
- **`firestore.rules` is NOT changed.** The suggested admin action is stored inside the existing `aiNote` field (max 300 characters, already allowed). Gemini's values are limited to the same lists the rules already accept.

## Do I have to upgrade Firebase billing? YES
Deploying Cloud Functions requires the **Blaze (pay-as-you-go)** plan. Storing the key in **Secret Manager** (Firebase Functions Secrets) is also Blaze-only. The free **Spark** plan cannot deploy functions.
- Blaze still includes a free monthly allowance for Functions, so a small student project usually costs very little, but **it needs a card on file** and you are billed if you go over.
- Gemini API usage is billed separately by Google according to its pricing and free-tier limits; check https://ai.google.dev/pricing.
- Protect yourself: after upgrading, set a **budget alert** (Google Cloud Console → Billing → Budgets & alerts, for example 5 USD). The function also limits each user to 1 request per 3 seconds and 30 per day, and runs at most 5 instances.
- No card yet? You can still use the whole app. Manual selection and the simulated rules keep working; only "Analyse with AI" will say it is not available.

## Step-by-step (PowerShell)

**1. Upgrade to Blaze.** Firebase Console → bottom-left **Upgrade** (or ⚙ → Usage and billing) → choose **Blaze** → connect a billing account. Then set the budget alert described above.

**2. Get a Gemini API key.** Open https://aistudio.google.com/apikey → **Create API key** → copy it. Keep it private. **Never paste it into any file in this project.**

**3. Install the Firebase CLI** (one time). Open **Windows PowerShell**:
```
npm install -g firebase-tools
firebase --version
```
If PowerShell says *"running scripts is disabled on this system"*, run this once, answer `Y`, then repeat the command:
```
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

**4. Log in to Firebase** (a browser window opens):
```
firebase login
```

**5. Go to the project folder and choose your Firebase project:**
```
cd C:\Projects\campusfix-ai
firebase use --add
```
Use the arrow keys to pick your project, type `default` as the alias, press Enter.

**6. Install the function's packages:**
```
cd functions
npm install
cd ..
```

**7. Save the Gemini key as a secret** (it is stored in Google Secret Manager, not in your files):
```
firebase functions:secrets:set GEMINI_API_KEY
```
Paste the key when asked (nothing is shown while you paste) and press Enter. If it asks to enable the Secret Manager API, answer `Y`.

**8. Deploy the function:**
```
firebase deploy --only functions
```
The first deploy can take several minutes. If it asks to enable APIs (Cloud Build, Artifact Registry, Cloud Run, and so on), answer `Y`. If it asks how many days to keep old container images, type `1`. When it finishes you will see `analyzeComplaint(us-central1)` listed.

**9. Tell the website where the function is.** Open `.env.local` and make sure this line exists (add it if not):
```
VITE_FIREBASE_FUNCTIONS_REGION=us-central1
```
Stop the website (Ctrl + C) and start it again with `npm run dev`.

**10. Rules:** nothing to do. `firestore.rules` is unchanged. (If you never published it, do Part A step 4 above.)

## Test it
1. Log in as a student → **Submit complaint**.
2. Click **Analyse with AI** with the fields empty. You should see red messages and no AI call.
3. Title `Sparks from socket`, description `possible fire hazard in the lab` → **Analyse with AI**. After a few seconds a **Gemini AI suggestion** card shows category, priority (expect *Critical*), department, analysis and suggested action. The form has **not** changed yet.
4. Click **Use these suggestions** → category is filled in. Fill the location → **Submit complaint** → confirm. In Firestore → `complaints`, the document should have `aiNote` starting with `Gemini analysis:`.
5. Log in as admin → open that complaint → you see **Gemini AI analysis** and **Suggested action**. The student's tracking page shows the analysis only.
6. **Fallback test:** temporarily turn off your internet, or run `firebase functions:delete analyzeComplaint`, click **Analyse with AI** → "AI suggestions are not available right now" appears, and you can still choose the category yourself and submit.
7. **Key safety check:** in the browser press **F12 → Network**, click Analyse. The request goes to `cloudfunctions.net/analyzeComplaint` and contains only `title` and `description`. Searching the project folder for your key finds nothing.
8. To read function logs: `firebase functions:log`.

## Changing the Gemini model
The default model name is set in `functions/index.js` (`gemini-3.5-flash-lite`). Google retires models over time (sources I read disagreed about the older 2.5 models). If you see "AI service is not set up correctly", check https://ai.google.dev/gemini-api/docs/models, then create a file `functions/.env` containing, for example:
```
GEMINI_MODEL=gemini-3.6-flash
```
and run `firebase deploy --only functions` again.

## Security: what the AI can and cannot do
- The Gemini key exists only in Secret Manager and in the function's memory. It is not in the website code, not in `VITE_` variables, not in git, and never sent to the browser.
- Only **logged-in** users can call the function (Firebase checks the login token). Input is validated (title 5-120, description 15-2000 characters, text only) and rate-limited per user.
- The function **returns suggestions only**. It does not write complaints and cannot change roles. The only thing it writes is a usage counter in `aiUsage/{uid}` (using the Admin SDK on the server; browsers cannot access that collection because the rules deny everything not listed).
- Gemini's answer is validated again on the server (and again in the browser): category, priority and department must be in the allowed lists, extra fields such as `role` are discarded, text is shortened to fit the rule limits.
- The student's complaint is still saved by the browser **under your existing Firestore rules**, so the AI cannot bypass them.
- Complaint text is sent to Google's Gemini API, so tell students not to include passwords or very private data.

### Honest limits
- AI output is a suggestion, not a security control. A technically skilled student could still send other *valid* values (category, priority, department) straight to Firestore, exactly as before. Admins review and can change them. Fully preventing this needs a backend that creates complaints itself.
- Complaint text could try to trick the AI (prompt injection). The prompt tells the model to ignore such instructions and the output is restricted to fixed lists, but it can still mis-rate a complaint. Admins should check priorities.
- Optional hardening not included: Firebase **App Check**.

## Files changed or added in this version
New: `firebase.json`, `functions/` (index.js, package.json, src/*, test/analyze.test.js), `src/services/ai.js`, `src/components/ui/AiSuggestion.jsx`, `src/utils/aiNote.js`
Modified: `.env.example`, `.gitignore`, `README.md`, `src/lib/firebase.js`, `src/lib/errors.js`, `src/App.jsx`, `src/services/complaints.js`, `src/components/ui/Badges.jsx`, `src/pages/student/SubmitComplaint.jsx`, `src/pages/student/ComplaintTracking.jsx`, `src/pages/admin/AdminComplaintDetails.jsx`
Unchanged: `firestore.rules` and everything else.

## Testing status for the Gemini part (honest note)
No internet here, so I did **not** deploy, did **not** call the real Gemini API or real Firebase, and did **not** run `npm install` for `functions/` or a Vite/Tailwind build.
What was run: (1) 10 unit tests of the function logic (`cd functions` then `npm test`, needs only Node 22): validation, login check, rate-limit handling, answer validation and repair, prompt-injection fields, error mapping; (2) 18 browser checks of the new frontend flow against an in-memory fake Firebase and a fake function (review card, accept, failure fallback, stale suggestion, invalid answer, not-deployed message, admin/student views), no console errors. The Google Gen AI SDK call (`functions/src/gemini.js`) and Firebase secret wiring (`functions/index.js`) were only syntax-checked. The package versions (`@google/genai ^1`, `firebase-functions ^6`, `firebase-admin ^13`) and model name should be confirmed on your first deploy.
