import { TableCell, TableRow } from "@/shared/components/ui/table"
import { TrendingDown, TrendingUp } from "lucide-react"
import type { TotalsRow } from "@/features/dashboard/types/dashboard.types"

type Props = {
  totals: TotalsRow
}

const getTotalsTrendBadge = (trend: string) => {
  const value = Number(trend)
  if (value > 0) {
    return {
      icon: <TrendingUp className="h-3 w-3 shrink-0" />,
      cellClass: "bg-[#10b981] border-r border-emerald-600",
      badgeClass: "bg-emerald-700 text-white",
    }
  }

  if (value < 0) {
    return {
      icon: <TrendingDown className="h-3.5 w-3.5" />,
      cellClass: "bg-[#fee2e2] border-r border-rose-600",
      badgeClass: "bg-rose-700 text-white",
    }
  }

  return {
    icon: <span className="inline-flex h-3.5 w-3.5 items-center justify-center text-xs">=</span>,
    cellClass: "bg-[#fef3c7] border-r border-amber-500",
    badgeClass: "bg-amber-400 text-slate-900",
  }
}

export const OperatingUnitsTotalsRow = ({ totals }: Props) => {
  const trendBadge = getTotalsTrendBadge(totals.trend)
  return (
    <TableRow className="border-none font-bold bg-[#e2e8f0] text-xs lg:text-sm hover:bg-[#e2e8f0] select-none text-[#0f172a]">
      
      {/* 1. Title */}
      <TableCell className="text-left font-bold uppercase tracking-wider px-4 py-3.5 border-r border-slate-300">
        TOTAL
      </TableCell>

      {/* 2. FY 26-27 Turnover (As on Date) */}
      <TableCell className="bg-[#dbeafe] text-center tabular-nums font-bold text-blue-700 py-3.5 px-3 border-r border-blue-200/60 whitespace-nowrap">
        ₹{totals.to_fy27_date}
      </TableCell>

      {/* 3. FY 26-27 Turnover (Current Month) */}
      <TableCell className="bg-[#dbeafe] text-center tabular-nums font-bold text-blue-700 py-3.5 px-3 border-r border-slate-300 whitespace-nowrap">
        ₹{totals.to_fy27_month}
      </TableCell>

      {/* 4. FY 25-26 Turnover (As on Date) */}
      <TableCell className="text-center tabular-nums font-bold text-[#334155] py-3.5 px-3 border-r border-slate-300 whitespace-nowrap">
        ₹{totals.to_fy26_date}
      </TableCell>

      {/* 5. FY 25-26 Turnover (Current Month) */}
      <TableCell className="text-center tabular-nums font-bold text-[#334155] py-3.5 px-3 border-r border-slate-300 whitespace-nowrap">
        ₹{totals.to_fy26_month}
      </TableCell>

      {/* 6. YoY Trend Highlight Badge Container */}
      <TableCell className={`${trendBadge.cellClass} text-center border-red-100 py-2 px-3 whitespace-nowrap align-middle`}>
        <span className={`inline-flex items-center justify-center gap-0.5 rounded-full px-2.5 py-1 text-xs font-bold min-w-18 ${trendBadge.badgeClass}`}>
          {trendBadge.icon} {totals.trend}%
        </span>
      </TableCell>

      {/* 7. FY 26-27 Pending Orders (As on Date) */}
      <TableCell className="bg-[#fef3c7] text-center tabular-nums font-bold text-amber-700 py-3.5 px-3 border-r border-amber-200/60 whitespace-nowrap">
        ₹{totals.po_date}
      </TableCell>

      {/* 8. FY 26-27 Pending Orders (Current Month) */}
      <TableCell className="bg-[#fef3c7] text-center tabular-nums font-bold text-amber-700 py-3.5 px-3 border-r border-slate-300 whitespace-nowrap">
        ₹{totals.po_month}
      </TableCell>

      {/* 9. Inventory */}
      <TableCell className="bg-[#dcfce7] text-center tabular-nums font-bold text-emerald-700 py-3.5 px-4 whitespace-nowrap">
        ₹{totals.inv}
      </TableCell>

    </TableRow>
  )
}
