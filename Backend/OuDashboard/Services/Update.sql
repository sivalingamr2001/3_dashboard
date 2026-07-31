CREATE OR REPLACE PROCEDURE jan_get_ou_order_and_sales_data (
    p_order_trend_cv      OUT SYS_REFCURSOR,
    p_sales_trend_cv      OUT SYS_REFCURSOR,
    p_rolling_10d_cv      OUT SYS_REFCURSOR,
    p_ytd_cumulative_cv   OUT SYS_REFCURSOR,
    p_stk_tfr_flg         IN VARCHAR2 DEFAULT 'N'
) AS
    v_curr_fy_start    DATE;
    v_prev_fy_start    DATE;
    v_curr_asof_end    DATE;
    v_prev_asof_end    DATE;
    v_window_start     DATE;
    v_window_end       DATE;
    v_ly_window_start  DATE;
    v_ly_window_end    DATE;
BEGIN
    IF EXTRACT(MONTH FROM SYSDATE) >= 4 THEN
        v_curr_fy_start := TO_DATE('01-APR-' || TO_CHAR(SYSDATE, 'YYYY'), 'DD-MON-YYYY');
    ELSE
        v_curr_fy_start := TO_DATE('01-APR-' || TO_CHAR(ADD_MONTHS(SYSDATE, -12), 'YYYY'), 'DD-MON-YYYY');
    END IF;

    v_prev_fy_start := ADD_MONTHS(v_curr_fy_start, -12);

    -- Current - 1 day. End dates are exclusive, so < v_curr_asof_end includes yesterday.
    v_curr_asof_end := TRUNC(SYSDATE);
    v_prev_asof_end := ADD_MONTHS(v_curr_asof_end, -12);

    -- Last 10 completed days: yesterday back to 10 days ago.
    v_window_start    := TRUNC(SYSDATE) - 10;
    v_window_end      := TRUNC(SYSDATE);
    v_ly_window_start := ADD_MONTHS(v_window_start, -12);
    v_ly_window_end   := ADD_MONTHS(v_window_end, -12);

    IF p_stk_tfr_flg = 'Y' THEN
        OPEN p_order_trend_cv FOR
            SELECT
                os.org_id,
                n.alias_name AS ou_name,
                CASE
                    WHEN os.ordered_date >= v_curr_fy_start THEN 'Current FY'
                    ELSE 'Previous FY'
                END AS fiscal_year_period,
                TO_CHAR(os.ordered_date, 'YYYYMM') yrmn,
                TO_CHAR(os.ordered_date, 'MON-YY') mnyr,
                ROUND(
                    SUM(
                        NVL(os.ordered_quantity, 0)
                        * NVL(os.unit_selling_price, 0)
                        * NVL(TO_NUMBER(REGEXP_REPLACE(os.ou_currency_conv_rate, '[^0-9.\-]')), 1)
                    ) / 10000000,
                    2
                ) order_value
            FROM
                jan_all_ou_ord_sales_v os
                LEFT JOIN jan_ou_alias_name n
                    ON n.org_id = os.org_id
            WHERE
                os.source_name = 'ORDER'
                AND (
                    (os.ordered_date >= v_curr_fy_start AND os.ordered_date < v_curr_asof_end)
                    OR
                    (os.ordered_date >= v_prev_fy_start AND os.ordered_date < v_prev_asof_end)
                )
                AND CASE
                    WHEN os.org_id = 103
                     AND (
                        os.ord_empt_status = 'Y'
                        OR os.bill_to_cust_name IN (
                            'JANATICS INDIA PVT. LTD - UNIT V',
                            'JANATICS INDIA PVT. LTD - UNIT VI'
                        )
                     )
                    THEN 'N'
                    ELSE 'Y'
                END = 'Y'
            GROUP BY
                os.org_id,
                n.alias_name,
                n.sort_by,
                CASE
                    WHEN os.ordered_date >= v_curr_fy_start THEN 'Current FY'
                    ELSE 'Previous FY'
                END,
                TO_CHAR(os.ordered_date, 'YYYYMM'),
                TO_CHAR(os.ordered_date, 'MON-YY')
            ORDER BY
                n.sort_by ASC,
                yrmn ASC;

        OPEN p_sales_trend_cv FOR
            SELECT
                os.org_id,
                n.alias_name AS ou_name,
                CASE
                    WHEN os.trx_date >= v_curr_fy_start THEN 'Current FY'
                    ELSE 'Previous FY'
                END AS fiscal_year_period,
                TO_CHAR(os.trx_date, 'YYYYMM') yrmn,
                TO_CHAR(os.trx_date, 'MON-YY') mnyr,
                ROUND(
                    SUM(
                        NVL(os.quantity_invoiced, 0)
                        * NVL(os.unit_selling_price, 0)
                        * NVL(TO_NUMBER(REGEXP_REPLACE(os.ou_currency_conv_rate, '[^0-9.\-]')), 1)
                    ) / 10000000,
                    2
                ) sales_value_crores
            FROM
                jan_all_ou_ord_sales_v os
                LEFT JOIN jan_ou_alias_name n
                    ON n.org_id = os.org_id
            WHERE
                os.source_name = 'SALES'
                AND (
                    (os.trx_date >= v_curr_fy_start AND os.trx_date < v_curr_asof_end)
                    OR
                    (os.trx_date >= v_prev_fy_start AND os.trx_date < v_prev_asof_end)
                )
                AND CASE
                    WHEN os.org_id = 103
                     AND (
                        os.ord_empt_status = 'Y'
                        OR os.bill_to_cust_name IN (
                            'JANATICS INDIA PVT. LTD - UNIT V',
                            'JANATICS INDIA PVT. LTD - UNIT VI'
                        )
                     )
                    THEN 'N'
                    ELSE 'Y'
                END = 'Y'
            GROUP BY
                os.org_id,
                n.alias_name,
                n.sort_by,
                CASE
                    WHEN os.trx_date >= v_curr_fy_start THEN 'Current FY'
                    ELSE 'Previous FY'
                END,
                TO_CHAR(os.trx_date, 'YYYYMM'),
                TO_CHAR(os.trx_date, 'MON-YY')
            ORDER BY
                n.sort_by ASC,
                yrmn ASC;

        OPEN p_rolling_10d_cv FOR
            WITH day_axis AS (
                SELECT
                    v_window_start + LEVEL - 1 AS cy_date,
                    v_ly_window_start + LEVEL - 1 AS py_date
                FROM
                    dual
                CONNECT BY
                    LEVEL <= 10
            ),
            sales_base AS (
                SELECT
                    os.org_id,
                    n.alias_name AS ou_name,
                    n.sort_by,
                    TRUNC(os.trx_date) AS trx_day,
                    NVL(os.quantity_invoiced, 0)
                    * NVL(os.unit_selling_price, 0)
                    * NVL(TO_NUMBER(REGEXP_REPLACE(os.ou_currency_conv_rate, '[^0-9.\-]')), 1) AS sales_amount
                FROM
                    jan_all_ou_ord_sales_v os
                    LEFT JOIN jan_ou_alias_name n
                        ON n.org_id = os.org_id
                WHERE
                    os.source_name = 'SALES'
                    AND (
                        (os.trx_date >= v_window_start AND os.trx_date < v_window_end)
                        OR
                        (os.trx_date >= v_ly_window_start AND os.trx_date < v_ly_window_end)
                    )
                    AND CASE
                        WHEN os.org_id = 103
                         AND (
                            os.ord_empt_status = 'Y'
                            OR os.bill_to_cust_name IN (
                                'JANATICS INDIA PVT. LTD - UNIT V',
                                'JANATICS INDIA PVT. LTD - UNIT VI'
                            )
                         )
                        THEN 'N'
                        ELSE 'Y'
                    END = 'Y'
            ),
            ou_axis AS (
                SELECT DISTINCT
                    org_id,
                    ou_name,
                    sort_by
                FROM
                    sales_base
            )
            SELECT
                ou.org_id,
                ou.ou_name,
                TO_CHAR(d.cy_date, 'DD-MON') AS calendar_day,
                ROUND(
                    SUM(
                        CASE
                            WHEN b.trx_day = d.cy_date THEN b.sales_amount
                        END
                    ) / 10000000,
                    2
                ) AS cy_sales,
                ROUND(
                    SUM(
                        CASE
                            WHEN b.trx_day = d.py_date THEN b.sales_amount
                        END
                    ) / 10000000,
                    2
                ) AS py_sales
            FROM
                ou_axis ou
                CROSS JOIN day_axis d
                LEFT JOIN sales_base b
                    ON b.org_id = ou.org_id
                    AND b.trx_day IN (d.cy_date, d.py_date)
            GROUP BY
                ou.org_id,
                ou.ou_name,
                ou.sort_by,
                d.cy_date
            ORDER BY
                ou.sort_by ASC,
                ou.org_id ASC,
                d.cy_date ASC;

        OPEN p_ytd_cumulative_cv FOR
            WITH dynamic_monthly_basis AS (
                SELECT
                    os.org_id,
                    n.alias_name AS ou_name,
                    n.sort_by,
                    CASE
                        WHEN os.trx_date >= v_curr_fy_start THEN 'Current FY'
                        ELSE 'Previous FY'
                    END AS fiscal_year_period,
                    TO_CHAR(os.trx_date, 'YYYYMM') AS yrmn,
                    TO_CHAR(os.trx_date, 'MON-YY') AS mnyr,
                    SUM(
                        NVL(os.quantity_invoiced, 0)
                        * NVL(os.unit_selling_price, 0)
                        * NVL(TO_NUMBER(REGEXP_REPLACE(os.ou_currency_conv_rate, '[^0-9.\-]')), 1)
                    ) AS monthly_raw_sales
                FROM
                    jan_all_ou_ord_sales_v os
                    LEFT JOIN jan_ou_alias_name n
                        ON n.org_id = os.org_id
                WHERE
                    os.source_name = 'SALES'
                    AND (
                        (os.trx_date >= v_curr_fy_start AND os.trx_date < v_curr_asof_end)
                        OR
                        (os.trx_date >= v_prev_fy_start AND os.trx_date < v_prev_asof_end)
                    )
                    AND CASE
                        WHEN os.org_id = 103
                         AND (
                            os.ord_empt_status = 'Y'
                            OR os.bill_to_cust_name IN (
                                'JANATICS INDIA PVT. LTD - UNIT V',
                                'JANATICS INDIA PVT. LTD - UNIT VI'
                            )
                         )
                        THEN 'N'
                        ELSE 'Y'
                    END = 'Y'
                GROUP BY
                    os.org_id,
                    n.alias_name,
                    n.sort_by,
                    CASE
                        WHEN os.trx_date >= v_curr_fy_start THEN 'Current FY'
                        ELSE 'Previous FY'
                    END,
                    TO_CHAR(os.trx_date, 'YYYYMM'),
                    TO_CHAR(os.trx_date, 'MON-YY')
            )
            SELECT
                org_id,
                ou_name,
                fiscal_year_period,
                yrmn,
                mnyr,
                ROUND(monthly_raw_sales / 10000000, 2) AS monthly_sales_crores,
                ROUND(
                    SUM(monthly_raw_sales) OVER (
                        PARTITION BY
                            org_id,
                            ou_name,
                            fiscal_year_period
                        ORDER BY
                            yrmn ASC
                    ) / 10000000,
                    2
                ) AS cumulative_ytd_crores
            FROM
                dynamic_monthly_basis
            ORDER BY
                sort_by ASC,
                org_id ASC,
                fiscal_year_period DESC,
                yrmn ASC;

    ELSE
        OPEN p_order_trend_cv FOR
            SELECT
                os.org_id,
                n.alias_name AS ou_name,
                CASE
                    WHEN os.ordered_date >= v_curr_fy_start THEN 'Current FY'
                    ELSE 'Previous FY'
                END AS fiscal_year_period,
                TO_CHAR(os.ordered_date, 'YYYYMM') yrmn,
                TO_CHAR(os.ordered_date, 'MON-YY') mnyr,
                ROUND(
                    SUM(
                        NVL(os.ordered_quantity, 0)
                        * NVL(os.unit_selling_price, 0)
                        * NVL(TO_NUMBER(REGEXP_REPLACE(os.ou_currency_conv_rate, '[^0-9.\-]')), 1)
                    ) / 10000000,
                    2
                ) order_value
            FROM
                jan_all_ou_ord_sales_v os
                LEFT JOIN jan_ou_alias_name n
                    ON n.org_id = os.org_id
            WHERE
                os.source_name = 'ORDER'
                AND os.stk_tfr_flg = 'N'
                AND os.ord_empt_status = 'N'
                AND (
                    (os.ordered_date >= v_curr_fy_start AND os.ordered_date < v_curr_asof_end)
                    OR
                    (os.ordered_date >= v_prev_fy_start AND os.ordered_date < v_prev_asof_end)
                )
            GROUP BY
                os.org_id,
                n.alias_name,
                n.sort_by,
                CASE
                    WHEN os.ordered_date >= v_curr_fy_start THEN 'Current FY'
                    ELSE 'Previous FY'
                END,
                TO_CHAR(os.ordered_date, 'YYYYMM'),
                TO_CHAR(os.ordered_date, 'MON-YY')
            ORDER BY
                n.sort_by ASC,
                yrmn ASC;

        OPEN p_sales_trend_cv FOR
            SELECT
                os.org_id,
                n.alias_name AS ou_name,
                CASE
                    WHEN os.trx_date >= v_curr_fy_start THEN 'Current FY'
                    ELSE 'Previous FY'
                END AS fiscal_year_period,
                TO_CHAR(os.trx_date, 'YYYYMM') yrmn,
                TO_CHAR(os.trx_date, 'MON-YY') mnyr,
                ROUND(
                    SUM(
                        NVL(os.quantity_invoiced, 0)
                        * NVL(os.unit_selling_price, 0)
                        * NVL(TO_NUMBER(REGEXP_REPLACE(os.ou_currency_conv_rate, '[^0-9.\-]')), 1)
                    ) / 10000000,
                    2
                ) sales_value_crores
            FROM
                jan_all_ou_ord_sales_v os
                LEFT JOIN jan_ou_alias_name n
                    ON n.org_id = os.org_id
            WHERE
                os.source_name = 'SALES'
                AND os.stk_tfr_flg = 'N'
                AND os.ord_empt_status = 'N'
                AND (
                    (os.trx_date >= v_curr_fy_start AND os.trx_date < v_curr_asof_end)
                    OR
                    (os.trx_date >= v_prev_fy_start AND os.trx_date < v_prev_asof_end)
                )
            GROUP BY
                os.org_id,
                n.alias_name,
                n.sort_by,
                CASE
                    WHEN os.trx_date >= v_curr_fy_start THEN 'Current FY'
                    ELSE 'Previous FY'
                END,
                TO_CHAR(os.trx_date, 'YYYYMM'),
                TO_CHAR(os.trx_date, 'MON-YY')
            ORDER BY
                n.sort_by ASC,
                yrmn ASC;

        OPEN p_rolling_10d_cv FOR
            WITH day_axis AS (
                SELECT
                    v_window_start + LEVEL - 1 AS cy_date,
                    v_ly_window_start + LEVEL - 1 AS py_date
                FROM
                    dual
                CONNECT BY
                    LEVEL <= 10
            ),
            sales_base AS (
                SELECT
                    os.org_id,
                    n.alias_name AS ou_name,
                    n.sort_by,
                    TRUNC(os.trx_date) AS trx_day,
                    NVL(os.quantity_invoiced, 0)
                    * NVL(os.unit_selling_price, 0)
                    * NVL(TO_NUMBER(REGEXP_REPLACE(os.ou_currency_conv_rate, '[^0-9.\-]')), 1) AS sales_amount
                FROM
                    jan_all_ou_ord_sales_v os
                    LEFT JOIN jan_ou_alias_name n
                        ON n.org_id = os.org_id
                WHERE
                    os.source_name = 'SALES'
                    AND os.stk_tfr_flg = 'N'
                    AND os.ord_empt_status = 'N'
                    AND (
                        (os.trx_date >= v_window_start AND os.trx_date < v_window_end)
                        OR
                        (os.trx_date >= v_ly_window_start AND os.trx_date < v_ly_window_end)
                    )
            ),
            ou_axis AS (
                SELECT DISTINCT
                    org_id,
                    ou_name,
                    sort_by
                FROM
                    sales_base
            )
            SELECT
                ou.org_id,
                ou.ou_name,
                TO_CHAR(d.cy_date, 'DD-MON') AS calendar_day,
                ROUND(
                    SUM(
                        CASE
                            WHEN b.trx_day = d.cy_date THEN b.sales_amount
                        END
                    ) / 10000000,
                    2
                ) AS cy_sales,
                ROUND(
                    SUM(
                        CASE
                            WHEN b.trx_day = d.py_date THEN b.sales_amount
                        END
                    ) / 10000000,
                    2
                ) AS py_sales
            FROM
                ou_axis ou
                CROSS JOIN day_axis d
                LEFT JOIN sales_base b
                    ON b.org_id = ou.org_id
                    AND b.trx_day IN (d.cy_date, d.py_date)
            GROUP BY
                ou.org_id,
                ou.ou_name,
                ou.sort_by,
                d.cy_date
            ORDER BY
                ou.sort_by ASC,
                ou.org_id ASC,
                d.cy_date ASC;

        OPEN p_ytd_cumulative_cv FOR
            WITH dynamic_monthly_basis AS (
                SELECT
                    os.org_id,
                    n.alias_name AS ou_name,
                    n.sort_by,
                    CASE
                        WHEN os.trx_date >= v_curr_fy_start THEN 'Current FY'
                        ELSE 'Previous FY'
                    END AS fiscal_year_period,
                    TO_CHAR(os.trx_date, 'YYYYMM') AS yrmn,
                    TO_CHAR(os.trx_date, 'MON-YY') AS mnyr,
                    SUM(
                        NVL(os.quantity_invoiced, 0)
                        * NVL(os.unit_selling_price, 0)
                        * NVL(TO_NUMBER(REGEXP_REPLACE(os.ou_currency_conv_rate, '[^0-9.\-]')), 1)
                    ) AS monthly_raw_sales
                FROM
                    jan_all_ou_ord_sales_v os
                    LEFT JOIN jan_ou_alias_name n
                        ON n.org_id = os.org_id
                WHERE
                    os.source_name = 'SALES'
                    AND os.stk_tfr_flg = 'N'
                    AND os.ord_empt_status = 'N'
                    AND (
                        (os.trx_date >= v_curr_fy_start AND os.trx_date < v_curr_asof_end)
                        OR
                        (os.trx_date >= v_prev_fy_start AND os.trx_date < v_prev_asof_end)
                    )
                GROUP BY
                    os.org_id,
                    n.alias_name,
                    n.sort_by,
                    CASE
                        WHEN os.trx_date >= v_curr_fy_start THEN 'Current FY'
                        ELSE 'Previous FY'
                    END,
                    TO_CHAR(os.trx_date, 'YYYYMM'),
                    TO_CHAR(os.trx_date, 'MON-YY')
            )
            SELECT
                org_id,
                ou_name,
                fiscal_year_period,
                yrmn,
                mnyr,
                ROUND(monthly_raw_sales / 10000000, 2) AS monthly_sales_crores,
                ROUND(
                    SUM(monthly_raw_sales) OVER (
                        PARTITION BY
                            org_id,
                            ou_name,
                            fiscal_year_period
                        ORDER BY
                            yrmn ASC
                    ) / 10000000,
                    2
                ) AS cumulative_ytd_crores
            FROM
                dynamic_monthly_basis
            ORDER BY
                sort_by ASC,
                org_id ASC,
                fiscal_year_period DESC,
                yrmn ASC;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        IF p_order_trend_cv%ISOPEN THEN
            CLOSE p_order_trend_cv;
        END IF;

        IF p_sales_trend_cv%ISOPEN THEN
            CLOSE p_sales_trend_cv;
        END IF;

        IF p_rolling_10d_cv%ISOPEN THEN
            CLOSE p_rolling_10d_cv;
        END IF;

        IF p_ytd_cumulative_cv%ISOPEN THEN
            CLOSE p_ytd_cumulative_cv;
        END IF;

        RAISE;
END jan_get_ou_order_and_sales_data;
