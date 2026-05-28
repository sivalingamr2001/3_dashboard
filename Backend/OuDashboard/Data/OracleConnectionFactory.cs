using Oracle.ManagedDataAccess.Client;

namespace Backend.OuDashboard.Data;

public class OracleConnectionFactory
{
    private readonly string _connectionString;

    public OracleConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("OracleERP")
            ?? throw new InvalidOperationException("OracleERP connection string is missing from appsettings.json");
    }

    public OracleConnection Create() => new(_connectionString);
}
