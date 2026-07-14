SELECT
    org_id,
    ou_name,
    TO_CHAR(ordered_date,'YYYYMM') yrmn,
    TO_CHAR(ordered_date,'MON-YY') mnyr,
    round(
        SUM(ordered_quantity * unit_selling_price * ou_currency_conv_rate) / 1000000,
        2
    ) order_value
FROM
    jan_all_ou_ord_sales_v
WHERE
        source_name = 'ORDER'
    AND
        ordered_date >= '1-APR-2025'
    AND
        stk_tfr_flg = 'N'
    AND
        ord_empt_status = 'N'
GROUP BY
    ou_name,
    org_id,
    TO_CHAR(ordered_date,'YYYYMM'),
    TO_CHAR(ordered_date,'MON-YY')
ORDER BY yrmn ASC;

SELECT
    ORG_ID,
    OU_NAME,
    TO_CHAR(TRX_DATE, 'YYYYMM') YRMN,
    TO_CHAR(TRX_DATE, 'MON-YY') MNYR,
    ROUND(SUM(QUANTITY_INVOICED * UNIT_SELLING_PRICE * OU_CURRENCY_CONV_RATE) / 10000000, 2) SALES_VALUE
FROM
    JAN_ALL_OU_ORD_SALES_V    
WHERE
    SOURCE_NAME = 'SALES'
    AND TRX_DATE >= TO_DATE('2025-04-01', 'YYYY-MM-DD')
    AND STK_TFR_FLG = 'N'
    AND ORD_EMPT_STATUS = 'N'
GROUP BY
    ORG_ID,
    OU_NAME,
    TO_CHAR(TRX_DATE, 'YYYYMM'),
    TO_CHAR(TRX_DATE, 'MON-YY')
ORDER BY 
    YRMN ASC;
    
    
    SELECT
    ORG_ID,
    OU_NAME,
    -- Label to easily segregate data series on your UI charts
    CASE 
        WHEN TRX_DATE >= TO_DATE('2026-04-01', 'YYYY-MM-DD') THEN 'FY 2026-27'
        ELSE 'FY 2025-26'
    END AS FISCAL_YEAR,
    -- Display date format for chart X-axis labels (e.g., '23 Apr')
    TO_CHAR(TRX_DATE, 'DD Mon') AS DAY_LABEL,
    -- Raw date tracking used for strict chronological ordering
    TRUNC(TRX_DATE) AS ORDER_DATE,
    ROUND(SUM(QUANTITY_INVOICED * UNIT_SELLING_PRICE * OU_CURRENCY_CONV_RATE) / 10000000, 2) AS SALES_VALUE_CRORES
FROM
    JAN_ALL_OU_ORD_SALES_V    
WHERE
    SOURCE_NAME = 'SALES'
    AND STK_TFR_FLG = 'N'
    AND ORD_EMPT_STATUS = 'N'
    -- Strict dynamic window filters matching exactly 10 working days up to today
    AND (
        (TRX_DATE >= TRUNC(SYSDATE) - 13 AND TRX_DATE <= TRUNC(SYSDATE)) -- Current window (buffers for weekends)
        OR
        (TRX_DATE >= ADD_MONTHS(TRUNC(SYSDATE), -12) - 13 AND TRX_DATE <= ADD_MONTHS(TRUNC(SYSDATE), -12)) -- Prior Year same window
    )
GROUP BY
    ORG_ID,
    OU_NAME,
    CASE 
        WHEN TRX_DATE >= TO_DATE('2026-04-01', 'YYYY-MM-DD') THEN 'FY 2026-27'
        ELSE 'FY 2025-26'
    END,
    TO_CHAR(TRX_DATE, 'DD Mon'),
    TRUNC(TRX_DATE)
ORDER BY 
    ORDER_DATE ASC,
    ORG_ID ASC;
    