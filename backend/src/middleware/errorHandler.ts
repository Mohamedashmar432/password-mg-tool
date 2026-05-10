import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply): void {
  const statusCode = error.statusCode ?? 500;
  if (statusCode >= 500) {
    request.log.error(error);
    reply.status(500).send({ error: 'Internal server error' });
  } else {
    reply.status(statusCode).send({ error: error.message });
  }
}
