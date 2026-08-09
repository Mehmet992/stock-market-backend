export const SUPPORTED_ASSETS = [
  // ==========================================
  // 1. BORSA İSTANBUL (BIST) STOCKS (.IS)
  // ==========================================
  { symbol: 'THYAO.IS', displayName: 'Türk Hava Yolları', type: 'stock', exchange: 'BIST' },
  { symbol: 'GARAN.IS', displayName: 'Garanti BBVA', type: 'stock', exchange: 'BIST' },
  { symbol: 'EREGL.IS', displayName: 'Ereğli Demir Çelik', type: 'stock', exchange: 'BIST' },
  { symbol: 'ASELS.IS', displayName: 'Aselsan', type: 'stock', exchange: 'BIST' },
  { symbol: 'KCHOL.IS', displayName: 'Koç Holding', type: 'stock', exchange: 'BIST' },
  { symbol: 'AKBNK.IS', displayName: 'Akbank', type: 'stock', exchange: 'BIST' },
  { symbol: 'SISE.IS', displayName: 'Şişecam', type: 'stock', exchange: 'BIST' },
  { symbol: 'TUPRS.IS', displayName: 'Tüpraş', type: 'stock', exchange: 'BIST' },
  { symbol: 'BIMAS.IS', displayName: 'BİM Mağazalar', type: 'stock', exchange: 'BIST' },
  { symbol: 'SAHOL.IS', displayName: 'Sabancı Holding', type: 'stock', exchange: 'BIST' },
  { symbol: 'XU100.IS', displayName: 'BIST 100 Endeksi', type: 'stock', exchange: 'BIST' },

  // ==========================================
  // 2. POPULAR US & GLOBAL STOCKS
  // ==========================================
  { symbol: 'NVDA', displayName: 'NVIDIA', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'AAPL', displayName: 'Apple', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'MSFT', displayName: 'Microsoft', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', displayName: 'Alphabet (Google)', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'AMZN', displayName: 'Amazon', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'META', displayName: 'Meta (Facebook)', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'TSLA', displayName: 'Tesla', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'AMD', displayName: 'AMD', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'PLTR', displayName: 'Palantir', type: 'stock', exchange: 'NYSE' },
  { symbol: 'TSM', displayName: 'TSMC', type: 'stock', exchange: 'NYSE' },
  { symbol: 'JPM', displayName: 'JPMorgan Chase', type: 'stock', exchange: 'NYSE' },
  { symbol: 'V', displayName: 'Visa', type: 'stock', exchange: 'NYSE' },
  { symbol: 'WMT', displayName: 'Walmart', type: 'stock', exchange: 'NYSE' },
  { symbol: 'DIS', displayName: 'Walt Disney', type: 'stock', exchange: 'NYSE' },
  { symbol: 'NFLX', displayName: 'Netflix', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'SPY', displayName: 'S&P 500 ETF', type: 'stock', exchange: 'NYSE' },
  { symbol: 'QQQ', displayName: 'Nasdaq 100 ETF', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'DIA', displayName: 'Dow Jones ETF', type: 'stock', exchange: 'NYSE' },

  // ==========================================
  // 3. CRYPTOCURRENCIES
  // ==========================================
  { symbol: 'BTC-USD', displayName: 'Bitcoin', type: 'crypto', exchange: 'Crypto' },
  { symbol: 'ETH-USD', displayName: 'Ethereum', type: 'crypto', exchange: 'Crypto' },
  { symbol: 'SOL-USD', displayName: 'Solana', type: 'crypto', exchange: 'Crypto' },
  { symbol: 'BNB-USD', displayName: 'Binance Coin', type: 'crypto', exchange: 'Crypto' },
  { symbol: 'XRP-USD', displayName: 'Ripple', type: 'crypto', exchange: 'Crypto' },
  { symbol: 'ADA-USD', displayName: 'Cardano', type: 'crypto', exchange: 'Crypto' },
  { symbol: 'DOGE-USD', displayName: 'Dogecoin', type: 'crypto', exchange: 'Crypto' },
  { symbol: 'AVAX-USD', displayName: 'Avalanche', type: 'crypto', exchange: 'Crypto' },
  { symbol: 'DOT-USD', displayName: 'Polkadot', type: 'crypto', exchange: 'Crypto' },
  { symbol: 'LINK-USD', displayName: 'Chainlink', type: 'crypto', exchange: 'Crypto' },

  // ==========================================
  // 4. COMMODITIES & METALS
  // ==========================================
  { symbol: 'GC=F', displayName: 'Gold Futures', type: 'metal', exchange: 'COMMODITY' },
  { symbol: 'SI=F', displayName: 'Silver Futures', type: 'metal', exchange: 'COMMODITY' },
  { symbol: 'HG=F', displayName: 'Copper Futures', type: 'metal', exchange: 'COMMODITY' },
  { symbol: 'PL=F', displayName: 'Platinum Futures', type: 'metal', exchange: 'COMMODITY' },
  { symbol: 'PA=F', displayName: 'Palladium Futures', type: 'metal', exchange: 'COMMODITY' },
  { symbol: 'CL=F', displayName: 'Crude Oil (WTI)', type: 'metal', exchange: 'COMMODITY' },
  { symbol: 'NG=F', displayName: 'Natural Gas', type: 'metal', exchange: 'COMMODITY' },

  // ==========================================
  // 5. FOREX CURRENCY PAIRS
  // ==========================================
  { symbol: 'EURUSD=X', displayName: 'EUR / USD', type: 'forex', exchange: 'FOREX' },
  { symbol: 'GBPUSD=X', displayName: 'GBP / USD', type: 'forex', exchange: 'FOREX' },
  { symbol: 'AUDUSD=X', displayName: 'AUD / USD', type: 'forex', exchange: 'FOREX' },
  { symbol: 'NZDUSD=X', displayName: 'NZD / USD', type: 'forex', exchange: 'FOREX' },
  { symbol: 'USDJPY=X', displayName: 'USD / JPY', type: 'forex', exchange: 'FOREX' },
  { symbol: 'USDCHF=X', displayName: 'USD / CHF', type: 'forex', exchange: 'FOREX' },
  { symbol: 'USDCAD=X', displayName: 'USD / CAD', type: 'forex', exchange: 'FOREX' },
  { symbol: 'USDTRY=X', displayName: 'USD / TRY', type: 'forex', exchange: 'FOREX' },
  { symbol: 'USDCNY=X', displayName: 'USD / CNY', type: 'forex', exchange: 'FOREX' },
  { symbol: 'USDINR=X', displayName: 'USD / INR', type: 'forex', exchange: 'FOREX' },
  { symbol: 'USDKRW=X', displayName: 'USD / KRW', type: 'forex', exchange: 'FOREX' },
  { symbol: 'USDMXN=X', displayName: 'USD / MXN', type: 'forex', exchange: 'FOREX' },
  { symbol: 'USDBRL=X', displayName: 'USD / BRL', type: 'forex', exchange: 'FOREX' },
  { symbol: 'USDSEK=X', displayName: 'USD / SEK', type: 'forex', exchange: 'FOREX' },
];
