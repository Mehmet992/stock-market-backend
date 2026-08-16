import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 8080,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: process.env.ALLOWED_ORIGINS || '*',
  cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '10', 10),
  fetchIntervalSeconds: parseInt(process.env.FETCH_INTERVAL_SECONDS || '10', 10),
  alpacaApiKey: process.env.ALPACA_API_KEY || process.env.alpacaApiKey || '',
  alpacaSecretKey: process.env.ALPACA_SECRET_KEY || process.env.alpacaSecretKey || '',
  yahooProxyUrl: process.env.YAHOO_PROXY_URL || 'https://stock-market-worker.hacmehmet0117.workers.dev',
  appSecretKey: process.env.APP_SECRET_KEY || 'stock_market_app_secret_2026_secure_key',
};
