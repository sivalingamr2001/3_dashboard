-- ════════════════════════════════════════════════════════════════════════════════════════════════════════
-- Oracle Package: PKG_OU_DASHBOARD
-- Description: Provides stored procedures for OU Dashboard data migration (Oracle → SQL Server)
-- Usage: Call from .NET via C# - OuDashboardMigrationService
-- ════════════════════════════════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────────────────────────────────
-- PACKAGE SPECIFICATION
-- ────────────────────────────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE PACKAGE PKG_OU_DASHBOARD AS

    -- REF CURSOR type for returning result sets to .NET
    TYPE T_OU_CURSOR IS REF CURSOR;

    -- Main procedure: Fetch all OU summary data with dynamic FY date logic
    PROCEDURE GET_OU_SUMMARY (p_cursor OUT T_OU_CURSOR);

END PKG_OU_DASHBOARD;
/

-- ────────────────────────────────────────────────────────────────────────────────────────────────────────
-- PACKAGE BODY
-- ────────────────────────────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE PACKAGE BODY PKG_OU_DASHBOARD AS

    PROCEDURE GET_OU_SUMMARY (p_cursor OUT T_OU_CURSOR) IS
    BEGIN
        /*
        Dynamic FY Date Logic (All based on SYSDATE — no hardcoded years):
        ─────────────────────────────────────────────────────────────────
        - Current FY Start:  ADD_MONTHS(TRUNC(SYSDATE,'YYYY'), 3)    → Apr 1 of current calendar year
        - Current FY End:    TRUNC(ADD_MONTHS(TRUNC(SYSDATE,'YYYY'), 12), 'YYYY') - 1  → Mar 31 of current fiscal year
        - Previous FY Start: ADD_MONTHS(TRUNC(SYSDATE,'YYYY'), -9)   → Apr 1 of previous calendar year
        - Previous FY End:   TRUNC(SYSDATE,'YYYY') - 1               → Mar 31 of previous fiscal year
        
        Column Mappings:
        ──────────────
        OPERATING_UNIT                      ← Organization unit name
        LAST_YEAR_SALES_YTD                 ← Previous FY sales from Apr 1 to Mar 31 (YTD)
        LAST_YEAR_SALES_THIS_MONTH          ← Previous FY sales for the same month last year
        THIS_YEAR_SALES_YTD                 ← Current FY sales from Apr 1 to today (YTD)
        THIS_YEAR_SALES_THIS_MONTH          ← Current FY sales for current month
        LAST_YEAR_PENDING_ORDERS_YTD        ← Previous FY pending orders YTD
        LAST_YEAR_PENDING_THIS_MONTH        ← Previous FY pending orders for same month
        THIS_YEAR_PENDING_ORDERS_YTD        ← Current FY pending orders YTD
        THIS_YEAR_PENDING_THIS_MONTH        ← Current FY pending orders for current month
        INVENTORY_ASSET_VALUE               ← Total inventory asset value
        STK_TFR_FLG                         ← Stock transfer flag (Y/N)
        */
        
        OPEN p_cursor FOR
        SELECT
            -- Operating Unit
            OU.ORGANIZATION_NAME                                       AS OPERATING_UNIT,
            
            -- Previous FY Sales (Apr prev-yr → Mar curr-yr)
            NVL(SUM(CASE 
                WHEN TRUNC(SO.ORDER_DATE,'YYYY') = ADD_MONTHS(TRUNC(SYSDATE,'YYYY'), -12)
                THEN SO.ORDER_AMOUNT * SO.OU_CURRENCY_CONV_RATE
                ELSE 0 
            END), 0)                                                     AS LAST_YEAR_SALES_YTD,
            
            NVL(SUM(CASE 
                WHEN TO_CHAR(SO.ORDER_DATE,'MMYYYY') = TO_CHAR(ADD_MONTHS(SYSDATE, -12),'MMYYYY')
                THEN SO.ORDER_AMOUNT * SO.OU_CURRENCY_CONV_RATE
                ELSE 0 
            END), 0)                                                     AS LAST_YEAR_SALES_THIS_MONTH,
            
            -- Current FY Sales (Apr curr-yr → Yesterday)
            NVL(SUM(CASE 
                WHEN SO.ORDER_DATE >= ADD_MONTHS(TRUNC(SYSDATE,'YYYY'), 3)
                AND SO.ORDER_DATE <= TRUNC(SYSDATE) - 1
                THEN SO.ORDER_AMOUNT * SO.OU_CURRENCY_CONV_RATE
                ELSE 0 
            END), 0)                                                     AS THIS_YEAR_SALES_YTD,
            
            NVL(SUM(CASE 
                WHEN TO_CHAR(SO.ORDER_DATE,'MMYYYY') = TO_CHAR(SYSDATE,'MMYYYY')
                AND SO.ORDER_DATE >= ADD_MONTHS(TRUNC(SYSDATE,'YYYY'), 3)
                THEN SO.ORDER_AMOUNT * SO.OU_CURRENCY_CONV_RATE
                ELSE 0 
            END), 0)                                                     AS THIS_YEAR_SALES_THIS_MONTH,
            
            -- Previous FY Pending Orders (Apr prev-yr → Mar curr-yr)
            NVL(SUM(CASE 
                WHEN PO.STATUS = 'PENDING'
                AND TRUNC(PO.CREATION_DATE,'YYYY') = ADD_MONTHS(TRUNC(SYSDATE,'YYYY'), -12)
                THEN PO.ORDER_AMOUNT * OU.CURRENCY_CONV_RATE
                ELSE 0 
            END), 0)                                                     AS LAST_YEAR_PENDING_ORDERS_YTD,
            
            NVL(SUM(CASE 
                WHEN PO.STATUS = 'PENDING'
                AND TO_CHAR(PO.CREATION_DATE,'MMYYYY') = TO_CHAR(ADD_MONTHS(SYSDATE, -12),'MMYYYY')
                THEN PO.ORDER_AMOUNT * OU.CURRENCY_CONV_RATE
                ELSE 0 
            END), 0)                                                     AS LAST_YEAR_PENDING_THIS_MONTH,
            
            -- Current FY Pending Orders (Apr curr-yr → Today)
            NVL(SUM(CASE 
                WHEN PO.STATUS = 'PENDING'
                AND PO.CREATION_DATE >= ADD_MONTHS(TRUNC(SYSDATE,'YYYY'), 3)
                AND PO.CREATION_DATE <= TRUNC(SYSDATE)
                THEN PO.ORDER_AMOUNT * OU.CURRENCY_CONV_RATE
                ELSE 0 
            END), 0)                                                     AS THIS_YEAR_PENDING_ORDERS_YTD,
            
            NVL(SUM(CASE 
                WHEN PO.STATUS = 'PENDING'
                AND TO_CHAR(PO.CREATION_DATE,'MMYYYY') = TO_CHAR(SYSDATE,'MMYYYY')
                AND PO.CREATION_DATE >= ADD_MONTHS(TRUNC(SYSDATE,'YYYY'), 3)
                THEN PO.ORDER_AMOUNT * OU.CURRENCY_CONV_RATE
                ELSE 0 
            END), 0)                                                     AS THIS_YEAR_PENDING_THIS_MONTH,
            
            -- Inventory Asset Value (Planning Asset Sub-Inventories)
            NVL(SUM(INV.INVENTORY_VALUE), 0)                            AS INVENTORY_ASSET_VALUE,
            
            -- Stock Transfer Flag
            NVL(OU.STK_TFR_FLAG, 'N')                                   AS STK_TFR_FLG
        
        FROM
            HR_ORGANIZATION_UNITS OU
            LEFT JOIN SALES_ORDERS SO ON OU.ORG_ID = SO.ORG_ID
            LEFT JOIN PENDING_ORDERS PO ON OU.ORG_ID = PO.ORG_ID
            LEFT JOIN INVENTORY_SUMMARY INV ON OU.ORG_ID = INV.ORG_ID AND INV.SUBINV_CODE = 'ASSET'
        
        WHERE
            -- Include all active OUs and internal orgs (oa_flag = 'Y')
            OU.ACTIVE_FLAG = 'Y'
            AND (OU.OA_FLAG = 'Y' OR OU.TYPE_CODE = 'INT')
        
        GROUP BY
            OU.ORGANIZATION_NAME,
            OU.STK_TFR_FLAG
        
        ORDER BY
            OU.ORGANIZATION_NAME;

    END GET_OU_SUMMARY;

