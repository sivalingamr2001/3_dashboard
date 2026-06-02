import { useEffect, useState, useRef } from "react";
import {
  Play,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Terminal,
  FileText,
} from "lucide-react";
import { manualRunMigrationApi, getLogs } from "../dashboard/api/axiosClient";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ScrollArea } from "@/shared/components/ui/scroll-area";

interface MigrationState {
  success: boolean;
  message: string;
}

interface ApiResponse {
  success?: boolean;
  recordsMigrated?: number;
  errorMessage?: string;
}

// Parses raw Serilog structures into visual UI data tokens
interface LogLine {
  id: string;
  type: "header" | "log";
  raw: string;
  level?: "INF" | "WRN" | "ERR" | "RAW";
}

export const MigrationsPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [migrationResult, setMigrationResult] = useState<MigrationState | null>(null);
  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const [logLoading, setLogLoading] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleRunMigration = async () => {
    setLoading(true);
    setMigrationResult(null);
    try {
      const data = (await manualRunMigrationApi()) as ApiResponse;
      const isSuccess = data.success ?? true;
      const totalRows = data.recordsMigrated ?? 0;

      setMigrationResult({
        success: isSuccess,
        message: isSuccess
          ? `Success: ${totalRows} rows migrated safely.`
          : `Failed: ${data.errorMessage || "Execution aborted."}`,
      });
      handleFetchLogs();
    } catch (error: any) {
      setMigrationResult({
        success: false,
        message:
          error?.response?.data?.errorMessage ||
          error.message ||
          "Migration process failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFetchLogs = async () => {
    setLogLoading(true);
    try {
      const response = await getLogs();
      const rawText: string = response.data?.logs || response.logs || "";

      // Transform plain string logs into an itemized array
      const splitLines = rawText.split("\n");
      const formatted: LogLine[] = splitLines.map((line, idx) => {
        const trimmed = line.trim();
        const uniqueId = `${idx}-${trimmed.slice(0, 10)}`;

        if (trimmed.startsWith("===")) {
          return { id: uniqueId, type: "header", raw: trimmed };
        }

        let level: LogLine["level"] = "RAW";
        if (trimmed.includes("] INF]")) level = "INF";
        else if (trimmed.includes("] WRN]")) level = "WRN";
        else if (trimmed.includes("] ERR]")) level = "ERR";

        return { id: uniqueId, type: "log", raw: line, level };
      });

      setLogLines(formatted);

      // Push terminal viewport down to latest appended logs
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
      }, 80);
    } catch (error) {
      setLogLines([
        {
          id: "err",
          type: "log",
          raw: "Failed to access remote log streams.",
          level: "ERR",
        },
      ]);
    } finally {
      setLogLoading(false);
    }
  };

  useEffect(() => {
    handleFetchLogs();
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 font-sans antialiased">
      {/* Header Dashboard Metrics */}
      <div className="flex flex-col items-start justify-between gap-4 border-b pb-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Database Migrations
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manual sync trigger and workspace console tracking for{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
              bin\logs\MigrationLogs
            </code>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleFetchLogs}
            disabled={logLoading}
            className="gap-2 border-slate-200 text-slate-700 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${logLoading ? "animate-spin" : ""}`} />
            Refresh logs
          </Button>

          <Button
            onClick={handleRunMigration}
            disabled={loading}
            className="gap-2 bg-blue-600 text-white shadow-sm hover:bg-blue-700"
          >
            <Play className="h-4 w-4 fill-current" />
            {loading ? "Running Migration..." : "Run Migration Now"}
          </Button>
        </div>
      </div>

      {/* Execution Result Alerts */}
      {migrationResult && (
        <div
          className={`flex items-start gap-3 rounded-lg border p-4 shadow-xs transition-all ${
            migrationResult.success
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {migrationResult.success ? (
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          )}
          <div>
            <h4 className="text-sm font-semibold">
              {migrationResult.success ? "Execution Completed" : "Pipeline Halt Error"}
            </h4>
            <p className="mt-0.5 font-mono text-sm opacity-90">
              {migrationResult.message}
            </p>
          </div>
        </div>
      )}

      {/* Terminal Console Card */}
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-sm font-semibold text-slate-700">
              Serilog Console Output
            </CardTitle>
          </div>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 font-mono text-xs text-slate-600">
            Live Stream
          </span>
        </CardHeader>

        <CardContent className="bg-slate-950 p-0">
          <ScrollArea className="h-137.5 w-full p-4 font-mono text-xs leading-relaxed selection:bg-slate-800">
            {logLines.length > 0 ? (
              <div className="space-y-1">
                {logLines.map((line) => {
                  if (line.type === "header") {
                    return (
                      <div
                        key={line.id}
                        className="flex items-center gap-2 border-b border-slate-800/60 pt-4 pb-1 font-bold text-cyan-400 first:pt-0"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>{line.raw}</span>
                      </div>
                    );
                  }

                  // Dynamic styling assignment per line status priority level
                  let lineClass = "text-slate-300";
                  if (line.level === "INF") lineClass = "text-emerald-400";
                  if (line.level === "WRN")
                    lineClass = "text-amber-400 bg-amber-950/30 px-1 rounded-sm";
                  if (line.level === "ERR")
                    lineClass =
                      "text-rose-400 bg-rose-950/40 px-1 rounded-sm font-semibold";

                  return (
                    <div
                      key={line.id}
                      className={`rounded-sm px-1 py-0.5 break-all whitespace-pre-wrap transition-colors hover:bg-slate-900/50 ${lineClass}`}
                    >
                      {line.raw}
                    </div>
                  );
                })}
                {/* Auto scroll coordinate target anchor */}
                <div ref={scrollRef} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center py-20 text-slate-500 italic">
                Empty stream. Click refresh to parse log assets.
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
