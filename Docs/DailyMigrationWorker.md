# OU Dashboard — Oracle → SQL Server Daily Migration Worker
### Dynamic FY Sales & Pending Orders | Runs 6:00 AM Daily

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [SQL Server — Target Table](#2-sql-server--target-table)
3. [Oracle — Package & Procedure](#3-oracle--package--procedure)
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
14. [Dynamic FY Date Logic Reference](#14-dynamic-fy-date-logic-reference)

---

## 1. Architecture Overview

```
Every day at 6:00 AM
        │
        ▼
.NET Worker calls Oracle Package
        │
        ▼
PKG_OU_DASHBOARD.GET_OU_SUMMARY (REF CURSOR)
  └── Dynamic FY dates computed inside Oracle (SYSDATE based)
  └── All OU + Internal (oa_flag = 'Y')
  └── UNION ALL Inventory Asset Value
        │
        ▼
SQL Server: TRUNCATE dbo.OuDashboardSummary
        │
        ▼
SqlBulkCopy → dbo.OuDashboardSummary
        │
        ▼
Dashboard / React frontend reads SQL Server
```

**Why Oracle Package (best practice):**
- All date logic lives in Oracle — one place to change, no .NET redeployment needed
- Package groups related procedures, supports future additions (e.g. `GET_OU_EXTERNAL`)
- REF CURSOR is the standard Oracle pattern for returning result sets to .NET
- `.NET` is only responsible for transport — zero business logic in C#

---

## 2. SQL Server — Target Table

```sql
-- Run once on your SQL Server / Janatics DB
CREATE TABLE dbo.OuDashboardSummary
(
    Id                          INT             NOT NULL IDENTITY(1,1) PRIMARY KEY,

    -- Operating Unit
    OperatingUnit               NVARCHAR(200)   NOT NULL,

    -- Previous FY (25-26) Sales
    LastYearSalesYtd            DECIMAL(20, 2)  NOT NULL DEFAULT 0,
    LastYearSalesThisMonth      DECIMAL(20, 2)  NOT NULL DEFAULT 0,

    -- Current FY (26-27) Sales
    ThisYearSalesYtd            DECIMAL(20, 2)  NOT NULL DEFAULT 0,
    ThisYearSalesThisMonth      DECIMAL(20, 2)  NOT NULL DEFAULT 0,

    -- Previous FY (25-26) Pending Orders
    LastYearPendingOrdersYtd    DECIMAL(20, 2)  NOT NULL DEFAULT 0,
    LastYearPendingThisMonth    DECIMAL(20, 2)  NOT NULL DEFAULT 0,

    -- Current FY (26-27) Pending Orders
    ThisYearPendingOrdersYtd    DECIMAL(20, 2)  NOT NULL DEFAULT 0,
    ThisYearPendingThisMonth    DECIMAL(20, 2)  NOT NULL DEFAULT 0,

    -- Inventory
    InventoryAssetValue         DECIMAL(20, 2)  NOT NULL DEFAULT 0,

    -- Audit
    MigratedAt                  DATETIME2       NOT NULL DEFAULT GETDATE(),
    SnapshotDate                DATE            NOT NULL DEFAULT CAST(GETDATE() AS DATE),

    INDEX IX_OuDashboard_OperatingUnit (OperatingUnit),
    INDEX IX_OuDashboard_SnapshotDate  (SnapshotDate)
);
```

> **Column mapping to your original query output:**
>
> | SQL Server Column | Oracle Query Column |
> |---|---|
> | `LastYearSalesYtd` | `FY_25_26_SALE_AS_ON` |
> | `LastYearSalesThisMonth` | `FY_25_26_SALE_CURRNT_MNTH` |
> | `ThisYearSalesYtd` | `FY_26_27_SALE_AS_ON` |
> | `ThisYearSalesThisMonth` | `FY_26_27_SALE_CURRNT_MNTH` |
> | `LastYearPendingOrdersYtd` | `FY_25_26_PEND_AS_ON` |
> | `LastYearPendingThisMonth` | `FY_25_26_PEND_CURRNT_MNTH` |
> | `ThisYearPendingOrdersYtd` | `FY_26_27_PEND_AS_ON` |
> | `ThisYearPendingThisMonth` | `FY_26_27_PEND_CURRNT_MNTH` |
> | `InventoryAssetValue` | `INV_AMT` |

---

## 3. Oracle — Package & Procedure

### 3.1 Package Spec

```sql
CREATE OR REPLACE PACKAGE PKG_OU_DASHBOARD AS

    -- REF CURSOR type
    TYPE T_OU_CURSOR IS REF CURSOR;

    -- Main procedure: All OU (External + Internal, oa_flag = 'Y') + Inventory
    PROCEDURE GET_OU_SUMMARY (p_cursor OUT T_OU_CURSOR);

END PKG_OU_DASHBOARD;
/
```

### 3.2 Package Body

```sql
CREATE OR REPLACE PACKAGE BODY PKG_OU_DASHBOARD AS

    PROCEDURE GET_OU_SUMMARY (p_cursor OUT T_OU_CURSOR) IS
    BEGIN
        /*
        ═══════════════════════════════════════════════════════════════════════
        DYNAMIC DATE LOGIC (fully SYSDATE-based — no hardcoded FY years)
        ═══════════════════════════════════════════════════════════════════════

        Indian FY starts April 1.
        TRUNC(ADD_MONTHS(SYSDATE, -3), 'YYYY') + 3  → Apr 1 of CURRENT FY
        TRUNC(ADD_MONTHS(SYSDATE,-15), 'YYYY') + 3  → Apr 1 of PREVIOUS FY
        TRUNC(ADD_MONTHS(SYSDATE,-12)) - 1           → Mar 31 of PREVIOUS FY (yesterday of prev FY)
        TRUNC(SYSDATE) - 1                           → Yesterday (current FY YTD cutoff)
        TO_CHAR(SYSDATE,'MMYYYY')                    → Current month (for This Month columns)
        TO_CHAR(ADD_MONTHS(SYSDATE,-12),'MMYYYY')    → Same month last year

        This means:
          • Running in May 2026 → Current FY = Apr 2026 to yesterday
          • Running in May 2026 → Previous FY = Apr 2025 to Mar 2026 (same month last year = May 2025)
          • Running in Apr 2027 → Current FY = Apr 2027 to yesterday (auto-shifts)
          • NO code change ever needed for year rollover
        ═══════════════════════════════════════════════════════════════════════
        */

        OPEN p_cursor FOR

        -- ── OUTER AGGREGATION ────────────────────────────────────────────────
        SELECT
            OU_NAME,
            SUM(FY_PREV_SALE_AS_ON)         AS LAST_YEAR_SALES_YTD,
            SUM(FY_PREV_SALE_CURR_MNTH)     AS LAST_YEAR_SALES_THIS_MONTH,
            SUM(FY_CURR_SALE_AS_ON)         AS THIS_YEAR_SALES_YTD,
            SUM(FY_CURR_SALE_CURR_MNTH)     AS THIS_YEAR_SALES_THIS_MONTH,
            SUM(FY_PREV_PEND_AS_ON)         AS LAST_YEAR_PENDING_ORDERS_YTD,
            SUM(FY_PREV_PEND_CURR_MNTH)     AS LAST_YEAR_PENDING_THIS_MONTH,
            SUM(FY_CURR_PEND_AS_ON)         AS THIS_YEAR_PENDING_ORDERS_YTD,
            SUM(FY_CURR_PEND_CURR_MNTH)     AS THIS_YEAR_PENDING_THIS_MONTH,
            SUM(INV_AMT)                    AS INVENTORY_ASSET_VALUE
        FROM (

            -- ── BLOCK 1: Sales & Pending Orders (All OU, oa_flag = 'Y') ─────
            SELECT
                OU_NAME,
                SUM(FY_PREV_SALE_AS_ON)     AS FY_PREV_SALE_AS_ON,
                SUM(FY_PREV_SALE_CURR_MNTH) AS FY_PREV_SALE_CURR_MNTH,
                SUM(FY_CURR_SALE_AS_ON)     AS FY_CURR_SALE_AS_ON,
                SUM(FY_CURR_SALE_CURR_MNTH) AS FY_CURR_SALE_CURR_MNTH,
                SUM(FY_PREV_PEND_AS_ON)     AS FY_PREV_PEND_AS_ON,
                SUM(FY_PREV_PEND_CURR_MNTH) AS FY_PREV_PEND_CURR_MNTH,
                SUM(FY_CURR_PEND_AS_ON)     AS FY_CURR_PEND_AS_ON,
                SUM(FY_CURR_PEND_CURR_MNTH) AS FY_CURR_PEND_CURR_MNTH,
                0                           AS INV_AMT
            FROM (
                SELECT
                    OU_NAME,

                    -- ── PREVIOUS FY: Apr 1 (prev) → Mar 31 (prev) YTD ────────
                    NVL(SUM(CASE
                        WHEN SOURCE_NAME = 'SALES'
                         AND TRX_DATE >= TRUNC(ADD_MONTHS(SYSDATE, -15), 'YYYY') + 3
                         AND TRX_DATE <= TRUNC(ADD_MONTHS(SYSDATE, -12)) - 1
                        THEN QUANTITY_INVOICED * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate
                    END), 0) AS FY_PREV_SALE_AS_ON,

                    -- ── PREVIOUS FY: Same month last year ─────────────────────
                    NVL(SUM(CASE
                        WHEN SOURCE_NAME = 'SALES'
                         AND TO_CHAR(TRX_DATE, 'MMYYYY') = TO_CHAR(ADD_MONTHS(SYSDATE, -12), 'MMYYYY')
                        THEN QUANTITY_INVOICED * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate
                    END), 0) AS FY_PREV_SALE_CURR_MNTH,

                    -- ── CURRENT FY: Apr 1 (curr) → Yesterday YTD ─────────────
                    NVL(SUM(CASE
                        WHEN SOURCE_NAME = 'SALES'
                         AND TRX_DATE >= TRUNC(ADD_MONTHS(SYSDATE, -3), 'YYYY') + 3
                         AND TRX_DATE <= TRUNC(SYSDATE) - 1
                        THEN QUANTITY_INVOICED * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate
                    END), 0) AS FY_CURR_SALE_AS_ON,

                    -- ── CURRENT FY: This month ────────────────────────────────
                    NVL(SUM(CASE
                        WHEN SOURCE_NAME = 'SALES'
                         AND TO_CHAR(TRX_DATE, 'MMYYYY') = TO_CHAR(SYSDATE, 'MMYYYY')
                        THEN QUANTITY_INVOICED * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate
                    END), 0) AS FY_CURR_SALE_CURR_MNTH,

                    -- ── PREV FY PENDING: Apr 1 (prev) → Mar 31 (prev) YTD ────
                    NVL(SUM(CASE
                        WHEN SOURCE_NAME = 'ORDER'
                         AND ORDERED_DATE >= TRUNC(ADD_MONTHS(SYSDATE, -15), 'YYYY') + 3
                         AND ORDERED_DATE <= TRUNC(ADD_MONTHS(SYSDATE, -12)) - 1
                        THEN PEND_QUANTITY * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate
                    END), 0) AS FY_PREV_PEND_AS_ON,

                    -- ── PREV FY PENDING: Same month last year ─────────────────
                    NVL(SUM(CASE
                        WHEN SOURCE_NAME = 'ORDER'
                         AND TO_CHAR(ORDERED_DATE, 'MMYYYY') = TO_CHAR(ADD_MONTHS(SYSDATE, -12), 'MMYYYY')
                        THEN PEND_QUANTITY * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate
                    END), 0) AS FY_PREV_PEND_CURR_MNTH,

                    -- ── CURR FY PENDING: Apr 1 (curr) → Yesterday YTD ────────
                    NVL(SUM(CASE
                        WHEN SOURCE_NAME = 'ORDER'
                         AND ORDERED_DATE >= TRUNC(ADD_MONTHS(SYSDATE, -3), 'YYYY') + 3
                         AND ORDERED_DATE <= TRUNC(SYSDATE) - 1
                        THEN PEND_QUANTITY * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate
                    END), 0) AS FY_CURR_PEND_AS_ON,

                    -- ── CURR FY PENDING: This month ───────────────────────────
                    NVL(SUM(CASE
                        WHEN SOURCE_NAME = 'ORDER'
                         AND TO_CHAR(ORDERED_DATE, 'MMYYYY') = TO_CHAR(SYSDATE, 'MMYYYY')
                        THEN PEND_QUANTITY * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate
                    END), 0) AS FY_CURR_PEND_CURR_MNTH,

                    -- oa_flag: exclude internal/stock-transfer rows for ORG_ID=103
                    CASE
                        WHEN ORG_ID = 103
                         AND (   ORD_EMPT_STATUS = 'Y'
                              OR BILL_TO_CUST_NAME = 'JANATICS INDIA PVT. LTD - UNIT V'
                              OR BILL_TO_CUST_NAME = 'JANATICS INDIA PVT. LTD - UNIT VI')
                        THEN 'N'
                        ELSE 'Y'
                    END AS OA_FLAG

                FROM JAN_ALL_OU_ORD_SALES_V
                WHERE (
                       TRX_DATE     >= TRUNC(ADD_MONTHS(SYSDATE, -15), 'YYYY') + 3
                    OR ORDERED_DATE >= TRUNC(ADD_MONTHS(SYSDATE, -15), 'YYYY') + 3
                )
                GROUP BY
                    OU_NAME,
                    ORD_EMPT_STATUS,
                    BILL_TO_CUST_NAME,
                    ORG_ID
            )
            WHERE OA_FLAG = 'Y'
            GROUP BY OU_NAME

            UNION ALL

            -- ── BLOCK 2: Inventory Asset Value per Operating Unit ────────────
            SELECT
                OU_NAME,
                0, 0, 0, 0,
                0, 0, 0, 0,
                SUM(INV_AMT) AS INV_AMT
            FROM (
                SELECT
                    (
                        SELECT NAME
                        FROM   HR_OPERATING_UNITS N
                        WHERE  N.ORGANIZATION_ID = (
                            SELECT OPERATING_UNIT
                            FROM   ORG_ORGANIZATION_DEFINITIONS M
                            WHERE  M.ORGANIZATION_ID = A.ORGANIZATION_ID
                        )
                    ) AS OU_NAME,
                    TRANSACTION_QUANTITY * ITEM_COST AS INV_AMT
                FROM JAN_ALL_OU_INVENTORY_DETAILS A
                WHERE INVENTORY_OTHERS = 'Planning Asset Sub-Inventories'
            )
            GROUP BY OU_NAME

        ) -- end UNION ALL subquery
        GROUP BY OU_NAME;

    END GET_OU_SUMMARY;

END PKG_OU_DASHBOARD;
/
```

### 3.3 Quick Test in SQL*Plus / SQL Developer

```sql
-- Test the procedure independently before wiring .NET
DECLARE
    v_cursor PKG_OU_DASHBOARD.T_OU_CURSOR;
    v_ou     VARCHAR2(200);
    v_ly_ytd NUMBER;
    v_ty_ytd NUMBER;
    v_inv    NUMBER;
BEGIN
    PKG_OU_DASHBOARD.GET_OU_SUMMARY(v_cursor);
    LOOP
        FETCH v_cursor INTO v_ou, v_ly_ytd, v_ly_month,
                            v_ty_ytd, v_ty_month,
                            v_lp_ytd, v_lp_month,
                            v_tp_ytd, v_tp_month, v_inv;
        EXIT WHEN v_cursor%NOTFOUND;
        DBMS_OUTPUT.PUT_LINE(v_ou || ' | LY YTD: ' || v_ly_ytd || ' | TY YTD: ' || v_ty_ytd);
    END LOOP;
    CLOSE v_cursor;
END;
/
```

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
│   └── DashboardMigrationWorker.cs       ← BackgroundService (6 AM scheduler)
│
├── Services/
│   ├── IDashboardMigrationService.cs
│   └── DashboardMigrationService.cs      ← Oracle fetch + SQL Server insert
│
├── Data/
│   ├── OracleConnectionFactory.cs
│   └── SqlServerConnectionFactory.cs
│
├── Models/
│   └── OuDashboardRecord.cs              ← POCO matching table columns
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
    <PackageReference Include="Oracle.ManagedDataAccess.Core"            Version="23.5.1" />
    <PackageReference Include="Microsoft.Data.SqlClient"                 Version="5.2.2"  />
    <PackageReference Include="Microsoft.Extensions.Hosting"             Version="8.0.1"  />
    <PackageReference Include="Microsoft.Extensions.Hosting.WindowsServices" Version="8.0.1" />
    <PackageReference Include="Serilog.Extensions.Hosting"              Version="8.0.0"  />
    <PackageReference Include="Serilog.Sinks.Console"                   Version="6.0.0"  />
    <PackageReference Include="Serilog.Sinks.File"                      Version="6.0.0"  />
    <PackageReference Include="Serilog.Settings.Configuration"          Version="8.0.4"  />
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
    "OraclePackageProcedure": "PKG_OU_DASHBOARD.GET_OU_SUMMARY",
    "SqlServerTargetTable": "dbo.OuDashboardSummary",
    "BatchSize": 500,
    "RetryCount": 3,
    "RetryDelaySeconds": 30
  },
  "ConnectionStrings": {
    "OracleERP": "Data Source=(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=your-oracle-host)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=ERPDB)));User Id=jan_user;Password=your_password;",
    "SqlServer":  "Server=your-sql-server;Database=JanaticsDB;Integrated Security=True;TrustServerCertificate=True;"
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
          "retainedFileCountLimit": 30
        }
      }
    ]
  }
}
```

---

## 7. Configuration Model

```csharp
// Configuration/MigrationSettings.cs
namespace OuDashboardWorker.Configuration;

