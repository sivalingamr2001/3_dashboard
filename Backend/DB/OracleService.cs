using ConnectionDll;
using Dapper;
using Oracle.ManagedDataAccess.Client;
using System.Data;

namespace Backend.DB;

public class OracleService : IOracleService
{
    private readonly ILogger<OracleService> _logger;
    private readonly string _connectionString;
    private readonly Class1 _oracleProvider;

    public OracleService(ILogger<OracleService> logger)
    {
        _logger = logger;

        // 1. Get connection string from DLL
        _oracleProvider = new Class1();
        _connectionString = _oracleProvider.oracon.ConnectionString;

        if (string.IsNullOrWhiteSpace(_connectionString))
        {
            _logger.LogCritical("Oracle connection string is missing in ConnectionDll.");
            throw new InvalidOperationException("Failed to initialize Oracle service: Connection string is blank.");
        }
    }

    /// <summary>
    /// Creates a new Oracle connection instance.
    /// </summary>
    private OracleConnection CreateConnection()
    {
        return new OracleConnection(_connectionString);
    }

    public string GetConnectionString()
    {
        return _connectionString;
    }

    public async Task<IEnumerable<T>> QueryAsync<T>(string sql, object? parameters = null, CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrEmpty(sql);

        try
        {
            using var connection = CreateConnection();

            var command = new CommandDefinition(
                sql,
                parameters,
                commandTimeout: 60,
                cancellationToken: ct
            );

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

    public async Task<IEnumerable<T>> QueryAsyncV2<T>(string sql, object? param = null, CommandType? commandType = null)
    {
        using var connection = CreateConnection();
        return await connection.QueryAsync<T>(sql, param, commandType: commandType);
    }
}
