/**
 * Axios instance pre-configured for the Parent Portal.
 * Reads the parent JWT from `parent_token` instead of `token`
 * and redirects to /parent/login on 401.
 */
import axios from "axios";
import { PARENT_TOKEN_KEY } from "../context/ParentAuthContext";

export const parentApi = axios.create({ baseURL: "/api" });

parentApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(PARENT_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

parentApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (
      err.response?.status === 401 &&
      !location.pathname.includes("/parent/login")
    ) {
      localStorage.removeItem(PARENT_TOKEN_KEY);
      location.href = "/parent/login";
    }
    return Promise.reject(err);
  }
);
