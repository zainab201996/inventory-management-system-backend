import { PoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dbConnection from '../../db/connection';
import { User } from '../../types';
import { UserModel } from '../users/user.model';
import logger from '../../utils/logger';

export interface JWTPayload {
  user_id: number;
  username: string;
  roleIds: number[];
  password_hash: string;
  // Permissions are NOT stored in JWT - they are fetched from database on each request for real-time updates
  // password_hash is included to invalidate tokens when password changes
}

export interface RefreshTokenPayload {
  user_id: number;
  password_hash: string;
}

export interface LoginResponse {
  user: {
    id: number;
    username: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    roles?: { role_id: number; role_name: string }[];
    permissions: { [pageSlug: string]: { show: boolean; create: boolean; edit: boolean; delete: boolean } };
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthModel {
  // Login user
  static async loginUser(username: string, password: string): Promise<LoginResponse> {
    try {
      const client = await dbConnection.getConnection();

      try {
        // Get user information
        const result = await client.query(`
          SELECT 
            u.id,
            u.username,
            u.password_hash,
            u.is_active
          FROM users u
          WHERE u.username = $1
        `, [username]);

        if (result.rows.length === 0) {
          throw new Error('Invalid credentials');
        }

        const user = result.rows[0];

        if (!user.is_active) {
          throw new Error('Account is inactive');
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
          throw new Error('Invalid credentials');
        }

        // Get user roles
        const rolesResult = await client.query(`
          SELECT r.role_id, r.role_name
          FROM roles r
          INNER JOIN user_details ud ON r.role_id = ud.role_id
          WHERE ud.user_id = $1
        `, [user.id]);

        const roles = rolesResult.rows.map((row: { role_id: number; role_name: string }) => ({
          role_id: row.role_id,
          role_name: row.role_name
        }));

        const roleIds = roles.map(r => r.role_id);

        // Get user permissions from all roles (merged) - using slug instead of page_name
        const permissionsResult = await client.query(`
          SELECT 
            p.slug,
            MAX(rd.show::int)::boolean as show,
            MAX(rd.create::int)::boolean as create,
            MAX(rd.edit::int)::boolean as edit,
            MAX(rd.delete::int)::boolean as delete
          FROM role_details rd
          INNER JOIN pages p ON rd.page_id = p.page_id
          WHERE rd.role_id = ANY($1::int[])
          GROUP BY p.slug
        `, [roleIds]);

        const permissions: { [pageSlug: string]: { show: boolean; create: boolean; edit: boolean; delete: boolean } } = {};
        permissionsResult.rows.forEach((row: { slug: string; show: boolean; create: boolean; edit: boolean; delete: boolean }) => {
          permissions[row.slug] = {
            show: row.show,
            create: row.create,
            edit: row.edit,
            delete: row.delete
          };
        });

        // Generate access token - include user identity info and password_hash
        // password_hash is included to invalidate tokens when password changes
        // Permissions are fetched from database on each request for real-time updates
        const accessPayload: JWTPayload = { 
          user_id: user.id, 
          username: user.username, 
          roleIds: roleIds,
          password_hash: user.password_hash
        };
        
        const accessSecret = process.env.JWT_SECRET || 'default_secret';
        const accessExpiresIn: string = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
        const accessToken = jwt.sign(accessPayload, accessSecret, { expiresIn: accessExpiresIn } as jwt.SignOptions);

        // Generate refresh token - minimal payload with password_hash
        const refreshPayload: RefreshTokenPayload = {
          user_id: user.id,
          password_hash: user.password_hash
        };
        
        const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'default_secret';
        const refreshExpiresIn: string = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
        const refreshToken = jwt.sign(refreshPayload, refreshSecret, { expiresIn: refreshExpiresIn } as jwt.SignOptions);

        // Remove password from user object and add related data
        const { password_hash, ...userWithoutPassword } = user;
        const userResponse = {
          ...userWithoutPassword,
          roles: roles.length > 0 ? roles : undefined,
          permissions
        };

        logger.info('User logged in successfully', { userId: user.id, username: user.username });
        
        return {
          user: userResponse,
          accessToken,
          refreshToken
        };
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error during user login', {
        error: error instanceof Error ? error.message : 'Unknown error',
        username
      });
      throw error;
    }
  }

  // Verify access token
  static async verifyToken(token: string): Promise<JWTPayload> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as JWTPayload;
      
      // Verify password_hash matches current user's password_hash
      // This invalidates tokens when password is changed
      const user = await this.getUserById(decoded.user_id);
      if (!user) {
        throw new Error('User not found');
      }
      
      if (decoded.password_hash !== user.password_hash) {
        logger.warn('Token invalidated due to password change', {
          userId: decoded.user_id,
          username: decoded.username
        });
        throw new Error('Token invalidated - password changed');
      }
      
      return decoded;
    } catch (error) {
      logger.error('Error verifying token', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Invalid token');
    }
  }

  // Verify refresh token
  static async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'default_secret';
      const decoded = jwt.verify(token, refreshSecret) as RefreshTokenPayload;
      
      // Verify password_hash matches current user's password_hash
      const user = await this.getUserById(decoded.user_id);
      if (!user) {
        throw new Error('User not found');
      }
      
      if (decoded.password_hash !== user.password_hash) {
        logger.warn('Refresh token invalidated due to password change', {
          userId: decoded.user_id
        });
        throw new Error('Refresh token invalidated - password changed');
      }
      
      return decoded;
    } catch (error) {
      logger.error('Error verifying refresh token', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Invalid refresh token');
    }
  }

  // Generate new access token from refresh token
  static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verify refresh token
      const refreshPayload = await this.verifyRefreshToken(refreshToken);
      
      // Get user details
      const user = await this.getUserById(refreshPayload.user_id);
      if (!user) {
        throw new Error('User not found');
      }
      
      if (!user.is_active) {
        throw new Error('User account is inactive');
      }

      // Get user roles
      const client = await dbConnection.getConnection();
      try {
        const rolesResult = await client.query(`
          SELECT r.role_id, r.role_name
          FROM roles r
          INNER JOIN user_details ud ON r.role_id = ud.role_id
          WHERE ud.user_id = $1
        `, [user.id]);

        const roleIds = rolesResult.rows.map((row: { role_id: number }) => row.role_id);

        // Generate new access token
        const accessPayload: JWTPayload = {
          user_id: user.id,
          username: user.username,
          roleIds: roleIds,
          password_hash: user.password_hash
        };
        
        const accessSecret = process.env.JWT_SECRET || 'default_secret';
        const accessExpiresIn: string = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
        const newAccessToken = jwt.sign(accessPayload, accessSecret, { expiresIn: accessExpiresIn } as jwt.SignOptions);

        // Generate new refresh token (rotate refresh token)
        const newRefreshPayload: RefreshTokenPayload = {
          user_id: user.id,
          password_hash: user.password_hash
        };
        
        const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'default_secret';
        const refreshExpiresIn: string = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
        const newRefreshToken = jwt.sign(newRefreshPayload, refreshSecret, { expiresIn: refreshExpiresIn } as jwt.SignOptions);

        return {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        };
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error refreshing access token', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Get user by ID (for auth middleware)
  static async getUserById(userId: number): Promise<User | null> {
    try {
      return await UserModel.getUserById(userId);
    } catch (error) {
      logger.error('Error getting user by ID in auth model', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      return null;
    }
  }

  // Refresh user permissions from database (by slug)
  static async refreshUserPermissions(roleIds: number[]): Promise<{ [pageSlug: string]: { show: boolean; create: boolean; edit: boolean; delete: boolean } }> {
    try {
      const client = await dbConnection.getConnection();
      try {
        // Get user permissions from all roles (merged) - using slug
        const permissionsResult = await client.query(`
          SELECT 
            p.slug,
            MAX(rd.show::int)::boolean as show,
            MAX(rd.create::int)::boolean as create,
            MAX(rd.edit::int)::boolean as edit,
            MAX(rd.delete::int)::boolean as delete
          FROM role_details rd
          INNER JOIN pages p ON rd.page_id = p.page_id
          WHERE rd.role_id = ANY($1::int[])
          GROUP BY p.slug
        `, [roleIds]);

        const permissions: { [pageSlug: string]: { show: boolean; create: boolean; edit: boolean; delete: boolean } } = {};
        permissionsResult.rows.forEach((row: { slug: string; show: boolean; create: boolean; edit: boolean; delete: boolean }) => {
          permissions[row.slug] = {
            show: row.show,
            create: row.create,
            edit: row.edit,
            delete: row.delete
          };
        });

        return permissions;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error refreshing user permissions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleIds
      });
      return {};
    }
  }
}

