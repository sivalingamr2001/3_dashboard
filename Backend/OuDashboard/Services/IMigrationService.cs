namespace Backend.OuDashboard.Services;

public interface IMigrationService
{
    Task<MigrationResult> ExecuteAsync(CancellationToken cancellationToken);
}

public record MigrationResult(bool Success, int RecordsMigrated, string? ErrorMessage = null);
