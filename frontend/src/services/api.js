import axios from 'axios'

const apiClient = axios.create({
	baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
	timeout: 30000,
	headers: {
		'Content-Type': 'application/json',
	},
})

export async function generateFinancialAnalysis(profile) {
	const response = await apiClient.post('/api/analyze', profile)
	return response.data
}

export default apiClient