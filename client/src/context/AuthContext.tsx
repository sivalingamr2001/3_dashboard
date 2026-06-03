import { loginApi } from "@/features/dashboard/api/axiosClient";
import React, { createContext, useContext, useState } from "react";

interface AuthData {
  message: string;
  isAuthenticated: boolean;
}

interface AuthContextType {
  auth: AuthData | null;
  login: (cardNo: number) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const EXPIRATION_TIME_MS = 24 * 60 * 60 * 1000;

const getStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
};

const getStoredValue = (key: string) => {
  const storage = getStorage();
  if (!storage) return null;

  return storage.getItem(key) ?? sessionStorage.getItem(key);
};

const removeStoredValues = () => {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem("auth_message");
  sessionStorage.removeItem("auth_isAuthenticated");
  sessionStorage.removeItem("auth_timestamp");

  localStorage.removeItem("auth_message");
  localStorage.removeItem("auth_isAuthenticated");
  localStorage.removeItem("auth_timestamp");
};

const loadSavedAuth = (): AuthData | null => {
  const savedMessage = getStoredValue("auth_message");
  const savedIsAuthenticated = getStoredValue("auth_isAuthenticated");
  const loginTimestamp = getStoredValue("auth_timestamp");

  if (!savedMessage || savedIsAuthenticated !== "true" || !loginTimestamp) {
    return null;
  }

  const now = Date.now();
  const timeElapsed = now - parseInt(loginTimestamp, 10);

  if (timeElapsed > EXPIRATION_TIME_MS) {
    removeStoredValues();
    return null;
  }

  return {
    message: savedMessage,
    isAuthenticated: true,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthData | null>(loadSavedAuth);

  const login = async (cardNo: number) => {
    try {
      const apiData: AuthData = await loginApi(cardNo);
      setAuth(apiData);

      const storage = getStorage();
      if (!storage) {
        throw new Error("Browser storage is unavailable.");
      }

      storage.setItem("auth_message", apiData.message);
      storage.setItem("auth_isAuthenticated", String(apiData.isAuthenticated));
      storage.setItem("auth_timestamp", String(Date.now()));
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = () => {
    setAuth(null);
    removeStoredValues();
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
