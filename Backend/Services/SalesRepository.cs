using Backend.DB;
using Backend.Interfaces;
using Backend.Models;

namespace Backend.Services;

public class OuSalesRepository : IOuSalesRepository
{
    private readonly IOracleService _oracleService;

    // Fixed: Connection string is now encapsulated inside OracleService
    public OuSalesRepository(IOracleService oracleService)
    {
        _oracleService = oracleService ?? throw new ArgumentNullException(nameof(oracleService));
    }

    public async Task<IEnumerable<OuSalesPerformanceDto>> GetSalesPerformanceAsync()
    {
        const string query = @"
WITH DateParameters AS (
    SELECT 
        TRUNC(SYSDATE, 'MM') AS CurrentMonthStart,
        ADD_MONTHS(TRUNC(SYSDATE, 'MM'), 1) AS NextMonthStart,
        ADD_MONTHS(TRUNC(SYSDATE, 'MM'), -12) AS LastYearMonthStart,
        ADD_MONTHS(TRUNC(SYSDATE, 'MM'), -11) AS LastYearNextMonthStart
    FROM DUAL
)
SELECT 
    OU_NAME,
    
    -- FY 25-26 Sales (01-APR-2025 to 31-MAR-2026)
    NVL(ROUND(SUM(CASE WHEN SOURCE_NAME='SALES' AND TRX_DATE >= TO_DATE('01-APR-2025','DD-MON-YYYY') AND TRX_DATE < TO_DATE('01-APR-2026','DD-MON-YYYY') THEN (QUANTITY_INVOICED * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate) END) / 10000000, 2), 0) AS SaleAsOn2526,
    
    -- FY 25-26 Sales Current Month (Last Year's Same Month)
    NVL(ROUND(SUM(CASE WHEN SOURCE_NAME='SALES' AND TRX_DATE >= p.LastYearMonthStart AND TRX_DATE < p.LastYearNextMonthStart THEN (QUANTITY_INVOICED * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate) END) / 10000000, 2), 0) AS SaleCm2526,
    
    -- FY 26-27 Sales (01-APR-2026 to 31-MAR-2027)
    NVL(ROUND(SUM(CASE WHEN SOURCE_NAME='SALES' AND TRX_DATE >= TO_DATE('01-APR-2026','DD-MON-YYYY') AND TRX_DATE < TO_DATE('01-APR-2027','DD-MON-YYYY') THEN (QUANTITY_INVOICED * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate) END) / 10000000, 2), 0) AS SaleAsOn2627,
    
    -- FY 26-27 Sales Current Month (Current Month)
    NVL(ROUND(SUM(CASE WHEN SOURCE_NAME='SALES' AND TRX_DATE >= p.CurrentMonthStart AND TRX_DATE < p.NextMonthStart THEN (QUANTITY_INVOICED * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate) END) / 10000000, 2), 0) AS SaleCm2627,
    
    -- FY 25-26 Pending Orders
    NVL(ROUND(SUM(CASE WHEN SOURCE_NAME='ORDER' AND ORDERED_DATE >= TO_DATE('01-APR-2025','DD-MON-YYYY') AND ORDERED_DATE < TO_DATE('01-APR-2026','DD-MON-YYYY') THEN (PEND_QUANTITY * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate) END) / 10000000, 2), 0) AS PendAsOn2526,
    
    -- FY 25-26 Pending Current Month (Last Year's Same Month)
    NVL(ROUND(SUM(CASE WHEN SOURCE_NAME='ORDER' AND ORDERED_DATE >= p.LastYearMonthStart AND ORDERED_DATE < p.LastYearNextMonthStart THEN (PEND_QUANTITY * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate) END) / 10000000, 2), 0) AS PendCm2526,
    
    -- FY 26-27 Pending Orders
    NVL(ROUND(SUM(CASE WHEN SOURCE_NAME='ORDER' AND ORDERED_DATE >= TO_DATE('01-APR-2026','DD-MON-YYYY') AND ORDERED_DATE < TO_DATE('01-APR-2027','DD-MON-YYYY') THEN (PEND_QUANTITY * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate) END) / 10000000, 2), 0) AS PendAsOn2627,
    
    -- FY 26-27 Pending Current Month (Current Month)
    NVL(ROUND(SUM(CASE WHEN SOURCE_NAME='ORDER' AND ORDERED_DATE >= p.CurrentMonthStart AND ORDERED_DATE < p.NextMonthStart THEN (PEND_QUANTITY * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate) END) / 10000000, 2), 0) AS PendCm2627

FROM JAN_ALL_OU_ORD_SALES_V 
CROSS JOIN DateParameters p
WHERE (TRX_DATE >= TO_DATE('01-APR-2025','DD-MON-YYYY') OR ORDERED_DATE >= TO_DATE('01-APR-2025','DD-MON-YYYY'))   
  AND ORD_EMPT_STATUS = 'N' 
  AND BILL_TO_CUST_NAME NOT IN ('JANATICS INDIA PVT. LTD - UNIT V','JANATICS INDIA PVT. LTD - UNIT VI') 
GROUP BY OU_NAME
ORDER BY OU_NAME DESC";

        var flatRows = await _oracleService.QueryAsync<dynamic>(query);

        return flatRows.Select(row => new OuSalesPerformanceDto
        {
            OuName = row.OU_NAME,
            MetricsFy2526 = new YearData
            {
                SalesAsOnDate = (decimal)row.SALEASON2526,
                SalesCurrentMonth = (decimal)row.SALECM2526,
                PendingAsOnDate = (decimal)row.PENDASON2526,
                PendingCurrentMonth = (decimal)row.PENDCM2526
            },
            MetricsFy2627 = new YearData
            {
                SalesAsOnDate = (decimal)row.SALEASON2627,
                SalesCurrentMonth = (decimal)row.SALECM2627,
                PendingAsOnDate = (decimal)row.PENDASON2627,
                PendingCurrentMonth = (decimal)row.PENDCM2627
            }
        });
    }

}
