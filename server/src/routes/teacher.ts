import { Router } from 'express';
import { getBatches, getProfile, getCourses } from '../controllers/teacherController';
// Middleware to check auth would go here
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/profile', getProfile);
router.get('/batches', getBatches);
router.get('/courses', getCourses);

export default router;
