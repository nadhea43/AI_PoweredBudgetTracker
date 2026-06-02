import { useState } from 'react'



const InputField = ({ label, name, value, onChange, placeholder, type = "text", required = false, error }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}          
      onChange={onChange}    
      placeholder={placeholder}
      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
        ${error ? "border-red-400 bg-red-50" : "border-gray-300"}`}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
)

export default function OnboardingForm({ onSubmit }) {

  const [formData, setFormData] = useState({
    name: "",
    state: "",
    gross_salary: "",
    rent: "",
    study_loan: "",
    car_loan: "",
    phone_bill: "",
    food_spending: "",
    transport_spending: "",
    entertainment: "",
    savings_goal: "",
    goal_months: "",
  })

  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }))
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.name.trim())
      newErrors.name = "Please enter your name"
    if (!formData.state)
      newErrors.state = "Please select your state"
    if (!formData.gross_salary || Number(formData.gross_salary) <= 0)
      newErrors.gross_salary = "Please enter a valid salary"
    if (!formData.savings_goal || Number(formData.savings_goal) <= 0)
      newErrors.savings_goal = "Please enter a valid savings goal"
    if (!formData.goal_months || Number(formData.goal_months) <= 0)
      newErrors.goal_months = "Please enter a valid timeframe"
    return newErrors
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    onSubmit({
      ...formData,
      gross_salary: Number(formData.gross_salary),
      rent: Number(formData.rent) || 0,
      study_loan: Number(formData.study_loan) || 0,
      car_loan: Number(formData.car_loan) || 0,
      phone_bill: Number(formData.phone_bill) || 0,
      food_spending: Number(formData.food_spending) || 0,
      transport_spending: Number(formData.transport_spending) || 0,
      entertainment: Number(formData.entertainment) || 0,
      savings_goal: Number(formData.savings_goal),
      goal_months: Number(formData.goal_months),
    })
  }

  const states = [
    "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan",
    "Pahang", "Perak", "Perlis", "Penang", "Sabah",
    "Sarawak", "Selangor", "Terengganu", "Kuala Lumpur",
    "Putrajaya", "Labuan"
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Welcome to Your Financial Journey</h1>
        <p className="text-gray-600 mt-2">Get a personalised financial plan for your first job in Malaysia</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Section A */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 rounded-full px-2 py-1 text-xs">A</span>
            Personal Information
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            {/* ✅ Now passing value and onChange explicitly */}
            <InputField
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. John Doe"
              required
              error={errors.name}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${errors.state ? "border-red-400 bg-red-50" : "border-gray-300"}`}
              >
                <option value="">Select your state</option>
                {states.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
            </div>

            <div className="sm:col-span-2">
              <InputField
                label="Gross Monthly Salary (RM)"
                name="gross_salary"
                value={formData.gross_salary}
                onChange={handleChange}
                placeholder="e.g. 2800"
                type="number"
                required
                error={errors.gross_salary}
              />
            </div>

          </div>
        </div>

        {/* Section B */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-orange-100 text-orange-700 text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center">B</span>
            Fixed Monthly Commitments
          </h2>
          <p className="text-sm text-gray-400 mb-4">Things you MUST pay every month. Enter 0 if not applicable.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField label="Rent (RM)" name="rent" value={formData.rent} onChange={handleChange} placeholder="e.g. 650" type="number" error={errors.rent} />
            <InputField label="Study Loan (RM)" name="study_loan" value={formData.study_loan} onChange={handleChange} placeholder="e.g. 200" type="number" error={errors.study_loan} />
            <InputField label="Car Loan (RM)" name="car_loan" value={formData.car_loan} onChange={handleChange} placeholder="e.g. 350" type="number" error={errors.car_loan} />
            <InputField label="Phone Bill (RM)" name="phone_bill" value={formData.phone_bill} onChange={handleChange} placeholder="e.g. 80" type="number" error={errors.phone_bill} />
          </div>
        </div>

        {/* Section C */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <span className="bg-purple-100 text-purple-700 text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center">C</span>
            Estimated Monthly Spending
          </h2>
          <p className="text-sm text-gray-400 mb-4">Your best estimate is fine. Be honest, this helps the AI give better advice.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField label="Food & Drinks (RM)" name="food_spending" value={formData.food_spending} onChange={handleChange} placeholder="e.g. 500" type="number" error={errors.food_spending} />
            <InputField label="Transport / Grab / Petrol (RM)" name="transport_spending" value={formData.transport_spending} onChange={handleChange} placeholder="e.g. 200" type="number" error={errors.transport_spending} />
            <InputField label="Entertainment / Shopping (RM)" name="entertainment" value={formData.entertainment} onChange={handleChange} placeholder="e.g. 150" type="number" error={errors.entertainment} />
          </div>
        </div>

        {/* Section D */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <span className="bg-green-100 text-green-700 text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center">D</span>
            Your Savings Goal
          </h2>
          <p className="text-sm text-gray-400 mb-4">What are you saving towards? Emergency fund, travel, new laptop?</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField label="Target Amount (RM)" name="savings_goal" value={formData.savings_goal} onChange={handleChange} placeholder="e.g. 10000" type="number" required error={errors.savings_goal} />
            <InputField label="Timeframe (months)" name="goal_months" value={formData.goal_months} onChange={handleChange} placeholder="e.g. 12" type="number" required error={errors.goal_months} />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors">
          Generate My Financial Plan →
        </button>

      </form>
    </div>
  )
}