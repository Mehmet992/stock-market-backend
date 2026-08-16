import { config } from '../config/env.js';

/**
 * Express middleware to verify that incoming requests contain a valid x-app-secret-key header.
 * Blocks unauthorized direct web browser / curl access without the secret key.
 */
export function verifyAppSecretKey(req, res, next) {
  const clientSecret = req.headers['x-app-secret-key'];

  if (!clientSecret || clientSecret !== config.appSecretKey) {
    console.warn(`[AuthMiddleware] Unauthorized API request from IP ${req.ip} - Missing or invalid x-app-secret-key header.`);
    return res.status(401).json({
      success: false,
      count: 0,
      timestamp: new Date().toISOString(),
      data: null,
      error: 'Unauthorized: Missing or invalid x-app-secret-key header.',
    });
  }

  next();
}