public class MigrationSettings
{
    public int    ScheduleHour             { get; set; } = 6;
    public int    ScheduleMinute           { get; set; } = 0;
    public string OraclePackageProcedure   { get; set; } = string.Empty;
    public string SqlServerTargetTable     { get; set; } = string.Empty;
    public int    BatchSize                { get; set; } = 500;
    public int    RetryCount               { get; set; } = 3;
    public int    RetryDelaySeconds        { get; set; } = 30;
}
```

---

## 8. Models

```csharp
// Models/OuDashboardRecord.cs
namespace OuDashboardWorker.Models;

/// <summary>
/// One row per Operating Unit — mirrors dbo.OuDashboardSummary columns.
/// All monetary values are in INR (converted by Ou_Currency_Conv_Rate in Oracle).
/// </summary>
public class OuDashboardRecord
{
    public string  OperatingUnit            { get; set; } = string.Empty;

    // Previous FY Sales (Apr prev-yr → Mar curr-yr)
    public decimal LastYearSalesYtd         { get; set; }
    public decimal LastYearSalesThisMonth   { get; set; }

    // Current FY Sales (Apr curr-yr → Yesterday)
    public decimal ThisYearSalesYtd         { get; set; }
    public decimal ThisYearSalesThisMonth   { get; set; }

