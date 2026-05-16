import { FastifyInstance } from 'fastify';
import fp from '@fastify/env';

export const envSchema = {
  type: 'object',
  required: ['DB_USER', 'DB_PASSWORD', 'DB_CONNECT_STRING'],
  properties: {
    NODE_ENV:           { type: 'string', default: 'production' },
    PORT:               { type: 'integer', default: 3000 },
    HOST:               { type: 'string', default: '0.0.0.0' },
    DB_USER:            { type: 'string' },
    DB_PASSWORD:        { type: 'string' },
    DB_CONNECT_STRING:  { type: 'string' },
    DB_POOL_MIN:        { type: 'integer', default: 2 },
    DB_POOL_MAX:        { type: 'integer', default: 10 },
    DB_POOL_INCREMENT:  { type: 'integer', default: 1 },
    DB_POOL_TIMEOUT:    { type: 'integer', default: 60 },
  },
};

export async function registerEnv(app: FastifyInstance): Promise<void> {
  await app.register(fp, {
    schema: envSchema,
    dotenv: true,
  });
}

export interface Env {
  DB_CLIENT_DIR: any;
  NODE_ENV: string;
  PORT: number;
  HOST: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_CONNECT_STRING: string;
  DB_POOL_MIN: number;
  DB_POOL_MAX: number;
  DB_POOL_INCREMENT: number;
  DB_POOL_TIMEOUT: number;
}

declare module 'fastify' {
  interface FastifyInstance {
    config: Env;
  }
}
