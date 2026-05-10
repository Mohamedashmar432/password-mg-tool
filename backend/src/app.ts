import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { config } from './config/env';
import { authRoutes } from './routes/auth';
import { vaultRoutes } from './routes/vault';
import { backupRoutes } from './routes/backup';
import { errorHandler } from './middleware/errorHandler';

export async function buildApp() {
  const app = Fastify({
    logger: config.NODE_ENV !== 'test',
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(jwt, {
    secret: config.JWT_SECRET,
  });

  app.setErrorHandler(errorHandler);

  await app.register(authRoutes);
  await app.register(vaultRoutes);
  await app.register(backupRoutes);

  return app;
}
