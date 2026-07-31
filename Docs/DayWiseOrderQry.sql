SELECT
    m.ORG_ID,
    n.alias_name AS OU_NAME,
    -- Tracks the day and month context clearly (e.g., 01-APR, 02-APR)
    TO_CHAR(m.ORDERED_DATE, 'DD-MON') AS DAY_OF_YEAR,
    
    -- Pending orders for this exact calendar day last year
    NVL(SUM(CASE WHEN m.ORDERED_DATE >= ADD_MONTHS(CASE WHEN EXTRACT(MONTH FROM SYSDATE) >= 4 THEN TRUNC(SYSDATE, 'YYYY') + 90 ELSE TRUNC(ADD_MONTHS(SYSDATE, -12), 'YYYY') + 90 END, -12) 
                  AND m.ORDERED_DATE < ADD_MONTHS(TRUNC(SYSDATE) + 1, -12) 
                 THEN NVL(m.PEND_QUANTITY, 0) * NVL(m.UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(m.Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS PREV_FY_DAILY_PEND,
                 
    -- Pending orders for this exact calendar day this year
    NVL(SUM(CASE WHEN m.ORDERED_DATE >= CASE WHEN EXTRACT(MONTH FROM SYSDATE) >= 4 THEN TRUNC(SYSDATE, 'YYYY') + 90 ELSE TRUNC(ADD_MONTHS(SYSDATE, -12), 'YYYY') + 90 END 
                  AND m.ORDERED_DATE < TRUNC(SYSDATE) + 1 
                 THEN NVL(m.PEND_QUANTITY, 0) * NVL(m.UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(m.Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS CURR_FY_DAILY_PEND,
    n.sort_by AS SORT_BY
FROM JAN_ALL_OU_ORD_SALES_V m
LEFT JOIN jan_ou_alias_name n ON n.org_id = m.org_id
WHERE m.SOURCE_NAME = 'ORDER'
  AND m.ORDERED_DATE >= ADD_MONTHS(CASE WHEN EXTRACT(MONTH FROM SYSDATE) >= 4 THEN TRUNC(SYSDATE, 'YYYY') + 90 ELSE TRUNC(ADD_MONTHS(SYSDATE, -12), 'YYYY') + 90 END, -12)
  AND m.ORDERED_DATE < TRUNC(SYSDATE) + 1
  AND (:p_stk_tfr_flg = 'Y' OR (
        :p_stk_tfr_flg = 'N' AND NOT (
            m.org_id = 103 
            AND (m.ORD_EMPT_STATUS  = 'Y'
                 OR m.BILL_TO_CUST_NAME IN ('JANATICS INDIA PVT. LTD - UNIT V', 'JANATICS INDIA PVT. LTD - UNIT VI'))
        )
  ))
GROUP BY 
    m.ORG_ID, 
    n.alias_name, 
    TO_CHAR(m.ORDERED_DATE, 'DD-MON'),
    TO_CHAR(m.ORDERED_DATE, 'MMDD'),
    n.sort_by
ORDER BY 
    NVL(n.sort_by, 9999),
    -- Sub-orders chronologically based on a financial year perspective (April to March cycle)
    CASE WHEN TO_CHAR(m.ORDERED_DATE, 'MMDD') >= '0401' 
         THEN TO_CHAR(m.ORDERED_DATE, 'MMDD') 
         ELSE '1' || TO_CHAR(m.ORDERED_DATE, 'MMDD') 
    END;
