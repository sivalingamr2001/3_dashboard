import Fastify, { FastifyInstance, FastifyError } from 'fastify';
import cors from '@fastify/cors';
import { registerEnv } from './config/env';
import { initPool } from './db/pool';
import { salesRoutes } from './routes/sales.route';
import { healthRoutes } from './routes/health.route';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      serializers: {
        req(req) {
          return { method: req.method, url: req.url };
        },
      },
    },
    disableRequestLogging: false,
    trustProxy: true,
    ajv: {
      customOptions: {
        coerceTypes:   'array',
        useDefaults:   true,
        removeAdditional: true,
      },
    },
  });

  // 1. Environment Configuration Setup
  await registerEnv(app);

  // 2. CORS - Allow cross-origin requests from clients
  await app.register(cors, {
    origin: true, // In production, restrict to your explicit client domain strings
    credentials: true,
  });

  // 3. Oracle Connection Pool Initialization
  await initPool(app.config);
  app.log.info('Oracle connection pool ready');

  // 4. Global Error Handler with Type Safety Mapping
  app.setErrorHandler((err: FastifyError, _req, reply) => {
    const status = err.statusCode ?? 500;
    app.log.error({ err }, 'Request error caught by global handler');
    
    reply.status(status).send({
      success: false,
      error:   status >= 500 ? 'Internal server error' : err.message,
    });
  });

  // 5. API Core Routes Registration
  await app.register(healthRoutes);
  await app.register(salesRoutes, { prefix: '/api' });
  await app.register(salesRoutes, { prefix: '' });

  return app;
}

// Runnable Entrypoint Bootstrap Sequence
const startServer = async () => {
  try {
    const server = await buildApp();
    const port = Number(process.env.PORT) || 3000;
    
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Sales System Core API processing on http://localhost:${port}`);
  } catch (error) {
    console.error('Fatal initialization error:', error);
    process.exit(1);
  }
};

// Check if running directly via ts-node-dev target to boot automatically
if (require.main === module) {
  startServer();
}