END PKG_OU_DASHBOARD;
/

-- ────────────────────────────────────────────────────────────────────────────────────────────────────────
-- TEST (Run independently in SQL*Plus or SQL Developer before connecting .NET)
-- ────────────────────────────────────────────────────────────────────────────────────────────────────────

/*
DECLARE
    v_cursor    PKG_OU_DASHBOARD.T_OU_CURSOR;
    v_ou        VARCHAR2(100);
    v_ly_ytd    NUMBER;
    v_ly_month  NUMBER;
    v_ty_ytd    NUMBER;
    v_ty_month  NUMBER;
    v_pending   NUMBER;
    v_inv       NUMBER;
    v_flag      CHAR;
BEGIN
    PKG_OU_DASHBOARD.GET_OU_SUMMARY(v_cursor);
    LOOP
        FETCH v_cursor INTO v_ou, v_ly_ytd, v_ly_month, v_ty_ytd, v_ty_month,
                            v_pending, v_pending, v_pending, v_pending, v_inv, v_flag;
        EXIT WHEN v_cursor%NOTFOUND;
        DBMS_OUTPUT.PUT_LINE(v_ou || ' | LY YTD: ' || v_ly_ytd || ' | TY YTD: ' || v_ty_ytd || ' | INV: ' || v_inv);
    END LOOP;
    CLOSE v_cursor;
END;
/
*/

-- ────────────────────────────────────────────────────────────────────────────────────────────────────────
-- COMPILE STATUS CHECK
-- ────────────────────────────────────────────────────────────────────────────────────────────────────────
-- SELECT OBJECT_NAME, OBJECT_TYPE, STATUS FROM USER_OBJECTS WHERE OBJECT_NAME = 'PKG_OU_DASHBOARD';
