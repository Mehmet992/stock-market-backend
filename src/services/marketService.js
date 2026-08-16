import NodeCache from 'node-cache';
import { SUPPORTED_ASSETS } from '../config/assets.js';
import { config } from '../config/env.js';
import { fetchFromAlpaca } from './alpacaService.js';
import { fetchFromYahoo, shouldAttemptYahoo, tripYahooCircuit } from './yahooService.js';
import { fetchFromBigpara } from './bigparaService.js';

// Initialize in-memory cache (TTL in seconds)
const cache = new NodeCache({ stdTTL: config.cacheTtlSeconds, checkperiod: 5 });
const CACHE_KEY = 'ALL_MARKET_ASSETS';

/**
 * Executes Category-Based Multi-Tier API Fallback Routing:
 * 
 * 1. US Stocks & Cryptos: Alpaca (Primary) -> Yahoo Finance (Fallback) -> Stale Cache -> Server Error
 * 2. BIST Stocks & Forex: Yahoo Finance (Primary) -> Bigpara (Fallback) -> Stale Cache -> Server Error
 */
export async function fetchAllMarketData() {
  console.log('[MarketService] Initiating categorized market data fetch cycle...');

  // Partition target assets into the two core categories
  const usAndCryptoAssets = SUPPORTED_ASSETS.filter(
    (a) => (a.type === 'stock' && a.exchange !== 'BIST') || a.type === 'crypto'
  );
  const bistAndForexAssets = SUPPORTED_ASSETS.filter(
    (a) => a.exchange === 'BIST' || a.symbol.endsWith('.IS') || a.type === 'forex' || a.type === 'metal'
  );

  const staleCacheData = cache.get(CACHE_KEY) || [];
  const staleCacheMap = new Map(staleCacheData.map((a) => [a.symbol.toUpperCase(), a]));

  // =========================================================================
  // CATEGORY 1: US STOCKS & CRYPTOCURRENCIES (Alpaca 1st -> Yahoo 2nd -> Cache)
  // =========================================================================
  let usAndCryptoResults = [];

  // Attempt 1 (Primary): Alpaca Market API
  try {
    const alpacaData = await fetchFromAlpaca(usAndCryptoAssets);
    if (alpacaData.length > 0) {
      usAndCryptoResults = alpacaData;
      console.log(`[MarketService] US/Crypto: Fetched ${alpacaData.length}/${usAndCryptoAssets.length} quotes from Alpaca.`);
    }
  } catch (err) {
    console.warn(`[MarketService] US/Crypto Primary (Alpaca) failed: ${err.message}`);
  }

  // Attempt 2 (Fallback): Yahoo Finance for missing US/Crypto assets
  const fetchedUsCryptoSymbols = new Set(usAndCryptoResults.map((a) => a.symbol.toUpperCase()));
  const missingUsCryptoAssets = usAndCryptoAssets.filter(
    (a) => !fetchedUsCryptoSymbols.has(a.symbol.toUpperCase())
  );

  if (missingUsCryptoAssets.length > 0 && shouldAttemptYahoo()) {
    try {
      console.log(`[MarketService] US/Crypto: Falling back to Yahoo for ${missingUsCryptoAssets.length} missing quotes...`);
      const yahooFallbackData = await fetchFromYahoo(missingUsCryptoAssets, 'YAHOO_FALLBACK');
      usAndCryptoResults.push(...yahooFallbackData);
    } catch (err) {
      console.warn(`[MarketService] US/Crypto Fallback (Yahoo) failed: ${err.message}`);
      if (err.message?.includes('429') || err.status === 429) {
        tripYahooCircuit('Yahoo HTTP 429 Rate Limit during US/Crypto Fallback');
      }
    }
  }

  // Attempt 3 (Stale Cache / Server Error): Fill remaining missing US/Crypto assets
  const finalUsCryptoFetchedSymbols = new Set(usAndCryptoResults.map((a) => a.symbol.toUpperCase()));
  for (const assetConfig of usAndCryptoAssets) {
    const symbolKey = assetConfig.symbol.toUpperCase();
    if (!finalUsCryptoFetchedSymbols.has(symbolKey)) {
      if (staleCacheMap.has(symbolKey)) {
        const staleAsset = staleCacheMap.get(symbolKey);
        usAndCryptoResults.push({ ...staleAsset, source: 'STALE_CACHE' });
      } else {
        usAndCryptoResults.push({
          symbol: assetConfig.symbol,
          displayName: assetConfig.displayName,
          type: assetConfig.type,
          exchange: assetConfig.exchange || 'NASDAQ',
          currency: 'USD',
          price: 0.0,
          change: 0.0,
          changePercent: 0.0,
          high: 0.0,
          low: 0.0,
          open: 0.0,
          previousClose: 0.0,
          volume: 0,
          source: 'SERVER_ERROR',
          lastUpdated: new Date().toISOString(),
        });
      }
    }
  }

  // =========================================================================
  // CATEGORY 2: BIST STOCKS & FOREX PAIRS (Yahoo 1st -> Bigpara 2nd -> Cache)
  // =========================================================================
  let bistAndForexResults = [];

  // Attempt 1 (Primary): Yahoo Finance
  if (shouldAttemptYahoo()) {
    try {
      const yahooData = await fetchFromYahoo(bistAndForexAssets, 'YAHOO');
      if (yahooData.length > 0) {
        bistAndForexResults = yahooData;
        console.log(`[MarketService] BIST/Forex: Fetched ${yahooData.length}/${bistAndForexAssets.length} quotes from Yahoo Finance.`);
      }
    } catch (err) {
      console.warn(`[MarketService] BIST/Forex Primary (Yahoo) failed: ${err.message}`);
      if (err.message?.includes('429') || err.status === 429) {
        tripYahooCircuit('Yahoo HTTP 429 Rate Limit during BIST/Forex Primary');
      }
    }
  }

  // Attempt 2 (Fallback): Bigpara API for missing BIST/Forex assets
  const fetchedBistForexSymbols = new Set(bistAndForexResults.map((a) => a.symbol.toUpperCase()));
  const missingBistForexAssets = bistAndForexAssets.filter(
    (a) => !fetchedBistForexSymbols.has(a.symbol.toUpperCase())
  );

  if (missingBistForexAssets.length > 0) {
    try {
      console.log(`[MarketService] BIST/Forex: Falling back to Bigpara for ${missingBistForexAssets.length} missing quotes...`);
      const bigparaData = await fetchFromBigpara(missingBistForexAssets);
      bistAndForexResults.push(...bigparaData);
    } catch (err) {
      console.warn(`[MarketService] BIST/Forex Fallback (Bigpara) failed: ${err.message}`);
    }
  }

  // Attempt 3 (Stale Cache / Server Error): Fill remaining missing BIST/Forex assets
  const finalBistForexFetchedSymbols = new Set(bistAndForexResults.map((a) => a.symbol.toUpperCase()));
  for (const assetConfig of bistAndForexAssets) {
    const symbolKey = assetConfig.symbol.toUpperCase();
    if (!finalBistForexFetchedSymbols.has(symbolKey)) {
      if (staleCacheMap.has(symbolKey)) {
        const staleAsset = staleCacheMap.get(symbolKey);
        bistAndForexResults.push({ ...staleAsset, source: 'STALE_CACHE' });
      } else {
        bistAndForexResults.push({
          symbol: assetConfig.symbol,
          displayName: assetConfig.displayName,
          type: assetConfig.type,
          exchange: assetConfig.exchange || 'BIST',
          currency: assetConfig.symbol.endsWith('.IS') ? 'TRY' : 'USD',
          price: 0.0,
          change: 0.0,
          changePercent: 0.0,
          high: 0.0,
          low: 0.0,
          open: 0.0,
          previousClose: 0.0,
          volume: 0,
          source: 'SERVER_ERROR',
          lastUpdated: new Date().toISOString(),
        });
      }
    }
  }

  // =========================================================================
  // COMBINE RESULTS & UPDATE CACHE
  // =========================================================================
  const allResults = [...usAndCryptoResults, ...bistAndForexResults];

  // Store in-memory cache if we have valid non-error assets
  const validAssets = allResults.filter((a) => a.source !== 'SERVER_ERROR' && a.price > 0);
  if (validAssets.length > 0) {
    cache.set(CACHE_KEY, allResults);
  }

  const activeSources = [...new Set(allResults.map((a) => a.source))];
  console.log(`[MarketService] Completed fetch cycle. ${allResults.length} total assets (${validAssets.length} active). Sources: [${activeSources.join(', ')}]`);

  return allResults;
}

/**
 * Gets cached asset list or triggers a fetch if cache is empty
 */
export async function getMarketAssets() {
  const cachedData = cache.get(CACHE_KEY);
  if (cachedData && cachedData.length > 0) {
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
