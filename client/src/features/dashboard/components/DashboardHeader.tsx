import { Button } from "@/shared/components/ui/button"
import { AS_ON_DATE } from "@/features/dashboard/api/dashboardApi"

type Props = {
  inclIntraSales: boolean
  onToggleIntraSales: () => void
}

export const DashboardHeader = ({ inclIntraSales, onToggleIntraSales }: Props) => {
  return (
    <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Janatics Group Dashboard
        </h1>
        <p className="text-base font-medium text-slate-600 mt-1">
          Financial Year Comparison: FY 2026-27 vs FY 2025-26
        </p>
        <p className="text-sm text-slate-400 mt-1">
          * As on date: {AS_ON_DATE} | All values in Indian Rupees (₹ Crores)
        </p>
      </div>
      <Button
        onClick={onToggleIntraSales}
        variant={inclIntraSales ? "outline" : "default"}
        className="whitespace-nowrap border-slate-300 text-slate-700 h-10 px-4 text-sm font-semibold shadow-sm"
      >
        {inclIntraSales ? "✓ " : ""}Incl Intra Sales
      </Button>
    </div>
  )
}
