import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchSalesData, type SalesQueryParams, type SalesResponse } from "../api/salesApi";
import { queryKeys } from "@/core/query/queryKeys";

/**
 * Hook to fetch sales data using React Query
 * Provides caching, automatic refetching, and error handling
 */
export const useSales = (
  params: SalesQueryParams = {}
): UseQueryResult<SalesResponse, Error> => {
  return useQuery({
    queryKey: queryKeys.sales(params),
    queryFn: () => fetchSalesData(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
  });
};

/**
 * Hook to fetch sales data for a specific date range
 */
export const useSalesInDateRange = (
  fromDate?: string,
  toDate?: string
): UseQueryResult<SalesResponse, Error> => {
  return useSales({
    fromDate,
    toDate,
    limit: 100,
  });
};

/**
 * Hook to fetch sales data by region
 */
export const useSalesByRegion = (
  region: string
): UseQueryResult<SalesResponse, Error> => {
  return useSales({
    region,
    limit: 100,
  });
};
