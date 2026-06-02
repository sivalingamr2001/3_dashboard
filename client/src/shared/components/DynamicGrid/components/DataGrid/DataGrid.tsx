import type { ColDef, GridOptions } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { useTheme } from "next-themes";
import { Separator } from "@/shared/components/ui/separator";
import { useDataGrid } from "../../hooks/useDataGrid";
import type { DataGridProps } from "../../types/DataGrid.types";
import { mergeColDef } from "../../utils/gridUtils";
import { LoadingOverlay, NoRowsOverlay } from "./GridOverlays";
import { GridToolbar } from "./GridToolbar";

// Register all community modules ONCE at module level
ModuleRegistry.registerModules([AllCommunityModule]);

// ─── Theme Base Definition ──────────────────────────────────────────────────

const lightTheme = themeQuartz.withParams({
  accentColor: "#3b5bdb",
  headerBackgroundColor: "#0b1426",
  headerTextColor: "#ffffff",
  borderColor: "#cbd5e1",
  rowBorder: true,
  columnBorder: true,
  cellHorizontalPaddingScale: 1.1,
  fontFamily: "'Figtree', system-ui, sans-serif",
  fontSize: 13,
  rowHeight: 60,
  headerHeight: 40,
});

const darkTheme = themeQuartz.withParams({
  accentColor: "#748ffc",
  headerBackgroundColor: "#0b1426",
  headerTextColor: "#ffffff",
  borderColor: "#2d3149",
  backgroundColor: "#181926",
  foregroundColor: "#c5d0e6",
  rowBorder: true,
  columnBorder: true,
  cellHorizontalPaddingScale: 1.1,
  fontFamily: "'Figtree', system-ui, sans-serif",
  fontSize: 13,
  rowHeight: 60,
  headerHeight: 40,
});

const BASE_COL_DEF: ColDef = {
  sortable: true,
  filter: false,
  resizable: true,
  floatingFilter: false,
  minWidth: 110,
  suppressHeaderMenuButton: true,
};

// ─── Formatting Value Helpers ────────────────────────────────────────────────

const currencyFormatter = (params: any) => {
  const val = params.value;
  if (val === undefined || val === null || isNaN(Number(val))) return "₹0.00";
  return `₹${Number(val).toFixed(2)}`;
};

const getTrendBadge = (trend: number, isPinned: boolean = false) => {
  if (trend > 0) {
    return {
      icon: <TrendingUp className="h-3 w-3 shrink-0" />,
      badgeClass: isPinned
        ? "bg-emerald-600 text-white"
        : "bg-emerald-100 text-emerald-700",
    };
  }

  if (trend < 0) {
    return {
      icon: <TrendingDown className="h-3.5 w-3.5" />,
      badgeClass: isPinned ? "bg-rose-600 text-white" : "bg-rose-100 text-rose-700",
    };
  }

  return {
    icon: (
      <span className="inline-flex h-3.5 w-3.5 items-center justify-center text-xs">
        =
      </span>
    ),
    badgeClass: isPinned ? "bg-amber-600 text-white" : "bg-amber-100 text-amber-700",
  };
};

