using Backend.OuDashboard.Configuration;
using Backend.OuDashboard.Data;
using Backend.OuDashboard.Models;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Options;
using Oracle.ManagedDataAccess.Client;
using Oracle.ManagedDataAccess.Types;
using System.Data;

namespace Backend.OuDashboard.Services;

public class DashboardMigrationService : IMigrationService
{
    private readonly OracleConnectionFactory _oracle;
    private readonly SqlServerConnectionFactory _sql;
    private readonly MigrationSettings _cfg;
    private readonly ILogger<DashboardMigrationService> _log;
    private readonly string? _oracleSchema;

    // Table names for the 4 summary tables
    private static readonly string[] SummaryTables = new[]
    {
        "JAN_ALL_OU_ORD",
        "JAN_ALL_OU_SALES",
        "JAN_ALL_OU_SALES_DAY",
        "JAN_ALL_OU_SALES_YR_TO_DATE"
    };

    public DashboardMigrationService(
        OracleConnectionFactory oracle,
        SqlServerConnectionFactory sql,
        IOptions<MigrationSettings> opts,
        ILogger<DashboardMigrationService> log,
        IConfiguration config)
    {
        _oracle = oracle;
        _sql = sql;
        _cfg = opts.Value;
        _log = log;
        _oracleSchema = config.GetValue<string>("MigrationSettings:OracleSchema");
    }

    private string GetQualifiedProcName(string procName)
    {
        return string.IsNullOrWhiteSpace(_oracleSchema)
            ? procName
            : $"{_oracleSchema}.{procName}";
    }

    public async Task<MigrationResult> ExecuteAsync(CancellationToken ct)
    {
        _log.LogInformation("=== MIGRATION ORCHESTRATION START ===");
        _log.LogInformation("Oracle Schema: {Schema}", _oracleSchema ?? "(current user)");
        _log.LogInformation(
            "Migration started — Procedure: {Proc} | Mode: Both Flags (Y + N) | {Time}",
            _cfg.OracleProcedure, DateTime.Now);

        return await MigrateAllAsync(ct);
    }

