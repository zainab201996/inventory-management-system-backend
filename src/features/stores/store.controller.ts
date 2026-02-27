import { Request, Response, NextFunction } from 'express';
import { StoreModel } from './store.model';
import { sendSuccessResponse, sendCreatedResponse, sendNotFoundResponse, sendValidationErrorResponse } from '../../utils/responseHandler';
import { CreateStoreRequest, UpdateStoreRequest, PaginationParams } from '../../types';
import logger from '../../utils/logger';
import { logAuditTrail } from '../../utils/auditTrail';

export class StoreController {
  static async createStore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const storeData: CreateStoreRequest = req.body;

      if (!storeData.store_name) {
        return sendValidationErrorResponse(res, 'Store name is required');
      }

      const newStore = await StoreModel.createStore(storeData, req.user?.user_id);
      logger.info('Store created successfully', { storeId: newStore.id, store_code: newStore.store_code });
      await logAuditTrail(req, 'create');
      sendCreatedResponse(res, newStore, 'Store created successfully');
    } catch (error: any) {
      logger.error('Error creating store', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      if (error.code === '23505') {
        return sendValidationErrorResponse(res, 'Store code already exists');
      }
      next(error);
    }
  }

  static async getStores(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const all = req.query.all === 'true';

      if (all) {
        const result = await StoreModel.getStores({}, true);
        return sendSuccessResponse(res, result.stores, 'Stores retrieved successfully');
      }

      const pagination: PaginationParams = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sort_by: req.query.sort_by as string,
        sort_order: req.query.sort_order as 'asc' | 'desc'
      };

      const result = await StoreModel.getStores(pagination);

      const response = {
        stores: result.stores,
        pagination: {
          page: pagination.page || 1,
          limit: pagination.limit || 10,
          total: result.total,
          total_pages: Math.ceil(result.total / (pagination.limit || 10))
        }
      };

      sendSuccessResponse(res, response, 'Stores retrieved successfully');
    } catch (error) {
      logger.error('Error getting stores', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next(error);
    }
  }

  static async getStoreById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const storeId = parseInt(req.params.id);
      
      if (isNaN(storeId)) {
        return sendValidationErrorResponse(res, 'Invalid store ID');
      }

      const store = await StoreModel.getStoreById(storeId);
      
      if (!store) {
        return sendNotFoundResponse(res, 'Store not found');
      }

      sendSuccessResponse(res, store, 'Store retrieved successfully');
    } catch (error) {
      logger.error('Error getting store by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        storeId: req.params.id
      });
      next(error);
    }
  }

  static async updateStore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const storeId = parseInt(req.params.id);
      
      if (isNaN(storeId)) {
        return sendValidationErrorResponse(res, 'Invalid store ID');
      }

      const storeData: UpdateStoreRequest = req.body;
      const updatedStore = await StoreModel.updateStore(storeId, storeData, req.user?.user_id);

      if (!updatedStore) {
        return sendNotFoundResponse(res, 'Store not found');
      }

      logger.info('Store updated successfully', { storeId: updatedStore.id });
      await logAuditTrail(req, 'edit');
      sendSuccessResponse(res, updatedStore, 'Store updated successfully');
    } catch (error: any) {
      logger.error('Error updating store', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      if (error.code === '23505') {
        return sendValidationErrorResponse(res, 'Store code already exists');
      }
      next(error);
    }
  }

  static async deleteStore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const storeId = parseInt(req.params.id);
      
      if (isNaN(storeId)) {
        return sendValidationErrorResponse(res, 'Invalid store ID');
      }

      const result = await StoreModel.deleteStore(storeId);

      if (!result.success) {
        return sendNotFoundResponse(res, result.message);
      }

      logger.info('Store deleted successfully', { storeId });
      await logAuditTrail(req, 'delete');
      sendSuccessResponse(res, { id: storeId }, result.message);
    } catch (error) {
      logger.error('Error deleting store', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next(error);
    }
  }
}
