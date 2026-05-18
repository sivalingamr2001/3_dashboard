import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  employeeApi,
  type Employee,
  type CreateEmployeeRequest,
  type UpdateEmployeeRequest,
} from "@/core/api/services";

const EMPLOYEES_QUERY_KEY = ["employees"] as const;

/**
 * Hook to fetch all employees
 */
export const useEmployees = () => {
  return useQuery({
    queryKey: EMPLOYEES_QUERY_KEY,
    queryFn: () => employeeApi.getAllEmployees(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
};

/**
 * Hook to fetch a single employee
 */
export const useEmployee = (id: number | null) => {
  return useQuery({
    queryKey: [...EMPLOYEES_QUERY_KEY, id],
    queryFn: () => employeeApi.getEmployeeById(id!),
    enabled: id !== null,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Hook to create a new employee
 */
export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateEmployeeRequest) => employeeApi.createEmployee(request),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: EMPLOYEES_QUERY_KEY,
      });
    },
  });
};

/**
 * Hook to update an employee
 */
export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: UpdateEmployeeRequest }) =>
      employeeApi.updateEmployee(id, request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: EMPLOYEES_QUERY_KEY,
      });
      queryClient.setQueryData([...EMPLOYEES_QUERY_KEY, data.userId], data);
    },
  });
};

/**
 * Hook to delete an employee
 */
export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => employeeApi.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: EMPLOYEES_QUERY_KEY,
      });
    },
  });
};
