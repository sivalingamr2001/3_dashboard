SELECT
    m.ORG_ID,
    n.alias_name AS OU_NAME,
    -- Financial Month Number: April = 1, May = 2 ... December = 9, January = 10 ... March = 12
    CASE WHEN EXTRACT(MONTH FROM m.TRX_DATE) >= 4 
         THEN EXTRACT(MONTH FROM m.TRX_DATE) - 3 
         ELSE EXTRACT(MONTH FROM m.TRX_DATE) + 9 
    END AS FY_MONTH_NUM,
    -- Calendar Month Display Name (e.g., APR, MAY, JUN)
    TO_CHAR(m.TRX_DATE, 'MON') AS MONTH_NAME,
    
    -- Previous FY Total Sales for this specific month
    NVL(SUM(CASE WHEN m.TRX_DATE >= ADD_MONTHS(CASE WHEN EXTRACT(MONTH FROM SYSDATE) >= 4 THEN TRUNC(SYSDATE, 'YYYY') + 90 ELSE TRUNC(ADD_MONTHS(SYSDATE, -12), 'YYYY') + 90 END, -12) 
                  AND m.TRX_DATE < ADD_MONTHS(TRUNC(SYSDATE) + 1, -12) 
                 THEN NVL(m.QUANTITY_INVOICED, 0) * NVL(m.UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(m.Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS PREV_FY_MONTH_SALE,
                 
    -- Current FY Total Sales for this specific month
    NVL(SUM(CASE WHEN m.TRX_DATE >= CASE WHEN EXTRACT(MONTH FROM SYSDATE) >= 4 THEN TRUNC(SYSDATE, 'YYYY') + 90 ELSE TRUNC(ADD_MONTHS(SYSDATE, -12), 'YYYY') + 90 END 
                  AND m.TRX_DATE < TRUNC(SYSDATE) + 1 
                 THEN NVL(m.QUANTITY_INVOICED, 0) * NVL(m.UNIT_SELLING_PRICE, 0) * NVL(TO_NUMBER(REGEXP_REPLACE(m.Ou_Currency_Conv_Rate, '[^0-9.\-]')), 1) END), 0) AS CURR_FY_MONTH_SALE,
    n.sort_by AS SORT_BY
FROM JAN_ALL_OU_ORD_SALES_V m
LEFT JOIN jan_ou_alias_name n ON n.org_id = m.org_id
WHERE m.SOURCE_NAME = 'SALES'
  AND m.TRX_DATE >= ADD_MONTHS(CASE WHEN EXTRACT(MONTH FROM SYSDATE) >= 4 THEN TRUNC(SYSDATE, 'YYYY') + 90 ELSE TRUNC(ADD_MONTHS(SYSDATE, -12), 'YYYY') + 90 END, -12)
  AND m.TRX_DATE < TRUNC(SYSDATE) + 1
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
    CASE WHEN EXTRACT(MONTH FROM m.TRX_DATE) >= 4 THEN EXTRACT(MONTH FROM m.TRX_DATE) - 3 ELSE EXTRACT(MONTH FROM m.TRX_DATE) + 9 END,
    TO_CHAR(m.TRX_DATE, 'MON'),
    n.sort_by
ORDER BY 
    NVL(n.sort_by, 9999), 
    FY_MONTH_NUM;