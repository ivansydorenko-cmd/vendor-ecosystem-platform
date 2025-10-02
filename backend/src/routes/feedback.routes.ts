import { Router } from 'express';
import * as feedbackController from '../controllers/feedback.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/', feedbackController.submitFeedback);
router.get('/', authenticateToken, feedbackController.getAllFeedback);
router.get('/work-order/:work_order_id', authenticateToken, feedbackController.getFeedbackByWorkOrder);
router.get('/vendor/:vendor_id', authenticateToken, feedbackController.getVendorFeedback);

export default router;
