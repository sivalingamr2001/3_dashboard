export function DayWiseSalesDashboardFooter() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-6 px-6 pt-1 pb-3">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-slate-400" />
          <span className="text-[11px] font-medium text-slate-500">FY 2025-26</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-emerald-500" />
          <span className="text-[11px] font-medium text-slate-500">FY 2026-27</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-5 px-6 pt-0 pb-6">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-medium text-slate-400">FY 2026-27 actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
          <span className="text-[10px] font-medium text-slate-400">FY 2025-26 reference</span>
        </div>
      </div>
    </>
  );
}
