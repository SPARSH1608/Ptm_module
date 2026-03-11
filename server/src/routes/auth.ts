import { Router } from 'express';
import { login, getMe, requestOtp, verifyOtp } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/otp/send', requestOtp);
router.post('/otp/verify', verifyOtp);
router.get('/me', authenticateToken, getMe);

export default router;
