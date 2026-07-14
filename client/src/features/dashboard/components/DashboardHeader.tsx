import { useAuth } from "@/context/AuthContext";
import { useSales } from "@/context/SalesContext";
import { getCurrentFinancialYear, getPreviousFinancialYear } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { LogOutIcon } from "lucide-react";
import { useState } from "react";
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
  const { asOnDate } = useSales();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isMobile = window.innerWidth <= 768;

  return (
    <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">
          Janatics Dashboard
        </h1>
        <p className="mt-1 text-base font-medium text-slate-600">
          Financial Year Comparison: FY {currentFY} vs FY {previousFY}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          * As on date: {asOnDate} | All values in Indian Rupees (₹ Crores)
        </p>
      </div>
      <div
        className={`flex gap-2 ${isMobile ? "w-full justify-between" : "justify-center"}`}
      >
        <Button
          size="lg"
          onClick={onToggleIntraSales}
          variant={inclIntraSales ? "default" : "outline"}
          className="rounded-[8px] border-slate-300 px-4 text-sm font-semibold whitespace-nowrap text-slate-700 shadow-sm"
        >
          {inclIntraSales ? "✓ " : ""}Incl Intra Sales
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="lg"
              className="rounded-[8px] px-4 whitespace-nowrap"
              onClick={handleLogout}
            >
              <LogOutIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            <p className="text-xs">Log out</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};
