import React, { createContext, useEffect, useState, useContext } from "react";
import { getOuSalesPerformanceApi } from "@/features/dashboard/api/axiosClient";
import type {
    OperatingUnit,
    TotalsRow
} from "@/features/dashboard/types/dashboard.types";

export interface YearData {
    salesYtd: number;
    salesThisMonth: number;
    pendingOrdersYtd: number;
    pendingThisMonth: number;
}

export interface SalesItem {
    operatingUnit: string;
    lastYear: YearData;
    thisYear: YearData;
    inventoryAssetValue: number;
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
        totalRow?.thisYear?.salesYtd || 0;

    const totalTurnoverPreviousFy =
        totalRow?.lastYear?.salesYtd || 0;

    const totalPendingOrders =
        totalRow?.thisYear?.pendingOrdersYtd || 0;

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
            const currentYearSales = item.thisYear.salesYtd;
            const previousYearSales = item.lastYear.salesYtd;

            const trend =
                previousYearSales > 0
                    ? Number(
                          (
                              ((currentYearSales - previousYearSales) / previousYearSales) *
                              100
                          ).toFixed(2)
                      )
                    : 0;

            return {
                operatingUnit: item.operatingUnit,

                fy2627SalesAsOn:
                    item.thisYear.salesYtd,

                fy2627SalesCurrentMonth:
                    item.thisYear.salesThisMonth,

                fy2526SalesAsOn:
                    item.lastYear.salesYtd,

                fy2526SalesCurrentMonth:
                    item.lastYear.salesThisMonth,

                trend,

                fy2627PendingAsOn:
                    item.thisYear.pendingOrdersYtd,

                fy2627PendingCurrentMonth:
                    item.thisYear.pendingThisMonth,

                fy2526PendingAsOn:
                    item.lastYear.pendingOrdersYtd,

                fy2526PendingCurrentMonth:
                    item.lastYear.pendingThisMonth,

                inventoryAmount: item.inventoryAssetValue
            };
        });

    const rows: OperatingUnit[] = sales
        .filter((item) => item.operatingUnit !== "Total")
        .map((item) => ({
            unit: item.operatingUnit,
            to_fy27_date: formatMoney(item.thisYear.salesYtd),
            to_fy27_month: formatMoney(
                item.thisYear.salesThisMonth
            ),
            to_fy26_date: formatMoney(item.lastYear.salesYtd),
            to_fy26_month: formatMoney(
                item.lastYear.salesThisMonth
            ),
            trend: formatTrend(
                item.thisYear.salesYtd,
                item.lastYear.salesYtd
            ),
            po_date: formatMoney(item.thisYear.pendingOrdersYtd),
            po_month: formatMoney(
                item.thisYear.pendingThisMonth
            ),
            inv: formatMoney(item.inventoryAssetValue)
        }))
        .sort((left, right) => left.unit.localeCompare(right.unit));

    const totals: TotalsRow = totalRow
        ? {
              to_fy27_date: formatMoney(totalRow.thisYear.salesYtd),
              to_fy27_month: formatMoney(
                  totalRow.thisYear.salesThisMonth
              ),
              to_fy26_date: formatMoney(totalRow.lastYear.salesYtd),
              to_fy26_month: formatMoney(
                  totalRow.lastYear.salesThisMonth
              ),
              trend: formatTrend(
                  totalRow.thisYear.salesYtd,
                  totalRow.lastYear.salesYtd
              ),
              po_date: formatMoney(totalRow.thisYear.pendingOrdersYtd),
              po_month: formatMoney(
                  totalRow.thisYear.pendingThisMonth
              ),
              inv: formatMoney(totalRow.inventoryAssetValue || 0)
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
