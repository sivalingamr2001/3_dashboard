import { useEffect, useState } from "react";
import { useSales } from "@/context/SalesContext";
import { DashboardHeader } from "../components/DashboardHeader";
import { KpiCards } from "../components/KpiCards";
import { OperatingUnitsTable } from "../components/OperatingUnitsTable";
import { PageLoader } from "@/shared/components/LoadingSpinner/LoadingSpinner";
import type { TotalsRow } from "@/features/dashboard/types/dashboard.types";

export const DashboardPage = () => {
  const {
    rows,
    totals,
    loading,
    sales,
    fetchSales,
    inclIntraSales,
    toggleIntraSales,
  } = useSales();
  const [selectedTotals, setSelectedTotals] = useState<TotalsRow | null>(null);

  const isOverlayLoading = sales.length > 0 && loading;
  const displayedTotals = selectedTotals ?? totals;

  useEffect(() => {
    setSelectedTotals(null);
  }, [totals]);

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

  if (sales.length === 0 && loading) {
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
        <DashboardHeader
          onRefresh={fetchSales}
          isRefreshing={loading}
          inclIntraSales={inclIntraSales}
          onToggleIntraSales={toggleIntraSales}
        />
        <KpiCards totals={displayedTotals} />
        <OperatingUnitsTable
          rows={rows}
          onSelectionTotalsChange={setSelectedTotals}
        />
      </div>

      {isOverlayLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 backdrop-blur-sm">
          <PageLoader />
        </div>
      ) : null}
    </main>
  );
};
