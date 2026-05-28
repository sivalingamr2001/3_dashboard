// Models/OuDashboardRecord.cs
using System.ComponentModel.DataAnnotations.Schema;

namespace DailyMigrationWorker.Models;

/// <summary>
/// One row per Operating Unit — mirrors dbo.OuDashboardSummary columns.
/// All monetary values are in INR (converted by Ou_Currency_Conv_Rate in Oracle).
/// </summary>
[Table("")]
public class OuDashboardRecord
{
    public string OperatingUnit { get; set; } = string.Empty;

    // Previous FY Sales (Apr prev-yr → Mar curr-yr)
    public decimal LastYearSalesYtd { get; set; }
    public decimal LastYearSalesThisMonth { get; set; }

    // Current FY Sales (Apr curr-yr → Yesterday)
    public decimal ThisYearSalesYtd { get; set; }
    public decimal ThisYearSalesThisMonth { get; set; }

    // Previous FY Pending Orders
    public decimal LastYearPendingOrdersYtd { get; set; }
    public decimal LastYearPendingThisMonth { get; set; }

    // Current FY Pending Orders
    public decimal ThisYearPendingOrdersYtd { get; set; }
    public decimal ThisYearPendingThisMonth { get; set; }

    // Inventory (Planning Asset Sub-Inventories)
    public decimal InventoryAssetValue { get; set; }

    // Set by .NET before insert
    public DateTime MigratedAt { get; set; } = DateTime.Now;
    public DateTime SnapshotDate { get; set; } = DateTime.Today;
}