    public async Task<MigrationResult> MigrateAllAsync(CancellationToken ct)
    {
        var totalMigrated = 0;
        var flagsToProcess = new[] { "Y", "N" };
        var timestamp = DateTime.Now;

        try
        {
            // ═══════════════════════════════════════════════════════════════
            // STEP 0: Ensure all SSMS tables exist before any migration
            // ═══════════════════════════════════════════════════════════════
            _log.LogInformation("--- STEP 0: Ensuring SSMS tables exist ---");
            await EnsureTablesExistAsync(ct);

            // PHASE 1: Migrate 4 summary tables (TRUNCATE + INSERT daily)
            _log.LogInformation("--- PHASE 1: Migrating 4 summary tables (TRUNCATE + INSERT) ---");
            var summaryMigrated = await MigrateSummaryTablesAsync(timestamp, ct);
            totalMigrated += summaryMigrated;

            // PHASE 2: Migrate existing JAN_GET_OU_SALES_PERFORMANCE (DELETE per flag + INSERT)
            _log.LogInformation("--- PHASE 2: Migrating OU Sales Performance (DELETE per flag + INSERT) ---");

            foreach (var flag in flagsToProcess)
            {
                _log.LogInformation("Starting extraction from Oracle for StockTransferFlag: '{Flag}'", flag);
                var records = await FetchFromOracleAsync(flag, timestamp, ct);
                _log.LogInformation("Fetched {Count} records from Oracle for Flag '{Flag}'", records.Count, flag);
                var insertedCount = await ClearAndBulkInsertAsync(flag, records, ct);
                totalMigrated += insertedCount;
            }

            return new MigrationResult(Success: true, RecordsMigrated: totalMigrated, Error: null);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Migration failed during background job orchestration.");
            return new MigrationResult(Success: false, RecordsMigrated: totalMigrated, Error: ex.Message);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // STEP 0: CREATE TABLES IF NOT EXISTS — Runs before any data migration
    // ═════════════════════════════════════════════════════════════════════════
    private async Task EnsureTablesExistAsync(CancellationToken ct)
    {
        await using var conn = _sql.Create();
        await conn.OpenAsync(ct);

        var createTableSql = @"
            -- Table 1: JAN_ALL_OU_ORD (Order Trend from p_order_trend_cv)
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'JAN_ALL_OU_ORD')
            BEGIN
                CREATE TABLE JAN_ALL_OU_ORD (
                    ORG_ID              INT,
                    OU_NAME             NVARCHAR(100),
                    FISCAL_YEAR_PERIOD  NVARCHAR(20),
                    YRMN                CHAR(6),
                    MNYR                NVARCHAR(10),
                    ORDER_VALUE         DECIMAL(18,2),
                    MigratedAt          DATETIME2 DEFAULT GETDATE()
                );
                PRINT 'Created table: JAN_ALL_OU_ORD';
            END
            ELSE
            BEGIN
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE name = 'MigratedAt' AND object_id = OBJECT_ID('JAN_ALL_OU_ORD'))
                BEGIN
                    ALTER TABLE JAN_ALL_OU_ORD ADD MigratedAt DATETIME2 DEFAULT GETDATE();
                    PRINT 'Added MigratedAt column to JAN_ALL_OU_ORD';
                END
            END

            -- Table 2: JAN_ALL_OU_SALES (Sales Trend from p_sales_trend_cv)
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'JAN_ALL_OU_SALES')
            BEGIN
                CREATE TABLE JAN_ALL_OU_SALES (
                    ORG_ID              INT,
                    OU_NAME             NVARCHAR(100),
                    FISCAL_YEAR_PERIOD  NVARCHAR(20),
                    YRMN                CHAR(6),
                    MNYR                NVARCHAR(10),
                    SALES_VALUE         DECIMAL(18,2),
                    MigratedAt          DATETIME2 DEFAULT GETDATE()
                );
                PRINT 'Created table: JAN_ALL_OU_SALES';
            END
            ELSE
            BEGIN
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE name = 'MigratedAt' AND object_id = OBJECT_ID('JAN_ALL_OU_SALES'))
                BEGIN
                    ALTER TABLE JAN_ALL_OU_SALES ADD MigratedAt DATETIME2 DEFAULT GETDATE();
                    PRINT 'Added MigratedAt column to JAN_ALL_OU_SALES';
                END
            END

            -- Table 3: JAN_ALL_OU_SALES_DAY (Rolling 10D from p_rolling_10d_cv)
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'JAN_ALL_OU_SALES_DAY')
            BEGIN
                CREATE TABLE JAN_ALL_OU_SALES_DAY (
                    ORG_ID              INT,
                    OU_NAME             NVARCHAR(100),
                    DYNAMIC_PERIOD      NVARCHAR(50),
                    DAY_LABEL           NVARCHAR(10),
                    ORDER_DATE          DATE,
                    SALES_VALUE         DECIMAL(18,2),
                    MigratedAt          DATETIME2 DEFAULT GETDATE()
                );
                PRINT 'Created table: JAN_ALL_OU_SALES_DAY';
            END
            ELSE
            BEGIN
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE name = 'MigratedAt' AND object_id = OBJECT_ID('JAN_ALL_OU_SALES_DAY'))
                BEGIN
                    ALTER TABLE JAN_ALL_OU_SALES_DAY ADD MigratedAt DATETIME2 DEFAULT GETDATE();
                    PRINT 'Added MigratedAt column to JAN_ALL_OU_SALES_DAY';
                END
            END

            -- Table 4: JAN_ALL_OU_SALES_YR_TO_DATE (YTD Cumulative from p_ytd_cumulative_cv)
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'JAN_ALL_OU_SALES_YR_TO_DATE')
            BEGIN
                CREATE TABLE JAN_ALL_OU_SALES_YR_TO_DATE (
                    ORG_ID                  INT,
                    OU_NAME                 NVARCHAR(100),
                    FISCAL_YEAR_PERIOD      NVARCHAR(20),
                    YRMN                    CHAR(6),
                    MNYR                    NVARCHAR(10),
                    MONTHLY_SALES           DECIMAL(18,2),
                    CUMULATIVE_YTD          DECIMAL(18,2),
                    MigratedAt              DATETIME2 DEFAULT GETDATE()
                );
                PRINT 'Created table: JAN_ALL_OU_SALES_YR_TO_DATE';
            END
            ELSE
            BEGIN
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE name = 'MigratedAt' AND object_id = OBJECT_ID('JAN_ALL_OU_SALES_YR_TO_DATE'))
                BEGIN
                    ALTER TABLE JAN_ALL_OU_SALES_YR_TO_DATE ADD MigratedAt DATETIME2 DEFAULT GETDATE();
                    PRINT 'Added MigratedAt column to JAN_ALL_OU_SALES_YR_TO_DATE';
                END
            END";

        await using var cmd = new SqlCommand(createTableSql, conn);
        await cmd.ExecuteNonQueryAsync(ct);
        _log.LogInformation("SSMS table verification completed. All 4 summary tables ensured.");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PHASE 1: Migrate 4 Summary Tables from proc_get_dynamic_sales_summary
    // ═════════════════════════════════════════════════════════════════════════
    private async Task<int> MigrateSummaryTablesAsync(DateTime executionTime, CancellationToken ct)
    {
        var totalRows = 0;
        var procName = GetQualifiedProcName("GET_OU_ORDER_AND_SALES_PERFORMANCE_DATA");

        _log.LogInformation("Calling Oracle procedure: {ProcName}", procName);

        await using var conn = _oracle.Create();
        await conn.OpenAsync(ct);

        await ValidateProcedureExistsAsync(conn, "GET_OU_ORDER_AND_SALES_PERFORMANCE_DATA", ct);

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = procName;
        cmd.CommandType = CommandType.StoredProcedure;
        cmd.CommandTimeout = 300;

        cmd.Parameters.Add(new OracleParameter
        {
            ParameterName = "p_order_trend_cv",
            OracleDbType = OracleDbType.RefCursor,
            Direction = ParameterDirection.Output
        });
        cmd.Parameters.Add(new OracleParameter
        {
            ParameterName = "p_sales_trend_cv",
            OracleDbType = OracleDbType.RefCursor,
            Direction = ParameterDirection.Output
        });
        cmd.Parameters.Add(new OracleParameter
        {
            ParameterName = "p_rolling_10d_cv",
            OracleDbType = OracleDbType.RefCursor,
            Direction = ParameterDirection.Output
        });
        cmd.Parameters.Add(new OracleParameter
        {
            ParameterName = "p_ytd_cumulative_cv",
            OracleDbType = OracleDbType.RefCursor,
            Direction = ParameterDirection.Output
        });

        await cmd.ExecuteNonQueryAsync(ct);

        // ── Table 1: JAN_ALL_OU_ORD ──────────────────────────────────────
        _log.LogInformation("Fetching Order Trend (p_order_trend_cv)...");
        var orderTrendDt = new DataTable();
        await using (var reader = ((OracleRefCursor)cmd.Parameters["p_order_trend_cv"].Value).GetDataReader())
            orderTrendDt.Load(reader);

        orderTrendDt.Columns.Add("MigratedAt", typeof(DateTime));
        foreach (DataRow row in orderTrendDt.Rows) row["MigratedAt"] = executionTime;

        await TruncateAndBulkInsertAsync("JAN_ALL_OU_ORD", orderTrendDt, ct);
        totalRows += orderTrendDt.Rows.Count;
        _log.LogInformation("JAN_ALL_OU_ORD: {Count} rows migrated", orderTrendDt.Rows.Count);

        // ── Table 2: JAN_ALL_OU_SALES ─────────────────────────────────────
        _log.LogInformation("Fetching Sales Trend (p_sales_trend_cv)...");
        var salesTrendDt = new DataTable();
        await using (var reader = ((OracleRefCursor)cmd.Parameters["p_sales_trend_cv"].Value).GetDataReader())
            salesTrendDt.Load(reader);

        salesTrendDt.Columns.Add("MigratedAt", typeof(DateTime));
        foreach (DataRow row in salesTrendDt.Rows) row["MigratedAt"] = executionTime;

        await TruncateAndBulkInsertAsync("JAN_ALL_OU_SALES", salesTrendDt, ct);
        totalRows += salesTrendDt.Rows.Count;
        _log.LogInformation("JAN_ALL_OU_SALES: {Count} rows migrated", salesTrendDt.Rows.Count);

        // ── Table 3: JAN_ALL_OU_SALES_DAY ────────────────────────────────
        _log.LogInformation("Fetching Rolling 10D (p_rolling_10d_cv)...");
        var rollingDt = new DataTable();
        await using (var reader = ((OracleRefCursor)cmd.Parameters["p_rolling_10d_cv"].Value).GetDataReader())
            rollingDt.Load(reader);

        rollingDt.Columns.Add("MigratedAt", typeof(DateTime));
        foreach (DataRow row in rollingDt.Rows) row["MigratedAt"] = executionTime;

        await TruncateAndBulkInsertAsync("JAN_ALL_OU_SALES_DAY", rollingDt, ct);
        totalRows += rollingDt.Rows.Count;
        _log.LogInformation("JAN_ALL_OU_SALES_DAY: {Count} rows migrated", rollingDt.Rows.Count);

        // ── Table 4: JAN_ALL_OU_SALES_YR_TO_DATE ─────────────────────────
        _log.LogInformation("Fetching YTD Cumulative (p_ytd_cumulative_cv)...");
        var ytdDt = new DataTable();
        await using (var reader = ((OracleRefCursor)cmd.Parameters["p_ytd_cumulative_cv"].Value).GetDataReader())
            ytdDt.Load(reader);

        ytdDt.Columns.Add("MigratedAt", typeof(DateTime));
        foreach (DataRow row in ytdDt.Rows) row["MigratedAt"] = executionTime;

        await TruncateAndBulkInsertAsync("JAN_ALL_OU_SALES_YR_TO_DATE", ytdDt, ct);
        totalRows += ytdDt.Rows.Count;
        _log.LogInformation("JAN_ALL_OU_SALES_YR_TO_DATE: {Count} rows migrated", ytdDt.Rows.Count);

        return totalRows;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // SQL SERVER — TRUNCATE + SqlBulkCopy
    // ═════════════════════════════════════════════════════════════════════════
    private async Task TruncateAndBulkInsertAsync(string tableName, DataTable data, CancellationToken ct)
    {
        if (data.Rows.Count == 0)
        {
            _log.LogWarning("No data to insert into {Table}", tableName);
            return;
        }

        // ═══════════════════════════════════════════════════════════════
        // FIX: Map Oracle column aliases to SQL Server column names
        // ═══════════════════════════════════════════════════════════════
        var columnMappings = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            // JAN_ALL_OU_ORD
            ["ORDER_VALUE_CRORES"] = "ORDER_VALUE",
            ["ORDER_VALUE"] = "ORDER_VALUE",

            // JAN_ALL_OU_SALES  
            ["SALES_VALUE_CRORES"] = "SALES_VALUE",
            ["SALES_VALUE"] = "SALES_VALUE",

            // JAN_ALL_OU_SALES_DAY
            ["DAY_LABEL"] = "DAY_LABEL",
            ["ORDER_DATE"] = "ORDER_DATE",
            ["DYNAMIC_PERIOD"] = "DYNAMIC_PERIOD",

            // JAN_ALL_OU_SALES_YR_TO_DATE
            ["MONTHLY_SALES_CRORES"] = "MONTHLY_SALES",
            ["CUMULATIVE_YTD_CRORES"] = "CUMULATIVE_YTD",
        };

        // Rename DataTable columns to match SQL Server schema
        foreach (DataColumn col in data.Columns)
        {
            if (columnMappings.TryGetValue(col.ColumnName, out var sqlServerName))
            {
                col.ColumnName = sqlServerName;
            }
        }

        // Ensure MigratedAt exists (your existing logic)
        if (!data.Columns.Contains("MigratedAt"))
        {
            data.Columns.Add("MigratedAt", typeof(DateTime));
            foreach (DataRow row in data.Rows) row["MigratedAt"] = DateTime.Now;
        }

        await using var conn = _sql.Create();
        await conn.OpenAsync(ct);

        using var transaction = conn.BeginTransaction();

        try
        {
            await using (var truncateCmd = new SqlCommand($"TRUNCATE TABLE {tableName}", conn, transaction))
            {
                await truncateCmd.ExecuteNonQueryAsync(ct);
                _log.LogInformation("TRUNCATED table: {Table}", tableName);
            }

            using var bulk = new SqlBulkCopy(conn, SqlBulkCopyOptions.Default, transaction)
            {
                DestinationTableName = tableName,
                BatchSize = _cfg.BatchSize,
                BulkCopyTimeout = 120
            };

            foreach (DataColumn col in data.Columns)
            {
                bulk.ColumnMappings.Add(col.ColumnName, col.ColumnName);
            }

            await bulk.WriteToServerAsync(data, ct);
            await transaction.CommitAsync(ct);

            _log.LogInformation("BULK INSERT completed: {Table} — {Count} rows", tableName, data.Rows.Count);
        }
        catch
        {
            await transaction.RollbackAsync(ct);
            throw;
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // VALIDATION: Check if Oracle procedure exists
    // ═════════════════════════════════════════════════════════════════════════
    private async Task ValidateProcedureExistsAsync(OracleConnection conn, string procName, CancellationToken ct)
    {
        var qualifiedName = GetQualifiedProcName(procName);
        var schema = string.IsNullOrWhiteSpace(_oracleSchema)
            ? (await GetCurrentSchemaAsync(conn, ct))
            : _oracleSchema.ToUpper();

        var checkSql = @"
            SELECT COUNT(*) 
            FROM ALL_OBJECTS 
            WHERE OBJECT_NAME = :procName 
            AND OBJECT_TYPE = 'PROCEDURE'
            AND OWNER = :schema";

        await using var checkCmd = new OracleCommand(checkSql, conn);
        checkCmd.Parameters.Add(new OracleParameter("procName", OracleDbType.Varchar2) { Value = procName.ToUpper() });
        checkCmd.Parameters.Add(new OracleParameter("schema", OracleDbType.Varchar2) { Value = schema });

        var count = Convert.ToInt32(await checkCmd.ExecuteScalarAsync(ct));

        if (count == 0)
        {
            var altSql = @"
                SELECT COUNT(*) FROM ALL_PROCEDURES 
                WHERE OBJECT_NAME = :procName 
                AND OWNER = :schema";

            await using var altCmd = new OracleCommand(altSql, conn);
            altCmd.Parameters.Add(new OracleParameter("procName", OracleDbType.Varchar2) { Value = procName.ToUpper() });
            altCmd.Parameters.Add(new OracleParameter("schema", OracleDbType.Varchar2) { Value = schema });

            var altCount = Convert.ToInt32(await altCmd.ExecuteScalarAsync(ct));

            if (altCount == 0)
            {
                throw new InvalidOperationException(
                    $"Oracle procedure '{qualifiedName}' not found in schema '{schema}'. " +
                    "Verify: 1) Procedure exists, 2) Schema name is correct, 3) User has EXECUTE privilege.");
            }
        }

        _log.LogInformation("Validated: Procedure {ProcName} exists in schema {Schema}", qualifiedName, schema);
    }

    private async Task<string> GetCurrentSchemaAsync(OracleConnection conn, CancellationToken ct)
    {
        await using var cmd = new OracleCommand("SELECT USER FROM DUAL", conn);
        var result = await cmd.ExecuteScalarAsync(ct);
        return result?.ToString()?.ToUpper() ?? "UNKNOWN";
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PHASE 2: ORACLE — Call JAN_GET_OU_SALES_PERFORMANCE (existing)
    // ═════════════════════════════════════════════════════════════════════════
    private async Task<List<OuDashboardRecord>> FetchFromOracleAsync(string flag, DateTime executionTime, CancellationToken ct)
    {
        var records = new List<OuDashboardRecord>();
        var snapshotDate = executionTime.Date;
        var procName = GetQualifiedProcName(_cfg.OracleProcedure);

        _log.LogInformation("Calling Oracle procedure: {ProcName} with flag '{Flag}'", procName, flag);

        await using var conn = _oracle.Create();
        await conn.OpenAsync(ct);

        await ValidateProcedureExistsAsync(conn, _cfg.OracleProcedure, ct);

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = procName;
        cmd.CommandType = CommandType.StoredProcedure;
        cmd.CommandTimeout = 180;

        cmd.Parameters.Add(new OracleParameter
        {
            ParameterName = "p_stk_tfr_flg",
            OracleDbType = OracleDbType.Varchar2,
            Direction = ParameterDirection.Input,
            Value = flag
        });

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
                StockTransferFlag = flag,
                MigratedAt = executionTime,
                SnapshotDate = snapshotDate
            });
        }

        return records;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // SQL SERVER — DELETE WHERE flag + SqlBulkCopy (existing OU performance)
    // ═════════════════════════════════════════════════════════════════════════
    private async Task<int> ClearAndBulkInsertAsync(string flag, List<OuDashboardRecord> records, CancellationToken ct)
    {
        await using var conn = _sql.Create();
        await conn.OpenAsync(ct);

        await using (var deleteCmd = conn.CreateCommand())
        {
            deleteCmd.CommandText = $"DELETE FROM {_cfg.SqlServerTargetTable} WHERE STK_TFR_FLG = @flag";
            var param = deleteCmd.CreateParameter();
            param.ParameterName = "@flag";
            param.Value = flag;
            deleteCmd.Parameters.Add(param);
            await deleteCmd.ExecuteNonQueryAsync(ct);
            _log.LogInformation("Cleared rows STK_TFR_FLG = '{Flag}' from {Table}.", flag, _cfg.SqlServerTargetTable);
        }

        var dt = BuildDataTable(records);

        if (dt == null || dt.Rows.Count == 0)
        {
            _log.LogWarning("No records for partition '{Flag}' into {Table}.", flag, _cfg.SqlServerTargetTable);
            return 0;
        }

        using var bulk = new SqlBulkCopy(conn)
        {
            DestinationTableName = _cfg.SqlServerTargetTable,
            BatchSize = _cfg.BatchSize,
            BulkCopyTimeout = 120
        };

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
                r.OuName, r.PrevFySaleAsOn, r.PrevFySaleCurrntMnth,
                r.CurrFySaleAsOn, r.CurrFySaleCurrntMnth,
                r.PrevFyPendAsOn, r.PrevFyPendCurrntMnth,
                r.CurrFyPendAsOn, r.CurrFyPendCurrntMnth,
                r.InvAmt, r.SORT_BY, r.StockTransferFlag,
                r.MigratedAt, r.SnapshotDate
            );
        }
        return dt;
    }

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