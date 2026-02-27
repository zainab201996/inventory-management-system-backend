import { Router } from 'express';
import { AuditTrailController } from './audit-trail.controller';
import { authenticate, requirePermissionByRoute } from '../../middlewares/auth';

const router = Router();

// All routes require authentication and permission checking
router.use(authenticate);
router.use(requirePermissionByRoute());

router.get('/', AuditTrailController.getAuditTrails);

export default router;
