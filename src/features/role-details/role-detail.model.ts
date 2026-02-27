import dbConnection from '../../db/connection';
import { RoleDetail, RoleDetailWithRelations, CreateRoleDetailRequest, UpdateRoleDetailRequest, PaginationParams } from '../../types';
import logger from '../../utils/logger';

export class RoleDetailModel {
  static async createRoleDetail(detailData: CreateRoleDetailRequest): Promise<RoleDetail> {
    const client = await dbConnection.getConnection();
    try {
      const query = `
        INSERT INTO role_details (role_id, page_id, show, "create", edit, "delete")
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const values = [
        detailData.role_id,
        detailData.page_id,
        detailData.show ?? false,
        detailData.create ?? false,
        detailData.edit ?? false,
        detailData.delete ?? false
      ];
      const result = await client.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating role detail', {
        error: error instanceof Error ? error.message : 'Unknown error',
        role_id: detailData.role_id,
        page_id: detailData.page_id
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getRoleDetailById(id: number): Promise<RoleDetailWithRelations | null> {
    const client = await dbConnection.getConnection();
    try {
      const query = `
        SELECT 
          rd.*,
          r.role_id as role_role_id,
          r.role_name,
          p.page_id as page_page_id,
          p.page_name,
          p.slug as page_slug,
          p.is_report as page_is_report,
          p.is_action as page_is_action
        FROM role_details rd
        LEFT JOIN roles r ON rd.role_id = r.role_id
        LEFT JOIN pages p ON rd.page_id = p.page_id
        WHERE rd.id = $1
      `;
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        role_id: row.role_id,
        page_id: row.page_id,
        show: row.show,
        create: row.create,
        edit: row.edit,
        delete: row.delete,
        created_at: row.created_at,
        role: row.role_role_id ? {
          role_id: row.role_role_id,
          role_name: row.role_name,
          created_at: row.created_at
        } : undefined,
        page: row.page_page_id ? {
          page_id: row.page_page_id,
          page_name: row.page_name,
          slug: row.page_slug,
          is_report: row.page_is_report ?? false,
          is_action: row.page_is_action ?? false,
          created_at: row.created_at
        } : undefined
      };
    } catch (error) {
      logger.error('Error getting role detail by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        detailId: id
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getRoleDetails(pagination: PaginationParams = {}, role_id?: number): Promise<{ details: RoleDetailWithRelations[]; total: number }> {
    const client = await dbConnection.getConnection();
    try {
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const offset = (page - 1) * limit;
      const sortBy = pagination.sort_by || 'created_at';
      const sortOrder = pagination.sort_order || 'desc';

      let countQuery = 'SELECT COUNT(*) FROM role_details';
      const countParams: any[] = [];
      
      if (role_id) {
        countQuery += ' WHERE role_id = $1';
        countParams.push(role_id);
      }

      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      let dataQuery = `
        SELECT 
          rd.*,
          r.role_id as role_role_id,
          r.role_name,
          p.page_id as page_page_id,
          p.page_name,
          p.slug as page_slug,
          p.is_report as page_is_report,
          p.is_action as page_is_action
        FROM role_details rd
        LEFT JOIN roles r ON rd.role_id = r.role_id
        LEFT JOIN pages p ON rd.page_id = p.page_id
      `;

      const dataParams: any[] = [];
      if (role_id) {
        dataQuery += ' WHERE rd.role_id = $1';
        dataParams.push(role_id);
      }

      dataQuery += ` ORDER BY rd.${sortBy} ${sortOrder} LIMIT $${dataParams.length + 1} OFFSET $${dataParams.length + 2}`;
      dataParams.push(limit, offset);

      const result = await client.query(dataQuery, dataParams);
      
      const details = result.rows.map(row => ({
        id: row.id,
        role_id: row.role_id,
        page_id: row.page_id,
        show: row.show,
        create: row.create,
        edit: row.edit,
        delete: row.delete,
        created_at: row.created_at,
        role: row.role_role_id ? {
          role_id: row.role_role_id,
          role_name: row.role_name,
          created_at: row.created_at
        } : undefined,
        page: row.page_page_id ? {
          page_id: row.page_page_id,
          page_name: row.page_name,
          slug: row.page_slug,
          is_report: row.page_is_report ?? false,
          is_action: row.page_is_action ?? false,
          created_at: row.created_at
        } : undefined
      }));

      return { details, total };
    } catch (error) {
      logger.error('Error getting role details', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getAllRoleDetailsByRole(role_id: number): Promise<RoleDetailWithRelations[]> {
    const client = await dbConnection.getConnection();
    try {
      const query = `
        SELECT 
          rd.*,
          r.role_id as role_role_id,
          r.role_name,
          p.page_id as page_page_id,
          p.page_name,
          p.slug as page_slug,
          p.is_report as page_is_report,
          p.is_action as page_is_action
        FROM role_details rd
        LEFT JOIN roles r ON rd.role_id = r.role_id
        LEFT JOIN pages p ON rd.page_id = p.page_id
        WHERE rd.role_id = $1
        ORDER BY rd.id
      `;
      const result = await client.query(query, [role_id]);
      
      return result.rows.map(row => ({
        id: row.id,
        role_id: row.role_id,
        page_id: row.page_id,
        show: row.show,
        create: row.create,
        edit: row.edit,
        delete: row.delete,
        created_at: row.created_at,
        role: row.role_role_id ? {
          role_id: row.role_role_id,
          role_name: row.role_name,
          created_at: row.created_at
        } : undefined,
        page: row.page_page_id ? {
          page_id: row.page_page_id,
          page_name: row.page_name,
          slug: row.page_slug,
          is_report: row.page_is_report ?? false,
          is_action: row.page_is_action ?? false,
          created_at: row.created_at
        } : undefined
      }));
    } catch (error) {
      logger.error('Error getting all role details by role', {
        error: error instanceof Error ? error.message : 'Unknown error',
        role_id
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateRoleDetail(id: number, detailData: UpdateRoleDetailRequest): Promise<RoleDetail | null> {
    const client = await dbConnection.getConnection();
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      // Quote reserved keywords like 'create' and 'delete'
      Object.entries(detailData).forEach(([key, value]) => {
        if (value !== undefined) {
          paramCount++;
          const columnName = key === 'create' || key === 'delete' ? `"${key}"` : key;
          updateFields.push(`${columnName} = $${paramCount}`);
          values.push(value);
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      paramCount++;
      values.push(id);

      const query = `
        UPDATE role_details 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating role detail', {
        error: error instanceof Error ? error.message : 'Unknown error',
        detailId: id
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteRoleDetail(id: number): Promise<{ success: boolean; message: string }> {
    const client = await dbConnection.getConnection();
    try {
      await client.query('BEGIN');

      const detailQuery = 'SELECT * FROM role_details WHERE id = $1';
      const detailResult = await client.query(detailQuery, [id]);
      
      if (detailResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Role detail not found' };
      }

      const deleteQuery = 'DELETE FROM role_details WHERE id = $1';
      const result = await client.query(deleteQuery, [id]);

      await client.query('COMMIT');
      
      if ((result.rowCount ?? 0) > 0) {
        return { success: true, message: 'Role detail deleted successfully' };
      } else {
        return { success: false, message: 'Failed to delete role detail' };
      }
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting role detail', {
        error: error instanceof Error ? error.message : 'Unknown error',
        detailId: id
      });
      throw error;
    } finally {
      client.release();
    }
  }
}
