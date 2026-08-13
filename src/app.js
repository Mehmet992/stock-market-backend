import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import healthRoutes from './routes/health.js';
import marketRoutes from './routes/marketRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Trust reverse proxy load balancers (Render, Koyeb, Cloudflare)
app.set('trust proxy', 1);

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.allowedOrigins,
    methods: ['GET'],
  })
);

// Rate limiter (100 requests per minute per IP)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, data: null, error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json());

// Routes
app.use('/', healthRoutes);
app.use('/api/v1', marketRoutes);

// Centralized error handler
app.use(errorHandler);

export default app;
