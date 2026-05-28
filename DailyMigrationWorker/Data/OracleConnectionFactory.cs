// Data/OracleConnectionFactory.cs
using Oracle.ManagedDataAccess.Client;

namespace DailyMigrationWorker.Data;

public class OracleConnectionFactory
{
    private readonly string _cs;
    public OracleConnectionFactory(IConfiguration cfg)
        => _cs = cfg.GetConnectionString("OracleERP")
               ?? throw new InvalidOperationException("Missing OracleERP connection string.");

    public OracleConnection Create() => new(_cs);
}