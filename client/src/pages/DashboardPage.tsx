'use client'

import { getOuSalesPerformanceApi } from '@/api/axiosClient'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useEffect, useState } from 'react'

interface SalesRecord {
  ouName: string;
  yr: string;
  saleVal: number;
  pendOrdVal: number;
}

interface OperatingUnitData {
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

interface DashboardData {
  operatingUnits: OperatingUnitData[];
  totals: OperatingUnitData;
  kpis: {
    groupTurnover: {
      currentFY: string;
      previousFY: string;
      growth: string;
    };
    pendingOrders: string;
    inventoryValue: string;
  };
}

function formatTrend(value: string): string {
  const numericValue = Number(value)

  if (Number.isNaN(numericValue)) {
    return value
  }

  return `${numericValue >= 0 ? '+' : ''}${value}%`
}

// Default fallback data
const defaultOperatingUnitsData = [
  { unit: 'Dubai Operating Unit', to_fy27_date: '5.30', to_fy27_month: '2.80', to_fy26_date: '4.90', to_fy26_month: '2.50', trend: '8.20', po_date: '18.50', po_month: '3.50', inv: '4.20' },
  { unit: 'Global Operating Unit', to_fy27_date: '28.50', to_fy27_month: '14.20', to_fy26_date: '26.80', to_fy26_month: '13.40', trend: '6.30', po_date: '89.20', po_month: '16.80', inv: '18.50' },
  { unit: 'Janatics Germany Operating Unit', to_fy27_date: '22.30', to_fy27_month: '11.60', to_fy26_date: '20.60', to_fy26_month: '10.80', trend: '8.30', po_date: '67.50', po_month: '12.40', inv: '14.20' },
  { unit: 'Janatics Industrial Automation Pvt Ltd Operating Unit', to_fy27_date: '36.80', to_fy27_month: '18.50', to_fy26_date: '34.20', to_fy26_month: '17.20', trend: '7.60', po_date: '112.40', po_month: '21.20', inv: '22.80' },
  { unit: 'Janatics Industrial Automation Pvt Ltd-Coil', to_fy27_date: '18.40', to_fy27_month: '9.20', to_fy26_date: '16.80', to_fy26_month: '8.50', trend: '9.50', po_date: '54.60', po_month: '10.20', inv: '11.50' },
  { unit: 'Janatics Operating Unit', to_fy27_date: '67.20', to_fy27_month: '33.80', to_fy26_date: '62.50', to_fy26_month: '31.40', trend: '7.50', po_date: '215.80', po_month: '39.80', inv: '35.60' },
  { unit: 'Janatics USA Operating Unit', to_fy27_date: '6.10', to_fy27_month: '3.20', to_fy26_date: '5.70', to_fy26_month: '2.90', trend: '7.00', po_date: '21.20', po_month: '4.10', inv: '4.80' },
  { unit: 'Polymer Operating Unit', to_fy27_date: '21.10', to_fy27_month: '10.80', to_fy26_date: '19.40', to_fy26_month: '9.90', trend: '8.80', po_date: '65.30', po_month: '12.50', inv: '13.20' },
  { unit: 'Skyfast Operating Unit', to_fy27_date: '24.00', to_fy27_month: '12.40', to_fy26_date: '22.20', to_fy26_month: '11.50', trend: '8.10', po_date: '78.80', po_month: '14.80', inv: '15.40' }
]

const defaultTotalsRow = {
  unit: 'TOTAL',
  to_fy27_date: '229.70',
  to_fy27_month: '116.50',
  to_fy26_date: '213.10',
  to_fy26_month: '108.10',
  trend: '7.80',
  po_date: '723.30',
  po_month: '135.30',
  inv: '140.20'
}

const defaultKPIs = {
  groupTurnover: {
    currentFY: '229.70',
    previousFY: '213.10',
    growth: '7.80'
  },
  pendingOrders: '723.30',
  inventoryValue: '140.20'
}

function formatCurrency(value: number | undefined): string {
  return value != null ? value.toFixed(2) : '0.00'
}

function buildOperatingUnitRows(sales: SalesRecord[]): OperatingUnitData[] {
  const rows = new Map<string, OperatingUnitData>()

  for (const sale of sales) {
    const existing = rows.get(sale.ouName) ?? {
      unit: sale.ouName,
      to_fy27_date: '0.00',
      to_fy27_month: '0.00',
      to_fy26_date: '0.00',
      to_fy26_month: '0.00',
      trend: '0.00',
      po_date: '0.00',
      po_month: '0.00',
      inv: '0.00'
    }

    if (sale.yr === '2026') {
      existing.to_fy27_date = formatCurrency(sale.saleVal)
      existing.to_fy27_month = formatCurrency(sale.pendOrdVal)
    } else if (sale.yr === '2025') {
      existing.to_fy26_date = formatCurrency(sale.saleVal)
      existing.to_fy26_month = formatCurrency(sale.pendOrdVal)
    }

    const currentFY = Number(existing.to_fy27_date)
    const previousFY = Number(existing.to_fy26_date)
    const growth = previousFY > 0 ? ((currentFY - previousFY) / previousFY) * 100 : 0
    existing.trend = formatCurrency(growth)

    rows.set(sale.ouName, existing)
  }

  return Array.from(rows.values())
}

function buildTotalsRow(sales: SalesRecord[]): OperatingUnitData {
  const totals = sales.reduce(
    (acc, sale) => {
      if (sale.yr === '2026') {
        acc.currentFY += sale.saleVal
        acc.currentPendingOrders += sale.pendOrdVal
      } else if (sale.yr === '2025') {
        acc.previousFY += sale.saleVal
      }
      return acc
    },
    { currentFY: 0, previousFY: 0, currentPendingOrders: 0 }
  )

  const growth = totals.previousFY > 0 ? ((totals.currentFY - totals.previousFY) / totals.previousFY) * 100 : 0

  return {
    unit: 'TOTAL',
    to_fy27_date: formatCurrency(totals.currentFY),
    to_fy27_month: '0.00',
    to_fy26_date: formatCurrency(totals.previousFY),
    to_fy26_month: '0.00',
    trend: formatCurrency(growth),
    po_date: formatCurrency(totals.currentPendingOrders),
    po_month: '0.00',
    inv: '0.00'
  }
}

function buildKPIs(sales: SalesRecord[]) {
  const currentFY = sales
    .filter((sale) => sale.yr === '2026')
    .reduce((sum, sale) => sum + sale.saleVal, 0)

  const previousFY = sales
    .filter((sale) => sale.yr === '2025')
    .reduce((sum, sale) => sum + sale.saleVal, 0)

  const pendingOrders = sales
    .filter((sale) => sale.yr === '2026')
    .reduce((sum, sale) => sum + sale.pendOrdVal, 0)

  const growth = previousFY > 0 ? ((currentFY - previousFY) / previousFY) * 100 : 0

  return {
    groupTurnover: {
      currentFY: formatCurrency(currentFY),
      previousFY: formatCurrency(previousFY),
      growth: formatCurrency(growth)
    },
    pendingOrders: formatCurrency(pendingOrders),
    inventoryValue: '0.00'
  }
}

export default function Dashboard() {
  const [operatingUnitsData, setOperatingUnitsData] = useState<OperatingUnitData[]>(defaultOperatingUnitsData)
  const [totalsRow, setTotalsRow] = useState<OperatingUnitData>(defaultTotalsRow)
  const [kpis, setKpis] = useState(defaultKPIs)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await getOuSalesPerformanceApi() as SalesRecord[]

      if (!Array.isArray(response) || response.length === 0) {
        throw new Error('No sales data returned from the backend')
      }

      setOperatingUnitsData(buildOperatingUnitRows(response))
      setTotalsRow(buildTotalsRow(response))
      setKpis(buildKPIs(response))
    } catch (err) {
      console.error('[Dashboard] Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      // Keep using default data on error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-3 py-4 sm:px-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="mb-6 flex flex-col items-start justify-between gap-4 md:mb-8 md:flex-row md:items-center">
          <div className="flex-1">
            <h1 className="mb-2 text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">Janatics Group Dashboard</h1>
            <p className="mb-1 text-sm font-medium text-gray-700 sm:text-base">Financial Year Comparison: FY 2026-27 vs FY 2025-26</p>
            <p className="text-xs text-gray-500 sm:text-sm">* As on date: 04-May-2026 | All values in Indian Rupees (₹ Crores)</p>
          </div>
        </div>

        {isLoading && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Loading dashboard data...
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Unable to load live dashboard data. Showing fallback values. {error}
          </div>
        )}

        {/* KPI Cards Grid */}
        <div className="mb-8 grid gap-4 md:grid-cols-3 md:gap-6">
          {/* Group Turnover Card */}
          <Card className="border border-gray-200 border-l-4 border-l-blue-500 bg-white p-4 shadow-md sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-blue-100 p-2">
                <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Group Turnover *</h3>
                <p className="text-xs text-gray-500">As on 04-May-2026</p>
              </div>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg bg-blue-50 p-4 sm:grid-cols-2 sm:gap-4">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Current FY</p>
                <p className="break-words text-xl font-bold text-blue-600 sm:text-2xl">₹{kpis.groupTurnover.currentFY}</p>
                <p className="text-xs text-gray-500">Crores</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Previous FY</p>
                <p className="break-words text-xl font-bold text-blue-400 sm:text-2xl">₹{kpis.groupTurnover.previousFY}</p>
                <p className="text-xs text-gray-500">Crores</p>
              </div>
            </div>
            <div className="inline-flex rounded-full bg-emerald-100 px-3 py-1">
              <span className="text-sm font-semibold text-emerald-700">{formatTrend(kpis.groupTurnover.growth)} Growth</span>
            </div>
          </Card>

          {/* Pending Orders Card */}
          <Card className="border border-gray-200 border-l-4 border-l-amber-500 bg-white p-4 shadow-md sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-amber-100 p-2">
                <svg className="h-5 w-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267.221-.071.460-.119.712-.119.251 0 .491.048.712.119.22.071.411.164.567.267.154.103.249.223.286.353h3.401c.077-.175.156-.451.156-.843 0-.88-.646-1.603-1.8-1.603-.588 0-1.086.115-1.45.34-.31-.283-.677-.422-1.102-.422-.439 0-.809.139-1.112.422-.364-.225-.862-.34-1.45-.34-1.154 0-1.8.723-1.8 1.603 0 .392.079.668.156.843h3.401c.037-.13.132-.25.286-.353zM13.75 7.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm2-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2z" /></svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Pending Orders *</h3>
                <p className="text-xs text-gray-500">04-May-2026</p>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg bg-amber-50 p-4">
              <p className="text-xs font-medium text-gray-600 mb-2">Current FY 2026-27</p>
              <p className="break-words text-center text-2xl font-bold text-amber-600 sm:text-3xl">₹{kpis.pendingOrders}</p>
              <p className="text-xs text-gray-500">Crores (INR)</p>
            </div>
          </Card>

          {/* Inventory Value Card */}
          <Card className="border border-gray-200 border-l-4 border-l-emerald-500 bg-white p-4 shadow-md sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-emerald-100 p-2">
                <svg className="h-5 w-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" /></svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Inventory Value *</h3>
                <p className="text-xs text-gray-500">04-May-2026</p>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg bg-emerald-50 p-4">
              <p className="text-xs font-medium text-gray-600 mb-2">As on Date</p>
              <p className="break-words text-center text-2xl font-bold text-emerald-600 sm:text-3xl">₹{kpis.inventoryValue}</p>
              <p className="text-xs text-gray-500">Crores (INR)</p>
            </div>
          </Card>
        </div>

        {/* Data Table Section */}
        <div className="mb-6 overflow-hidden rounded-lg bg-white shadow-sm">
          {/* Table Header Banner */}
          <div className="bg-gradient-to-r from-blue-950 to-blue-900 px-4 py-4 sm:px-6">
            <h2 className="text-base font-bold text-white sm:text-lg">Operating Units Performance Comparison</h2>
            <p className="mt-1 text-xs text-blue-100">* As on date: 04-May-2026 | Values in ₹ Crores (INR)</p>
          </div>

          <div className="space-y-4 p-4 md:hidden">
            {operatingUnitsData.map((row, idx) => (
              <Card key={`${row.unit}-${idx}`} className="border border-slate-200 bg-slate-50 p-4 shadow-none">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold leading-5 text-slate-900">{row.unit}</h3>
                    <p className="mt-1 text-xs text-slate-500">FY comparison and pending orders</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                    {formatTrend(row.trend)}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Turnover FY 2026-27</p>
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-600">As on date</span>
                      <span className="font-bold text-blue-900">₹{row.to_fy27_date}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-600">Current month</span>
                      <span className="font-semibold text-blue-700">₹{row.to_fy27_month}</span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Turnover FY 2025-26</p>
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-600">As on date</span>
                      <span className="font-bold text-blue-900">₹{row.to_fy26_date}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-600">Current month</span>
                      <span className="font-semibold text-blue-700">₹{row.to_fy26_month}</span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-amber-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Pending Orders</p>
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-600">As on date</span>
                      <span className="font-bold text-amber-900">₹{row.po_date}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-600">Current month</span>
                      <span className="font-semibold text-amber-700">₹{row.po_month}</span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-emerald-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Inventory</p>
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-600">As on date</span>
                      <span className="font-bold text-emerald-900">₹{row.inv}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            <Card className="border border-slate-900 bg-slate-900 p-4 text-white shadow-none">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold">TOTAL</h3>
                <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white">
                  {formatTrend(totalsRow.trend)}
                </span>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3 rounded-lg bg-white/8 px-3 py-2">
                  <span className="text-slate-300">FY 2026-27</span>
                  <span className="font-bold">₹{totalsRow.to_fy27_date}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg bg-white/8 px-3 py-2">
                  <span className="text-slate-300">FY 2025-26</span>
                  <span className="font-bold">₹{totalsRow.to_fy26_date}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg bg-white/8 px-3 py-2">
                  <span className="text-slate-300">Pending Orders</span>
                  <span className="font-bold">₹{totalsRow.po_date}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg bg-white/8 px-3 py-2">
                  <span className="text-slate-300">Inventory</span>
                  <span className="font-bold">₹{totalsRow.inv}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Table Container */}
          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[980px]">
              <TableHeader className="bg-gradient-to-r from-slate-800 to-slate-700">
                <TableRow className="border-b-2 border-slate-600">
                  <TableHead className="w-48 whitespace-nowrap px-4 py-4 text-left font-bold text-white text-sm">
                    Operating Unit
                  </TableHead>
                  <TableHead colSpan={5} className="px-4 py-4 text-center font-bold text-white text-sm bg-blue-600">
                    Turnover (₹ Cr)
                  </TableHead>
                  <TableHead colSpan={2} className="px-4 py-4 text-center font-bold text-white text-sm bg-amber-500">
                    Pending Orders (₹ Cr)
                  </TableHead>
                  <TableHead className="px-4 py-4 text-center font-bold text-white text-sm bg-emerald-600">
                    Inventory * (₹ Cr)
                  </TableHead>
                </TableRow>
                <TableRow className="border-b border-slate-600 bg-slate-700">
                  <TableHead className="px-4 py-2"></TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-2 text-center text-xs font-semibold text-blue-100 bg-blue-500">
                    As on Date *
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-2 text-center text-xs font-semibold text-blue-50 bg-blue-400">
                    Current Month
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-2 text-center text-xs font-semibold text-blue-100 bg-blue-500">
                    As on Date *
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-2 text-center text-xs font-semibold text-blue-50 bg-blue-400">
                    Current Month
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-2 text-center text-xs font-semibold text-emerald-100 bg-emerald-500">
                    Trend %
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-2 text-center text-xs font-semibold text-amber-100 bg-amber-500">
                    As on Date *
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-2 text-center text-xs font-semibold text-amber-50 bg-amber-400">
                    Current Month
                  </TableHead>
                  <TableHead className="px-4 py-2 text-center text-xs font-semibold text-emerald-100 bg-emerald-500">
                    As on Date *
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operatingUnitsData.map((row, idx) => (
                  <TableRow key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                    <TableCell className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-gray-900 hover:bg-gray-50">
                      {row.unit}
                    </TableCell>
                    <TableCell className="whitespace-nowrap bg-blue-50 px-4 py-3 text-right font-variant-numeric tabular-nums text-blue-700 font-medium">
                      ₹{row.to_fy27_date}
                    </TableCell>
                    <TableCell className="whitespace-nowrap bg-blue-25 px-4 py-3 text-right font-variant-numeric tabular-nums text-blue-600">
                      ₹{row.to_fy27_month}
                    </TableCell>
                    <TableCell className="whitespace-nowrap bg-blue-50 px-4 py-3 text-right font-variant-numeric tabular-nums text-blue-700 font-medium">
                      ₹{row.to_fy26_date}
                    </TableCell>
                    <TableCell className="whitespace-nowrap bg-blue-25 px-4 py-3 text-right font-variant-numeric tabular-nums text-blue-600">
                      ₹{row.to_fy26_month}
                    </TableCell>
                    <TableCell className="whitespace-nowrap bg-emerald-100 px-4 py-3 text-center">
                      <span className="inline-flex rounded-full bg-emerald-200 px-2 py-1 text-xs font-bold text-emerald-800">
                        {formatTrend(row.trend)}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap bg-amber-50 px-4 py-3 text-right font-variant-numeric tabular-nums text-amber-700 font-medium">
                      ₹{row.po_date}
                    </TableCell>
                    <TableCell className="whitespace-nowrap bg-amber-25 px-4 py-3 text-right font-variant-numeric tabular-nums text-amber-600">
                      ₹{row.po_month}
                    </TableCell>
                    <TableCell className="whitespace-nowrap bg-emerald-50 px-4 py-3 text-right font-variant-numeric tabular-nums text-emerald-700 font-medium">
                      ₹{row.inv}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total Footer Row */}
                <TableRow className="border-t-2 border-gray-300 bg-gray-800 font-bold text-white">
                  <TableCell className="sticky left-0 z-10 bg-gray-800 px-4 py-3 text-white">TOTAL</TableCell>
                  <TableCell className="whitespace-nowrap bg-blue-500 px-4 py-3 text-right font-variant-numeric tabular-nums text-white">
                    ₹{totalsRow.to_fy27_date}
                  </TableCell>
                  <TableCell className="whitespace-nowrap bg-blue-400 px-4 py-3 text-right font-variant-numeric tabular-nums text-blue-50">
                    ₹{totalsRow.to_fy27_month}
                  </TableCell>
                  <TableCell className="whitespace-nowrap bg-blue-500 px-4 py-3 text-right font-variant-numeric tabular-nums text-white">
                    ₹{totalsRow.to_fy26_date}
                  </TableCell>
                  <TableCell className="whitespace-nowrap bg-blue-400 px-4 py-3 text-right font-variant-numeric tabular-nums text-blue-50">
                    ₹{totalsRow.to_fy26_month}
                  </TableCell>
                  <TableCell className="whitespace-nowrap bg-emerald-500 px-4 py-3 text-center">
                    <span className="inline-flex rounded-full bg-emerald-600 px-2 py-1 text-xs font-bold text-white">
                      {formatTrend(totalsRow.trend)}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap bg-amber-500 px-4 py-3 text-right font-variant-numeric tabular-nums text-white">
                    ₹{totalsRow.po_date}
                  </TableCell>
                  <TableCell className="whitespace-nowrap bg-amber-400 px-4 py-3 text-right font-variant-numeric tabular-nums text-amber-50">
                    ₹{totalsRow.po_month}
                  </TableCell>
                  <TableCell className="whitespace-nowrap bg-emerald-500 px-4 py-3 text-right font-variant-numeric tabular-nums text-white">
                    ₹{totalsRow.inv}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </main>
  )
}
