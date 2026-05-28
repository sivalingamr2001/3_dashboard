using Microsoft.Data.SqlClient;

namespace Backend.OuDashboard.Data;

public class SqlServerConnectionFactory
{
    private readonly string _connectionString;

    public SqlServerConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("SqlServer")
            ?? throw new InvalidOperationException("SqlServer connection string is missing from appsettings.json");
    }

    public SqlConnection Create() => new(_connectionString);
}
