import { Router } from 'express';
import { RoleDetailController } from './role-detail.controller';
import { authenticate, requirePermissionByRoute } from '../../middlewares/auth';

const router = Router();

router.use(authenticate);
router.use(requirePermissionByRoute());

router.post('/', RoleDetailController.createRoleDetail);
router.get('/', RoleDetailController.getRoleDetails);
router.get('/:id', RoleDetailController.getRoleDetailById);
router.put('/:id', RoleDetailController.updateRoleDetail);
router.delete('/:id', RoleDetailController.deleteRoleDetail);

export default router;
