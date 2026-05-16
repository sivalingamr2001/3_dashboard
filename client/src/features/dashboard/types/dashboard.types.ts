export type OperatingUnit = {
  unit: string
  to_fy27_date: string
  to_fy27_month: string
  to_fy26_date: string
  to_fy26_month: string
  trend: string
  po_date: string
  po_month: string
  inv: string
}

export type TotalsRow = Omit<OperatingUnit, "unit">
