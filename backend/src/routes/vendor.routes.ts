import { Router } from 'express';
import * as vendorController from '../controllers/vendor.controller';

const router = Router();

router.post('/register', vendorController.registerVendor);
router.get('/', vendorController.getAllVendors);
router.get('/:id', vendorController.getVendorProfile);
router.put('/:id', vendorController.updateVendorProfile);

export default router;
