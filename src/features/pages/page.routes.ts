import { Router } from 'express';
import { PageController } from './page.controller';
import { authenticate, requirePermissionByRoute } from '../../middlewares/auth';

const router = Router();

router.use(authenticate);
router.use(requirePermissionByRoute());

// Only GET endpoints are exposed - create, update, and delete are not available via API
router.get('/', PageController.getPages);
router.get('/:id', PageController.getPageById);

export default router;
