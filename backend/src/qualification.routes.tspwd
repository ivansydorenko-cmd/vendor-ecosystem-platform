import { Router } from 'express';
import * as qualificationController from '../controllers/qualification.controller';
import { authenticateToken, authorize } from '../middleware/auth.middleware';

const router = Router();

// Qualify/Disqualify vendors (admin only)
router.post('/qualify', authenticateToken, authorize('admin'), qualificationController.qualifyVendor);
router.post('/disqualify', authenticateToken, authorize('admin'), qualificationController.disqualifyVendor);

// Get vendor qualifications across all tenants
router.get('/vendor/:vendor_id', authenticateToken, qualificationController.getVendorQualifications);

// Get qualified vendors for a tenant
router.get('/tenant/:tenant_id', authenticateToken, qualificationController.getTenantQualifiedVendors);

// Get pending qualifications (admin review queue)
router.get('/pending', authenticateToken, authorize('admin'), qualificationController.getPendingQualifications);

export default router;
