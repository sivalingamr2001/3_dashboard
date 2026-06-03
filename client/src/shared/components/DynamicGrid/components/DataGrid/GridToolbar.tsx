import React from "react";
import type { DataGridState } from "../../types/DataGrid.types";
import { useSales } from "@/context/SalesContext";

// ─── Shared button component ─────────────────────────────────────────────────

interface ToolBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const ToolBtn = React.forwardRef<HTMLButtonElement, ToolBtnProps>(
  ({ children, style, ...rest }, ref) => (
    <button
      ref={ref}
      className="datagrid-tool-btn"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 14px",
        fontSize: 12,
        fontFamily: "inherit",
        fontWeight: 600,
        borderRadius: 6,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "background 0.15s, opacity 0.15s",
        lineHeight: 1.4,
        background: "#2563eb", // Primary Blue theme matching grid buttons
        color: "#ffffff",
        border: "none",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  ),
);
ToolBtn.displayName = "ToolBtn";

// ─── Main Toolbar ─────────────────────────────────────────────────────────────

export interface GridToolbarProps {
  title: string;
  state: DataGridState;
  toolbarRight?: React.ReactNode;
}

export const GridToolbar: React.FC<GridToolbarProps> = ({ title, toolbarRight }) => {
  const { asOnDate } = useSales();
  return (
    <div role="toolbar" aria-label={`${title} toolbar`}>
      {/* ── main toolbar container matching image style ── */}
      <div
        className="flex flex-col justify-between gap-4 rounded-t-sm bg-[#0b1426] p-6 md:flex-row md:items-center"
        style={{
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Left Section - Text Information */}
        <div className="flex flex-col items-start">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Operating Units Performance Comparison
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            * As on date: {asOnDate} | All values in Indian Rupees (₹ Crores)
          </p>
        </div>

        <div
          className="datagrid-toolbar-right"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {toolbarRight}
        </div>
      </div>
    </div>
  );
};
