-- ════════════════════════════════════════════════════════════════════════════════════════════════════════
-- SQL Server: Jan_MIS_SalesData Table Creation
-- Description: Target table for OU Dashboard daily migration from Oracle
-- Database: Janatics (or your target database)
-- ════════════════════════════════════════════════════════════════════════════════════════════════════════

-- Run this script ONCE on SQL Server before starting the migration service

USE Janatics;  -- Change to your target database name if different
GO

-- Drop table if exists (optional — for dev/testing only)
-- DROP TABLE IF EXISTS dbo.Jan_MIS_SalesData;
-- GO

CREATE TABLE Jan_MIS_SalesData
(
    -- Operating Unit identifier
    OPERATING_UNIT VARCHAR(100) NOT NULL,

    -- Previous FY Sales (Apr prev-yr → Mar curr-yr)
    LAST_YEAR_SALES_YTD DECIMAL(18, 2) NOT NULL DEFAULT 0,
    LAST_YEAR_SALES_THIS_MONTH DECIMAL(18, 2) NOT NULL DEFAULT 0,

    -- Current FY Sales (Apr curr-yr → Yesterday)
    THIS_YEAR_SALES_YTD DECIMAL(18, 2) NOT NULL DEFAULT 0,
    THIS_YEAR_SALES_THIS_MONTH DECIMAL(18, 2) NOT NULL DEFAULT 0,

    -- Previous FY Pending Orders (Apr prev-yr → Mar curr-yr)
    LAST_YEAR_PENDING_ORDERS_YTD DECIMAL(18, 2) NOT NULL DEFAULT 0,
    LAST_YEAR_PENDING_THIS_MONTH DECIMAL(18, 2) NOT NULL DEFAULT 0,

    -- Current FY Pending Orders (Apr curr-yr → Today)
    THIS_YEAR_PENDING_ORDERS_YTD DECIMAL(18, 2) NOT NULL DEFAULT 0,
    THIS_YEAR_PENDING_THIS_MONTH DECIMAL(18, 2) NOT NULL DEFAULT 0,

    -- Inventory Asset Value (Planning Sub-Inventories, INR)
    INVENTORY_ASSET_VALUE DECIMAL(18, 2) NOT NULL DEFAULT 0,

    -- Stock Transfer Flag (Y/N)
    STK_TFR_FLG CHAR(1) NOT NULL DEFAULT 'N'
);

-- ────────────────────────────────────────────────────────────────────────────────────────────────────────
-- INDEXES (improves query performance for dashboard reads)
-- ────────────────────────────────────────────────────────────────────────────────────────────────────────

-- Index on OPERATING_UNIT for quick lookups by unit
CREATE INDEX IX_Jan_MIS_SalesData_OperatingUnit
    ON Jan_MIS_SalesData(OPERATING_UNIT);

-- Index on STK_TFR_FLG for filtering by stock transfer status
CREATE INDEX IX_Jan_MIS_SalesData_StkTfrFlg
    ON Jan_MIS_SalesData(STK_TFR_FLG);

-- ────────────────────────────────────────────────────────────────────────────────────────────────────────
-- VERIFICATION
-- ────────────────────────────────────────────────────────────────────────────────────────────────────────

-- Check table structure
-- SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Jan_MIS_SalesData';

-- View table definition
-- EXEC sp_help 'Jan_MIS_SalesData';

-- Count current rows
-- SELECT COUNT(*) AS RecordCount FROM Jan_MIS_SalesData;

-- View latest data
-- SELECT TOP 10 * FROM Jan_MIS_SalesData ORDER BY OPERATING_UNIT;

-- ════════════════════════════════════════════════════════════════════════════════════════════════════════
-- MIGRATION NOTES
-- ════════════════════════════════════════════════════════════════════════════════════════════════════════

/*
1. The .NET migration service (Backend) will:
   - Call Oracle package: PKG_OU_DASHBOARD.GET_OU_SUMMARY
   - Fetch 10 columns per Operating Unit via REF CURSOR
   - TRUNCATE this table daily
   - SqlBulkCopy insert all records (faster than row-by-row inserts)

2. Column Data Types:
   - OPERATING_UNIT: VARCHAR(100) — OU names (e.g., "South Region", "North Region")
   - All currency columns: DECIMAL(18, 2) — supports up to $999,999,999,999,999.99 in INR
   - STK_TFR_FLG: CHAR(1) — single character flag

3. Audit & Monitoring:
   - Table is TRUNCATED daily → fresh snapshot each run
   - To track history, create a separate history table or audit table if needed
   - Monitor migration logs at: Backend/logs/migration-YYYY-MM-DD.log

4. Performance Considerations:
   - Indexes on OPERATING_UNIT and STK_TFR_FLG help dashboard queries
   - SqlBulkCopy with BatchSize=500 handles large datasets efficiently
   - Decimal(18,2) provides sufficient precision for financial data

5. Rollback / Restore:
   - If migration fails, table remains truncated (empty)
   - Check Backend logs to diagnose the issue
   - Manually restore from archive if needed
   - Retry via API: POST /api/migration/run
*/

-- ════════════════════════════════════════════════════════════════════════════════════════════════════════
