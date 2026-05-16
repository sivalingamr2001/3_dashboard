import { buildApp } from "./app";
import { closePool } from "./db/pool";


let isShuttingDown = false;

async function start(): Promise<void> {
  const app = await buildApp();

  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    app.log.info({ signal }, 'Shutdown signal received');

    try {
      await app.close();
      await closePool();
      app.log.info('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    app.log.fatal({ err }, 'Uncaught exception');
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason) => {
    app.log.fatal({ reason }, 'Unhandled rejection');
    shutdown('unhandledRejection');
  });

  try {
    await app.listen({
      port: app.config.PORT,
      host: app.config.HOST,
    });
  } catch (err) {
    app.log.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

start();