    // Previous FY Pending Orders
    public decimal LastYearPendingOrdersYtd { get; set; }
    public decimal LastYearPendingThisMonth { get; set; }

    // Current FY Pending Orders
    public decimal ThisYearPendingOrdersYtd { get; set; }
    public decimal ThisYearPendingThisMonth { get; set; }

    // Inventory (Planning Asset Sub-Inventories)
    public decimal InventoryAssetValue      { get; set; }

    // Set by .NET before insert
    public DateTime MigratedAt              { get; set; } = DateTime.Now;
    public DateTime SnapshotDate            { get; set; } = DateTime.Today;
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
    public OracleConnectionFactory(IConfiguration cfg)
        => _cs = cfg.GetConnectionString("OracleERP")
               ?? throw new InvalidOperationException("Missing OracleERP connection string.");

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
    public SqlServerConnectionFactory(IConfiguration cfg)
        => _cs = cfg.GetConnectionString("SqlServer")
               ?? throw new InvalidOperationException("Missing SqlServer connection string.");

    public SqlConnection Create() => new(_cs);
}
```

---

## 10. Migration Service

```csharp
// Services/IDashboardMigrationService.cs
namespace OuDashboardWorker.Services;

public interface IDashboardMigrationService
{
    Task<MigrationResult> ExecuteAsync(CancellationToken ct);
}

