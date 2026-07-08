import axios from 'axios'

const api = import.meta.env.VITE_API_BASE_URL

export const Axios = axios.create({
  baseURL: api,
  headers: {
    'Content-Type': 'application/json',
  },
})

Axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)
