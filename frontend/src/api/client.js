import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('campustalk_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export function getApiErrorMessage(error, fallback = 'Etwas ist schiefgelaufen') {
  return error?.response?.data?.message || error?.message || fallback
}

export { API_BASE_URL }
