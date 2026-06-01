using Backend.DB;
using Backend.Interfaces;
using Backend.Models;
using Dapper;
using Microsoft.Data.SqlClient;
using Oracle.ManagedDataAccess.Client;
using System.Data;

namespace Backend.Services;

public class OuSalesRepository(IOracleService oracleService, IConfiguration configuration, ILogger<OuSalesRepository> logger) : IOuSalesRepository
{
    private readonly IOracleService _oracleService = oracleService ?? throw new ArgumentNullException(nameof(oracleService));
    private readonly string _sqlServerConnectionString = configuration.GetConnectionString("SqlServerConnection") ?? string.Empty;
    private readonly string _currentProvider = configuration["Database:Provider"] ?? "Oracle";
    private readonly ILogger<OuSalesRepository> _logger = logger ?? throw new ArgumentNullException(nameof(logger));

    private class OracleDynamicParameters : SqlMapper.IDynamicParameters
    {
        private readonly List<OracleParameter> _oracleParameters = new();

        public void Add(string name, OracleDbType oracleDbType, ParameterDirection direction, object? value = null, int? size = null)
        {
            var param = new OracleParameter(name, oracleDbType, value, direction);
            if (size.HasValue) param.Size = size.Value;
            _oracleParameters.Add(param);
        }

        public void AddParameters(IDbCommand command, SqlMapper.Identity identity)
        {
            if (command is OracleCommand oracleCommand)
            {
                oracleCommand.CommandType = CommandType.StoredProcedure;
                oracleCommand.Parameters.AddRange(_oracleParameters.ToArray());
            }
        }
    }

    public async Task<IEnumerable<OuSalesPerformanceDto>> GetSalesPerformanceAsync(string? stkTfrFlg = "Y")
    {
        var flagValue = string.IsNullOrWhiteSpace(stkTfrFlg) ? "Y" : stkTfrFlg;
        bool isSqlServerPreferred = string.Equals(_currentProvider, "SqlServer", StringComparison.OrdinalIgnoreCase);

        if (isSqlServerPreferred)
        {
            try
            {
                var result = await GetSqlServerSalesPerformanceAsync(flagValue);
                _logger.LogInformation("Successfully fetched sales performance data from SQL Server.");
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Primary SQL Server fetch failed. Trying fallback to Oracle infrastructure.");

                try
                {
                    var fallbackResult = await GetOracleSalesPerformanceAsync(flagValue);
                    _logger.LogInformation("Successfully fetched sales performance data from Oracle infrastructure (Fallback).");
                    return fallbackResult;
                }
                catch (Exception fallbackEx)
                {
                    _logger.LogCritical(fallbackEx, "Both SQL Server and Oracle infrastructure fetches failed. Returning empty dataset.");
                    return Enumerable.Empty<OuSalesPerformanceDto>();
                }
            }
        }
        else
        {
            try
            {
                var result = await GetOracleSalesPerformanceAsync(flagValue);
                _logger.LogInformation("Successfully fetched sales performance data from Oracle Infrastructure.");
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Primary Oracle fetch failed. Trying fallback to SQL Server infrastructure.");

                try
                {
                    var fallbackResult = await GetSqlServerSalesPerformanceAsync(flagValue);
                    _logger.LogInformation("Successfully fetched sales performance data from SQL Server (Fallback).");
                    return fallbackResult;
                }
                catch (Exception fallbackEx)
                {
                    _logger.LogCritical(fallbackEx, "Both Oracle and SQL Server infrastructure fetches failed. Returning empty dataset.");
                    return Enumerable.Empty<OuSalesPerformanceDto>();
                }
            }
        }
    }

