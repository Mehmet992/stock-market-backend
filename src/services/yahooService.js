import YahooFinance from 'yahoo-finance2';
import { SUPPORTED_ASSETS } from '../config/assets.js';
import { config } from '../config/env.js';

// Instantiate YahooFinance v3 client
const yahooFinance = new YahooFinance();

// Circuit breaker state for Yahoo Finance
let isYahooCircuitOpen = false;
let yahooCircuitResetTime = 0;
const CIRCUIT_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes cooldown when rate limited

/**
 * Checks and updates the Circuit Breaker status for Yahoo Finance
 */
export function shouldAttemptYahoo() {
  if (!isYahooCircuitOpen) return true;

  if (Date.now() > yahooCircuitResetTime) {
    console.log('[YahooService] Circuit Breaker reset. Attempting Yahoo Finance again...');
    isYahooCircuitOpen = false;
    return true;
  }

  return false;
}

/**
 * Trips Yahoo Circuit Breaker upon rate limit / 429 errors
 */
export function tripYahooCircuit(reason) {
  isYahooCircuitOpen = true;
  yahooCircuitResetTime = Date.now() + CIRCUIT_COOLDOWN_MS;
  console.warn(`[YahooService] Tripping Yahoo Circuit Breaker! Reason: ${reason}. Cooling down for 10 mins.`);
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
function normalizeYahooQuote(quote, assetConfig, overrideSource = 'YAHOO') {
  const price = quote?.regularMarketPrice ?? quote?.price ?? 0.0;
  const change = quote?.regularMarketChange ?? quote?.change ?? 0.0;
  const changePercent = quote?.regularMarketChangePercent ?? quote?.changePercent ?? 0.0;
  const high = quote?.regularMarketDayHigh ?? quote?.dayHigh ?? price;
  const low = quote?.regularMarketDayLow ?? quote?.dayLow ?? price;
  const open = quote?.regularMarketOpen ?? quote?.open ?? price;
  const previousClose = quote?.regularMarketPreviousClose ?? quote?.previousClose ?? price;

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
    volume: quote?.regularMarketVolume ?? quote?.volume ?? 0,
    source: overrideSource,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Pulls market quotes from Yahoo Finance
 * @param {Array} assetsToFetch List of target asset configs
 * @param {String} sourceLabel Custom source tag (e.g. 'YAHOO' or 'YAHOO_FALLBACK')
 */
export async function fetchFromYahoo(assetsToFetch = SUPPORTED_ASSETS, sourceLabel = 'YAHOO') {
  if (!assetsToFetch || assetsToFetch.length === 0) return [];

  const CHUNK_SIZE = 30;
  const assetChunks = chunkArray(assetsToFetch, CHUNK_SIZE);
  const fetchedQuotesMap = new Map();

  for (const chunk of assetChunks) {
    const symbols = chunk.map((a) => a.symbol);

    if (config.yahooProxyUrl) {
      try {
        const baseUrl = config.yahooProxyUrl.replace(/\/$/, '');
        const url = `${baseUrl}/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          const quotes = json?.quoteResponse?.result || [];
          for (const quote of quotes) {
            if (quote?.symbol) {
              fetchedQuotesMap.set(quote.symbol.toUpperCase(), quote);
            }
          }
        } else {
          console.warn(`[YahooService] Cloudflare Worker proxy returned HTTP ${res.status}`);
        }
      } catch (proxyErr) {
        console.warn(`[YahooService] Cloudflare Worker fetch warning:`, proxyErr.message);
      }
    } else {
      try {
        const results = await yahooFinance.quote(symbols);
        const quotes = Array.isArray(results) ? results : [results];

        for (const quote of quotes) {
          if (quote?.symbol) {
            fetchedQuotesMap.set(quote.symbol.toUpperCase(), quote);
          }
        }
      } catch (err) {
        console.warn(`[YahooService] Yahoo finance library error:`, err.message);
        throw err;
      }
    }
    await sleep(150);
  }

  return assetsToFetch
    .map((assetConfig) => {
      const quote = fetchedQuotesMap.get(assetConfig.symbol.toUpperCase());
      return quote ? normalizeYahooQuote(quote, assetConfig, sourceLabel) : null;
    })
    .filter(Boolean);
}
