import axios from 'axios'

// Use relative paths and let Vite proxy `/api` requests to the backend
const api = axios.create({
  baseURL: ''
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