import axios, { type AxiosInstance } from "axios";
import { env } from "@/config/env";
import { attachAuthInterceptor } from "./interceptors/authInterceptor";
import { attachErrorInterceptor } from "./interceptors/errorInterceptor";

export const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: env.VITE_API_BASE_URL,
    timeout: 30_000,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  // Attach interceptors
  attachAuthInterceptor(instance);
  attachErrorInterceptor(instance);

  return instance;
};

export const axiosInstance = createAxiosInstance();
