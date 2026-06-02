---

# 🚀 AI Financial Snapshot & Budget Planner

A full-stack financial analysis web application tailored for fresh graduates in Malaysia. The app uses an automated HIES benchmark data lookup and hooks directly into the **Gemini API** to provide custom AI-driven financial snapshot summaries and tailored personal budget plans.

---

## 🛠️ Tech Stack

* **Frontend:** React (Vite), React Router, Axios, Tailwind CSS
* **Backend:** Python 3 (Native `ThreadingHTTPServer`), Google Gemini API

---

## 📁 Project Structure Overview

```text
├── .env                         # Root environment variables (API keys)
├── backend/
│   └── week_2/
│       └── src/
│           ├── main.py          # Python backend server
│           └── gemini_client.py # Core Gemini API connector logic
├── data
│   └── hies_state.csv
└── frontend/
    ├── src/
    │   ├── components/          # UI Components (Snapshot, Onboarding)
    │   ├── services/api.js      # Frontend Axios API client configuration
    │   └── App.jsx              # Main routing and screen coordinator
    └── package.json

```

---

## ⚙️ Setup & Installation

### 1. Prerequisites

Ensure you have the following installed on your machine:

* [Node.js](https://nodejs.org/) (v18 or higher)
* [Python 3.10+](https://www.python.org/)

### 2. Environment Configuration

Create a `.env` file in the **root directory** of your project and populate it with your Google Gemini API Key:

```env
# Root .env file
GEMINI_API_KEY=your_actual_gemini_api_key_here
BACKEND_PORT=8000
VITE_BACKEND_URL=http://localhost:8000

```

---

## 🏃 How to Run the Application

To get the full-stack system up and running, you will need to execute commands in two separate terminal windows.

### Terminal 1: Backend Server (Python)

1. Navigate to the backend source directory:
```bash
cd backend/week_2/src

```


2. Make sure your dependencies (`requests`, `python-dotenv`) are ready. Start the server:
```bash
python main.py

```


*The server will spin up and display:* `Finance gap detection backend listening on http://localhost:8000`

### Terminal 2: Frontend Client (React)

1. Open a new terminal window and navigate to your frontend directory:
```bash
cd frontend

```


2. Install the node modules (if you haven't already):
```bash
npm install

```


3. Run the Vite development server:
```bash
npm run dev

```


4. Open your browser and navigate to the local link provided in the terminal terminal (usually `http://localhost:5173`).

---

## 🔌 API Endpoints Documentation

The backend server exposes the following functional channels to the frontend client:

| Endpoint | Method | Payload Requirement | Description |
| --- | --- | --- | --- |
| `/api/health` | `GET` | None | Returns Server Status (`{"status": "ok"}`) |
| `/api/analyze` | `POST` | User profile parameters (`gross_salary`, `state`, etc.) | Computes full financial snapshot, metrics, logic benchmarks, and generates live **Gemini AI Insights**. |

---

## 💡 Troubleshooting Checklist

* **Blank White Screen on App?** Open the browser's developer tools (`F12` -> `Console`). Ensure all layout helper variables inside `FinancialSnapshot.jsx` are calculated accurately before rendering.
* **CORS or 204 Status Conflicts?** Web browsers auto-fire an HTTP `OPTIONS` request before sending standard post data across alternating framework ports. The app handles this naturally. If a timeout occurs, increase the network context allocation within `gemini_client.py`.