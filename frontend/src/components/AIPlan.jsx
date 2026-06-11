import { useState } from "react"
import RecommendationCard from "./RecommendationCard"
import SavingsChart from "./SavingsChart"

// ── Goal scenario card ───────────────────────────────────────
function ScenarioCard({ scenario, isSelected, onSelect }) {
  const difficultyStyle = {
    Easy:   "bg-green-100 text-green-700",
    Medium: "bg-yellow-100 text-yellow-700",
    Hard:   "bg-red-100 text-red-700",
  }

  return (
    <button
      onClick={() => onSelect(scenario)}
      className={`w-full text-left rounded-xl border p-4 transition-all ${
        isSelected
          ? "border-blue-400 bg-blue-50 ring-1 ring-blue-300"
          : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/30"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-sm font-semibold text-gray-800">{scenario.label}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${difficultyStyle[scenario.difficulty] || "bg-gray-100 text-gray-600"}`}>
          {scenario.difficulty}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-3 leading-relaxed">{scenario.action}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-gray-400">Extra savings</p>
            <p className="text-sm font-bold text-green-600">+RM {scenario.monthly_saving?.toLocaleString()}/mo</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">New timeline</p>
            <p className="text-sm font-bold text-blue-600">{scenario.new_months} months</p>
          </div>
        </div>
        {isSelected && (
          <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
            ✓ Selected
          </span>
        )}
      </div>
    </button>
  )
}

