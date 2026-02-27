import { Request, Response, NextFunction } from 'express';
import { RoleDetailModel } from './role-detail.model';
import { sendSuccessResponse, sendErrorResponse, sendCreatedResponse, sendNotFoundResponse, sendValidationErrorResponse } from '../../utils/responseHandler';
import { CreateRoleDetailRequest, UpdateRoleDetailRequest, PaginationParams } from '../../types';
import logger from '../../utils/logger';
import { AuditTrailModel } from '../audit-trail/audit-trail.model';

export class RoleDetailController {
  static async createRoleDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body: CreateRoleDetailRequest = req.body;

      if (!body.role_id || !body.page_id) {
        return sendValidationErrorResponse(res, 'Role ID and Page ID are required');
      }

      const newDetail = await RoleDetailModel.createRoleDetail(body);
      logger.info('Role detail created successfully', { 
        detailId: newDetail.id, 
        role_id: newDetail.role_id,
        page_id: newDetail.page_id 
      });
      // Log as 'edit' event for roles page (any operation on role_details table logs as edit role)
      if (req.user?.user_id) {
        const rolesPageId = await AuditTrailModel.getPageIdBySlug('roles');
        if (rolesPageId) {
          await AuditTrailModel.logAudit('edit', rolesPageId, req.user.user_id, false);
        }
      }
      sendCreatedResponse(res, newDetail, 'Role detail created successfully');
    } catch (error: any) {
      logger.error('Error creating role detail', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      if (error.code === '23505') {
        return sendValidationErrorResponse(res, 'This role and page combination already exists');
      }
      if (error.code === '23503') {
        return sendValidationErrorResponse(res, 'Invalid role ID or page ID');
      }
      next(error);
    }
  }

  static async getRoleDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const role_id = req.query.role_id ? parseInt(req.query.role_id as string) : undefined;
      const all = req.query.all === 'true' && role_id;

      if (all && role_id) {
        const details = await RoleDetailModel.getAllRoleDetailsByRole(role_id);
        return sendSuccessResponse(res, details, 'Role details retrieved successfully');
      }

      const pagination: PaginationParams = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sort_by: req.query.sort_by as string,
        sort_order: req.query.sort_order as 'asc' | 'desc'
      };

      const result = await RoleDetailModel.getRoleDetails(pagination, role_id);

      const response = {
        details: result.details,
        pagination: {
          page: pagination.page || 1,
          limit: pagination.limit || 10,
          total: result.total,
          total_pages: Math.ceil(result.total / (pagination.limit || 10))
        }
      };

      sendSuccessResponse(res, response, 'Role details retrieved successfully');
    } catch (error) {
      logger.error('Error getting role details', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next(error);
    }
  }

  static async getRoleDetailById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const detailId = parseInt(req.params.id);
      
      if (isNaN(detailId)) {
        return sendValidationErrorResponse(res, 'Invalid role detail ID');
      }

      const detail = await RoleDetailModel.getRoleDetailById(detailId);
      
      if (!detail) {
        return sendNotFoundResponse(res, 'Role detail not found');
      }

      sendSuccessResponse(res, detail, 'Role detail retrieved successfully');
    } catch (error) {
      logger.error('Error getting role detail by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        detailId: req.params.id
      });
      next(error);
    }
  }

  static async updateRoleDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const detailId = parseInt(req.params.id);
      
      if (isNaN(detailId)) {
        return sendValidationErrorResponse(res, 'Invalid role detail ID');
      }

      const updateData: UpdateRoleDetailRequest = req.body;

      const existingDetail = await RoleDetailModel.getRoleDetailById(detailId);
      if (!existingDetail) {
        return sendNotFoundResponse(res, 'Role detail not found');
      }

      const updatedDetail = await RoleDetailModel.updateRoleDetail(detailId, updateData);
      
      if (!updatedDetail) {
        return sendErrorResponse(res, 'Failed to update role detail', 500);
      }

      logger.info('Role detail updated successfully', { detailId });
      // Log as 'edit' event for roles page (any operation on role_details table logs as edit role)
      if (req.user?.user_id) {
        const rolesPageId = await AuditTrailModel.getPageIdBySlug('roles');
        if (rolesPageId) {
          await AuditTrailModel.logAudit('edit', rolesPageId, req.user.user_id, false);
        }
      }
      sendSuccessResponse(res, updatedDetail, 'Role detail updated successfully');
    } catch (error: any) {
      logger.error('Error updating role detail', {
        error: error instanceof Error ? error.message : 'Unknown error',
        detailId: req.params.id
      });
      next(error);
    }
  }

  static async deleteRoleDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const detailId = parseInt(req.params.id);
      
      if (isNaN(detailId)) {
        return sendValidationErrorResponse(res, 'Invalid role detail ID');
      }

      const result = await RoleDetailModel.deleteRoleDetail(detailId);
      
      if (!result.success) {
        if (result.message.includes('not found')) {
          return sendNotFoundResponse(res, result.message);
        }
        return sendErrorResponse(res, result.message, 500);
      }

      logger.info('Role detail deleted successfully', { detailId });
      // Log as 'edit' event for roles page (any operation on role_details table logs as edit role)
      if (req.user?.user_id) {
        const rolesPageId = await AuditTrailModel.getPageIdBySlug('roles');
        if (rolesPageId) {
          await AuditTrailModel.logAudit('edit', rolesPageId, req.user.user_id, false);
        }
      }
      sendSuccessResponse(res, null, result.message);
    } catch (error) {
      logger.error('Error deleting role detail', {
        error: error instanceof Error ? error.message : 'Unknown error',
        detailId: req.params.id
      });
      next(error);
    }
  }
}
