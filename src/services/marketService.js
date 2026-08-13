import NodeCache from 'node-cache';
import YahooFinance from 'yahoo-finance2';
import { SUPPORTED_ASSETS } from '../config/assets.js';
import { config } from '../config/env.js';

// Instantiate YahooFinance v3 client
const yahooFinance = new YahooFinance();

// Initialize in-memory cache (TTL in seconds)
const cache = new NodeCache({ stdTTL: config.cacheTtlSeconds, checkperiod: 5 });
const CACHE_KEY = 'ALL_MARKET_ASSETS';

//Circuit breaker state
let isYahooCircuitOpen = false;
let yahooCircuitResetTime = 0;
const CIRCUIT_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * Checks and updates the Circuit Breaker status
 */
function shouldAttemptYahoo() {
  if (!isYahooCircuitOpen) return true;

  if (Date.now() > yahooCircuitResetTime) {
    console.log('[MarketService] Circuit Breaker reset. Attempting Yahoo Finance again...');
    isYahooCircuitOpen = false;
    return true;
  }

  return false;
}

function tripYahooCircuit(reason) {
  isYahooCircuitOpen = true;
  yahooCircuitResetTime = Date.now() + CIRCUIT_COOLDOWN_MS;
  console.warn(`[MarketService] Tripping Yahoo Circuit Breaker! Reason: ${reason}. Cooling down for 5 mins.`);
}

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
function normalizeYahooQuote(quote, assetConfig) {
  const price = quote?.regularMarketPrice ?? quote?.price ?? 0.0;
  const change = quote?.regularMarketChange ?? quote?.change ?? 0.0;
  const changePercent = quote?.regularMarketChangePercent ?? quote?.changePercent ?? 0.0;
  const high = quote?.regularMarketDayHigh ?? quote?.dayHigh ?? price;
  const low = quote?.regularMarketDayLow ?? quote?.dayLow ?? price;
  const open = quote?.regularMarketOpen ?? quote?.open ?? price;
  const previousClose = quote?.regularMarketPreviousClose ?? quote?.previousClose ?? price;
  const volume = quote?.regularMarketVolume ?? quote?.volume ?? 0;
  const source = "YAHOO";

  return {
    symbol: assetConfig.symbol,
    displayName: assetConfig.displayName,
    type: assetConfig.type,
    exchange: assetConfig.exchange || quote?.fullExchangeName || 'UNKNOWN',
    currency: quote?.currency || (assetConfig.symbol.endsWith('.IS') ? 'TRY' : 'USD'),
    price,
    change,
    changePercent,
    high,
    low,
    open,
    previousClose,
    volume,
    source,
    lastUpdated: new Date().toISOString(),
  };
}

//Normalizing Alpaca quote according to assetConfig
function normalizeAlpacaStockSnapshot(snapshot, assetConfig) {
  if (!snapshot) return null;

  // Latest trade or price fallback from daily bar / prev daily bar
  const price = snapshot.latestTrade?.p ?? snapshot.dailyBar?.c ?? snapshot.prevDailyBar?.c ?? 0.0;
  const previousClose = snapshot.prevDailyBar?.c ?? price;
  const change = price - previousClose;
  const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0.0;

  return {
    symbol: assetConfig.symbol,
    displayName: assetConfig.displayName,
    type: assetConfig.type,
    exchange: assetConfig.exchange || 'IEX',
    currency: 'USD',
    price,
    change,
    changePercent,
    high: snapshot.dailyBar?.h ?? price,
    low: snapshot.dailyBar?.l ?? price,
    open: snapshot.dailyBar?.o ?? price,
    previousClose,
    volume: snapshot.dailyBar?.v ?? 0,
    source: 'ALPACA_FALLBACK',
    lastUpdated: new Date().toISOString(),
  };
}

