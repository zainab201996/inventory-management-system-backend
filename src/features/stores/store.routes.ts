import { Router } from 'express';
import { StoreController } from './store.controller';
import { authenticate, requirePermissionByRoute } from '../../middlewares/auth';

const router = Router();

router.use(authenticate);
router.use(requirePermissionByRoute());

router.post('/', StoreController.createStore);
router.get('/', StoreController.getStores);
router.get('/:id', StoreController.getStoreById);
router.put('/:id', StoreController.updateStore);
router.delete('/:id', StoreController.deleteStore);

export default router;
