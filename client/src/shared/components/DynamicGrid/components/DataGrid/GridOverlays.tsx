import React from "react"

// ─── Loading overlay ──────────────────────────────────────────────────────────

interface LoadingOverlayProps {
  message?: string
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = "Loading data…",
}) => (
  <div
    role="status"
    aria-label={message}
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      height: "100%",
      color: "var(--color-text-secondary)",
    }}
  >
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#3b5bdb"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
      style={{ animation: "dg-spin 0.7s linear infinite" }}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <style>{`@keyframes dg-spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
    <span style={{ fontSize: 13, fontWeight: 500 }}>{message}</span>
  </div>
)

// ─── No rows overlay ──────────────────────────────────────────────────────────

interface NoRowsOverlayProps {
  message?: string
}

export const NoRowsOverlay: React.FC<NoRowsOverlayProps> = ({
  message = "No records found",
}) => (
  <div
    role="status"
    aria-label={message}
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      height: "100%",
      color: "var(--color-text-secondary)",
    }}
  >
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      opacity="0.35"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
      <path d="m14 14 4 4m0-4-4 4" />
    </svg>
    <div style={{ textAlign: "center" }}>
      <p
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--color-text-primary)",
          margin: "0 0 4px",
        }}
      >
        No results
      </p>
      <p style={{ fontSize: 12, margin: 0 }}>{message}</p>
    </div>
  </div>
)
