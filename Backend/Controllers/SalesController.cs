using Backend.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OuSalesController : ControllerBase
{
    private readonly IOuSalesRepository _repository;

    public OuSalesController(IOuSalesRepository repository)
    {
        _repository = repository;
    }

    [HttpGet("performance")]
    public async Task<IActionResult> GetPerformance([FromQuery] string? stkTfrFlg = "Y")
    {
        try
        {
            var data = await _repository.GetSalesPerformanceAsync(stkTfrFlg);
            return Ok(data);
        }
        catch (Exception ex)
        {
            // Add your logger here
            return StatusCode(StatusCodes.Status500InternalServerError, "Error retrieving database records");
        }
    }
}
