using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IConfiguration configuration) : ControllerBase
{
    private readonly string _connectionString = configuration.GetConnectionString("SqlServerConnection")
        ?? configuration.GetConnectionString("SqlServer")
        ?? "";

    [HttpGet("validate-card")]
    public async Task<IActionResult> ValidateCard([FromQuery] string cardNo)
    {
        if (string.IsNullOrWhiteSpace(cardNo))
        {
            return BadRequest(new { message = "Card number is required." });
        }

        string query = "SELECT COUNT(*) FROM jan_staff_master WHERE card_no = @CardNo";

        using (SqlConnection connection = new SqlConnection(_connectionString))
        {
            using (SqlCommand command = new SqlCommand(query, connection))
            {
                command.Parameters.AddWithValue("@CardNo", cardNo);

                await connection.OpenAsync();
                int userCount = (int)await command.ExecuteScalarAsync();

                if (userCount > 0)
                {
                    return Ok(new { isAuthenticated = true, message = "Access granted." });
                }
            }
        }

        return Unauthorized(new { isAuthenticated = false, message = "Invalid user number." });
    }
}
