export interface OperatingUnitTag {
  id: number | null;
  label: string;
}

export interface OperatingUnitDto {
  orgId: number;
  ouName: string;
}

export interface SalesTrendDto {
  orgId: number;
  ouName: string;
  fiscalYearPeriod: string;
  yrmn: string;
  mnyr: string;
  salesValue: number;
  migratedAt: string;
}

export interface OrderTrendDto {
  orgId: number;
  ouName: string;
  fiscalYearPeriod: string;
  yrmn: string;
  mnyr: string;
  orderValue: number;
  migratedAt: string;
}

export interface Rolling10dDto {
  orgId: number;
  ouName: string;
  dynamicPeriod: string;
  dayLabel: string;
  orderDate: string;
  salesValue: number;
  migratedAt: string;
}

export interface YtdCumulativeDto {
  orgId: number;
  ouName: string;
  fiscalYearPeriod: string;
  yrmn: string;
  mnyr: string;
  monthlySales: number;
  cumulativeYtd: number;
  migratedAt: string;
}

export interface ChartRow {
  month: string;
  fy2526: number;
  fy2627: number | null;
}

export interface KpiMetrics {
  fy27YTD: number;
  fy26Same: number;
  growth: number;
  diff: number;
}

export interface YAxisConfig {
  domain: [number, number];
  ticks: number[];
}
