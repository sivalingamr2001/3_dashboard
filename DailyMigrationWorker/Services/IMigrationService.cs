// Services/IDashboardMigrationService.cs
namespace DailyMigrationWorker.Services;

public interface IMigrationService
{
    Task<MigrationResult> ExecuteAsync(CancellationToken ct);
}

public record MigrationResult(bool Success, int RecordsMigrated, string? Error = null);