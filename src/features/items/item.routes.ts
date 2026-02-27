import { Router } from 'express';
import { ItemController } from './item.controller';
import { authenticate, requirePermissionByRoute } from '../../middlewares/auth';

const router = Router();

router.use(authenticate);
router.use(requirePermissionByRoute());

router.post('/', ItemController.createItem);
router.get('/', ItemController.getItems);
router.get('/low-stock', ItemController.getLowStockItems);
router.get('/:id', ItemController.getItemById);
router.put('/:id', ItemController.updateItem);
router.delete('/:id', ItemController.deleteItem);

export default router;
