# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


## Tech Stack

- React + Vite
- Tailwind CSS
- React Router DOM

## Prerequisites
- Node.js v18 or above → Download here
- npm (comes with Node.js)
- To check if you already have them:
```BASH
node -v
npm -v
```
## Getting Started
1. Clone the repository
```bash
git clone https://github.com/nadhea43/AI_PoweredBudgetTracker.git
cd AI_PoweredBudgetTracker
```
2. Install dependencies
```bash
npm install
```
3. Run the development server
```bash
npm run dev
```
4. Open in browser
```bash
http://localhost:5173
```

## Project Structure

src/
├── components/
│   ├── OnboardingForm.jsx       # Screen 1 — user input form
│   ├── FinancialSnapshot.jsx    # Screen 2 — payslip & salary breakdown
│   ├── AIPlan.jsx               # Screen 3 — AI financial plan
│   ├── DeductionCard.jsx        # EPF / SOCSO / EIS / PCB breakdown card
│   ├── RecommendationCard.jsx   # Individual AI recommendation card
│   ├── SavingsChart.jsx         # 6-month savings projection chart
│   └── LoadingSpinner.jsx       # Full-screen loading overlay
├── context/
│   └── AppContext.jsx           # Global state shared across all screens
├── services/
│   └── api.js                   # API calls (currently using dummy data)
├── App.jsx                      # Route definitions & screen layout
├── main.jsx
└── index.css

## App Flow
/ (OnboardingForm)
    ↓ submit form
/snapshot (FinancialSnapshot)
    ↓ click "See My AI Financial Plan"
/plan (AIPlan)

## Notes [Ehsan]
- **services/api.js** tu tempat kau letak semua API calls — basically memisahkan logic "cakap dengan backend" dari logic "display UI".
Sekarang dalam App.jsx , dummy data tu duduk terus dalam component. Nanti bila kau connect ke real backend, api.js lah yang handle tu.
- **context/AppContext.jsx** — stores snapshotData and aiResult globally so semua screens boleh access. suapaya bile tekan back button tak crash. Context tu basically "global storage" untuk React app like semua screen boleh baca dan tulis data yang sama.Context tu basically "global storage" untuk React app kau — semua screen boleh baca dan tulis data yang sama.

