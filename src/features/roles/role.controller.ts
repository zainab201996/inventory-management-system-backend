import { Request, Response, NextFunction } from 'express';
import { RoleModel } from './role.model';
import { sendSuccessResponse, sendErrorResponse, sendCreatedResponse, sendNotFoundResponse, sendValidationErrorResponse } from '../../utils/responseHandler';
import { CreateRoleRequest, UpdateRoleRequest, PaginationParams } from '../../types';
import logger from '../../utils/logger';
import { logAuditTrail } from '../../utils/auditTrail';

export class RoleController {
  static async createRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body: CreateRoleRequest = req.body;

      if (!body.role_name) {
        return sendValidationErrorResponse(res, 'Role name is required');
      }

      const newRole = await RoleModel.createRole(body);
      logger.info('Role created successfully', { roleId: newRole.role_id, role_name: newRole.role_name });
      await logAuditTrail(req, 'create');
      sendCreatedResponse(res, newRole, 'Role created successfully');
    } catch (error: any) {
      logger.error('Error creating role', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      if (error.code === '23505') {
        return sendValidationErrorResponse(res, 'Role name already exists');
      }
      next(error);
    }
  }

  static async getRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const all = req.query.all === 'true';

      if (all) {
        const roles = await RoleModel.getAllRoles();
        return sendSuccessResponse(res, roles, 'Roles retrieved successfully');
      }

      const pagination: PaginationParams = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sort_by: req.query.sort_by as string,
        sort_order: req.query.sort_order as 'asc' | 'desc'
      };

      const result = await RoleModel.getRoles(pagination);

      const response = {
        roles: result.roles,
        pagination: {
          page: pagination.page || 1,
          limit: pagination.limit || 10,
          total: result.total,
          total_pages: Math.ceil(result.total / (pagination.limit || 10))
        }
      };

      sendSuccessResponse(res, response, 'Roles retrieved successfully');
    } catch (error) {
      logger.error('Error getting roles', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next(error);
    }
  }

  static async getRoleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleId = parseInt(req.params.id);
      
      if (isNaN(roleId)) {
        return sendValidationErrorResponse(res, 'Invalid role ID');
      }

      const role = await RoleModel.getRoleById(roleId);
      
      if (!role) {
        return sendNotFoundResponse(res, 'Role not found');
      }

      sendSuccessResponse(res, role, 'Role retrieved successfully');
    } catch (error) {
      logger.error('Error getting role by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: req.params.id
      });
      next(error);
    }
  }

  static async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleId = parseInt(req.params.id);
      
      if (isNaN(roleId)) {
        return sendValidationErrorResponse(res, 'Invalid role ID');
      }

      const updateData: UpdateRoleRequest = req.body;

      const existingRole = await RoleModel.getRoleById(roleId);
      if (!existingRole) {
        return sendNotFoundResponse(res, 'Role not found');
      }

      const updatedRole = await RoleModel.updateRole(roleId, updateData);
      
      if (!updatedRole) {
        return sendErrorResponse(res, 'Failed to update role', 500);
      }

      logger.info('Role updated successfully', { roleId, role_name: updatedRole.role_name });
      await logAuditTrail(req, 'edit');
      sendSuccessResponse(res, updatedRole, 'Role updated successfully');
    } catch (error: any) {
      logger.error('Error updating role', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: req.params.id
      });
      if (error.code === '23505') {
        return sendValidationErrorResponse(res, 'Role name already exists');
      }
      next(error);
    }
  }

  static async deleteRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleId = parseInt(req.params.id);
      
      if (isNaN(roleId)) {
        return sendValidationErrorResponse(res, 'Invalid role ID');
      }

      const result = await RoleModel.deleteRole(roleId);
      
      if (!result.success) {
        if (result.message.includes('not found')) {
          return sendNotFoundResponse(res, result.message);
        }
        return sendErrorResponse(res, result.message, 500);
      }

      logger.info('Role deleted successfully', { roleId });
      await logAuditTrail(req, 'delete');
      sendSuccessResponse(res, null, result.message);
    } catch (error: any) {
      logger.error('Error deleting role', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: req.params.id
      });
      if (error.code === '23503') {
        return sendValidationErrorResponse(res, 'Cannot delete role with child records');
      }
      next(error);
    }
  }
}

