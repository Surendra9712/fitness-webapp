import axios, { type AxiosRequestConfig } from "axios";

export class ApiError extends Error {
  fieldErrors?: Record<string, string>;

  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.fieldErrors = fieldErrors;
  }
}

const http = axios.create({ baseURL: "/api" });

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
    if (data?.errors && typeof data.errors === "object") {
      const fieldErrors = data.errors as Record<string, string>;
      const firstMessage = Object.values(fieldErrors)[0] ?? "Validation failed";
      return Promise.reject(new ApiError(firstMessage, fieldErrors));
    }

    const message = data?.error ?? err.message ?? "Request failed";
    return Promise.reject(new ApiError(message));
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
