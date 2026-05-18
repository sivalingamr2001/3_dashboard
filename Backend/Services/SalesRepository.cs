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
        const string procedureName = "GET_OU_SALES_PERFORMANCE";

        // Default to 'Y' if null or empty
        var flagValue = string.IsNullOrWhiteSpace(stkTfrFlg) ? "Y" : stkTfrFlg;

        var parameters = new OracleDynamicParameters();

        // Add input parameter for stock transfer flag
        parameters.Add("p_stk_tfr_flg", OracleDbType.Varchar2, ParameterDirection.Input, flagValue, 1);
        parameters.Add("p_cursor", oracleDbType: OracleDbType.RefCursor, direction: ParameterDirection.Output);

        var flatRows = await _oracleService.QueryAsync<dynamic>(
            procedureName,
            parameters
        );

        return flatRows.Select(row => new OuSalesPerformanceDto
        {
            OuName = row.OU_NAME,
            MetricsFy2526 = new YearData
            {
                SalesAsOnDate = ToDecimal(row.FY_25_26_SALE_AS_ON),
                SalesCurrentMonth = ToDecimal(row.FY_25_26_SALE_CURRNT_MNTH),
                PendingAsOnDate = ToDecimal(row.FY_25_26_PEND_AS_ON),
                PendingCurrentMonth = ToDecimal(row.FY_25_26_PEND_CURRNT_MNTH)
            },
            MetricsFy2627 = new YearData
            {
                SalesAsOnDate = ToDecimal(row.FY_26_27_SALE_AS_ON),
                SalesCurrentMonth = ToDecimal(row.FY_26_27_SALE_CURRNT_MNTH),
                PendingAsOnDate = ToDecimal(row.FY_26_27_PEND_AS_ON),
                PendingCurrentMonth = ToDecimal(row.FY_26_27_PEND_CURRNT_MNTH)
            }
        });
    }

    private static decimal ToDecimal(object? value)
    {
        if (value is decimal decimalValue)
        {
            return decimalValue;
        }

        if (value is double doubleValue)
        {
            return Convert.ToDecimal(doubleValue);
        }

        if (value is float floatValue)
        {
            return Convert.ToDecimal(floatValue);
        }

        if (value is int intValue)
        {
            return intValue;
        }

        if (value is string stringValue && decimal.TryParse(stringValue, out var parsedValue))
        {
            return parsedValue;
        }

        return 0m;
    }
}
