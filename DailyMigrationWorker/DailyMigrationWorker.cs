using DailyMigrationWorker.Configuration;
using DailyMigrationWorker.Data;
using DailyMigrationWorker.Services;
using DailyMigrationWorker.Workers;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    Log.Information("Starting OU Dashboard Migration Worker...");

    var builder = Host.CreateApplicationBuilder(args);

    // Serilog from appsettings.json
    builder.Services.AddSerilog((services, lc) => lc
        .ReadFrom.Configuration(builder.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext());

    // Strongly-typed config
    builder.Services.Configure<MigrationSettings>(
        builder.Configuration.GetSection("MigrationSettings"));

    // DB factories — Singleton (stateless)
    builder.Services.AddSingleton<OracleConnectionFactory>();
    builder.Services.AddSingleton<SqlServerConnectionFactory>();

    // Migration service — Scoped (fresh connections per run via scope)
    builder.Services.AddScoped<IMigrationService, MigrationService>();

    // Background worker
    builder.Services.AddHostedService<MigrationWorker>();

    // Windows Service support
    builder.Services.AddWindowsService(options =>
        options.ServiceName = "Janatics OU Dashboard Migration");

    await builder.Build().RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Worker terminated unexpectedly.");
}
finally
{
    await Log.CloseAndFlushAsync();
}