// ── Main AIPlan component ────────────────────────────────────
export default function AIPlan({ data, onContinue }) {
  const [selectedScenario, setSelectedScenario] = useState(null)

  if (!data) {
    return <div className="text-gray-500 p-8 text-center">Loading your AI Plan...</div>
  }

  const healthScore    = data?.financial_health_score ?? 50
  const goalScenarios  = data?.goal_scenarios         || []
  const investAdvice   = data?.investment_advice      || ""
  const monthlySaveable = data?.monthly_saveable      || 0
  const goalAmount     = data?.goal_amount            || 0
  const targetMonths   = data?.target_months          || 6

  // When a scenario is selected, rebuild projection using boosted monthly savings
  const activeMonthlySaveable = selectedScenario
    ? monthlySaveable + (selectedScenario.monthly_saving || 0)
    : monthlySaveable

  const activeTargetMonths = selectedScenario ? selectedScenario.new_months : targetMonths

    const adjustedProjection = Array.from({ length: activeTargetMonths }, (_, i) => ({
    month: `M${i + 1}`,
    projected_savings: Math.round(activeMonthlySaveable * (i + 1)),
    needed_savings: Math.round((goalAmount / activeTargetMonths) * (i + 1)),
    goal_amount: goalAmount,
    }))

  const scoreColor = healthScore >= 70 ? "text-green-600" : healthScore >= 50 ? "text-yellow-500" : "text-red-600"
  const scoreBg    = healthScore >= 70 ? "bg-green-50 border-green-200" : healthScore >= 50 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200"

  const handleScenarioSelect = (scenario) => {
    setSelectedScenario(prev => prev?.label === scenario.label ? null : scenario)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your AI Financial Plan</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Based on your profile and {data?.state || "your state"} benchmarks
        </p>
      </div>

      {/* Card 1: Health score */}
      <div className={`rounded-xl border p-6 mb-4 ${scoreBg}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Financial Health Score</p>
            <p className={`text-5xl font-bold ${scoreColor}`}>{healthScore}</p>
            <p className={`text-sm font-medium mt-1 ${scoreColor}`}>{data?.health_label || "Analyzed"}</p>
          </div>
          
        </div>
      </div>

      {/* Card 2: Budget allocation */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="font-semibold text-gray-800 mb-1">Recommended Budget Split</h2>
        <p className="text-xs text-gray-400 mb-4">Based on your actual expenses and savings goal</p>

        <div className="flex flex-col gap-3">
          {/* Needs */}
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-blue-500 text-base">💙</span>
                <span className="text-sm font-semibold text-blue-700">Needs</span>
                <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {data?.budget_allocation?.needs?.percentage ?? 0}%
                </span>
              </div>
              <span className="text-sm font-bold text-blue-700">
                RM {(data?.budget_allocation?.needs?.amount ?? 0).toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-blue-500">Your non-negotiable monthly commitments — rent, loans, and bills you must pay.</p>
          </div>

          {/* Savings */}
          <div className="rounded-lg border border-green-100 bg-green-50 p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-green-500 text-base">💚</span>
                <span className="text-sm font-semibold text-green-700">Savings</span>
                <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {data?.budget_allocation?.savings?.percentage ?? 0}%
                </span>
              </div>
              <span className="text-sm font-bold text-green-700">
                RM {(data?.budget_allocation?.savings?.amount ?? 0).toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-green-500 mb-2">Set aside every month to reach your savings goal on time.</p>
            <div className="flex justify-between items-center">
              <span className="text-xs text-green-400">
                Save RM {(data?.budget_allocation?.savings?.monthly_needed ?? 0).toLocaleString()}/month to hit your goal
              </span>
              {(data?.budget_allocation?.savings?.amount ?? 0) >= (data?.budget_allocation?.savings?.monthly_needed ?? 0) ? (
                <span className="text-xs font-medium text-green-600">✓ You're saving enough!</span>
              ) : (
                <span className="text-xs font-medium text-red-500">
                  ⚠️ Need RM {(
                    (data?.budget_allocation?.savings?.monthly_needed ?? 0) -
                    (data?.budget_allocation?.savings?.amount ?? 0)
                  ).toLocaleString()} more/month
                </span>
              )}
            </div>
          </div>

          {/* Wants */}
          <div className="rounded-lg border border-purple-100 bg-purple-50 p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-purple-500 text-base">💜</span>
                <span className="text-sm font-semibold text-purple-700">Wants</span>
                <span className="bg-purple-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {data?.budget_allocation?.wants?.percentage ?? 0}%
                </span>
              </div>
              <span className="text-sm font-bold text-purple-700">
                RM {(data?.budget_allocation?.wants?.amount ?? 0).toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-purple-500 mb-2">Food, transport, entertainment and daily variable spending.</p>
            <div className="w-full bg-purple-200 rounded-full h-1.5 mb-2">
              <div
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    ((data?.budget_allocation?.wants?.actual_spent ?? 0) /
                    Math.max(data?.budget_allocation?.wants?.amount ?? 1, 1)) * 100,
                    100
                  )}%`,
                  backgroundColor: (data?.budget_allocation?.wants?.remaining_buffer ?? 0) >= 0 ? "#a855f7" : "#ef4444",
                }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-purple-400">
                Used: RM {(data?.budget_allocation?.wants?.actual_spent ?? 0).toLocaleString()}
              </span>
              {(data?.budget_allocation?.wants?.remaining_buffer ?? 0) >= 0 ? (
                <span className="text-xs font-medium text-green-600">
                  RM {(data?.budget_allocation?.wants?.remaining_buffer ?? 0).toLocaleString()} still free ✓
                </span>
              ) : (
                <span className="text-xs font-medium text-red-500">
                  ⚠️ RM {Math.abs(data?.budget_allocation?.wants?.remaining_buffer ?? 0).toLocaleString()} over budget
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card 4: AI Recommendations */}
      {data?.ranked_recommendations?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <h2 className="font-semibold text-gray-800 mb-1">AI Recommendations</h2>
          <p className="text-xs text-gray-400 mb-4">Ranked by impact on your monthly savings</p>
          <div className="space-y-3">
            {data.ranked_recommendations.map((rec, index) => (
              <RecommendationCard key={rec?.rank || index} rec={rec} />
            ))}
          </div>
        </div>
      )}

      {/* Card 3: Goal re-planner — AI feature #3 */}
      {goalScenarios.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="font-semibold text-gray-800">Goal Re-Planner</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {goalAmount > 0
                  ? `3 ways to reach RM ${goalAmount.toLocaleString()} — pick one to update your chart`
                  : "Pick a scenario to see how it changes your savings trajectory"}
              </p>
            </div>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium shrink-0">AI #3</span>
          </div>

          {selectedScenario && (
            <div className="mb-3 mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-center justify-between">
              <span>
                Scenario active: <strong>{selectedScenario.label}</strong> — chart updated below
              </span>
              <button
                onClick={() => setSelectedScenario(null)}
                className="text-blue-400 hover:text-blue-600 ml-2 font-medium"
              >
                Reset
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3 mt-3">
            {goalScenarios.map((scenario, i) => (
              <ScenarioCard
                key={i}
                scenario={scenario}
                isSelected={selectedScenario?.label === scenario.label}
                onSelect={handleScenarioSelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Card 6: Savings projection — chart updates when scenario selected */}
      {data?.savings_projection && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          {selectedScenario && (
            <div className="mb-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
              📈 Chart showing projection with <strong>{selectedScenario.label}</strong> (+RM {selectedScenario.monthly_saving?.toLocaleString()}/month)
            </div>
          )}
          <SavingsChart
            data={adjustedProjection}
            goalAmount={goalAmount}
            
          />
        </div>
      )}

      

      {/* Card 5: EPF / ASB advisor — AI feature #6 */}
      {investAdvice && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="font-semibold text-gray-800">EPF & ASB Advisor</h2>
              <p className="text-xs text-gray-400 mt-0.5">Malaysian investment priority for your income bracket</p>
            </div>
            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full font-medium shrink-0">AI #6</span>
          </div>

          {/* Quick reference pills */}
          <div className="flex gap-2 flex-wrap mb-3">
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-xs text-blue-700 font-medium">EPF ~5–6% p.a.</span>
            </div>
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-xs text-green-700 font-medium">ASB ~4–6% p.a.</span>
            </div>
            <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-100 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="text-xs text-purple-700 font-medium">Bumiputera eligibility may apply</span>
            </div>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed bg-teal-50 border border-teal-100 rounded-lg p-3">
            {investAdvice}
          </p>
        </div>
      )}

      

      {/* Card 7: Goal status */}
      {data?.goal_status && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-blue-900 mb-2">Your Savings Goal</h2>
          <p className="text-sm text-blue-800">{data.goal_status}</p>
        </div>
      )}

      <button
        onClick={onContinue}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
      >
        Done
      </button>
    </div>
  )
}
