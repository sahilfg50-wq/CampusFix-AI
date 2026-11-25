# CampusFix AI

### Smart Campus Complaint Management & Food Waste Monitoring System

CampusFix AI is an AI-assisted campus management platform designed to simplify student complaint handling, improve administrative response, and monitor hostel mess food waste.

It provides separate portals for students and administrators, with complaint tracking, AI-assisted workflows, mess menu management, meal confirmations, and food waste reporting.

## Key Features

### 1. Student Portal
- Student registration and login
- Submit campus complaints
- Track complaint status and updates
- View complaint history
- View published mess menus
- Confirm meal preferences

### 2. Admin Portal
- View and manage student complaints
- Update complaint status and add administrative notes
- View complaint analytics
- Publish and manage mess menus
- View student meal confirmations
- Monitor food preparation, meals served, and leftover food

### 3. AI-Assisted Complaint Analysis
- Suggest complaint category and priority
- Recommend the responsible department
- Generate a short complaint analysis
- Suggest administrative actions
- Manual fallback when Gemini AI is unavailable

### 4. Autonomous AI Agent
Every new complaint is routed automatically:

| Complaint type | What the agent does |
|---|---|
| Software / account (Wi-Fi, login, password, email, printer, apps) | Sends the student step-by-step fix instructions. The student answers "fixed" (closed) or "still broken" (emailed to the department with the steps already tried). |
| Campus portal outage | Checks the portal, runs a recovery action and verifies it independently (simulated in the demo). |
| Physical repair (electrical, plumbing, furniture, cleaning, mess) | Emails the responsible department, cc admin, and marks it In Progress. |
| Danger (fire, sparks, shock, harassment, security) | Raised to Critical and emailed to the department and admin immediately. |
| Unclear | Referred to the admin. |

- Routing rules run first. The AI can only make a complaint more escalated, never less.
- Admins see everything in the **AI Inbox**: referred complaints and every email the agent sent.
- Emails go out free through Gmail (App Password). Without SMTP settings they are recorded as "simulated".
- Department email addresses are in `functions/src/departments.js` (demo addresses by default).

**Demo limitation:** Portal recovery is simulated. It does not control or restart a real college portal or infrastructure.

### 5. Mess Management
- Admins can publish daily meal menus.
- Students can view available meals.
- Students can confirm meal preferences.
- Admins can view confirmation counts.

### 6. Food Waste Dashboard
- **Daily Report:** prepared kg, meals served, leftover kg, thrown-away kg and hostel strength (to count skipped meals).
- **Analytics:** last 7 days, 30 days, 12 months, 2 years or all time. Prepared vs consumed vs wasted, students skipping, cost of waste, breakdown by meal, weekday and campus event (festivals, breaks, exams).
- **AI Analysis ("Analyze Wastage"):** pick a date (for example Navratri). It forecasts how many students will eat and skip each meal and how many kg to cook, using the same festival in earlier years.
  - The quantities are calculated by formula (median of comparable days × festival effect from earlier years + 5% buffer). The AI only explains them, so it cannot invent a quantity.
  - Festival dates are in `functions/src/festivals.js` (approximate demo dates; replace with the college calendar).

Meal confirmations represent expected demand, not verified actual consumption.

### 7. Free AI options
All AI features work without paying anything:
1. **Gemini free tier:** free key from Google AI Studio.
2. **Ollama:** free AI that runs on your own computer, no key or account (local demo only).
3. **No AI:** built-in rule-based logic (troubleshooting guides, routing rules, forecast formulas). This is the default.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite |
| Styling | Tailwind CSS |
| Backend | Firebase Cloud Functions |
| Authentication | Firebase Authentication |
| Database | Cloud Firestore |
| AI Integration | Google Gemini API |
| Server SDK | Firebase Admin SDK |
| AI SDK | Google Gen AI SDK |
| Testing | Node.js built-in test runner |

## Project Structure

```text
CampusFix-AI/
├── functions/
│   ├── src/
│   │   ├── agent.js               # portal recovery agent
│   │   ├── agentGemini.js
│   │   ├── agentTools.js
│   │   ├── agentValidation.js
│   │   ├── analyze.js             # complaint triage (category/priority)
│   │   ├── complaintRouter.js     # self-help / department / emergency / admin routing
│   │   ├── constants.js
│   │   ├── demoFoodData.js        # synthetic food history for the demo
│   │   ├── departments.js         # department email addresses
│   │   ├── festivals.js           # campus calendar used by the forecast
│   │   ├── firestoreAgentTools.js
│   │   ├── foodAi.js              # "Analyze Wastage"
│   │   ├── foodForecast.js        # food statistics and demand forecast
│   │   ├── gemini.js
│   │   ├── llm.js                 # Gemini / Ollama / none
│   │   ├── mailer.js              # Gmail SMTP + outbox
│   │   └── rateLimit.js
│   ├── test/
│   ├── .env.example
│   └── index.js
├── scripts/
│   └── seed-emulator.mjs
├── src/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   ├── services/
│   └── utils/
├── firestore.rules
├── firebase.json
├── .env.example
├── package.json
└── README.md
```

