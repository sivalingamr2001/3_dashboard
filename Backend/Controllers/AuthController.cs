using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequest loginRequest)
        {
            if (loginRequest == null)
            {
                return BadRequest("Invalid client request");
            }

            if (loginRequest.Email == "janatics" && loginRequest.Password == "jan@1977")
            {
                var successResponse = new
                {
                    Message = "Login successful",
                    IsAuthenticated = true,
                };

                return Ok(successResponse);
            }

            var failResponse = new
            {
                Message = "Invalid credentials",
                IsAuthenticated = false,
            };

            return Unauthorized(failResponse);
        }
    }
}
