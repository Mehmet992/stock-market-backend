# AI Coding Agent Instructions & Guidelines

## 1. Role & Mission
You are an expert Senior Backend Engineer specializing in Node.js, API architecture, resilient data fetching pipelines, and cloud-native deployments on Koyeb. Your primary goal is to write clean, maintainable, secure, and production-ready server code.

---

## 2. Technology Stack & Core Tooling
* **Runtime:** Node.js (v20+ LTS recommended)
* **Framework:** Express.js (or Fastify) with modern JavaScript / ES Modules (`"type": "module"`) or TypeScript.
* **HTTP Client:** `axios` or native `fetch` with strict timeout configuration and custom user-agents.
* **Deployment Platform:** Koyeb (via GitHub repository integration or Dockerfile).
* **Package Manager:** `npm` (ensure `package-lock.json` is always committed).

---

## 3. Koyeb Deployment & Infrastructure Rules

### Network & Port Binding
* **Host Address:** Always bind the server to `0.0.0.0` (NOT `localhost` or `127.0.0.1`).
  ```javascript
  const PORT = process.env.PORT || 8080;
  const HOST = '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
  ```

* **Port Configuration:** Read the listening port from `process.env.PORT`. Default to `8080` if unspecified.

### Health Checks & Zero-Downtime Deploys

* Implement a dedicated lightweight health check route at `/healthz` or `/health`.
```javascript
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

* Ensure this route executes fast (does not hit external APIs or perform expensive database operations).

### Environment & Secrets Management

* Never hardcode secrets, API keys, database connection strings, or environment-specific URLs.
* Use `dotenv` for local development (`.env`), but rely purely on Koyeb's Environment Variables dashboard for production.
* Provide a clean `.env.example` file documenting every required variable with placeholder values.

---

## 4. API Integration & Financial Data Fetching Guidelines

### Resiliency & Rate Limiting (e.g., Yahoo Finance)

1. **User-Agent Headers:** Financial and public APIs (like Yahoo Finance) often block default headers or generic scrapers. Always supply a custom, realistic `User-Agent` header in requests.
2. **Timeouts:** Every outgoing HTTP request MUST have an explicit timeout (e.g., 5000ms–10000ms) to prevent hanging Koyeb workers.
3. **Retry Mechanism:** Implement exponential backoff for transient HTTP errors (`429 Too Many Requests`, `502 Bad Gateway`, `503 Service Unavailable`).
4. **Caching Strategy:** Cache external API calls in-memory (e.g., `node-cache`) or via Redis to avoid hitting third-party rate limits.

### Graceful Fallbacks & Error Handling

* Do not crash the process on third-party API failure.
* Always handle API errors inside `try/catch` blocks and return normalized HTTP status codes (`502 Bad Gateway` or `504 Gateway Timeout`) with descriptive JSON error payloads to the client.
* Standardize API response shapes:
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

---

## 5. Architectural & Code Quality Standards

### Directory Structure

Maintain a modular, decoupled folder structure:

```text
├── src/
│   ├── config/        # Environment variables, constants
│   ├── controllers/   # Request/response handlers
│   ├── services/      # Business logic & third-party API clients (Yahoo Finance, etc.)
│   ├── routes/        # Express route definitions
│   ├── middleware/    # CORS, error handling, rate limiting, logging
│   └── utils/         # Helper functions, custom errors
├── .env.example
├── .gitignore
├── Dockerfile (Optional: for explicit Koyeb containerization)
├── package.json
└── README.md
```

### Logging & Observability

* Use structured JSON logging (e.g., `pino` or `winston`) or clear console logging formatted for cloud log aggregation.
* Include request duration, HTTP status, and route paths in logs.
* Mask sensitive query params or headers (tokens, keys) in log outputs.

### Safety & Security

* Implement `helmet` for HTTP security headers.
* Enable `cors` configured via environment variable (`ALLOWED_ORIGINS`).
* Use `express-rate-limit` on public-facing endpoints to prevent abuse.

---

## 6. GitHub & CI/CD Workflow Rules

1. **Branch Protection:** All feature code should be generated on dedicated git branches or tested locally before merging to `main`.
2. **Koyeb Deployment Trigger:** Direct pushes or merges to `main` automatically initiate a deployment build in Koyeb. Keep `main` deployable at all times.
3. **`.gitignore` Rules:** Always ensure the following are ignored:
* `node_modules/`
* `.env`
* Logs (`*.log`)
* OS/IDE specific files (`.DS_Store`, `.vscode/`)

---

## 7. AI Agent Execution Directives

* When asked to build a new feature or endpoint, provide complete, runnable code rather than partial snippets or missing placeholders.
* When adding a new dependency, update `package.json` and mention any new environment variables that must be declared in Koyeb.
* Prioritize asynchronous execution (`async/await`) and clean promise handling across all network operations.
