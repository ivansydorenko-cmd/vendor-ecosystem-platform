import { Router } from 'express';
import * as workOrderController from '../controllers/workorder.controller';

const router = Router();

router.post('/', workOrderController.createWorkOrder);
router.get('/available', workOrderController.getAvailableWorkOrders);
router.get('/:id', workOrderController.getWorkOrderById);
router.post('/:id/accept', workOrderController.acceptWorkOrder);
router.post('/:id/complete', workOrderController.completeWorkOrder);

export default router;
