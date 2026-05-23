import { useAuth } from "@/context/AuthContext";
import {
  AS_ON_DATE,
  getCurrentFinancialYear,
  getPreviousFinancialYear,
} from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { useNavigate } from "react-router-dom";

type DashboardHeaderProps = {
  inclIntraSales: boolean;
  onToggleIntraSales: () => void;
};

export const DashboardHeader = ({
  inclIntraSales,
  onToggleIntraSales,
}: DashboardHeaderProps) => {
  const currentFY = getCurrentFinancialYear();
  const previousFY = getPreviousFinancialYear();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isMobile = window.innerWidth <= 768;

  return (
    <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Janatics Group Dashboard
        </h1>
        <p className="mt-1 text-base font-medium text-slate-600">
          Financial Year Comparison: FY {currentFY} vs FY {previousFY}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          * As on date: {AS_ON_DATE} | All values in Indian Rupees (₹ Crores)
        </p>
      </div>
      <div
        className={`flex gap-2 ${isMobile ? "w-full justify-between" : "justify-center"}`}
      >
        <Button
          onClick={onToggleIntraSales}
          variant={inclIntraSales ? "default" : "outline"}
          className="h-10 border-slate-300 px-4 text-sm font-semibold whitespace-nowrap text-slate-700 shadow-sm"
        >
          {inclIntraSales ? "✓ " : ""}Incl Intra Sales
        </Button>
        <Button
          variant="destructive"
          className="h-10 px-4 whitespace-nowrap"
          onClick={handleLogout}
        >
          Logout
        </Button>
      </div>
    </div>
  );
};
