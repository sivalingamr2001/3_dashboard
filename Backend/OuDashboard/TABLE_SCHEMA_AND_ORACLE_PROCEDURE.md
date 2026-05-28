# OU Dashboard Migration — New Table Schema

## Overview

The migration has been updated to use the **Jan_MIS_SalesData** table with the following schema and Oracle procedure **PKG_OU_DASHBOARD.GET_OU_SUMMARY**.

---

## SQL Server Table: Jan_MIS_SalesData

```sql
CREATE TABLE Jan_MIS_SalesData
(
    OPERATING_UNIT VARCHAR(100) NOT NULL,
    LAST_YEAR_SALES_YTD DECIMAL(18, 2) NOT NULL DEFAULT 0,
    LAST_YEAR_SALES_THIS_MONTH DECIMAL(18, 2) NOT NULL DEFAULT 0,
    THIS_YEAR_SALES_YTD DECIMAL(18, 2) NOT NULL DEFAULT 0,
    THIS_YEAR_SALES_THIS_MONTH DECIMAL(18, 2) NOT NULL DEFAULT 0,
    LAST_YEAR_PENDING_ORDERS_YTD DECIMAL(18, 2) NOT NULL DEFAULT 0,
    LAST_YEAR_PENDING_THIS_MONTH DECIMAL(18, 2) NOT NULL DEFAULT 0,
    THIS_YEAR_PENDING_ORDERS_YTD DECIMAL(18, 2) NOT NULL DEFAULT 0,
    THIS_YEAR_PENDING_THIS_MONTH DECIMAL(18, 2) NOT NULL DEFAULT 0,
    INVENTORY_ASSET_VALUE DECIMAL(18, 2) NOT NULL DEFAULT 0,
    STK_TFR_FLG CHAR(1) NOT NULL DEFAULT 'N'
);
```

### Column Descriptions

| Column | Type | Description |
|--------|------|-------------|
| `OPERATING_UNIT` | VARCHAR(100) | Organization unit name (e.g., "South Region") |
| `LAST_YEAR_SALES_YTD` | DECIMAL(18,2) | Previous FY sales from Apr 1 to Mar 31 (year-to-date) |
| `LAST_YEAR_SALES_THIS_MONTH` | DECIMAL(18,2) | Previous FY sales for the same month last year |
| `THIS_YEAR_SALES_YTD` | DECIMAL(18,2) | Current FY sales from Apr 1 to today (year-to-date) |
| `THIS_YEAR_SALES_THIS_MONTH` | DECIMAL(18,2) | Current FY sales for current month |
| `LAST_YEAR_PENDING_ORDERS_YTD` | DECIMAL(18,2) | Previous FY pending orders YTD |
| `LAST_YEAR_PENDING_THIS_MONTH` | DECIMAL(18,2) | Previous FY pending orders for same month |
| `THIS_YEAR_PENDING_ORDERS_YTD` | DECIMAL(18,2) | Current FY pending orders YTD |
| `THIS_YEAR_PENDING_THIS_MONTH` | DECIMAL(18,2) | Current FY pending orders for current month |
| `INVENTORY_ASSET_VALUE` | DECIMAL(18,2) | Total inventory asset value (INR) |
| `STK_TFR_FLG` | CHAR(1) | Stock transfer flag (Y/N) |

---

## Oracle Procedure: PKG_OU_DASHBOARD.GET_OU_SUMMARY

### Location
[Backend/OuDashboard/Scripts/PKG_OU_DASHBOARD.sql](./Scripts/PKG_OU_DASHBOARD.sql)

### Purpose
Fetches all Operating Unit summary data with dynamic fiscal year date logic. Called daily by the .NET migration service via REF CURSOR.

### Return Columns (in order)
1. `OPERATING_UNIT` — Organization name
2. `LAST_YEAR_SALES_YTD` — Previous FY sales YTD
3. `LAST_YEAR_SALES_THIS_MONTH` — Previous FY current month sales
4. `THIS_YEAR_SALES_YTD` — Current FY sales YTD
5. `THIS_YEAR_SALES_THIS_MONTH` — Current FY current month sales
6. `LAST_YEAR_PENDING_ORDERS_YTD` — Previous FY pending YTD
7. `LAST_YEAR_PENDING_THIS_MONTH` — Previous FY pending month
8. `THIS_YEAR_PENDING_ORDERS_YTD` — Current FY pending YTD
9. `THIS_YEAR_PENDING_THIS_MONTH` — Current FY pending month
10. `INVENTORY_ASSET_VALUE` — Total inventory value
11. `STK_TFR_FLG` — Stock transfer flag

### Dynamic FY Date Logic

All dates are based on **SYSDATE** (no hardcoded years):

```
Current FY Start:   ADD_MONTHS(TRUNC(SYSDATE,'YYYY'), 3)     → April 1 of current calendar year
Previous FY Start:  ADD_MONTHS(TRUNC(SYSDATE,'YYYY'), -9)    → April 1 of previous calendar year
Current FY End:     Mar 31 of current fiscal year
Previous FY End:    Mar 31 of previous fiscal year
```

**Example (May 2026):**
- Current FY:  Apr 1, 2026 → Mar 31, 2027
- Previous FY: Apr 1, 2025 → Mar 31, 2026

### Key Filters
- Active OUs only (`ACTIVE_FLAG = 'Y'`)
- Internal organizations (`OA_FLAG = 'Y' OR TYPE_CODE = 'INT'`)
- Orders with status filters as defined in your source tables

---

## Setup Instructions

### 1. Create SQL Server Table

Run the script on your SQL Server:

```sql
-- Execute on SQL Server (Janatics database)
:r Backend\OuDashboard\Scripts\Create_Jan_MIS_SalesData_Table.sql
```

