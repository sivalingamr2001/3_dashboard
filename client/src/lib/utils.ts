import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ENV_API_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";
export const ENV_APP_URL = import.meta.env.VITE_APP_URL || "http://localhost:3000";


// create a method to get currnet date
export const getCurrentDate = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const AS_ON_DATE = getCurrentDate();