import React, { createContext, useEffect, useState, useContext } from "react";
import { getOuSalesPerformanceApi } from "@/features/dashboard/api/axiosClient";
import type {
    OperatingUnit,
    TotalsRow
} from "@/features/dashboard/types/dashboard.types";

export interface YearData {
    salesAsOnDate: number;
    salesCurrentMonth: number;
    pendingAsOnDate: number;
    pendingCurrentMonth: number;
}

export interface SalesItem {
    operatingUnit: string;
    financialYear2526: YearData;
    financialYear2627: YearData;
}

const EMPTY_TOTALS: TotalsRow = {
    to_fy27_date: "0.00",
    to_fy27_month: "0.00",
    to_fy26_date: "0.00",
    to_fy26_month: "0.00",
    trend: "0.00",
    po_date: "0.00",
    po_month: "0.00",
    inv: "0.00"
};

const formatMoney = (value: number) => value.toFixed(2);

const formatTrend = (current: number, previous: number) => {
    if (previous === 0) {
        return current === 0 ? "0.00" : "100.00";
    }

    return (((current - previous) / previous) * 100).toFixed(2);
};

interface SalesContextType {
    sales: SalesItem[];
    loading: boolean;
    error?: Error;
    inclIntraSales: boolean;
    fetchSales: () => Promise<void>;
    toggleIntraSales: () => void;

    // KPI DATA
    totalTurnoverCurrentFy: number;
    totalTurnoverPreviousFy: number;
    turnoverGrowthPercentage: number;
    totalPendingOrders: number;

    // TABLE DATA
    tableData: any[];
    rows: OperatingUnit[];
    totals: TotalsRow;
}

const SalesContext = createContext<SalesContextType | undefined>(undefined);

export const SalesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [sales, setSales] = useState<SalesItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | undefined>(undefined);
    const [inclIntraSales, setInclIntraSales] = useState(true);

    const fetchSales = async () => {
        try {
            setLoading(true);
            setError(undefined);

            const stkTfrFlg = inclIntraSales ? "Y" : "N";
            const data = await getOuSalesPerformanceApi(stkTfrFlg);

            setSales(data);
        } catch (error) {
            const salesError =
                error instanceof Error ? error : new Error(String(error));
            setError(salesError);
            console.error("Error fetching sales:", salesError);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchSales();
    }, [inclIntraSales]);

    const toggleIntraSales = () => {
        setLoading(true);
        setInclIntraSales((previous) => !previous);
    };

    // TOTAL ROW
    const totalRow = sales.find(
        (x) => x.operatingUnit?.toLowerCase() === 'total'
    );

    // KPI VALUES
    const totalTurnoverCurrentFy =
        totalRow?.financialYear2627?.salesAsOnDate || 0;

    const totalTurnoverPreviousFy =
        totalRow?.financialYear2526?.salesAsOnDate || 0;

    const totalPendingOrders =
        totalRow?.financialYear2627?.pendingAsOnDate || 0;

    const turnoverGrowthPercentage =
        totalTurnoverPreviousFy > 0
            ? Number(
                  (
                      ((totalTurnoverCurrentFy - totalTurnoverPreviousFy) /
                          totalTurnoverPreviousFy) *
                      100
                  ).toFixed(2)
              )
            : 0;

    // TABLE DATA
    const tableData = sales
        .filter((x) => x.operatingUnit !== "Total")
        .map((item) => {
            const fy2627Sales = item.financialYear2627.salesAsOnDate;
            const fy2526Sales = item.financialYear2526.salesAsOnDate;

            const trend =
                fy2526Sales > 0
                    ? Number(
                          (
                              ((fy2627Sales - fy2526Sales) / fy2526Sales) *
                              100
                          ).toFixed(2)
                      )
                    : 0;

            return {
                operatingUnit: item.operatingUnit,

                fy2627SalesAsOn:
                    item.financialYear2627.salesAsOnDate,

                fy2627SalesCurrentMonth:
                    item.financialYear2627.salesCurrentMonth,

                fy2526SalesAsOn:
                    item.financialYear2526.salesAsOnDate,

                fy2526SalesCurrentMonth:
                    item.financialYear2526.salesCurrentMonth,

                trend,

                fy2627PendingAsOn:
                    item.financialYear2627.pendingAsOnDate,

                fy2627PendingCurrentMonth:
                    item.financialYear2627.pendingCurrentMonth,

                fy2526PendingAsOn:
                    item.financialYear2526.pendingAsOnDate,

                fy2526PendingCurrentMonth:
                    item.financialYear2526.pendingCurrentMonth
            };
        });

    const rows: OperatingUnit[] = sales
        .filter((item) => item.operatingUnit !== "Total")
        .map((item) => ({
            unit: item.operatingUnit,
            to_fy27_date: formatMoney(item.financialYear2627.salesAsOnDate),
            to_fy27_month: formatMoney(
                item.financialYear2627.salesCurrentMonth
            ),
            to_fy26_date: formatMoney(item.financialYear2526.salesAsOnDate),
            to_fy26_month: formatMoney(
                item.financialYear2526.salesCurrentMonth
            ),
            trend: formatTrend(
                item.financialYear2627.salesAsOnDate,
                item.financialYear2526.salesAsOnDate
            ),
            po_date: formatMoney(item.financialYear2627.pendingAsOnDate),
            po_month: formatMoney(
                item.financialYear2627.pendingCurrentMonth
            ),
            inv: "0.00"
        }))
        .sort((left, right) => left.unit.localeCompare(right.unit));

    const totals: TotalsRow = totalRow
        ? {
              to_fy27_date: formatMoney(totalRow.financialYear2627.salesAsOnDate),
              to_fy27_month: formatMoney(
                  totalRow.financialYear2627.salesCurrentMonth
              ),
              to_fy26_date: formatMoney(totalRow.financialYear2526.salesAsOnDate),
              to_fy26_month: formatMoney(
                  totalRow.financialYear2526.salesCurrentMonth
              ),
              trend: formatTrend(
                  totalRow.financialYear2627.salesAsOnDate,
                  totalRow.financialYear2526.salesAsOnDate
              ),
              po_date: formatMoney(totalRow.financialYear2627.pendingAsOnDate),
              po_month: formatMoney(
                  totalRow.financialYear2627.pendingCurrentMonth
              ),
              inv: "0.00"
          }
        : EMPTY_TOTALS;

    return (
        <SalesContext.Provider
            value={{
                sales,
                loading,
                fetchSales,
                error,
                inclIntraSales,
                toggleIntraSales,

                totalTurnoverCurrentFy,
                totalTurnoverPreviousFy,
                turnoverGrowthPercentage,
                totalPendingOrders,

                tableData,
                rows,
                totals
            }}
        >
            {children}
        </SalesContext.Provider>
    );
};

export const useSales = (): SalesContextType => {
    const context = useContext(SalesContext);

    if (!context) {
        throw new Error('useSales must be used within a SalesProvider');
    }

    return context;
};
