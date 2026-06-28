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
  const missing: string[] = [];

  // Required secrets always
  missing.push(...requiredEnvVars.filter(v => !process.env[v]));

  // In production, require DATABASE_URL and frontend/cors settings
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'production') {
    if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
    // Allow either CORS_ORIGIN or FRONTEND_URL (we will derive origin from FRONTEND_URL)
    if (!process.env.CORS_ORIGIN && !process.env.FRONTEND_URL) missing.push('CORS_ORIGIN or FRONTEND_URL');
    if (!process.env.JWT_EXPIRES) missing.push('JWT_EXPIRES');
  } else {
    // For non-production, allow DATABASE_URL or individual PG_* vars
    if (!process.env.DATABASE_URL) {
      const missingDb = fallbackDbVars.filter(envVar => !process.env[envVar]);
      if (missingDb.length > 0) missing.push(...missingDb);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

export const env = {
  PORT: Number(process.env.PORT || 3001),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  JWT_EXPIRES: process.env.JWT_EXPIRES || '15m',
  DATABASE_URL: process.env.DATABASE_URL || '',
  FRONTEND_URL: process.env.FRONTEND_URL || '',
  // Normalize CORS origin: prefer explicit CORS_ORIGIN, otherwise derive origin from FRONTEND_URL
  CORS_ORIGIN: (() => {
    try {
      if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.trim()) {
        // strip any trailing path
        const url = new URL(process.env.CORS_ORIGIN);
        return url.origin;
      }
      if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.trim()) {
        const url = new URL(process.env.FRONTEND_URL);
        return url.origin;
      }
    } catch (err) {
      // fallback to raw env value if URL parse fails
      return process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '';
    }
    return '';
  })(),
};
