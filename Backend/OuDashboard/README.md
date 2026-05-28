-- PROCEDURE JAN_GET_OU_SALES_PERFORMANCE

create or replace PROCEDURE JAN_GET_OU_SALES_PERFORMANCE(
p_stk_tfr_flg IN VARCHAR2 DEFAULT 'Y',
p_cursor OUT SYS_REFCURSOR
)
AS
v_curr_fy_start DATE;
v_curr_fy_end DATE;
v_prev_fy_start DATE;
v_prev_fy_end DATE;

    -- Optimized: Changed from VARCHAR2 to DATE parameters for high-speed indexing
    v_curr_month_start DATE;
    v_curr_month_end   DATE;
    v_prev_month_start DATE;
    v_prev_month_end   DATE;

BEGIN
-- Determine current FY start (April 1)
IF TO_NUMBER(TO_CHAR(SYSDATE, 'MM')) >= 4 THEN
v_curr_fy_start := TO_DATE('01-APR-' || TO_CHAR(SYSDATE, 'YYYY'), 'DD-MON-YYYY');
ELSE
v_curr_fy_start := TO_DATE('01-APR-' || TO_CHAR(ADD_MONTHS(SYSDATE, -12), 'YYYY'), 'DD-MON-YYYY');
END IF;

    -- Dynamic live date limits
    v_curr_fy_end      := TRUNC(SYSDATE) + 1;
    v_prev_fy_start    := ADD_MONTHS(v_curr_fy_start, -12);
    v_prev_fy_end      := ADD_MONTHS(v_curr_fy_end, -12);

    -- Optimized Month Ranges (Replaces slow TO_CHAR comparisons)
    v_curr_month_start := TRUNC(SYSDATE, 'MM');
    v_curr_month_end   := v_curr_fy_end;
    v_prev_month_start := ADD_MONTHS(v_curr_month_start, -12);
    v_prev_month_end   := ADD_MONTHS(v_curr_month_end, -12);

    IF p_stk_tfr_flg = 'Y' THEN
        OPEN p_cursor FOR
            SELECT
                OU_NAME,
                SUM(PREV_FY_SALE_AS_ON)          AS PREV_FY_SALE_AS_ON,
                SUM(PREV_FY_SALE_CURRNT_MNTH)     AS PREV_FY_SALE_CURRNT_MNTH,
                SUM(CURR_FY_SALE_AS_ON)           AS CURR_FY_SALE_AS_ON,
                SUM(CURR_FY_SALE_CURRNT_MNTH)     AS CURR_FY_SALE_CURRNT_MNTH,
                SUM(PREV_FY_PEND_AS_ON)           AS PREV_FY_PEND_AS_ON,
                SUM(PREV_FY_PEND_CURRNT_MNTH)     AS PREV_FY_PEND_CURRNT_MNTH,
                SUM(CURR_FY_PEND_AS_ON)           AS CURR_FY_PEND_AS_ON,
                SUM(CURR_FY_PEND_CURRNT_MNTH)     AS CURR_FY_PEND_CURRNT_MNTH,
                SUM(INV_AMT)                      AS INV_AMT
            FROM (
                SELECT
                    OU_NAME,
                    SUM(PREV_FY_SALE_AS_ON)       AS PREV_FY_SALE_AS_ON,
                    SUM(PREV_FY_SALE_CURRNT_MNTH) AS PREV_FY_SALE_CURRNT_MNTH,
                    SUM(CURR_FY_SALE_AS_ON)       AS CURR_FY_SALE_AS_ON,
                    SUM(CURR_FY_SALE_CURRNT_MNTH) AS CURR_FY_SALE_CURRNT_MNTH,
                    SUM(PREV_FY_PEND_AS_ON)       AS PREV_FY_PEND_AS_ON,
                    SUM(PREV_FY_PEND_CURRNT_MNTH) AS PREV_FY_PEND_CURRNT_MNTH,
                    SUM(CURR_FY_PEND_AS_ON)       AS CURR_FY_PEND_AS_ON,
                    SUM(CURR_FY_PEND_CURRNT_MNTH) AS CURR_FY_PEND_CURRNT_MNTH,
                    0                             AS INV_AMT
                FROM (
                    SELECT
                        OU_NAME,
                        -- Previous FY Sales
                        NVL(SUM(CASE WHEN TRX_DATE >= v_prev_fy_start AND TRX_DATE < v_prev_fy_end AND SOURCE_NAME = 'SALES'
                                     THEN QUANTITY_INVOICED * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate END), 0) AS PREV_FY_SALE_AS_ON,
                        -- Previous FY Month Sales (Direct Date Search)
                        NVL(SUM(CASE WHEN TRX_DATE >= v_prev_month_start AND TRX_DATE < v_prev_month_end AND SOURCE_NAME = 'SALES'
                                     THEN QUANTITY_INVOICED * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate END), 0) AS PREV_FY_SALE_CURRNT_MNTH,
                        -- Current FY Sales
                        NVL(SUM(CASE WHEN TRX_DATE >= v_curr_fy_start AND TRX_DATE < v_curr_fy_end AND SOURCE_NAME = 'SALES'
                                     THEN QUANTITY_INVOICED * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate END), 0) AS CURR_FY_SALE_AS_ON,
                        -- Current FY Month Sales (Direct Date Search)
                        NVL(SUM(CASE WHEN TRX_DATE >= v_curr_month_start AND TRX_DATE < v_curr_month_end AND SOURCE_NAME = 'SALES'
                                     THEN QUANTITY_INVOICED * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate END), 0) AS CURR_FY_SALE_CURRNT_MNTH,
                        -- Previous FY Pending
                        NVL(SUM(CASE WHEN ORDERED_DATE >= v_prev_fy_start AND ORDERED_DATE < v_prev_fy_end AND SOURCE_NAME = 'ORDER'
                                     THEN PEND_QUANTITY * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate END), 0)    AS PREV_FY_PEND_AS_ON,
                        -- Previous FY Month Pending (Direct Date Search)
                        NVL(SUM(CASE WHEN ORDERED_DATE >= v_prev_month_start AND ORDERED_DATE < v_prev_month_end AND SOURCE_NAME = 'ORDER'
                                     THEN PEND_QUANTITY * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate END), 0)    AS PREV_FY_PEND_CURRNT_MNTH,
                        -- Current FY Pending
                        NVL(SUM(CASE WHEN ORDERED_DATE >= v_curr_fy_start AND ORDERED_DATE < v_curr_fy_end AND SOURCE_NAME = 'ORDER'
                                     THEN PEND_QUANTITY * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate END), 0)    AS CURR_FY_PEND_AS_ON,
                        -- Current FY Month Pending (Direct Date Search)
                        NVL(SUM(CASE WHEN ORDERED_DATE >= v_curr_month_start AND ORDERED_DATE < v_curr_month_end AND SOURCE_NAME = 'ORDER'
                                     THEN PEND_QUANTITY * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate END), 0)    AS CURR_FY_PEND_CURRNT_MNTH,
                        CASE
                            WHEN org_id = 103
                             AND (ORD_EMPT_STATUS  = 'Y'
                                  OR BILL_TO_CUST_NAME = 'JANATICS INDIA PVT. LTD - UNIT V'
                                  OR BILL_TO_CUST_NAME = 'JANATICS INDIA PVT. LTD - UNIT VI')
                            THEN 'N'
                            ELSE 'Y'
                        END AS oa_flag
                    FROM JAN_ALL_OU_ORD_SALES_V
                    -- CRITICAL PERFORMANCE FIX: Strict start AND end date bounds
                    WHERE (TRX_DATE >= v_prev_fy_start AND TRX_DATE < v_curr_fy_end)
                       OR (ORDERED_DATE >= v_prev_fy_start AND ORDERED_DATE < v_curr_fy_end)
                    GROUP BY OU_NAME, ORD_EMPT_STATUS, BILL_TO_CUST_NAME, org_id
                )
                WHERE oa_flag = 'Y'
                GROUP BY OU_NAME

                UNION ALL

                -- Inventory data
                SELECT
                    operating_unit AS OU_NAME,
                    0, 0, 0, 0, 0, 0, 0, 0,
                    SUM(amount) AS INV_AMT
                FROM (
                    SELECT
                        (SELECT name FROM hr_operating_units n
                          WHERE n.organization_id = (
                              SELECT operating_unit FROM org_organization_definitions m
                               WHERE m.organization_id = a.organization_id
                          )
                        ) AS operating_unit,
                        TRANSACTION_QUANTITY * ITEM_COST AS amount
                    FROM Jan_all_ou_inventory_details a
                    WHERE INVENTORY_OTHERS = 'Planning Asset Sub-Inventories'
                )
                GROUP BY operating_unit
            )
            GROUP BY OU_NAME;

    ELSE
                -- External ONLY
        OPEN p_cursor FOR
            SELECT
                OU_NAME,
                SUM(PREV_FY_SALE_AS_ON)          AS PREV_FY_SALE_AS_ON,
                SUM(PREV_FY_SALE_CURRNT_MNTH)     AS PREV_FY_SALE_CURRNT_MNTH,
                SUM(CURR_FY_SALE_AS_ON)           AS CURR_FY_SALE_AS_ON,
                SUM(CURR_FY_SALE_CURRNT_MNTH)     AS CURR_FY_SALE_CURRNT_MNTH,
                SUM(PREV_FY_PEND_AS_ON)           AS PREV_FY_PEND_AS_ON,
                SUM(PREV_FY_PEND_CURRNT_MNTH)     AS PREV_FY_PEND_CURRNT_MNTH,
                SUM(CURR_FY_PEND_AS_ON)           AS CURR_FY_PEND_AS_ON,
                SUM(CURR_FY_PEND_CURRNT_MNTH)     AS CURR_FY_PEND_CURRNT_MNTH,
                SUM(INV_AMT)                      AS INV_AMT
            FROM (
                SELECT
                    OU_NAME,
                    SUM(PREV_FY_SALE_AS_ON)       AS PREV_FY_SALE_AS_ON,
                    SUM(PREV_FY_SALE_CURRNT_MNTH) AS PREV_FY_SALE_CURRNT_MNTH,
                    SUM(CURR_FY_SALE_AS_ON)       AS CURR_FY_SALE_AS_ON,
                    SUM(CURR_FY_SALE_CURRNT_MNTH) AS CURR_FY_SALE_CURRNT_MNTH,
                    SUM(PREV_FY_PEND_AS_ON)       AS PREV_FY_PEND_AS_ON,
                    SUM(PREV_FY_PEND_CURRNT_MNTH) AS PREV_FY_PEND_CURRNT_MNTH,
                    SUM(CURR_FY_PEND_AS_ON)       AS CURR_FY_PEND_AS_ON,
                    SUM(CURR_FY_PEND_CURRNT_MNTH) AS CURR_FY_PEND_CURRNT_MNTH,
                    0                             AS INV_AMT
                FROM (
                    SELECT
                        OU_NAME,
                        -- Previous FY Sales (Bounded)
                        NVL(SUM(CASE WHEN TRX_DATE >= v_prev_fy_start AND TRX_DATE < v_prev_fy_end AND SOURCE_NAME = 'SALES'
                                     THEN QUANTITY_INVOICED * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate END), 0) AS PREV_FY_SALE_AS_ON,
                        -- Previous FY Month Sales (Direct Date Match)
                        NVL(SUM(CASE WHEN TRX_DATE >= v_prev_month_start AND TRX_DATE < v_prev_month_end AND SOURCE_NAME = 'SALES'
                                     THEN QUANTITY_INVOICED * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate END), 0) AS PREV_FY_SALE_CURRNT_MNTH,
                        -- Current FY Sales (Bounded)
                        NVL(SUM(CASE WHEN TRX_DATE >= v_curr_fy_start AND TRX_DATE < v_curr_fy_end AND SOURCE_NAME = 'SALES'
                                     THEN QUANTITY_INVOICED * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate END), 0) AS CURR_FY_SALE_AS_ON,
                        -- Current FY Month Sales (Direct Date Match)
                        NVL(SUM(CASE WHEN TRX_DATE >= v_curr_month_start AND TRX_DATE < v_curr_month_end AND SOURCE_NAME = 'SALES'
                                     THEN QUANTITY_INVOICED * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate END), 0) AS CURR_FY_SALE_CURRNT_MNTH,
                        -- Previous FY Pending (Bounded)
                        NVL(SUM(CASE WHEN ORDERED_DATE >= v_prev_fy_start AND ORDERED_DATE < v_prev_fy_end AND SOURCE_NAME = 'ORDER'
                                     THEN PEND_QUANTITY * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate END), 0)    AS PREV_FY_PEND_AS_ON,
                        -- Previous FY Month Pending (Direct Date Match)
                        NVL(SUM(CASE WHEN ORDERED_DATE >= v_prev_month_start AND ORDERED_DATE < v_prev_month_end AND SOURCE_NAME = 'ORDER'
                                     THEN PEND_QUANTITY * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate END), 0)    AS PREV_FY_PEND_CURRNT_MNTH,
                        -- Current FY Pending (Bounded)
                        NVL(SUM(CASE WHEN ORDERED_DATE >= v_curr_fy_start AND ORDERED_DATE < v_curr_fy_end AND SOURCE_NAME = 'ORDER'
                                     THEN PEND_QUANTITY * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate END), 0)    AS CURR_FY_PEND_AS_ON,
                        -- Current FY Month Pending (Direct Date Match)
                        NVL(SUM(CASE WHEN ORDERED_DATE >= v_curr_month_start AND ORDERED_DATE < v_curr_month_end AND SOURCE_NAME = 'ORDER'
                                     THEN PEND_QUANTITY * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate END), 0)    AS CURR_FY_PEND_CURRNT_MNTH
                    FROM JAN_ALL_OU_ORD_SALES_V
                    WHERE STK_TFR_FLG     = 'N'
                      AND ORD_EMPT_STATUS = 'N'
                      -- Fixed Global Index Filter (Closes the date range bound)
                      AND ((TRX_DATE >= v_prev_fy_start AND TRX_DATE < v_curr_fy_end)
                        OR (ORDERED_DATE >= v_prev_fy_start AND ORDERED_DATE < v_curr_fy_end))
                    GROUP BY OU_NAME
                )
                GROUP BY OU_NAME

                UNION ALL

                -- Inventory data
                SELECT
                    operating_unit AS OU_NAME,
                    0, 0, 0, 0, 0, 0, 0, 0,
                    SUM(amount) AS INV_AMT
                FROM (
                    SELECT
                        (SELECT name FROM hr_operating_units n
                          WHERE n.organization_id = (
                              SELECT operating_unit FROM org_organization_definitions m
                               WHERE m.organization_id = a.organization_id
                          )
                        ) AS operating_unit,
                        TRANSACTION_QUANTITY * ITEM_COST AS amount
                    FROM Jan_all_ou_inventory_details a
                    WHERE INVENTORY_OTHERS = 'Planning Asset Sub-Inventories'
                )
                GROUP BY operating_unit
            )
            GROUP BY OU_NAME;

    END IF;

