import { axiosInstance } from "@/core/api";

/**
 * Auth API Service
 * Provides methods for authentication operations
 */
export const authApi = {
  /**
   * Login with email and password
   */
  login: async (email: string, password: string) => {
    const response = await axiosInstance.post("/api/auth/login", {
      email,
      password,
    });
    return response.data;
  },

  /**
   * Register a new user
   */
  register: async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => {
    const response = await axiosInstance.post("/api/auth/register", {
      email,
      password,
      firstName,
      lastName,
    });
    return response.data;
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string) => {
    const response = await axiosInstance.post("/api/auth/refresh", {
      refreshToken,
    });
    return response.data;
  },

  /**
   * Logout user
   */
  logout: async () => {
    const response = await axiosInstance.post("/api/auth/logout");
    return response.data;
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async () => {
    const response = await axiosInstance.get("/api/auth/me");
    return response.data;
  },
};
