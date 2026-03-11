import { Router } from 'express';
import { getAvailability, createAvailability, deleteSlot, updateAvailabilityStatus, updateSlotStatus, getTeacherAvailability } from '../controllers/availabilityController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/teacher/:teacherId', getTeacherAvailability); // public - students view teacher slots
router.get('/', authenticateToken, getAvailability);
router.post('/', authenticateToken, createAvailability);
router.patch('/status/:id', authenticateToken, updateAvailabilityStatus);
router.patch('/slot/status/:id', authenticateToken, updateSlotStatus);
router.delete('/:id', authenticateToken, deleteSlot);

export default router;
