import { PoolClient } from 'pg';
import dbConnection from '../../db/connection';
import { Page, CreatePageRequest, UpdatePageRequest, PaginationParams } from '../../types';
import logger from '../../utils/logger';

export class PageModel {
  static async createPage(pageData: CreatePageRequest): Promise<Page> {
    const client = await dbConnection.getConnection();
    try {
      // Generate slug from page_name if not provided
      let slug = pageData.slug;
      if (!slug) {
        slug = pageData.page_name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }
      
      const query = `
        INSERT INTO pages (page_name, slug, description, is_report, is_action)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const values = [pageData.page_name, slug, pageData.description ?? null, pageData.is_report ?? false, pageData.is_action ?? false];
      const result = await client.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating page', {
        error: error instanceof Error ? error.message : 'Unknown error',
        page_name: pageData.page_name
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getPageById(id: number): Promise<Page | null> {
    const client = await dbConnection.getConnection();
    try {
      const query = 'SELECT * FROM pages WHERE page_id = $1';
      const result = await client.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting page by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pageId: id
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getPages(pagination: PaginationParams = {}): Promise<{ pages: Page[]; total: number }> {
    const client = await dbConnection.getConnection();
    try {
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const offset = (page - 1) * limit;
      const sortBy = pagination.sort_by || 'created_at';
      const sortOrder = pagination.sort_order || 'desc';

      const countQuery = 'SELECT COUNT(*) FROM pages';
      const countResult = await client.query(countQuery);
      const total = parseInt(countResult.rows[0].count);

      const dataQuery = `
        SELECT * FROM pages
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $1 OFFSET $2
      `;

      const result = await client.query(dataQuery, [limit, offset]);
      return { pages: result.rows, total };
    } catch (error) {
      logger.error('Error getting pages', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getAllPages(): Promise<Page[]> {
    const client = await dbConnection.getConnection();
    try {
      const query = 'SELECT * FROM pages ORDER BY page_name';
      const result = await client.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting all pages', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getPageBySlug(slug: string): Promise<Page | null> {
    const client = await dbConnection.getConnection();
    try {
      const query = 'SELECT * FROM pages WHERE slug = $1';
      const result = await client.query(query, [slug]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting page by slug', {
        error: error instanceof Error ? error.message : 'Unknown error',
        slug
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async updatePage(id: number, pageData: UpdatePageRequest): Promise<Page | null> {
    const client = await dbConnection.getConnection();
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      if (pageData.page_name !== undefined) {
        paramCount++;
        updateFields.push(`page_name = $${paramCount}`);
        values.push(pageData.page_name);
      }

      if (pageData.slug !== undefined) {
        paramCount++;
        updateFields.push(`slug = $${paramCount}`);
        values.push(pageData.slug);
      }

      if (pageData.description !== undefined) {
        paramCount++;
        updateFields.push(`description = $${paramCount}`);
        values.push(pageData.description);
      }

      if (pageData.is_report !== undefined) {
        paramCount++;
        updateFields.push(`is_report = $${paramCount}`);
        values.push(pageData.is_report);
      }

      if (pageData.is_action !== undefined) {
        paramCount++;
        updateFields.push(`is_action = $${paramCount}`);
        values.push(pageData.is_action);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      paramCount++;
      values.push(id);

      const query = `
        UPDATE pages 
        SET ${updateFields.join(', ')}
        WHERE page_id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating page', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pageId: id
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async deletePage(id: number): Promise<{ success: boolean; message: string }> {
    const client = await dbConnection.getConnection();
    try {
      await client.query('BEGIN');

      const pageQuery = 'SELECT * FROM pages WHERE page_id = $1';
      const pageResult = await client.query(pageQuery, [id]);
      
      if (pageResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Page not found' };
      }

      const deleteQuery = 'DELETE FROM pages WHERE page_id = $1';
      const result = await client.query(deleteQuery, [id]);

      await client.query('COMMIT');
      
      if ((result.rowCount ?? 0) > 0) {
        return { success: true, message: 'Page deleted successfully' };
      } else {
        return { success: false, message: 'Failed to delete page' };
      }
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting page', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pageId: id
      });
      throw error;
    } finally {
      client.release();
    }
  }
}
