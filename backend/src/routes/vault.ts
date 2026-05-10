import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate';
import { VaultMeta } from '../models/vaultMeta';

export async function vaultRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/vault/metadata',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const meta = await VaultMeta.findOne({ user_id: request.user.sub });
      if (!meta) {
        return reply.send({ has_backup: false, last_backup_at: null });
      }
      return reply.send({
        has_backup: meta.has_backup,
        last_backup_at: meta.last_backup_at?.toISOString() ?? null,
      });
    }
  );
}
