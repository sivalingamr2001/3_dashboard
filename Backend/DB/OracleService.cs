using ConnectionDll;
using Dapper;
using Oracle.ManagedDataAccess.Client;

namespace Backend.DB;

public class OracleService : IOracleService
{
    private readonly ILogger<OracleService> _logger;
    private readonly string _connectionString;

    public OracleService(ILogger<OracleService> logger)
    {
        _logger = logger;

        // 1. Get connection string from DLL
        var provider = new Class1();
        _connectionString = provider.oracon_prod_new.ConnectionString;

        if (string.IsNullOrWhiteSpace(_connectionString))
        {
            _logger.LogCritical("Oracle connection string is missing in ConnectionDll.");
        }
    }

    /// <summary>
    /// Creates a new Oracle connection instance.
    /// </summary>
    private OracleConnection CreateConnection()
    {
        return new OracleConnection(_connectionString);
    }

    public async Task<IEnumerable<T>> QueryAsync<T>(string sql, object? parameters = null, CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrEmpty(sql);

        try
        {
            using var connection = CreateConnection();
            var command = new CommandDefinition(sql, parameters, cancellationToken: ct);
            return await connection.QueryAsync<T>(command);
        }
        catch (OracleException ex)
        {
            _logger.LogError(ex, "Oracle Error {Num}: {Msg}. SQL: {SQL}", ex.Number, ex.Message, sql);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "General error in QueryAsync.");
            throw;
        }
    }
}
