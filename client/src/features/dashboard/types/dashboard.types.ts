export interface YearMetrics {
  salesYtd: number;
  salesThisMonth: number;
  pendingOrdersYtd: number;
  pendingThisMonth: number;
}

export interface OuSalesPerformanceApiItem {
  operatingUnit: string;
  lastYear: YearMetrics;
  thisYear: YearMetrics;
  inventoryAssetValue: number;
}

export type OuSalesPerformanceApiResponse = OuSalesPerformanceApiItem[];

export interface OperatingUnit {
  unit: string;
  to_fy27_date: string;
  to_fy27_month: string;
  to_fy26_date: string;
  to_fy26_month: string;
  trend: string;
  po_date: string;
  po_month: string;
  inv: string;
}

// Uses Omit to cleanly stay perfectly in sync with OperatingUnit properties automatically
export type TotalsRow = Omit<OperatingUnit, "unit">;

export interface SalesResponse {
  rows: OperatingUnit[];
  totals: TotalsRow;
}
