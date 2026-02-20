import { Router } from 'express';
import {
    getForms,
    getFormById,
    getActiveForm,
    createForm,
    toggleFormStatus,
    addQuestionToForm,
    removeQuestionFromForm,
    updateQuestionsOrder
} from '../controllers/formController';
import {
    getQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion
} from '../controllers/questionController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public-ish Active Form Route (for students)
router.get('/active-form', getActiveForm);

// Form Routes
router.get('/forms', authenticateToken, getForms);
router.get('/forms/:id', authenticateToken, getFormById);
router.post('/forms', authenticateToken, createForm);
router.patch('/forms/status/:id', authenticateToken, toggleFormStatus);
router.post('/forms/:id/questions', authenticateToken, addQuestionToForm);
router.delete('/forms/:id/questions/:qId', authenticateToken, removeQuestionFromForm);
router.patch('/forms/:id/questions/order', authenticateToken, updateQuestionsOrder);


// Question Library Routes
router.get('/questions', authenticateToken, getQuestions);
router.post('/questions', authenticateToken, createQuestion);
router.put('/questions/:id', authenticateToken, updateQuestion);
router.delete('/questions/:id', authenticateToken, deleteQuestion);

export default router;
