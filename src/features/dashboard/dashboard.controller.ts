import { Request, Response, NextFunction } from 'express';
import { DashboardModel } from './dashboard.model';
import { sendSuccessResponse, sendValidationErrorResponse } from '../../utils/responseHandler';

export class DashboardController {
  static async getKpis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const thresholdParam = req.query.threshold as string | undefined;

      if (!thresholdParam) {
        return sendValidationErrorResponse(res, 'threshold query parameter is required');
      }

      const threshold = parseFloat(thresholdParam);
      if (isNaN(threshold) || threshold < 0) {
        return sendValidationErrorResponse(res, 'threshold must be a non-negative number');
      }

      const kpis = await DashboardModel.getKpis(threshold);

      sendSuccessResponse(res, { ...kpis, threshold }, 'Dashboard KPIs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