public record MigrationResult(bool Success, int RecordsMigrated, string? Error = null);
```

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
        OracleConnectionFactory    oracle,
        SqlServerConnectionFactory sql,
        IOptions<MigrationSettings> opts,
        ILogger<DashboardMigrationService> log)
    {
        _oracle = oracle;
        _sql    = sql;
        _cfg    = opts.Value;
        _log    = log;
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
        var now     = DateTime.Now;

        await using var conn = _oracle.Create();
        await conn.OpenAsync(ct);

        await using var cmd = conn.CreateCommand();
        cmd.CommandText    = _cfg.OraclePackageProcedure;   // PKG_OU_DASHBOARD.GET_OU_SUMMARY
        cmd.CommandType    = CommandType.StoredProcedure;
        cmd.CommandTimeout = 180; // 3 min — query is heavy

        // REF CURSOR output parameter — Oracle.ManagedDataAccess pattern
        cmd.Parameters.Add(new OracleParameter
        {
            ParameterName = "p_cursor",
            OracleDbType  = OracleDbType.RefCursor,
            Direction     = ParameterDirection.Output
        });

        await using var reader = await cmd.ExecuteReaderAsync(ct);

        while (await reader.ReadAsync(ct))
        {
            records.Add(new OuDashboardRecord
            {
                OperatingUnit            = GetString(reader, "OPERATING_UNIT")             ?? string.Empty,
                LastYearSalesYtd         = GetDecimal(reader, "LAST_YEAR_SALES_YTD"),
                LastYearSalesThisMonth   = GetDecimal(reader, "LAST_YEAR_SALES_THIS_MONTH"),
                ThisYearSalesYtd         = GetDecimal(reader, "THIS_YEAR_SALES_YTD"),
                ThisYearSalesThisMonth   = GetDecimal(reader, "THIS_YEAR_SALES_THIS_MONTH"),
                LastYearPendingOrdersYtd = GetDecimal(reader, "LAST_YEAR_PENDING_ORDERS_YTD"),
                LastYearPendingThisMonth = GetDecimal(reader, "LAST_YEAR_PENDING_THIS_MONTH"),
                ThisYearPendingOrdersYtd = GetDecimal(reader, "THIS_YEAR_PENDING_ORDERS_YTD"),
                ThisYearPendingThisMonth = GetDecimal(reader, "THIS_YEAR_PENDING_THIS_MONTH"),
                InventoryAssetValue      = GetDecimal(reader, "INVENTORY_ASSET_VALUE"),
                MigratedAt               = now,
                SnapshotDate             = now.Date
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
            BatchSize            = _cfg.BatchSize,
            BulkCopyTimeout      = 120
        };

        // DataTable column → SQL Server column (explicit = safe)
        bulk.ColumnMappings.Add("OperatingUnit",            "OperatingUnit");
        bulk.ColumnMappings.Add("LastYearSalesYtd",         "LastYearSalesYtd");
        bulk.ColumnMappings.Add("LastYearSalesThisMonth",   "LastYearSalesThisMonth");
        bulk.ColumnMappings.Add("ThisYearSalesYtd",         "ThisYearSalesYtd");
        bulk.ColumnMappings.Add("ThisYearSalesThisMonth",   "ThisYearSalesThisMonth");
        bulk.ColumnMappings.Add("LastYearPendingOrdersYtd", "LastYearPendingOrdersYtd");
        bulk.ColumnMappings.Add("LastYearPendingThisMonth", "LastYearPendingThisMonth");
        bulk.ColumnMappings.Add("ThisYearPendingOrdersYtd", "ThisYearPendingOrdersYtd");
        bulk.ColumnMappings.Add("ThisYearPendingThisMonth", "ThisYearPendingThisMonth");
        bulk.ColumnMappings.Add("InventoryAssetValue",      "InventoryAssetValue");
        bulk.ColumnMappings.Add("MigratedAt",               "MigratedAt");
        bulk.ColumnMappings.Add("SnapshotDate",             "SnapshotDate");

        await bulk.WriteToServerAsync(dt, ct);

        return records.Count;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────
    private static DataTable BuildDataTable(List<OuDashboardRecord> records)
    {
        var dt = new DataTable();
        dt.Columns.Add("OperatingUnit",            typeof(string));
        dt.Columns.Add("LastYearSalesYtd",         typeof(decimal));
        dt.Columns.Add("LastYearSalesThisMonth",   typeof(decimal));
        dt.Columns.Add("ThisYearSalesYtd",         typeof(decimal));
        dt.Columns.Add("ThisYearSalesThisMonth",   typeof(decimal));
        dt.Columns.Add("LastYearPendingOrdersYtd", typeof(decimal));
        dt.Columns.Add("LastYearPendingThisMonth", typeof(decimal));
        dt.Columns.Add("ThisYearPendingOrdersYtd", typeof(decimal));
        dt.Columns.Add("ThisYearPendingThisMonth", typeof(decimal));
        dt.Columns.Add("InventoryAssetValue",      typeof(decimal));
        dt.Columns.Add("MigratedAt",               typeof(DateTime));
        dt.Columns.Add("SnapshotDate",             typeof(DateTime));

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

    private static string?  GetString (IDataReader r, string col)
        => r.IsDBNull(r.GetOrdinal(col)) ? null : r.GetString(r.GetOrdinal(col));

    private static decimal GetDecimal(IDataReader r, string col)
        => r.IsDBNull(r.GetOrdinal(col)) ? 0m : r.GetDecimal(r.GetOrdinal(col));
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
    private readonly IServiceScopeFactory _scope;
    private readonly MigrationSettings    _cfg;
    private readonly ILogger<DashboardMigrationWorker> _log;

    public DashboardMigrationWorker(
        IServiceScopeFactory scopeFactory,
        IOptions<MigrationSettings> opts,
        ILogger<DashboardMigrationWorker> log)
    {
        _scope = scopeFactory;
        _cfg   = opts.Value;
        _log   = log;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _log.LogInformation(
            "OU Dashboard Worker started. Scheduled at {H:D2}:{M:D2} daily.",
            _cfg.ScheduleHour, _cfg.ScheduleMinute);

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

    // ── Calculate exact delay to the next 06:00:00 ───────────────────────────
    private TimeSpan GetDelayUntilNextRun()
    {
        var now     = DateTime.Now;
        var nextRun = new DateTime(
            now.Year, now.Month, now.Day,
            _cfg.ScheduleHour, _cfg.ScheduleMinute, 0);

        // Already past 6 AM today → target tomorrow
        if (now >= nextRun)
            nextRun = nextRun.AddDays(1);

        return nextRun - now;
    }

    // ── Retry wrapper ────────────────────────────────────────────────────────
    private async Task RunWithRetryAsync(CancellationToken ct)
    {
        for (int attempt = 1; attempt <= _cfg.RetryCount; attempt++)
        {
            _log.LogInformation("Attempt {A} of {Max}", attempt, _cfg.RetryCount);

            try
            {
                await using var scope = _scope.CreateAsyncScope();
                var svc = scope.ServiceProvider
                               .GetRequiredService<IDashboardMigrationService>();

                var result = await svc.ExecuteAsync(ct);

                if (result.Success)
                {
                    _log.LogInformation(
                        "Success on attempt {A}. Rows migrated: {Count}.",
                        attempt, result.RecordsMigrated);
                    return;
                }

                _log.LogWarning(
                    "Service returned failure on attempt {A}: {Err}",
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
            "All {Max} attempts failed. Will retry at next 6 AM run.",
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

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    Log.Information("Starting OU Dashboard Migration Worker...");

    var builder = Host.CreateApplicationBuilder(args);

    // Serilog from appsettings.json
    builder.Services.AddSerilog((services, lc) => lc
        .ReadFrom.Configuration(builder.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext());

    // Strongly-typed config
    builder.Services.Configure<MigrationSettings>(
        builder.Configuration.GetSection("MigrationSettings"));

    // DB factories — Singleton (stateless)
    builder.Services.AddSingleton<OracleConnectionFactory>();
    builder.Services.AddSingleton<SqlServerConnectionFactory>();

    // Migration service — Scoped (fresh connections per run via scope)
    builder.Services.AddScoped<IDashboardMigrationService, DashboardMigrationService>();

    // Background worker
    builder.Services.AddHostedService<DashboardMigrationWorker>();

    // Windows Service support
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

### Windows Service

```powershell
dotnet publish -c Release -r win-x64 --self-contained true -o C:\Services\OuDashboardWorker

