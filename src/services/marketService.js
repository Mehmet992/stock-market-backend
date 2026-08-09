import NodeCache from 'node-cache';
import YahooFinance from 'yahoo-finance2';
import { SUPPORTED_ASSETS } from '../config/assets.js';
import { config } from '../config/env.js';

// Instantiate YahooFinance v3 client
const yahooFinance = new YahooFinance();

// Initialize in-memory cache (TTL in seconds)
const cache = new NodeCache({ stdTTL: config.cacheTtlSeconds, checkperiod: 5 });
const CACHE_KEY = 'ALL_MARKET_ASSETS';

/**
 * Utility to split array into smaller chunks
 */
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Delay execution for milliseconds
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Normalizes Yahoo Finance raw quote data into standardized MarketAsset format
 */
function normalizeQuote(quote, assetConfig) {
  const price = quote?.regularMarketPrice ?? quote?.price ?? 0.0;
  const change = quote?.regularMarketChange ?? quote?.change ?? 0.0;
  const changePercent = quote?.regularMarketChangePercent ?? quote?.changePercent ?? 0.0;
  const high = quote?.regularMarketDayHigh ?? quote?.dayHigh ?? price;
  const low = quote?.regularMarketDayLow ?? quote?.dayLow ?? price;
  const open = quote?.regularMarketOpen ?? quote?.open ?? price;
  const previousClose = quote?.regularMarketPreviousClose ?? quote?.previousClose ?? price;
  const volume = quote?.regularMarketVolume ?? quote?.volume ?? 0;

  return {
    symbol: assetConfig.symbol,
    displayName: assetConfig.displayName,
    type: assetConfig.type,
    exchange: assetConfig.exchange || quote?.fullExchangeName || 'UNKNOWN',
    price,
    change,
    changePercent,
    high,
    low,
    open,
    previousClose,
    volume,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Fetches latest quotes in chunked batches to avoid rate limits
 */
export async function fetchAllMarketData() {
  const CHUNK_SIZE = 10;
  const assetChunks = chunkArray(SUPPORTED_ASSETS, CHUNK_SIZE);
  const fetchedQuotesMap = new Map();

  for (const chunk of assetChunks) {
    try {
      const symbols = chunk.map((a) => a.symbol);
      const results = await yahooFinance.quote(symbols);
      const quotes = Array.isArray(results) ? results : [results];

      for (const quote of quotes) {
        if (quote && quote.symbol) {
          fetchedQuotesMap.set(quote.symbol.toUpperCase(), quote);
        }
      }
      // Small pause between chunks to respect rate limits
      await sleep(150);
    } catch (chunkError) {
      console.warn(`[MarketService] Chunk fetch warning:`, chunkError.message);
    }
  }

  const normalizedAssets = SUPPORTED_ASSETS.map((assetConfig) => {
    const quote = fetchedQuotesMap.get(assetConfig.symbol.toUpperCase());
    if (quote) {
      return normalizeQuote(quote, assetConfig);
    }
    // Return fallback state if quote was missing
    return {
      symbol: assetConfig.symbol,
      displayName: assetConfig.displayName,
      type: assetConfig.type,
      exchange: assetConfig.exchange || 'UNKNOWN',
      price: 0.0,
      change: 0.0,
      changePercent: 0.0,
      high: 0.0,
      low: 0.0,
      open: 0.0,
      previousClose: 0.0,
      volume: 0,
      lastUpdated: new Date().toISOString(),
    };
  });

  if (normalizedAssets.some((a) => a.price > 0)) {
    cache.set(CACHE_KEY, normalizedAssets);
  }

  return normalizedAssets;
}

/**
 * Gets cached asset list or triggers a fetch if cache is empty
 */
export async function getMarketAssets() {
  const cachedData = cache.get(CACHE_KEY);
  if (cachedData) {
    return cachedData;
  }
  return await fetchAllMarketData();
}

/**
 * Gets single asset by symbol
 */
export async function getAssetBySymbol(symbol) {
  const assets = await getMarketAssets();
  return assets.find((a) => a.symbol.toUpperCase() === symbol.toUpperCase()) || null;
}

/**
 * Starts background worker polling at specified interval
 */
export function startBackgroundWorker() {
  const intervalMs = config.fetchIntervalSeconds * 1000;
  console.log(`[BackgroundWorker] Started polling market data every ${config.fetchIntervalSeconds}s...`);

  // Immediate initial fetch
  fetchAllMarketData()
    .then((assets) => {
      const validCount = assets.filter((a) => a.price > 0).length;
      console.log(`[BackgroundWorker] Initialized cache with ${assets.length} assets (${validCount} active prices).`);
    })
    .catch((err) => {
      console.warn('[BackgroundWorker] Initial fetch warning:', err.message);
    });

  setInterval(async () => {
    try {
      const updated = await fetchAllMarketData();
      const validCount = updated.filter((a) => a.price > 0).length;
      console.log(`[BackgroundWorker] Updated ${updated.length} assets in cache (${validCount} active prices) at ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      console.error('[BackgroundWorker] Refresh failed:', err.message);
    }
  }, intervalMs);
}
