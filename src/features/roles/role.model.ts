import { PoolClient } from 'pg';
import dbConnection from '../../db/connection';
import { Role, CreateRoleRequest, UpdateRoleRequest, PaginationParams } from '../../types';
import logger from '../../utils/logger';

export class RoleModel {
  static async createRole(roleData: CreateRoleRequest): Promise<Role> {
    const client = await dbConnection.getConnection();
    try {
      const query = `
        INSERT INTO roles (role_name)
        VALUES ($1)
        RETURNING *
      `;
      
      const values = [roleData.role_name];
      const result = await client.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating role', {
        error: error instanceof Error ? error.message : 'Unknown error',
        role_name: roleData.role_name
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getRoleById(id: number): Promise<Role | null> {
    const client = await dbConnection.getConnection();
    try {
      const query = 'SELECT * FROM roles WHERE role_id = $1';
      const result = await client.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting role by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: id
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getRoles(pagination: PaginationParams = {}): Promise<{ roles: Role[]; total: number }> {
    const client = await dbConnection.getConnection();
    try {
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const offset = (page - 1) * limit;
      const sortBy = pagination.sort_by || 'created_at';
      const sortOrder = pagination.sort_order || 'desc';

      const countQuery = 'SELECT COUNT(*) FROM roles';
      const countResult = await client.query(countQuery);
      const total = parseInt(countResult.rows[0].count);

      const dataQuery = `
        SELECT * FROM roles
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $1 OFFSET $2
      `;

      const result = await client.query(dataQuery, [limit, offset]);
      return { roles: result.rows, total };
    } catch (error) {
      logger.error('Error getting roles', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getAllRoles(): Promise<Role[]> {
    const client = await dbConnection.getConnection();
    try {
      const query = 'SELECT * FROM roles ORDER BY role_name';
      const result = await client.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting all roles', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateRole(id: number, roleData: UpdateRoleRequest): Promise<Role | null> {
    const client = await dbConnection.getConnection();
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      if (roleData.role_name !== undefined) {
        paramCount++;
        updateFields.push(`role_name = $${paramCount}`);
        values.push(roleData.role_name);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      paramCount++;
      values.push(id);

      const query = `
        UPDATE roles 
        SET ${updateFields.join(', ')}
        WHERE role_id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating role', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: id
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteRole(id: number): Promise<{ success: boolean; message: string }> {
    const client = await dbConnection.getConnection();
    try {
      await client.query('BEGIN');

      const roleQuery = 'SELECT * FROM roles WHERE role_id = $1';
      const roleResult = await client.query(roleQuery, [id]);
      
      if (roleResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Role not found' };
      }

      const deleteQuery = 'DELETE FROM roles WHERE role_id = $1';
      const result = await client.query(deleteQuery, [id]);

      await client.query('COMMIT');
      
      if ((result.rowCount ?? 0) > 0) {
        return { success: true, message: 'Role deleted successfully' };
      } else {
        return { success: false, message: 'Failed to delete role' };
      }
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting role', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId: id
      });
      throw error;
    } finally {
      client.release();
    }
  }
}