const trendRenderer = (params: any) => {
  const value = parseFloat(params.value);
  if (isNaN(value)) return params.value ?? "";

  const isPinned = params.node.rowPinned === "bottom";
  const trendBadge = getTrendBadge(value, isPinned);

  return (
    <span
      className={`${trendBadge.badgeClass} inline-flex items-center justify-center gap-0.5 ${isPinned ? "rounded-full px-3.5 py-1.5" : "rounded-md px-2.5 py-1"} min-w-18 text-xs font-bold`}
    >
      {trendBadge.icon} {value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2)}%
    </span>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

function DataGridInner<TData extends Record<string, unknown>>(
  props: DataGridProps<TData> & { fallbackTotals: any; columnDefs: ColDef[] },
) {
  const {
    rowData: rawRowData,
    title = "Data",
    loading = false,
    animateRows = true,
    noRowsMessage = "No records found",
    loadingMessage = "Loading data…",
    onRowClicked,
    compact = false,
    theme = "system",
    defaultColDef: defaultColDefProp,
    fallbackTotals,
    rowHeight: propRowHeight,
  } = props;
  const { theme: appTheme } = useTheme();

  const { state, handlers } = useDataGrid(props);
  const [selectedTotals, setSelectedTotals] = useState<any>(null);
  const gridApiRef = useRef<any>(null);

  const resolvedDefaultColDef = useMemo(
    () => mergeColDef(BASE_COL_DEF, defaultColDefProp),
    [defaultColDefProp],
  );

  const rowSelectionConfig = useMemo(
    () => ({
      mode: "multiRow" as const,
      checkboxes: false,
      headerCheckbox: false,
    }),
    [],
  );

  // ─── Pre-select All Rows Automatically On Load ───
  const onGridReady = useCallback(
    (event: any) => {
      gridApiRef.current = event.api;
      handlers.onGridReady(event);
      if (event.api) {
        event.api.selectAll();
      }
    },
    [handlers],
  );

  // ─── Dynamic Selection Change Aggregations ───
  const onSelectionChanged = useCallback(
    (event: any) => {
      handlers.onSelectionChanged(event);
      const selectedNodes = event.api.getSelectedNodes();

      if (selectedNodes.length === 0) {
        setSelectedTotals({
          unit: "TOTAL (0 SELECTED)",
          to_fy27_date: 0,
          to_fy27_month: 0,
          to_fy26_date: 0,
          to_fy26_month: 0,
          trend: 0,
          po_date: 0,
          po_month: 0,
          inv: 0,
        });
        return;
      }

      let t2627AsOn = 0,
        t2627Mnth = 0,
        t2526AsOn = 0,
        t2526Mnth = 0;
      let p2627AsOn = 0,
        p2627Mnth = 0,
        tInventory = 0;

      selectedNodes.forEach((node: any) => {
        const data = node.data;
        if (!data) return;
        t2627AsOn += Number(data.to_fy27_date || 0);
        t2627Mnth += Number(data.to_fy27_month || 0);
        t2526AsOn += Number(data.to_fy26_date || 0);
        t2526Mnth += Number(data.to_fy26_month || 0);
        p2627AsOn += Number(data.po_date || 0);
        p2627Mnth += Number(data.po_month || 0);
        tInventory += Number(data.inv || 0);
      });

      const computedTrend =
        t2526AsOn !== 0 ? ((t2627AsOn - t2526AsOn) / t2526AsOn) * 100 : 0;

      setSelectedTotals({
        unit: `TOTAL (${selectedNodes.length} SELECTED)`,
        to_fy27_date: t2627AsOn,
        to_fy27_month: t2627Mnth,
        to_fy26_date: t2526AsOn,
        to_fy26_month: t2526Mnth,
        trend: computedTrend,
        po_date: p2627AsOn,
        po_month: p2627Mnth,
        inv: tInventory,
      });
    },
    [handlers],
  );

  const currentPinnedRows = useMemo(() => {
    if (selectedTotals) return [selectedTotals];
    return [fallbackTotals];
  }, [selectedTotals, fallbackTotals]);

  // ─── Multi-Level Column Layout Definition ──────────────────────────────────
  const hierarchicalColumnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "",
        pinned: "left",
        width: 30,
        minWidth: 30,
        maxWidth: 30,
        checkboxSelection: true,
        headerCheckboxSelection: true,
        headerClass: "header-cell-ou align-checkbox-center",
        suppressMovable: true,
        cellStyle: (params) => ({
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: params.node.rowPinned === "bottom" ? "#dbeafe" : "#ffffff",
        }),
      },
      {
        headerName: "Operating Unit",
        field: "unit",
        width: 180,
        minWidth: 140,
        headerClass: "header-cell-ou",
        cellStyle: (params) => ({
          fontWeight: "600",
          color: "#0b1426",
          backgroundColor: params.node.rowPinned === "bottom" ? "#dbeafe" : "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingLeft: "16px",
        }),
      },
      {
        headerName: "Turnover (₹ Cr)",
        marryChildren: true,
        headerClass: "header-group-level1",
        children: [
          {
            headerName: "FY 2026-27",
            headerClass: "header-group-level2 fy-26-27-bg",
            children: [
              {
                headerName: "As on Date *",
                field: "to_fy27_date",
                valueFormatter: currencyFormatter,
                width: 110,
                minWidth: 100,
                headerClass: "header-leaf-blue",
                cellStyle: (params: { node: { rowPinned: string } }) => ({
                  color: "#1d4ed8",
                  fontWeight: "600",
                  textAlign: "center",
                  justifyContent: "center",
                  backgroundColor:
                    params.node.rowPinned === "bottom" ? "#dbeafe" : "#eff6ff",
                }),
              },
              {
                headerName: "Current Month",
                field: "to_fy27_month",
                valueFormatter: currencyFormatter,
                width: 110,
                minWidth: 100,
                headerClass: "header-leaf-blue",
                cellStyle: (params: { node: { rowPinned: string } }) => ({
                  color: "#1d4ed8",
                  fontWeight: "600",
                  textAlign: "center",
                  justifyContent: "center",
                  backgroundColor:
                    params.node.rowPinned === "bottom" ? "#dbeafe" : "#eff6ff",
                }),
              },
            ],
          },
          {
            headerName: "FY 2025-26",
            headerClass: "header-group-level2 fy-25-26-bg",
            children: [
              {
                headerName: "As on Date *",
                field: "to_fy26_date",
                valueFormatter: currencyFormatter,
                width: 110,
                minWidth: 100,
                headerClass: "header-leaf-slate",
                cellStyle: (params: { node: { rowPinned: string } }) => ({
                  color: "#334155",
                  fontWeight: "600",
                  textAlign: "center",
                  justifyContent: "center",
                  backgroundColor:
                    params.node.rowPinned === "bottom" ? "#dbeafe" : "#f8fafc",
                }),
              },
              {
                headerName: "Current Month",
                field: "to_fy26_month",
                valueFormatter: currencyFormatter,
                width: 110,
                minWidth: 100,
                headerClass: "header-leaf-slate",
                cellStyle: (params: { node: { rowPinned: string } }) => ({
                  color: "#475569",
                  fontWeight: "600",
                  textAlign: "center",
                  justifyContent: "center",
                  backgroundColor:
                    params.node.rowPinned === "bottom" ? "#dbeafe" : "#f8fafc",
                }),
              },
            ],
          },
          {
            headerName: "Trend",
            headerClass: "header-group-trend-parent",
            children: [
              {
                headerName: "YoY %",
                field: "trend",
                cellRenderer: trendRenderer,
                minWidth: 120,
                headerClass: "header-leaf-trend",
                cellStyle: (params: { node: { rowPinned: string }; value: number }) => {
                  const isPinned = params.node.rowPinned === "bottom";

                  return {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isPinned ? "#dbeafe" : "#f0fdf4",
                  };
                },
              },
            ],
          },
        ],
      },
      {
        headerName: "Pending Orders (₹ Cr)",
        marryChildren: true,
        headerClass: "header-group-level1",
        children: [
          {
            headerName: "FY 2026-27",
            headerClass: "header-group-level2 fy-26-27-bg",
            children: [
              {
                headerName: "As on Date *",
                field: "po_date",
                valueFormatter: currencyFormatter,
                width: 110,
                minWidth: 100,
                headerClass: "header-leaf-blue",
                cellStyle: (params: { node: { rowPinned: string } }) => ({
                  color: "#ea580c",
                  fontWeight: "600",
                  textAlign: "center",
                  justifyContent: "center",
                  backgroundColor:
                    params.node.rowPinned === "bottom" ? "#dbeafe" : "#fff7ed",
                }),
              },
              {
                headerName: "Current Month",
                field: "po_month",
                valueFormatter: currencyFormatter,
                width: 110,
                minWidth: 100,
                headerClass: "header-leaf-blue",
                cellStyle: (params: { node: { rowPinned: string } }) => ({
                  color: "#ea580c",
                  fontWeight: "600",
                  textAlign: "center",
                  justifyContent: "center",
                  backgroundColor:
                    params.node.rowPinned === "bottom" ? "#dbeafe" : "#fff7ed",
                }),
              },
            ],
          },
        ],
      },
      {
        headerName: "Inventory \n (₹ Cr)",
        field: "inv",
        valueFormatter: currencyFormatter,
        headerClass: "header-cell-inventory multi-line-header",
        minWidth: 80,
        cellStyle: (params) => ({
          color: "#15803d",
          fontWeight: "600",
          backgroundColor: params.node.rowPinned === "bottom" ? "#dbeafe" : "#f0fdf4",
          textAlign: "center",
        }),
      },
    ],
    [],
  );

  const gridOptions = useMemo<GridOptions<TData>>(
    () => ({
      pagination: false,
      domLayout: "autoHeight", // 🌟 Key fix: Instructs AG Grid to auto-adjust height to accommodate all data rows edge-to-edge
      animateRows,
      enableCellTextSelection: true,
      suppressMovableColumns: false,
      rowSelection: rowSelectionConfig,
      defaultColDef: resolvedDefaultColDef,
      loadingOverlayComponent: () => <LoadingOverlay message={loadingMessage} />,
      noRowsOverlayComponent: () => <NoRowsOverlay message={noRowsMessage} />,
      groupHeaderHeight: 38,
      headerHeight: 34,
      suppressScrollOnNewData: true, // Prevents layout flickering when swapping dynamic arrays
      ...((propRowHeight ?? (compact ? 38 : undefined)) ? { rowHeight: propRowHeight ?? (compact ? 38 : undefined) } : {}),
    }),
    [
      animateRows,
      rowSelectionConfig,
      resolvedDefaultColDef,
      compact,
      noRowsMessage,
      loadingMessage,
    ],
  );

  const resolvedTheme = useMemo(() => {
    if (theme === "light" || theme === "dark") return theme;
    if (appTheme === "light" || appTheme === "dark") return appTheme;
    return typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
  }, [theme, appTheme]);

  const selectedTheme = resolvedTheme === "dark" ? darkTheme : lightTheme;
  const finalRowData =
    (state as any).rows ?? (state as any).filteredRowData ?? rawRowData;

  // ─── Auto-select All Rows When Data Changes ──────────────────────────────
  useEffect(() => {
    if (gridApiRef.current && finalRowData && finalRowData.length > 0) {
      // Small delay to ensure grid is ready after data update
      const timer = setTimeout(() => {
        gridApiRef.current?.selectAll();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [finalRowData, gridApiRef]);

  return (
    <>
      <style>{`
      @import url('https://googleapis.com');
      
      .datagrid-scroll-shell {
        width: 100%;
        overflow-x: auto;
      }
      .datagrid-scroll-inner {
        width: 100%;
        min-width: 100%;
      }

      .ag-root-wrapper,
      .ag-root-wrapper .ag-root,
      .ag-root-wrapper-viewport {
        width: 100% !important;
        min-width: 100% !important;
      }

      /* Clean scrollbar overrides to remove unnecessary rendering space completely */
      .ag-body-viewport,
      .ag-body-horizontal-scroll-viewport {
        overflow-y: hidden !important; 
      }

      .ag-root-wrapper {
        border: none !important;
        background-color: transparent !important;
        border-radius: 0px !important; 
      }
      .ag-header {
        background-color: transparent !important;
        border-bottom: none !important;
      }
      .ag-header-row {
        background-color: transparent !important;
      }

      .ag-header-group-cell, 
      .ag-header-cell {
        padding: 0 !important;
        border-right: 1px solid rgba(255, 255, 255, 0.15) !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.15) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      .ag-header-cell-comp-wrapper,
      .ag-header-group-cell-label,
      .ag-header-cell-label {
        width: 100% !important;
        height: 100% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
      }

      
      .header-group-level1 {
        background-color: #0b1426 !important;
        color: #ffffff !important;
        font-weight: 700 !important;
        font-size: 13.5px !important;
      }

      .fy-26-27-bg {
        background-color: #1e62ff !important;
        color: #ffffff !important;
        font-weight: 600 !important;
        font-size: 11.5px !important;
      }
      .fy-25-26-bg {
        background-color: #3a4354 !important;
        color: #ffffff !important;
        font-weight: 600 !important;
        font-size: 11.5px !important;
      }

      .header-leaf-blue {
        background-color: #1a56e2 !important;
        color: #ffffff !important;
        font-size: 11px !important;
      }
      .header-leaf-slate {
        background-color: #313a4a !important;
        color: #ffffff !important;
        font-size: 11px !important;
      }

      .header-group-trend-parent {
        background-color: #00c853 !important;
        color: #ffffff !important;
        font-weight: 600 !important;
      }
      .header-leaf-trend {
        background-color: #00c853 !important;
        color: #ffffff !important;
        font-size: 11px !important;
      }

      .multi-line-header .ag-header-cell-label {
        white-space: pre-line !important; 
        line-height: 1.4 !important;
        text-align: center !important;
      }

      /* Ensure the top-level row has enough vertical space to display two lines */
      .ag-header-row {
        height: auto !important;
        min-height: 48px !important;
      }

      .header-cell-ou,
      .header-cell-inventory {
        background-color: #0b1426 !important;
        color: #ffffff !important;
        font-weight: 700 !important;
        font-size: 13.5px !important;
      }

      .ag-row-pinned-bottom {
        border-top: 3px solid #1e293b !important;
      }
      .ag-row-pinned-bottom .ag-cell {
        font-weight: 800 !important;
        font-size: 13.5px !important;
        border-right: 1px solid rgba(255, 255, 255, 0.25) !important;
        color: #ffffff !important;
        display: flex;
        align-items: center;
      }
      .ag-row-pinned-bottom .ag-cell[col-id="unit"] {
        color: #1e3a8a !important;
      }
      `}</style>

      <div
        style={{
          fontFamily: "'Figtree', system-ui, sans-serif",
          background: "var(--color-background-primary)",
          border: "1px solid var(--color-border-tertiary)",
          borderRadius: 0,
          overflow: "hidden",
          width: "100%",
          boxSizing: "border-box",
        }}
        role="region"
      >
        <GridToolbar title={title} state={state} />

        <Separator className="m-0 p-0" />

        <div className="datagrid-scroll-shell">
          <div className="datagrid-scroll-inner">
            {/* 🌟 Removed the fixed height styling constraint from this container wrapper to allow row data expansion */}
            <div style={{ width: "100%", position: "relative" }}>
              <AgGridReact<TData>
                rowData={finalRowData}
                columnDefs={hierarchicalColumnDefs}
                theme={selectedTheme}
                loading={loading}
                pinnedBottomRowData={currentPinnedRows}
                onGridReady={onGridReady}
                onSelectionChanged={onSelectionChanged}
                onFilterChanged={handlers.onFilterChanged}
                onSortChanged={handlers.onSortChanged}
                onPaginationChanged={handlers.onPaginationChanged}
                onRowClicked={onRowClicked}
                {...gridOptions}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── External Wrapper Interface ─────────────────────────────────────────────

interface OperatingUnitsTableProps {
  rows: any[];
  totals: {
    to_fy27_date: string | number;
    to_fy27_month: string | number;
    to_fy26_date: string | number;
    to_fy26_month: string | number;
    trend: string | number;
    po_date: string | number;
    po_month: string | number;
    inv: string | number;
  };
}

export const OperatingUnitsTable: React.FC<OperatingUnitsTableProps> = ({
  rows,
  totals,
}) => {
  const defaultTotalsRow = useMemo(() => {
    return {
      OU_NAME: "TOTAL",
      to_fy27_date: totals.to_fy27_date,
      to_fy27_month: totals.to_fy27_month,
      to_fy26_date: totals.to_fy26_date,
      to_fy26_month: totals.to_fy26_month,
      trend: typeof totals.trend === "string" ? parseFloat(totals.trend) : totals.trend,
      po_date: totals.po_date,
      po_month: totals.po_month,
      inv: totals.inv,
    };
  }, [totals]);

  return (
    <div className="m-0 w-full p-0">
      <DataGridInner
        title="Operating Units Performance Comparison"
        gridId="ou-performance-grid"
        rowData={rows}
        columnDefs={[]}
        fallbackTotals={defaultTotalsRow}
        showSearch={true}
        showExportCsvButton={true}
      />
    </div>
  );
};

export const DataGrid = React.forwardRef(DataGridInner) as <
  TData extends Record<string, unknown> = Record<string, unknown>,
>(
  props: DataGridProps<TData> & {
    fallbackTotals: any;
    columnDefs?: ColDef[];
    ref?: React.ForwardedRef<unknown>;
  },
) => React.ReactElement;

export default DataGrid;
