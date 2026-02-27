import { PoolClient } from 'pg';
import dbConnection from '../../db/connection';
import logger from '../../utils/logger';

export type AuditEventType = 'create' | 'edit' | 'delete';

export interface AuditTrail {
  id: number;
  event_type: AuditEventType;
  page_id: number;
  userid: number;
  timestamp: Date;
  is_action?: boolean;
}

export class AuditTrailModel {
  /**
   * Log an audit trail entry
   * @param eventType - The type of event ('create', 'edit', 'delete')
   * @param pageId - The ID of the page from the pages table
   * @param userId - The ID of the user performing the action
   * @param isAction - Whether this is a status-related action (default: false)
   */
  static async logAudit(
    eventType: AuditEventType,
    pageId: number,
    userId: number,
    isAction: boolean = false
  ): Promise<AuditTrail> {
    const client = await dbConnection.getConnection();
    try {
      const query = `
        INSERT INTO audit_trail (event_type, page_id, userid, is_action)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      const values = [eventType, pageId, userId, isAction];
      const result = await client.query(query, values);
      
      logger.info('Audit trail logged', {
        eventType,
        pageId,
        userId,
        isAction,
        auditId: result.rows[0].id
      });
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error logging audit trail', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        eventType,
        pageId,
        userId,
        isAction
      });
      // Don't throw error - audit trail failures shouldn't break the main operation
      // Return a minimal audit trail object to indicate failure
      return {
        id: 0,
        event_type: eventType,
        page_id: pageId,
        userid: userId,
        timestamp: new Date(),
        is_action: isAction
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get page ID from page slug
   * @param pageSlug - The slug of the page
   * @returns The page ID or null if not found
   */
  static async getPageIdBySlug(pageSlug: string): Promise<number | null> {
    const client = await dbConnection.getConnection();
    try {
      const query = 'SELECT page_id FROM pages WHERE slug = $1';
      const result = await client.query(query, [pageSlug]);
      return result.rows[0]?.page_id || null;
    } catch (error) {
      logger.error('Error getting page ID by slug', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pageSlug
      });
      return null;
    } finally {
      client.release();
    }
  }

  /**
   * Get audit trail entries with pagination
   * @param pagination - Pagination parameters
   * @param filters - Optional filters (pageId, userId, eventType)
   */
  static async getAuditTrails(
    pagination: { page?: number; limit?: number; sort_by?: string; sort_order?: 'asc' | 'desc' } = {},
    filters?: { pageId?: number; userId?: number; eventType?: AuditEventType }
  ): Promise<{ auditTrails: AuditTrail[]; total: number }> {
    const client = await dbConnection.getConnection();
    try {
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const offset = (page - 1) * limit;
      const sortBy = pagination.sort_by || 'timestamp';
      const sortOrder = pagination.sort_order || 'desc';

      // Validate sort_by to prevent SQL injection
      const allowedSortFields = ['id', 'event_type', 'page_id', 'userid', 'timestamp', 'is_action'];
      const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'timestamp';

      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      let paramCount = 0;

      if (filters?.pageId) {
        paramCount++;
        whereConditions.push(`page_id = $${paramCount}`);
        queryParams.push(filters.pageId);
      }

      if (filters?.userId) {
        paramCount++;
        whereConditions.push(`userid = $${paramCount}`);
        queryParams.push(filters.userId);
      }

      if (filters?.eventType) {
        paramCount++;
        whereConditions.push(`event_type = $${paramCount}`);
        queryParams.push(filters.eventType);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const countQuery = `SELECT COUNT(*) FROM audit_trail ${whereClause}`;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      const dataQuery = `
        SELECT * FROM audit_trail
        ${whereClause}
        ORDER BY ${safeSortBy} ${sortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      queryParams.push(limit, offset);

      const result = await client.query(dataQuery, queryParams);
      return { auditTrails: result.rows, total };
    } catch (error) {
      logger.error('Error getting audit trails', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pagination,
        filters
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get audit trail entries with relations (page name, user username) and pagination
   * @param pagination - Pagination parameters
   * @param filters - Optional filters (pageId, userId, eventType)
   */
  static async getAuditTrailsWithRelations(
    pagination: { page?: number; limit?: number; sort_by?: string; sort_order?: 'asc' | 'desc' } = {},
    filters?: { pageId?: number; userId?: number; eventType?: AuditEventType; from_date?: string; to_date?: string; is_action?: boolean }
  ): Promise<{ auditTrails: Array<AuditTrail & { page_name?: string; page_slug?: string; username?: string }>; total: number }> {
    const client = await dbConnection.getConnection();
    try {
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const offset = (page - 1) * limit;
      const sortBy = pagination.sort_by || 'timestamp';
      const sortOrder = pagination.sort_order || 'desc';

      // Validate sort_by to prevent SQL injection
      const allowedSortFields = ['id', 'event_type', 'page_id', 'userid', 'timestamp', 'is_action'];
      const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'timestamp';

      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      let paramCount = 0;

      if (filters?.pageId) {
        paramCount++;
        whereConditions.push(`at.page_id = $${paramCount}`);
        queryParams.push(filters.pageId);
      }

      if (filters?.userId) {
        paramCount++;
        whereConditions.push(`at.userid = $${paramCount}`);
        queryParams.push(filters.userId);
      }

      if (filters?.eventType) {
        paramCount++;
        whereConditions.push(`at.event_type = $${paramCount}`);
        queryParams.push(filters.eventType);
      }

      // Add date filters
      if (filters?.from_date) {
        paramCount++;
        whereConditions.push(`at.timestamp >= $${paramCount}::date`);
        queryParams.push(filters.from_date);
      }
      if (filters?.to_date) {
        paramCount++;
        whereConditions.push(`at.timestamp <= $${paramCount}::date`);
        queryParams.push(filters.to_date);
      }

      // Add is_action filter
      if (filters?.is_action !== undefined) {
        paramCount++;
        whereConditions.push(`at.is_action = $${paramCount}`);
        queryParams.push(filters.is_action);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const countQuery = `
        SELECT COUNT(*) FROM audit_trail at
        ${whereClause}
      `;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      const dataQuery = `
        SELECT 
          at.id,
          at.event_type,
          at.page_id,
          at.userid,
          at.timestamp,
          at.is_action,
          p.page_name,
          p.slug as page_slug,
          u.username
        FROM audit_trail at
        LEFT JOIN pages p ON at.page_id = p.page_id
        LEFT JOIN users u ON at.userid = u.id
        ${whereClause}
        ORDER BY at.${safeSortBy} ${sortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      queryParams.push(limit, offset);

      const result = await client.query(dataQuery, queryParams);
      return { auditTrails: result.rows, total };
    } catch (error) {
      logger.error('Error getting audit trails with relations', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pagination,
        filters
      });
      throw error;
    } finally {
      client.release();
    }
  }
}