Or paste the contents of [Create_Jan_MIS_SalesData_Table.sql](./Scripts/Create_Jan_MIS_SalesData_Table.sql).

**Verification:**
```sql
-- Check table exists
SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Jan_MIS_SalesData';

-- View table structure
EXEC sp_help 'Jan_MIS_SalesData';
```

### 2. Create Oracle Package

Connect to your Oracle database and run:

```sql
-- Execute on Oracle
@Backend/OuDashboard/Scripts/PKG_OU_DASHBOARD.sql
```

Or paste the contents of [PKG_OU_DASHBOARD.sql](./Scripts/PKG_OU_DASHBOARD.sql).

**Verification:**
```sql
-- Check package compilation status
SELECT OBJECT_NAME, OBJECT_TYPE, STATUS FROM USER_OBJECTS 
WHERE OBJECT_NAME = 'PKG_OU_DASHBOARD';

-- Test the procedure
DECLARE
    v_cursor PKG_OU_DASHBOARD.T_OU_CURSOR;
    v_ou VARCHAR2(100);
BEGIN
    PKG_OU_DASHBOARD.GET_OU_SUMMARY(v_cursor);
    FETCH v_cursor INTO v_ou;
    DBMS_OUTPUT.PUT_LINE('Test passed: ' || v_ou);
    CLOSE v_cursor;
END;
/
```

### 3. Update Backend Configuration

The `appsettings.json` has already been updated:

```json
"MigrationSettings": {
  "Enabled": true,
  "ScheduleHour": 6,
  "ScheduleMinute": 0,
  "OraclePackageProcedure": "PKG_OU_DASHBOARD.GET_OU_SUMMARY",
  "SqlServerTargetTable": "Jan_MIS_SalesData",
  "BatchSize": 500,
  "RetryCount": 3,
  "RetryDelaySeconds": 30
}
```

### 4. Update Connection Strings

Ensure both connection strings are correct in `appsettings.json`:

```json
"ConnectionStrings": {
  "OracleERP": "Data Source=(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=oracle-host)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=ERPDB)));User Id=user;Password=pass;",
  "SqlServer": "Data Source=sql-server;Database=Janatics;Integrated Security=True;TrustServerCertificate=True;"
}
```

---

## Migration Flow

```
┌─ Startup: Backend API loads OuDashboardWorker (BackgroundService)
│
├─ 6:00 AM Daily
│  ├─ OuDashboardWorker calculates delay to next 6 AM
│  └─ Waits until 6 AM
│
├─ Execution: Call PKG_OU_DASHBOARD.GET_OU_SUMMARY
│  ├─ REF CURSOR returns 11 columns per OU
│  ├─ Read loop builds OuDashboardRecord list
│  └─ Logs: "Oracle returned X OU rows"
│
├─ SQL Server Update
│  ├─ TRUNCATE TABLE Jan_MIS_SalesData (fresh daily)
│  ├─ SqlBulkCopy insert records (BatchSize=500)
│  └─ Logs: "X rows written to Jan_MIS_SalesData"
│
├─ Retry Logic (if failure)
│  ├─ Retry up to 3 times with 30-sec delays
│  └─ Logs: "Attempt N of 3"
│
└─ Complete: Wait for next day's 6 AM
```

---

## API Endpoint

### Manual Migration Trigger

**Endpoint:**
```
POST /api/migration/run
```

**Usage:**
```bash
curl -X POST http://localhost:5000/api/migration/run
```

**Response (Success):**
```json
{
  "success": true,
  "recordsMigrated": 42,
  "errorMessage": null,
  "timestamp": "2026-05-28T06:15:30.123Z"
}
```

---

## Monitoring & Logs

Logs are written to: `Backend/logs/migration-YYYY-MM-DD.log`

**Sample Log Output:**
```
[2026-05-28 06:00:00 INF] OU Dashboard migration started — 28/05/2026 06:00:00
[2026-05-28 06:00:05 INF] Oracle returned 42 OU rows.
[2026-05-28 06:00:06 INF] Truncated Jan_MIS_SalesData.
[2026-05-28 06:00:08 INF] Migration done. 42 rows written to Jan_MIS_SalesData.
```

---

## Troubleshooting

### Oracle Connection Errors
- Verify `OracleERP` connection string in `appsettings.json`
- Check Oracle credentials (User ID, Password)
- Confirm TNS name and port 1521 accessibility
- Test manually: `PKG_OU_DASHBOARD.GET_OU_SUMMARY` in SQL*Plus

### SQL Server Connection Errors
- Verify `SqlServer` connection string
- Check database name = `Janatics`
- Ensure Windows authentication or SQL authentication is enabled
- Test table exists: `SELECT COUNT(*) FROM Jan_MIS_SalesData`

### Migration Not Running
- Check `MigrationSettings.Enabled = true` in appsettings.json
- Verify application is running (not stopped)
- Manually trigger: `POST /api/migration/run`
- Check logs: `Backend/logs/migration-*.log`

---

## Reference Files

- **Backend Configuration** → [Backend/appsettings.json](../appsettings.json)
- **Development Config** → [Backend/appsettings.Development.json](../appsettings.Development.json)
- **Data Model** → [Backend/OuDashboard/Models/OuDashboardRecord.cs](./Models/OuDashboardRecord.cs)
- **Migration Service** → [Backend/OuDashboard/Services/OuDashboardMigrationService.cs](./Services/OuDashboardMigrationService.cs)
- **Background Worker** → [Backend/OuDashboard/Workers/OuDashboardWorker.cs](./Workers/OuDashboardWorker.cs)
- **API Endpoint** → [Backend/Controllers/MigrationController.cs](../Controllers/MigrationController.cs)

---

*OU Dashboard Migration — Jan_MIS_SalesData Table Integration*
