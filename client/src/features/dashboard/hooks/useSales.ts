import { useEffect, useState } from "react";
import { getOuSalesPerformanceApi } from "@/features/dashboard/api/axiosClient";
import type {
  OuSalesPerformanceApiResponse,
  OperatingUnit,
  SalesResponse,
  TotalsRow,
} from "@/features/dashboard/types/dashboard.types";

export type SalesQueryParams = {
  limit?: number;
};

const formatMoney = (value: number) => value.toFixed(2);

const formatTrend = (current: number, previous: number) => {
  if (previous === 0) {
    return current === 0 ? "0" : "100";
  }
  const trend = ((current - previous) / previous) * 100;
  return Math.round(trend).toString();
};

const buildTotals = (rows: OperatingUnit[]): TotalsRow => {
  const totals = rows.reduce(
    (acc, row) => {
      acc.to_fy27_date += Number(row.to_fy27_date);
      acc.to_fy27_month += Number(row.to_fy27_month);
      acc.to_fy26_date += Number(row.to_fy26_date);
      acc.to_fy26_month += Number(row.to_fy26_month);
      acc.po_date += Number(row.po_date);
      acc.po_month += Number(row.po_month);
      acc.inv += Number(row.inv);
      return acc;
    },
    {
      to_fy27_date: 0,
      to_fy27_month: 0,
      to_fy26_date: 0,
      to_fy26_month: 0,
      trend: "0",
      po_date: 0,
      po_month: 0,
      inv: 0,
    }
  );

  return {
    to_fy27_date: formatMoney(totals.to_fy27_date),
    to_fy27_month: formatMoney(totals.to_fy27_month),
    to_fy26_date: formatMoney(totals.to_fy26_date),
    to_fy26_month: formatMoney(totals.to_fy26_month),
    trend: formatTrend(totals.to_fy27_date, totals.to_fy26_date),
    po_date: formatMoney(totals.po_date),
    po_month: formatMoney(totals.po_month),
    inv: formatMoney(totals.inv),
  };
};

const normalizePerformanceData = (
  apiResponse: OuSalesPerformanceApiResponse
): SalesResponse => {
  // Direct clean mapping since the backend handles grouping and nested shapes now
  const rows: OperatingUnit[] = apiResponse
    .map((item) => {
      const fy26 = item.financialYear2526;
      const fy27 = item.financialYear2627;

      return {
        unit: item.operatingUnit,
        to_fy27_date: formatMoney(fy27.salesAsOnDate),
        to_fy27_month: formatMoney(fy27.salesCurrentMonth),
        to_fy26_date: formatMoney(fy26.salesAsOnDate),
        to_fy26_month: formatMoney(fy26.salesCurrentMonth),
        trend: formatTrend(fy27.salesAsOnDate, fy26.salesAsOnDate),
        po_date: formatMoney(fy27.pendingAsOnDate),
        po_month: formatMoney(fy27.pendingCurrentMonth),
        inv: formatMoney(0), // Kept default placeholder matching original system
      };
    })
    .sort((left, right) => left.unit.localeCompare(right.unit));

  return {
    rows,
    totals: buildTotals(rows),
  };
};

const fetchSalesData = async (_params: SalesQueryParams): Promise<SalesResponse> => {
  const response = await getOuSalesPerformanceApi();
  return normalizePerformanceData(response);
};

export const useSales = (params: SalesQueryParams = {}) => {
  const [data, setData] = useState<SalesResponse | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(undefined);

    fetchSalesData(params)
      .then((response) => {
        if (!active) return;
        setData(response);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.limit]);

  const handleRefetch = () => {
    setIsLoading(true);
    setError(undefined);
    fetchSalesData(params)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => setIsLoading(false));
  };

  return { data, error, isLoading, refetch: () => handleRefetch() };
};
