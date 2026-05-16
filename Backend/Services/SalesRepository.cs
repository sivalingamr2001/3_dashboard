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
                SELECT 
                    OU_NAME AS OuName,
                    TO_CHAR(COALESCE(TRX_DATE, ORDERED_DATE), 'YYYY') AS Yr,
                    ROUND(SUM(CASE 
                        WHEN SOURCE_NAME = 'SALES' AND TRX_DATE >= TO_DATE('2025-04-01', 'YYYY-MM-DD') 
                        THEN QUANTITY_INVOICED * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate 
                        ELSE 0 
                    END) / 10000000, 2) AS SaleVal,
                    ROUND(SUM(CASE 
                        WHEN SOURCE_NAME = 'ORDER' AND ORDERED_DATE >= TO_DATE('2025-04-01', 'YYYY-MM-DD') 
                        THEN PEND_QUANTITY * UNIT_SELLING_PRICE * Ou_Currency_Conv_Rate 
                        ELSE 0 
                    END) / 10000000, 2) AS PendOrdVal
                FROM JAN_ALL_OU_ORD_SALES_V 
                WHERE 
                    ORD_EMPT_STATUS = 'N'
                    AND SOURCE_NAME IN ('SALES', 'ORDER')
                    AND (TRX_DATE >= TO_DATE('2025-04-01', 'YYYY-MM-DD') OR ORDERED_DATE >= TO_DATE('2025-04-01', 'YYYY-MM-DD'))
                GROUP BY 
                    OU_NAME, 
                    TO_CHAR(COALESCE(TRX_DATE, ORDERED_DATE), 'YYYY')";

        return await _oracleService.QueryAsync<OuSalesPerformanceDto>(query);
    }
}