## Local Demo Setup (Windows)

### Requirements
- Node.js 22 or newer
- npm
- Java 11 or newer (required by the Firestore emulator)
- Firebase CLI (`npm install -g firebase-tools`)
- Git

For PowerShell environments that block npm scripts, use `npm.cmd` and `firebase.cmd` instead of `npm` and `firebase`.

### 1. Clone the repository

```powershell
git clone https://github.com/sahilfg50-wq/CampusFix-AI.git
cd CampusFix-AI
```

### 2. Install dependencies

Install both the frontend and the Cloud Functions dependencies. The Functions emulator cannot load the backend without them.

```powershell
npm install
cd functions
npm install
cd ..
```

### 3. Create the local config files

```powershell
copy .env.example .env.local
copy functions\.env.example functions\.env.local
```

The default values connect the app to the local emulators with the `demo-campusfix` project, so no real Firebase project or API key is needed. Without `functions\.env.local`, the Functions emulator stops at a prompt asking for `GEMINI_MODEL`.

### 4. Start Firebase Emulators

Open a separate PowerShell terminal in the project directory:

```powershell
firebase emulators:start --only auth,firestore,functions --project demo-campusfix
```

Wait for `All emulators ready!` and keep this terminal running.

### 5. Load demo data

In another terminal:

```powershell
npm run seed
```

This fills the emulator with **synthetic demo data** (not real campus records):
- about 2 years of mess food reports with Navratri, Diwali, Holi, exam and vacation patterns, for the analytics and AI forecast
- mess menus for today and the next 6 days
- 24 demo students with today's lunch/dinner confirmations and non-veg dinner tokens
- two login accounts:

| Role | Email | Password |
|---|---|---|
| Student | student@campusfix.test | student123 |
| Admin | admin@campusfix.test | admin123 |

The login page shows one-click buttons for these accounts in emulator mode. Emulator data is cleared when the emulators stop, so run this again after every restart. Existing data is never overwritten. New users who sign up through the app always get the `student` role. To make another user an admin, open the Emulator UI → Firestore → `users/{uid}` and set `role` to `admin`.

### 6. Start the frontend

```powershell
npm run dev
```

Open http://localhost:5173 and log in with one of the demo accounts.

### 7. Run backend tests

```powershell
cd functions
npm test
```

### 8. Build the frontend

From the project root:

```powershell
npm run build
```

## Firebase Emulator Services

| Service | Local URL |
|---|---|
| Frontend | http://localhost:5173 |
| Emulator UI | http://127.0.0.1:4000 |
| Authentication | http://127.0.0.1:9099 |
| Firestore | http://127.0.0.1:8080 |
| Functions | http://127.0.0.1:5001 |

The local demo uses Firebase Emulators. Demo data resets when the emulators restart unless persistence is configured.

## Security

- Firestore rules restrict access to authenticated users.
- Students can access their own complaints.
- Admin permissions are checked through user roles.
- Students cannot assign themselves admin privileges.
- Backend complaint processing validates ownership and complaint state.
- Agent actions are restricted through action validation.
- Gemini API credentials are handled through Firebase Functions secrets for production configuration.
- Local demo mode does not require a Gemini API key for its simulated agent workflow.

Never commit `.env.local`, private keys, passwords, or API credentials to GitHub.

## Testing and Verification

The following were tested in the local prototype:

- Student signup and login
- Complaint submission and tracking
- Admin complaint management
- Simulated AI Agent portal recovery
- Admin analytics
- Mess menu publishing
- Student meal confirmation
- Food waste report saving and reloading
- Backend unit tests
- Frontend production build

The local demo was tested using Firebase Emulators. Production Firebase deployment and live Gemini API integration have not been verified.

## Planned Features & Future Enhancements

- Advanced analytics with 7-day, 30-day, 12-month, 2-year, and all-time data filters.
- AI-powered food waste analysis using historical preparation, consumption, and wastage data.
- Predictive food demand forecasting for breakfast, lunch, and dinner.
- Smart food preparation recommendations based on historical trends and student demand.
- Festival and holiday-based food consumption analysis.
- Estimated cost savings through reduced food waste and unnecessary food preparation.
- Automatic email notifications to relevant departments based on complaint categories.
- Improved complaint escalation and administrative workflows.

## Current Limitations

- Autonomous portal recovery is simulated and does not affect real campus infrastructure.
- Live Gemini functionality requires API configuration and deployment.
- Meal confirmations indicate expected demand, not actual food consumption.
- Production deployment and real-world integration require additional testing.

## Repository

GitHub: https://github.com/sahilfg50-wq/CampusFix-AI

---

**CampusFix AI**
Making campus services smarter, more transparent, and more accountable.
