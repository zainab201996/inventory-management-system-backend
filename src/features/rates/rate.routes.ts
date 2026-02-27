import { Router } from 'express';
import { RateController } from './rate.controller';
import { authenticate, requirePermissionByRoute } from '../../middlewares/auth';

const router = Router();

router.use(authenticate);
router.use(requirePermissionByRoute());

router.post('/', RateController.createRate);
router.get('/current/:item_id', RateController.getCurrentRate);
router.get('/', RateController.getRates);
router.get('/:id', RateController.getRateById);
router.put('/:id', RateController.updateRate);
router.delete('/:id', RateController.deleteRate);

export default router;
