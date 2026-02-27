import 'reflect-metadata';
import { PoolClient } from 'pg';
import dbConnection from '../db/connection';
import logger from '../utils/logger';

/**
 * Seed inventory pages using raw SQL (since pages table exists from init-database.sql)
 * Run this script: npm run seed:inventory-pages
 */
async function seedInventoryPages() {
  const client = await dbConnection.getConnection();
  
  try {
    // Check if pages table exists
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pages'
      );
    `;
    const tableExists = await client.query(checkTableQuery);
    
    if (!tableExists.rows[0].exists) {
      logger.error('Pages table does not exist. Please run init-database.sql first.');
      logger.info('To initialize database, run: psql -U postgres -d postgres -f init-database.sql');
      throw new Error('Pages table does not exist. Please initialize database first.');
    }

    await client.query('BEGIN');
    logger.info('Starting inventory pages seeding...');

    // Insert inventory pages
    const insertPagesQuery = `
      INSERT INTO pages (page_id, page_name, slug, is_report, is_action, description)
      VALUES
        (50, 'Stores', 'stores', false, false, 'Manage store locations'),
        (51, 'Items', 'items', false, false, 'Manage product items'),
        (52, 'Rates', 'rates', false, false, 'Manage item pricing/rates'),
        (53, 'Store Transfer Notes', 'store-transfer-notes', false, false, 'Manage stock transfers between stores'),
        (54, 'Stock Report', 'stock-report', true, false, 'View stock reports with filters'),
        (55, 'Stock Transfer Detail', 'stock-transfer-detail', true, false, 'View detailed stock transfer reports')
      ON CONFLICT (page_id) DO NOTHING
      RETURNING page_id, page_name, slug;
    `;

    const pagesResult = await client.query(insertPagesQuery);
    logger.info(`Created ${pagesResult.rows.length} inventory pages`);

    // Assign permissions to Admin role
    const assignPermissionsQuery = `
      INSERT INTO role_details (role_id, page_id, show, "create", edit, "delete")
      SELECT 
        r.role_id,
        p.page_id,
        true, true, true, true
      FROM roles r
      CROSS JOIN pages p
      WHERE r.role_name = 'Admin / IT Cell'
        AND p.page_id IN (50, 51, 52, 53, 54, 55)
      ON CONFLICT (role_id, page_id) DO NOTHING
      RETURNING role_id, page_id;
    `;

    const permissionsResult = await client.query(assignPermissionsQuery);
    logger.info(`Assigned permissions for ${permissionsResult.rows.length} pages to Admin role`);

    await client.query('COMMIT');
    logger.info('Inventory pages seeding completed successfully');

    // Verify
    const verifyQuery = `
      SELECT 
        p.page_id,
        p.page_name,
        p.slug,
        p.is_report,
        p.is_action,
        COUNT(rd.id) as permission_count
      FROM pages p
      LEFT JOIN role_details rd ON p.page_id = rd.page_id
      WHERE p.page_id IN (50, 51, 52, 53, 54, 55)
      GROUP BY p.page_id, p.page_name, p.slug, p.is_report, p.is_action
      ORDER BY p.page_id;
    `;

    const verifyResult = await client.query(verifyQuery);
    logger.info('Inventory pages verification:', verifyResult.rows);

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error seeding inventory pages', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  } finally {
    client.release();
  }
}

// Run if executed directly
if (require.main === module) {
  dbConnection.initPool()
    .then(() => {
      return seedInventoryPages();
    })
    .then(() => {
      logger.info('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding failed', error);
      process.exit(1);
    });
}

export default seedInventoryPages;
