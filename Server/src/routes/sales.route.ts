import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { fetchSales } from '../services/sales.service';

const querySchema = {
  type: 'object',
  properties: {
    fromDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    toDate:   { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    region:   { type: 'string', maxLength: 100 },
    limit:    { type: 'integer', minimum: 1, maximum: 1000, default: 50 },
    offset:   { type: 'integer', minimum: 0, default: 0 },
  },
  additionalProperties: false,
};

const responseSchema = {
  200: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      summary: {
        type: 'object',
        properties: {
          totalCount:  { type: 'integer' },
          totalAmount: { type: 'number' },
        },
      },
      data: { type: 'array' },
    },
  },
};

interface SalesQuery {
  fromDate?: string;
  toDate?:   string;
  region?:   string;
  limit:     number;
  offset:    number;
}

export async function salesRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: SalesQuery }>(
    '/sales',
    {
      schema: {
        querystring: querySchema,
        response:    responseSchema,
      },
    },
    async (req: FastifyRequest<{ Querystring: SalesQuery }>, reply: FastifyReply) => {
      const result = await fetchSales(req.query);
      return reply.send({ success: true, ...result });
    }
  );
}
