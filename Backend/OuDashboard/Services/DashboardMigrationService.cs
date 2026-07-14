// Services/DashboardMigrationService.cs
using Backend.OuDashboard.Configuration;
using Backend.OuDashboard.Data;
using Backend.OuDashboard.Models;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Options;
using Oracle.ManagedDataAccess.Client;
using System.Data;

namespace Backend.OuDashboard.Services;

public class DashboardMigrationServiceV2 : IMigrationService
{
    private readonly OracleConnectionFactory    _oracle;
    private readonly SqlServerConnectionFactory _sql;
    private readonly MigrationSettings          _cfg;
    private readonly ILogger<DashboardMigrationService> _log;

    public DashboardMigrationServiceV2(
        OracleConnectionFactory              oracle,
        SqlServerConnectionFactory           sql,
        IOptions<MigrationSettings>          opts,
        ILogger<DashboardMigrationService>   log)
    {
        _oracle = oracle;
        _sql    = sql;
        _cfg    = opts.Value;
        _log    = log;
    }

    // ── Entry point called by the worker ─────────────────────────────────────
    public async Task<MigrationResult> ExecuteAsync(CancellationToken ct)
    {
        _log.LogInformation("=== MIGRATION ORCHESTRATION START ===");
        _log.LogInformation(
            "Migration started — Procedure: {Proc} | Mode: Both Flags (Y + N) | {Time}",
            _cfg.OracleProcedure, DateTime.Now);

        // ── CALL MigrateAllAsync to process BOTH flags (Y and N) ──────────────────────────
        return await MigrateAllAsync(ct);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MAIN ORCHESTRATION — Runs sequentially for both Y and N flags
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<MigrationResult> MigrateAllAsync(CancellationToken ct)
    {
        var totalMigrated = 0;
        var flagsToProcess = new[] { "Y", "N" };
        var timestamp = DateTime.Now;

        try
        {
            foreach (var flag in flagsToProcess)
            {
                _log.LogInformation("Starting extraction from Oracle for StockTransferFlag: '{Flag}'", flag);

                // 1. Fetch records matching the loop's specific flag
                var records = await FetchFromOracleAsync(flag, timestamp, ct);
                _log.LogInformation("Fetched {Count} records from Oracle for Flag '{Flag}'", records.Count, flag);

                // 2. Clear matching target table partition and insert new snapshot data
                var insertedCount = await ClearAndBulkInsertAsync(flag, records, ct);
                totalMigrated += insertedCount;
            }

            // ── FIXED: Call the primary constructor with all 3 positional parameters ──
            return new MigrationResult(Success: true, RecordsMigrated: totalMigrated, Error: null);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Migration failed during background job orchestration.");

            // ── FIXED: If an exception drops out, return a structured failure result safely ──
            return new MigrationResult(Success: false, RecordsMigrated: totalMigrated, Error: ex.Message);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ORACLE — Call JAN_GET_OU_SALES_PERFORMANCE via SYS_REFCURSOR
    // ─────────────────────────────────────────────────────────────────────────
    private async Task<List<OuDashboardRecord>> FetchFromOracleAsync(string flag, DateTime executionTime, CancellationToken ct)
    {
        var records = new List<OuDashboardRecord>();
        var snapshotDate = executionTime.Date;

        await using var conn = _oracle.Create();
        await conn.OpenAsync(ct);

        await using var cmd = conn.CreateCommand();

        // Standalone procedure — NOT a package, so no "PKG." prefix
        cmd.CommandText = _cfg.OracleProcedure;   // JAN_GET_OU_SALES_PERFORMANCE
        cmd.CommandType = CommandType.StoredProcedure;
        cmd.CommandTimeout = 180; // 3 min — heavy UNION ALL + inventory subquery

        // ── Parameter 1: Dynamic flag passed down from the loop processing context
        cmd.Parameters.Add(new OracleParameter
        {
            ParameterName = "p_stk_tfr_flg",
            OracleDbType = OracleDbType.Varchar2,
            Direction = ParameterDirection.Input,
            Value = flag
        });

        // ── Parameter 2: p_cursor OUT SYS_REFCURSOR ──────────────────────────
        cmd.Parameters.Add(new OracleParameter
        {
            ParameterName = "p_cursor",
            OracleDbType = OracleDbType.RefCursor,
            Direction = ParameterDirection.Output
        });

        // ExecuteReader on a SYS_REFCURSOR OUT param — standard ODP.NET pattern
        await using var reader = await cmd.ExecuteReaderAsync(ct);

        while (await reader.ReadAsync(ct))
        {
            records.Add(new OuDashboardRecord
            {
                OuName = SafeString(reader, "OU_NAME"),
                PrevFySaleAsOn = SafeDecimal(reader, "PREV_FY_SALE_AS_ON"),
                PrevFySaleCurrntMnth = SafeDecimal(reader, "PREV_FY_SALE_CURRNT_MNTH"),
                CurrFySaleAsOn = SafeDecimal(reader, "CURR_FY_SALE_AS_ON"),
                CurrFySaleCurrntMnth = SafeDecimal(reader, "CURR_FY_SALE_CURRNT_MNTH"),
                PrevFyPendAsOn = SafeDecimal(reader, "PREV_FY_PEND_AS_ON"),
                PrevFyPendCurrntMnth = SafeDecimal(reader, "PREV_FY_PEND_CURRNT_MNTH"),
                CurrFyPendAsOn = SafeDecimal(reader, "CURR_FY_PEND_AS_ON"),
                CurrFyPendCurrntMnth = SafeDecimal(reader, "CURR_FY_PEND_CURRNT_MNTH"),
                InvAmt = SafeDecimal(reader, "INV_AMT"),
                SORT_BY = SafeInt(reader, "SORT_BY"),
                StockTransferFlag = flag, // Set dynamically to match the current target dataset segment
                MigratedAt = executionTime,
                SnapshotDate = snapshotDate
            });
        }

        return records;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SQL SERVER — Parameterized DELETE then SqlBulkCopy
    // ─────────────────────────────────────────────────────────────────────────
    private async Task<int> ClearAndBulkInsertAsync(string flag, List<OuDashboardRecord> records, CancellationToken ct)
    {
        await using var conn = _sql.Create();
        await conn.OpenAsync(ct);

        // ── CRITICAL FIX: Use targeted DELETE instead of global TRUNCATE to avoid wiping other flags data
        await using (var deleteCmd = conn.CreateCommand())
        {
            deleteCmd.CommandText = $"DELETE FROM {_cfg.SqlServerTargetTable} WHERE STK_TFR_FLG = @flag";

            var param = deleteCmd.CreateParameter();
            param.ParameterName = "@flag";
            param.Value = flag;
            deleteCmd.Parameters.Add(param);

            await deleteCmd.ExecuteNonQueryAsync(ct);
            _log.LogInformation("Cleared historical rows matching STK_TFR_FLG = '{Flag}' from {Table}.", flag, _cfg.SqlServerTargetTable);
        }

        var dt = BuildDataTable(records);

        // Safety check to intercept empty records gracefully
        if (dt == null || dt.Rows.Count == 0)
        {
            _log.LogWarning("No records were generated for partition '{Flag}' to insert into {Table}.", flag, _cfg.SqlServerTargetTable);
            return 0;
        }

        using var bulk = new SqlBulkCopy(conn)
        {
            DestinationTableName = _cfg.SqlServerTargetTable,
            BatchSize = _cfg.BatchSize,
            BulkCopyTimeout = 120
        };

        // ── Column Mappings: Left is DataTable Column (C# Name) → Right is actual SQL Server Database Column Name
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.OuName), "OPERATING_UNIT");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.PrevFySaleAsOn), "LAST_YEAR_SALES_YTD");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.PrevFySaleCurrntMnth), "LAST_YEAR_SALES_THIS_MONTH");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.CurrFySaleAsOn), "THIS_YEAR_SALES_YTD");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.CurrFySaleCurrntMnth), "THIS_YEAR_SALES_THIS_MONTH");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.PrevFyPendAsOn), "LAST_YEAR_PENDING_ORDERS_YTD");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.PrevFyPendCurrntMnth), "LAST_YEAR_PENDING_THIS_MONTH");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.CurrFyPendAsOn), "THIS_YEAR_PENDING_ORDERS_YTD");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.CurrFyPendCurrntMnth), "THIS_YEAR_PENDING_THIS_MONTH");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.InvAmt), "INVENTORY_ASSET_VALUE");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.StockTransferFlag), "STK_TFR_FLG");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.MigratedAt), "MigratedAt");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.SnapshotDate), "SnapshotDate");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.SORT_BY), "sortbyorder");

        await bulk.WriteToServerAsync(dt, ct);

        return records.Count;
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Build DataTable from List<OuDashboardRecord> (Remains unchanged and clean)
    // ─────────────────────────────────────────────────────────────────────────
    private static DataTable BuildDataTable(List<OuDashboardRecord> records)
    {
        var dt = new DataTable();

        dt.Columns.Add(nameof(OuDashboardRecord.OuName), typeof(string));
        dt.Columns.Add(nameof(OuDashboardRecord.PrevFySaleAsOn), typeof(decimal));
        dt.Columns.Add(nameof(OuDashboardRecord.PrevFySaleCurrntMnth), typeof(decimal));
        dt.Columns.Add(nameof(OuDashboardRecord.CurrFySaleAsOn), typeof(decimal));
        dt.Columns.Add(nameof(OuDashboardRecord.CurrFySaleCurrntMnth), typeof(decimal));
        dt.Columns.Add(nameof(OuDashboardRecord.PrevFyPendAsOn), typeof(decimal));
        dt.Columns.Add(nameof(OuDashboardRecord.PrevFyPendCurrntMnth), typeof(decimal));
        dt.Columns.Add(nameof(OuDashboardRecord.CurrFyPendAsOn), typeof(decimal));
        dt.Columns.Add(nameof(OuDashboardRecord.CurrFyPendCurrntMnth), typeof(decimal));
        dt.Columns.Add(nameof(OuDashboardRecord.InvAmt), typeof(decimal));
        dt.Columns.Add(nameof(OuDashboardRecord.SORT_BY), typeof(decimal));
        dt.Columns.Add(nameof(OuDashboardRecord.StockTransferFlag), typeof(string));
        dt.Columns.Add(nameof(OuDashboardRecord.MigratedAt), typeof(DateTime));
        dt.Columns.Add(nameof(OuDashboardRecord.SnapshotDate), typeof(DateTime));

        foreach (var r in records)
        {
            dt.Rows.Add(
                r.OuName,
                r.PrevFySaleAsOn,
                r.PrevFySaleCurrntMnth,
                r.CurrFySaleAsOn,
                r.CurrFySaleCurrntMnth,
                r.PrevFyPendAsOn,
                r.PrevFyPendCurrntMnth,
                r.CurrFyPendAsOn,
                r.CurrFyPendCurrntMnth,
                r.InvAmt,
                r.SORT_BY,
                r.StockTransferFlag,
                r.MigratedAt,
                r.SnapshotDate
            );
        }

        return dt;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Safe reader helpers — handle DBNull without crashing
    // ─────────────────────────────────────────────────────────────────────────
    private static string SafeString(IDataReader r, string col)
    {
        int idx = r.GetOrdinal(col);
        return r.IsDBNull(idx) ? string.Empty : r.GetString(idx);
    }

    private static decimal SafeDecimal(IDataReader r, string col)
    {
        int idx = r.GetOrdinal(col);
        return r.IsDBNull(idx) ? 0m : r.GetDecimal(idx);
    }

    private static int? SafeInt(IDataReader r, string col)
    {
        int idx = r.GetOrdinal(col);
        return r.IsDBNull(idx) ? null : r.GetInt32(idx);
    }
}