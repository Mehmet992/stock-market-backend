import app from './app.js';
import { config } from './config/env.js';
import { startBackgroundWorker } from './services/marketService.js';

const PORT = config.port;
const HOST = config.host;

app.listen(PORT, HOST, () => {
  console.log(`=================================================`);
  console.log(`🚀 Stock Market Backend running on http://${HOST}:${PORT}`);
  console.log(`💚 Healthcheck route available at http://${HOST}:${PORT}/healthz`);
  console.log(`📈 Market API route available at http://${HOST}:${PORT}/api/v1/assets`);
  console.log(`=================================================`);

  // Start background market data poller
  startBackgroundWorker();
});
