import axios, { type AxiosRequestConfig } from 'axios'

const http = axios.create({ baseURL: '/api' })

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error ?? err.message ?? 'Request failed'
    return Promise.reject(new Error(message))
  }
)

export const api = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    http.get<T>(url, config).then((r) => r.data),

  post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    http.post<T>(url, data, config).then((r) => r.data),

  put: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    http.put<T>(url, data, config).then((r) => r.data),

  delete: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    http.delete<T>(url, config).then((r) => r.data),
}

export default http
