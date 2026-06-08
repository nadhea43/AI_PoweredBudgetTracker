import { useState } from "react"
import DeductionCard from "./DeductionCard"

// ── Spending type config ─────────────────────────────────────
const SPENDING_TYPE_CONFIG = {
  "Lifestyle Spender":  { bg: "bg-orange-50",  border: "border-orange-200", text: "text-orange-700", dot: "bg-orange-400" },
  "Committed Spender":  { bg: "bg-blue-50",    border: "border-blue-200",   text: "text-blue-700",   dot: "bg-blue-400"   },
  "Stressed Saver":     { bg: "bg-red-50",      border: "border-red-200",    text: "text-red-700",    dot: "bg-red-400"    },
  "Balanced":           { bg: "bg-green-50",   border: "border-green-200",  text: "text-green-700",  dot: "bg-green-400"  },
  "Under-earner":       { bg: "bg-yellow-50",  border: "border-yellow-200", text: "text-yellow-700", dot: "bg-yellow-400" },
}

const DEFAULT_TYPE_STYLE = { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", dot: "bg-gray-400" }

export default function FinancialSnapshot({ data, onContinue }) {
  const [raiseExpanded, setRaiseExpanded] = useState(false)
  const [copied, setCopied]               = useState(false)

  // ── Extract values ───────────────────────────────────────────
  const grossSalary      = data?.gross_salary       || 0
  const takeHome         = data?.take_home          || 0
  const totalCommitments = data?.total_commitments  || 0
  const totalSpending    = data?.total_spending     || 0
  const remaining        = data?.remaining          || 0
  const medianIncome     = data?.benchmark?.avg_income_median || data?.benchmark?.median_income || 1
  const stateName        = data?.state              || "your state"
  const aiSummary        = data?.summary            || ""
  const spendingType     = data?.spending_type      || ""
  const anomalies        = data?.anomalies          || []
  const billSavings      = data?.bill_savings       || []
  const raiseScript      = data?.raise_script       || ""

  const typeStyle   = SPENDING_TYPE_CONFIG[spendingType] || DEFAULT_TYPE_STYLE
  const belowMedian = grossSalary < medianIncome
  const diffPercent = medianIncome > 1
    ? Math.abs(Math.round(((grossSalary - medianIncome) / medianIncome) * 100))
    : 0

  const commitmentRatio  = takeHome > 0 ? Math.round((totalCommitments / takeHome) * 100) : 0
  const isHighCommitment = commitmentRatio > 45

  const totalAnnualBillSavings = billSavings.reduce((sum, b) => sum + (b.annual_saving || 0), 0)

  const handleCopyScript = () => {
    if (!raiseScript) return
    navigator.clipboard.writeText(raiseScript).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Hi {data?.name || "there"}, here's your payslip breakdown
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Based on your gross salary of RM {grossSalary.toLocaleString()} in {stateName}
        </p>
      </div>

      {/* Card 1: Deduction breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="font-semibold text-gray-800 mb-4">What gets deducted from your salary</h2>
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
          <span className="text-sm text-gray-600">Gross Salary</span>
          <span className="font-bold text-lg text-gray-900">RM {grossSalary.toLocaleString()}</span>
        </div>
        <div className="space-y-2 mb-4">
          <DeductionCard label="EPF (11%)"      amount={data?.epf   || 0} description="Your retirement fund — locked until age 55."                      color="red" />
          <DeductionCard label="SOCSO"           amount={data?.socso || 0} description="Social insurance if you're injured at work or become disabled."   color="red" />
          <DeductionCard label="EIS (0.2%)"      amount={data?.eis   || 0} description="Pays you a portion of salary if you get retrenched."             color="red" />
          <DeductionCard label="PCB / Income Tax" amount={data?.pcb  || 0} description="Monthly income tax deducted in advance by your employer."        color="red" />
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-3 flex justify-between items-center">
          <div>
            <p className="font-semibold text-green-800">Take-Home Pay</p>
            <p className="text-xs text-green-600 mt-0.5">This is what actually arrives in your bank account</p>
          </div>
          <span className="text-2xl font-bold text-green-700">RM {takeHome.toLocaleString()}</span>
        </div>
      </div>

      {/* Card 2: State comparison + spending type + AI summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="font-semibold text-gray-800 mb-4">How you compare to the average person in {stateName}</h2>

        {/* Spending type badge */}
        {spendingType && (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium mb-4 ${typeStyle.bg} ${typeStyle.border} ${typeStyle.text}`}>
            <span className={`w-2 h-2 rounded-full ${typeStyle.dot}`} />
            {spendingType}
          </div>
        )}

        {/* Salary bars */}
        <div className="space-y-3 mb-4">
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Your Salary</span>
              <span className="font-medium">RM {grossSalary.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${Math.min((grossSalary / medianIncome) * 100, 100)}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>{stateName} median income</span>
              <span className="font-medium">RM {medianIncome.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="bg-gray-400 h-3 rounded-full w-full" />
            </div>
          </div>
        </div>

        <div className={`p-3 rounded-lg text-sm ${belowMedian ? "bg-yellow-50 text-yellow-800" : "bg-green-50 text-green-800"}`}>
          {belowMedian
            ? `Your salary is ${diffPercent}% below the ${stateName} median. This is completely normal for a fresh graduate — median includes all working adults of all experience levels.`
            : `Your salary is ${diffPercent}% above the ${stateName} median. Great start!`}
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

      {/* Card 3: Money this month + anomaly highlights */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="font-semibold text-gray-800 mb-4">Your Money This Month</h2>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Take-home pay</span>
            <span className="font-medium text-gray-900">RM {takeHome.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Fixed commitments</span>
            <span className="font-medium text-gray-600">- RM {totalCommitments.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Variable spending</span>
            <span className="font-medium text-gray-600">- RM {totalSpending.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 pt-1">
            <span className="font-semibold text-gray-800">Remaining</span>
            <span className="font-bold text-lg text-gray-900">RM {remaining.toLocaleString()}</span>
          </div>
        </div>

        {isHighCommitment && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            ⚠️ Your fixed commitments are <strong>{commitmentRatio}% of your take-home</strong>. Financial advisors recommend keeping this below 50%.
          </div>
        )}

        {/* Anomaly section — DOSM 25-34 age group comparison */}
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
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.severity === "high" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                      +{a.pct_over}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Card 4: Salary coach — only if there's a gap vs median */}
      {belowMedian && diffPercent > 5 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="font-semibold text-gray-800">Salary Negotiation Coach</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                You're RM {Math.round(medianIncome - grossSalary).toLocaleString()} below the {stateName} median
              </p>
            </div>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">AI #2</span>
          </div>

          <p className="text-sm text-gray-600 mb-3">
            Based on your salary gap, here's a personalised raise script you can use at your 3–6 month review:
          </p>

          <button
            onClick={() => setRaiseExpanded(prev => !prev)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium mb-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 transition-transform ${raiseExpanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {raiseExpanded ? "Hide script" : "Show raise script"}
          </button>

          {raiseExpanded && (
            <div className="relative">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {raiseScript || `"I'd like to discuss my compensation. I've been contributing to [specific achievements] over the past [X] months, and based on the ${stateName} market rate of RM ${Math.round(medianIncome).toLocaleString()}/month for my role, I'd like to explore a salary adjustment to RM ${Math.round(grossSalary * 1.15).toLocaleString()}. I'm committed to growing here and believe this reflects my increasing contributions."`}
              </div>
              <button
                onClick={handleCopyScript}
                className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {copied ? "Copied!" : "Copy to clipboard"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Card 5: Bill audit — only if savings found */}
      {billSavings.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="font-semibold text-gray-800">Bill Audit</h2>
              <p className="text-xs text-gray-400 mt-0.5">Cheaper alternatives found for your bills</p>
            </div>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">AI #7</span>
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

      {/* Continue button */}
      <button
        onClick={onContinue}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
      >
        See My AI Financial Plan →
      </button>
    </div>
  )
}