EXCEPTION
WHEN OTHERS THEN
IF p_cursor%ISOPEN THEN
CLOSE p_cursor;
END IF;
RAISE;

END JAN_GET_OU_SALES_PERFORMANCE;

--all ou external AND INTERNAL

DECLARE
P_STK_TFR_FLG VARCHAR2(200);
P_CURSOR SYS_REFCURSOR;
BEGIN
P_STK_TFR_FLG := 'Y';

JAN_GET_OU_SALES_PERFORMANCE(
P_STK_TFR_FLG => P_STK_TFR_FLG,
P_CURSOR => P_CURSOR
);
/_ Legacy output:
DBMS_OUTPUT.PUT_LINE('P_CURSOR = ' || P_CURSOR);
_/
:P_CURSOR := P_CURSOR; --<-- Cursor
--rollback;
END;

--Result

Polymer Operating Unit	71843125.75	33658023.8	82256573.22	41155021.2	27990	16290	54125198.25	30103963	172328915.3657114
Janatics Operating Unit	731640702.67	353554488.56	790017858.84	385920919.44	679647.25	1742	812709288.25	254335354.71	1332462756.425509711066795
Janatics USA Operating Unit	7298741.484	4692632.406	5387749.051	2703097.6	0	0	21404.04	0	8505.96
Janatics Industrial Automation Pvt Ltd Operating Unit	67332950.84	41362460.6	51220307.01	26257497.19	0	0	37635266.44	32086694.74	219067636.62154149998
Vietnam Operating Unit	0	0	0	0	0	0	1662321.9672	1392485.0472	13329900
Dubai Operating Unit	14462089.087	7300376.074	14738945.5605	3260786.76	0	0	14567315.1515	8881360.11	143957.16001
Janatics Germany Operating Unit	0	0	0	0	0	0	0	0	1522.92
Skyfast Operating Unit	88017579.08	45484295.34	94479544.67	45236194.19	21483.79	0	57583769.18	34752266.95	72589617.1767908
Janatics Global USA Operating Unit	0	0	5218659.551	3846156.8	0	0	16236404.12	15747795.2	20669.55
Global Operating Unit	79460014.86	31279141.13	82054403.04	30591232.41	0	0	93208736.86	47401369.56	21663827.7535

