import { Router } from 'express';
import { handleZoomWebhook } from '../controllers/webhookController';

const router = Router();

// express.raw() is applied in index.ts so raw body is available for HMAC verification
router.post('/zoom', handleZoomWebhook);

export default router;
