import { Request, Response, NextFunction } from 'express';
import { StoreTransferNoteModel } from './store-transfer-note.model';
import { sendSuccessResponse, sendCreatedResponse, sendNotFoundResponse, sendValidationErrorResponse } from '../../utils/responseHandler';
import { CreateStoreTransferNoteRequest, UpdateStoreTransferNoteRequest, PaginationParams } from '../../types';
import logger from '../../utils/logger';
import { logAuditTrail } from '../../utils/auditTrail';
import { StockCalculator } from '../../utils/stock-calculator';
import { AppDataSource } from '../../config/data-source';
import { Store } from '../../entities/inventory/Store';

export class StoreTransferNoteController {
  static async createTransferNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transferData: CreateStoreTransferNoteRequest = req.body;

      if (!transferData.from_store_id || !transferData.to_store_id) {
        return sendValidationErrorResponse(res, 'From store and to store are required');
      }

      if (transferData.from_store_id === transferData.to_store_id) {
        return sendValidationErrorResponse(res, 'From store and to store must be different');
      }

      if (!transferData.details || !Array.isArray(transferData.details) || transferData.details.length === 0) {
        return sendValidationErrorResponse(res, 'At least one detail item is required');
      }

      // Validate details
      for (const detail of transferData.details) {
        if (!detail.item_id || !detail.item_code || !detail.item_name || detail.qty === undefined) {
          return sendValidationErrorResponse(res, 'Each detail must have item_id, item_code, item_name, and qty');
        }
        if (detail.qty <= 0) {
          return sendValidationErrorResponse(res, 'Quantity must be greater than 0');
        }
      }

      const transferNote = await StoreTransferNoteModel.createTransferNote({
        ...transferData,
        created_by: req.user?.user_id,
      });

