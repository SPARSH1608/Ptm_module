import { Router } from 'express';
import { bookSlot, getMeetingResponses, getMeetingById, getMeetingNotes, updateMeetingNotes, getMyMeetings, getStudentTeachers, updateFormSubmission, cancelMeeting } from '../controllers/meetingController';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();

// Student-accessible routes (no JWT required - uses userid header / body fields)
// optionalAuth: sets req.user from JWT when present (teacher dashboard),
//               falls through silently when absent (student userid-header flow)
router.post('/book', bookSlot);
router.delete('/:id', cancelMeeting);
router.get('/', optionalAuth, getMyMeetings);
router.get('/:id/responses', optionalAuth, getMeetingResponses);
router.get('/:id/notes', optionalAuth, getMeetingNotes);
router.get('/:id', optionalAuth, getMeetingById);
router.put('/:meetingId/submission', updateFormSubmission);

// Teacher/admin routes (JWT required)
router.patch('/:id/notes', authenticateToken, updateMeetingNotes);
router.get('/student/teachers', authenticateToken, getStudentTeachers);

export default router;
