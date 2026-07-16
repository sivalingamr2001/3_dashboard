using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace Backend.OuDashboard.Data;

public class SqlServerConnectionFactory(IConfiguration configuration)
{
    // 1. Extract the connection string and validate it immediately during initialization
    private readonly string _cs = configuration.GetConnectionString("SqlServerConnection")
                                  ?? configuration.GetConnectionString("SqlServer")
                                  ?? throw new InvalidOperationException("SQL Server connection string is missing in configuration.");

    public SqlConnection Create()
    {
        var builder = new SqlConnectionStringBuilder(_cs);

        if (builder.ConnectRetryCount < 3)
        {
            builder.ConnectRetryCount = 3;
        }

        if (builder.ConnectRetryInterval < 5)
        {
            builder.ConnectRetryInterval = 5;
        }

        if (builder.ConnectTimeout < 60)
        {
            builder.ConnectTimeout = 60;
        }

        return new SqlConnection(builder.ConnectionString);
    }
}
