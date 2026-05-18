import { useEffect, useState } from "react"; // 1. Import useEffect
import { useSales } from "@/features/dashboard/hooks/useSales";
import { DashboardHeader } from "../components/DashboardHeader";
import { KpiCards } from "../components/KpiCards";
import { OperatingUnitsTable } from "../components/OperatingUnitsTable";
import { PageLoader } from "@/shared/components/LoadingSpinner/LoadingSpinner";

const EMPTY_TOTALS = {
  to_fy27_date: "0.00",
  to_fy27_month: "0.00",
  to_fy26_date: "0.00",
  to_fy26_month: "0.00",
  trend: "0",
  po_date: "0.00",
  po_month: "0.00",
  inv: "0.00",
}

export const DashboardPage = () => {
  const [inclIntraSales, setInclIntraSales] = useState(true); // Default to 'Y' (true)
  const stkTfrFlg = inclIntraSales ? "Y" : "N";
  const { data: salesResponse, isLoading, refetch } = useSales({ limit: 100, stkTfrFlg });

  const handleToggleIntraSales = () => {
    setInclIntraSales((prev) => !prev);
  }

  const units = salesResponse?.rows ?? []
  const totals = salesResponse?.totals ?? EMPTY_TOTALS

  // 2. Control body overflow based on overlay loading state
  const isOverlayLoading = !!(salesResponse && isLoading);

  useEffect(() => {
    if (isOverlayLoading) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    // Cleanup function to ensure overflow resets if component unmounts
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOverlayLoading]);

  // Initial Full Page Loader
  if (!salesResponse && isLoading) {
    return (
      <main className="h-screen bg-[#f8fafc] p-6 md:p-8">
        <div className="mx-auto max-w-8xl flex items-center justify-center h-full">
          <PageLoader />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[#f8fafc] p-6 md:p-8">
      <div className={`mx-auto max-w-7xl ${isOverlayLoading ? "opacity-70" : ""}`}>
        <DashboardHeader onRefresh={refetch} isRefreshing={isLoading} inclIntraSales={inclIntraSales}
          onToggleIntraSales={handleToggleIntraSales} />
        <KpiCards totals={totals} />
        <OperatingUnitsTable rows={units} />
      </div>

      {/* 3. Background Overlay Loader */}
      {isOverlayLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 backdrop-blur-sm">
          <PageLoader />
        </div>
      ) : null}
    </main>
  );
};
