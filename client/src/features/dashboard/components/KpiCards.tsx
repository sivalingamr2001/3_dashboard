import { Card } from "@/shared/components/ui/card"
import { IndianRupee, Package, Warehouse, TrendingUp } from "lucide-react"
import type { TotalsRow } from "@/features/dashboard/types/dashboard.types"
import { AS_ON_DATE } from "@/features/dashboard/api/dashboardApi"

type Props = {
  totals: TotalsRow
}

export const KpiCards = ({ totals }: Props) => {
  return (
    <div className="mb-8 grid gap-6 md:grid-cols-3">
      {/* Group Turnover */}
      <Card className="border border-blue-100 bg-white p-6 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-50 p-3 flex items-center justify-center border border-blue-100">
              <IndianRupee className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Group Turnover *</h3>
              <p className="text-xs text-slate-400 font-medium">As on {AS_ON_DATE}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="bg-[#f4f7fd] p-4 flex flex-col items-center justify-center rounded-lg border border-blue-50/50">
              <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">Current FY</p>
              <p className="text-2xl font-extrabold text-blue-600 mt-1">₹{totals.to_fy27_date}</p>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">Crores</p>
            </div>
            <div className="bg-[#f8f9fa] p-4 flex flex-col items-center justify-center rounded-lg border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Previous FY</p>
              <p className="text-2xl font-extrabold text-slate-700 mt-1">₹{totals.to_fy26_date}</p>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">Crores</p>
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00c853] px-4 py-1.5 text-xs font-bold text-white shadow-sm">
            <TrendingUp className="h-3.5 w-3.5" />
            +{totals.trend}% Growth
          </span>
        </div>
      </Card>

      {/* Pending Orders */}
      <Card className="border border-amber-100 bg-white p-6 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full bg-amber-50 p-3 flex items-center justify-center border border-amber-100">
            <Package className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Pending Orders *</h3>
            <p className="text-xs text-slate-400 font-medium">{AS_ON_DATE}</p>
          </div>
        </div>
        <div className="bg-[#fff9f2] border border-amber-200/70 rounded-xl p-5 flex flex-col items-center justify-center text-center h-[130px]">
          <p className="text-xs font-bold text-amber-700/80 uppercase tracking-wider">Current FY 2026-27</p>
          <p className="text-4xl font-black text-[#e67e22] mt-1.5">₹{totals.po_date}</p>
          <p className="text-xs font-bold text-amber-600/70 mt-1">Crores (INR)</p>
        </div>
      </Card>

      {/* Inventory Value */}
      <Card className="border border-emerald-100 bg-white p-6 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full bg-emerald-50 p-3 flex items-center justify-center border border-emerald-100">
            <Warehouse className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Inventory Value *</h3>
            <p className="text-xs text-slate-400 font-medium">{AS_ON_DATE}</p>
          </div>
        </div>
        <div className="bg-[#f3fbf6] border border-emerald-200/70 rounded-xl p-5 flex flex-col items-center justify-center text-center h-[130px]">
          <p className="text-xs font-bold text-emerald-700/80 uppercase tracking-wider">As on Date</p>
          <p className="text-4xl font-black text-[#2e7d32] mt-1.5">₹{totals.inv}</p>
          <p className="text-xs font-bold text-emerald-600/70 mt-1">Crores (INR)</p>
        </div>
      </Card>
    </div>
  )
}
