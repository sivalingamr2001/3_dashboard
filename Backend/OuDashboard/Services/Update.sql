create or replace PROCEDURE JAN_GET_OU_SALES_PERFORMANCE(
    p_stk_tfr_flg           IN  VARCHAR2 DEFAULT 'Y',
    p_cursor                OUT SYS_REFCURSOR,   -- EXISTING: OU-wise performance table (UNCHANGED)
    p_order_month_cursor    OUT SYS_REFCURSOR,   -- NEW (Req 1): Pending Order value, month-wise, Apr -> current month
    p_sales_month_cursor    OUT SYS_REFCURSOR,   -- NEW (Req 3): Sales value, month-wise, Apr -> current month
    p_day_wise_cursor       OUT SYS_REFCURSOR    -- NEW (Req 2): Last 10 days sales, day-wise, weekday-aligned YoY
)
AS
    v_curr_fy_start    DATE;
    v_curr_fy_end      DATE;
    v_prev_fy_start    DATE;
    v_prev_fy_end      DATE;

    -- Month start boundaries (1st of current month and same month last year)
    v_curr_month_start DATE;
    v_prev_month_start DATE;

    -- NEW: for day-wise cursor -> "as on yesterday" (currentdate - 1)
    v_yday             DATE;

BEGIN
    -- ============================================
    -- DYNAMIC FY CALCULATION (April to March)  -- UNCHANGED
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
    v_curr_month_start := TRUNC(SYSDATE, 'MM');
    v_prev_month_start := ADD_MONTHS(v_curr_month_start, -12);

    -- NEW: yesterday, for the "last 10 days" window
    -- (today's data is often still-loading/incomplete, so we exclude it,
    --  per your point 2 -- "currentdate-1" back 10 days)
    v_yday := TRUNC(SYSDATE) - 1;

    IF p_stk_tfr_flg = 'Y' THEN
        -- ============================================
        -- ALL / INTERNAL + EXTERNAL   -- UNCHANGED
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
                        NVL(SUM(CASE WHEN TRX_DATE >= v_prev_fy_start AND TRX_DATE < v_prev_fy_end AND SOURCE_NAME = 'SALES'
                                     THEN NVL(QUANTITY_INVOICED, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS PREV_FY_SALE_AS_ON,
                        NVL(SUM(CASE WHEN TRX_DATE >= v_prev_month_start AND TRX_DATE < v_prev_fy_end AND SOURCE_NAME = 'SALES'
                                     THEN NVL(QUANTITY_INVOICED, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS PREV_FY_SALE_CURRNT_MNTH,
                        NVL(SUM(CASE WHEN TRX_DATE >= v_curr_fy_start AND TRX_DATE < v_curr_fy_end AND SOURCE_NAME = 'SALES'
                                     THEN NVL(QUANTITY_INVOICED, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS CURR_FY_SALE_AS_ON,
                        NVL(SUM(CASE WHEN TRX_DATE >= v_curr_month_start AND TRX_DATE < v_curr_fy_end AND SOURCE_NAME = 'SALES'
                                     THEN NVL(QUANTITY_INVOICED, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS CURR_FY_SALE_CURRNT_MNTH,
                        NVL(SUM(CASE WHEN ORDERED_DATE >= v_prev_fy_start AND ORDERED_DATE < v_prev_fy_end AND SOURCE_NAME = 'ORDER'
                                     THEN NVL(PEND_QUANTITY, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS PREV_FY_PEND_AS_ON,
                        NVL(SUM(CASE WHEN ORDERED_DATE >= v_prev_month_start AND ORDERED_DATE < v_prev_fy_end AND SOURCE_NAME = 'ORDER'
                                     THEN NVL(PEND_QUANTITY, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS PREV_FY_PEND_CURRNT_MNTH,
                        NVL(SUM(CASE WHEN ORDERED_DATE >= v_curr_fy_start AND ORDERED_DATE < v_curr_fy_end AND SOURCE_NAME = 'ORDER'
                                     THEN NVL(PEND_QUANTITY, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS CURR_FY_PEND_AS_ON,
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
        -- EXTERNAL ONLY   -- UNCHANGED
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
                        NVL(SUM(CASE WHEN TRX_DATE >= v_prev_fy_start AND TRX_DATE < v_prev_fy_end AND SOURCE_NAME = 'SALES'
                                     THEN NVL(QUANTITY_INVOICED, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS PREV_FY_SALE_AS_ON,
                        NVL(SUM(CASE WHEN TRX_DATE >= v_prev_month_start AND TRX_DATE < v_prev_fy_end AND SOURCE_NAME = 'SALES'
                                     THEN NVL(QUANTITY_INVOICED, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS PREV_FY_SALE_CURRNT_MNTH,
                        NVL(SUM(CASE WHEN TRX_DATE >= v_curr_fy_start AND TRX_DATE < v_curr_fy_end AND SOURCE_NAME = 'SALES'
                                     THEN NVL(QUANTITY_INVOICED, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS CURR_FY_SALE_AS_ON,
                        NVL(SUM(CASE WHEN TRX_DATE >= v_curr_month_start AND TRX_DATE < v_curr_fy_end AND SOURCE_NAME = 'SALES'
                                     THEN NVL(QUANTITY_INVOICED, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS CURR_FY_SALE_CURRNT_MNTH,
                        NVL(SUM(CASE WHEN ORDERED_DATE >= v_prev_fy_start AND ORDERED_DATE < v_prev_fy_end AND SOURCE_NAME = 'ORDER'
                                     THEN NVL(PEND_QUANTITY, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS PREV_FY_PEND_AS_ON,
                        NVL(SUM(CASE WHEN ORDERED_DATE >= v_prev_month_start AND ORDERED_DATE < v_prev_fy_end AND SOURCE_NAME = 'ORDER'
                                     THEN NVL(PEND_QUANTITY, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS PREV_FY_PEND_CURRNT_MNTH,
                        NVL(SUM(CASE WHEN ORDERED_DATE >= v_curr_fy_start AND ORDERED_DATE < v_curr_fy_end AND SOURCE_NAME = 'ORDER'
                                     THEN NVL(PEND_QUANTITY, 0) * NVL(UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS CURR_FY_PEND_AS_ON,
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
                      AND ((TRX_DATE >= v_prev_fy_start AND TRX_DATE < v_curr_fy_end)
                        OR (ORDERED_DATE >= v_prev_fy_start AND ORDERED_DATE < v_curr_fy_end))
                    GROUP BY ORG_ID
                )
                GROUP BY ORG_ID, OU_NAME, SORT_BY

                UNION ALL

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


    -- ============================================================
    -- NEW CURSOR 1 (Requirement 1): ORDER (PENDING) VALUE - MONTH WISE
    -- Company total (not OU-wise). One row per month, Apr -> current
    -- month. Past months = full-month totals (both years). Current
    -- month = capped "as on today" for BOTH years (apples-to-apples).
    -- ============================================================
    OPEN p_order_month_cursor FOR
        SELECT
            TO_CHAR(m.month_start, 'Mon-YYYY')            AS month_label,
            m.month_start,
            NVL((
                SELECT SUM( NVL(PEND_QUANTITY, 0) * NVL(UNIT_SELLING_PRICE, 0)
                            * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) )
                FROM JAN_ALL_OU_ORD_SALES_V v
                WHERE v.SOURCE_NAME    = 'ORDER'
                  AND v.ORDERED_DATE  >= m.month_start
                  AND v.ORDERED_DATE  <  m.month_end_curr
                  AND (
                        (p_stk_tfr_flg  = 'Y'
                         AND NOT (v.org_id = 103
                                  AND (v.ORD_EMPT_STATUS = 'Y'
                                       OR v.BILL_TO_CUST_NAME IN
                                          ('JANATICS INDIA PVT. LTD - UNIT V','JANATICS INDIA PVT. LTD - UNIT VI'))))
                        OR
                        (p_stk_tfr_flg != 'Y'
                         AND v.STK_TFR_FLG = 'N' AND v.ORD_EMPT_STATUS = 'N')
                      )
            ), 0)                                          AS curr_fy_order_value,
            NVL((
                SELECT SUM( NVL(PEND_QUANTITY, 0) * NVL(UNIT_SELLING_PRICE, 0)
                            * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) )
                FROM JAN_ALL_OU_ORD_SALES_V v
                WHERE v.SOURCE_NAME    = 'ORDER'
                  AND v.ORDERED_DATE  >= m.prev_month_start
                  AND v.ORDERED_DATE  <  m.month_end_prev
                  AND (
                        (p_stk_tfr_flg  = 'Y'
                         AND NOT (v.org_id = 103
                                  AND (v.ORD_EMPT_STATUS = 'Y'
                                       OR v.BILL_TO_CUST_NAME IN
                                          ('JANATICS INDIA PVT. LTD - UNIT V','JANATICS INDIA PVT. LTD - UNIT VI'))))
                        OR
                        (p_stk_tfr_flg != 'Y'
                         AND v.STK_TFR_FLG = 'N' AND v.ORD_EMPT_STATUS = 'N')
                      )
            ), 0)                                          AS prev_fy_order_value
        FROM (
            SELECT
                ADD_MONTHS(v_curr_fy_start, LEVEL - 1)                                   AS month_start,
                LEAST(ADD_MONTHS(v_curr_fy_start, LEVEL), v_curr_fy_end)                 AS month_end_curr,
                ADD_MONTHS(v_curr_fy_start, LEVEL - 1 - 12)                              AS prev_month_start,
                LEAST(ADD_MONTHS(v_curr_fy_start, LEVEL - 12), v_prev_fy_end)            AS month_end_prev
            FROM dual
            CONNECT BY LEVEL <= MONTHS_BETWEEN(v_curr_month_start, v_curr_fy_start) + 1
        ) m
        ORDER BY m.month_start;


    -- ============================================================
    -- NEW CURSOR 2 (Requirement 3): SALES VALUE - MONTH WISE
    -- Same structure, SOURCE_NAME = 'SALES' / TRX_DATE / QUANTITY_INVOICED.
    -- ============================================================
    OPEN p_sales_month_cursor FOR
        SELECT
            TO_CHAR(m.month_start, 'Mon-YYYY')            AS month_label,
            m.month_start,
            NVL((
                SELECT SUM( NVL(QUANTITY_INVOICED, 0) * NVL(UNIT_SELLING_PRICE, 0)
                            * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) )
                FROM JAN_ALL_OU_ORD_SALES_V v
                WHERE v.SOURCE_NAME = 'SALES'
                  AND v.TRX_DATE   >= m.month_start
                  AND v.TRX_DATE   <  m.month_end_curr
                  AND (
                        (p_stk_tfr_flg  = 'Y'
                         AND NOT (v.org_id = 103
                                  AND (v.ORD_EMPT_STATUS = 'Y'
                                       OR v.BILL_TO_CUST_NAME IN
                                          ('JANATICS INDIA PVT. LTD - UNIT V','JANATICS INDIA PVT. LTD - UNIT VI'))))
                        OR
                        (p_stk_tfr_flg != 'Y'
                         AND v.STK_TFR_FLG = 'N' AND v.ORD_EMPT_STATUS = 'N')
                      )
            ), 0)                                          AS curr_fy_sales_value,
            NVL((
                SELECT SUM( NVL(QUANTITY_INVOICED, 0) * NVL(UNIT_SELLING_PRICE, 0)
                            * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) )
                FROM JAN_ALL_OU_ORD_SALES_V v
                WHERE v.SOURCE_NAME = 'SALES'
                  AND v.TRX_DATE   >= m.prev_month_start
                  AND v.TRX_DATE   <  m.month_end_prev
                  AND (
                        (p_stk_tfr_flg  = 'Y'
                         AND NOT (v.org_id = 103
                                  AND (v.ORD_EMPT_STATUS = 'Y'
                                       OR v.BILL_TO_CUST_NAME IN
                                          ('JANATICS INDIA PVT. LTD - UNIT V','JANATICS INDIA PVT. LTD - UNIT VI'))))
                        OR
                        (p_stk_tfr_flg != 'Y'
                         AND v.STK_TFR_FLG = 'N' AND v.ORD_EMPT_STATUS = 'N')
                      )
            ), 0)                                          AS prev_fy_sales_value
        FROM (
            SELECT
                ADD_MONTHS(v_curr_fy_start, LEVEL - 1)                                   AS month_start,
                LEAST(ADD_MONTHS(v_curr_fy_start, LEVEL), v_curr_fy_end)                 AS month_end_curr,
                ADD_MONTHS(v_curr_fy_start, LEVEL - 1 - 12)                              AS prev_month_start,
                LEAST(ADD_MONTHS(v_curr_fy_start, LEVEL - 12), v_prev_fy_end)            AS month_end_prev
            FROM dual
            CONNECT BY LEVEL <= MONTHS_BETWEEN(v_curr_month_start, v_curr_fy_start) + 1
        ) m
        ORDER BY m.month_start;


    -- ============================================================
    -- NEW CURSOR 3 (Requirement 2): DAY-WISE SALES - LAST 10 DAYS
    -- Window: yesterday (currentdate-1) back 10 calendar days.
    -- YoY: "date - 364" (exactly 52 weeks) instead of same-calendar-date
    -- or ADD_MONTHS(-12) -> previous-year day is GUARANTEED to fall on
    -- the SAME weekday (364 = 52 x 7, holds even across leap years).
    -- This fixes the Sat-vs-Sun / weekday-mismatch problem you flagged.
    -- ============================================================
    OPEN p_day_wise_cursor FOR
        SELECT
            d.trx_day,
            TO_CHAR(d.trx_day, 'DD-Mon (Dy)')               AS day_label,
            NVL((
                SELECT SUM( NVL(QUANTITY_INVOICED, 0) * NVL(UNIT_SELLING_PRICE, 0)
                            * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) )
                FROM JAN_ALL_OU_ORD_SALES_V v
                WHERE v.SOURCE_NAME = 'SALES'
                  AND v.TRX_DATE   >= d.trx_day
                  AND v.TRX_DATE   <  d.trx_day + 1
                  AND (
                        (p_stk_tfr_flg  = 'Y'
                         AND NOT (v.org_id = 103
                                  AND (v.ORD_EMPT_STATUS = 'Y'
                                       OR v.BILL_TO_CUST_NAME IN
                                          ('JANATICS INDIA PVT. LTD - UNIT V','JANATICS INDIA PVT. LTD - UNIT VI'))))
                        OR
                        (p_stk_tfr_flg != 'Y'
                         AND v.STK_TFR_FLG = 'N' AND v.ORD_EMPT_STATUS = 'N')
                      )
            ), 0)                                          AS curr_day_sales,
            d.prev_day,
            TO_CHAR(d.prev_day, 'DD-Mon-YYYY (Dy)')          AS prev_day_label,
            NVL((
                SELECT SUM( NVL(QUANTITY_INVOICED, 0) * NVL(UNIT_SELLING_PRICE, 0)
                            * NVL(TO_NUMBER(REGEXP_REPLACE(Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) )
                FROM JAN_ALL_OU_ORD_SALES_V v
                WHERE v.SOURCE_NAME = 'SALES'
                  AND v.TRX_DATE   >= d.prev_day
                  AND v.TRX_DATE   <  d.prev_day + 1
                  AND (
                        (p_stk_tfr_flg  = 'Y'
                         AND NOT (v.org_id = 103
                                  AND (v.ORD_EMPT_STATUS = 'Y'
                                       OR v.BILL_TO_CUST_NAME IN
                                          ('JANATICS INDIA PVT. LTD - UNIT V','JANATICS INDIA PVT. LTD - UNIT VI'))))
                        OR
                        (p_stk_tfr_flg != 'Y'
                         AND v.STK_TFR_FLG = 'N' AND v.ORD_EMPT_STATUS = 'N')
                      )
            ), 0)                                          AS prev_day_sales
        FROM (
            SELECT
                v_yday - (LEVEL - 1)                    AS trx_day,
                (v_yday - (LEVEL - 1)) - 364             AS prev_day   -- 52 weeks back -> same weekday guaranteed
            FROM dual
            CONNECT BY LEVEL <= 10
        ) d
        ORDER BY d.trx_day;

EXCEPTION
    WHEN OTHERS THEN
        IF p_cursor%ISOPEN THEN
            CLOSE p_cursor;
        END IF;
        IF p_order_month_cursor%ISOPEN THEN
            CLOSE p_order_month_cursor;
        END IF;
        IF p_sales_month_cursor%ISOPEN THEN
            CLOSE p_sales_month_cursor;
        END IF;
        IF p_day_wise_cursor%ISOPEN THEN
            CLOSE p_day_wise_cursor;
        END IF;
        RAISE;

END JAN_GET_OU_SALES_PERFORMANCE;
/
