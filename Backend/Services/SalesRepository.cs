using Backend.DB;
using Backend.Interfaces;
using Backend.Models;
using System.Data;
using Dapper;
using Oracle.ManagedDataAccess.Client;

namespace Backend.Services;

public class OuSalesRepository : IOuSalesRepository
{
    private readonly IOracleService _oracleService;

    public OuSalesRepository(IOracleService oracleService)
    {
        _oracleService = oracleService ?? throw new ArgumentNullException(nameof(oracleService));
    }

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
        const string procedureName = "JAN_GET_OU_SALES_PERFORMANCE";

        var flagValue = string.IsNullOrWhiteSpace(stkTfrFlg) ? "Y" : stkTfrFlg;

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
                SalesYtd = ToDecimal(row.CURR_FY_SALE_AS_ON),

                SalesThisMonth = ToDecimal(row.CURR_FY_SALE_CURRNT_MNTH),

                PendingOrdersYtd = ToDecimal(row.CURR_FY_PEND_AS_ON),

                PendingThisMonth = ToDecimal(row.CURR_FY_PEND_CURRNT_MNTH)
            },

            InventoryAssetValue = ToDecimal(row.INV_AMT)
        });
    }

    private static decimal ToDecimal(object? value)
    {
        decimal rawValue = 0m;

        if (value is decimal decimalValue) rawValue = decimalValue;
        else if (value is double doubleValue) rawValue = Convert.ToDecimal(doubleValue);
        else if (value is float floatValue) rawValue = Convert.ToDecimal(floatValue);
        else if (value is int intValue) rawValue = intValue;
        else if (value is long longValue) rawValue = longValue;
        else if (value is string stringValue && decimal.TryParse(stringValue, out var parsedValue)) rawValue = parsedValue;

        // 1 Crore = 10,000,000. Divide to convert raw amount to Crores.
        decimal valueInCrores = rawValue / 10000000m;

        // Round to 2 decimal places for clean UI display (e.g., 102.71 instead of 1027107502.59)
        return Math.Round(valueInCrores, 2, MidpointRounding.AwayFromZero);
    }
}
