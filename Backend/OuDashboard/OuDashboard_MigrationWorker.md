# OU Dashboard — Oracle → SQL Server Daily Migration Worker
### `JAN_GET_OU_SALES_PERFORMANCE` → `dbo.OuDashboardSummary` | Runs 6:00 AM Daily

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [SQL Server — Target Table](#2-sql-server--target-table)
3. [Oracle Procedure (Existing — No Changes)](#3-oracle-procedure-existing--no-changes)
4. [Project Structure](#4-project-structure)
5. [NuGet Dependencies](#5-nuget-dependencies)
6. [appsettings.json](#6-appsettingsjson)
7. [Configuration Model](#7-configuration-model)
8. [Models](#8-models)
9. [Connection Factories](#9-connection-factories)
10. [Migration Service](#10-migration-service)
11. [Scheduled Worker](#11-scheduled-worker)
12. [Program.cs](#12-programcs)
13. [Deployment](#13-deployment)

---

## 1. Architecture Overview

```
Every day at 6:00 AM
        │
        ▼
.NET Worker calls JAN_GET_OU_SALES_PERFORMANCE(p_stk_tfr_flg => 'Y')
        │   p_stk_tfr_flg = 'Y'  →  All OU (External + Internal, oa_flag filter)
        │   p_stk_tfr_flg = 'N'  →  External only  (STK_TFR_FLG='N', ORD_EMPT_STATUS='N')
        │   Dynamic FY dates calculated INSIDE Oracle (SYSDATE-based variables)
        │   UNION ALL Inventory (Planning Asset Sub-Inventories)
        ▼
REF CURSOR → 10 columns per OU row
        │
        ▼
SQL Server: TRUNCATE dbo.OuDashboardSummary
        │
        ▼
SqlBulkCopy → dbo.OuDashboardSummary  (fresh snapshot every day)
        │
        ▼
React Dashboard reads SQL Server
```

**Procedure output columns (from actual result set):**

| # | Oracle Column | Description |
|---|---|---|
| 1 | `OU_NAME` | Operating Unit name |
| 2 | `PREV_FY_SALE_AS_ON` | Previous FY Sales YTD |
| 3 | `PREV_FY_SALE_CURRNT_MNTH` | Previous FY — same month last year |
| 4 | `CURR_FY_SALE_AS_ON` | Current FY Sales YTD |
| 5 | `CURR_FY_SALE_CURRNT_MNTH` | Current FY — this month |
| 6 | `PREV_FY_PEND_AS_ON` | Previous FY Pending Orders YTD |
| 7 | `PREV_FY_PEND_CURRNT_MNTH` | Previous FY — pending same month |
| 8 | `CURR_FY_PEND_AS_ON` | Current FY Pending Orders YTD |
| 9 | `CURR_FY_PEND_CURRNT_MNTH` | Current FY — pending this month |
| 10 | `INV_AMT` | Inventory Asset Value |

---

## 2. SQL Server — Target Table

```sql
-- Run ONCE on your SQL Server database
CREATE TABLE dbo.OuDashboardSummary
(
    Id                       INT             NOT NULL IDENTITY(1,1) PRIMARY KEY,

    -- Operating Unit
    OuName                   NVARCHAR(200)   NOT NULL,

    -- Previous FY Sales
    PrevFySaleAsOn           DECIMAL(22, 4)  NOT NULL DEFAULT 0,
    PrevFySaleCurrntMnth     DECIMAL(22, 4)  NOT NULL DEFAULT 0,

    -- Current FY Sales
    CurrFySaleAsOn           DECIMAL(22, 4)  NOT NULL DEFAULT 0,
    CurrFySaleCurrntMnth     DECIMAL(22, 4)  NOT NULL DEFAULT 0,

    -- Previous FY Pending Orders
    PrevFyPendAsOn           DECIMAL(22, 4)  NOT NULL DEFAULT 0,
    PrevFyPendCurrntMnth     DECIMAL(22, 4)  NOT NULL DEFAULT 0,

    -- Current FY Pending Orders
    CurrFyPendAsOn           DECIMAL(22, 4)  NOT NULL DEFAULT 0,
    CurrFyPendCurrntMnth     DECIMAL(22, 4)  NOT NULL DEFAULT 0,

    -- Inventory
    InvAmt                   DECIMAL(22, 4)  NOT NULL DEFAULT 0,

    -- Which mode was used to generate this row
    StockTransferFlag        CHAR(1)         NOT NULL DEFAULT 'Y',  -- 'Y'=All OU, 'N'=External

    -- Audit
    MigratedAt               DATETIME2       NOT NULL DEFAULT GETDATE(),
    SnapshotDate             DATE            NOT NULL DEFAULT CAST(GETDATE() AS DATE),

    INDEX IX_OuDashboard_OuName      (OuName),
    INDEX IX_OuDashboard_Snapshot    (SnapshotDate),
    INDEX IX_OuDashboard_StockFlag   (StockTransferFlag)
);
```

> **Column map — Oracle procedure result → SQL Server:**
>
> | Oracle | SQL Server |
> |---|---|
> | `OU_NAME` | `OuName` |
> | `PREV_FY_SALE_AS_ON` | `PrevFySaleAsOn` |
> | `PREV_FY_SALE_CURRNT_MNTH` | `PrevFySaleCurrntMnth` |
> | `CURR_FY_SALE_AS_ON` | `CurrFySaleAsOn` |
> | `CURR_FY_SALE_CURRNT_MNTH` | `CurrFySaleCurrntMnth` |
> | `PREV_FY_PEND_AS_ON` | `PrevFyPendAsOn` |
> | `PREV_FY_PEND_CURRNT_MNTH` | `PrevFyPendCurrntMnth` |
> | `CURR_FY_PEND_AS_ON` | `CurrFyPendAsOn` |
> | `CURR_FY_PEND_CURRNT_MNTH` | `CurrFyPendCurrntMnth` |
> | `INV_AMT` | `InvAmt` |

---

## 3. Oracle Procedure (Existing — No Changes)

The procedure `JAN_GET_OU_SALES_PERFORMANCE` already exists in Oracle. **Do not modify it.**

```
Signature:
  JAN_GET_OU_SALES_PERFORMANCE(
      p_stk_tfr_flg  IN  VARCHAR2  DEFAULT 'Y',
      p_cursor       OUT SYS_REFCURSOR
  )

p_stk_tfr_flg = 'Y'  →  All OU (External + Internal with oa_flag = 'Y') + Inventory
p_stk_tfr_flg = 'N'  →  External ONLY (STK_TFR_FLG='N', ORD_EMPT_STATUS='N') + Inventory
```

All FY date variables (`v_curr_fy_start`, `v_prev_fy_start`, `v_curr_month_start`, etc.)
are computed dynamically from `SYSDATE` inside the procedure — **zero hardcoded years.**

---

## 4. Project Structure

```
OuDashboardWorker/
├── OuDashboardWorker.csproj
├── Program.cs
├── appsettings.json
├── appsettings.Development.json
│
├── Workers/
│   └── DashboardMigrationWorker.cs        ← BackgroundService (6 AM scheduler + retry)
│
├── Services/
│   ├── IDashboardMigrationService.cs
│   └── DashboardMigrationService.cs       ← Calls Oracle, bulk-inserts to SQL Server
│
├── Data/
│   ├── OracleConnectionFactory.cs
│   └── SqlServerConnectionFactory.cs
│
├── Models/
│   └── OuDashboardRecord.cs               ← POCO — mirrors SQL Server columns exactly
│
└── Configuration/
    └── MigrationSettings.cs
```

---

## 5. NuGet Dependencies

```xml
<Project Sdk="Microsoft.NET.Sdk.Worker">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <RootNamespace>OuDashboardWorker</RootNamespace>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Oracle.ManagedDataAccess.Core"                Version="23.5.1" />
    <PackageReference Include="Microsoft.Data.SqlClient"                     Version="5.2.2"  />
    <PackageReference Include="Microsoft.Extensions.Hosting"                 Version="8.0.1"  />
    <PackageReference Include="Microsoft.Extensions.Hosting.WindowsServices" Version="8.0.1"  />
    <PackageReference Include="Serilog.Extensions.Hosting"                   Version="8.0.0"  />
    <PackageReference Include="Serilog.Sinks.Console"                        Version="6.0.0"  />
    <PackageReference Include="Serilog.Sinks.File"                           Version="6.0.0"  />
    <PackageReference Include="Serilog.Settings.Configuration"               Version="8.0.4"  />
  </ItemGroup>
</Project>
```

---

## 6. appsettings.json

```json
{
  "MigrationSettings": {
    "ScheduleHour": 6,
    "ScheduleMinute": 0,
    "OracleProcedure": "JAN_GET_OU_SALES_PERFORMANCE",
    "SqlServerTargetTable": "dbo.OuDashboardSummary",
    "StockTransferFlag": "Y",
    "BatchSize": 500,
    "RetryCount": 3,
    "RetryDelaySeconds": 30
  },
  "ConnectionStrings": {
    "OracleERP": "Data Source=(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=your-oracle-host)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=ERPDB)));User Id=jan_user;Password=your_password;",
    "SqlServer": "Server=your-sql-server;Database=JanaticsDB;Integrated Security=True;TrustServerCertificate=True;"
  },
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": { "Microsoft": "Warning", "System": "Warning" }
    },
    "WriteTo": [
      { "Name": "Console" },
      {
        "Name": "File",
        "Args": {
          "path": "logs/ou-dashboard-.log",
          "rollingInterval": "Day",
          "retainedFileCountLimit": 30,
          "outputTemplate": "[{Timestamp:yyyy-MM-dd HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}"
        }
      }
    ]
  }
}
```

> Change `StockTransferFlag` to `"N"` if you ever need External-only mode — no code change needed.

---

## 7. Configuration Model

```csharp
// Configuration/MigrationSettings.cs
namespace OuDashboardWorker.Configuration;

public class MigrationSettings
{
    public int    ScheduleHour        { get; set; } = 6;
    public int    ScheduleMinute      { get; set; } = 0;

    /// <summary>Oracle standalone procedure name (no package prefix needed).</summary>
    public string OracleProcedure     { get; set; } = "JAN_GET_OU_SALES_PERFORMANCE";

    public string SqlServerTargetTable { get; set; } = "dbo.OuDashboardSummary";

    /// <summary>
    /// 'Y' = All OU (External + Internal with oa_flag filter) — default
    /// 'N' = External ONLY (STK_TFR_FLG='N', ORD_EMPT_STATUS='N')
    /// Controlled by appsettings — no code change needed to switch modes.
    /// </summary>
    public string StockTransferFlag   { get; set; } = "Y";

    public int    BatchSize           { get; set; } = 500;
    public int    RetryCount          { get; set; } = 3;
    public int    RetryDelaySeconds   { get; set; } = 30;
}
```

---

## 8. Models

```csharp
// Models/OuDashboardRecord.cs
namespace OuDashboardWorker.Models;

/// <summary>
/// One row per Operating Unit.
/// Column names match dbo.OuDashboardSummary exactly.
/// Monetary values already converted to INR by Ou_Currency_Conv_Rate inside Oracle.
/// </summary>
public class OuDashboardRecord
{
    // ── Identity ─────────────────────────────────────────────────────────────
    public string  OuName                { get; set; } = string.Empty;

    // ── Previous FY Sales ────────────────────────────────────────────────────
    public decimal PrevFySaleAsOn        { get; set; }   // PREV_FY_SALE_AS_ON
    public decimal PrevFySaleCurrntMnth  { get; set; }   // PREV_FY_SALE_CURRNT_MNTH

    // ── Current FY Sales ─────────────────────────────────────────────────────
    public decimal CurrFySaleAsOn        { get; set; }   // CURR_FY_SALE_AS_ON
    public decimal CurrFySaleCurrntMnth  { get; set; }   // CURR_FY_SALE_CURRNT_MNTH

    // ── Previous FY Pending Orders ───────────────────────────────────────────
    public decimal PrevFyPendAsOn        { get; set; }   // PREV_FY_PEND_AS_ON
    public decimal PrevFyPendCurrntMnth  { get; set; }   // PREV_FY_PEND_CURRNT_MNTH

    // ── Current FY Pending Orders ────────────────────────────────────────────
    public decimal CurrFyPendAsOn        { get; set; }   // CURR_FY_PEND_AS_ON
    public decimal CurrFyPendCurrntMnth  { get; set; }   // CURR_FY_PEND_CURRNT_MNTH

    // ── Inventory ────────────────────────────────────────────────────────────
    public decimal InvAmt                { get; set; }   // INV_AMT

    // ── Set by .NET before insert ────────────────────────────────────────────
    public string  StockTransferFlag     { get; set; } = "Y";
    public DateTime MigratedAt           { get; set; } = DateTime.Now;
    public DateTime SnapshotDate         { get; set; } = DateTime.Today;
}
```

---

## 9. Connection Factories

```csharp
// Data/OracleConnectionFactory.cs
using Oracle.ManagedDataAccess.Client;

namespace OuDashboardWorker.Data;

public class OracleConnectionFactory
{
    private readonly string _cs;

    public OracleConnectionFactory(IConfiguration configuration)
        => _cs = configuration.GetConnectionString("OracleERP")
               ?? throw new InvalidOperationException("OracleERP connection string missing.");

    public OracleConnection Create() => new(_cs);
}
```

```csharp
// Data/SqlServerConnectionFactory.cs
using Microsoft.Data.SqlClient;

namespace OuDashboardWorker.Data;

public class SqlServerConnectionFactory
{
    private readonly string _cs;

    public SqlServerConnectionFactory(IConfiguration configuration)
        => _cs = configuration.GetConnectionString("SqlServer")
               ?? throw new InvalidOperationException("SqlServer connection string missing.");

    public SqlConnection Create() => new(_cs);
}
```

---

## 10. Migration Service

### Interface

```csharp
// Services/IDashboardMigrationService.cs
namespace OuDashboardWorker.Services;

public interface IDashboardMigrationService
{
    Task<MigrationResult> ExecuteAsync(CancellationToken ct);
}

public record MigrationResult(bool Success, int RecordsMigrated, string? Error = null);
```

### Implementation

```csharp
// Services/DashboardMigrationService.cs
using System.Data;
using Microsoft.Data.SqlClient;
using Oracle.ManagedDataAccess.Client;
using OuDashboardWorker.Configuration;
using OuDashboardWorker.Data;
using OuDashboardWorker.Models;

namespace OuDashboardWorker.Services;

public class DashboardMigrationService : IDashboardMigrationService
{
    private readonly OracleConnectionFactory    _oracle;
    private readonly SqlServerConnectionFactory _sql;
    private readonly MigrationSettings          _cfg;
    private readonly ILogger<DashboardMigrationService> _log;

    public DashboardMigrationService(
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
        _log.LogInformation(
            "Migration started — Procedure: {Proc} | p_stk_tfr_flg: '{Flag}' | {Time}",
            _cfg.OracleProcedure, _cfg.StockTransferFlag, DateTime.Now);

        // ── Step 1: Fetch from Oracle ─────────────────────────────────────────
        List<OuDashboardRecord> records;
        try
        {
            records = await FetchFromOracleAsync(ct);
            _log.LogInformation(
                "Oracle returned {Count} OU rows (flag='{Flag}').",
                records.Count, _cfg.StockTransferFlag);
        }
        catch (Exception ex)
        {
            _log.LogError(ex,
                "Oracle fetch failed. Procedure='{Proc}', Flag='{Flag}'.",
                _cfg.OracleProcedure, _cfg.StockTransferFlag);
            return new MigrationResult(false, 0, ex.Message);
        }

        if (records.Count == 0)
        {
            _log.LogWarning("Oracle returned 0 rows — skipping SQL Server update.");
            return new MigrationResult(true, 0);
        }

        // ── Step 2: TRUNCATE + Bulk Insert ────────────────────────────────────
        try
        {
            int inserted = await TruncateAndBulkInsertAsync(records, ct);
            _log.LogInformation(
                "Migration complete — {Count} rows → {Table}.",
                inserted, _cfg.SqlServerTargetTable);
            return new MigrationResult(true, inserted);
        }
        catch (Exception ex)
        {
            _log.LogError(ex,
                "SQL Server insert failed. Table='{Table}'.", _cfg.SqlServerTargetTable);
            return new MigrationResult(false, 0, ex.Message);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ORACLE — Call JAN_GET_OU_SALES_PERFORMANCE via SYS_REFCURSOR
    // ─────────────────────────────────────────────────────────────────────────
    private async Task<List<OuDashboardRecord>> FetchFromOracleAsync(CancellationToken ct)
    {
        var records   = new List<OuDashboardRecord>();
        var now       = DateTime.Now;
        var snapshotDate = now.Date;

        await using var conn = _oracle.Create();
        await conn.OpenAsync(ct);

        await using var cmd = conn.CreateCommand();

        // Standalone procedure — NOT a package, so no "PKG." prefix
        cmd.CommandText    = _cfg.OracleProcedure;   // JAN_GET_OU_SALES_PERFORMANCE
        cmd.CommandType    = CommandType.StoredProcedure;
        cmd.CommandTimeout = 180; // 3 min — heavy UNION ALL + inventory subquery

        // ── Parameter 1: p_stk_tfr_flg IN VARCHAR2 ───────────────────────────
        cmd.Parameters.Add(new OracleParameter
        {
            ParameterName = "p_stk_tfr_flg",
            OracleDbType  = OracleDbType.Varchar2,
            Direction     = ParameterDirection.Input,
            Value         = _cfg.StockTransferFlag  // 'Y' or 'N' from appsettings
        });

        // ── Parameter 2: p_cursor OUT SYS_REFCURSOR ──────────────────────────
        cmd.Parameters.Add(new OracleParameter
        {
            ParameterName = "p_cursor",
            OracleDbType  = OracleDbType.RefCursor,
            Direction     = ParameterDirection.Output
        });

        // ExecuteReader on a SYS_REFCURSOR OUT param — standard ODP.NET pattern
        await using var reader = await cmd.ExecuteReaderAsync(ct);

        while (await reader.ReadAsync(ct))
        {
            records.Add(new OuDashboardRecord
            {
                OuName               = SafeString(reader,  "OU_NAME"),
                PrevFySaleAsOn       = SafeDecimal(reader, "PREV_FY_SALE_AS_ON"),
                PrevFySaleCurrntMnth = SafeDecimal(reader, "PREV_FY_SALE_CURRNT_MNTH"),
                CurrFySaleAsOn       = SafeDecimal(reader, "CURR_FY_SALE_AS_ON"),
                CurrFySaleCurrntMnth = SafeDecimal(reader, "CURR_FY_SALE_CURRNT_MNTH"),
                PrevFyPendAsOn       = SafeDecimal(reader, "PREV_FY_PEND_AS_ON"),
                PrevFyPendCurrntMnth = SafeDecimal(reader, "PREV_FY_PEND_CURRNT_MNTH"),
                CurrFyPendAsOn       = SafeDecimal(reader, "CURR_FY_PEND_AS_ON"),
                CurrFyPendCurrntMnth = SafeDecimal(reader, "CURR_FY_PEND_CURRNT_MNTH"),
                InvAmt               = SafeDecimal(reader, "INV_AMT"),
                StockTransferFlag    = _cfg.StockTransferFlag,
                MigratedAt           = now,
                SnapshotDate         = snapshotDate
            });
        }

        return records;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SQL SERVER — TRUNCATE then SqlBulkCopy
    // ─────────────────────────────────────────────────────────────────────────
    private async Task<int> TruncateAndBulkInsertAsync(
        List<OuDashboardRecord> records, CancellationToken ct)
    {
        await using var conn = _sql.Create();
        await conn.OpenAsync(ct);

        // TRUNCATE — fresh snapshot, no stale rows
        await using (var truncCmd = conn.CreateCommand())
        {
            truncCmd.CommandText = $"TRUNCATE TABLE {_cfg.SqlServerTargetTable}";
            await truncCmd.ExecuteNonQueryAsync(ct);
            _log.LogInformation("Truncated {Table}.", _cfg.SqlServerTargetTable);
        }

        var dt = BuildDataTable(records);

        using var bulk = new SqlBulkCopy(conn)
        {
            DestinationTableName = _cfg.SqlServerTargetTable,
            BatchSize            = _cfg.BatchSize,
            BulkCopyTimeout      = 120
        };

        // Explicit column mappings — DataTable col → SQL Server col
        // Keeps insert safe even if table column order changes
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.OuName),               "OuName");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.PrevFySaleAsOn),        "PrevFySaleAsOn");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.PrevFySaleCurrntMnth),  "PrevFySaleCurrntMnth");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.CurrFySaleAsOn),        "CurrFySaleAsOn");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.CurrFySaleCurrntMnth),  "CurrFySaleCurrntMnth");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.PrevFyPendAsOn),        "PrevFyPendAsOn");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.PrevFyPendCurrntMnth),  "PrevFyPendCurrntMnth");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.CurrFyPendAsOn),        "CurrFyPendAsOn");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.CurrFyPendCurrntMnth),  "CurrFyPendCurrntMnth");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.InvAmt),                "InvAmt");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.StockTransferFlag),     "StockTransferFlag");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.MigratedAt),            "MigratedAt");
        bulk.ColumnMappings.Add(nameof(OuDashboardRecord.SnapshotDate),          "SnapshotDate");

        await bulk.WriteToServerAsync(dt, ct);

        return records.Count;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Build DataTable from List<OuDashboardRecord>
    // ─────────────────────────────────────────────────────────────────────────
    private static DataTable BuildDataTable(List<OuDashboardRecord> records)
    {
        var dt = new DataTable();

        // Column names match nameof() used in bulk.ColumnMappings above
        dt.Columns.Add(nameof(OuDashboardRecord.OuName),               typeof(string));
        dt.Columns.Add(nameof(OuDashboardRecord.PrevFySaleAsOn),        typeof(decimal));
        dt.Columns.Add(nameof(OuDashboardRecord.PrevFySaleCurrntMnth),  typeof(decimal));
        dt.Columns.Add(nameof(OuDashboardRecord.CurrFySaleAsOn),        typeof(decimal));
        dt.Columns.Add(nameof(OuDashboardRecord.CurrFySaleCurrntMnth),  typeof(decimal));
        dt.Columns.Add(nameof(OuDashboardRecord.PrevFyPendAsOn),        typeof(decimal));
        dt.Columns.Add(nameof(OuDashboardRecord.PrevFyPendCurrntMnth),  typeof(decimal));
        dt.Columns.Add(nameof(OuDashboardRecord.CurrFyPendAsOn),        typeof(decimal));
        dt.Columns.Add(nameof(OuDashboardRecord.CurrFyPendCurrntMnth),  typeof(decimal));
        dt.Columns.Add(nameof(OuDashboardRecord.InvAmt),                typeof(decimal));
        dt.Columns.Add(nameof(OuDashboardRecord.StockTransferFlag),     typeof(string));
        dt.Columns.Add(nameof(OuDashboardRecord.MigratedAt),            typeof(DateTime));
        dt.Columns.Add(nameof(OuDashboardRecord.SnapshotDate),          typeof(DateTime));

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
}
```

---

## 11. Scheduled Worker

```csharp
// Workers/DashboardMigrationWorker.cs
using OuDashboardWorker.Configuration;
using OuDashboardWorker.Services;

namespace OuDashboardWorker.Workers;

public class DashboardMigrationWorker : BackgroundService
{
    private readonly IServiceScopeFactory              _scope;
    private readonly MigrationSettings                 _cfg;
    private readonly ILogger<DashboardMigrationWorker> _log;

    public DashboardMigrationWorker(
        IServiceScopeFactory              scopeFactory,
        IOptions<MigrationSettings>       opts,
        ILogger<DashboardMigrationWorker> log)
    {
        _scope = scopeFactory;
        _cfg   = opts.Value;
        _log   = log;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _log.LogInformation(
            "OU Dashboard Worker started. Scheduled daily at {H:D2}:{M:D2}. Flag='{Flag}'.",
            _cfg.ScheduleHour, _cfg.ScheduleMinute, _cfg.StockTransferFlag);

        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = GetDelayUntilNextRun();

            _log.LogInformation(
                "Next run in {H}h {M}m → at {At:yyyy-MM-dd HH:mm}",
                (int)delay.TotalHours, delay.Minutes, DateTime.Now.Add(delay));

            try
            {
                await Task.Delay(delay, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                _log.LogInformation("Worker cancelled during wait. Stopping.");
                break;
            }

            await RunWithRetryAsync(stoppingToken);
        }

        _log.LogInformation("OU Dashboard Worker stopped.");
    }

    // ── Next 6:00:00 AM ──────────────────────────────────────────────────────
    private TimeSpan GetDelayUntilNextRun()
    {
        var now     = DateTime.Now;
        var nextRun = new DateTime(
            now.Year, now.Month, now.Day,
            _cfg.ScheduleHour, _cfg.ScheduleMinute, 0);

        if (now >= nextRun)
            nextRun = nextRun.AddDays(1);

        return nextRun - now;
    }

    // ── Retry loop ───────────────────────────────────────────────────────────
    private async Task RunWithRetryAsync(CancellationToken ct)
    {
        for (int attempt = 1; attempt <= _cfg.RetryCount; attempt++)
        {
            _log.LogInformation(
                "Attempt {A}/{Max} — {Time}", attempt, _cfg.RetryCount, DateTime.Now);

            try
            {
                // Scoped service: new Oracle + SQL Server connections per run
                await using var scope = _scope.CreateAsyncScope();
                var svc = scope.ServiceProvider
                               .GetRequiredService<IDashboardMigrationService>();

                var result = await svc.ExecuteAsync(ct);

                if (result.Success)
                {
                    _log.LogInformation(
                        "Success on attempt {A}. Rows migrated: {Count}.",
                        attempt, result.RecordsMigrated);
                    return; // done — wait for next 6 AM
                }

                _log.LogWarning(
                    "Service reported failure on attempt {A}: {Err}",
                    attempt, result.Error);
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Unhandled exception on attempt {A}.", attempt);
            }

            if (attempt < _cfg.RetryCount)
            {
                _log.LogInformation(
                    "Waiting {Sec}s before retry...", _cfg.RetryDelaySeconds);
                await Task.Delay(
                    TimeSpan.FromSeconds(_cfg.RetryDelaySeconds), ct);
            }
        }

        _log.LogError(
            "All {Max} retry attempts failed. Will retry at next scheduled 6 AM run.",
            _cfg.RetryCount);
    }
}
```

---

## 12. Program.cs

```csharp
using Serilog;
using OuDashboardWorker.Configuration;
using OuDashboardWorker.Data;
using OuDashboardWorker.Services;
using OuDashboardWorker.Workers;

// Bootstrap logger — captures any startup errors before host is built
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    Log.Information("Starting OU Dashboard Migration Worker...");

    var builder = Host.CreateApplicationBuilder(args);

    // ── Serilog (reads from appsettings Serilog section) ─────────────────────
    builder.Services.AddSerilog((services, lc) => lc
        .ReadFrom.Configuration(builder.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext());

    // ── Strongly-typed settings bound from appsettings.json ──────────────────
    builder.Services.Configure<MigrationSettings>(
        builder.Configuration.GetSection("MigrationSettings"));

    // ── DB factories: Singleton — stateless, just hold connection strings ─────
    builder.Services.AddSingleton<OracleConnectionFactory>();
    builder.Services.AddSingleton<SqlServerConnectionFactory>();

    // ── Migration service: Scoped — fresh DB connections created per DI scope ─
    builder.Services.AddScoped<IDashboardMigrationService, DashboardMigrationService>();

    // ── Hosted background worker ──────────────────────────────────────────────
    builder.Services.AddHostedService<DashboardMigrationWorker>();

    // ── Windows Service support (ignored on Linux — safe to keep) ────────────
    builder.Services.AddWindowsService(options =>
        options.ServiceName = "Janatics OU Dashboard Migration");

    await builder.Build().RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Worker terminated unexpectedly.");
}
finally
{
    await Log.CloseAndFlushAsync();
}
```

---

## 13. Deployment

### Publish

```bash
dotnet publish -c Release -r win-x64 --self-contained true -o C:\Services\OuDashboardWorker
```

### Windows Service

```powershell
# Run as Administrator
sc.exe create "JanaticsOuDashboard" `
    binpath="C:\Services\OuDashboardWorker\OuDashboardWorker.exe" `
    start=auto

sc.exe description "JanaticsOuDashboard" "Janatics OU Dashboard — Oracle to SQL Server daily migration"
sc.exe start "JanaticsOuDashboard"

# View logs
Get-Content "C:\Services\OuDashboardWorker\logs\ou-dashboard-$(Get-Date -Format 'yyyyMMdd').log" -Wait
```

### Linux systemd

```ini
# /etc/systemd/system/janatics-ou-dashboard.service
[Unit]
Description=Janatics OU Dashboard Migration Worker
After=network.target

[Service]
WorkingDirectory=/opt/janatics/ou-dashboard
ExecStart=/opt/janatics/ou-dashboard/OuDashboardWorker
Restart=on-failure
RestartSec=15
SyslogIdentifier=janatics-ou-dashboard

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable  janatics-ou-dashboard
sudo systemctl start   janatics-ou-dashboard
sudo journalctl -u     janatics-ou-dashboard -f
```

### Dev — Run Immediately Without Waiting for 6 AM

`appsettings.Development.json`:

```json
{
  "MigrationSettings": {
    "ScheduleHour": 0,
    "ScheduleMinute": 1
  }
}
```

Or for instant first-run, temporarily change `GetDelayUntilNextRun()`:

```csharp
// Temporary for testing only — reverts to real schedule
private TimeSpan GetDelayUntilNextRun() => TimeSpan.FromSeconds(10);
```

---

## Expected Log Output (Success Run)

```
[2026-05-28 06:00:00 INF] OU Dashboard Worker started. Scheduled daily at 06:00. Flag='Y'.
[2026-05-28 06:00:00 INF] Attempt 1/3 — 28/05/2026 06:00:00
[2026-05-28 06:00:00 INF] Migration started — Procedure: JAN_GET_OU_SALES_PERFORMANCE | p_stk_tfr_flg: 'Y' | 28/05/2026 06:00:00
[2026-05-28 06:00:12 INF] Oracle returned 10 OU rows (flag='Y').
[2026-05-28 06:00:12 INF] Truncated dbo.OuDashboardSummary.
[2026-05-28 06:00:12 INF] Migration complete — 10 rows → dbo.OuDashboardSummary.
[2026-05-28 06:00:12 INF] Success on attempt 1. Rows migrated: 10.
[2026-05-28 06:00:12 INF] Next run in 23h 59m → at 2026-05-29 06:00
```

---

*Janatics India Pvt. Ltd. — OU Dashboard Migration Worker | .NET 8 | Updated with JAN_GET_OU_SALES_PERFORMANCE*
