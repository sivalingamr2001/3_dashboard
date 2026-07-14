import { axiosClient } from "@/features/dashboard/api/axiosClient";
import type {
  OperatingUnitDto,
  OperatingUnitTag,
  OrderTrendDto,
  Rolling10dDto,
  SalesTrendDto,
  YtdCumulativeDto,
} from "../types";

export const getOperatingUnits = async (): Promise<OperatingUnitTag[]> => {
  const response = await axiosClient.get<OperatingUnitDto[]>("/OrderSales/operating-units");
  return [{ id: null, label: "All Units" }, ...response.data.map((item) => ({ id: item.orgId, label: item.ouName }))];
};

export const getSalesTrend = async (
  orgId: number | null,
): Promise<SalesTrendDto[]> => {
  const response = await axiosClient.get<SalesTrendDto[]>("/OrderSales/sales-trend", {
    params: { orgId: orgId ?? undefined },
  });

  return response.data;
};

export const getRolling10d = async (
  orgId: number | null,
): Promise<Rolling10dDto[]> => {
  const response = await axiosClient.get<Rolling10dDto[]>("/OrderSales/rolling-10d", {
    params: { orgId: orgId ?? undefined },
  });

  return response.data;
};

export const getYtdCumulative = async (
  orgId: number | null,
): Promise<YtdCumulativeDto[]> => {
  const response = await axiosClient.get<YtdCumulativeDto[]>("/OrderSales/ytd-cumulative", {
    params: { orgId: orgId ?? undefined },
  });

  return response.data;
};

export const getOrdersTrend = async (
  orgId: number | null,
): Promise<OrderTrendDto[]> => {
  const response = await axiosClient.get<OrderTrendDto[]>("/OrderSales/orders-trend", {
    params: { orgId: orgId ?? undefined },
  });

  return response.data;
};
