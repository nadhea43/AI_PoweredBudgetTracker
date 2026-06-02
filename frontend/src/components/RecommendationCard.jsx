export default function RecommendationCard({rec}) {
    const difficultyStyle ={
        Easy: "bg-green-100 text-green-700",
        Medium: "bg-yellow-100 text-yellow-700",
        Hard: "bg-red-100 text-red-700",
    }

    return(
        <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-3">
                    {/* Rank Badge*/}
                    <span className="bg-blue-100 text-blue-600 rounded-full px-2 py-1 text-xs">
                        {rec.rank}
                    </span>
                    <p className="font-medium text-gray-900 text-sm">{rec.action}</p>
                </div>
                {/* Difficulty badge */}
                <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${difficultyStyle[rec.difficulty]}`}>
                    {rec.difficulty}
                </span>
            </div>

            {/* Monthly Saving */}
            <div className="ml-9">
                <p className="text-green-600 font-semibold textt-sm mb-1">
                    save RM {rec.monthly_impact}/month
                </p>
                {/* AI reasonung */}
                <p className="text-gray-500 text-xs leading-relaxed">{rec.reasoning}</p>
            </div>

        </div>
    )
}
