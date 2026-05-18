import { loginApi } from '@/features/dashboard/api/axiosClient';
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthData {
  message: string;
  isAuthenticated: boolean;
}

interface AuthContextType {
  auth: AuthData | null;
  // 1. Updated signature to take login credentials
  login: (email: string, password: string) => Promise<void>; 
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthData | null>(null);

  useEffect(() => {
    const savedMessage = localStorage.getItem('auth_message');
    const savedIsAuthenticated = localStorage.getItem('auth_isAuthenticated');

    if (savedMessage && savedIsAuthenticated === 'true') {
      setAuth({
        message: savedMessage,
        isAuthenticated: true,
      });
    }
  }, []);

  // 2. Marked function as async and pass email/password parameters
  const login = async (email: string, password: string) => {
    try {
      // 3. Await the API response. Assumes loginApi returns AxiosResponse or data directly.
      // If loginApi returns the full response object, use: const response = await loginApi(...)
      const apiData: AuthData = await loginApi({ email, password });
      
      setAuth(apiData);
      localStorage.setItem('auth_message', apiData.message);
      localStorage.setItem('auth_isAuthenticated', String(apiData.isAuthenticated));
    } catch (error) {
      console.error("Login failed:", error);
      throw error; // Rethrow to handle error feedback in your UI component
    }
  };

  const logout = () => {
    setAuth(null);
    localStorage.removeItem('auth_message');
    localStorage.removeItem('auth_isAuthenticated');
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
