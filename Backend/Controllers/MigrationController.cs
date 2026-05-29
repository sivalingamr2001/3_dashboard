using Backend.OuDashboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

/// <summary>
/// API endpoint to manually trigger the OU Dashboard daily migration.
/// Useful for testing and on-demand synchronization.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class MigrationController : ControllerBase
{
    private readonly IMigrationService _migrationService;
    private readonly ILogger<MigrationController> _log;

    public MigrationController(IMigrationService migrationService, ILogger<MigrationController> log)
    {
        _migrationService = migrationService;
        _log = log;
    }

    /// <summary>
    /// Manually trigger the OU Dashboard migration (Oracle → SQL Server).
    /// Fetches the latest data from Oracle PKG_OU_DASHBOARD.GET_OU_SUMMARY
    /// and syncs to dbo.OuDashboardSummary in SQL Server.
    /// </summary>
    /// <remarks>
    /// This endpoint is useful for:
    /// - Immediate testing of the migration logic
    /// - Manual data refresh between scheduled runs (6 AM daily)
    /// - Debugging connection or data issues
    ///
    /// Response: { "success": true, "recordsMigrated": 42, "errorMessage": null }
    /// </remarks>
    [HttpPost("run")]
    [ProducesResponseType(typeof(MigrationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(MigrationResponse), StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<MigrationResponse>> RunMigration(CancellationToken cancellationToken)
    {
        try
        {
            _log.LogInformation("Manual migration triggered via API.");
            var result = await _migrationService.ExecuteAsync(cancellationToken);

            if (result.Success)
            {
                _log.LogInformation("Manual migration completed: {Count} rows migrated.", result.RecordsMigrated);
                return Ok(new MigrationResponse
                {
                    Success = true,
                    RecordsMigrated = result.RecordsMigrated,
                    ErrorMessage = null,
                    Timestamp = DateTime.UtcNow
                });
            }
            else
            {
                _log.LogWarning("Manual migration failed: {Error}", result.Error);
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new MigrationResponse
                    {
                        Success = false,
                        RecordsMigrated = 0,
                        ErrorMessage = result.Error,
                        Timestamp = DateTime.UtcNow
                    });
            }
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Unexpected error during manual migration.");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new MigrationResponse
                {
                    Success = false,
                    RecordsMigrated = 0,
                    ErrorMessage = ex.Message,
                    Timestamp = DateTime.UtcNow
                });
        }
    }
}

/// <summary>
/// Response model for migration API calls.
/// </summary>
public class MigrationResponse
{
    /// <summary>Whether the migration succeeded.</summary>
    public bool Success { get; set; }

    /// <summary>Number of rows migrated to SQL Server.</summary>
    public int RecordsMigrated { get; set; }

    /// <summary>Error message if migration failed; null if successful.</summary>
    public string? ErrorMessage { get; set; }

    /// <summary>Server timestamp of the response.</summary>
    public DateTime Timestamp { get; set; }
}
