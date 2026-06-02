import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AppProvider, useAppData } from './context/AppContext'

import OnboardingForm    from './components/OnboardingForm'
import FinancialSnapshot from './components/FinancialSnapshot'
import AIPlan            from './components/AIPlan'
import LoadingSpinner    from './components/LoadingSpinner'

// ── Protected route wrapper ──────────────────────────────────
// Kalau data takde, redirect balik ke "/" supaya tak crash
function Protected({ children, check }) {
  return check ? children : <Navigate to="/" replace />
}

// ── Screen 1: Onboarding Form ────────────────────────────────
function FormScreen() {
  const { setSnapshotData, setAiResult } = useAppData()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState(null)

  const handleFormSubmit = async (formData) => {
    setIsLoading(true)
    setError(null)

    try {
      // Dummy snapshot
      const snapshot = {
        name:  formData.name,
        state: formData.state,
        gross_salary:       formData.gross_salary,
        take_home:          2462.55,
        epf:                308.00,
        socso:              12.35,
        eis:                3.70,
        pcb:                11.50,
        total_commitments:  1200,
        total_spending:     700,
        remaining:          562.55,
        benchmark: { median_income: 5974, mean_expenditure: 5228 },
        risk_flags: [],
      }
      setSnapshotData(snapshot)
      navigate('/snapshot')  // → /snapshot

      // Dummy AI plan
      const plan = {
        financial_health_score: 62,
        health_label: 'At Risk',
        budget_allocation: {
          needs:   { amount: 1400, percentage: 57 },
          wants:   { amount: 500,  percentage: 20 },
          savings: { amount: 562,  percentage: 23 },
        },
        ranked_recommendations: [
          {
            rank: 1,
            action: 'Cook at home 4 days a week',
            monthly_impact: 180,
            difficulty: 'Easy',
            reasoning: 'Your food spending of RM 700 is above the state average. Reducing Grab orders is your highest-impact change.',
          },
          {
            rank: 2,
            action: 'Switch to public transport 3 days a week',
            monthly_impact: 120,
            difficulty: 'Medium',
            reasoning: 'Transport costs are your second largest variable expense. MRT/LRT can cut this significantly.',
          },
        ],
        savings_projection: [
          { month: 'Jul', projected_savings: 562  },
          { month: 'Aug', projected_savings: 1124 },
          { month: 'Sep', projected_savings: 1686 },
          { month: 'Oct', projected_savings: 2248 },
          { month: 'Nov', projected_savings: 2810 },
          { month: 'Dec', projected_savings: 3372 },
        ],
        goal_status: 'At your current rate, you will reach RM 10,000 in 18 months. Following the plan above gets you there in 14 months.',
      }
      setAiResult(plan)

    } catch (err) {
      setError('An error occurred while processing your data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 text-center">
          {error}
        </div>
      )}
      <OnboardingForm onSubmit={handleFormSubmit} />
    </>
  )
}

// ── Screen 2: Financial Snapshot ─────────────────────────────
function SnapshotScreen() {
  const { snapshotData } = useAppData()
  const navigate = useNavigate()

  return (
    <Protected check={snapshotData}>
      <FinancialSnapshot
        data={snapshotData}
        onContinue={() => navigate('/plan')}  // → /plan
      />
    </Protected>
  )
}

// ── Screen 3: AI Plan ────────────────────────────────────────
function PlanScreen() {
  const { aiResult } = useAppData()
  const navigate = useNavigate()

  return (
    <Protected check={aiResult}>
      <AIPlan data={aiResult}
      onContinue={() => navigate('/')}
      />
    </Protected>
  )
}

// ── Root App ─────────────────────────────────────────────────
export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-blue-50">
          <Routes>
            <Route path="/"         element={<FormScreen />}     />
            <Route path="/snapshot" element={<SnapshotScreen />} />
            <Route path="/plan"     element={<PlanScreen />}     />
            <Route path="*"         element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AppProvider>
  )
}