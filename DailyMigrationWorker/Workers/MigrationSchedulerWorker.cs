// Workers/DashboardMigrationWorker.cs
using DailyMigrationWorker.Configuration;
using DailyMigrationWorker.Services;
using Microsoft.Extensions.Options;

namespace DailyMigrationWorker.Workers;

public class MigrationWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scope;
    private readonly MigrationSettings _cfg;
    private readonly ILogger<MigrationWorker> _log;

    public MigrationWorker(
        IServiceScopeFactory scopeFactory,
        IOptions<MigrationSettings> opts,
        ILogger<MigrationWorker> log)
    {
        _scope = scopeFactory;
        _cfg = opts.Value;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _log.LogInformation(
            "DailyMigrationWorker Worker started. Scheduled at {H:D2}:{M:D2} daily.",
            _cfg.ScheduleHour, _cfg.ScheduleMinute);

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
                _log.LogInformation("Worker cancelled during wait. Stopping.");
                break;
            }

            await RunWithRetryAsync(stoppingToken);
        }

        _log.LogInformation("DailyMigrationWorker Worker stopped.");
    }

    // ── Calculate exact delay to the next 06:00:00 ───────────────────────────
    private TimeSpan GetDelayUntilNextRun()
    {
        var now = DateTime.Now;
        var nextRun = new DateTime(
            now.Year, now.Month, now.Day,
            _cfg.ScheduleHour, _cfg.ScheduleMinute, 0);

        // Already past 6 AM today → target tomorrow
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
            "All {Max} attempts failed. Will retry at next 6 AM run.",
            _cfg.RetryCount);
    }
}