      logger.info('Store transfer note created successfully', { 
        transferNoteId: transferNote.id, 
        v_no: transferNote.v_no 
      });
      await logAuditTrail(req, 'create');
      sendCreatedResponse(res, transferNote, 'Store transfer note created successfully');
    } catch (error: any) {
      logger.error('Error creating store transfer note', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      if (error.code === '23505') {
        return sendValidationErrorResponse(res, 'Voucher number already exists');
      }
      // Handle stock validation errors
      if (error.message && error.message.includes('Stock validation failed')) {
        return sendValidationErrorResponse(res, error.message);
      }
      next(error);
    }
  }

  static async getTransferNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const all = req.query.all === 'true';
      const from_store_id = req.query.from_store_id ? parseInt(req.query.from_store_id as string) : undefined;
      const to_store_id = req.query.to_store_id ? parseInt(req.query.to_store_id as string) : undefined;

      const filters = {
        ...(from_store_id && { from_store_id }),
        ...(to_store_id && { to_store_id }),
      };

      if (all) {
        const result = await StoreTransferNoteModel.getTransferNotes({}, filters, true);
        return sendSuccessResponse(res, result.transferNotes, 'Transfer notes retrieved successfully');
      }

      const pagination: PaginationParams = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sort_by: req.query.sort_by as string,
        sort_order: req.query.sort_order as 'asc' | 'desc'
      };

      const result = await StoreTransferNoteModel.getTransferNotes(pagination, filters);

      const response = {
        transferNotes: result.transferNotes,
        pagination: {
          page: pagination.page || 1,
          limit: pagination.limit || 10,
          total: result.total,
          total_pages: Math.ceil(result.total / (pagination.limit || 10))
        }
      };

      sendSuccessResponse(res, response, 'Transfer notes retrieved successfully');
    } catch (error) {
      logger.error('Error getting transfer notes', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next(error);
    }
  }

  static async getTransferNoteById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transferNoteId = parseInt(req.params.id);
      
      if (isNaN(transferNoteId)) {
        return sendValidationErrorResponse(res, 'Invalid transfer note ID');
      }

      const transferNote = await StoreTransferNoteModel.getTransferNoteById(transferNoteId);
      
      if (!transferNote) {
        return sendNotFoundResponse(res, 'Transfer note not found');
      }

      sendSuccessResponse(res, transferNote, 'Transfer note retrieved successfully');
    } catch (error) {
      logger.error('Error getting transfer note by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transferNoteId: req.params.id
      });
      next(error);
    }
  }

  static async updateTransferNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transferNoteId = parseInt(req.params.id);
      
      if (isNaN(transferNoteId)) {
        return sendValidationErrorResponse(res, 'Invalid transfer note ID');
      }

      const transferData: UpdateStoreTransferNoteRequest = req.body;

      if (transferData.from_store_id !== undefined && transferData.to_store_id !== undefined) {
        if (transferData.from_store_id === transferData.to_store_id) {
          return sendValidationErrorResponse(res, 'From store and to store must be different');
        }
      }

      // v_no is locked on update; no need to validate

      if (transferData.details && transferData.details.length > 0) {
        for (const detail of transferData.details) {
          if (!detail.item_id || !detail.item_code || !detail.item_name || detail.qty === undefined) {
            return sendValidationErrorResponse(res, 'Each detail must have item_id, item_code, item_name, and qty');
          }
          if (detail.qty <= 0) {
            return sendValidationErrorResponse(res, 'Quantity must be greater than 0');
          }
        }
      }

      const updatedTransferNote = await StoreTransferNoteModel.updateTransferNote(transferNoteId, transferData);

      if (!updatedTransferNote) {
        return sendNotFoundResponse(res, 'Transfer note not found');
      }

      logger.info('Transfer note updated successfully', { transferNoteId: updatedTransferNote.id });
      await logAuditTrail(req, 'edit');
      sendSuccessResponse(res, updatedTransferNote, 'Transfer note updated successfully');
    } catch (error: any) {
      logger.error('Error updating transfer note', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      if (error.code === '23505') {
        return sendValidationErrorResponse(res, 'Voucher number already exists');
      }
      // Handle stock validation errors
      if (error.message && error.message.includes('Stock validation failed')) {
        return sendValidationErrorResponse(res, error.message);
      }
      next(error);
    }
  }

  static async deleteTransferNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transferNoteId = parseInt(req.params.id);
      
      if (isNaN(transferNoteId)) {
        return sendValidationErrorResponse(res, 'Invalid transfer note ID');
      }

      const result = await StoreTransferNoteModel.deleteTransferNote(transferNoteId);

      if (!result.success) {
        return sendNotFoundResponse(res, result.message);
      }

      logger.info('Transfer note deleted successfully', { transferNoteId });
      await logAuditTrail(req, 'delete');
      sendSuccessResponse(res, { id: transferNoteId }, result.message);
    } catch (error) {
      logger.error('Error deleting transfer note', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next(error);
    }
  }

  static async checkStockAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const itemId = parseInt(req.params.item_id);
      const storeId = parseInt(req.query.store_id as string);
      const requiredQty = parseFloat(req.query.qty as string);

      if (isNaN(itemId) || isNaN(storeId) || isNaN(requiredQty)) {
        return sendValidationErrorResponse(res, 'item_id, store_id (query param), and qty (query param) are required');
      }

      if (requiredQty <= 0) {
        return sendValidationErrorResponse(res, 'Quantity must be greater than 0');
      }

      // Get store information for better error messages
      const storeRepo = AppDataSource.getRepository(Store);
      const store = await storeRepo.findOne({ where: { id: storeId } });
      
      const storeInfo = store ? {
        store_code: store.store_code,
        store_name: store.store_name,
      } : undefined;

      const validation = await StockCalculator.validateStockAvailability(itemId, storeId, requiredQty, storeInfo);

      sendSuccessResponse(res, {
        item_id: itemId,
        store_id: storeId,
        store_code: store ? store.store_code : null,
        store_name: store ? store.store_name : null,
        required_qty: requiredQty,
        current_stock: validation.currentStock,
        available_stock: validation.availableStock,
        is_available: validation.isValid,
        message: validation.message || 'Stock is available',
      }, 'Stock availability checked successfully');
    } catch (error) {
      logger.error('Error checking stock availability', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next(error);
    }
  }

  static async getSourceStoresWithStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const itemIdParam = req.query.item_id as string;
      if (!itemIdParam) {
        return sendValidationErrorResponse(res, 'item_id query parameter is required');
      }

      const itemId = parseInt(itemIdParam, 10);
      if (isNaN(itemId) || itemId <= 0) {
        return sendValidationErrorResponse(res, 'item_id must be a positive integer');
      }

      const minQtyParam = req.query.min_qty as string | undefined;
      const minQty = minQtyParam ? parseFloat(minQtyParam) : 0;
      if (minQtyParam !== undefined && (isNaN(minQty) || minQty < 0)) {
        return sendValidationErrorResponse(res, 'min_qty must be a non-negative number when provided');
      }

      const stockByStore = await StockCalculator.getCurrentStockByStoreForItem(itemId);
      const storeIdsWithStock = Array.from(stockByStore.entries())
        .filter(([, qty]) => qty > minQty)
        .map(([storeId]) => storeId);

      if (storeIdsWithStock.length === 0) {
        return sendSuccessResponse(res, [], 'No stores have stock for this item');
      }

      const storeRepo = AppDataSource.getRepository(Store);
      const stores = await storeRepo.find({
        where: storeIdsWithStock.map((id) => ({ id })),
        order: { store_name: 'ASC' },
      });

      const response = stores.map((store) => ({
        store_id: store.id,
        store_code: store.store_code,
        store_name: store.store_name,
        current_stock: parseFloat((stockByStore.get(store.id) ?? 0).toString()),
      }));

      sendSuccessResponse(res, response, 'Source stores with available stock retrieved successfully');
    } catch (error) {
      logger.error('Error getting source stores with stock', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }
}
