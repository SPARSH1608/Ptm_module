import { Router } from 'express';
import { getAvailability, createAvailability, deleteSlot, updateAvailabilityStatus, updateSlotStatus } from '../controllers/availabilityController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getAvailability);
router.post('/', createAvailability);
router.patch('/status/:id', updateAvailabilityStatus);
router.patch('/slot/status/:id', updateSlotStatus);
router.delete('/:id', deleteSlot);

export default router;
