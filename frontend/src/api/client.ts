import axios, { type AxiosRequestConfig } from "axios";

export class ApiError extends Error {
  fieldErrors?: Record<string, string>;
  /** HTTP status, when the failure came back from the server. */
  status?: number;
  /** Raw error payload, for endpoints that return extra context alongside `error`. */
  data?: Record<string, unknown>;

  constructor(
    message: string,
    fieldErrors?: Record<string, string>,
    status?: number,
    data?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.fieldErrors = fieldErrors;
    this.status = status;
    this.data = data;
  }
}

const http = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      const p = window.location.pathname;
      if (
        p !== "/" &&
        p !== "/login" &&
        p !== "/register" &&
        !p.startsWith("/products") &&
        !p.startsWith("/payment")
      ) {
        window.location.href = "/";
      }
    }

    const data = err.response?.data;
    const status = err.response?.status;
    if (data?.errors && typeof data.errors === "object") {
      const fieldErrors = data.errors as Record<string, string>;
      const firstMessage = Object.values(fieldErrors)[0] ?? "Validation failed";
      return Promise.reject(new ApiError(firstMessage, fieldErrors, status, data));
    }

    const message = data?.error ?? err.message ?? "Request failed";
    return Promise.reject(new ApiError(message, undefined, status, data));
  },
);

export const api = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    http.get<T>(url, config).then((r) => r.data),

  post: <T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ) => http.post<T>(url, data, config).then((r) => r.data),

  put: <T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ) => http.put<T>(url, data, config).then((r) => r.data),

  delete: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    http.delete<T>(url, config).then((r) => r.data),

  postForm: <T = unknown>(url: string, formData: FormData) =>
    http
      .post<T>(url, formData, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data),
};

export default http;
