using Backend.OuDashboard.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text;

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

    [HttpGet("logs")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public ActionResult GetMigrationLogs()
    {
        try
        {
            // 1. Get the direct application deployment content root
            var contentRoot = AppDomain.CurrentDomain.BaseDirectory;

            // 2. Check the true location where Serilog creates relative logs on the server
            var logDirectory = Path.Combine(contentRoot, "bin", "logs", "MigrationLogs");

            // Fallback for custom host runner paths if the above directory layout is missing
            if (!Directory.Exists(logDirectory))
            {
                logDirectory = Path.Combine(Directory.GetCurrentDirectory(), "bin", "logs", "MigrationLogs");
            }

            if (!Directory.Exists(logDirectory))
            {
                return Ok(new { logs = $"Directory structure not found. Expected deployment path: {logDirectory}" });
            }

            var logFiles = Directory.GetFiles(logDirectory, "migration-*.log");
            if (logFiles.Length == 0)
            {
                return Ok(new { logs = $"Directory is empty. No files written in: {logDirectory}" });
            }

            Array.Sort(logFiles);
            var combinedContent = new StringBuilder();
            foreach (var file in logFiles)
            {
                combinedContent.AppendLine($"=== File: {Path.GetFileName(file)} ===");
                using (var stream = new FileStream(file, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                using (var reader = new StreamReader(stream))
                {
                    combinedContent.AppendLine(reader.ReadToEnd());
                }
                combinedContent.AppendLine();
            }

            return Ok(new { logs = combinedContent.ToString() });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, $"Error: {ex.Message}");
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
