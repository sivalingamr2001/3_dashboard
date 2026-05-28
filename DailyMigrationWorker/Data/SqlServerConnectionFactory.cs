// Data/SqlServerConnectionFactory.cs
using Microsoft.Data.SqlClient;

namespace DailyMigrationWorker.Data;

public class SqlServerConnectionFactory
{
    private readonly string _cs;
    public SqlServerConnectionFactory(IConfiguration cfg)
        => _cs = cfg.GetConnectionString("SqlServer")
               ?? throw new InvalidOperationException("Missing SqlServer connection string.");

    public SqlConnection Create() => new(_cs);
}