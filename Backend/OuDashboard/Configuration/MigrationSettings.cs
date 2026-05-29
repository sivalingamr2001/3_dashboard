namespace Backend.OuDashboard.Configuration;

public class MigrationSettings
{
    public int    ScheduleHour        { get; set; } = 6;
    public int    ScheduleMinute      { get; set; } = 0;

    /// <summary>Oracle standalone procedure name (no package prefix needed).</summary>
    public string OracleProcedure     { get; set; } = "JAN_GET_OU_SALES_PERFORMANCE";

    public string SqlServerTargetTable { get; set; } = "dbo.Jan_MIS_SalesData";

    /// <summary>
    /// 'Y' = All OU (External + Internal with oa_flag filter) — default
    /// 'N' = External ONLY (STK_TFR_FLG='N', ORD_EMPT_STATUS='N')
    /// Controlled by appsettings — no code change needed to switch modes.
    /// </summary>
    public string StockTransferFlag   { get; set; } = "Y";

    public int    BatchSize           { get; set; } = 500;
    public int    RetryCount          { get; set; } = 3;
    public int    RetryDelaySeconds   { get; set; } = 30;
}