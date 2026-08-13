import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 8080,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: process.env.ALLOWED_ORIGINS || '*',
  cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '30', 10),
  fetchIntervalSeconds: parseInt(process.env.FETCH_INTERVAL_SECONDS || '60', 10),
  alpacaApiKey: process.env.ALPACA_API_KEY || process.env.alpacaApiKey || '',
  alpacaSecretKey: process.env.ALPACA_SECRET_KEY || process.env.alpacaSecretKey || '',
  yahooProxyUrl: process.env.YAHOO_PROXY_URL || 'https://stock-market-worker.hacmehmet0117.workers.dev',
};
