using System.Text.Json.Serialization;

namespace Backend.Models;

public class OuSalesPerformanceDto
{
    [JsonPropertyName("operatingUnit")]
    public string OuName { get; set; } = string.Empty;

    [JsonPropertyName("lastYear")]
    public FinancialYearData LastYearMetrics { get; set; } = new();

    [JsonPropertyName("thisYear")]
    public FinancialYearData ThisYearMetrics { get; set; } = new();

    [JsonPropertyName("inventoryAssetValue")]
    public decimal InventoryAssetValue { get; set; }

    [JsonPropertyName("migratedAt")]
    public DateTime MigratedAt { get; set; }

    [JsonPropertyName("sortbyorder")]
    public int? SortByOrder { get; set; }
}

public class FinancialYearData
{
    [JsonPropertyName("salesYtd")]
    public decimal SalesYtd { get; set; }

    [JsonPropertyName("salesThisMonth")]
    public decimal SalesThisMonth { get; set; }

    [JsonPropertyName("pendingOrdersYtd")]
    public decimal PendingOrdersYtd { get; set; }

    [JsonPropertyName("pendingThisMonth")]
    public decimal PendingThisMonth { get; set; }
}
