import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authenticate, requirePermissionByRoute } from '../../middlewares/auth';

const router = Router();

router.use(authenticate);
router.use(requirePermissionByRoute());

router.get('/', DashboardController.getKpis);

export default router;

