import mongoose from 'mongoose';
import { buildApp } from './app';
import { config } from './config/env';

async function start() {
  await mongoose.connect(config.MONGO_URI);
  console.log('Connected to MongoDB');

  const app = await buildApp();
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
  console.log(`ZeroVault backend running on port ${config.PORT}`);
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
