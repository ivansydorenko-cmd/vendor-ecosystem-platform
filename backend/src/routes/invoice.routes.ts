import { Router } from 'express';
import * as invoiceController from '../controllers/invoice.controller';
import { authenticateToken, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, invoiceController.getAllInvoices);
router.get('/:id', authenticateToken, invoiceController.getInvoiceById);
router.post('/', authenticateToken, authorize('admin', 'work_requestor'), invoiceController.createInvoiceFromWorkOrder);
router.post('/payments', authenticateToken, authorize('admin'), invoiceController.recordPayment);
router.patch('/:id/status', authenticateToken, authorize('admin'), invoiceController.updateInvoiceStatus);

export default router;
