/**
 * Bigpara (Hürriyet Bigpara) Market Data Service
 * Serves as secondary fallback API for BIST Turkish Stocks (.IS) and TRY Forex pairs.
 */

/**
 * Normalizes symbol for Bigpara requests (e.g., 'THYAO.IS' -> 'THYAO', 'USDTRY=X' -> 'USDTRY')
 */
function cleanSymbolForBigpara(symbol) {
  if (!symbol) return '';
  return symbol.toUpperCase().replace('.IS', '').replace('=X', '');
}

/**
 * Normalizes raw Bigpara payload into standardized MarketAsset format
 */
function normalizeBigparaQuote(data, assetConfig) {
  if (!data) return null;

  // Bigpara returns price/kapanis fields as numbers or formatted strings
  const parseNum = (val) => {
    if (val === null || val === undefined) return 0.0;
    if (typeof val === 'number') return val;
    const str = val.toString().replace(/\./g, '').replace(',', '.');
    return parseFloat(str) || 0.0;
  };

  const price = parseNum(data.fiyat || data.last || data.kapanis || data.satiss || data.satis);
  const previousClose = parseNum(data.oncekikapanis || data.previousClose || data.dunKapanis || price);
  const change = parseNum(data.degisim || data.change) || (price - previousClose);
  const changePercent = parseNum(data.yuzdedegisim || data.changePercent) || (previousClose > 0 ? (change / previousClose) * 100 : 0.0);

  return {
    symbol: assetConfig.symbol,
    displayName: assetConfig.displayName,
    type: assetConfig.type,
    exchange: assetConfig.exchange || 'BIST',
    currency: assetConfig.symbol.endsWith('.IS') ? 'TRY' : 'USD',
    price,
    change,
    changePercent,
    high: parseNum(data.yuksek || data.high || price),
    low: parseNum(data.dusuk || data.low || price),
    open: parseNum(data.acilis || data.open || price),
    previousClose,
    volume: parseNum(data.hacim || data.volume || 0),
    source: 'BIGPARA_FALLBACK',
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Fetches market data for BIST stocks and Forex pairs from Bigpara API
 * @param {Array} assets - List of asset config objects to fetch
 * @returns {Promise<Array>} List of normalized MarketAsset objects
 */
export async function fetchFromBigpara(assets) {
  if (!assets || assets.length === 0) return [];

  console.log(`[BigparaService] Fetching ${assets.length} BIST/Forex assets from Bigpara...`);
  const results = [];

  for (const assetConfig of assets) {
    try {
      const cleanSymbol = cleanSymbolForBigpara(assetConfig.symbol);
      let url = '';

      if (assetConfig.type === 'stock' || assetConfig.exchange === 'BIST') {
        url = `https://bigpara.hurriyet.com.tr/api/v1/hisse/detay/${encodeURIComponent(cleanSymbol)}`;
      } else {
        url = `https://bigpara.hurriyet.com.tr/api/v1/doviz/detay/${encodeURIComponent(cleanSymbol)}`;
      }

      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(5000), // 5s timeout per request
      });

      if (res.ok) {
        const json = await res.json();
        const data = json?.data || json?.data?.hisseDetay || json;
        const normalized = normalizeBigparaQuote(data, assetConfig);
        if (normalized && normalized.price > 0) {
          results.push(normalized);
          continue;
        }
      } else {
        console.warn(`[BigparaService] Bigpara HTTP ${res.status} for ${assetConfig.symbol}`);
      }
    } catch (err) {
      console.warn(`[BigparaService] Error fetching ${assetConfig.symbol} from Bigpara: ${err.message}`);
    }

    // Fallback zeroed state if single symbol request fails
    results.push({
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
      source: 'BIGPARA_FALLBACK',
      lastUpdated: new Date().toISOString(),
    });
  }

  return results;
}
