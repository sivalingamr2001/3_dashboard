// Services/IDashboardMigrationService.cs
namespace Backend.OuDashboard.Services;

public interface IMigrationService
{
    Task<MigrationResult> ExecuteAsync(CancellationToken ct);
}

public record MigrationResult(bool Success, int RecordsMigrated, string? Error = null);