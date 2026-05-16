import {
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"

export const OperatingUnitsTableHeader = () => {
  return (
    <TableHeader>
      {/* Level 1 — segment group labels */}
      <TableRow className="border-none bg-[#243143] hover:bg-[#243143]">
        <TableHead className="flex justify-center mt-10 min-w-70 lg:min-w-[320px] border-r border-slate-700 text-left text-lg font-bold text-white px-4">
          Operating Unit
        </TableHead>
        <TableHead colSpan={5} className="border-r border-slate-700 text-center text-lg font-bold text-white px-2">
          Turnover (₹ Cr)
        </TableHead>
        <TableHead colSpan={2} className="border-r border-slate-700 text-center text-lg font-bold text-white px-2">
          Pending Orders (₹ Cr)
        </TableHead>
        <TableHead className="flex justify-center mt-10 flex-col text-center text-lg font-bold text-white px-4">
          Inventory *<br /><span className="text-xs font-normal text-slate-400">(₹ Cr)</span>
        </TableHead>
      </TableRow>

      {/* Level 2 — individual column labels */}
      <TableRow className="border-b border-slate-200 bg-[#2c3b50] hover:bg-[#2c3b50] text-sm font-semibold text-slate-200">
        <TableHead className="bg-[#243143] border-r border-slate-700 px-4 py-4" />

        <TableHead className="border-r border-slate-700/50 bg-[#2575fc] text-center px-3 py-3 text-white font-bold text-xs lg:text-sm whitespace-nowrap">
          FY 2026-27<br /><span className="text-[10px] font-normal text-blue-100">As on Date *</span>
        </TableHead>
        <TableHead className="border-r border-slate-700/50 bg-[#1a66ff] text-center px-3 py-3 text-white font-bold text-xs lg:text-sm whitespace-nowrap">
          FY 2026-27<br /><span className="text-[10px] font-normal text-blue-100">Current Month</span>
        </TableHead>
        <TableHead className="border-r border-slate-700/50 bg-[#4b5563] text-center px-3 py-3 text-slate-100 font-bold text-xs lg:text-sm whitespace-nowrap">
          FY 2025-26<br /><span className="text-[10px] font-normal text-slate-300">As on Date *</span>
        </TableHead>
        <TableHead className="border-r border-slate-700 bg-[#374151] text-center px-3 py-3 text-slate-100 font-bold text-xs lg:text-sm whitespace-nowrap">
          FY 2025-26<br /><span className="text-[10px] font-normal text-slate-300">Current Month</span>
        </TableHead>

        <TableHead className="border-r border-slate-700 bg-[#10b981] text-center px-3 py-3 text-white font-bold text-xs lg:text-sm whitespace-nowrap">
          Trend<br /><span className="text-[10px] font-normal text-emerald-100">YoY %</span>
        </TableHead>

        <TableHead className="border-r border-slate-700/50 bg-[#f39c12] text-center px-3 py-3 text-white font-bold text-xs lg:text-sm whitespace-nowrap">
          FY 2026-27<br /><span className="text-[10px] font-normal text-amber-100">As on Date *</span>
        </TableHead>
        <TableHead className="border-r border-slate-700 bg-[#d35400] text-center px-3 py-3 text-white font-bold text-xs lg:text-sm whitespace-nowrap">
          FY 2026-27<br /><span className="text-[10px] font-normal text-amber-100">Current Month</span>
        </TableHead>

        <TableHead className="px-4 py-4 bg-[#243143]" />
      </TableRow>
    </TableHeader>
  )
}
