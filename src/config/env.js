import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 8080,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: process.env.ALLOWED_ORIGINS || '*',
  cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '15', 10),
  fetchIntervalSeconds: parseInt(process.env.FETCH_INTERVAL_SECONDS || '10', 10),
};
