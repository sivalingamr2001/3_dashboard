import React, { useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import { DataGrid } from "@/shared/components/DynamicGrid/components/DataGrid";
import type {
  OperatingUnit,
  TotalsRow,
} from "@/features/dashboard/types/dashboard.types";

interface OperatingUnitsTableProps {
  rows: OperatingUnit[];
  onSelectionTotalsChange?: (totals: TotalsRow) => void;
}

const EMPTY_TOTALS: TotalsRow = {
  to_fy27_date: "0.00",
  to_fy27_month: "0.00",
  to_fy26_date: "0.00",
  to_fy26_month: "0.00",
  trend: "0.00",
  po_date: "0.00",
  po_month: "0.00",
  inv: "0.00",
};

const formatMoney = (value: number) => value.toFixed(2);

const buildSelectionTotals = (selectedRows: OperatingUnit[]): TotalsRow => {
  if (selectedRows.length === 0) {
    return EMPTY_TOTALS;
  }

  const totals = selectedRows.reduce(
    (acc, row) => {
      acc.to_fy27_date += Number(row.to_fy27_date || 0);
      acc.to_fy27_month += Number(row.to_fy27_month || 0);
      acc.to_fy26_date += Number(row.to_fy26_date || 0);
      acc.to_fy26_month += Number(row.to_fy26_month || 0);
      acc.po_date += Number(row.po_date || 0);
      acc.po_month += Number(row.po_month || 0);
      acc.inv += Number(row.inv || 0);
      return acc;
    },
    {
      to_fy27_date: 0,
      to_fy27_month: 0,
      to_fy26_date: 0,
      to_fy26_month: 0,
      po_date: 0,
      po_month: 0,
      inv: 0,
    },
  );

  const trend =
    totals.to_fy26_date === 0
      ? totals.to_fy27_date === 0
        ? "0.00"
        : "100.00"
      : (
          ((totals.to_fy27_date - totals.to_fy26_date) / totals.to_fy26_date) *
          100
        ).toFixed(2);

  return {
    to_fy27_date: formatMoney(totals.to_fy27_date),
    to_fy27_month: formatMoney(totals.to_fy27_month),
    to_fy26_date: formatMoney(totals.to_fy26_date),
    to_fy26_month: formatMoney(totals.to_fy26_month),
    trend,
    po_date: formatMoney(totals.po_date),
    po_month: formatMoney(totals.po_month),
    inv: formatMoney(totals.inv),
  };
};

const currencyFormatter = (params: any) => {
  const val = params.value;
  if (val === undefined || val === null) return "₹0.00";
  return `₹${Number(val).toFixed(2)}`;
};

const trendRenderer = (params: any) => {
  const value = parseFloat(params.value);
  if (isNaN(value)) return params.value ?? "";

  let bg = "#fff3f3";
  let text = "#e64980";
  let icon = "📉";
  if (value > 0) {
    bg = "#ebfbee";
    text = "#40c057";
    icon = "📈";
  }
  if (value === 0) {
    bg = "#f1f3f5";
    text = "#868e96";
    icon = "▬";
  }

  return (
    <span
      style={{
        backgroundColor: bg,
        color: text,
        padding: "3px 8px",
        borderRadius: "4px",
        fontWeight: "600",
        fontSize: "11px",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      {icon} {value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2)}%
    </span>
  );
};

export const OperatingUnitsTable: React.FC<OperatingUnitsTableProps> = ({
  rows,
  onSelectionTotalsChange,
}) => {
  // Added defaultColDef globally to strip away resizable actions and handle lines
  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: false,
  }), []);

  const columns = useMemo<ColDef[]>(
    () => [
      {
        headerName: "Operating Unit",
        field: "unit",
        pinned: "left",
        minWidth: 240,
        cellStyle: (params) => ({
          fontWeight: params.node.rowPinned === "bottom" ? "bold" : "500",
        }),
      },
      {
        headerName: "Turnover (₹ Cr)",
        marryChildren: true,
        headerClass: "aggregated-group-header turnover-header",
        children: [
          {
            headerName: "FY 2026-27",
            children: [
              {
                headerName: "As on Date *",
                field: "to_fy27_date",
                valueFormatter: currencyFormatter,
                cellStyle: { color: "#1c7ed6" },
              },
              {
                headerName: "Current Month",
                field: "to_fy27_month",
                valueFormatter: currencyFormatter,
                cellStyle: { color: "#1c7ed6" },
              },
            ],
          },
          {
            headerName: "FY 2025-26",
            children: [
              {
                headerName: "As on Date *",
                field: "to_fy26_date",
                valueFormatter: currencyFormatter,
                cellStyle: { color: "#495057" },
              },
              {
                headerName: "Current Month",
                field: "to_fy26_month",
                valueFormatter: currencyFormatter,
                cellStyle: { color: "#495057" },
              },
            ],
          },
          {
            headerName: "Trend YOY %",
            field: "trend",
            cellRenderer: trendRenderer,
            minWidth: 120,
            cellStyle: {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
          },
        ],
      },
      {
        headerName: "Pending Orders (₹ Cr)",
        marryChildren: true,
        headerClass: "aggregated-group-header pending-header",
        children: [
          {
            headerName: "FY 2026-27",
            children: [
              {
                headerName: "As on Date *",
                field: "po_date",
                valueFormatter: currencyFormatter,
                cellStyle: { color: "#f08c00" },
              },
              {
                headerName: "Current Month",
                field: "po_month",
                valueFormatter: currencyFormatter,
                cellStyle: { color: "#f08c00" },
              },
            ],
          },
        ],
      },
      {
        headerName: "Inventory * (₹ cr)",
        field: "inv",
        valueFormatter: currencyFormatter,
        cellStyle: { color: "#2b8a3e", fontWeight: "500" },
      },
    ],
    [],
  );

  return (
    <div className="mt-8">
      <DataGrid
        title="Operating Units Performance Comparison"
        gridId="ou-performance-grid"
        rowData={rows}
        columnDefs={columns}
        defaultColDef={defaultColDef}
        rowHeight={40}
        onSelectionChanged={(selectedRows) =>
          onSelectionTotalsChange?.(buildSelectionTotals(selectedRows as OperatingUnit[]))
        }
        gridHeight="540px"
        showSearch={true}
        fallbackTotals={undefined}
      />
    </div>
  );
};
