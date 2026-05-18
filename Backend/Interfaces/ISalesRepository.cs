using Backend.Models;

namespace Backend.Interfaces;

public interface IOuSalesRepository
{
    Task<IEnumerable<OuSalesPerformanceDto>> GetSalesPerformanceAsync(string? stkTfrFlg = "Y");
}
