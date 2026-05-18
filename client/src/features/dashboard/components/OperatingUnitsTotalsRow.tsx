import { TableCell, TableRow } from "@/shared/components/ui/table"
import { TrendingUp } from "lucide-react"
import type { TotalsRow } from "@/features/dashboard/types/dashboard.types"

type Props = {
  totals: TotalsRow
}

export const OperatingUnitsTotalsRow = ({ totals }: Props) => {
  return (
    <TableRow className="border-none font-bold text-white bg-[#1a2536] hover:bg-[#1a2536] text-xs lg:text-sm">
      <TableCell className="border-r border-slate-700 px-4 py-4 text-white font-bold">
        TOTAL
      </TableCell>

      <TableCell className="border-r border-slate-700/50 bg-[#1e40af] px-3 py-4 text-right font-bold tabular-nums text-blue-100 whitespace-nowrap">
        ₹{totals.to_fy27_date}
      </TableCell>
      <TableCell className="border-r border-slate-700/50 bg-[#1d4ed8] px-3 py-4 text-right font-bold tabular-nums text-white whitespace-nowrap">
        ₹{totals.to_fy27_month}
      </TableCell>
      <TableCell className="border-r border-slate-700/50 bg-[#374151] px-3 py-4 text-right font-bold tabular-nums text-slate-200 whitespace-nowrap">
        ₹{totals.to_fy26_date}
      </TableCell>
      <TableCell className="border-r border-slate-700 bg-[#4b5563] px-3 py-4 text-right font-bold tabular-nums text-white whitespace-nowrap">
        ₹{totals.to_fy26_month}
      </TableCell>

      <TableCell className="border-r border-slate-700 bg-[#065f46] px-2 py-4 text-center whitespace-nowrap">
        <span className="inline-flex items-center rounded-full bg-[#10b981] px-2.5 py-1 text-[11px] font-bold text-white">
          <TrendingUp className="h-3.5 w-3.5 mr-0.5 shrink-0" /> {totals.trend}%
        </span>
      </TableCell>

      <TableCell className="border-r border-slate-700/50 bg-[#9a3412] px-3 py-4 text-right font-bold tabular-nums text-amber-100 whitespace-nowrap">
        ₹{totals.po_date}
      </TableCell>
      <TableCell className="border-r border-slate-700 bg-[#b45309] px-3 py-4 text-right font-bold tabular-nums text-white whitespace-nowrap">
        ₹{totals.po_month}
      </TableCell>

      <TableCell className="bg-[#0f2d1e] px-4 py-4 text-right font-bold tabular-nums text-emerald-400 whitespace-nowrap">
        ₹{totals.inv}
      </TableCell>
    </TableRow>
  )
}
