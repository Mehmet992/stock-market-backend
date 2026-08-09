# Stock Market Backend Proxy (Node.js)

Central Market Data Aggregator & Proxy for the **Stock Market Monitoring App**. Built with Express.js, featuring in-memory caching, background polling, health check routes, and seamless **Koyeb** cloud deployment.

---

## 🛠️ Tech Stack & Features

- **Runtime**: Node.js (v20+ LTS) with modern ES Modules (`import/export`)
- **Framework**: Express.js
- **Data Source**: Yahoo Finance API (Server-to-Server) for Global Stocks, Borsa İstanbul (`.IS`), Forex, Metals, and Crypto
- **Cache**: In-memory caching (`node-cache`) with background worker updates every 10s
- **Security**: `helmet`, `cors`, and `express-rate-limit`
- **Cloud Deployment**: 100% ready for **Koyeb** free tier

---

## 📁 Directory Structure

```text
stock_market_backend/
├── ai_instructions.md    # Senior Backend Guidelines for AI Agent
├── .env.example          # Environment variables template
├── .gitignore            # Ignored files (node_modules, .env, etc.)
├── package.json          # Dependencies & npm scripts
├── README.md             # Project documentation
└── src/
    ├── config/
    │   ├── assets.js     # Tracked stock, crypto, forex & metal symbols
    │   └── env.js        # Environment configuration
    ├── controllers/
    │   └── marketController.js # Endpoint response handlers
    ├── middleware/
    │   └── errorHandler.js   # Express error handling
    ├── routes/
    │   ├── health.js     # Koyeb zero-downtime healthcheck (/healthz)
    │   └── marketRoutes.js   # Market API routes (/api/v1/assets)
    ├── services/
    │   └── marketService.js  # Yahoo Finance fetching & caching engine
    ├── app.js            # Express app configuration
    └── server.js         # Server entry point (0.0.0.0:8080)
```

---

## 🚀 Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
```bash
npm run dev
```

The server will start on `http://0.0.0.0:8080`.

### 3. Test Endpoints
- **Health Check**: `curl http://localhost:8080/healthz`
- **All Assets API**: `curl http://localhost:8080/api/v1/assets`
- **Single Asset API**: `curl http://localhost:8080/api/v1/assets/NVDA`

---

## 🌐 Deploying to Koyeb (Free Tier)

1. Create a new GitHub repository named `stock_market_backend` and push this project.
2. Log into [Koyeb Console](https://app.koyeb.com/).
3. Click **Create Service** $\rightarrow$ Select **GitHub**.
4. Select your `stock_market_backend` repository and `main` branch.
5. Koyeb automatically detects Node.js (`npm start`).
6. Set Health check path to `/healthz` on Port `8080`.
7. Click **Deploy**! Koyeb will provide a free HTTPS URL (e.g. `https://xxx.koyeb.app`).
