import { Router } from 'express';

const router = Router();

// Fast healthcheck route for Render zero-downtime deployment checks
router.get(['/health', '/healthz'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

export default router;
