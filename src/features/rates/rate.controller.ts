import { Request, Response, NextFunction } from 'express';
import { RateModel } from './rate.model';
import { AuthModel } from '../auth/auth.model';
import { sendSuccessResponse, sendCreatedResponse, sendNotFoundResponse, sendValidationErrorResponse } from '../../utils/responseHandler';
import { CreateRateRequest, UpdateRateRequest, PaginationParams } from '../../types';
import logger from '../../utils/logger';
import { logAuditTrail } from '../../utils/auditTrail';

export class RateController {
  static async createRate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rateData: CreateRateRequest = req.body;

      if (!rateData.item_id || rateData.rate === undefined) {
        return sendValidationErrorResponse(res, 'Item ID and rate are required');
      }

      if (rateData.rate < 0) {
        return sendValidationErrorResponse(res, 'Rate must be a positive number');
      }

      const newRate = await RateModel.createRate(rateData);
      logger.info('Rate created successfully', { rateId: newRate.id, item_id: newRate.item_id });
      await logAuditTrail(req, 'create');
      sendCreatedResponse(res, newRate, 'Rate created successfully');
    } catch (error: any) {
      logger.error('Error creating rate', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      if (error.code === '23505') {
        return sendValidationErrorResponse(res, 'Rate with this effective date already exists for this item');
      }
      next(error);
    }
  }

  static async getRates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const all = req.query.all === 'true';
      const item_id = req.query.item_id ? parseInt(req.query.item_id as string) : undefined;

      const filters = item_id ? { item_id } : undefined;

      const settings = await AuthModel.getSettings();

      if (all) {
        const result = await RateModel.getRates({}, filters, true);
        return sendSuccessResponse(res, { rates: result.rates, currency_symbol: settings.currency_symbol, currency_code: settings.currency_code }, 'Rates retrieved successfully');
      }

      const pagination: PaginationParams = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sort_by: req.query.sort_by as string,
        sort_order: req.query.sort_order as 'asc' | 'desc'
      };

      const result = await RateModel.getRates(pagination, filters);

      const response = {
        rates: result.rates,
        pagination: {
          page: pagination.page || 1,
          limit: pagination.limit || 10,
          total: result.total,
          total_pages: Math.ceil(result.total / (pagination.limit || 10))
        },
        currency_symbol: settings.currency_symbol,
        currency_code: settings.currency_code
      };

      sendSuccessResponse(res, response, 'Rates retrieved successfully');
    } catch (error) {
      logger.error('Error getting rates', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next(error);
    }
  }

  static async getCurrentRate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const itemId = parseInt(req.params.item_id);
      
      if (isNaN(itemId)) {
        return sendValidationErrorResponse(res, 'Invalid item ID');
      }

      const rate = await RateModel.getCurrentRate(itemId);
      
      if (!rate) {
        return sendNotFoundResponse(res, 'No rate found for this item');
      }

      const settings = await AuthModel.getSettings();
      sendSuccessResponse(res, { ...rate, currency_symbol: settings.currency_symbol, currency_code: settings.currency_code }, 'Current rate retrieved successfully');
    } catch (error) {
      logger.error('Error getting current rate', {
        error: error instanceof Error ? error.message : 'Unknown error',
        itemId: req.params.item_id
      });
      next(error);
    }
  }

  static async getRateById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rateId = parseInt(req.params.id);
      
      if (isNaN(rateId)) {
        return sendValidationErrorResponse(res, 'Invalid rate ID');
      }

      const rate = await RateModel.getRateById(rateId);
      
      if (!rate) {
        return sendNotFoundResponse(res, 'Rate not found');
      }

      const settings = await AuthModel.getSettings();
      sendSuccessResponse(res, { ...rate, currency_symbol: settings.currency_symbol, currency_code: settings.currency_code }, 'Rate retrieved successfully');
    } catch (error) {
      logger.error('Error getting rate by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        rateId: req.params.id
      });
      next(error);
    }
  }

  static async updateRate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rateId = parseInt(req.params.id);
      
      if (isNaN(rateId)) {
        return sendValidationErrorResponse(res, 'Invalid rate ID');
      }

      const rateData: UpdateRateRequest = req.body;

      if (rateData.rate !== undefined && rateData.rate < 0) {
        return sendValidationErrorResponse(res, 'Rate must be a positive number');
      }

      const updatedRate = await RateModel.updateRate(rateId, rateData);

      if (!updatedRate) {
        return sendNotFoundResponse(res, 'Rate not found');
      }

      logger.info('Rate updated successfully', { rateId: updatedRate.id });
      await logAuditTrail(req, 'edit');
      sendSuccessResponse(res, updatedRate, 'Rate updated successfully');
    } catch (error: any) {
      logger.error('Error updating rate', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      if (error.code === '23505') {
        return sendValidationErrorResponse(res, 'Rate with this effective date already exists for this item');
      }
      next(error);
    }
  }

  static async deleteRate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rateId = parseInt(req.params.id);
      
      if (isNaN(rateId)) {
        return sendValidationErrorResponse(res, 'Invalid rate ID');
      }

      const result = await RateModel.deleteRate(rateId);

      if (!result.success) {
        return sendNotFoundResponse(res, result.message);
      }

      logger.info('Rate deleted successfully', { rateId });
      await logAuditTrail(req, 'delete');
      sendSuccessResponse(res, { id: rateId }, result.message);
    } catch (error) {
      logger.error('Error deleting rate', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next(error);
    }
  }
}
