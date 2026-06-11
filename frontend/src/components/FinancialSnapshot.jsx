import { useState } from "react"
import DeductionCard from "./DeductionCard"

// ── Spending type config ─────────────────────────────────────────────────────
const SPENDING_TYPE_CONFIG = {
  "Lifestyle Spender":  { bg: "bg-orange-50",  border: "border-orange-200", text: "text-orange-700", dot: "bg-orange-400" },
  "Committed Spender":  { bg: "bg-blue-50",    border: "border-blue-200",   text: "text-blue-700",   dot: "bg-blue-400"   },
  "Stressed Saver":     { bg: "bg-red-50",      border: "border-red-200",    text: "text-red-700",    dot: "bg-red-400"    },
  "Balanced":           { bg: "bg-green-50",   border: "border-green-200",  text: "text-green-700",  dot: "bg-green-400"  },
  "Under-earner":       { bg: "bg-yellow-50",  border: "border-yellow-200", text: "text-yellow-700", dot: "bg-yellow-400" },
}
const DEFAULT_TYPE_STYLE = { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", dot: "bg-gray-400" }

// ── Helper: progress bar width, capped at 100% ───────────────────────────────
function barWidth(value, max) {
  if (!max || max <= 0) return "0%"
  return `${Math.min((value / max) * 100, 100)}%`
}

export default function FinancialSnapshot({ data, onContinue }) {
  const [copied, setCopied] = useState(false)

  // ── Extract values ───────────────────────────────────────────────────────
  const grossSalary      = data?.gross_salary      || 0
  const takeHome         = data?.take_home         || 0
  const totalCommitments = data?.total_commitments || 0
  const totalSpending    = data?.total_spending    || 0
  const remaining        = data?.remaining         || 0
  const stateName        = data?.state             || "your state"
  const aiSummary        = data?.summary           || ""
  const spendingType     = data?.spending_type     || ""
  const anomalies        = data?.anomalies         || []
  const billSavings      = data?.bill_savings      || []
  const raiseScript      = data?.raise_script      || ""

  // ── Benchmark values ─────────────────────────────────────────────────────
  // PRIMARY  → formal wages median by age group (individual worker, apples-to-apples)
  // SECONDARY → HIES state median (household level, context only)
  const ageGroupMedian = data?.benchmark?.age_group_median_wage || 0
  const ageGroupLabel  = data?.benchmark?.age_group_label       || "your age group"
  const stateMedian    = data?.benchmark?.state_median_income || 0

  // Use age group as primary; fall back to state if age group unavailable
  const primaryMedian  = ageGroupMedian || stateMedian || 1
  const hasAgeMedian   = ageGroupMedian > 0
  const hasStateMedian = stateMedian > 0

  // ── Derived comparisons ──────────────────────────────────────────────────
  const belowPrimary    = grossSalary < primaryMedian
  const diffPercent     = primaryMedian > 1
    ? Math.abs(Math.round(((grossSalary - primaryMedian) / primaryMedian) * 100))
    : 0

  // Bar scale: use the larger of the two medians so both bars are meaningful
  const barMax = Math.max(grossSalary, ageGroupMedian, stateMedian) * 1.05 || 1

  const commitmentRatio  = takeHome > 0 ? Math.round((totalCommitments / takeHome) * 100) : 0
  const isHighCommitment = commitmentRatio > 45

  const totalAnnualBillSavings = billSavings.reduce((sum, b) => sum + (b.annual_saving || 0), 0)

  const typeStyle = SPENDING_TYPE_CONFIG[spendingType] || DEFAULT_TYPE_STYLE

  const handleCopyScript = () => {
    if (!raiseScript) return
    navigator.clipboard.writeText(raiseScript).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Comparison message ───────────────────────────────────────────────────
  const comparisonMessage = () => {
    if (hasAgeMedian) {
      return belowPrimary
        ? `Your salary is ${diffPercent}% below the median for workers aged ${ageGroupLabel}. ${
            hasStateMedian
              ? `The ${stateName} state figure (RM ${stateMedian.toLocaleString()}) reflects household income across all ages and experience levels — a less fair comparison for someone early in their career.`
              : ""
          }`
        : `You're ${diffPercent}% above the median for workers aged ${ageGroupLabel}. Strong start!`
    }
    // Fallback: only state median available
    return belowPrimary
      ? `Your salary is ${diffPercent}% below the ${stateName} median. This figure covers all working adults of all experience levels.`
      : `Your salary is ${diffPercent}% above the ${stateName} median. Great start!`
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Hi {data?.name || "there"}, here's your payslip breakdown
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Based on your gross salary of RM {grossSalary.toLocaleString()} in {stateName}
        </p>
      </div>

      {/* ── Card 1: Deduction breakdown ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="font-semibold text-gray-800 mb-4">What gets deducted from your salary</h2>

        <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
          <span className="text-sm text-gray-600">Gross Salary</span>
          <span className="font-bold text-lg text-gray-900">RM {grossSalary.toLocaleString()}</span>
        </div>

        <div className="space-y-2 mb-4">
          <DeductionCard label="EPF (11%)"       amount={data?.epf   || 0} description="Your retirement fund — locked until age 55."                     color="red" />
          <DeductionCard label="SOCSO"            amount={data?.socso || 0} description="Social insurance if you're injured at work or become disabled."  color="red" />
          <DeductionCard label="EIS (0.2%)"       amount={data?.eis   || 0} description="Pays you a portion of salary if you get retrenched."            color="red" />
          <DeductionCard label="PCB / Income Tax" amount={data?.pcb   || 0} description="Monthly income tax deducted in advance by your employer."       color="red" />
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-3 flex justify-between items-center">
          <div>
            <p className="font-semibold text-green-800">Take-Home Pay</p>
            <p className="text-xs text-green-600 mt-0.5">This is what actually arrives in your bank account</p>
          </div>
          <span className="text-2xl font-bold text-green-700">RM {takeHome.toLocaleString()}</span>
        </div>
      </div>

      {/* ── Card 2: Salary comparison ───────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="font-semibold text-gray-800 mb-4">
          How you compare to workers in {stateName}
        </h2>

        {/* Spending type badge */}
        {spendingType && (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium mb-4 ${typeStyle.bg} ${typeStyle.border} ${typeStyle.text}`}>
            <span className={`w-2 h-2 rounded-full ${typeStyle.dot}`} />
            {spendingType}
          </div>
        )}

        {/* Salary bars */}
        <div className="space-y-4 mb-4">

          {/* Your salary */}
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1.5">
              <span className="font-medium text-gray-800">Your Salary</span>
              <span className="font-semibold text-gray-900">RM {grossSalary.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                style={{ width: barWidth(grossSalary, barMax) }}
              />
            </div>
          </div>

          {/* Age group median (PRIMARY) */}
          {hasAgeMedian && (
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-700">Age group median</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                    {ageGroupLabel} · formal sector
                  </span>
                </div>
                <span className="font-medium text-gray-700">RM {ageGroupMedian.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="bg-blue-300 h-3 rounded-full"
                  style={{ width: barWidth(ageGroupMedian, barMax) }}
                />
              </div>
            </div>
          )}

          {/* State median (CONTEXT) */}
          {hasStateMedian && (
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">{stateName} state median</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                    all ages · formal sector
                  </span>
                </div>
                <span className="font-medium text-gray-500">RM {stateMedian.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="bg-gray-300 h-3 rounded-full"
                  style={{ width: barWidth(stateMedian, barMax) }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        {hasAgeMedian && hasStateMedian && (
          <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-blue-500 inline-block" /> Your salary</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-blue-300 inline-block" /> Age group median</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-gray-300 inline-block" /> State median</span>
          </div>
        )}

        {/* Verdict message */}
        <div className={`p-3 rounded-lg text-sm leading-relaxed ${
          belowPrimary ? "bg-yellow-50 text-yellow-800" : "bg-green-50 text-green-800"
        }`}>
          {comparisonMessage()}
        </div>

        {/* Gemini summary */}
        {aiSummary && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2 text-indigo-600 font-medium text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l-.813-5.096L3 15l5.187-.813L9 9l.813 5.187L15 15l-5.187.813zM18 7.5l-.547 2.453L15 10.5l2.453.547L18 13.5l.547-2.453L21 10.5l-2.453-.547L18 7.5z" />
              </svg>
              <span>Gemini Financial AI Insights</span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed bg-indigo-50/40 p-3 rounded-lg border border-indigo-100/50">
              {typeof aiSummary === "string" && aiSummary.trim().startsWith("{")
                ? (() => { try { return JSON.parse(aiSummary).summary || aiSummary } catch { return aiSummary } })()
                : aiSummary}
            </p>
          </div>
        )}
      </div>

      {/* ── Card 3: Money this month ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="font-semibold text-gray-800 mb-4">Your Money This Month</h2>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Take-home pay</span>
            <span className="font-medium text-gray-900">RM {takeHome.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Fixed commitments</span>
            <span className="font-medium text-gray-600">− RM {totalCommitments.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Variable spending</span>
            <span className="font-medium text-gray-600">− RM {totalSpending.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 pt-1">
            <span className="font-semibold text-gray-800">Remaining</span>
            <span className={`font-bold text-lg ${remaining < 0 ? "text-red-600" : "text-gray-900"}`}>
              RM {remaining.toLocaleString()}
            </span>
          </div>
        </div>

        {isHighCommitment && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            ⚠️ Your fixed commitments are <strong>{commitmentRatio}% of your take-home</strong>. Financial advisors recommend keeping this below 50%.
          </div>
        )}

        {/* Anomalies — DOSM age group spending comparison */}
        {anomalies.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Spending above your age group (25–34 national avg)
            </p>
            <div className="space-y-2">
              {anomalies.map((a, i) => (
                <div key={i} className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-sm font-medium text-orange-800">{a.category}</span>
                    <span className="text-xs text-orange-500 ml-2">national avg: RM {a.benchmark?.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-orange-700">RM {a.your_amount?.toLocaleString()}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      a.severity === "high" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                    }`}>
                      +{a.pct_over}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Card 4: Bill audit ───────────────────────────────────────────── */}
      {billSavings.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="font-semibold text-gray-800">Bill Audit</h2>
              <p className="text-xs text-gray-400 mt-0.5">Alternatives plan found for your bills to save more</p>
            </div>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">AI</span>
          </div>

          <div className="space-y-3">
            {billSavings.map((b, i) => (
              <div key={i} className="bg-green-50 border border-green-100 rounded-lg p-3">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium text-green-800">{b.item}</span>
                  <span className="text-sm font-bold text-green-700">save RM {b.monthly_saving}/mo</span>
                </div>
                <p className="text-xs text-green-600">
                  Currently RM {b.current_amount} → switch to <strong>{b.cheaper_option}</strong> (RM {b.cheaper_amount})
                </p>
              </div>
            ))}
          </div>

          {totalAnnualBillSavings > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
              <span className="text-sm text-gray-600">Total potential annual savings</span>
              <span className="text-base font-bold text-green-700">RM {totalAnnualBillSavings.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Raise script ─────────────────────────────────────────────────── */}
      {raiseScript && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="font-semibold text-gray-800">Salary Negotiation Script</h2>
              <p className="text-xs text-gray-400 mt-0.5">Ready to use in your next review</p>
            </div>
            <button
              onClick={handleCopyScript}
              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg">
            {raiseScript}
          </p>
        </div>
      )}

      {/* ── Continue button ──────────────────────────────────────────────── */}
      <button
        onClick={onContinue}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
      >
        See My AI Financial Plan →
      </button>

    </div>
  )
}
