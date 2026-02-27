import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate, requirePermissionByRoute } from '../../middlewares/auth';

const router = Router();

// Password update route - only requires authentication, no permission checking
router.put('/password', authenticate, UserController.updatePassword);

// All other routes require authentication and permission checking
router.use(authenticate);
router.use(requirePermissionByRoute());

router.post('/', UserController.createUser);
router.get('/', UserController.getUsers);
router.get('/:id/access', UserController.getUserAccessDetails);
router.get('/:id', UserController.getUserById);
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

export default router;

