import { Router } from 'express';
import { getBatches, getProfile, getCourses, getGoogleAuthUrl, saveGoogleTokens, getZoomAuthUrl, handleZoomOAuthCallback } from '../controllers/teacherController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public route — Zoom redirects the browser here after OAuth consent (no JWT)
router.get('/zoom-callback', handleZoomOAuthCallback);

// All routes below require a valid JWT
router.use(authenticateToken);

router.get('/profile', getProfile);
router.get('/batches', getBatches);
router.get('/courses', getCourses);
router.get('/google-auth-url', getGoogleAuthUrl);
router.post('/google-callback', saveGoogleTokens);
router.get('/zoom-auth-url', getZoomAuthUrl);

export default router;