function normalizeAlpacaCryptoSnapshot(snapshot, assetConfig) {
  if (!snapshot) return null;
  const price = snapshot.latestTrade?.p ?? snapshot.dailyBar?.c ?? 0.0;
  const previousClose = snapshot.prevDailyBar?.c ?? price;
  const change = price - previousClose;
  const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0.0;

  return {
    symbol: assetConfig.symbol,
    displayName: assetConfig.displayName,
    type: assetConfig.type,
    exchange: assetConfig.exchange,
    currency: 'USD',
    price,
    change,
    changePercent,
    high: snapshot.dailyBar?.h ?? price,
    low: snapshot.dailyBar?.l ?? price,
    open: snapshot.dailyBar?.o ?? price,
    previousClose,
    volume: snapshot.dailyBar?.v ?? 0,
    source: 'ALPACA_CRYPTO_FALLBACK',
    lastUpdated: new Date().toISOString(),
  };
}

//The function that pulls the information from Yahoo Finance endpoint
async function fetchFromYahoo() {
  const CHUNK_SIZE = 10;
  const assetChunks = chunkArray(SUPPORTED_ASSETS, CHUNK_SIZE);
  const fetchedQuotesMap = new Map();

  for (const chunk of assetChunks) {
    const symbols = chunk.map((a) => a.symbol);
    const results = await yahooFinance.quote(symbols);
    const quotes = Array.isArray(results) ? results : [results];

    for (const quote of quotes) {
      if (quote?.symbol) {
        fetchedQuotesMap.set(quote.symbol.toUpperCase(), quote);
      }
    }
    await sleep(150);
  }

  //Normalizes all the quotes and return the list
  return SUPPORTED_ASSETS.map((assetConfig) => {
    const quote = fetchedQuotesMap.get(assetConfig.symbol.toUpperCase());
    return quote ? normalizeYahooQuote(quote, assetConfig) : null;
  }).filter(Boolean);
}

//The function that pulls the information from Alpaca
async function fetchFromAlpaca() {
  console.log('[MarketService] Routing request through Alpaca Fallback API...');
  const resultsMap = new Map();
  const CHUNK_SIZE = 20;

  const usStocks = SUPPORTED_ASSETS.filter((a) => a.type === 'stock' && a.exchange !== 'BIST');
  const cryptos = SUPPORTED_ASSETS.filter((a) => a.type === 'crypto');

  //Fetch US stocks in chunks
  if (usStocks.length > 0) {
    try {
      const chunkedUsStocks = chunkArray(usStocks, CHUNK_SIZE);

      for (const chunk of chunkedUsStocks) {
        const usStockSymbols = chunk.map((a) => a.symbol).join(',');
        const url = `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${encodeURIComponent(usStockSymbols)}`;

        const res = await fetch(url, {
          headers: {
            'APCA-API-KEY-ID': config.alpacaApiKey,
            'APCA-API-SECRET-KEY': config.alpacaSecretKey,
          },
        });

        if (res.ok) {
          const stockData = await res.json();
          for (const asset of chunk) {
            const snapshot = stockData[asset.symbol.toUpperCase()];
            if (snapshot) {
              resultsMap.set(asset.symbol.toUpperCase(), normalizeAlpacaStockSnapshot(snapshot, asset));
            }
          }
        }
      }
    } catch (error) {
      console.warn('[MarketService] Alpaca US Stock Fallback Error:', error.message);
    }
  }

  if (cryptos.length > 0) {
    try {
      const chunkedCryptos = chunkArray(cryptos, CHUNK_SIZE);

      for (const chunk of chunkedCryptos) {
        const cryptoSymbols = chunk.map((a) => a.symbol.replace('-', '/')).join(',');
        const url = `https://data.alpaca.markets/v1beta3/crypto/us/snapshots?symbols=${encodeURIComponent(cryptoSymbols)}`;

        const res = await fetch(url, {
          headers: {
            'APCA-API-KEY-ID': config.alpacaApiKey,
            'APCA-API-SECRET-KEY': config.alpacaSecretKey,
          },
        });

        if (res.ok) {
          const cryptoData = await res.json();
          const snapshots = cryptoData.snapshots || {};

          for (const asset of chunk) {
            const symbol = asset.symbol.replace('-', '/').toUpperCase();
            const snapshot = snapshots[symbol];
            if (snapshot) {
              resultsMap.set(asset.symbol.toUpperCase(), normalizeAlpacaCryptoSnapshot(snapshot, asset));
            }
          }
        }
      }

    } catch (error) {
      console.warn("[MarketService] Error Loading Alpaca Crypto Assets: ", error.message);
    }
  }

  const cachedData = cache.get(CACHE_KEY) || [];
  const cachedMap = new Map(cachedData.map((a) => [a.symbol.toUpperCase(), a]));

  return SUPPORTED_ASSETS.map((assetConfig) => {
    const symbolKey = assetConfig.symbol.toUpperCase();

    // Priority A: Fresh Alpaca fallback data
    if (resultsMap.has(symbolKey)) {
      return resultsMap.get(symbolKey);
    }

    // Priority B: Stale Cache (preserves BIST/Forex/Metals prices during Yahoo downtime)
    if (cachedMap.has(symbolKey)) {
      const staleAsset = cachedMap.get(symbolKey);
      return { ...staleAsset, source: 'STALE_CACHE' };
    }

    // Priority C: Zeroed fallback state
    return {
      symbol: assetConfig.symbol,
      displayName: assetConfig.displayName,
      type: assetConfig.type,
      exchange: assetConfig.exchange,
      currency: assetConfig.symbol.endsWith('.IS') ? 'TRY' : 'USD',
      price: 0.0,
      change: 0.0,
      changePercent: 0.0,
      high: 0.0,
      low: 0.0,
      open: 0.0,
      previousClose: 0.0,
      volume: 0,
      source: 'NONE',
      lastUpdated: new Date().toISOString(),
    };
  });
}





