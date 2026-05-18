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
  const { data: salesResponse, isLoading } = useSales({ limit: 100 });

  const units = salesResponse?.rows ?? []
  const totals = salesResponse?.totals ?? EMPTY_TOTALS

  if (isLoading) {
    return (
      <main className="h-screen bg-[#f8fafc] p-6 md:p-8">
        <div className="mx-auto max-w-8xl flex items-center justify-center h-96">
          <PageLoader />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <DashboardHeader />
        <KpiCards totals={totals} />
        <OperatingUnitsTable rows={units} totals={totals} />
      </div>
    </main>
  );
};
