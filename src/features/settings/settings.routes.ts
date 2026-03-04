import { Router } from 'express';
import { SettingsController } from './settings.controller';
import { authenticate } from '../../middlewares/auth';

const router = Router();

router.use(authenticate);
router.get('/', SettingsController.getSettings);

export default router;
