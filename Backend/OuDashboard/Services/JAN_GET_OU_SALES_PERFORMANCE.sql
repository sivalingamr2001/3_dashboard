create or replace PROCEDURE JAN_GET_OU_SALES_PERFORMANCE(
    p_stk_tfr_flg IN VARCHAR2 DEFAULT 'Y',
    p_cursor       OUT SYS_REFCURSOR
)
AS
    v_curr_fy_start    DATE;
    v_curr_fy_end      DATE;
    v_prev_fy_start    DATE;
    v_prev_fy_end      DATE;
    
    -- Month start boundaries (1st of current month and same month last year)
    v_curr_month_start DATE;
    v_prev_month_start DATE;

BEGIN
    -- ============================================
    -- DYNAMIC FY CALCULATION (April to March)
    -- ============================================
    -- Use EXTRACT instead of TO_NUMBER(TO_CHAR) to avoid NLS issues
    IF EXTRACT(MONTH FROM SYSDATE) >= 4 THEN
        v_curr_fy_start := TO_DATE('01-APR-' || TO_CHAR(SYSDATE, 'YYYY'), 'DD-MON-YYYY');
    ELSE
        v_curr_fy_start := TO_DATE('01-APR-' || TO_CHAR(ADD_MONTHS(SYSDATE, -12), 'YYYY'), 'DD-MON-YYYY');
    END IF;

    -- As On date ranges (up to current date) - SAME for both FY and Month
    v_curr_fy_end   := TRUNC(SYSDATE) + 1;  -- Exclusive upper bound
    v_prev_fy_start := ADD_MONTHS(v_curr_fy_start, -12);
    v_prev_fy_end   := ADD_MONTHS(v_curr_fy_end, -12);

    -- ============================================
    -- MONTH START BOUNDARIES (1st of month, NOT full month)
    -- ============================================
    -- Current month: 1st of current month (e.g., 01-Jun-2026)
    v_curr_month_start := TRUNC(SYSDATE, 'MM');
    
    -- Same month last year: 1st of same month last year (e.g., 01-Jun-2025)
    v_prev_month_start := ADD_MONTHS(v_curr_month_start, -12);

    IF p_stk_tfr_flg = 'Y' THEN
        -- ============================================
        -- ALL / INTERNAL + EXTERNAL
        -- ============================================
        OPEN p_cursor FOR
            SELECT
                ORG_ID,
                OU_NAME,
                SUM(PREV_FY_SALE_AS_ON)       AS PREV_FY_SALE_AS_ON,
                SUM(PREV_FY_SALE_CURRNT_MNTH)  AS PREV_FY_SALE_CURRNT_MNTH,
                SUM(CURR_FY_SALE_AS_ON)        AS CURR_FY_SALE_AS_ON,
                SUM(CURR_FY_SALE_CURRNT_MNTH)  AS CURR_FY_SALE_CURRNT_MNTH,
                SUM(PREV_FY_PEND_AS_ON)        AS PREV_FY_PEND_AS_ON,
                SUM(PREV_FY_PEND_CURRNT_MNTH)  AS PREV_FY_PEND_CURRNT_MNTH,
                SUM(CURR_FY_PEND_AS_ON)        AS CURR_FY_PEND_AS_ON,
                SUM(CURR_FY_PEND_CURRNT_MNTH)  AS CURR_FY_PEND_CURRNT_MNTH,
                SUM(INV_AMT)                   AS INV_AMT,
                SORT_BY
            FROM (
                -- Sales & Orders Data
                SELECT
                    ORG_ID,
                    OU_NAME,
                    SUM(PREV_FY_SALE_AS_ON)       AS PREV_FY_SALE_AS_ON,
                    SUM(PREV_FY_SALE_CURRNT_MNTH) AS PREV_FY_SALE_CURRNT_MNTH,
                    SUM(CURR_FY_SALE_AS_ON)        AS CURR_FY_SALE_AS_ON,
                    SUM(CURR_FY_SALE_CURRNT_MNTH)  AS CURR_FY_SALE_CURRNT_MNTH,
                    SUM(PREV_FY_PEND_AS_ON)        AS PREV_FY_PEND_AS_ON,
                    SUM(PREV_FY_PEND_CURRNT_MNTH)  AS PREV_FY_PEND_CURRNT_MNTH,
                    SUM(CURR_FY_PEND_AS_ON)        AS CURR_FY_PEND_AS_ON,
                    SUM(CURR_FY_PEND_CURRNT_MNTH)  AS CURR_FY_PEND_CURRNT_MNTH,
                    CAST(0 AS NUMBER)              AS INV_AMT,
                    SORT_BY
                FROM (
                    SELECT
                        ORG_ID,
                        (
                            SELECT alias_name
                            FROM jan_ou_alias_name n
                            WHERE n.org_id = m.org_id
                        ) AS OU_NAME,
                        -- Previous FY As On (01-Apr-2025 to 02-Jun-2025)
                        NVL(SUM(CASE WHEN TRX_DATE >= v_prev_fy_start AND TRX_DATE < v_prev_fy_end AND SOURCE_NAME = 'SALES'
                                     THEN NVL(QUANTITY_INVOICED, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS PREV_FY_SALE_AS_ON,
                        -- Previous FY Current Month (01-Jun-2025 to 02-Jun-2025)
                        NVL(SUM(CASE WHEN TRX_DATE >= v_prev_month_start AND TRX_DATE < v_prev_fy_end AND SOURCE_NAME = 'SALES'
                                     THEN NVL(QUANTITY_INVOICED, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS PREV_FY_SALE_CURRNT_MNTH,
                        -- Current FY As On (01-Apr-2026 to 02-Jun-2026)
                        NVL(SUM(CASE WHEN TRX_DATE >= v_curr_fy_start AND TRX_DATE < v_curr_fy_end AND SOURCE_NAME = 'SALES'
                                     THEN NVL(QUANTITY_INVOICED, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS CURR_FY_SALE_AS_ON,
                        -- Current FY Current Month (01-Jun-2026 to 02-Jun-2026)
                        NVL(SUM(CASE WHEN TRX_DATE >= v_curr_month_start AND TRX_DATE < v_curr_fy_end AND SOURCE_NAME = 'SALES'
                                     THEN NVL(QUANTITY_INVOICED, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS CURR_FY_SALE_CURRNT_MNTH,
                        -- Previous FY Pending As On (01-Apr-2025 to 02-Jun-2025)
                        NVL(SUM(CASE WHEN ORDERED_DATE >= v_prev_fy_start AND ORDERED_DATE < v_prev_fy_end AND SOURCE_NAME = 'ORDER'
                                     THEN NVL(PEND_QUANTITY, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS PREV_FY_PEND_AS_ON,
                        -- Previous FY Pending Current Month (01-Jun-2025 to 02-Jun-2025)
                        NVL(SUM(CASE WHEN ORDERED_DATE >= v_prev_month_start AND ORDERED_DATE < v_prev_fy_end AND SOURCE_NAME = 'ORDER'
                                     THEN NVL(PEND_QUANTITY, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS PREV_FY_PEND_CURRNT_MNTH,
                        -- Current FY Pending As On (01-Apr-2026 to 02-Jun-2026)
                        NVL(SUM(CASE WHEN ORDERED_DATE >= v_curr_fy_start AND ORDERED_DATE < v_curr_fy_end AND SOURCE_NAME = 'ORDER'
                                     THEN NVL(PEND_QUANTITY, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS CURR_FY_PEND_AS_ON,
                        -- Current FY Pending Current Month (01-Jun-2026 to 02-Jun-2026)
                        NVL(SUM(CASE WHEN ORDERED_DATE >= v_curr_month_start AND ORDERED_DATE < v_curr_fy_end AND SOURCE_NAME = 'ORDER'
                                     THEN NVL(PEND_QUANTITY, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS CURR_FY_PEND_CURRNT_MNTH,
                        (
                            SELECT sort_by
                            FROM jan_ou_alias_name k
                            WHERE k.org_id = m.org_id
                        ) AS SORT_BY,
                        CASE
                            WHEN org_id = 103
                             AND (ORD_EMPT_STATUS  = 'Y'
                                  OR BILL_TO_CUST_NAME = 'JANATICS INDIA PVT. LTD - UNIT V'
                                  OR BILL_TO_CUST_NAME = 'JANATICS INDIA PVT. LTD - UNIT VI')
                            THEN 'N'
                            ELSE 'Y'
                        END AS oa_flag
                    FROM JAN_ALL_OU_ORD_SALES_V m
                    -- Data filter: Need data from start of Previous FY to current date
                    WHERE (TRX_DATE >= v_prev_fy_start AND TRX_DATE < v_curr_fy_end)
                       OR (ORDERED_DATE >= v_prev_fy_start AND ORDERED_DATE < v_curr_fy_end)
                    GROUP BY ORG_ID, ORD_EMPT_STATUS, BILL_TO_CUST_NAME
                )
                WHERE oa_flag = 'Y'
                GROUP BY ORG_ID, OU_NAME, SORT_BY

                UNION ALL

                -- Inventory data
                SELECT
                    ORG_ID,
                    OU_NAME,
                    CAST(0 AS NUMBER),
                    CAST(0 AS NUMBER),
                    CAST(0 AS NUMBER),
                    CAST(0 AS NUMBER),
                    CAST(0 AS NUMBER),
                    CAST(0 AS NUMBER),
                    CAST(0 AS NUMBER),
                    CAST(0 AS NUMBER),
                    SUM(amount) AS INV_AMT,
                    SORT_BY
                FROM (
                    SELECT
                        (
                            SELECT operating_unit
                            FROM org_organization_definitions m
                            WHERE m.organization_id = a.organization_id
                        ) AS ORG_ID,
                        (
                            SELECT alias_name
                            FROM jan_ou_alias_name n
                            WHERE n.org_id = (
                                SELECT operating_unit
                                FROM org_organization_definitions m
                                WHERE m.organization_id = a.organization_id
                            )
                        ) AS OU_NAME,
                        NVL(TRANSACTION_QUANTITY, 0) * NVL(ITEM_COST, 0) AS amount,
                        (
                            SELECT sort_by
                            FROM jan_ou_alias_name k
                            WHERE k.org_id = (
                                SELECT operating_unit
                                FROM org_organization_definitions m
                                WHERE m.organization_id = a.organization_id
                            )
                        ) AS SORT_BY
                    FROM Jan_all_ou_inventory_details a
                    WHERE INVENTORY_OTHERS = 'Planning Asset Sub-Inventories'
                      AND organization_id NOT IN (564, 565)
                )
                GROUP BY ORG_ID, OU_NAME, SORT_BY
            )
            GROUP BY ORG_ID, OU_NAME, SORT_BY;

    ELSE
        -- ============================================
        -- EXTERNAL ONLY
        -- ============================================
        OPEN p_cursor FOR
            SELECT
                ORG_ID,
                OU_NAME,
                SUM(PREV_FY_SALE_AS_ON)       AS PREV_FY_SALE_AS_ON,
                SUM(PREV_FY_SALE_CURRNT_MNTH)  AS PREV_FY_SALE_CURRNT_MNTH,
                SUM(CURR_FY_SALE_AS_ON)        AS CURR_FY_SALE_AS_ON,
                SUM(CURR_FY_SALE_CURRNT_MNTH)  AS CURR_FY_SALE_CURRNT_MNTH,
                SUM(PREV_FY_PEND_AS_ON)        AS PREV_FY_PEND_AS_ON,
                SUM(PREV_FY_PEND_CURRNT_MNTH)  AS PREV_FY_PEND_CURRNT_MNTH,
                SUM(CURR_FY_PEND_AS_ON)        AS CURR_FY_PEND_AS_ON,
                SUM(CURR_FY_PEND_CURRNT_MNTH)  AS CURR_FY_PEND_CURRNT_MNTH,
                SUM(INV_AMT)                   AS INV_AMT,
                SORT_BY
            FROM (
                -- Sales & Orders Data (External Only)
                SELECT
                    ORG_ID,
                    OU_NAME,
                    SUM(PREV_FY_SALE_AS_ON)       AS PREV_FY_SALE_AS_ON,
                    SUM(PREV_FY_SALE_CURRNT_MNTH) AS PREV_FY_SALE_CURRNT_MNTH,
                    SUM(CURR_FY_SALE_AS_ON)        AS CURR_FY_SALE_AS_ON,
                    SUM(CURR_FY_SALE_CURRNT_MNTH)  AS CURR_FY_SALE_CURRNT_MNTH,
                    SUM(PREV_FY_PEND_AS_ON)        AS PREV_FY_PEND_AS_ON,
                    SUM(PREV_FY_PEND_CURRNT_MNTH)  AS PREV_FY_PEND_CURRNT_MNTH,
                    SUM(CURR_FY_PEND_AS_ON)        AS CURR_FY_PEND_AS_ON,
                    SUM(CURR_FY_PEND_CURRNT_MNTH)  AS CURR_FY_PEND_CURRNT_MNTH,
                    CAST(0 AS NUMBER)              AS INV_AMT,
                    SORT_BY
                FROM (
                    SELECT
                        ORG_ID,
                        (
                            SELECT alias_name
                            FROM jan_ou_alias_name n
                            WHERE n.org_id = m.org_id
                        ) AS OU_NAME,
                        -- Previous FY As On (01-Apr-2025 to 02-Jun-2025)
                        NVL(SUM(CASE WHEN TRX_DATE >= v_prev_fy_start AND TRX_DATE < v_prev_fy_end AND SOURCE_NAME = 'SALES'
                                     THEN NVL(QUANTITY_INVOICED, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS PREV_FY_SALE_AS_ON,
                        -- Previous FY Current Month (01-Jun-2025 to 02-Jun-2025)
                        NVL(SUM(CASE WHEN TRX_DATE >= v_prev_month_start AND TRX_DATE < v_prev_fy_end AND SOURCE_NAME = 'SALES'
                                     THEN NVL(QUANTITY_INVOICED, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS PREV_FY_SALE_CURRNT_MNTH,
                        -- Current FY As On (01-Apr-2026 to 02-Jun-2026)
                        NVL(SUM(CASE WHEN TRX_DATE >= v_curr_fy_start AND TRX_DATE < v_curr_fy_end AND SOURCE_NAME = 'SALES'
                                     THEN NVL(QUANTITY_INVOICED, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS CURR_FY_SALE_AS_ON,
                        -- Current FY Current Month (01-Jun-2026 to 02-Jun-2026)
                        NVL(SUM(CASE WHEN TRX_DATE >= v_curr_month_start AND TRX_DATE < v_curr_fy_end AND SOURCE_NAME = 'SALES'
                                     THEN NVL(QUANTITY_INVOICED, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS CURR_FY_SALE_CURRNT_MNTH,
                        -- Previous FY Pending As On (01-Apr-2025 to 02-Jun-2025)
                        NVL(SUM(CASE WHEN ORDERED_DATE >= v_prev_fy_start AND ORDERED_DATE < v_prev_fy_end AND SOURCE_NAME = 'ORDER'
                                     THEN NVL(PEND_QUANTITY, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS PREV_FY_PEND_AS_ON,
                        -- Previous FY Pending Current Month (01-Jun-2025 to 02-Jun-2025)
                        NVL(SUM(CASE WHEN ORDERED_DATE >= v_prev_month_start AND ORDERED_DATE < v_prev_fy_end AND SOURCE_NAME = 'ORDER'
                                     THEN NVL(PEND_QUANTITY, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS PREV_FY_PEND_CURRNT_MNTH,
                        -- Current FY Pending As On (01-Apr-2026 to 02-Jun-2026)
                        NVL(SUM(CASE WHEN ORDERED_DATE >= v_curr_fy_start AND ORDERED_DATE < v_curr_fy_end AND SOURCE_NAME = 'ORDER'
                                     THEN NVL(PEND_QUANTITY, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS CURR_FY_PEND_AS_ON,
                        -- Current FY Pending Current Month (01-Jun-2026 to 02-Jun-2026)
                        NVL(SUM(CASE WHEN ORDERED_DATE >= v_curr_month_start AND ORDERED_DATE < v_curr_fy_end AND SOURCE_NAME = 'ORDER'
                                     THEN NVL(PEND_QUANTITY, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS CURR_FY_PEND_CURRNT_MNTH,
                        (
                            SELECT sort_by
                            FROM jan_ou_alias_name k
                            WHERE k.org_id = m.org_id
                        ) AS SORT_BY
                    FROM JAN_ALL_OU_ORD_SALES_V m
                    WHERE STK_TFR_FLG     = 'N'
                      AND ORD_EMPT_STATUS = 'N'
                      -- Data filter: Need data from start of Previous FY to current date
                      AND ((TRX_DATE >= v_prev_fy_start AND TRX_DATE < v_curr_fy_end)
                        OR (ORDERED_DATE >= v_prev_fy_start AND ORDERED_DATE < v_curr_fy_end))
                    GROUP BY ORG_ID
                )
                GROUP BY ORG_ID, OU_NAME, SORT_BY

                UNION ALL

                -- Inventory data
                SELECT
                    ORG_ID,
                    OU_NAME,
                    CAST(0 AS NUMBER),
                    CAST(0 AS NUMBER),
                    CAST(0 AS NUMBER),
                    CAST(0 AS NUMBER),
                    CAST(0 AS NUMBER),
                    CAST(0 AS NUMBER),
                    CAST(0 AS NUMBER),
                    CAST(0 AS NUMBER),
                    SUM(amount) AS INV_AMT,
                    SORT_BY
                FROM (
                    SELECT
                        (
                            SELECT operating_unit
                            FROM org_organization_definitions m
                            WHERE m.organization_id = a.organization_id
                        ) AS ORG_ID,
                        (
                            SELECT alias_name
                            FROM jan_ou_alias_name n
                            WHERE n.org_id = (
                                SELECT operating_unit
                                FROM org_organization_definitions m
                                WHERE m.organization_id = a.organization_id
                            )
                        ) AS OU_NAME,
                        NVL(TRANSACTION_QUANTITY, 0) * NVL(ITEM_COST, 0) AS amount,
                        (
                            SELECT sort_by
                            FROM jan_ou_alias_name k
                            WHERE k.org_id = (
                                SELECT operating_unit
                                FROM org_organization_definitions m
                                WHERE m.organization_id = a.organization_id
                            )
                        ) AS SORT_BY
                    FROM Jan_all_ou_inventory_details a
                    WHERE INVENTORY_OTHERS = 'Planning Asset Sub-Inventories'
                      AND organization_id NOT IN (564, 565)
                )
                GROUP BY ORG_ID, OU_NAME, SORT_BY
            )
            GROUP BY ORG_ID, OU_NAME, SORT_BY;

    END IF;

EXCEPTION
    WHEN OTHERS THEN
        IF p_cursor%ISOPEN THEN
            CLOSE p_cursor;
        END IF;
        RAISE;

END JAN_GET_OU_SALES_PERFORMANCE;