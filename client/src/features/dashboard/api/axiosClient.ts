import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const axiosClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000,
});

export const loginApi = async (loginData: { email: string; password: string }) => {
  const response = await axiosClient.post("/Auth/login", loginData);
  return response.data;
};

export const getOuSalesPerformanceApi = async (stkTfrFlg: string = "Y") => {
  const response = await axiosClient.get("/OuSales/performance", {
    params: {
      stkTfrFlg,
    },
  });
  console.log(response.data);
  return response.data;
};
