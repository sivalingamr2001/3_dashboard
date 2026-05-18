import { cn } from "@/lib/utils";
import { BarChart3, LayoutDashboard, Users } from "lucide-react";

import { NavLink } from "react-router-dom";
import { Badge } from "@/shared/components/ui/badge";

const navItems = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    path: "/employees",
    label: "Employees",
    icon: Users,
  },
  {
    path: "/users",
    label: "Users",
    icon: Users,
  },
  {
    path: "/analytics",
    label: "Analytics",
    icon: BarChart3,
  },
];

interface SidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
}

export const Sidebar = ({ onNavigate, collapsed }: SidebarProps) => {
  return (
    <div className="flex h-full flex-col overflow-y-auto px-3 py-4 transition-all duration-300">
      {/* BRAND */}
      <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
        <Badge className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm tracking-[0.25em]">
          AP
        </Badge>

        {!collapsed && (
          <div>
            <p className="text-sm font-semibold">Access Portal</p>

            <p className="text-muted-foreground text-xs">Clean admin workspace</p>
          </div>
        )}
      </div>

      {/* NAV */}
      <div className="mt-8 flex-1">
        {!collapsed && (
          <div className="text-muted-foreground px-3 pb-3 text-[11px] font-semibold tracking-[0.28em] uppercase">
            Navigation
          </div>
        )}

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    `group relative flex items-center overflow-hidden rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform`,

                    collapsed ? "justify-center" : "gap-3",

                    isActive
                      ? `bg-primary text-primary-foreground shadow-primary/15 shadow-lg`
                      : `text-muted-foreground hover:translate-x-1.5 hover:scale-[1.015] hover:shadow-sm`,
                  )
                }
              >
                {/* HOVER GRADIENT */}
                <div className="group-hover:from-background/40 group-hover:via-background/15 absolute inset-0 opacity-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-linear-to-r group-hover:to-transparent group-hover:opacity-100" />

                {/* GLOW */}
                <div className="group-hover:bg-primary/10 absolute inset-0 rounded-2xl opacity-0 blur-xl transition-all duration-500 group-hover:opacity-100" />

                {/* ICON */}
                <Icon className="relative z-10 h-5 w-5 shrink-0" />

                {/* LABEL */}
                {!collapsed && (
                  <span className="relative z-10 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5">
                    {item.label}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
