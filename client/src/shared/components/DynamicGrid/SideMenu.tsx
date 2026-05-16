import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface SideMenuItem {
  path: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

interface SideMenuProps {
  items: SideMenuItem[];
  onNavigate?: () => void;
  collapsed?: boolean;
  title?: string;
  subtitle?: string;
  brand?: string;
}

export const SideMenu = ({
  items,
  onNavigate,
  collapsed = false,
  title = "Access Portal",
  subtitle = "Clean admin workspace",
  brand = "AP",
}: SideMenuProps) => {
  return (
    <div className={cn("dynamic-sidemenu", collapsed && "dynamic-sidemenu--collapsed")}>
      <div className="dynamic-sidemenu__brand">
        <div className="dynamic-sidemenu__brand-mark">{brand}</div>

        {!collapsed && (
          <div className="dynamic-sidemenu__brand-copy">
            <p className="dynamic-sidemenu__title">{title}</p>
            <p className="dynamic-sidemenu__subtitle">{subtitle}</p>
          </div>
        )}
      </div>

      {!collapsed && <p className="dynamic-sidemenu__section-label">Navigation</p>}

      <nav className="dynamic-sidemenu__grid" aria-label="Primary">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "dynamic-sidemenu__item",
                  collapsed && "dynamic-sidemenu__item--collapsed",
                  isActive && "dynamic-sidemenu__item--active",
                )
              }
            >
              <span className="dynamic-sidemenu__item-icon">
                <Icon className="size-5" />
              </span>

              {!collapsed && (
                <>
                  <span className="dynamic-sidemenu__item-label">{item.label}</span>
                  {item.badge ? (
                    <span className="dynamic-sidemenu__item-badge">{item.badge}</span>
                  ) : null}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
