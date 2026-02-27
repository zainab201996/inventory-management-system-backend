import { Request, Response, NextFunction } from 'express';
import { UserModel } from './user.model';
import { sendSuccessResponse, sendErrorResponse, sendCreatedResponse, sendNotFoundResponse, sendValidationErrorResponse, sendUnauthorizedResponse } from '../../utils/responseHandler';
import { CreateUserRequest, UpdateUserRequest, UpdatePasswordRequest, PaginationParams } from '../../types';
import logger from '../../utils/logger';
import { logAuditTrail } from '../../utils/auditTrail';

export class UserController {
  static async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userData: CreateUserRequest = req.body;

      if (!userData.username || !userData.password || !userData.role_ids || !Array.isArray(userData.role_ids) || userData.role_ids.length === 0) {
        return sendValidationErrorResponse(res, 'Username, password, and role_ids (array with at least one role) are required');
      }

      const existingUser = await UserModel.getUserByUsername(userData.username);
      if (existingUser) {
        return sendValidationErrorResponse(res, 'Username already exists');
      }

      const newUser = await UserModel.createUser(userData);
      const { password_hash, ...userWithoutPassword } = newUser;

      logger.info('User created successfully', { userId: newUser.id, username: newUser.username });
      await logAuditTrail(req, 'create');
      sendCreatedResponse(res, userWithoutPassword, 'User created successfully');
    } catch (error) {
      logger.error('Error creating user', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next(error);
    }
  }

  static async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pagination: PaginationParams = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sort_by: req.query.sort_by as string,
        sort_order: req.query.sort_order as 'asc' | 'desc'
      };
      const search = req.query.search as string;

      const result = await UserModel.getUsers(pagination, search);

      const response = {
        users: result.users.map((user: any) => {
          const { password_hash, ...userWithoutPassword } = user;
          return userWithoutPassword;
        }),
        pagination: {
          page: pagination.page || 1,
          limit: pagination.limit || 10,
          total: result.total,
          total_pages: Math.ceil(result.total / (pagination.limit || 10))
        }
      };

      sendSuccessResponse(res, response, 'Users retrieved successfully');
    } catch (error) {
      logger.error('Error getting users', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next(error);
    }
  }

  static async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return sendValidationErrorResponse(res, 'Invalid user ID');
      }

      const user = await UserModel.getUserById(userId);
      
      if (!user) {
        return sendNotFoundResponse(res, 'User not found');
      }

      const { password_hash, ...userWithoutPassword } = user;
      sendSuccessResponse(res, userWithoutPassword, 'User retrieved successfully');
    } catch (error) {
      logger.error('Error getting user by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.params.id
      });
      next(error);
    }
  }

  static async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return sendValidationErrorResponse(res, 'Invalid user ID');
      }

      const updateData: UpdateUserRequest = req.body;

      const existingUser = await UserModel.getUserById(userId);
      if (!existingUser) {
        return sendNotFoundResponse(res, 'User not found');
      }

      if (updateData.username && updateData.username !== existingUser.username) {
        const usernameExists = await UserModel.getUserByUsername(updateData.username);
        if (usernameExists) {
          return sendValidationErrorResponse(res, 'Username already exists');
        }
      }

      const updatedUser = await UserModel.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return sendErrorResponse(res, 'Failed to update user', 500);
      }

      const { password_hash, ...userWithoutPassword } = updatedUser;
      logger.info('User updated successfully', { userId, username: updatedUser.username });
      await logAuditTrail(req, 'edit');
      sendSuccessResponse(res, userWithoutPassword, 'User updated successfully');
    } catch (error) {
      logger.error('Error updating user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.params.id
      });
      next(error);
    }
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return sendValidationErrorResponse(res, 'Invalid user ID');
      }

      const result = await UserModel.deleteUser(userId);
      
      if (!result.success) {
        if (result.message.includes('not found')) {
          return sendNotFoundResponse(res, result.message);
        }
        return sendErrorResponse(res, result.message, 500);
      }

      logger.info('User deleted successfully', { userId });
      await logAuditTrail(req, 'delete');
      sendSuccessResponse(res, null, result.message);
    } catch (error) {
      logger.error('Error deleting user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.params.id
      });
      next(error);
    }
  }

  static async getUserAccessDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return sendValidationErrorResponse(res, 'Invalid user ID');
      }

      const accessDetails = await UserModel.getUserAccessDetails(userId);
      
      if (!accessDetails) {
        return sendNotFoundResponse(res, 'User not found');
      }

      // Remove password from user object
      const { password_hash, ...userWithoutPassword } = accessDetails.user as any;
      const response = {
        ...accessDetails,
        user: userWithoutPassword
      };

      logger.info('User access details retrieved successfully', { userId });
      sendSuccessResponse(res, response, 'User access details retrieved successfully');
    } catch (error) {
      logger.error('Error getting user access details', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.params.id
      });
      next(error);
    }
  }

  /**
   * Update user password - allows users to update their own password
   * Only requires authentication, no specific role/permission needed
   * Users can only update their own password
   */
  static async updatePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.user_id;
      
      if (!userId) {
        return sendUnauthorizedResponse(res, 'Authentication required');
      }

      const passwordData: UpdatePasswordRequest = req.body;

      // Validate request body
      if (!passwordData.current_password || !passwordData.new_password) {
        return sendValidationErrorResponse(res, 'Current password and new password are required');
      }

      // Validate new password length (minimum 6 characters)
      if (passwordData.new_password.length < 6) {
        return sendValidationErrorResponse(res, 'New password must be at least 6 characters long');
      }

      // Update password
      const result = await UserModel.updatePassword(userId, passwordData);
      
      if (!result.success) {
        if (result.message.includes('not found')) {
          return sendNotFoundResponse(res, result.message);
        }
        if (result.message.includes('incorrect')) {
          return sendValidationErrorResponse(res, result.message);
        }
        return sendErrorResponse(res, result.message, 500);
      }

      logger.info('Password updated successfully - user will be logged out', { userId });
      
      // Return success response with logout flag
      // The password_hash change will automatically invalidate all existing tokens
      // Frontend should show confirmation dialog before calling this endpoint
      sendSuccessResponse(res, { 
        logout_required: true,
        message: 'Password updated successfully. You will be logged out of all sessions.'
      }, result.message);
    } catch (error) {
      logger.error('Error updating password', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.user_id
      });
      next(error);
    }
  }
}

