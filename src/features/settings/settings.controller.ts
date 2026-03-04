import { Request, Response, NextFunction } from 'express';
import { AuthModel } from '../auth/auth.model';
import { sendSuccessResponse } from '../../utils/responseHandler';

export class SettingsController {
  static async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await AuthModel.getSettings();
      sendSuccessResponse(res, settings, 'Settings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
