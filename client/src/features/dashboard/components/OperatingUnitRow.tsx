import { TableCell, TableRow } from "@/shared/components/ui/table"
import { TrendingDown, TrendingUp } from "lucide-react"
import type { OperatingUnit } from "@/features/dashboard/types/dashboard.types"

type Props = {
  row: OperatingUnit
}

export const OperatingUnitRow = ({ row }: Props) => {
  return (
    <TableRow className="border-b border-slate-100">
      <TableCell className="border-r border-slate-100 bg-white px-4 py-3.5 font-semibold text-slate-800 text-xs lg:text-sm normal-case tracking-tight max-w-[340px] break-words whitespace-normal inline-block md:table-cell">
        {row.unit}
      </TableCell>

      <TableCell className="border-r border-slate-100 bg-[#f1f5f9] px-3 py-3.5 text-right font-semibold tabular-nums text-blue-600 text-xs lg:text-sm whitespace-nowrap">
        ₹{row.to_fy27_date}
      </TableCell>
      <TableCell className="border-r border-slate-100 bg-[#f8fafc] px-3 py-3.5 text-right font-medium tabular-nums text-blue-500 text-xs lg:text-sm whitespace-nowrap">
        ₹{row.to_fy27_month}
      </TableCell>
      <TableCell className="border-r border-slate-100 bg-[#f1f5f9] px-3 py-3.5 text-right font-medium tabular-nums text-slate-600 text-xs lg:text-sm whitespace-nowrap">
        ₹{row.to_fy26_date}
      </TableCell>
      <TableCell className="border-r border-slate-100 bg-[#f8fafc] px-3 py-3.5 text-right font-medium tabular-nums text-slate-500 text-xs lg:text-sm whitespace-nowrap">
        ₹{row.to_fy26_month}
      </TableCell>

      <TableCell className="border-r border-slate-100 bg-[#ecfdf5] px-2 py-3.5 text-center whitespace-nowrap">
        <span className="inline-flex items-center rounded-full bg-[#d1fae5] px-2.5 py-1 text-[11px] font-bold text-emerald-700">
          <TrendingUp className="h-3.5 w-3.5 mr-0.5 shrink-0" /> {row.trend}% <TrendingDown className="h-3.5 w-3.5" />
        </span>
      </TableCell>

      <TableCell className="border-r border-slate-100 bg-[#fffbeb] px-3 py-3.5 text-right font-semibold tabular-nums text-amber-700 text-xs lg:text-sm whitespace-nowrap">
        ₹{row.po_date}
      </TableCell>
      <TableCell className="border-r border-slate-100 bg-[#fffdfa] px-3 py-3.5 text-right font-medium tabular-nums text-amber-600 text-xs lg:text-sm whitespace-nowrap">
        ₹{row.po_month}
      </TableCell>

      <TableCell className="bg-[#f0fdf4] px-4 py-3.5 text-right font-semibold tabular-nums text-emerald-700 text-xs lg:text-sm whitespace-nowrap">
        ₹{row.inv}
      </TableCell>
    </TableRow>
  )
}
