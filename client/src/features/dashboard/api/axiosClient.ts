import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "/mobile_dashboard/api";

export const axiosClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const loginApi = async (cardNo: number) => {
  const response = await axiosClient.get(`/Auth/validate-card?cardNo=${cardNo}`);
  return response.data;
};

export const getOuSalesPerformanceApi = async (stkTfrFlg: string = "Y") => {
  const response = await axiosClient.get("/OuSales/performance", {
    params: {
      stkTfrFlg,
    },
  });
  return response.data;
};

export const manualRunMigrationApi = async () => {
  const response = await axiosClient.post("/Migration/run");
  return response.data;
};

export const getLogs = async () => {
  const response = await axiosClient.get("/Migration/logs");
  return response.data;
};

export const getSalesDataByDayWise = async (orgId: number | null) => {
  const response = await axiosClient.get("OrderSales/rolling-10d", {
    params: { orgId: orgId ?? undefined },
  });
  return response.data;
}

export const getSalesDataByMonthWise = async (orgId: number | null) => {
  const response = await axiosClient.get("OrderSales/sales-trend", {
    params: { orgId: orgId ?? undefined },
  });
  return response.data;
}

export const getOrderData = async (orgId: number | null) => {
  const response = await axiosClient.get("OrderSales/orders-trend", {
    params: { orgId: orgId ?? undefined },
  });
  return response.data;
}

export const getTags = async () => {
  const response = await axiosClient.get("OrderSales/operating-units");
  return response.data;
}