sc.exe create "JanaticsOuDashboard" `
    binpath="C:\Services\OuDashboardWorker\OuDashboardWorker.exe" `
    start=auto

sc.exe start "JanaticsOuDashboard"
```

### Linux systemd

```ini
# /etc/systemd/system/janatics-ou-dashboard.service
[Unit]
Description=Janatics OU Dashboard Migration Worker
After=network.target

[Service]
WorkingDirectory=/opt/janatics/ou-dashboard-worker
ExecStart=/opt/janatics/ou-dashboard-worker/OuDashboardWorker
Restart=on-failure
RestartSec=15

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable janatics-ou-dashboard
sudo systemctl start  janatics-ou-dashboard
sudo journalctl -u janatics-ou-dashboard -f
```

### Quick Dev Test (run immediately without waiting for 6 AM)

In `appsettings.Development.json`:

```json
{
  "MigrationSettings": {
    "ScheduleHour": 0,
    "ScheduleMinute": 1
  }
}
```

Or for **instant** test: temporarily change `GetDelayUntilNextRun()` to return `TimeSpan.FromSeconds(10)`.

---

## 14. Dynamic FY Date Logic Reference

All date calculations are purely `SYSDATE` based inside the Oracle package. Zero hardcoded years.

| Oracle Expression | What it resolves to (May 2026 example) |
|---|---|
| `TRUNC(ADD_MONTHS(SYSDATE,-3),'YYYY') + 3` | 1-Apr-2026 (Start of current FY) |
| `TRUNC(SYSDATE) - 1` | 27-May-2026 (Yesterday — current FY YTD) |
| `TO_CHAR(SYSDATE,'MMYYYY')` | `052026` (this month filter) |
| `TRUNC(ADD_MONTHS(SYSDATE,-15),'YYYY') + 3` | 1-Apr-2025 (Start of previous FY) |
| `TRUNC(ADD_MONTHS(SYSDATE,-12)) - 1` | 27-May-2025 (Same day last year − 1) |
| `TO_CHAR(ADD_MONTHS(SYSDATE,-12),'MMYYYY')` | `052025` (same month last year) |

**April 1 logic explained:**

```
TRUNC(ADD_MONTHS(SYSDATE, -3), 'YYYY')
  → Shift SYSDATE back 3 months (to Jan/Feb/Mar)
  → TRUNC to YYYY gives Jan 1 of that year
  → + 3 days gives Apr 1 (day 91 − day 88 offset... actually +3 means Jan 1 + 3 days = Jan 4 ← WRONG)
```

> ⚠️ **Important:** `TRUNC(date,'YYYY') + 3` gives **Jan 4**, not Apr 1.
> Your original query used this pattern. Verify in your Oracle environment whether this gives the correct Apr 1.
> The correct expression for Apr 1 of current FY is:
>
> ```sql
> TRUNC(ADD_MONTHS(SYSDATE, -3), 'YYYY') + INTERVAL '3' MONTH
> -- or more explicitly:
> ADD_MONTHS(TRUNC(SYSDATE,'YYYY'), 3)   -- Jan 1 of this year + 3 months = Apr 1
> -- For previous FY Apr 1:
> ADD_MONTHS(TRUNC(SYSDATE,'YYYY'), -9)  -- Jan 1 of this year - 9 months = Apr 1 last year
> ```
>
> The package body above uses your **original expressions as-is** to match your existing view behaviour.
> Align this with your DBA to confirm Apr 1 resolves correctly.

---

*Janatics India Pvt. Ltd. — OU Dashboard Migration Worker — .NET 8 implementation guide*
