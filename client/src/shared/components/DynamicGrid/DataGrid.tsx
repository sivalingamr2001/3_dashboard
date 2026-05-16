import React, { useCallback, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import type { ColDef, GridOptions } from "ag-grid-community";

import type { DataGridProps } from "./DataGrid.types";
import { useDataGrid } from "./useDataGrid";
import { GridToolbar } from "./GridToolbar";
import { GridFooter } from "./GridFooter";
import { LoadingOverlay, NoRowsOverlay } from "./GridOverlays";
import { mergeColDef, PageSizeStorage, resolveGridHeight } from "./gridUtils";

// Register all community modules ONCE at module level
ModuleRegistry.registerModules([AllCommunityModule]);

// ─── BASE defaultColDef ───────────────────────────────────────────────────────

const BASE_COL_DEF: ColDef = {
  sortable: true,
  filter: true,
  resizable: true,
  floatingFilter: false,
  minWidth: 80,
  suppressHeaderMenuButton: false,
};

// ─── Component ────────────────────────────────────────────────────────────────

function DataGridInner<TData extends Record<string, unknown>>(
  props: DataGridProps<TData>,
  _ref: React.ForwardedRef<unknown>,
) {
  const {
    rowData,
    columnDefs,
    title = "Data",
    gridId = "default",
    loading = false,
    pageSize: pageSizeProp,
    pageSizeOptions = [10, 25, 50, 100],
    rowSelection = "multiple",
    animateRows = true,
    showSearch = true,
    showRefreshButton = true,
    showClearFiltersButton = true,
    showExportCsvButton = true,
    showSelectedCount = true,
    toolbarLeft,
    toolbarRight,
    noRowsMessage = "No records found",
    loadingMessage = "Loading data…",
    onRowClicked,
    gridHeight,
    compact = false,
    defaultColDef: defaultColDefProp,
  } = props;

  // Resolve initial page size (localStorage → prop → first option → 25)
  const [pageSize] = useState(() => {
    const stored = PageSizeStorage.get(gridId, 0);
    if (stored && pageSizeOptions.includes(stored)) return stored;
    return pageSizeProp ?? pageSizeOptions[0] ?? 25;
  });

  const { gridApiRef, state, handlers } = useDataGrid(props);

  // Merge col defaults
  const resolvedDefaultColDef = useMemo(
    () => mergeColDef(BASE_COL_DEF, defaultColDefProp),
    [defaultColDefProp],
  );

  // Row selection config
  const rowSelectionConfig = useMemo(() => {
    if (rowSelection === "none") return undefined;
    return {
      mode: rowSelection === "single" ? ("singleRow" as const) : ("multiRow" as const),
      checkboxes: rowSelection === "multiple",
      headerCheckbox: rowSelection === "multiple",
    };
  }, [rowSelection]);

  // Loading overlay - show/hide via grid API when loading prop changes
  const onBodyScroll = useCallback(() => {
    /* intentional no-op: keep for future virtualisation hooks */
  }, []);

  // Grid options
  const gridOptions = useMemo<GridOptions<TData>>(
    () => ({
      pagination: true,
      paginationPageSize: pageSize,
      paginationPageSizeSelector: false,
      animateRows,
      enableCellTextSelection: true,
      suppressMovableColumns: false,
      rowSelection: rowSelectionConfig,
      defaultColDef: resolvedDefaultColDef,
      loadingOverlayComponent: () => <LoadingOverlay message={loadingMessage} />,
      noRowsOverlayComponent: () => <NoRowsOverlay message={noRowsMessage} />,
      ...(compact ? { rowHeight: 32, headerHeight: 36 } : {}),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pageSize, animateRows, rowSelectionConfig, resolvedDefaultColDef, compact],
  );

  const heightStyle = resolveGridHeight(gridHeight);

  return (
    <>
      <div
        style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 12,
          overflow: "hidden",
          width: "100%",
          boxSizing: "border-box",
        }}
        aria-label={`${title} data grid`}
        role="region"
      >
        {/* Toolbar */}
        <GridToolbar
          title={title}
          state={state}
          showSearch={showSearch}
          showRefresh={showRefreshButton}
          showClearFilters={showClearFiltersButton}
          showExportCsv={showExportCsvButton}
          showSelectedCount={showSelectedCount}
          toolbarLeft={toolbarLeft}
          toolbarRight={toolbarRight}
          onQuickFilterChange={handlers.onQuickFilterChange}
          onRefresh={handlers.onRefresh}
          onClearFilters={handlers.onClearFilters}
          onExportCsv={handlers.onExportCsv}
        />

        {/* Grid */}
        <div style={{ height: heightStyle, width: "100%", position: "relative" }}>
          <AgGridReact<TData>
            rowData={rowData}
            columnDefs={columnDefs}
            loading={loading}
            onGridReady={handlers.onGridReady}
            onSelectionChanged={handlers.onSelectionChanged}
            onFilterChanged={handlers.onFilterChanged}
            onSortChanged={handlers.onSortChanged}
            onPaginationChanged={handlers.onPaginationChanged}
            onRowClicked={onRowClicked}
            onBodyScroll={onBodyScroll}
            {...gridOptions}
          />
        </div>

        {/* Footer */}
        <GridFooter
          gridApiRef={gridApiRef}
          gridId={gridId}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          totalRows={state.totalRows}
          filteredRows={state.filteredRows}
        />
      </div>
    </>
  );
}

// Forward ref + generic wrapper to preserve TData generic
export const DataGrid = React.forwardRef(DataGridInner) as <
  TData extends Record<string, unknown> = Record<string, unknown>,
>(
  props: DataGridProps<TData> & { ref?: React.ForwardedRef<unknown> },
) => React.ReactElement;

export default DataGrid;
