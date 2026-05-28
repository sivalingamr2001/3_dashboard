// Configuration/MigrationSettings.cs
namespace DailyMigrationWorker.Configuration;

public class MigrationSettings
{
    public int ScheduleHour { get; set; } = 6;
    public int ScheduleMinute { get; set; } = 0;
    public string OraclePackageProcedure { get; set; } = string.Empty;
    public string SqlServerTargetTable { get; set; } = string.Empty;
    public int BatchSize { get; set; } = 500;
    public int RetryCount { get; set; } = 3;
    public int RetryDelaySeconds { get; set; } = 30;
}