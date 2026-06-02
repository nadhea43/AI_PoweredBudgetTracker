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

            {/* card2: Budget Allocation */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
                <h2 className="font-semibold text-gray-800 mb-4">Recommended Budget Split</h2>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        {label: "Needs", key: "needs", color: "bg-blue-500"},
                        {label: "Wants", key: "wants", color: "bg-purple-400" },
                        {label: "Savings", key: "savings", color: "bg-green-500" },
                     ].map(({ label, key, color }) => {
                        // Safe extraction for dynamic budget arrays
                        const percentage = data?.budget_allocation?.[key]?.percentage ?? 0;
                        const amount = data?.budget_allocation?.[key]?.amount ?? 0;
                        
                        return (
                            <div key={key} className="text-center">
                                <div className={`${color} rounded-lg p-3 mb-2`}>
                                    <p className="text-white font-bold text-lg">
                                        {percentage}%
                                    </p>
                                </div>
                                <p className="text-xs font-medium text-gray-700">{label}</p>
                                <p className="text-xs text-gray-400">
                                    RM {amount.toLocaleString()}
                                </p>
                            </div>
                        );
                     })}
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