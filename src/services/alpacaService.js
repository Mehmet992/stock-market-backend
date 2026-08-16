import { SUPPORTED_ASSETS } from '../config/assets.js';
import { config } from '../config/env.js';

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
 * Normalizes Alpaca Stock snapshot
 */
function normalizeAlpacaStockSnapshot(snapshot, assetConfig) {
  if (!snapshot) return null;

  const price = snapshot.latestTrade?.p ?? snapshot.dailyBar?.c ?? snapshot.prevDailyBar?.c ?? 0.0;
  const previousClose = snapshot.prevDailyBar?.c ?? price;
  const change = price - previousClose;
  const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0.0;

  return {
    symbol: assetConfig.symbol,
    displayName: assetConfig.displayName,
    type: assetConfig.type,
    exchange: assetConfig.exchange || 'NASDAQ',
    currency: 'USD',
    price,
    change,
    changePercent,
    high: snapshot.dailyBar?.h ?? price,
    low: snapshot.dailyBar?.l ?? price,
    open: snapshot.dailyBar?.o ?? price,
    previousClose,
    volume: snapshot.dailyBar?.v ?? 0,
    source: 'ALPACA',
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Normalizes Alpaca Crypto snapshot
 */
function normalizeAlpacaCryptoSnapshot(snapshot, assetConfig) {
  if (!snapshot) return null;

  // Calculate price from bid/ask orderbook mid-price or latest trade for real-time live tick resolution
  let price = snapshot.latestTrade?.p ?? 0.0;
  if (snapshot.latestQuote?.bp && snapshot.latestQuote?.ap) {
    const mid = (snapshot.latestQuote.bp + snapshot.latestQuote.ap) / 2;
    if (mid > 0) price = mid;
  }
  if (price === 0.0) {
    price = snapshot.dailyBar?.c ?? 0.0;
  }

  const previousClose = snapshot.prevDailyBar?.c ?? price;
  const change = price - previousClose;
  const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0.0;

  return {
    symbol: assetConfig.symbol,
    displayName: assetConfig.displayName,
    type: assetConfig.type,
    exchange: assetConfig.exchange || 'Crypto',
    currency: 'USD',
    price,
    change,
    changePercent,
    high: snapshot.dailyBar?.h ?? price,
    low: snapshot.dailyBar?.l ?? price,
    open: snapshot.dailyBar?.o ?? price,
    previousClose,
    volume: snapshot.dailyBar?.v ?? 0,
    source: 'ALPACA',
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Pulls market quotes from Alpaca Market API for US stocks and Cryptocurrencies
 * @param {Array} assetsToFetch List of target asset configs
 */
export async function fetchFromAlpaca(assetsToFetch = SUPPORTED_ASSETS) {
  if (!assetsToFetch || assetsToFetch.length === 0) return [];

  if (!config.alpacaApiKey || !config.alpacaSecretKey) {
    console.warn('[AlpacaService] WARNING: Alpaca API Keys are missing in environment!');
    return [];
  }

  const resultsMap = new Map();
  const CHUNK_SIZE = 20;

  const usStocks = assetsToFetch.filter((a) => a.type === 'stock' && a.exchange !== 'BIST');
  const cryptos = assetsToFetch.filter((a) => a.type === 'crypto');

  // 1. Fetch US Stocks from Alpaca IEX Snapshot feed
  if (usStocks.length > 0) {
    try {
      const chunkedUsStocks = chunkArray(usStocks, CHUNK_SIZE);

      for (const chunk of chunkedUsStocks) {
        const usStockSymbols = chunk.map((a) => a.symbol).join(',');
        const url = `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${usStockSymbols}&feed=iex`;

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
              const norm = normalizeAlpacaStockSnapshot(snapshot, asset);
              if (norm && norm.price > 0) {
                resultsMap.set(asset.symbol.toUpperCase(), norm);
              }
            }
          }
        } else {
          const errorText = await res.text();
          console.warn(`[AlpacaService] Alpaca Stock API returned HTTP ${res.status}: ${errorText}`);
        }
      }
    } catch (error) {
      console.warn('[AlpacaService] Alpaca Stock API Fetch Error:', error.message);
    }
  }

  // 2. Fetch Cryptocurrencies from Alpaca Crypto Snapshot feed
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
            const symbolKey = asset.symbol.replace('-', '/').toUpperCase();
            const snapshot = snapshots[symbolKey];
            if (snapshot) {
              const norm = normalizeAlpacaCryptoSnapshot(snapshot, asset);
              if (norm && norm.price > 0) {
                resultsMap.set(asset.symbol.toUpperCase(), norm);
              }
            }
          }
        } else {
          const errorText = await res.text();
          console.warn(`[AlpacaService] Alpaca Crypto API returned HTTP ${res.status}: ${errorText}`);
        }
      }
    } catch (error) {
      console.warn('[AlpacaService] Alpaca Crypto API Fetch Error:', error.message);
    }
  }

  return assetsToFetch
    .map((asset) => resultsMap.get(asset.symbol.toUpperCase()))
    .filter(Boolean);
}
