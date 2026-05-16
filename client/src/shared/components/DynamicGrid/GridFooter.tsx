import React, { useCallback } from "react";
import type { GridApi } from "ag-grid-community";
import { PageSizeStorage } from "./gridUtils";

interface GridFooterProps {
  gridApiRef: React.MutableRefObject<GridApi | null>;
  gridId: string;
  pageSize: number;
  pageSizeOptions: number[];
  totalRows: number;
  filteredRows: number;
  onPageSizeChange?: (size: number) => void;
}

export const GridFooter: React.FC<GridFooterProps> = ({
  gridApiRef,
  gridId,
  pageSize,
  pageSizeOptions,
  totalRows,
  filteredRows,
  onPageSizeChange,
}) => {
  const [current, setCurrent] = React.useState(pageSize);

  const handleChange = useCallback(
    (size: number) => {
      setCurrent(size);
      gridApiRef.current?.setGridOption("paginationPageSize", size);
      PageSizeStorage.set(gridId, size);
      onPageSizeChange?.(size);
    },
    [gridApiRef, gridId, onPageSizeChange],
  );

  const isFiltered = filteredRows < totalRows;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "7px 14px",
        borderTop: "0.5px solid var(--color-border-tertiary)",
        fontSize: 12,
        color: "var(--color-text-secondary)",
        flexWrap: "wrap",
        gap: 8,
      }}
      aria-label="Grid footer"
    >
      <span>
        {isFiltered ? (
          <>
            Showing{" "}
            <strong style={{ color: "var(--color-text-primary)" }}>
              {filteredRows.toLocaleString()}
            </strong>{" "}
            of{" "}
            <strong style={{ color: "var(--color-text-primary)" }}>
              {totalRows.toLocaleString()}
            </strong>{" "}
            rows
          </>
        ) : (
          <>
            <strong style={{ color: "var(--color-text-primary)" }}>
              {totalRows.toLocaleString()}
            </strong>{" "}
            rows
          </>
        )}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label
          htmlFor={`${gridId}-page-size`}
          style={{ fontSize: 12, color: "var(--color-text-secondary)" }}
        >
          Rows per page:
        </label>
        <div
          style={{ display: "flex", gap: 3 }}
          role="group"
          aria-label="Page size options"
        >
          {pageSizeOptions.map((size) => (
            <button
              key={size}
              aria-pressed={size === current}
              aria-label={`Show ${size} rows per page`}
              onClick={() => handleChange(size)}
              style={{
                padding: "3px 9px",
                fontSize: 11,
                fontFamily: "inherit",
                fontWeight: size === current ? 600 : 400,
                border: "0.5px solid",
                borderColor:
                  size === current ? "#3b5bdb" : "var(--color-border-secondary)",
                borderRadius: 6,
                cursor: "pointer",
                background: size === current ? "#eef1ff" : "transparent",
                color: size === current ? "#3451c4" : "var(--color-text-secondary)",
                transition: "all 0.12s",
              }}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
