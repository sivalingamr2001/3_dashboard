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

const EXPIRATION_TIME_MS = 1800000;

const loadSavedAuth = (): AuthData | null => {
  const savedMessage = sessionStorage.getItem("auth_message");
  const savedIsAuthenticated = sessionStorage.getItem("auth_isAuthenticated");
  const loginTimestamp = sessionStorage.getItem("auth_timestamp");

  if (!savedMessage || savedIsAuthenticated !== "true" || !loginTimestamp) {
    return null;
  }

  const now = Date.now();
  const timeElapsed = now - parseInt(loginTimestamp, 10);

  if (timeElapsed > EXPIRATION_TIME_MS) {
    sessionStorage.removeItem("auth_message");
    sessionStorage.removeItem("auth_isAuthenticated");
    sessionStorage.removeItem("auth_timestamp");
    sessionStorage.removeItem("token");
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

      sessionStorage.setItem("auth_message", apiData.message);
      sessionStorage.setItem("auth_isAuthenticated", String(apiData.isAuthenticated));
      sessionStorage.setItem("auth_timestamp", String(Date.now()));
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = () => {
    setAuth(null);
    sessionStorage.removeItem("auth_message");
    sessionStorage.removeItem("auth_isAuthenticated");
    sessionStorage.removeItem("auth_timestamp");
    sessionStorage.removeItem("token");
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
