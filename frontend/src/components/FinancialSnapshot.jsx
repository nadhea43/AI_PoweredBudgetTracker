import DeductionCard from "./DeductionCard"

export default function FinancialSnapshot({ data, onContinue }) {

    // 1. Extract values safely from the data prop
    const grossSalary = data?.gross_salary || 0;
    const takeHome = data?.take_home || 0;
    const totalCommitments = data?.total_commitments || 0;
    const medianIncome = data?.benchmark?.avg_income_median || data?.benchmark?.median_income || 1; 
    
    const stateName = data?.state || "your state";
    const aiSummary = data?.summary; // This maps directly to snapshot.summary now!

    // 2. Compute comparison values dynamically
    const belowMedian = grossSalary < medianIncome;
    const diffPercent = medianIncome > 1 
        ? Math.abs(Math.round(((grossSalary - medianIncome) / medianIncome) * 100)) 
        : 0;

    // ── FIXED: Added missing variables for Card 3 ──
    const commitmentRatio = takeHome > 0 
        ? Math.round((totalCommitments / takeHome) * 100) 
        : 0;
    
    const isHighCommitment = commitmentRatio > 45;

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 items-center">

            {/* Header */}
            <div className="mb-6 text-center">
                 <h1 className="text-2xl font-bold text-gray-900">
                    Hi {data?.name || "there"}, here’s your payslip breakdown
                </h1>
                 <p className="text-gray-500 mt-1 text-sm">
                    Based on your gross salary of RM {grossSalary.toLocaleString()} in {stateName}
                </p>
            </div>

            {/* card 1: Deduction Breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4  items-center ">
                <h2 className="font-semibold text-gray-800 mb-4">What gets deducted from your salary</h2>

                <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Gross Salary</span>
                    <span className="font-bold text-lg text-gray-900">RM {grossSalary.toLocaleString()}</span>
                </div>

                <div className="space-y-2 mb-4"> {/* Fixed typo: mb4 -> mb-4 */}
                    <DeductionCard
                        label="EPF (11%)"
                        amount={data?.epf || 0}
                        description="Your retirement fund — locked until age 55. Employer adds 13% on top."
                        color="red"
                    />
                    <DeductionCard
                        label="SOCSO"
                        amount={data?.socso || 0}
                        description="Social insurance if you're injured at work or become disabled."
                        color="red"
                    />
                    <DeductionCard
                        label="EIS (0.2%)"
                        amount={data?.eis || 0}
                        description="Pays you a portion of salary if you get retrenched."
                        color="red"
                    />
                     <DeductionCard
                        label="PCB / Income Tax"
                        amount={data?.pcb || 0}
                        description="Monthly income tax deducted in advance by your employer."
                        color="red"
                    />
                </div>

                {/* Take-home pay */}
                <div className="bg-green-50 border-green-200 rounded-lg p-4 mt-3 flex justify-between items-center">
                    <div>
                        <p className="font-semibold text-green-800">Take-Home Pay</p>
                        <p className="text-xs text-green-600 mt-0.5">This is what actually arrives in your bank account</p>
                    </div>
                    <span className="text-2xl font-bold text-green-700">RM {(data?.take_home || 0).toLocaleString()}</span>
                </div>
            </div>

            {/* Card 2: State Benchmark */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
                <h2 className="font-semibold text-gray-800 mb-4">How you compare to the average person in {stateName}</h2>

                <div className="space-y-3">
                    {/* visual bar comparison */}
                    <div>
                        <div className="flex justify-between text-sm text-gray-600 mb-1 ">
                            <span>Your Salary</span>
                            <span className="font-medium">RM {grossSalary.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-blue-500 h-3 rounded-full"
                                style={{ width: `${Math.min((grossSalary / medianIncome) * 100, 100)}%` }}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-sm text-gray-600 mb-1 ">
                            <span>{stateName} median income</span>
                            <span className="font-medium">RM {medianIncome.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3">
                            <div className="bg-gray-400 h-3 rounded-full w-full" />
                        </div>
                    </div>
                </div>

                {/* Contextual message */}
                <div className={`mt-4 p-3 rounded-lg text-sm ${belowMedian ? "bg-yellow-50 text-yellow-800" : "bg-green-50 text-green-800"}`}>
                    {belowMedian
                        ? `Your salary is ${diffPercent}% below the ${stateName} median. This is completely normal for a fresh graduate — median includes all working adults of all experience levels.`
                        : `Your salary is ${diffPercent}% above the ${stateName} median. Great start!`
                    }
                </div>

                {/* Gemini AI Insights Section */}
                {aiSummary && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 mb-2 text-indigo-600 font-medium text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l-.813-5.096L3 15l5.187-.813L9 9l.813 5.187L15 15l-5.187.813zM18 7.5l-.547 2.453L15 10.5l2.453.547L18 13.5l.547-2.453L21 10.5l-2.453-.547L18 7.5z" />
                            </svg>
                            <span>Gemini Financial AI Insights</span>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed bg-indigo-50/40 p-3 rounded-lg border border-indigo-100/50">
                            {aiSummary}
                        </p>
                    </div>
                )}
            </div>

            {/* Card 3: Income vs Commitments */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
                <h2 className="font-semibold text-gray-800 mb-4">Your Money This Month</h2>

                <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Take-home pay</span>
                        <span className="font-medium text-gray-900">RM {(data?.take_home || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Fixed commitments</span>
                        <span className="font-medium text-gray-600">RM {totalCommitments.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Variable spending</span>
                        <span className="font-medium text-red-600">− RM {(data?.total_spending || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 pt-1">
                        <span className="font-semibold text-gray-800">Remaining</span>
                        <span className="font-bold text-lg text-gray-900">
                            RM {(data?.remaining || 0).toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* Risk flag if commitment ratio is high */}
                {isHighCommitment && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                        ⚠️ Your fixed commitments are <strong>{commitmentRatio}% of your take-home</strong>. Financial advisors recommend keeping this below 50%.
                    </div>
                )}
            </div>

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