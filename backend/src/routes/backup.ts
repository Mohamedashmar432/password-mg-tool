import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate';
import { VaultMeta } from '../models/vaultMeta';
import { generateUploadSAS, generateDownloadSAS } from '../services/azureBlob';

export async function backupRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    '/backup/upload-token',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { sasUrl, blobPath } = generateUploadSAS(request.user.sub);
      return reply.send({ sasToken: sasUrl, blobUrl: sasUrl, blobPath });
    }
  );

  fastify.get(
    '/backup/download-token',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const meta = await VaultMeta.findOne({ user_id: request.user.sub });
      if (!meta?.has_backup) {
        return reply.status(404).send({ error: 'No backup found' });
      }
      const { sasUrl } = generateDownloadSAS(request.user.sub);
      return reply.send({ sasToken: sasUrl, blobUrl: sasUrl });
    }
  );

  fastify.post<{ Body: { blobPath: string } }>(
    '/backup/confirm',
    {
      preHandler: [authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['blobPath'],
          properties: {
            blobPath: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      await VaultMeta.findOneAndUpdate(
        { user_id: request.user.sub },
        {
          has_backup: true,
          last_backup_at: new Date(),
          blob_path: request.body.blobPath,
        },
        { upsert: true, new: true }
      );
      return reply.send({ ok: true });
    }
  );
}
