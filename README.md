# 🚀 AI Financial Snapshot & Budget Planner

A full-stack financial analysis web application tailored for fresh graduates in Malaysia. The app uses an automated HIES benchmark data lookup and hooks directly into the **Google Gemini API** to provide custom AI-driven financial snapshot summaries and tailored personal budget plans.

---

## 🛠️ Tech Stack

* **Frontend:** React (Vite), React Router DOM, Axios, Tailwind CSS
* **Backend:** Python 3 (Native `ThreadingHTTPServer`), Google Gemini API

---

## 📋 Prerequisites

Before setting up the project, ensure you have the following installed on your local machine:

* **Node.js:** v18 or above (comes with `npm`)
* **Python:** v3.10 or above

To check if you already have them installed, run:
```bash
node -v
npm -v
python --version
```

## 📁 Project Structure
```
├── .env                         # Root environment variables (API keys)
├── data/
│   └── hies_state.csv           # HIES benchmark data lookup file
├── backend/
│   └── week_2/
│       └── src/
│           ├── main.py          # Python backend server logic
│           └── gemini_client.py # Core Gemini API connector config
└── frontend/
    ├── src/
    │   ├── components/          # Screen UI Modules
    │   │   ├── OnboardingForm.jsx       # Screen 1 — User input form
    │   │   ├── FinancialSnapshot.jsx    # Screen 2 — Payslip & salary breakdown
    │   │   ├── AIPlan.jsx               # Screen 3 — AI financial plan
    │   │   ├── DeductionCard.jsx        # EPF / SOCSO / EIS / PCB breakdown card
    │   │   ├── RecommendationCard.jsx   # Individual AI recommendation card
    │   │   ├── SavingsChart.jsx         # 6-month savings projection chart
    │   │   └── LoadingSpinner.jsx       # Full-screen loading overlay
    │   ├── context/
    │   │   └── AppContext.jsx           # Global state storage across all screens
    │   ├── services/
    │   │   └── api.js                   # Axios client mapping to backend endpoints
    │   ├── App.jsx                      # Route definitions & screen layout
    │   ├── main.jsx
    │   └── index.css
    └── package.json
```
## ⚙️ Getting Started & Installation
1. Clone the Repository
```Bash
git clone [https://github.com/nadhea43/AI_PoweredBudgetTracker.git](https://github.com/nadhea43 AI_PoweredBudgetTracker.git)

cd AI_PoweredBudgetTracker
```
2. Environment Configuration
Create a .env file in the root directory of your project and populate it with your environment parameters:
```Code snippet
# Root .env file
GENAI_API_KEY=your_actual_gemini_api_key_here
BACKEND_PORT=8000
VITE_BACKEND_URL=http://localhost:8000
```
## 🏃 How to Run the Application
To run the full-stack system locally, execute the following startup scripts in two separate terminal windows:

### Terminal 1: Backend Server (Python)

1. Navigate to the backend source directory:
```Bash
cd backend/week_2/src
```
2. Verify dependencies (`requests`, `python-dotenv`) are installed, then boot the execution router:
```Bash
python main.py
```
The server will spin up and display: `Finance gap detection backend listening on http://localhost:8000`

### Terminal 2: Frontend Client (React + Vite)
1. Open a new terminal window and navigate to your frontend directory:
```Bash
cd frontend
```
2. Install the necessary node modules:
```Bash
npm install
```
3. Boot the Vite development hot-reloading loop:
```Bash
npm run dev
```
4. Open your browser and navigate to: http://localhost:5173

## 🔄 Application Flow

Data flows linearly across three primary views managed via global state context:

```Plaintext
/ (OnboardingForm) ──[ Submit Form Data ]──> /snapshot (FinancialSnapshot) ──[ Click AI Plan ]──> /plan (AIPlan)
```

- `src/services/api.js`: Centralizes API communication methods to cleanly separate remote network logic from display components.

- `src/context/AppContext.jsx`: Acts as global storage caching `snapshotData` and `aiResult` so users can step back to edit configurations without resetting app metrics or crashing routing pipelines.

## 🔌 API Endpoints Documentation

The backend server exposes the following functional channels to the frontend client:

| Endpoint | Method | Payload Requirement | Description| 
|------|------|------|------|
| `/api/health` | GET | None | Returns Server Status ({"`status": "ok`"}) |
| `/api/analyze` |POST | User profile parameters (`gross_salary`, `state`, etc.) | Computes statutory deductions (EPF/SOCSO/EIS/PCB), maps HIES regional benchmarks, and returns live Gemini AI Insights.