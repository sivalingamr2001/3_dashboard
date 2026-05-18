import { Table, TableBody } from "@/shared/components/ui/table"
import type { OperatingUnit, TotalsRow } from "@/features/dashboard/types/dashboard.types"
import { OperatingUnitsTableHeader } from "./OperatingUnitsTableHeader"
import { OperatingUnitRow } from "./OperatingUnitRow"
import { OperatingUnitsTotalsRow } from "./OperatingUnitsTotalsRow"
import { AS_ON_DATE } from "@/features/dashboard/api/dashboardApi"

type Props = {
  rows: OperatingUnit[]
  totals: TotalsRow
}

export const OperatingUnitsTable = ({ rows, totals }: Props) => {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.03)] w-full">
      {/* Banner */}
      <div className="bg-[#1a2536] px-6 py-4 flex flex-col justify-center">
        <h2 className="text-base font-bold text-white tracking-wide">
          Operating Units Performance Comparison
        </h2>
        <p className="text-xs font-medium text-slate-400 mt-1">
          * As on date: {AS_ON_DATE} | Values in ₹ Crores (INR)
        </p>
      </div>

      {/* Scrollable table */}
      <div className="w-full overflow-x-auto xl:overflow-x-visible">
        <Table className="w-full table-auto border-collapse">
          <OperatingUnitsTableHeader />
          <TableBody className="text-sm font-medium text-slate-700">
            {rows.map((row, idx) => (
              <OperatingUnitRow key={idx} row={row} />
            ))}
            <OperatingUnitsTotalsRow totals={totals} />
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
