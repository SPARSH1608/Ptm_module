import { Router } from 'express';
import { getNotifications, markSeen } from '../controllers/notificationController';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuth, getNotifications);
router.patch('/:id/seen', optionalAuth, markSeen);

export default router;
