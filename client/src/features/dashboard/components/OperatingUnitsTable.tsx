import React, { useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import { DataGrid } from "@/shared/components/DynamicGrid/components/DataGrid";

interface OperatingUnitsTableProps {
  rows: any[];
}

// Simple currency formatter helper matching your image structure
const currencyFormatter = (params: any) => {
  const val = params.value;
  if (val === undefined || val === null) return "₹0.00";
  return `₹${Number(val).toFixed(2)}`;
};

// Custom cell renderer for the trend percentage badge
const trendRenderer = (params: any) => {
  const value = parseFloat(params.value);
  if (isNaN(value)) return params.value ?? "";

  let bg = "#fff3f3"; let text = "#e64980"; let icon = "📉";
  if (value > 0) { bg = "#ebfbee"; text = "#40c057"; icon = "📈"; }
  if (value === 0) { bg = "#f1f3f5"; text = "#868e96"; icon = "▬"; }

  return (
    <span style={{
      backgroundColor: bg,
      color: text,
      padding: "3px 8px",
      borderRadius: "4px",
      fontWeight: "600",
      fontSize: "11px",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px"
    }}>
      {icon} {value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2)}%
    </span>
  );
};

export const OperatingUnitsTable: React.FC<OperatingUnitsTableProps> = ({ rows }) => {

  const columns = useMemo<ColDef[]>(() => [
    {
      headerName: "Operating Unit",
      field: "OU_NAME", // Ensure this matches your row object key (e.g., 'Dubai Operating Unit')
      pinned: "left",
      minWidth: 240,
      cellStyle: (params) => ({
        fontWeight: params.node.rowPinned === 'bottom' ? 'bold' : '500',
      })
    },
    {
      headerName: "Turnover (₹ Cr)",
      marryChildren: true,
      headerClass: "aggregated-group-header turnover-header",
      children: [
        {
          headerName: "FY 2026-27",
          children: [
            { headerName: "As on Date *", field: "to_fy27_date", valueFormatter: currencyFormatter, cellStyle: { color: "#1c7ed6" } },
            { headerName: "Current Month", field: "to_fy27_month", valueFormatter: currencyFormatter, cellStyle: { color: "#1c7ed6" } }
          ]
        },
        {
          headerName: "FY 2025-26",
          children: [
            { headerName: "As on Date *", field: "to_fy26_date", valueFormatter: currencyFormatter, cellStyle: { color: "#495057" } },
            { headerName: "Current Month", field: "to_fy26_month", valueFormatter: currencyFormatter, cellStyle: { color: "#495057" } }
          ]
        },
        {
          headerName: "Trend YOY %",
          field: "trend",
          cellRenderer: trendRenderer,
          minWidth: 120,
          cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" }
        }
      ]
    },
    {
      headerName: "Pending Orders (₹ Cr)",
      marryChildren: true,
      headerClass: "aggregated-group-header pending-header",
      children: [
        {
          headerName: "FY 2026-27",
          children: [
            { headerName: "As on Date *", field: "po_date", valueFormatter: currencyFormatter, cellStyle: { color: "#f08c00" } },
            { headerName: "Current Month", field: "po_month", valueFormatter: currencyFormatter, cellStyle: { color: "#f08c00" } }
          ]
        }
      ]
    },
    {
      headerName: "Inventory * (₹ cr)",
      field: "inv",
      valueFormatter: currencyFormatter,
      cellStyle: { color: "#2b8a3e", fontWeight: "500" }
    }
  ], []);

  return (
    <div className="mt-8">
      <DataGrid
        title="Operating Units Performance Comparison"
        gridId="ou-performance-grid"
        rowData={rows}
        columnDefs={columns}
        gridHeight="540px"
        showSearch={true}
        fallbackTotals={undefined} />
    </div>
  );
};
