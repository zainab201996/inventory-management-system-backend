import 'reflect-metadata';
import { PoolClient } from 'pg';
import dbConnection from '../db/connection';
import logger from '../utils/logger';

/**
 * Verify that inventory setup is complete
 * Run: npm run verify:setup
 */
async function verifySetup() {
  const client = await dbConnection.getConnection();
  
  try {
    logger.info('Verifying inventory setup...');

    // Check if pages table exists
    const checkPagesTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pages'
      );
    `);

    if (!checkPagesTable.rows[0].exists) {
      logger.error('❌ Pages table does not exist. Run init-database.sql first.');
      return false;
    }
    logger.info('✅ Pages table exists');

    // Check if inventory pages exist
    const checkInventoryPages = await client.query(`
      SELECT COUNT(*) as count 
      FROM pages 
      WHERE page_id IN (50, 51, 52, 53, 54, 55);
    `);

    const pageCount = parseInt(checkInventoryPages.rows[0].count);
    if (pageCount < 6) {
      logger.warn(`⚠️  Only ${pageCount}/6 inventory pages found. Run seed-inventory-pages.sql`);
      return false;
    }
    logger.info(`✅ All ${pageCount} inventory pages exist`);

    // Check if inventory tables exist
    const inventoryTables = ['stores', 'items', 'rates', 'opening_stocks', 'store_transfer_notes', 'store_transfer_note_details', 'stock_movements'];
    let allTablesExist = true;

    for (const table of inventoryTables) {
      const checkTable = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);

      if (checkTable.rows[0].exists) {
        logger.info(`✅ Table '${table}' exists`);
      } else {
        logger.error(`❌ Table '${table}' does not exist`);
        allTablesExist = false;
      }
    }

    if (!allTablesExist) {
      logger.error('❌ Some inventory tables are missing. Run migrations first.');
      return false;
    }

    // Check if Admin role has permissions
    const checkPermissions = await client.query(`
      SELECT COUNT(*) as count
      FROM role_details rd
      INNER JOIN roles r ON rd.role_id = r.role_id
      INNER JOIN pages p ON rd.page_id = p.page_id
      WHERE r.role_name = 'Admin / IT Cell'
        AND p.page_id IN (50, 51, 52, 53, 54, 55);
    `);

    const permissionCount = parseInt(checkPermissions.rows[0].count);
    if (permissionCount < 6) {
      logger.warn(`⚠️  Only ${permissionCount}/6 permissions assigned to Admin. Run seed-inventory-pages.sql`);
      return false;
    }
    logger.info(`✅ Admin role has permissions for all ${permissionCount} inventory pages`);

    logger.info('✅✅✅ All checks passed! Inventory system is ready to use.');
    return true;

  } catch (error) {
    logger.error('Error verifying setup', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  } finally {
    client.release();
  }
}

// Run if executed directly
if (require.main === module) {
  dbConnection.initPool()
    .then(() => {
      return verifySetup();
    })
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      logger.error('Verification failed', error);
      process.exit(1);
    });
}

export default verifySetup;
