import { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (_req, reply) => {
    return reply.send({ status: 'ok', message: 'Server is running' });
  });

  app.get('/health', async (_req, reply) => {
    return reply.send({ status: 'ok' });
  });
}
