import { Request, Response, NextFunction } from 'express';
import { PageModel } from './page.model';
import { sendSuccessResponse, sendErrorResponse, sendCreatedResponse, sendNotFoundResponse, sendValidationErrorResponse } from '../../utils/responseHandler';
import { CreatePageRequest, UpdatePageRequest, PaginationParams } from '../../types';
import logger from '../../utils/logger';
import { logAuditTrail } from '../../utils/auditTrail';

export class PageController {
  static async createPage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body: CreatePageRequest = req.body;

      if (!body.page_name) {
        return sendValidationErrorResponse(res, 'Page name is required');
      }

      const newPage = await PageModel.createPage(body);
      logger.info('Page created successfully', { pageId: newPage.page_id, page_name: newPage.page_name });
      await logAuditTrail(req, 'create');
      sendCreatedResponse(res, newPage, 'Page created successfully');
    } catch (error: any) {
      logger.error('Error creating page', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      if (error.code === '23505') {
        return sendValidationErrorResponse(res, 'Page name already exists');
      }
      next(error);
    }
  }

  static async getPages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const all = req.query.all === 'true';

      if (all) {
        const pages = await PageModel.getAllPages();
        return sendSuccessResponse(res, pages, 'Pages retrieved successfully');
      }

      const pagination: PaginationParams = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sort_by: req.query.sort_by as string,
        sort_order: req.query.sort_order as 'asc' | 'desc'
      };

      const result = await PageModel.getPages(pagination);

      const response = {
        pages: result.pages,
        pagination: {
          page: pagination.page || 1,
          limit: pagination.limit || 10,
          total: result.total,
          total_pages: Math.ceil(result.total / (pagination.limit || 10))
        }
      };

      sendSuccessResponse(res, response, 'Pages retrieved successfully');
    } catch (error) {
      logger.error('Error getting pages', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next(error);
    }
  }

  static async getPageById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pageId = parseInt(req.params.id);
      
      if (isNaN(pageId)) {
        return sendValidationErrorResponse(res, 'Invalid page ID');
      }

      const page = await PageModel.getPageById(pageId);
      
      if (!page) {
        return sendNotFoundResponse(res, 'Page not found');
      }

      sendSuccessResponse(res, page, 'Page retrieved successfully');
    } catch (error) {
      logger.error('Error getting page by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pageId: req.params.id
      });
      next(error);
    }
  }

  static async updatePage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pageId = parseInt(req.params.id);
      
      if (isNaN(pageId)) {
        return sendValidationErrorResponse(res, 'Invalid page ID');
      }

      const updateData: UpdatePageRequest = req.body;

      const existingPage = await PageModel.getPageById(pageId);
      if (!existingPage) {
        return sendNotFoundResponse(res, 'Page not found');
      }

      const updatedPage = await PageModel.updatePage(pageId, updateData);
      
      if (!updatedPage) {
        return sendErrorResponse(res, 'Failed to update page', 500);
      }

      logger.info('Page updated successfully', { pageId, page_name: updatedPage.page_name });
      await logAuditTrail(req, 'edit');
      sendSuccessResponse(res, updatedPage, 'Page updated successfully');
    } catch (error: any) {
      logger.error('Error updating page', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pageId: req.params.id
      });
      if (error.code === '23505') {
        return sendValidationErrorResponse(res, 'Page name already exists');
      }
      next(error);
    }
  }

  static async deletePage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pageId = parseInt(req.params.id);
      
      if (isNaN(pageId)) {
        return sendValidationErrorResponse(res, 'Invalid page ID');
      }

      const result = await PageModel.deletePage(pageId);
      
      if (!result.success) {
        if (result.message.includes('not found')) {
          return sendNotFoundResponse(res, result.message);
        }
        return sendErrorResponse(res, result.message, 500);
      }

      logger.info('Page deleted successfully', { pageId });
      await logAuditTrail(req, 'delete');
      sendSuccessResponse(res, null, result.message);
    } catch (error: any) {
      logger.error('Error deleting page', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pageId: req.params.id
      });
      if (error.code === '23503') {
        return sendValidationErrorResponse(res, 'Cannot delete page with child records');
      }
      next(error);
    }
  }
}