--    external ONLY

DECLARE
  P_STK_TFR_FLG VARCHAR2(200);
  P_CURSOR SYS_REFCURSOR;
BEGIN
  P_STK_TFR_FLG := 'N';

  JAN_GET_OU_SALES_PERFORMANCE(
    P_STK_TFR_FLG => P_STK_TFR_FLG,
    P_CURSOR => P_CURSOR
  );
  /* Legacy output: 
DBMS_OUTPUT.PUT_LINE('P_CURSOR = ' || P_CURSOR);
*/ 
  :P_CURSOR := P_CURSOR; --<-- Cursor
--rollback; 
END;

--Result
Polymer Operating Unit	58945521.75	28406278.8	64168411.75	29582012.45	27990	16290	47550150.5	26578932.75	172328915.3657114
Janatics Operating Unit	717473676.77	344971616.32	764901309.88	372985895.54	679647.25	1742	781647815.79	230556697.6	1332462756.425509711066795
Janatics USA Operating Unit	6260381.814	3663049.698	5126266.056	2653440	0	0	21404.04	0	8505.96
Janatics Industrial Automation Pvt Ltd Operating Unit	45261889.24	29570089.3	23554960.33	13357028.08	0	0	23730478.48	19704687.79	219067636.62154149998
Vietnam Operating Unit	0	0	0	0	0	0	1662321.9672	1392485.0472	13329900
Dubai Operating Unit	9408379.0005	7294726.074	6925182.0925	3255351.12	0	0	14567315.1515	8881360.11	143957.16001
Janatics Germany Operating Unit	0	0	0	0	0	0	0	0	1522.92
Skyfast Operating Unit	24779641.7	11969009.55	25875257.51	12828686.5	0	0	8560875.73	7574036.85	72589617.1767908
Janatics Global USA Operating Unit	0	0	3927982.085	2863412	0	0	16236404.12	15747795.2	20669.55
Global Operating Unit	4086540.29	2000750.35	8183561.54	2360730.09	0	0	91288672.38	46114668.46	21663827.7535

