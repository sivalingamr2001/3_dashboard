import {
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"

export const OperatingUnitsTableHeader = () => {
  return (
    <TableHeader className="select-none border-none">
      
      {/* LEVEL 1 — Macro Categories */}
      <TableRow className="border-none bg-[#1e293b] hover:bg-[#1e293b]">
        {/* Forces this block down through all three header rows */}
        <TableHead rowSpan={3} className="min-w-[320px] text-left text-xs font-bold text-white px-4 align-middle border-r border-slate-700/30">
          Operating Unit
        </TableHead>
        
        <TableHead colSpan={4} className="text-center text-xs font-semibold text-white py-1.5 border-r border-slate-700/30">
          Turnover (₹ Cr)
        </TableHead>

        {/* Level 1 Empty Header Slot for Trend (Row 2 will populate this column) */}
        <TableHead className="bg-[#1e293b] p-0 m-0 border-r border-slate-700/30"></TableHead>

        <TableHead colSpan={2} className="text-center text-xs font-semibold text-white py-1.5 border-r border-slate-700/30">
          Pending Orders (₹ Cr)
        </TableHead>

        {/* Forces Inventory down through all three header rows */}
        <TableHead rowSpan={3} className="min-w-[120px] text-center text-xs font-semibold text-white px-4 align-middle bg-[#1e293b]">
          Inventory * <br /><span className="text-[10px] font-normal lowercase opacity-80">(₹ cr)</span>
        </TableHead>
      </TableRow>

      {/* LEVEL 2 — Fiscal Year Grouping & Trend Banners */}
      <TableRow className="border-none bg-[#1e293b] hover:bg-[#1e293b]">
        {/* Turnover Sub-categories */}
        <TableHead colSpan={2} className="bg-[#2563eb] text-center text-[11px] font-medium text-white py-1 border-r border-blue-400/20">
          FY 2026-27
        </TableHead>
        <TableHead colSpan={2} className="bg-[#475569] text-center text-[11px] font-medium text-white py-1 border-r border-slate-600/30">
          FY 2025-26
        </TableHead>

        {/* Trend Banner sitting on Level 2 (Spans down to Level 3) */}
        <TableHead rowSpan={2} className="bg-[#10b981] text-center text-xs font-semibold text-white px-4 align-middle border-r border-emerald-600/30 min-w-[90px]">
          <span className="block font-medium text-[11px]">Trend</span>
          <span className="block text-[10px] font-normal text-emerald-100 uppercase tracking-normal mt-0.5">YoY %</span>
        </TableHead>

        {/* Pending Orders Sub-category */}
        <TableHead colSpan={2} className="bg-[#2563eb] text-center text-[11px] font-medium text-white py-1">
          FY 2026-27
        </TableHead>
      </TableRow>

      {/* LEVEL 3 — Micro Sub-Headers */}
      <TableRow className="border-none bg-[#3b82f6] text-[10px] font-medium text-white">
        {/* 4 Turnover columns */}
        <TableHead className="bg-[#3b82f6] text-center py-1 border-r border-blue-400/20">As on Date *</TableHead>
        <TableHead className="bg-[#3b82f6] text-center py-1 border-r border-blue-500">Current Month</TableHead>
        <TableHead className="bg-[#64748b] text-center py-1 border-r border-slate-500/30">As on Date *</TableHead>
        <TableHead className="bg-[#64748b] text-center py-1 border-r border-slate-600">Current Month</TableHead>

        {/* 2 Pending Orders columns */}
        <TableHead className="bg-[#3b82f6] text-center py-1 border-r border-blue-400/20">As on Date *</TableHead>
        <TableHead className="bg-[#3b82f6] text-center py-1">Current Month</TableHead>
      </TableRow>

    </TableHeader>
  )
}
