import { Router } from 'express';
import * as skuController from '../controllers/sku.controller';

const router = Router();

router.get('/', skuController.getAllSkus);
router.get('/:id', skuController.getSkuById);
router.post('/', skuController.createSku);
router.put('/:id', skuController.updateSku);
router.get('/:id/price-history', skuController.getSkuPriceHistory);

export default router;
