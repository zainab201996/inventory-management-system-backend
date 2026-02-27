import { PoolClient } from 'pg';
import dbConnection from '../../db/connection';
import { User, CreateUserRequest, UpdateUserRequest, UpdatePasswordRequest, PaginationParams, UserWithRelations } from '../../types';
import logger from '../../utils/logger';
import bcrypt from 'bcryptjs';

export class UserModel {
  static async createUser(userData: CreateUserRequest): Promise<User> {
    const client = await dbConnection.getConnection();
    try {
      await client.query('BEGIN');
      
      const passwordHash = await bcrypt.hash(userData.password, 10);
      
      const userQuery = `
        INSERT INTO users (username, password_hash, sap_code, email, p_num, full_name)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const userValues = [
        userData.username,
        passwordHash,
        userData.sap_code ?? null,
        userData.email ?? null,
        userData.p_num ?? null,
        userData.full_name ?? null,
      ];

      const userResult = await client.query(userQuery, userValues);
      const newUser = userResult.rows[0];

      // Insert user roles into user_details
      if (userData.role_ids && userData.role_ids.length > 0) {
        for (const roleId of userData.role_ids) {
          await client.query(`
            INSERT INTO user_details (user_id, role_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, role_id) DO NOTHING
          `, [newUser.id, roleId]);
        }
      }

      await client.query('COMMIT');
      return newUser;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        username: userData.username
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getUserById(id: number): Promise<UserWithRelations | null> {
    const client = await dbConnection.getConnection();
    try {
      const userQuery = `
        SELECT 
          u.*
        FROM users u
        WHERE u.id = $1
      `;
      const userResult = await client.query(userQuery, [id]);
      
      if (userResult.rows.length === 0) return null;
      
      const user = userResult.rows[0];

      // Get user roles
      const rolesQuery = `
        SELECT r.role_id, r.role_name, ud.created_at
        FROM roles r
        INNER JOIN user_details ud ON r.role_id = ud.role_id
        WHERE ud.user_id = $1
      `;
      const rolesResult = await client.query(rolesQuery, [id]);
      const roles = rolesResult.rows.map((row: { role_id: number; role_name: string; created_at: Date }) => ({
        role_id: row.role_id,
        role_name: row.role_name,
        created_at: row.created_at
      }));

      return {
        ...user,
        roles: roles.length > 0 ? roles : undefined
      };
    } catch (error) {
      logger.error('Error getting user by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: id
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getUsers(pagination: PaginationParams = {}, search?: string): Promise<{ users: UserWithRelations[]; total: number }> {
    const client = await dbConnection.getConnection();
    try {
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const offset = (page - 1) * limit;
      const sortBy = pagination.sort_by || 'created_at';
      const sortOrder = pagination.sort_order || 'desc';

      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        whereConditions.push(`(u.username ILIKE $${paramCount})`);
        queryParams.push(`%${search}%`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const countQuery = `
        SELECT COUNT(*) FROM users u ${whereClause}
      `;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      const dataQuery = `
        SELECT 
          u.*
        FROM users u
        ${whereClause}
        ORDER BY u.${sortBy} ${sortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      queryParams.push(limit, offset);

      const result = await client.query(dataQuery, queryParams);
      
      // Get roles for all users
      const userIds = result.rows.map((row: any) => row.id);
      let usersWithRoles: any[] = [];
      
      if (userIds.length > 0) {
        const rolesQuery = `
          SELECT 
            ud.user_id,
            r.role_id,
            r.role_name,
            ud.created_at
          FROM user_details ud
          INNER JOIN roles r ON ud.role_id = r.role_id
          WHERE ud.user_id = ANY($1::int[])
        `;
        const rolesResult = await client.query(rolesQuery, [userIds]);
        
        const rolesByUserId: { [userId: number]: any[] } = {};
        rolesResult.rows.forEach((row: { user_id: number; role_id: number; role_name: string; created_at: Date }) => {
          if (!rolesByUserId[row.user_id]) {
            rolesByUserId[row.user_id] = [];
          }
          rolesByUserId[row.user_id].push({
            role_id: row.role_id,
            role_name: row.role_name,
            created_at: row.created_at
          });
        });

        usersWithRoles = result.rows.map((row: any) => ({
          ...row,
          roles: rolesByUserId[row.id] || undefined
        }));
      } else {
        usersWithRoles = result.rows;
      }
      
      const users = usersWithRoles;
      
      return { users, total };
    } catch (error) {
      logger.error('Error getting users', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pagination,
        search
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateUser(id: number, userData: UpdateUserRequest): Promise<User | null> {
    const client = await dbConnection.getConnection();
    try {
      await client.query('BEGIN');

      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      if (userData.password) {
        const passwordHash = await bcrypt.hash(userData.password, 10);
        paramCount++;
        updateFields.push(`password_hash = $${paramCount}`);
        values.push(passwordHash);
      }

      Object.entries(userData).forEach(([key, value]) => {
        if (value !== undefined && key !== 'password' && key !== 'role_ids') {
          paramCount++;
          updateFields.push(`${key} = $${paramCount}`);
          values.push(value);
        }
      });

      if (updateFields.length > 0) {
        paramCount++;
        values.push(id);

        const query = `
          UPDATE users 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramCount}
          RETURNING *
        `;

        await client.query(query, values);
      }

      // Update user roles if provided
      if (userData.role_ids !== undefined) {
        // Delete existing roles
        await client.query('DELETE FROM user_details WHERE user_id = $1', [id]);
        
        // Insert new roles
        if (userData.role_ids.length > 0) {
          for (const roleId of userData.role_ids) {
            await client.query(`
              INSERT INTO user_details (user_id, role_id)
              VALUES ($1, $2)
            `, [id, roleId]);
          }
        }
      }

      await client.query('COMMIT');

      // Get updated user
      const updatedUser = await this.getUserById(id);
      return updatedUser;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: id,
        userData
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update user password - requires current password verification
   * Users can only update their own password
   */
  static async updatePassword(userId: number, passwordData: UpdatePasswordRequest): Promise<{ success: boolean; message: string }> {
    const client = await dbConnection.getConnection();
    try {
      await client.query('BEGIN');

      // Get user with password hash
      const userQuery = 'SELECT id, password_hash FROM users WHERE id = $1';
      const userResult = await client.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, message: 'User not found' };
      }

      const user = userResult.rows[0];

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(passwordData.current_password, user.password_hash);
      if (!isCurrentPasswordValid) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Current password is incorrect' };
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(passwordData.new_password, 10);

      // Update password
      const updateQuery = 'UPDATE users SET password_hash = $1 WHERE id = $2';
      const result = await client.query(updateQuery, [newPasswordHash, userId]);

      await client.query('COMMIT');
      
      if ((result.rowCount ?? 0) > 0) {
        return { success: true, message: 'Password updated successfully' };
      } else {
        return { success: false, message: 'Failed to update password' };
      }
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating password', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteUser(id: number): Promise<{ success: boolean; message: string }> {
    const client = await dbConnection.getConnection();
    try {
      await client.query('BEGIN');

      const userQuery = 'SELECT * FROM users WHERE id = $1';
      const userResult = await client.query(userQuery, [id]);
      
      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, message: 'User not found' };
      }

      const deleteQuery = 'DELETE FROM users WHERE id = $1';
      const result = await client.query(deleteQuery, [id]);

      await client.query('COMMIT');
      
      if ((result.rowCount ?? 0) > 0) {
        return { success: true, message: 'User deleted successfully' };
      } else {
        return { success: false, message: 'Failed to delete user' };
      }
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: id
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getUserByUsername(username: string): Promise<User | null> {
    const client = await dbConnection.getConnection();
    try {
      const query = 'SELECT * FROM users WHERE username = $1';
      const result = await client.query(query, [username]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting user by username', {
        error: error instanceof Error ? error.message : 'Unknown error',
        username
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getUserAccessDetails(userId: number): Promise<{
    user: UserWithRelations;
    roles: Array<{
      role_id: number;
      role_name: string;
      created_at: Date;
    }>;
    permissions: Array<{
      page_id: number;
      slug: string;
      show: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
      role_id: number;
      role_name: string;
    }>;
    aggregatedPermissions: { [pageSlug: string]: { show: boolean; create: boolean; edit: boolean; delete: boolean } };
  } | null> {
    const client = await dbConnection.getConnection();
    try {
      // Get user with relations
      const user = await this.getUserById(userId);
      if (!user) {
        return null;
      }

      // Get user's roles
      const rolesQuery = `
        SELECT r.role_id, r.role_name, ud.created_at
        FROM roles r
        INNER JOIN user_details ud ON r.role_id = ud.role_id
        WHERE ud.user_id = $1
        ORDER BY r.role_name
      `;
      const rolesResult = await client.query(rolesQuery, [userId]);
      const roles = rolesResult.rows.map((row: { role_id: number; role_name: string; created_at: Date }) => ({
        role_id: row.role_id,
        role_name: row.role_name,
        created_at: row.created_at
      }));

      if (roles.length === 0) {
        return {
          user,
          roles: [],
          permissions: [],
          aggregatedPermissions: {}
        };
      }

      const roleIds = roles.map(r => r.role_id);

      // Get permissions for all roles
      const permissionsQuery = `
        SELECT 
          rd.id,
          rd.role_id,
          rd.page_id,
          rd.show,
          rd."create",
          rd.edit,
          rd."delete",
          r.role_name,
          p.page_name,
          p.slug
        FROM role_details rd
        INNER JOIN roles r ON rd.role_id = r.role_id
        INNER JOIN pages p ON rd.page_id = p.page_id
        WHERE rd.role_id = ANY($1::int[])
        ORDER BY p.page_name, r.role_name
      `;
      const permissionsResult = await client.query(permissionsQuery, [roleIds]);

      const permissions = permissionsResult.rows.map((row: any) => ({
        page_id: row.page_id,
        slug: row.slug,
        show: row.show,
        create: row.create,
        edit: row.edit,
        delete: row.delete,
        role_id: row.role_id,
        role_name: row.role_name
      }));

      // Aggregate permissions by page slug (merge from all roles - if any role has permission, user has it)
      const aggregatedPermissions: { [pageSlug: string]: { show: boolean; create: boolean; edit: boolean; delete: boolean } } = {};
      
      permissionsResult.rows.forEach((row: any) => {
        const pageSlug = row.slug;
        if (!aggregatedPermissions[pageSlug]) {
          aggregatedPermissions[pageSlug] = {
            show: false,
            create: false,
            edit: false,
            delete: false
          };
        }
        // Merge permissions - if any role has permission, set to true
        aggregatedPermissions[pageSlug].show = aggregatedPermissions[pageSlug].show || row.show;
        aggregatedPermissions[pageSlug].create = aggregatedPermissions[pageSlug].create || row.create;
        aggregatedPermissions[pageSlug].edit = aggregatedPermissions[pageSlug].edit || row.edit;
        aggregatedPermissions[pageSlug].delete = aggregatedPermissions[pageSlug].delete || row.delete;
      });

      return {
        user,
        roles,
        permissions,
        aggregatedPermissions
      };
    } catch (error) {
      logger.error('Error getting user access details', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    } finally {
      client.release();
    }
  }
}

