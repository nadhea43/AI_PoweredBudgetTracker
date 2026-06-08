import { useState } from 'react'

// ── Reusable input field ─────────────────────────────────────
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

// ── Dynamic item row (label + amount + delete button) ────────
const DynamicRow = ({ item, index, onChange, onDelete, categoryOptions, error }) => (
  <div className="flex gap-2 items-start">
    {/* Category selector or free-text label */}
    {categoryOptions ? (
      <div className="flex-1">
        <select
          value={item.label}
          onChange={(e) => onChange(index, 'label', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select category</option>
          {categoryOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
          <option value="__custom__">Other (type below)</option>
        </select>
        {item.label === '__custom__' && (
          <input
            type="text"
            value={item.customLabel || ''}
            onChange={(e) => onChange(index, 'customLabel', e.target.value)}
            placeholder="Describe this expense"
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>
    ) : (
      <input
        type="text"
        value={item.label}
        onChange={(e) => onChange(index, 'label', e.target.value)}
        placeholder="e.g. Gym membership"
        className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
          ${error?.label ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
      />
    )}

    {/* Amount input */}
    <div className="w-32 shrink-0">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">RM</span>
        <input
          type="number"
          value={item.amount}
          onChange={(e) => onChange(index, 'amount', e.target.value)}
          placeholder="0"
          min="0"
          className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
            ${error?.amount ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
        />
      </div>
    </div>

    {/* Delete button */}
    <button
      type="button"
      onClick={() => onDelete(index)}
      className="mt-0.5 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
      title="Remove this item"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
)

// ── Add item button ──────────────────────────────────────────
const AddButton = ({ onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors mt-2"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
    {label}
  </button>
)

// ── Subtotal badge ───────────────────────────────────────────
const Subtotal = ({ items }) => {
  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  if (total === 0) return null
  return (
    <div className="flex justify-end mt-3 pt-3 border-t border-gray-100">
      <span className="text-sm text-gray-500">
        Section total: <span className="font-semibold text-gray-700">RM {total.toLocaleString()}</span>
      </span>
    </div>
  )
}

// ── Category presets ─────────────────────────────────────────
const COMMITMENT_CATEGORIES = [
  'Rent', 'Study Loan (PTPTN)', 'Car Loan', 'Motorcycle Loan',
  'Phone Bill', 'Wifi Bill', 'Insurance', 'Credit Card',
  'Personal Loan', 'Parent Allowance', 'Utilities (Water/Electricity/Gas)',
]

const SPENDING_CATEGORIES = [
  'Food & Drinks', 'Groceries', 'Transport / Petrol',
  'Grab / Taxi', 'Entertainment', 'Shopping / Clothing',
  'Gym / Sports', 'Subscriptions (Netflix etc.)',
  'Medical / Pharmacy', 'Self-care / Grooming',
]

// ── Helper: resolve the display label for a dynamic item ─────
const resolveLabel = (item) =>
  item.label === '__custom__' ? (item.customLabel || 'Other') : item.label

// ── Main form ────────────────────────────────────────────────
export default function OnboardingForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    state: '',
    gross_salary: '',
    savings_goal: '',
    goal_months: '',
    phone_provider: "", 
  })

  // Dynamic lists — each item: { id, label, amount, customLabel? }
  const [commitments, setCommitments] = useState([
    { id: 1, label: 'Rent',                amount: '' },
    { id: 2, label: 'Study Loan (PTPTN)', amount: '' },
    { id: 3, label: 'Car Loan',            amount: '' },
    { id: 4, label: 'Phone Bill',          amount: '' },
  ])

  const [spendings, setSpendings] = useState([
    { id: 1, label: 'Food & Drinks',        amount: '' },
    { id: 2, label: 'Transport / Petrol',   amount: '' },
    { id: 3, label: 'Entertainment',        amount: '' },
  ])

  const [errors, setErrors] = useState({})
  let nextId = 100  // simple id counter

  // ── Generic handlers for dynamic lists ──────────────────────
  const makeHandlers = (list, setList) => ({
    onChange: (index, field, value) => {
      setList(prev => prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ))
    },
    onDelete: (index) => {
      setList(prev => prev.filter((_, i) => i !== index))
    },
    onAdd: (defaultLabel = '') => {
      setList(prev => [...prev, { id: nextId++, label: defaultLabel, amount: '' }])
    },
  })

  const commitmentHandlers = makeHandlers(commitments, setCommitments)
  const spendingHandlers   = makeHandlers(spendings, setSpendings)

  // ── Static field change ──────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  // ── Validation ───────────────────────────────────────────────
  const validate = () => {
    const newErrors = {}
    if (!formData.name.trim())      newErrors.name         = 'Please enter your name'
    if (!formData.state)            newErrors.state        = 'Please select your state'
    if (!formData.gross_salary || Number(formData.gross_salary) <= 0)
                                    newErrors.gross_salary = 'Please enter a valid salary'
    if (!formData.savings_goal || Number(formData.savings_goal) <= 0)
                                    newErrors.savings_goal = 'Please enter a valid savings goal'
    if (!formData.goal_months || Number(formData.goal_months) <= 0)
                                    newErrors.goal_months  = 'Please enter a valid timeframe'

    // Warn if a dynamic row has a label but no amount (and vice-versa)
    commitments.forEach((item, i) => {
      if (item.label && item.label !== '__custom__' && item.amount === '')
        newErrors[`commit_${i}`] = 'Enter an amount or remove this row'
    })
    spendings.forEach((item, i) => {
      if (item.label && item.label !== '__custom__' && item.amount === '')
        newErrors[`spend_${i}`] = 'Enter an amount or remove this row'
    })

    return newErrors
  }

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Build clean arrays for the backend
    const fixedCommitments = commitments
      .filter(item => item.label && Number(item.amount) > 0)
      .map(item => ({ label: resolveLabel(item), amount: Number(item.amount) }))

    const variableSpendings = spendings
      .filter(item => item.label && Number(item.amount) > 0)
      .map(item => ({ label: resolveLabel(item), amount: Number(item.amount) }))

    // Backwards-compatible flat fields for your existing backend
    // (sums all commitments into named buckets it recognises, puts extras in extra_commitments)
    const knownCommitmentMap = {
      'Rent': 'rent',
      'Study Loan (PTPTN)': 'study_loan',
      'Car Loan': 'car_loan',
      'Motorcycle Loan': 'car_loan',   // merged
      'Phone Bill': 'phone_bill',
    }
    const flatCommitments = { rent: 0, study_loan: 0, car_loan: 0, phone_bill: 0 }
    const extraCommitments = []
    fixedCommitments.forEach(({ label, amount }) => {
      const key = knownCommitmentMap[label]
      if (key) flatCommitments[key] += amount
      else extraCommitments.push({ label, amount })
    })

    const knownSpendingMap = {
      'Food & Drinks': 'food_spending',
      'Groceries': 'food_spending',   // merged
      'Transport / Petrol': 'transport_spending',
      'Grab / Taxi': 'transport_spending',
      'Entertainment': 'entertainment',
      'Shopping / Clothing': 'entertainment',
    }
    const flatSpendings = { food_spending: 0, transport_spending: 0, entertainment: 0 }
    const extraSpendings = []
    variableSpendings.forEach(({ label, amount }) => {
      const key = knownSpendingMap[label]
      if (key) flatSpendings[key] += amount
      else extraSpendings.push({ label, amount })
    })

    onSubmit({
      // Core fields
      name:         formData.name,
      state:        formData.state,
      gross_salary: Number(formData.gross_salary),
      savings_goal: Number(formData.savings_goal),
      goal_months:  Number(formData.goal_months),
      phone_provider: formData.phone_provider || "",

      // Flat fields your backend already understands
      ...flatCommitments,
      ...flatSpendings,

      // New structured arrays for the AI (6 features)
      fixed_commitments:  fixedCommitments,
      variable_spendings: variableSpendings,
      extra_commitments:  extraCommitments,
      extra_spendings:    extraSpendings,
    })
  }

  // ── States list ──────────────────────────────────────────────
  const states = [
    'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
    'Pahang', 'Perak', 'Perlis', 'Penang', 'Sabah',
    'Sarawak', 'Selangor', 'Terengganu', 'Kuala Lumpur',
    'Putrajaya', 'Labuan',
  ]

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Welcome to Your Financial Journey</h1>
        <p className="text-gray-600 mt-2">Get a personalised financial plan for your first job in Malaysia</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Section A: Personal Info ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center">A</span>
            Personal Information
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField
              label="Full Name" name="name" value={formData.name}
              onChange={handleChange} placeholder="e.g. Nadhea Ismail"
              required error={errors.name}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <select
                name="state" value={formData.state} onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${errors.state ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
              >
                <option value="">Select your state</option>
                {states.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
            </div>
            <div className="sm:col-span-2">
              <InputField
                label="Gross Monthly Salary (RM)" name="gross_salary"
                value={formData.gross_salary} onChange={handleChange}
                placeholder="e.g. 2800" type="number" required error={errors.gross_salary}
              />
            </div>
          </div>
        </div>

        {/* ── Section B: Fixed Commitments (dynamic) ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <span className="bg-orange-100 text-orange-700 text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center">B</span>
            Fixed Monthly Commitments
          </h2>
          <p className="text-sm text-gray-400 mb-4">Things you MUST pay every month. Remove any that don't apply to you.</p>

          <div className="space-y-3">
            {commitments.map((item, index) => (
              <div key={item.id}>
                <DynamicRow
                  item={item}
                  index={index}
                  onChange={commitmentHandlers.onChange}
                  onDelete={commitmentHandlers.onDelete}
                  categoryOptions={COMMITMENT_CATEGORIES}
                  error={errors[`commit_${index}`] ? { amount: true } : null}
                />
                {errors[`commit_${index}`] && (
                  <p className="text-red-500 text-xs mt-1 ml-1">{errors[`commit_${index}`]}</p>
                )}
                
              </div>
            ))}
          </div>

          {/* Phone provider selector — shown only if user has a phone bill row */}
          {commitments.some(item =>
            (item.label || "").toLowerCase().includes("phone") ||
            (item.label || "").toLowerCase().includes("bill") 
          ) && (
            <div className="mt-2 flex items-center gap-3">
              <label className="text-xs text-gray-500 shrink-0">Your Phone Bill provider :</label>
              <select
                value={formData.phone_provider}
                onChange={(e) => setFormData(prev => ({ ...prev, phone_provider: e.target.value }))}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select provider (optional)</option>
                <option value="maxis">Maxis</option>
                <option value="celcom">Celcom</option>
                <option value="digi">Digi</option>
                <option value="umobile">U Mobile</option>
                <option value="yes">Yes</option>
                <option value="hotlink">Hotlink</option>
                <option value="tunetalk">TuneTalk</option>
              </select>
            </div>
          )}
           {/* wifi provider selector — shown only if user has a wifi bill row */}
          {commitments.some(item =>
            (item.label || "").toLowerCase().includes("phone") ||
            (item.label || "").toLowerCase().includes("bill") 
          ) && (
            <div className="mt-2 flex items-center gap-3">
              <label className="text-xs text-gray-500 shrink-0">Your wifi Bill provider :</label>
              <select
                value={formData.phone_provider}
                onChange={(e) => setFormData(prev => ({ ...prev, phone_provider: e.target.value }))}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select provider (optional)</option>
                <option value="maxis">Unifi (Basic)</option>
                <option value="celcom">Unifi (Standard)</option>
                <option value="digi">Maxis Fibre (Basic)</option>
                <option value="umobile">Maxis Fibre (Standard)</option>
                <option value="yes">TIME (Lite)</option>
                <option value="hotlink">TIME (Standard)</option>
                <option value="tunetalk">Yes 5G</option>
                <option value="tunetalk">Celcom Fibre</option>
                <option value="tunetalk">U Mobile Home</option>
              </select>
            </div>
          )}

          <AddButton
            onClick={() => commitmentHandlers.onAdd('')}
            label="Add another commitment"
          />
          <Subtotal items={commitments} />
        </div>

        {/* ── Section C: Variable Spending (dynamic) ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <span className="bg-purple-100 text-purple-700 text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center">C</span>
            Estimated Monthly Spending
          </h2>
          <p className="text-sm text-gray-400 mb-4">Your best estimate is fine. Be honest, this helps the AI give better advice.</p>

          <div className="space-y-3">
            {spendings.map((item, index) => (
              <div key={item.id}>
                <DynamicRow
                  item={item}
                  index={index}
                  onChange={spendingHandlers.onChange}
                  onDelete={spendingHandlers.onDelete}
                  categoryOptions={SPENDING_CATEGORIES}
                  error={errors[`spend_${index}`] ? { amount: true } : null}
                />
                {errors[`spend_${index}`] && (
                  <p className="text-red-500 text-xs mt-1 ml-1">{errors[`spend_${index}`]}</p>
                )}
              </div>
            ))}
          </div>

          <AddButton
            onClick={() => spendingHandlers.onAdd('')}
            label="Add another spending category"
          />
          <Subtotal items={spendings} />
        </div>

        {/* ── Section D: Savings Goal ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <span className="bg-green-100 text-green-700 text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center">D</span>
            Your Savings Goal
          </h2>
          <p className="text-sm text-gray-400 mb-4">What are you saving towards? Emergency fund, travel, new laptop?</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField
              label="Target Amount (RM)" name="savings_goal"
              value={formData.savings_goal} onChange={handleChange}
              placeholder="e.g. 10000" type="number" required error={errors.savings_goal}
            />
            <InputField
              label="Timeframe (months)" name="goal_months"
              value={formData.goal_months} onChange={handleChange}
              placeholder="e.g. 12" type="number" required error={errors.goal_months}
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          Generate My Financial Plan →
        </button>

      </form>
    </div>
  )
}