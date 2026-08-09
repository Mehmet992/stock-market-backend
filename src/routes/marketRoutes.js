import { Router } from 'express';
import { getAllAssets, getSingleAsset } from '../controllers/marketController.js';

const router = Router();

// GET /api/v1/assets - Get all assets
router.get('/assets', getAllAssets);

// GET /api/v1/assets/:symbol - Get single asset details
router.get('/assets/:symbol', getSingleAsset);

export default router;
