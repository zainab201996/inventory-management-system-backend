import { Router } from 'express';
import { ReportController } from './report.controller';
import { authenticate } from '../../middlewares/auth';

const router = Router();

// Only require authentication; no page-level permission checks
router.use(authenticate);

// Store Wise Stock Report
router.get('/store-wise-stock', ReportController.getStoreWiseStockReport);

// Store Transfer Detail Report
router.get('/store-transfer-detail', ReportController.getStoreTransferDetailReport);

export default router;


