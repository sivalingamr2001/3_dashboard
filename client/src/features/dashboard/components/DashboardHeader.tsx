import { AS_ON_DATE } from "@/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { useSales } from "../hooks/useSales"

export const DashboardHeader = () => {
  const { refetch } = useSales({ limit: 100 });

  const handleRefresh = () => {
    refetch();
  }

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
      <div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          Refresh Data
        </Button>
      </div>
    </div>
  )
}