    private async Task<IEnumerable<OuSalesPerformanceDto>> GetOracleSalesPerformanceAsync(string flagValue)
    {
        const string procedureName = "JAN_GET_OU_SALES_PERFORMANCE";

        var parameters = new OracleDynamicParameters();
        parameters.Add("p_stk_tfr_flg", OracleDbType.Varchar2, ParameterDirection.Input, flagValue, 1);
        parameters.Add("p_cursor", oracleDbType: OracleDbType.RefCursor, direction: ParameterDirection.Output);

        var flatRows = await _oracleService.QueryAsync<dynamic>(
            procedureName,
            parameters
        );

        return flatRows.Select(row => new OuSalesPerformanceDto
        {
            OuName = row.OU_NAME,
            LastYearMetrics = new FinancialYearData
            {
                SalesYtd = ToDecimal(row.PREV_FY_SALE_AS_ON),
                SalesThisMonth = ToDecimal(row.PREV_FY_SALE_CURRNT_MNTH),
                PendingOrdersYtd = ToDecimal(row.PREV_FY_PEND_AS_ON),
                PendingThisMonth = ToDecimal(row.PREV_FY_PEND_CURRNT_MNTH)
            },
            ThisYearMetrics = new FinancialYearData
            {
                SalesYtd = RowHasProperty(row, "CURR_FY_SALE_AS_ON") ? ToDecimal(row.CURR_FY_SALE_AS_ON) : 0m,
                SalesThisMonth = RowHasProperty(row, "CURR_FY_SALE_CURRNT_MNTH") ? ToDecimal(row.CURR_FY_SALE_CURRNT_MNTH) : 0m,
                PendingOrdersYtd = RowHasProperty(row, "CURR_FY_PEND_AS_ON") ? ToDecimal(row.CURR_FY_PEND_AS_ON) : 0m,
                PendingThisMonth = RowHasProperty(row, "CURR_FY_PEND_CURRNT_MNTH") ? ToDecimal(row.CURR_FY_PEND_CURRNT_MNTH) : 0m
            },
            InventoryAssetValue = ToDecimal(row.INV_AMT)
        });
    }

    private async Task<IEnumerable<OuSalesPerformanceDto>> GetSqlServerSalesPerformanceAsync(string flagValue)
    {
        const string sqlQuery = @"
            SELECT 
                OPERATING_UNIT,
                LAST_YEAR_SALES_YTD,
                LAST_YEAR_SALES_THIS_MONTH,
                THIS_YEAR_SALES_YTD,
                THIS_YEAR_SALES_THIS_MONTH,
                LAST_YEAR_PENDING_ORDERS_YTD,
                LAST_YEAR_PENDING_THIS_MONTH,
                THIS_YEAR_PENDING_ORDERS_YTD,
                THIS_YEAR_PENDING_THIS_MONTH,
                INVENTORY_ASSET_VALUE
            FROM Jan_MIS_SalesData
            WHERE STK_TFR_FLG = @StkTfrFlg";

        using var connection = new SqlConnection(_sqlServerConnectionString);
        var flatRows = await connection.QueryAsync<dynamic>(sqlQuery, new { StkTfrFlg = flagValue });

        return flatRows.Select(row => new OuSalesPerformanceDto
        {
            OuName = row.OPERATING_UNIT,
            LastYearMetrics = new FinancialYearData
            {
                SalesYtd = ToDecimal(row.LAST_YEAR_SALES_YTD),
                SalesThisMonth = ToDecimal(row.LAST_YEAR_SALES_THIS_MONTH),
                PendingOrdersYtd = ToDecimal(row.LAST_YEAR_PENDING_ORDERS_YTD),
                PendingThisMonth = ToDecimal(row.LAST_YEAR_PENDING_THIS_MONTH)
            },
            ThisYearMetrics = new FinancialYearData
            {
                SalesYtd = ToDecimal(row.THIS_YEAR_SALES_YTD),
                SalesThisMonth = ToDecimal(row.THIS_YEAR_SALES_THIS_MONTH),
                PendingOrdersYtd = ToDecimal(row.THIS_YEAR_PENDING_ORDERS_YTD),
                PendingThisMonth = ToDecimal(row.THIS_YEAR_PENDING_THIS_MONTH)
            },
            InventoryAssetValue = ToDecimal(row.INVENTORY_ASSET_VALUE)
        });
    }

    private static bool RowHasProperty(dynamic row, string propertyName)
    {
        if (row is IDictionary<string, object> dict)
        {
            return dict.ContainsKey(propertyName);
        }
        return row.GetType().GetProperty(propertyName) != null;
    }

    private static decimal ToDecimal(object? value)
    {
        if (value == null) return 0m;
        decimal rawValue = 0m;

        if (value is decimal decimalValue) rawValue = decimalValue;
        else if (value is double doubleValue) rawValue = Convert.ToDecimal(doubleValue);
        else if (value is float floatValue) rawValue = Convert.ToDecimal(floatValue);
        else if (value is int intValue) rawValue = intValue;
        else if (value is long longValue) rawValue = longValue;
        else if (value is string stringValue && decimal.TryParse(stringValue, out var parsedValue)) rawValue = parsedValue;

        decimal valueInCrores = rawValue / 10000000m;
        return Math.Round(valueInCrores, 2, MidpointRounding.AwayFromZero);
    }
}
