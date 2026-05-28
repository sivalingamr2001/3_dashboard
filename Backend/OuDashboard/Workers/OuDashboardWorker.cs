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
        if (!_cfg.Enabled)
        {
            _log.LogInformation("OU Dashboard migration worker is disabled. Exiting.");
            return;
        }

        _log.LogInformation(
            "OU Dashboard Worker started. Scheduled daily at {H:D2}:{M:D2}.",
            _cfg.ScheduleHour, _cfg.ScheduleMinute);

        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = GetDelayUntilNextRun();

            _log.LogInformation(
                "Next migration run in {H}h {M}m → at {At:yyyy-MM-dd HH:mm}",
                (int)delay.TotalHours, delay.Minutes, DateTime.Now.Add(delay));

            try
            {
                await Task.Delay(delay, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                _log.LogInformation("Worker cancelled during wait. Stopping.");
                break;
            }

            await RunWithRetryAsync(stoppingToken);
        }

        _log.LogInformation("OU Dashboard Worker stopped.");
    }

    // ── Calculate exact delay to the next scheduled run ─────────────────────
    private TimeSpan GetDelayUntilNextRun()
    {
        var now = DateTime.Now;
        var nextRun = new DateTime(
            now.Year, now.Month, now.Day,
            _cfg.ScheduleHour, _cfg.ScheduleMinute, 0);

        // Already past scheduled time today → target tomorrow
        if (now >= nextRun)
            nextRun = nextRun.AddDays(1);

        return nextRun - now;
    }

    // ── Retry wrapper ────────────────────────────────────────────────────────
    private async Task RunWithRetryAsync(CancellationToken ct)
    {
        for (int attempt = 1; attempt <= _cfg.RetryCount; attempt++)
        {
            _log.LogInformation("Attempt {A} of {Max}", attempt, _cfg.RetryCount);

            try
            {
                await using var scope = _scope.CreateAsyncScope();
                var svc = scope.ServiceProvider
                               .GetRequiredService<IMigrationService>();

                var result = await svc.ExecuteAsync(ct);

                if (result.Success)
                {
                    _log.LogInformation(
                        "Success on attempt {A}. Rows migrated: {Count}.",
                        attempt, result.RecordsMigrated);
                    return;
                }

                _log.LogWarning(
                    "Service returned failure on attempt {A}: {Err}",
                    attempt, result.ErrorMessage);
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Unhandled exception on attempt {A}.", attempt);
            }

            // Don't retry forever — wait before next attempt
            if (attempt < _cfg.RetryCount)
            {
                _log.LogInformation("Waiting {S} seconds before retry...", _cfg.RetryDelaySeconds);
                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(_cfg.RetryDelaySeconds), ct);
                }
                catch (OperationCanceledException)
                {
                    _log.LogWarning("Retry delay cancelled.");
                    break;
                }
            }
        }

        _log.LogError("Migration failed after {Count} attempts.", _cfg.RetryCount);
    }
}
