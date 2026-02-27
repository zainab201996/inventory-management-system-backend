import { Request, Response, NextFunction } from 'express';
import { ItemModel } from './item.model';
import { sendSuccessResponse, sendCreatedResponse, sendNotFoundResponse, sendValidationErrorResponse } from '../../utils/responseHandler';
import { CreateItemRequest, UpdateItemRequest, PaginationParams } from '../../types';
import logger from '../../utils/logger';
import { logAuditTrail } from '../../utils/auditTrail';

export class ItemController {
  static async createItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const itemData: CreateItemRequest = req.body;

      if (!itemData.item_name) {
        return sendValidationErrorResponse(res, 'Item name is required');
      }

      const newItem = await ItemModel.createItem(itemData, req.user?.user_id);
      logger.info('Item created successfully', { itemId: newItem.id, item_code: newItem.item_code });
      await logAuditTrail(req, 'create');
      sendCreatedResponse(res, newItem, 'Item created successfully');
    } catch (error: any) {
      logger.error('Error creating item', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      if (error.code === '23505') {
        return sendValidationErrorResponse(res, 'Item code already exists');
      }
      next(error);
    }
  }

  static async getItems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const all = req.query.all === 'true';

      if (all) {
        const result = await ItemModel.getItems({}, true);
        return sendSuccessResponse(res, result.items, 'Items retrieved successfully');
      }

      const pagination: PaginationParams = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sort_by: req.query.sort_by as string,
        sort_order: req.query.sort_order as 'asc' | 'desc'
      };

      const result = await ItemModel.getItems(pagination);

      const response = {
        items: result.items,
        pagination: {
          page: pagination.page || 1,
          limit: pagination.limit || 10,
          total: result.total,
          total_pages: Math.ceil(result.total / (pagination.limit || 10))
        }
      };

      sendSuccessResponse(res, response, 'Items retrieved successfully');
    } catch (error) {
      logger.error('Error getting items', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next(error);
    }
  }

  static async getLowStockItems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const thresholdParam = req.query.threshold as string;
      if (!thresholdParam) {
        return sendValidationErrorResponse(res, 'threshold query parameter is required');
      }

      const threshold = parseFloat(thresholdParam);
      if (isNaN(threshold) || threshold < 0) {
        return sendValidationErrorResponse(res, 'threshold must be a non-negative number');
      }

      const storeIdParam = req.query.store_id as string | undefined;
      const storeId = storeIdParam ? parseInt(storeIdParam, 10) : undefined;
      if (storeIdParam && (isNaN(storeId!) || storeId! <= 0)) {
        return sendValidationErrorResponse(res, 'store_id must be a positive integer when provided');
      }

      const lowStockItems = await ItemModel.getLowStockItems(threshold, storeId);

      sendSuccessResponse(res, lowStockItems, 'Low stock items retrieved successfully');
    } catch (error) {
      logger.error('Error getting low stock items', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  static async getItemById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const itemId = parseInt(req.params.id);
      
      if (isNaN(itemId)) {
        return sendValidationErrorResponse(res, 'Invalid item ID');
      }

      const includeOpeningStocks = req.query.include_opening_stocks === 'true';
      
      const item = includeOpeningStocks 
        ? await ItemModel.getItemWithOpeningStocks(itemId)
        : await ItemModel.getItemById(itemId);
      
      if (!item) {
        return sendNotFoundResponse(res, 'Item not found');
      }

      sendSuccessResponse(res, item, 'Item retrieved successfully');
    } catch (error) {
      logger.error('Error getting item by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        itemId: req.params.id
      });
      next(error);
    }
  }

  static async updateItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const itemId = parseInt(req.params.id);
      
      if (isNaN(itemId)) {
        return sendValidationErrorResponse(res, 'Invalid item ID');
      }

      const itemData: UpdateItemRequest = req.body;
      const updatedItem = await ItemModel.updateItem(itemId, itemData, req.user?.user_id);

      if (!updatedItem) {
        return sendNotFoundResponse(res, 'Item not found');
      }

      logger.info('Item updated successfully', { itemId: updatedItem.id });
      await logAuditTrail(req, 'edit');
      sendSuccessResponse(res, updatedItem, 'Item updated successfully');
    } catch (error: any) {
      logger.error('Error updating item', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      if (error.code === '23505') {
        return sendValidationErrorResponse(res, 'Item code already exists');
      }
      next(error);
    }
  }

  static async deleteItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const itemId = parseInt(req.params.id);
      
      if (isNaN(itemId)) {
        return sendValidationErrorResponse(res, 'Invalid item ID');
      }

      const result = await ItemModel.deleteItem(itemId);

      if (!result.success) {
        return sendNotFoundResponse(res, result.message);
      }

      logger.info('Item deleted successfully', { itemId });
      await logAuditTrail(req, 'delete');
      sendSuccessResponse(res, { id: itemId }, result.message);
    } catch (error) {
      logger.error('Error deleting item', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next(error);
    }
  }
}
