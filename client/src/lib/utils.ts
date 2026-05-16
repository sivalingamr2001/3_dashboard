import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ENV_API_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";
export const ENV_APP_URL = import.meta.env.VITE_APP_URL || "http://localhost:3000";
