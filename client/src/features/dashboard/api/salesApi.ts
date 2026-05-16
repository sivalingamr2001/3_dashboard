import { axiosInstance } from "@/core/api/axiosInstance";

export interface SalesQueryParams {
  fromDate?: string;
  toDate?: string;
  region?: string;
  limit?: number;
  offset?: number;
}

export interface SalesRecord {
  SALE_ID: number;
  SALE_DATE: string | Date;
  REGION: string;
  PRODUCT_CODE: string;
  QUANTITY: number;
  UNIT_PRICE: number;
  TOTAL_AMOUNT: number;
  CUSTOMER_NAME: string;
  SALESPERSON_ID: number;
}

export interface SalesSummary {
  totalCount: number;
  totalAmount: number;
}

export interface SalesResponse {
  success: boolean;
  summary: SalesSummary;
  data: SalesRecord[];
}

/**
 * Fetch sales data from the backend API
 * @param params Query parameters for filtering sales data
 * @returns Sales data with summary information
 */
export const fetchSalesData = async (
  params: SalesQueryParams = {}
): Promise<SalesResponse> => {
  const { data } = await axiosInstance.get<SalesResponse>("/sales", {
    params: {
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
      ...(params.fromDate && { fromDate: params.fromDate }),
      ...(params.toDate && { toDate: params.toDate }),
      ...(params.region && { region: params.region }),
    },
  });

  return data;
};

/**
 * Fetch sales data with advanced filtering
 */
export const fetchSalesWithFilters = async (params: SalesQueryParams) => {
  return fetchSalesData(params);
};
