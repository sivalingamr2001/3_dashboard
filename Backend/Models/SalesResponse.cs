using System.Text.Json.Serialization;

namespace Backend.Models;

// Main structure returned to your frontend
public class OuSalesPerformanceDto
{
    [JsonPropertyName("operatingUnit")]
    public string OuName { get; set; } = string.Empty;

    [JsonPropertyName("financialYear2526")]
    public YearData MetricsFy2526 { get; set; } = new();

    [JsonPropertyName("financialYear2627")]
    public YearData MetricsFy2627 { get; set; } = new();
}

// Sub-model to break down data logically inside each year
public class YearData
{
    [JsonPropertyName("salesAsOnDate")]
    public decimal SalesAsOnDate { get; set; }

    [JsonPropertyName("salesCurrentMonth")]
    public decimal SalesCurrentMonth { get; set; }

    [JsonPropertyName("pendingAsOnDate")]
    public decimal PendingAsOnDate { get; set; }

    [JsonPropertyName("pendingCurrentMonth")]
    public decimal PendingCurrentMonth { get; set; }
}
