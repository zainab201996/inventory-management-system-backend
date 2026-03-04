import { Request, Response, NextFunction } from 'express';
import { AuthModel } from './auth.model';
import { sendSuccessResponse, sendErrorResponse, sendValidationErrorResponse, sendUnauthorizedResponse } from '../../utils/responseHandler';
import logger from '../../utils/logger';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return sendValidationErrorResponse(res, 'Username and password are required');
      }

      const result = await AuthModel.loginUser(username, password);
      
      logger.info('User logged in successfully', { username, userId: result.user.id });
      sendSuccessResponse(res, result, 'Login successful');
    } catch (error) {
      logger.error('User login failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        username: req.body.username
      });
      
      if (error instanceof Error && error.message === 'Invalid credentials') {
        return sendUnauthorizedResponse(res, 'Invalid username or password');
      }
      
      if (error instanceof Error && error.message === 'Account is inactive') {
        return sendUnauthorizedResponse(res, 'Account is inactive');
      }
      
      next(error);
    }
  }

  static async verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token && req.body && req.body.token) {
        token = req.body.token;
      }
      
      if (!token) {
        return sendUnauthorizedResponse(res, 'No token provided');
      }

      const decoded = await AuthModel.verifyToken(token);
      
      // Get user details with relations
      const user = await AuthModel.getUserById(decoded.user_id);

      if (!user) {
        return sendUnauthorizedResponse(res, 'User not found');
      }

      if (!user.is_active) {
        return sendUnauthorizedResponse(res, 'User account is inactive');
      }

      // Fetch permissions from database (real-time, not from JWT)
      const permissions = await AuthModel.refreshUserPermissions(decoded.roleIds);
      
      // Build user response with fresh permissions from database
      const { password_hash, ...userWithoutPassword } = user;
      const userResponse = {
        ...userWithoutPassword,
        permissions
      };

      const settings = await AuthModel.getSettings();
      sendSuccessResponse(res, { user: userResponse, accessToken: token, settings }, 'Token verified successfully');
    } catch (error) {
      logger.error('Token verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      sendUnauthorizedResponse(res, 'Invalid token');
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return sendValidationErrorResponse(res, 'Refresh token is required');
      }

      const result = await AuthModel.refreshAccessToken(refreshToken);
      
      logger.info('Access token refreshed successfully', { 
        userId: (await AuthModel.verifyRefreshToken(refreshToken)).user_id 
      });
      sendSuccessResponse(res, result, 'Token refreshed successfully');
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      if (error instanceof Error && (error.message.includes('Invalid') || error.message.includes('expired'))) {
        return sendUnauthorizedResponse(res, 'Invalid or expired refresh token');
      }
      
      if (error instanceof Error && error.message.includes('password changed')) {
        return sendUnauthorizedResponse(res, 'Token invalidated - password changed. Please login again');
      }
      
      next(error);
    }
  }
}
