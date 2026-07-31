namespace Backend.OuDashboard.Models;
public class MisSnapshotRow
{
    public string OuName { get; set; } = string.Empty;
    public int SortBy { get; set; }
    public decimal LastYearSalesYtd { get; set; } = 0;
    public decimal LastYearSalesThisMonth { get; set; } = 0;
    public decimal ThisYearSalesYtd { get; set; } = 0;
    public decimal ThisYearSalesThisMonth { get; set; } = 0;
    public decimal LastYearPendingOrdersYtd { get; set; } = 0;
    public decimal LastYearPendingThisMonth { get; set; } = 0;
    public decimal ThisYearPendingOrdersYtd { get; set; } = 0;
    public decimal ThisYearPendingThisMonth { get; set; } = 0;
}
