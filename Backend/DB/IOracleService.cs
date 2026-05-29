using System.Data;

namespace Backend.DB;

/// <summary>
/// Defines database operations for Oracle.
/// </summary>
public interface IOracleService
{
    string GetConnectionString();

    Task<IEnumerable<T>> QueryAsync<T>(string sql, object? parameters = null, CancellationToken ct = default);

    Task<IEnumerable<T>> QueryAsyncV2<T>(string sql, object param = null, CommandType? commandType = null);
}