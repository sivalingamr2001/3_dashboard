using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrderSalesController(IOrderSalesRepository repository) : ControllerBase
{
    [HttpGet("orders-trend")]
    public async Task<ActionResult<IEnumerable<OrderTrendDto>>> GetOrdersTrend([FromQuery] int? orgId, CancellationToken ct)
    {
        var data = await repository.GetOrdersTrendAsync(orgId, ct);
        return Ok(data);
    }

    [HttpGet("sales-trend")]
    public async Task<ActionResult<IEnumerable<SalesTrendDto>>> GetSalesTrend([FromQuery] int? orgId, CancellationToken ct)
    {
        var data = await repository.GetSalesTrendAsync(orgId, ct);
        return Ok(data);
    }

    [HttpGet("rolling-10d")]
    public async Task<ActionResult<IEnumerable<Rolling10dDto>>> GetRolling10d([FromQuery] int? orgId, CancellationToken ct)
    {
        var data = await repository.GetRolling10dAsync(orgId, ct);
        return Ok(data);
    }

    [HttpGet("ytd-cumulative")]
    public async Task<ActionResult<IEnumerable<YtdCumulativeDto>>> GetYtdCumulative([FromQuery] int? orgId, CancellationToken ct)
    {
        var data = await repository.GetYtdCumulativeAsync(orgId, ct);
        return Ok(data);
    }

    [HttpGet("operating-units")]
    public async Task<ActionResult<IEnumerable<OperatingUnitDto>>> GetOperatingUnits(CancellationToken ct)
    {
        var data = await repository.GetOperatingUnitsAsync(ct);
        return Ok(data);
    }
}

public record OrderTrendDto(
    int OrgId,
    string OuName,
    string FiscalYearPeriod,
    string Yrmn,
    string Mnyr,
    decimal OrderValue,
    DateTime MigratedAt
);

public record SalesTrendDto(
    int OrgId,
    string OuName,
    string FiscalYearPeriod,
    string Yrmn,
    string Mnyr,
    decimal SalesValue,
    DateTime MigratedAt
);

public class Rolling10dDto
{
    // 1. Add this parameterless constructor
    public Rolling10dDto() { }

    // Your existing properties
    public int OrgId { get; set; }
    public string OuName { get; set; }
    public string CalenderDay { get; set; }
    public decimal CySales { get; set; }
    public decimal PySales { get; set; }
    public DateTime MigratedAt { get; set; }
}

public record YtdCumulativeDto(
    int OrgId,
    string OuName,
    string FiscalYearPeriod,
    string Yrmn,
    string Mnyr,
    decimal MonthlySales,
    decimal CumulativeYtd,
    DateTime MigratedAt
);

public record OperatingUnitDto(int OrgId, string OuName);

public record DashboardKpisDto
{
    public decimal CurrentFyTotal { get; set; }
    public decimal PreviousFyTotal { get; set; }
    public decimal? GrowthPercent { get; set; }
}
