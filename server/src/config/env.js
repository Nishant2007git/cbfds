import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((val) => parseInt(val.trim(), 10)).default('3000'),
  API_VERSION: z.string().transform((val) => val.trim()).default('v1'),
  APP_URL: z.string().transform((val) => val.trim()).pipe(z.string().url()),
  FRONTEND_URL: z.string().transform((val) => val.trim()).pipe(z.string().url()),

  // MongoDB
  MONGODB_URI: z.string().transform((val) => val.trim()).pipe(z.string().url()),
  MONGODB_DB_NAME: z.string().transform((val) => val.trim()).default('cbfds'),

  // Redis (optional — mock queue used when not present)
  REDIS_HOST: z.string().optional().transform((val) => val ? val.trim() : 'localhost').default('localhost'),
  REDIS_PORT: z.string().transform((val) => parseInt(val.trim(), 10)).default('6379'),
  REDIS_PASSWORD: z.string().optional().nullable().transform((val) => val ? val.trim() : '').default(''),
  REDIS_URL: z.string().optional().transform((val) => val ? val.trim() : undefined),

  // JWT
  JWT_SECRET: z.string().min(32, { message: 'JWT_SECRET must be at least 32 characters long' }),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Storage
  STORAGE_PROVIDER: z.enum(['minio', 's3', 'azure', 'gcs']).default('minio'),
  STORAGE_BUCKET: z.string().default('cbfds-chunks'),

  // MinIO (optional — only when STORAGE_PROVIDER=minio)
  MINIO_ENDPOINT: z.string().optional().default('localhost'),
  MINIO_PORT: z.string().transform((val) => parseInt(val, 10)).optional().default('9000'),
  MINIO_ACCESS_KEY: z.string().optional().default('minioadmin'),
  MINIO_SECRET_KEY: z.string().optional().default('minioadmin'),
  MINIO_USE_SSL: z.string().transform((val) => val === 'true').optional().default('false'),

  // AWS S3 (optional — only when STORAGE_PROVIDER=s3)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional().default('eu-north-1'),

  // Email (optional — gracefully degrades without email)
  EMAIL_PROVIDER: z.enum(['smtp', 'sendgrid', 'ses']).default('smtp'),
  SMTP_HOST: z.string().optional().default('smtp.gmail.com'),
  SMTP_PORT: z.string().transform((val) => parseInt(val, 10)).optional().default('587'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  EMAIL_FROM: z.string().optional().default('noreply@cbfds.com'),

  // File Configuration limits
  MAX_FILE_SIZE: z.string().transform((val) => parseInt(val, 10)).default('5368709120'),
  DEFAULT_CHUNK_SIZE: z.string().transform((val) => parseInt(val, 10)).default('5242880'),
  DEFAULT_QUOTA: z.string().transform((val) => parseInt(val, 10)).default('10737418240'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform((val) => parseInt(val, 10)).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform((val) => parseInt(val, 10)).default('100'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'simple']).default('simple'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment validation failed:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
export default env;
