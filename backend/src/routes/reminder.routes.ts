import { Router } from 'express';
import * as reminderController from '../controllers/reminder.controller';
import { authenticateToken, authorize } from '../middleware/auth.middleware';

const router = Router();

router.post('/check', authenticateToken, authorize('admin'), reminderController.runExpirationCheck);
router.get('/upcoming', authenticateToken, reminderController.getUpcomingExpirations);

export default router;
