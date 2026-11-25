\# CampusFix AI

\### Smart Campus Complaint Management \& Food Waste Monitoring System



CampusFix AI is an AI-assisted campus management platform designed to simplify student complaint handling, improve administrative response, and monitor hostel mess food waste.



It provides separate portals for students and administrators, with complaint tracking, AI-assisted workflows, mess menu management, meal confirmations, and food waste reporting.



\## Key Features



\### 1. Student Portal

\- Student registration and login

\- Submit campus complaints

\- Track complaint status and updates

\- View complaint history

\- View published mess menus

\- Confirm meal preferences



\### 2. Admin Portal

\- View and manage student complaints

\- Update complaint status and add administrative notes

\- View complaint analytics

\- Publish and manage mess menus

\- View student meal confirmations

\- Monitor food preparation, meals served, and leftover food



\### 3. AI-Assisted Complaint Analysis

\- Suggest complaint category and priority

\- Recommend the responsible department

\- Generate a short complaint analysis

\- Suggest administrative actions

\- Manual fallback when Gemini AI is unavailable



\### 4. Autonomous AI Agent

CampusFix AI includes an autonomous complaint-processing workflow.



In the local demo:

1\. The agent checks the simulated campus portal status.

2\. It determines whether the portal is offline.

3\. It performs a simulated recovery action.

4\. It independently verifies the result.

5\. It records the execution history and updates the complaint status.



\*\*Demo limitation:\*\* Portal recovery is simulated. It does not control or restart a real college portal or infrastructure.



\### 5. Mess Management

\- Admins can publish daily meal menus.

\- Students can view available meals.

\- Students can confirm meal preferences.

\- Admins can view confirmation counts.



\### 6. Food Waste Dashboard

\- Record prepared food quantity.

\- Record meals served.

\- Record leftover food quantity.

\- View wastage percentage.

\- Save and reload reports.

\- View meal confirmation counts for the selected date and meal.



Meal confirmations represent expected demand, not verified actual consumption.



\## Technology Stack



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



\## Project Structure



```text

CampusFix-AI/

├── functions/

│   ├── src/

│   │   ├── agent.js

│   │   ├── agentGemini.js

│   │   ├── agentTools.js

│   │   ├── agentValidation.js

│   │   ├── analyze.js

│   │   ├── constants.js

│   │   ├── firestoreAgentTools.js

│   │   ├── gemini.js

│   │   └── rateLimit.js

│   ├── test/

│   └── index.js

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



\## Local Demo Setup (Windows)



\### Requirements

\- Node.js

\- npm

\- Firebase CLI

\- Git



\### 1. Clone the repository



```powershell

git clone https://github.com/sahilfg50-wq/CampusFix-AI.git

cd CampusFix-AI

```



\### 2. Install frontend dependencies



```powershell

npm install

```



\### 3. Start Firebase Emulators



Open a separate PowerShell terminal in the project directory:



```powershell

firebase emulators:start --only auth,firestore,functions --project demo-campusfix

```



Keep this terminal running.



\### 4. Start the frontend



In another terminal:



```powershell

npm run dev

```



Open:



http://localhost:5173



\### 5. Run backend tests



Open another terminal:



```powershell

cd functions

npm install

npm test

```



\### 6. Build the frontend



From the project root:



```powershell

npm run build

```



For PowerShell environments that block npm scripts, use `npm.cmd` and `firebase.cmd` instead.



\## Firebase Emulator Services



| Service | Local URL |

|---|---|

| Frontend | http://localhost:5173 |

| Emulator UI | http://127.0.0.1:4000 |

| Authentication | http://127.0.0.1:9099 |

| Firestore | http://127.0.0.1:8080 |

| Functions | http://127.0.0.1:5001 |



The local demo uses Firebase Emulators. Demo data may reset when emulators restart unless persistence is configured.



\## Security



\- Firestore rules restrict access to authenticated users.

\- Students can access their own complaints.

\- Admin permissions are checked through user roles.

\- Students cannot assign themselves admin privileges.

\- Backend complaint processing validates ownership and complaint state.

\- Agent actions are restricted through action validation.

\- Gemini API credentials are handled through Firebase Functions secrets for production configuration.

\- Local demo mode does not require a Gemini API key for its simulated agent workflow.



Never commit `.env.local`, private keys, passwords, or API credentials to GitHub.



\## Testing and Verification



The following were tested in the local prototype:



\- Student signup and login

\- Complaint submission and tracking

\- Admin complaint management

\- Simulated AI Agent portal recovery

\- Admin analytics

\- Mess menu publishing

\- Student meal confirmation

\- Food waste report saving and reloading

\- Backend unit tests

\- Frontend production build



The local demo was tested using Firebase Emulators. Production Firebase deployment and live Gemini API integration have not been verified.



\## Planned Features \& Future Enhancements



\- Advanced analytics with 7-day, 30-day, 12-month, 2-year, and all-time data filters.

\- AI-powered food waste analysis using historical preparation, consumption, and wastage data.

\- Predictive food demand forecasting for breakfast, lunch, and dinner.

\- Smart food preparation recommendations based on historical trends and student demand.

\- Festival and holiday-based food consumption analysis.

\- Estimated cost savings through reduced food waste and unnecessary food preparation.

\- Automatic email notifications to relevant departments based on complaint categories.

\- Improved complaint escalation and administrative workflows.

\## Current Limitations



\- Autonomous portal recovery is simulated and does not affect real campus infrastructure.

\- Live Gemini functionality requires API configuration and deployment.

\- Meal confirmations indicate expected demand, not actual food consumption.

\- Production deployment and real-world integration require additional testing.



\## Repository



GitHub: https://github.com/sahilfg50-wq/CampusFix-AI



\---



\*\*CampusFix AI\*\*

Making campus services smarter, more transparent, and more accountable.

