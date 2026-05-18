import { loginApi } from '@/features/dashboard/api/axiosClient';
import React, { createContext, useContext, useState } from 'react';

interface AuthData {
  message: string;
  isAuthenticated: boolean;
  token?: string;
}

interface AuthContextType {
  auth: AuthData | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const loadSavedAuth = (): AuthData | null => {
  const savedMessage = localStorage.getItem('auth_message');
  const savedIsAuthenticated = localStorage.getItem('auth_isAuthenticated');
  const savedToken = localStorage.getItem('token');

  if (savedMessage && savedIsAuthenticated === 'true') {
    return {
      message: savedMessage,
      isAuthenticated: true,
      token: savedToken ?? undefined,
    };
  }

  return null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthData | null>(loadSavedAuth);

  const login = async (email: string, password: string) => {
    try {
      const apiData: AuthData = await loginApi({ email, password });
      setAuth(apiData);

      localStorage.setItem('auth_message', apiData.message);
      localStorage.setItem('auth_isAuthenticated', String(apiData.isAuthenticated));
      if (apiData.token) {
        localStorage.setItem('token', apiData.token);
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setAuth(null);
    localStorage.removeItem('auth_message');
    localStorage.removeItem('auth_isAuthenticated');
    localStorage.removeItem('token');
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
