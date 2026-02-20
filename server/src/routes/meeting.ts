import { Router } from 'express';
import { bookSlot, getMeetingResponses, getMeetingById, updateMeetingNotes, getMyMeetings } from '../controllers/meetingController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Booking route
router.post('/book', authenticateToken, bookSlot);

// Meeting details & responses
router.get('/:id', authenticateToken, getMeetingById);
router.get('/:id/responses', authenticateToken, getMeetingResponses);
router.patch('/:id/notes', authenticateToken, updateMeetingNotes);

// Lists
router.get('/', authenticateToken, getMyMeetings);

export default router;
