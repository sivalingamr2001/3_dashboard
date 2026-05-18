import { useCallback, useMemo, useRef, useState } from "react"
import type {
  GridApi,
  GridReadyEvent,
  SelectionChangedEvent,
  FilterChangedEvent,
  SortChangedEvent,
  PaginationChangedEvent,
} from "ag-grid-community"
import type {
  DataGridProps,
  DataGridState,
  UseDataGridReturn,
} from "../types/DataGrid.types"
import {
  buildExportFileName,
  countActiveFilters,
  debounce,
} from "../utils/gridUtils"

const INITIAL_STATE: DataGridState = {
  quickFilter: "",
  selectedCount: 0,
  totalRows: 0,
  filteredRows: 0,
  currentPage: 1,
  totalPages: 1,
  activeFiltersCount: 0,
  isRefreshing: false,
}

export function useDataGrid<TData extends Record<string, unknown>>(
  props: DataGridProps<TData>
): UseDataGridReturn {
  const {
    rowData,
    onRefresh,
    onGridReady: onGridReadyProp,
    onSelectionChanged: onSelectionChangedProp,
    onFilterChanged: onFilterChangedProp,
    onSortChanged: onSortChangedProp,
    onPaginationChanged: onPaginationChangedProp,
    onExport,
    exportFileName,
    title = "data",
  } = props

  const gridApiRef = useRef<GridApi | null>(null)
  const [state, setState] = useState<DataGridState>({
    ...INITIAL_STATE,
    totalRows: rowData.length,
    filteredRows: rowData.length,
  })

  // ── helpers ──────────────────────────────────────────────────────────────

  const syncStats = useCallback(() => {
    const api = gridApiRef.current
    if (!api) return
    const displayed = api.getDisplayedRowCount()
    const currentPage = api.paginationGetCurrentPage() + 1
    const totalPages = api.paginationGetTotalPages()
    const activeFiltersCount = countActiveFilters(api)

    setState((prev) => ({
      ...prev,
      totalRows: rowData.length,
      filteredRows: displayed,
      currentPage,
      totalPages,
      activeFiltersCount,
    }))
  }, [rowData.length])

  // ── onGridReady ───────────────────────────────────────────────────────────

  const onGridReady = useCallback(
    (event: GridReadyEvent) => {
      gridApiRef.current = event.api
      event.api.sizeColumnsToFit()
      syncStats()
      onGridReadyProp?.(event.api as GridApi<TData>)
    },
    [onGridReadyProp, syncStats]
  )

  // ── quick filter (debounced 200 ms) ──────────────────────────────────────

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetQuickFilter = useCallback(
    debounce((value: unknown) => {
      gridApiRef.current?.setGridOption("quickFilterText", value as string)
      syncStats()
    }, 200),
    [syncStats]
  )

  const onQuickFilterChange = useCallback(
    (value: string) => {
      setState((prev) => ({ ...prev, quickFilter: value }))
      debouncedSetQuickFilter(value)
    },
    [debouncedSetQuickFilter]
  )

  // ── clear filters ─────────────────────────────────────────────────────────

  const onClearFilters = useCallback(() => {
    const api = gridApiRef.current
    if (!api) return
    api.setFilterModel(null)
    api.setGridOption("quickFilterText", "")
    setState((prev) => ({
      ...prev,
      quickFilter: "",
      activeFiltersCount: 0,
    }))
    syncStats()
  }, [syncStats])

  // ── refresh ───────────────────────────────────────────────────────────────

  const onRefreshHandler = useCallback(async () => {
    setState((prev) => ({ ...prev, isRefreshing: true }))
    try {
      await onRefresh?.()
      gridApiRef.current?.refreshCells({ force: true })
    } finally {
      // keep spinner for at least 400ms for visual feedback
      setTimeout(
        () => setState((prev) => ({ ...prev, isRefreshing: false })),
        400
      )
    }
  }, [onRefresh])

  // ── export CSV ───────────────────────────────────────────────────────────

  const onExportCsv = useCallback(() => {
    const api = gridApiRef.current
    if (!api) return
    const fileName = exportFileName ?? buildExportFileName(title)
    api.exportDataAsCsv({ fileName })
    onExport?.(fileName)
  }, [exportFileName, onExport, title])

  // ── selection ─────────────────────────────────────────────────────────────

  const onSelectionChanged = useCallback(
    (event: SelectionChangedEvent) => {
      const rows = event.api.getSelectedRows() as TData[]
      setState((prev) => ({ ...prev, selectedCount: rows.length }))
      onSelectionChangedProp?.(rows)
    },
    [onSelectionChangedProp]
  )

  // ── filter / sort / pagination ────────────────────────────────────────────

  const onFilterChanged = useCallback(
    (event: FilterChangedEvent) => {
      syncStats()
      onFilterChangedProp?.(event as FilterChangedEvent<TData>)
    },
    [syncStats, onFilterChangedProp]
  )

  const onSortChanged = useCallback(
    (event: SortChangedEvent) => {
      onSortChangedProp?.(event as SortChangedEvent<TData>)
    },
    [onSortChangedProp]
  )

  const onPaginationChanged = useCallback(
    (event: PaginationChangedEvent) => {
      syncStats()
      onPaginationChangedProp?.(event as PaginationChangedEvent<TData>)
    },
    [syncStats, onPaginationChangedProp]
  )

  // ── memoised return ───────────────────────────────────────────────────────

  return useMemo(
    () => ({
      gridApiRef,
      state,
      handlers: {
        onGridReady,
        onQuickFilterChange,
        onClearFilters,
        onRefresh: onRefreshHandler,
        onExportCsv,
        onSelectionChanged,
        onFilterChanged,
        onSortChanged,
        onPaginationChanged,
      },
    }),
    [
      state,
      onGridReady,
      onQuickFilterChange,
      onClearFilters,
      onRefreshHandler,
      onExportCsv,
      onSelectionChanged,
      onFilterChanged,
      onSortChanged,
      onPaginationChanged,
    ]
  )
}
