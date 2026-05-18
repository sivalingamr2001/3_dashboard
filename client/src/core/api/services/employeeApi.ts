import { axiosInstance } from "@/core/api";

/**
 * Employee API Service
 * Provides methods for employee management operations
 */
export interface Employee {
  userId: number;
  email: string;
  displayName: string;
  department: string;
  employeeId: string;
  role: string;
  isActive: boolean;
  createdOn: string;
  createdBy: string;
  modifiedOn?: string;
  modifiedBy?: string;
}

export interface CreateEmployeeRequest {
  email: string;
  password: string;
  displayName: string;
  department: string;
  employeeId: string;
  role: string;
}

export interface UpdateEmployeeRequest {
  displayName?: string;
  department?: string;
  role?: string;
  isActive?: boolean;
}

export const employeeApi = {
  /**
   * Get all employees
   */
  getAllEmployees: async () => {
    const response = await axiosInstance.get<Employee[]>("/api/employees");
    return response.data;
  },

  /**
   * Get employee by ID
   */
  getEmployeeById: async (id: number) => {
    const response = await axiosInstance.get<Employee>(`/api/employees/${id}`);
    return response.data;
  },

  /**
   * Create a new employee
   */
  createEmployee: async (request: CreateEmployeeRequest) => {
    const response = await axiosInstance.post<Employee>("/api/employees", request);
    return response.data;
  },

  /**
   * Update employee
   */
  updateEmployee: async (id: number, request: UpdateEmployeeRequest) => {
    const response = await axiosInstance.put<Employee>(`/api/employees/${id}`, request);
    return response.data;
  },

  /**
   * Delete employee (soft delete)
   */
  deleteEmployee: async (id: number) => {
    const response = await axiosInstance.delete(`/api/employees/${id}`);
    return response.data;
  },
};
