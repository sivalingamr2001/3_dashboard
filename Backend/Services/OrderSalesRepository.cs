using Backend.Controllers;
using Dapper;
using Microsoft.Data.SqlClient;

namespace Backend.Services;

public interface IOrderSalesRepository
{
    Task<IEnumerable<OrderTrendDto>> GetOrdersTrendAsync(int? orgId, CancellationToken ct = default);
    Task<IEnumerable<SalesTrendDto>> GetSalesTrendAsync(int? orgId, CancellationToken ct = default);
    Task<IEnumerable<Rolling10dDto>> GetRolling10dAsync(int? orgId, CancellationToken ct = default);
    Task<IEnumerable<YtdCumulativeDto>> GetYtdCumulativeAsync(int? orgId, CancellationToken ct = default);
    Task<IEnumerable<OperatingUnitDto>> GetOperatingUnitsAsync(CancellationToken ct = default);
}

public class OrderSalesRepository : IOrderSalesRepository
{
    private readonly string _connectionString;

    public OrderSalesRepository(IConfiguration config)
    {
        _connectionString = config.GetConnectionString("SqlServerConnection")
            ?? throw new InvalidOperationException("SqlServerConnection string not configured.");
    }

    public async Task<IEnumerable<OrderTrendDto>> GetOrdersTrendAsync(int? orgId, CancellationToken ct = default)
    {
        const string sql = @"
            SELECT 
                ORG_ID          AS OrgId,
                OU_NAME         AS OuName,
                FISCAL_YEAR_PERIOD AS FiscalYearPeriod,
                YRMN            AS Yrmn,
                MNYR            AS Mnyr,
                ORDER_VALUE     AS OrderValue,
                MigratedAt
            FROM JAN_ALL_OU_ORD
            WHERE (@orgId IS NULL OR ORG_ID = @orgId)
            ORDER BY YRMN ASC, ORG_ID ASC";

        await using var conn = new SqlConnection(_connectionString);
        return await conn.QueryAsync<OrderTrendDto>(new CommandDefinition(sql, new { orgId }, cancellationToken: ct));
    }

    public async Task<IEnumerable<SalesTrendDto>> GetSalesTrendAsync(int? orgId, CancellationToken ct = default)
    {
        const string sql = @"
            SELECT 
                ORG_ID          AS OrgId,
                OU_NAME         AS OuName,
                FISCAL_YEAR_PERIOD AS FiscalYearPeriod,
                YRMN            AS Yrmn,
                MNYR            AS Mnyr,
                SALES_VALUE     AS SalesValue,
                MigratedAt
            FROM JAN_ALL_OU_SALES
            WHERE (@orgId IS NULL OR ORG_ID = @orgId)
            ORDER BY YRMN ASC, ORG_ID ASC";

        await using var conn = new SqlConnection(_connectionString);
        return await conn.QueryAsync<SalesTrendDto>(new CommandDefinition(sql, new { orgId }, cancellationToken: ct));
    }

    public async Task<IEnumerable<Rolling10dDto>> GetRolling10dAsync(int? orgId, CancellationToken ct = default)
    {
        const string sql = @"
            SELECT 
                ORG_ID          AS OrgId,
                OU_NAME         AS OuName,
                DYNAMIC_PERIOD  AS DynamicPeriod,
                DAY_LABEL       AS DayLabel,
                ORDER_DATE      AS OrderDate,
                SALES_VALUE     AS SalesValue,
                MigratedAt
            FROM JAN_ALL_OU_SALES_DAY
            WHERE (@orgId IS NULL OR ORG_ID = @orgId)
            ORDER BY ORDER_DATE ASC, ORG_ID ASC";

        await using var conn = new SqlConnection(_connectionString);
        return await conn.QueryAsync<Rolling10dDto>(new CommandDefinition(sql, new { orgId }, cancellationToken: ct));
    }

    public async Task<IEnumerable<YtdCumulativeDto>> GetYtdCumulativeAsync(int? orgId, CancellationToken ct = default)
    {
        const string sql = @"
            SELECT 
                ORG_ID          AS OrgId,
                OU_NAME         AS OuName,
                FISCAL_YEAR_PERIOD AS FiscalYearPeriod,
                YRMN            AS Yrmn,
                MNYR            AS Mnyr,
                MONTHLY_SALES   AS MonthlySales,
                CUMULATIVE_YTD  AS CumulativeYtd,
                MigratedAt
            FROM JAN_ALL_OU_SALES_YR_TO_DATE
            WHERE (@orgId IS NULL OR ORG_ID = @orgId)
            ORDER BY ORG_ID ASC, FISCAL_YEAR_PERIOD DESC, YRMN ASC";

        await using var conn = new SqlConnection(_connectionString);
        return await conn.QueryAsync<YtdCumulativeDto>(new CommandDefinition(sql, new { orgId }, cancellationToken: ct));
    }

    public async Task<IEnumerable<OperatingUnitDto>> GetOperatingUnitsAsync(CancellationToken ct = default)
    {
        const string sql = @"
            SELECT DISTINCT 
                ORG_ID  AS OrgId,
                OU_NAME AS OuName
            FROM JAN_ALL_OU_SALES
            ORDER BY ORG_ID ASC";

        await using var conn = new SqlConnection(_connectionString);
        return await conn.QueryAsync<OperatingUnitDto>(new CommandDefinition(sql, cancellationToken: ct));
    }
}
