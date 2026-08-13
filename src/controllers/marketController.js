import { getMarketAssets, getAssetBySymbol } from '../services/marketService.js';

export async function getAllAssets(req, res, next) {
  try {
    const assets = await getMarketAssets();
    const sources = [...new Set(assets.map((a) => a.source).filter(Boolean))];
    res.status(200).json({
      success: true,
      count: assets.length,
      timestamp: new Date().toISOString(),
      sources: sources,
      data: assets,
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSingleAsset(req, res, next) {
  try {
    const { symbol } = req.params;
    const asset = await getAssetBySymbol(symbol);

    if (!asset) {
      return res.status(404).json({
        success: false,
        data: null,
        error: `Asset with symbol '${symbol}' not found.`,
      });
    }

    res.status(200).json({
      success: true,
      data: asset,
      error: null,
    });
  } catch (error) {
    next(error);
  }
}
