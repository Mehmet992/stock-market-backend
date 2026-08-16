/**
 * Bigpara (Hürriyet Bigpara) Market Data Service
 * Serves as secondary fallback API for BIST Turkish Stocks (.IS) and TRY Forex pairs.
 */

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
 * Normalizes symbol for Bigpara requests (e.g., 'THYAO.IS' -> 'THYAO', 'USDTRY=X' -> 'USDTRY', 'GC=F' -> 'GC')
 */
function cleanSymbolForBigpara(symbol) {
  if (!symbol) return '';
  return symbol.toUpperCase().replace('.IS', '').replace('-USD', 'USD').replace('=X', '').replace('=F', '');
}

/**
 * Normalizes raw Bigpara payload (`current` object from trade chart API) into MarketAsset format
 */
function normalizeBigparaQuote(cur, assetConfig, sourceLabel = 'BIGPARA') {
  if (!cur) return null;

  const parseNum = (val) => {
    if (val === null || val === undefined) return 0.0;
    if (typeof val === 'number') return val;
    const str = val.toString().replace(/\./g, '').replace(',', '.');
    return parseFloat(str) || 0.0;
  };

  const price = parseNum(cur.c || cur.last || cur.fiyat);
  const previousClose = parseNum(cur.yc || cur.previousClose || cur.oncekikapanis || price);
  const change = parseNum(cur.ch || cur.change) || (price - previousClose);
  const changePercent = parseNum(cur.badp || cur.p || cur.changePercent) || (previousClose > 0 ? (change / previousClose) * 100 : 0.0);

  return {
    symbol: assetConfig.symbol,
    displayName: assetConfig.displayName,
    type: assetConfig.type,
    exchange: assetConfig.exchange || 'BIST',
    currency: assetConfig.symbol.endsWith('.IS') ? 'TRY' : (cur.c > 10 ? 'TRY' : 'USD'),
    price,
    change,
    changePercent,
    high: parseNum(cur.h || cur.high || price),
    low: parseNum(cur.l || cur.low || price),
    open: parseNum(cur.o || cur.open || price),
    previousClose,
    volume: parseNum(cur.tv || cur.volume || 0),
    source: sourceLabel,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Fetches market data for BIST stocks and Forex pairs from Bigpara Live Trade API
 * @param {Array} assets - List of asset config objects to fetch
 * @param {String} sourceLabel - Custom source tag ('BIGPARA' or 'BIGPARA_FALLBACK')
 * @returns {Promise<Array>} List of normalized MarketAsset objects
 */
export async function fetchFromBigpara(assets, sourceLabel = 'BIGPARA') {
  if (!assets || assets.length === 0) return [];

  console.log(`[BigparaService] Fetching ${assets.length} BIST/Forex assets from Bigpara Live Trade API...`);
  const CHUNK_SIZE = 10;
  const assetChunks = chunkArray(assets, CHUNK_SIZE);
  const resultsMap = new Map();

  for (const chunk of assetChunks) {
    try {
      const cleanSymbolsMap = new Map();
      for (const asset of chunk) {
        const cleanSym = cleanSymbolForBigpara(asset.symbol);
        cleanSymbolsMap.set(cleanSym, asset);
      }

      const symbolsParam = Array.from(cleanSymbolsMap.keys()).join(',');
      const url = `https://api-bigpara.hurriyet.com.tr/api/trade/chart/daily/1h/last/24?symbols=${encodeURIComponent(symbolsParam)}`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://bigpara.hurriyet.com.tr/',
          'Origin': 'https://bigpara.hurriyet.com.tr',
        },
        signal: AbortSignal.timeout(5000), // 5s timeout per chunk
      });

      if (res.ok) {
        const json = await res.json();
        const dataList = json?.data || [];

        for (const item of dataList) {
          const cur = item?.current;
          if (cur && cur.s) {
            const returnedSymbol = cur.s.toUpperCase();
            const assetConfig = cleanSymbolsMap.get(returnedSymbol);

            if (assetConfig) {
              const normalized = normalizeBigparaQuote(cur, assetConfig, sourceLabel);
              if (normalized && normalized.price > 0) {
                resultsMap.set(assetConfig.symbol.toUpperCase(), normalized);
              }
            }
          }
        }
      } else {
        console.warn(`[BigparaService] Bigpara HTTP ${res.status} for chunk [${symbolsParam}]`);
      }
    } catch (err) {
      console.warn(`[BigparaService] Error fetching chunk from Bigpara: ${err.message}`);
    }
  }

  return assets
    .map((assetConfig) => {
      const symbolKey = assetConfig.symbol.toUpperCase();
      if (resultsMap.has(symbolKey)) {
        return resultsMap.get(symbolKey);
      }

      // Fallback zeroed state if single symbol missing
      return {
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
        source: sourceLabel,
        lastUpdated: new Date().toISOString(),
      };
    })
    .filter(Boolean);
}
