namespace Backend.Models;

public class OuSalesPerformanceDto
{
    public string OuName { get; set; } = string.Empty;
    public string Yr { get; set; } = string.Empty;
    public decimal SaleVal { get; set; }
    public decimal PendOrdVal { get; set; }
}
