namespace Backend.OuDashboard.Configuration;

public class MigrationSettings
{
    public int ScheduleHour { get; set; } = 6;
    public int ScheduleMinute { get; set; } = 0;
    public string OraclePackageProcedure { get; set; } = "JAN_GET_OU_SALES_PERFORMANCE";
    public string SqlServerTargetTable { get; set; } = "dbo.Jan_MIS_SalesData";
    public int BatchSize { get; set; } = 500;
    public int RetryCount { get; set; } = 3;
    public int RetryDelaySeconds { get; set; } = 30;
    public bool Enabled { get; set; } = true;
}