/**
 * Fetches latest quotes in chunked batches to avoid rate limits
 */
export async function fetchAllMarketData() {
  let assets = [];

  //1. Attempt: Attempt to fetch from Yahoo Finance
  if (shouldAttemptYahoo()) {
    try {
      assets = await fetchFromYahoo();
      if (assets.length > 0) {
        cache.set(CACHE_KEY, assets);
        return assets;
      }
    } catch (error) {
      const status = error.status || error.statusCode || error.response?.status;
      const message = error.message || "";

      if (status === 429 || status === 403 || status === 401 || message.includes("429")) {
        tripYahooCircuit(`Received HTTP ${status || 429} Rate Limit/Block from Yahoo`);
      } else {
        console.warn(`[MarketService] Yahoo fetch failed: ${message}, attempting fallback ...`)
      }
    }
  }

  //2. Attempt: Attempt to fetch from Alpaca
  try {
    assets = await fetchFromAlpaca();
    if (assets.length > 0) {
      cache.set(CACHE_KEY, assets);
      return assets;
    }
  } catch (error) {
    console.error("[MarketService] Alpaca fallback failed:", error.message)
  }

  //3. Attempt: Return the existing cache
  const staleCache = cache.get(CACHE_KEY);
  if (staleCache) {
    console.warn('[MarketService] Serving stale cache data due to provider failures.');
    return staleCache;
  }

  //4. Attempt : Ultimate Fallback (If no cache exists at startup and both providers fail)
  return SUPPORTED_ASSETS.map((asset) => ({
    symbol: asset.symbol,
    displayName: asset.displayName,
    type: asset.type,
    exchange: asset.exchange || 'UNKNOWN',
    price: 0.0,
    change: 0.0,
    changePercent: 0.0,
    high: 0.0,
    low: 0.0,
    open: 0.0,
    previousClose: 0.0,
    volume: 0,
    source: 'NONE',
    lastUpdated: new Date().toISOString(),
  }));
  /*
  const CHUNK_SIZE = 10;
  const assetChunks = chunkArray(SUPPORTED_ASSETS, CHUNK_SIZE);
  const fetchedQuotesMap = new Map();

  for (const chunk of assetChunks) {
    try {
      const symbols = chunk.map((a) => a.symbol);
      const results = await yahooFinance.quote(symbols); //Makes the API calls
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
      return normalizeYahooQuote(quote, assetConfig);
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
  */
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
