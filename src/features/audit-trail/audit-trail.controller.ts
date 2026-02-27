import { Request, Response, NextFunction } from 'express';
import { AuditTrailModel, AuditEventType } from './audit-trail.model';
import { sendSuccessResponse, sendErrorResponse, sendValidationErrorResponse } from '../../utils/responseHandler';
import { PaginationParams } from '../../types';
import logger from '../../utils/logger';

export interface AuditTrailWithRelations {
  id: number;
  event_type: AuditEventType;
  page_id: number;
  page_name?: string;
  page_slug?: string;
  userid: number;
  username?: string;
  timestamp: Date;
  is_action?: boolean;
}

export class AuditTrailController {
  static async getAuditTrails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pagination: PaginationParams = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sort_by: req.query.sort_by as string || 'timestamp',
        sort_order: (req.query.sort_order as 'asc' | 'desc') || 'desc'
      };

      // Validate pagination
      if (pagination.page && pagination.page < 1) {
        return sendValidationErrorResponse(res, 'Page must be greater than 0');
      }
      if (pagination.limit && (pagination.limit < 1 || pagination.limit > 100)) {
        return sendValidationErrorResponse(res, 'Limit must be between 1 and 100');
      }

      // Parse filters from query params
      const filters: {
        pageId?: number;
        userId?: number;
        eventType?: AuditEventType;
        from_date?: string;
        to_date?: string;
        is_action?: boolean;
      } = {};

      if (req.query.page_id) {
        const pageId = parseInt(req.query.page_id as string);
        if (isNaN(pageId)) {
          return sendValidationErrorResponse(res, 'Invalid page_id parameter');
        }
        filters.pageId = pageId;
      }

      if (req.query.userid) {
        const userId = parseInt(req.query.userid as string);
        if (isNaN(userId)) {
          return sendValidationErrorResponse(res, 'Invalid userid parameter');
        }
        filters.userId = userId;
      }

      if (req.query.event_type) {
        const eventType = req.query.event_type as string;
        if (!['create', 'edit', 'delete'].includes(eventType)) {
          return sendValidationErrorResponse(res, 'Invalid event_type parameter. Must be one of: create, edit, delete');
        }
        filters.eventType = eventType as AuditEventType;
      }

      // Handle date filters - optional from_date and to_date
      if (req.query.from_date) {
        filters.from_date = req.query.from_date as string;
      }
      if (req.query.to_date) {
        filters.to_date = req.query.to_date as string;
      }

      // Handle is_action filter - optional boolean
      if (req.query.is_action !== undefined) {
        const isAction = req.query.is_action === 'true' || req.query.is_action === '1';
        filters.is_action = isAction;
      }

      // Get audit trails
      const result = await AuditTrailModel.getAuditTrailsWithRelations(pagination, filters);

      const response = {
        auditTrails: result.auditTrails,
        pagination: {
          page: pagination.page || 1,
          limit: pagination.limit || 10,
          total: result.total,
          total_pages: Math.ceil(result.total / (pagination.limit || 10))
        }
      };

      sendSuccessResponse(res, response, 'Audit trails retrieved successfully');
    } catch (error) {
      logger.error('Error getting audit trails', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: req.query
      });
      next(error);
    }
  }
}
