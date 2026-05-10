import 'dotenv/config';

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

export const config = {
  MONGO_URI: requireEnv('MONGO_URI'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  AZURE_ACCOUNT_NAME: process.env['AZURE_ACCOUNT_NAME'] ?? '',
  AZURE_ACCOUNT_KEY: process.env['AZURE_ACCOUNT_KEY'] ?? '',
  AZURE_CONTAINER: process.env['AZURE_CONTAINER'] ?? 'vault-backups',
  PORT: parseInt(process.env['PORT'] ?? '3000', 10),
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',
};
