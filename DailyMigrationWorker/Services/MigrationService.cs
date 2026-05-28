using DailyMigrationWorker.Configuration;
using DailyMigrationWorker.Data;
using DailyMigrationWorker.Models;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Options;
using Oracle.ManagedDataAccess.Client;
using System.Data;

namespace DailyMigrationWorker.Services;

public class MigrationService : IMigrationService
{
    private readonly OracleConnectionFactory _oracle;
    private readonly SqlServerConnectionFactory _sql;
    private readonly MigrationSettings _cfg;
    private readonly ILogger<MigrationService> _log;

    public MigrationService(
        OracleConnectionFactory oracle,
        SqlServerConnectionFactory sql,
        IOptions<MigrationSettings> opts,
        ILogger<MigrationService> log)
    {
        _oracle = oracle;
        _sql = sql;
        _cfg = opts.Value;
        _log = log;
    }

    public async Task<MigrationResult> ExecuteAsync(CancellationToken ct)
    {
        _log.LogInformation("OU Dashboard migration started — {Now}", DateTime.Now);

        // ── Step 1: Fetch from Oracle ────────────────────────────────────────
        List<OuDashboardRecord> records;
        try
        {
            records = await FetchFromOracleAsync(ct);
            _log.LogInformation("Oracle returned {Count} OU rows.", records.Count);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Oracle fetch failed for procedure '{Proc}'.", _cfg.OraclePackageProcedure);
            return new MigrationResult(false, 0, ex.Message);
        }

        if (records.Count == 0)
        {
            _log.LogWarning("Oracle returned 0 rows. Skipping SQL Server update.");
            return new MigrationResult(true, 0);
        }

        // ── Step 2: Truncate + Bulk Insert to SQL Server ─────────────────────
        try
        {
            int inserted = await TruncateAndBulkInsertAsync(records, ct);
            _log.LogInformation("Migration done. {Count} rows written to {Table}.",
                inserted, _cfg.SqlServerTargetTable);
            return new MigrationResult(true, inserted);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "SQL Server insert failed for table '{Table}'.", _cfg.SqlServerTargetTable);
            return new MigrationResult(false, 0, ex.Message);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Oracle: Call PKG_OU_DASHBOARD.GET_OU_SUMMARY via REF CURSOR
    // ─────────────────────────────────────────────────────────────────────────
    private async Task<List<OuDashboardRecord>> FetchFromOracleAsync(CancellationToken ct)
    {
        var records = new List<OuDashboardRecord>();
        var now = DateTime.Now;

        await using var conn = _oracle.Create();
        await conn.OpenAsync(ct);

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = _cfg.OraclePackageProcedure;   // PKG_OU_DASHBOARD.GET_OU_SUMMARY
        cmd.CommandType = CommandType.StoredProcedure;
        cmd.CommandTimeout = 180; // 3 min — query is heavy

        // REF CURSOR output parameter — Oracle.ManagedDataAccess pattern
        cmd.Parameters.Add(new OracleParameter
        {
            ParameterName = "p_cursor",
            OracleDbType = OracleDbType.RefCursor,
            Direction = ParameterDirection.Output
        });

        await using var reader = await cmd.ExecuteReaderAsync(ct);

        while (await reader.ReadAsync(ct))
        {
            records.Add(new OuDashboardRecord
            {
                OperatingUnit = GetString(reader, "OPERATING_UNIT") ?? string.Empty,
                LastYearSalesYtd = GetDecimal(reader, "LAST_YEAR_SALES_YTD"),
                LastYearSalesThisMonth = GetDecimal(reader, "LAST_YEAR_SALES_THIS_MONTH"),
                ThisYearSalesYtd = GetDecimal(reader, "THIS_YEAR_SALES_YTD"),
                ThisYearSalesThisMonth = GetDecimal(reader, "THIS_YEAR_SALES_THIS_MONTH"),
                LastYearPendingOrdersYtd = GetDecimal(reader, "LAST_YEAR_PENDING_ORDERS_YTD"),
                LastYearPendingThisMonth = GetDecimal(reader, "LAST_YEAR_PENDING_THIS_MONTH"),
                ThisYearPendingOrdersYtd = GetDecimal(reader, "THIS_YEAR_PENDING_ORDERS_YTD"),
                ThisYearPendingThisMonth = GetDecimal(reader, "THIS_YEAR_PENDING_THIS_MONTH"),
                InventoryAssetValue = GetDecimal(reader, "INVENTORY_ASSET_VALUE"),
                MigratedAt = now,
                SnapshotDate = now.Date
            });
        }

        return records;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SQL Server: TRUNCATE → SqlBulkCopy
    // ─────────────────────────────────────────────────────────────────────────
    private async Task<int> TruncateAndBulkInsertAsync(
        List<OuDashboardRecord> records, CancellationToken ct)
    {
        await using var conn = _sql.Create();
        await conn.OpenAsync(ct);

        // TRUNCATE — fresh snapshot every day
        await using (var truncCmd = conn.CreateCommand())
        {
            truncCmd.CommandText = $"TRUNCATE TABLE {_cfg.SqlServerTargetTable}";
            await truncCmd.ExecuteNonQueryAsync(ct);
            _log.LogInformation("Truncated {Table}.", _cfg.SqlServerTargetTable);
        }

        // Build DataTable matching SQL Server column names exactly
        var dt = BuildDataTable(records);

        using var bulk = new SqlBulkCopy(conn)
        {
            DestinationTableName = _cfg.SqlServerTargetTable,
            BatchSize = _cfg.BatchSize,
            BulkCopyTimeout = 120
        };

        // DataTable column → SQL Server column (explicit = safe)
        bulk.ColumnMappings.Add("OperatingUnit", "OperatingUnit");
        bulk.ColumnMappings.Add("LastYearSalesYtd", "LastYearSalesYtd");
        bulk.ColumnMappings.Add("LastYearSalesThisMonth", "LastYearSalesThisMonth");
        bulk.ColumnMappings.Add("ThisYearSalesYtd", "ThisYearSalesYtd");
        bulk.ColumnMappings.Add("ThisYearSalesThisMonth", "ThisYearSalesThisMonth");
        bulk.ColumnMappings.Add("LastYearPendingOrdersYtd", "LastYearPendingOrdersYtd");
        bulk.ColumnMappings.Add("LastYearPendingThisMonth", "LastYearPendingThisMonth");
        bulk.ColumnMappings.Add("ThisYearPendingOrdersYtd", "ThisYearPendingOrdersYtd");
        bulk.ColumnMappings.Add("ThisYearPendingThisMonth", "ThisYearPendingThisMonth");
        bulk.ColumnMappings.Add("InventoryAssetValue", "InventoryAssetValue");
        bulk.ColumnMappings.Add("MigratedAt", "MigratedAt");
        bulk.ColumnMappings.Add("SnapshotDate", "SnapshotDate");

        await bulk.WriteToServerAsync(dt, ct);

        return records.Count;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────
    private static DataTable BuildDataTable(List<OuDashboardRecord> records)
    {
        var dt = new DataTable();
        dt.Columns.Add("OperatingUnit", typeof(string));
        dt.Columns.Add("LastYearSalesYtd", typeof(decimal));
        dt.Columns.Add("LastYearSalesThisMonth", typeof(decimal));
        dt.Columns.Add("ThisYearSalesYtd", typeof(decimal));
        dt.Columns.Add("ThisYearSalesThisMonth", typeof(decimal));
        dt.Columns.Add("LastYearPendingOrdersYtd", typeof(decimal));
        dt.Columns.Add("LastYearPendingThisMonth", typeof(decimal));
        dt.Columns.Add("ThisYearPendingOrdersYtd", typeof(decimal));
        dt.Columns.Add("ThisYearPendingThisMonth", typeof(decimal));
        dt.Columns.Add("InventoryAssetValue", typeof(decimal));
        dt.Columns.Add("MigratedAt", typeof(DateTime));
        dt.Columns.Add("SnapshotDate", typeof(DateTime));

        foreach (var r in records)
        {
            dt.Rows.Add(
                r.OperatingUnit,
                r.LastYearSalesYtd,
                r.LastYearSalesThisMonth,
                r.ThisYearSalesYtd,
                r.ThisYearSalesThisMonth,
                r.LastYearPendingOrdersYtd,
                r.LastYearPendingThisMonth,
                r.ThisYearPendingOrdersYtd,
                r.ThisYearPendingThisMonth,
                r.InventoryAssetValue,
                r.MigratedAt,
                r.SnapshotDate
            );
        }

        return dt;
    }

    private static string? GetString(IDataReader r, string col)
        => r.IsDBNull(r.GetOrdinal(col)) ? null : r.GetString(r.GetOrdinal(col));

    private static decimal GetDecimal(IDataReader r, string col)
        => r.IsDBNull(r.GetOrdinal(col)) ? 0m : r.GetDecimal(r.GetOrdinal(col));
}