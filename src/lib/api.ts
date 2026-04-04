import axios from 'axios'

const isBrowser = typeof window !== 'undefined'
const explicitApiUrl = process.env.NEXT_PUBLIC_API_URL

// In production, default to same-origin proxy to avoid CORS/mixed-content failures on Vercel.
const baseURL = !isBrowser
  ? (explicitApiUrl || 'http://localhost:9090')
  : (process.env.NODE_ENV === 'production' ? '/api/proxy' : (explicitApiUrl || '/api/proxy'))

const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
api.interceptors.response.use((res) => res, (err) => {
  if (err.response?.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('token'); localStorage.removeItem('user')
    window.location.href = '/login'
  }
  return Promise.reject(err)
})
export default api
