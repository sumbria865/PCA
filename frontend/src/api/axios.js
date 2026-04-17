import axios from 'axios'

// Base backend URL
const api = axios.create({
  baseURL: 'http://localhost:5000',
})

// 🔥 Attach token automatically for EVERY request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default api