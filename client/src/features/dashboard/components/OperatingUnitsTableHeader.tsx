import { TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { getCurrentFinancialYear, getPreviousFinancialYear } from "@/lib/utils";

export const OperatingUnitsTableHeader = () => {
  const currentFY = getCurrentFinancialYear();
  const previousFY = getPreviousFinancialYear();

  return (
    <TableHeader className="border-none select-none">
      {/* LEVEL 1 — Macro Categories */}
      <TableRow className="border-none bg-[#1e293b] hover:bg-[#1e293b]">
        {/* Forces this block down through all three header rows */}
        <TableHead
          rowSpan={3}
          className="min-w-[320px] border-r border-slate-700/30 px-4 text-left align-middle text-xl font-bold text-white"
        >
          Operating Unit
        </TableHead>

        <TableHead
          colSpan={4}
          className="border-r border-slate-700/30 py-1.5 text-center text-xl font-semibold text-white"
        >
          Turnover (₹ Cr)
        </TableHead>

        {/* Level 1 Empty Header Slot for Trend (Row 2 will populate this column) */}
        <TableHead className="m-0 border-r border-slate-700/30 bg-[#1e293b] p-0"></TableHead>

        <TableHead
          colSpan={2}
          className="border-r border-slate-700/30 py-1.5 text-center text-xl font-semibold text-white"
        >
          Pending Orders (₹ Cr)
        </TableHead>

        {/* Forces Inventory down through all three header rows */}
        <TableHead
          rowSpan={3}
          className="min-w-[120px] bg-[#1e293b] px-4 text-center align-middle text-xl font-semibold text-white"
        >
          Inventory * <br />
          <span className="text-[10px] font-normal lowercase opacity-80">(₹ cr)</span>
        </TableHead>
      </TableRow>

      {/* LEVEL 2 — Fiscal Year Grouping & Trend Banners */}
      <TableRow className="border-none bg-[#1e293b] hover:bg-[#1e293b]">
        {/* Turnover Sub-categories */}
        <TableHead
          colSpan={2}
          className="border-r border-blue-400/20 bg-[#2563eb] py-1 text-center text-[11px] font-medium text-white"
        >
          FY {currentFY}
        </TableHead>
        <TableHead
          colSpan={2}
          className="border-r border-slate-600/30 bg-[#475569] py-1 text-center text-[11px] font-medium text-white"
        >
          FY {previousFY}
        </TableHead>

        {/* Trend Banner sitting on Level 2 (Spans down to Level 3) */}
        <TableHead
          rowSpan={2}
          className="min-w-[90px] border-r border-emerald-600/30 bg-[#10b981] px-4 text-center align-middle text-xl font-semibold text-white"
        >
          <span className="block text-[11px] font-medium">Trend</span>
          <span className="mt-0.5 block text-[10px] font-normal tracking-normal text-emerald-100 uppercase">
            YoY %
          </span>
        </TableHead>

        {/* Pending Orders Sub-category */}
        <TableHead
          colSpan={2}
          className="bg-[#2563eb] py-1 text-center text-[11px] font-medium text-white"
        >
          FY {currentFY}
        </TableHead>
      </TableRow>

      {/* LEVEL 3 — Micro Sub-Headers */}
      <TableRow className="border-none bg-[#3b82f6] text-[10px] font-medium text-white">
        {/* 4 Turnover columns */}
        <TableHead className="border-r border-blue-400/20 bg-[#3b82f6] py-1 text-center text-white">
          As on Date *
        </TableHead>
        <TableHead className="border-r border-blue-500 bg-[#3b82f6] py-1 text-center text-white">
          Current Month
        </TableHead>
        <TableHead className="border-r border-slate-500/30 bg-[#64748b] py-1 text-center text-white">
          As on Date *
        </TableHead>
        <TableHead className="border-r border-slate-50/10 bg-[#64748b] py-1 text-center text-white">
          Current Month
        </TableHead>

        {/* 2 Pending Orders columns */}
        <TableHead className="border-r border-blue-400/20 bg-[#3b82f6] py-1 text-center text-white">
          As on Date *
        </TableHead>
        <TableHead className="bg-[#3b82f6] py-1 text-center text-white">
          Current Month
        </TableHead>
      </TableRow>
    </TableHeader>
  );
};
