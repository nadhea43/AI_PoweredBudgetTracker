import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AppProvider, useAppData } from './context/AppContext'
import { generateFinancialAnalysis } from './services/api'

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
      const responseData = await generateFinancialAnalysis(formData)
      
      // If your backend serves a split { snapshot, plan } payload:
      if (responseData.snapshot || responseData.plan) {
        setSnapshotData(responseData.snapshot || null)
        setAiResult(responseData.plan || null)
      } else {
        // If your backend serves a unified flat dictionary (our Step 7/8 setup):
        setSnapshotData(responseData) 
        setAiResult(responseData)
      }

      navigate('/snapshot')  // → /snapshot

    } catch (err) {
      const message = err?.response?.data?.error || err?.message || 'An error occurred while processing your data. Please try again.'
      setError(message)
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

// ── Screen 3: AI Plan ───────────────────────────────────────
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