// Workers/DashboardMigrationWorker.cs
using Backend.OuDashboard.Configuration;
using Backend.OuDashboard.Services;
using Microsoft.Extensions.Options;

namespace Backend.OuDashboard.Workers;

public class OuDashboardWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scope;
    private readonly MigrationSettings _cfg;
    private readonly ILogger<OuDashboardWorker> _log;

    public OuDashboardWorker(
        IServiceScopeFactory scopeFactory,
        IOptions<MigrationSettings> opts,
        ILogger<OuDashboardWorker> log)
    {
        _scope = scopeFactory;
        _cfg = opts.Value;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _log.LogInformation(
            "OU Dashboard Worker started. Scheduled daily at {H:D2}:{M:D2}. Flag='{Flag}'.",
            _cfg.ScheduleHour, _cfg.ScheduleMinute, _cfg.StockTransferFlag);

        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = GetDelayUntilNextRun();

            _log.LogInformation(
                "Next run in {H}h {M}m → at {At:yyyy-MM-dd HH:mm}",
                (int)delay.TotalHours, delay.Minutes, DateTime.Now.Add(delay));

            try
            {
                await Task.Delay(delay, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                _log.LogWarning("Worker wait interrupted. Forcing retry execution before looping.");

                // Pass None so the retry method isn't immediately aborted by the shutdown signal
                await RunWithRetryAsync(CancellationToken.None);

                // Go back to the top of the loop to re-calculate the next daily run
                continue;
            }

            // Normal scheduled run
            await RunWithRetryAsync(stoppingToken);
        }

        _log.LogInformation("OU Dashboard Worker stopped.");
    }

    // ── Next 6:00:00 AM ──────────────────────────────────────────────────────
    private TimeSpan GetDelayUntilNextRun()
    {
        var now = DateTime.Now;
        var nextRun = new DateTime(
            now.Year, now.Month, now.Day,
            _cfg.ScheduleHour, _cfg.ScheduleMinute, 0);

        if (now >= nextRun)
            nextRun = nextRun.AddDays(1);

        return nextRun - now;
    }

    // ── Retry loop ───────────────────────────────────────────────────────────
    private async Task RunWithRetryAsync(CancellationToken ct)
    {
        for (int attempt = 1; attempt <= _cfg.RetryCount; attempt++)
        {
            _log.LogInformation(
                "Attempt {A}/{Max} — {Time}", attempt, _cfg.RetryCount, DateTime.Now);

            try
            {
                // Scoped service: new Oracle + SQL Server connections per run
                await using var scope = _scope.CreateAsyncScope();
                var svc = scope.ServiceProvider
                               .GetRequiredService<IMigrationService>();

                var result = await svc.ExecuteAsync(ct);

                if (result.Success)
                {
                    _log.LogInformation(
                        "Success on attempt {A}. Rows migrated: {Count}.",
                        attempt, result.RecordsMigrated);
                    return; // done — wait for next 6 AM
                }

                _log.LogWarning(
                    "Service reported failure on attempt {A}: {Err}",
                    attempt, result.Error);
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Unhandled exception on attempt {A}.", attempt);
            }

            if (attempt < _cfg.RetryCount)
            {
                _log.LogInformation(
                    "Waiting {Sec}s before retry...", _cfg.RetryDelaySeconds);
                await Task.Delay(
                    TimeSpan.FromSeconds(_cfg.RetryDelaySeconds), ct);
            }
        }

        _log.LogError(
            "All {Max} retry attempts failed. Will retry at next scheduled 6 AM run.",
            _cfg.RetryCount);
    }
}
