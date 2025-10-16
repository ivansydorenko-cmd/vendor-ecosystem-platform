import { Router } from 'express';
import {
  createAddonRelationship,
  getAddonsForSku,
  deleteAddonRelationship,
  toggleAutoApproval,
  getAllAddonRelationships
} from '../controllers/addon.controller';
import { authenticateToken, authorize } from '../middleware/auth.middleware';

const router = Router();

/**
 * Addon Routes
 * All routes require admin authorization
 */

// Get all add-on relationships (admin only, with optional filters)
router.get('/', authenticateToken, authorize('admin'), getAllAddonRelationships);

// Get add-ons for a specific SKU (admin only)
router.get('/sku/:id', authenticateToken, authorize('admin'), getAddonsForSku);

// Create new add-on relationship (admin only)
router.post('/', authenticateToken, authorize('admin'), createAddonRelationship);

// Toggle auto-approval for add-on (admin only)
router.patch('/:id/approval', authenticateToken, authorize('admin'), toggleAutoApproval);

// Delete add-on relationship (admin only)
router.delete('/:id', authenticateToken, authorize('admin'), deleteAddonRelationship);

export default router;