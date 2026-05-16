namespace Backend.DB;

/// <summary>
/// Defines database operations for Oracle.
/// </summary>
public interface IOracleService
{

    Task<IEnumerable<T>> QueryAsync<T>(string sql, object? parameters = null, CancellationToken ct = default);
}