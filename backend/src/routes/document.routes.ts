import { Router } from 'express';
import * as documentController from '../controllers/document.controller';

const router = Router();

router.get('/types', documentController.getDocumentTypes);
router.post('/upload', documentController.uploadVendorDocument);
router.get('/vendor/:vendor_id', documentController.getVendorDocuments);
router.put('/:id/review', documentController.reviewDocument);
router.get('/expiring', documentController.getExpiringDocuments);

export default router;
