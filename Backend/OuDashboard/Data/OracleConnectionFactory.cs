using Backend.DB;
using Oracle.ManagedDataAccess.Client;
using System;

namespace Backend.OuDashboard.Data;

public class OracleConnectionFactory(IOracleService oracleService)
{
    private readonly string _cs = oracleService.GetConnectionString()
                                  ?? throw new InvalidOperationException("Oracle connection string is missing from the database service.");

    public OracleConnection Create() => new(_cs);
}
