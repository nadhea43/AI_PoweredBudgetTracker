import RecommendationCard from "./RecommendationCard"
import SavingsChart from "./SavingsChart"

export default function AIPlan({ data, onContinue }) {

    if (!data) {
        return <div className="text-gray-500 p-8 text-center">Loading your AI Plan...</div>
    }

    // Safely extract scores with fallback values
    const healthScore = data?.financial_health_score ?? 50;

    // Health score color - green(good), yellow(ok), red(bad)
    const scoreColor =
        healthScore >= 70 ? "text-green-600" :
        healthScore >= 50 ? "text-yellow-500" :
        "text-red-600"

    const scoreBg =
        healthScore >= 70 ? "bg-green-50 border-green-200" :
        healthScore >= 50 ? "bg-yellow-50 border-yellow-200" :
        "bg-red-50 border-red-200"

    return(
        <div className="max-w-2xl mx-auto px-8 py-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Your AI Financial Plan</h1>
                <p className="text-gray-500 mt-1 text-sm">Based on your profile and {data?.state || "your state"} benchmarks</p>
            </div>

            {/* card1: Health Score */}
            <div className={`rounded-xl border p-6 mb-4 ${scoreBg}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Financial Health Score</p>
                        <p className={`text-5xl font-bold ${scoreColor}`}>{healthScore}</p>
                        <p className={`text-sm font-medium mt-1 ${scoreColor}`}>{data?.health_label || "Analyzed"}</p>
                    </div> 
                    <div className="text-right text-sm text-gray-500">
                        <p>out of 100</p>
                        <p className="mt-1 text-xs max-w-32">{data?.benchmark_comparison || ""}</p>
                    </div>
                </div>
            </div>

            {/* Card 2: Budget Allocation */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
                <h2 className="font-semibold text-gray-800 mb-1">Recommended Budget Split</h2>
                <p className="text-xs text-gray-400 mb-4">
                    Based on your actual expenses and savings goal
                </p>

                <div className="flex flex-col gap-3">

                    {/* NEEDS */}
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
                        <p className="text-xs text-blue-500">
                            Your non-negotiable monthly commitments — rent, loans, and bills you must pay.
                        </p>
                    </div>

                     {/* SAVINGS */}
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
                        <p className="text-xs text-green-500 mb-2">
                            Set aside every month to reach your savings goal on time.
                        </p>

                        <div className="flex justify-between items-center">
                            <span className="text-xs text-green-400">
                                Save RM {(data?.budget_allocation?.savings?.monthly_needed ?? 0).toLocaleString()}/month to hit your goal
                            </span>
                            {(data?.budget_allocation?.savings?.amount ?? 0) >=
                            (data?.budget_allocation?.savings?.monthly_needed ?? 0) ? (
                                <span className="text-xs font-medium text-green-600">
                                    ✓ You're saving enough!
                                </span>
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

                    {/* WANTS */}
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
                        <p className="text-xs text-purple-500 mb-2">
                            Food, transport, entertainment and daily variable spending.
                        </p>

                        {/* Progress bar */}
                        <div className="w-full bg-purple-200 rounded-full h-1.5 mb-2">
                            <div
                                className="h-1.5 rounded-full transition-all"
                                style={{
                                    width: `${Math.min(
                                        ((data?.budget_allocation?.wants?.actual_spent ?? 0) /
                                        (data?.budget_allocation?.wants?.amount ?? 1)) * 100,
                                        100
                                    )}%`,
                                    backgroundColor:
                                        (data?.budget_allocation?.wants?.remaining_buffer ?? 0) >= 0
                                            ? "#a855f7"
                                            : "#ef4444",
                                }}
                            />
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-xs text-purple-400">
                                Used: RM {(data?.budget_allocation?.wants?.actual_spent ?? 0).toLocaleString()}
                            </span>
                            {(data?.budget_allocation?.wants?.remaining_buffer ?? 0) >= 0 ? (
                                <span className="text-xs font-medium text-green-600">
                                    RM {(data?.budget_allocation?.wants?.remaining_buffer ?? 0).toLocaleString()} still free to use ✓
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

            
            {/* Card 3: Recommendations */}
            {data?.ranked_recommendations && data.ranked_recommendations.length > 0 && (
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

            {/* card 4: Savings Projection */}
            {data?.savings_projection && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
                    <h2 className="font-semibold text-gray-800 mb-4">6-Month Savings Projection</h2>
                    <SavingsChart 
                        data={data.savings_projection} 
                        goalAmount={data?.goal_amount || 5000} // or wherever you track the user's specific target goal
                        targetMonths={data?.target_months || 10}
                    />
                </div>
            )}

            {/* card 5: Goal Status */}
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