using System.Data;
using Backend.OuDashboard.Configuration;
using Backend.OuDashboard.Data;
using Backend.OuDashboard.Models;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Options;
using Oracle.ManagedDataAccess.Client;

namespace Backend.OuDashboard.Services;

public class OuDashboardMigrationService : IMigrationService
{
    private readonly OracleConnectionFactory _oracle;
    private readonly SqlServerConnectionFactory _sql;
    private readonly MigrationSettings _cfg;
    private readonly ILogger<OuDashboardMigrationService> _log;

    public OuDashboardMigrationService(
        OracleConnectionFactory oracle,
        SqlServerConnectionFactory sql,
        IOptions<MigrationSettings> opts,
        ILogger<OuDashboardMigrationService> log)
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

        await using var conn = _oracle.Create();
        await conn.OpenAsync(ct);

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = _cfg.OraclePackageProcedure;
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
                StkTfrFlg = GetChar(reader, "STK_TFR_FLG")
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
        bulk.ColumnMappings.Add("OPERATING_UNIT", "OPERATING_UNIT");
        bulk.ColumnMappings.Add("LAST_YEAR_SALES_YTD", "LAST_YEAR_SALES_YTD");
        bulk.ColumnMappings.Add("LAST_YEAR_SALES_THIS_MONTH", "LAST_YEAR_SALES_THIS_MONTH");
        bulk.ColumnMappings.Add("THIS_YEAR_SALES_YTD", "THIS_YEAR_SALES_YTD");
        bulk.ColumnMappings.Add("THIS_YEAR_SALES_THIS_MONTH", "THIS_YEAR_SALES_THIS_MONTH");
        bulk.ColumnMappings.Add("LAST_YEAR_PENDING_ORDERS_YTD", "LAST_YEAR_PENDING_ORDERS_YTD");
        bulk.ColumnMappings.Add("LAST_YEAR_PENDING_THIS_MONTH", "LAST_YEAR_PENDING_THIS_MONTH");
        bulk.ColumnMappings.Add("THIS_YEAR_PENDING_ORDERS_YTD", "THIS_YEAR_PENDING_ORDERS_YTD");
        bulk.ColumnMappings.Add("THIS_YEAR_PENDING_THIS_MONTH", "THIS_YEAR_PENDING_THIS_MONTH");
        bulk.ColumnMappings.Add("INVENTORY_ASSET_VALUE", "INVENTORY_ASSET_VALUE");
        bulk.ColumnMappings.Add("STK_TFR_FLG", "STK_TFR_FLG");

        await bulk.WriteToServerAsync(dt, ct);
        return records.Count;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────
    private static DataTable BuildDataTable(List<OuDashboardRecord> records)
    {
        var dt = new DataTable();
        dt.Columns.Add("OPERATING_UNIT", typeof(string));
        dt.Columns.Add("LAST_YEAR_SALES_YTD", typeof(decimal));
        dt.Columns.Add("LAST_YEAR_SALES_THIS_MONTH", typeof(decimal));
        dt.Columns.Add("THIS_YEAR_SALES_YTD", typeof(decimal));
        dt.Columns.Add("THIS_YEAR_SALES_THIS_MONTH", typeof(decimal));
        dt.Columns.Add("LAST_YEAR_PENDING_ORDERS_YTD", typeof(decimal));
        dt.Columns.Add("LAST_YEAR_PENDING_THIS_MONTH", typeof(decimal));
        dt.Columns.Add("THIS_YEAR_PENDING_ORDERS_YTD", typeof(decimal));
        dt.Columns.Add("THIS_YEAR_PENDING_THIS_MONTH", typeof(decimal));
        dt.Columns.Add("INVENTORY_ASSET_VALUE", typeof(decimal));
        dt.Columns.Add("STK_TFR_FLG", typeof(string));

        foreach (var record in records)
        {
            dt.Rows.Add(
                record.OperatingUnit,
                record.LastYearSalesYtd,
                record.LastYearSalesThisMonth,
                record.ThisYearSalesYtd,
                record.ThisYearSalesThisMonth,
                record.LastYearPendingOrdersYtd,
                record.LastYearPendingThisMonth,
                record.ThisYearPendingOrdersYtd,
                record.ThisYearPendingThisMonth,
                record.InventoryAssetValue,
                record.StkTfrFlg.ToString());
        }

        return dt;
    }

    private static string? GetString(IDataReader r, string col)
        => r.IsDBNull(r.GetOrdinal(col)) ? null : r.GetString(r.GetOrdinal(col));

    private static decimal GetDecimal(IDataReader r, string col)
        => r.IsDBNull(r.GetOrdinal(col)) ? 0m : r.GetDecimal(r.GetOrdinal(col));

    private static char GetChar(IDataReader r, string col)
        => r.IsDBNull(r.GetOrdinal(col)) ? ' ' : r.GetChar(r.GetOrdinal(col));
}
