

export default function DeductionCard({label, amount, description, color = "red" }) {
  const colorMap = {
    red: "bg-red-50 border-red-200 text-red-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    gray: "bg-gray-50 border-gray-200 text-gray-700",
  }

  return (
    <div className={`border rounded-lg p-3 ${colorMap[color]}`}>
      <div className="flex justify-between items-center">
        <span className="font-medium text-sm">{label}</span>
        <span className="font-bold text-sm">− RM {amount}</span>
      </div>
      {/* Small tooltip text explaining what this deduction is */}
      <p className="text-xs mt-1 opacity-70">{description}</p>
    </div>
  )
}