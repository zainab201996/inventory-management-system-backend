import { Request, Response, NextFunction } from 'express';
import { ReportModel } from './report.model';
import { sendSuccessResponse, sendValidationErrorResponse } from '../../utils/responseHandler';
import logger from '../../utils/logger';

export class ReportController {
  static async getStoreWiseStockReport(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { fromDate, toDate, store_id } = req.query;

      if (!fromDate || !toDate) {
        return sendValidationErrorResponse(res, 'fromDate and toDate are required');
      }

      const from = new Date(fromDate as string);
      const to = new Date(toDate as string);

      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return sendValidationErrorResponse(res, 'fromDate and toDate must be valid dates');
      }

      if (from > to) {
        return sendValidationErrorResponse(res, 'fromDate cannot be after toDate');
      }

      from.setUTCHours(0, 0, 0, 0);
      to.setUTCHours(23, 59, 59, 999);

      const storeId = store_id ? parseInt(store_id as string, 10) : undefined;
      if (store_id && isNaN(storeId as number)) {
        return sendValidationErrorResponse(res, 'store_id must be a valid number');
      }

      const rows = await ReportModel.getStoreWiseStockReport(from, to, storeId);

      logger.info('Store wise stock report generated', {
        fromDate,
        toDate,
        storeId,
        rowCount: rows.length,
      });

      sendSuccessResponse(res, rows, 'Store wise stock report generated successfully');
    } catch (error) {
      logger.error('Error in getStoreWiseStockReport controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  static async getStoreTransferDetailReport(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { fromDate, toDate, from_store_id, to_store_id } = req.query;

      if (!fromDate || !toDate) {
        return sendValidationErrorResponse(res, 'fromDate and toDate are required');
      }

      const from = new Date(fromDate as string);
      const to = new Date(toDate as string);

      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return sendValidationErrorResponse(res, 'fromDate and toDate must be valid dates');
      }

      if (from > to) {
        return sendValidationErrorResponse(res, 'fromDate cannot be after toDate');
      }

      from.setUTCHours(0, 0, 0, 0);
      to.setUTCHours(23, 59, 59, 999);

      const fromStoreId = from_store_id ? parseInt(from_store_id as string, 10) : undefined;
      const toStoreId = to_store_id ? parseInt(to_store_id as string, 10) : undefined;

      if (from_store_id && isNaN(fromStoreId as number)) {
        return sendValidationErrorResponse(res, 'from_store_id must be a valid number');
      }
      if (to_store_id && isNaN(toStoreId as number)) {
        return sendValidationErrorResponse(res, 'to_store_id must be a valid number');
      }

      const rows = await ReportModel.getStoreTransferDetailReport(from, to, {
        from_store_id: fromStoreId,
        to_store_id: toStoreId,
      });

      logger.info('Store transfer detail report generated', {
        fromDate,
        toDate,
        fromStoreId,
        toStoreId,
        rowCount: rows.length,
      });

      sendSuccessResponse(res, rows, 'Store transfer detail report generated successfully');
    } catch (error) {
      logger.error('Error in getStoreTransferDetailReport controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }
}

