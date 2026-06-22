import axios, {
  InternalAxiosRequestConfig,
  type AxiosRequestConfig,
} from "axios";
import { useEffect } from "react";

/* ----------------------------- API ERROR CLASS ---------------------------- */

export class ApiError extends Error {
  fieldErrors?: Record<string, string>;

  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.fieldErrors = fieldErrors;
  }
}

/* ----------------------------- AXIOS INSTANCE ----------------------------- */

const BASE_URL = "http://localhost:5175/api/";

export const api = axios.create({
  baseURL: BASE_URL,
});

/* ----------------------------- RESPONSE INTERCEPTOR ----------------------------- */

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== "undefined" && err.response?.status === 401) {
      localStorage.removeItem("token");

      const p = window.location.pathname;

      const isPublicRoute =
        p === "/" ||
        p === "/login" ||
        p === "/register" ||
        p.startsWith("/products") ||
        p.startsWith("/payment");

      if (!isPublicRoute) {
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

/* ----------------------------- HOOK ----------------------------- */

function useAxios(requireAuth = true) {
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem("token");

        if (requireAuth && token) {
          config.headers.set("Authorization", `Bearer ${token}`);
          //   config.headers = {
          //     ...config.headers?.toJSON(),
          //     Authorization: `Bearer ${token}`,
          //   };
        }

        return config;
      },
      (error) => Promise.reject(error),
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
    };
  }, [requireAuth]);

  return api;
}

export default useAxios;
