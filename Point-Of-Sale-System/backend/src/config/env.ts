import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET'
];

const fallbackDbVars = [
  'PGHOST',
  'PGPORT',
  'PGDATABASE',
  'PGUSER',
  'PGPASSWORD'
];

export function validateEnv() {
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (!process.env.DATABASE_URL) {
    const missingDb = fallbackDbVars.filter(envVar => !process.env[envVar]);
    if (missingDb.length > 0) {
      missing.push(...missingDb);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

export const env = {
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5000',
};
