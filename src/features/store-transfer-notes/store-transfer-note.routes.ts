import { Router } from 'express';
import { StoreTransferNoteController } from './store-transfer-note.controller';
import { authenticate, requirePermissionByRoute } from '../../middlewares/auth';

const router = Router();

router.use(authenticate);
router.use(requirePermissionByRoute());

router.post('/', StoreTransferNoteController.createTransferNote);
router.get('/check-stock/:item_id', StoreTransferNoteController.checkStockAvailability);
router.get('/', StoreTransferNoteController.getTransferNotes);
router.get('/:id', StoreTransferNoteController.getTransferNoteById);
router.put('/:id', StoreTransferNoteController.updateTransferNote);
router.delete('/:id', StoreTransferNoteController.deleteTransferNote);

export default router;
