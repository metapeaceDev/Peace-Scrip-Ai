/**
 * Image Proxy Route
 * 
 * Purpose: Proxy ComfyUI image requests to avoid CORS issues
 * Allows frontend to fetch generated images through backend
 */

import express from 'express';
import axios from 'axios';

const router = express.Router();

/**
 * GET /image
 * Proxy image from ComfyUI to frontend (avoids CORS)
 * 
 * Query params:
 * - filename: Name of the image file
 * - subfolder: Subfolder path (optional)
 * - type: Image type (output, input, temp)
 */
router.get('/image', async (req, res) => {
  try {
    const { filename, subfolder = '', type = 'output' } = req.query;

    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Missing filename parameter',
      });
    }

    // Get worker URL (default to first worker)
    const workerManager = req.app.locals.workerManager;
    
    if (!workerManager || !workerManager.workers || workerManager.workers.length === 0) {
      return res.status(503).json({
        success: false,
        error: 'No ComfyUI workers available',
      });
    }
    
    const worker = workerManager.workers[0];

    // Build ComfyUI URL
    const comfyuiUrl = `${worker.url}/view`;
    const params = new URLSearchParams({
      filename,
      subfolder,
      type,
    });

    console.log(`[PROXY] Proxying image request: ${comfyuiUrl}?${params}`);

    // Fetch image from ComfyUI
    const response = await axios.get(`${comfyuiUrl}?${params}`, {
      responseType: 'arraybuffer',
      timeout: 30000, // 30 second timeout
    });

    // Get content type from ComfyUI response
    const contentType = response.headers['content-type'] || 'image/png';

    // Set appropriate headers
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Access-Control-Allow-Origin': '*', // Allow all origins for images
    });

    // Send image data
    res.send(Buffer.from(response.data));

    console.log(`[OK] Image proxied successfully: ${filename} (${response.data.length} bytes)`);
  } catch (error) {
    console.error('[ERROR] Image proxy error:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Image not found',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to proxy image',
      details: error.message,
    });
  }
});

export default router;
