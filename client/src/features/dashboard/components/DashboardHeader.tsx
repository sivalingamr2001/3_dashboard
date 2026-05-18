import { useAuth } from "@/context/AuthContext"
import { AS_ON_DATE, getCurrentFinancialYear, getPreviousFinancialYear } from "@/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { useNavigate } from "react-router-dom"

type DashboardHeaderProps = {
  onRefresh: () => void
  isRefreshing?: boolean
  inclIntraSales: boolean
  onToggleIntraSales: () => void
}

export const DashboardHeader = ({ onRefresh, isRefreshing = false, inclIntraSales, onToggleIntraSales }: DashboardHeaderProps) => {
  const currentFY = getCurrentFinancialYear()
  const previousFY = getPreviousFinancialYear()
  const { logout } = useAuth()
  const navigate = useNavigate();

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const isMobile = window.innerWidth <= 768;

  return (
    <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Janatics Group Dashboard
        </h1>
        <p className="text-base font-medium text-slate-600 mt-1">
          Financial Year Comparison: FY {currentFY} vs FY {previousFY}
        </p>
        <p className="text-sm text-slate-400 mt-1">
          * As on date: {AS_ON_DATE} | All values in Indian Rupees (₹ Crores)
        </p>
      </div>
      <div className={`flex gap-2 ${isMobile ? "w-full justify-between" : "justify-center"}`}>
        <Button
          onClick={onToggleIntraSales}
          variant={inclIntraSales ? "default" : "outline"}
          className="whitespace-nowrap border-slate-300 text-slate-700 h-10 px-4 text-sm font-semibold shadow-sm"
        >
          {inclIntraSales ? "✓ " : ""}Incl Intra Sales
        </Button>
        <Button variant="default" onClick={onRefresh} disabled={isRefreshing} className="whitespace-nowrap border-slate-300 text-slate-700 h-10 px-4 text-sm font-semibold shadow-sm">
          {isRefreshing ? "Refreshing..." : "Refresh Data"}
        </Button>
        <Button variant="destructive" className="whitespace-nowrap h-10 px-4" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </div>
  )
}
