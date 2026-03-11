import { Router } from 'express';
import { getCenters, getCourses, getBatches, getTeachers } from '../controllers/masterController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.get('/teachers', getTeachers);

router.use(authenticateToken);

router.get('/centers', getCenters);
router.get('/courses', getCourses);
router.get('/batches', getBatches);

export default router;
