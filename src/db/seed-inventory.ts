import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { Page } from '../entities/core/Page';
import { Role } from '../entities/core/Role';
import { RoleDetail } from '../entities/core/RoleDetail';
import logger from '../utils/logger';

/**
 * Seed inventory pages and assign permissions to Admin role
 * Run this script after migrations: npm run seed:inventory
 */
async function seedInventoryPages() {
  try {
    await AppDataSource.initialize();
    logger.info('TypeORM DataSource initialized for seeding');

    const pageRepository = AppDataSource.getRepository(Page);
    const roleRepository = AppDataSource.getRepository(Role);
    const roleDetailRepository = AppDataSource.getRepository(RoleDetail);

    // Inventory pages to create
    const inventoryPages = [
      {
        page_id: 50,
        page_name: 'Stores',
        slug: 'stores',
        is_report: false,
        is_action: false,
        description: 'Manage store locations',
      },
      {
        page_id: 51,
        page_name: 'Items',
        slug: 'items',
        is_report: false,
        is_action: false,
        description: 'Manage product items',
      },
      {
        page_id: 52,
        page_name: 'Rates',
        slug: 'rates',
        is_report: false,
        is_action: false,
        description: 'Manage item pricing/rates',
      },
      {
        page_id: 53,
        page_name: 'Store Transfer Notes',
        slug: 'store-transfer-notes',
        is_report: false,
        is_action: false,
        description: 'Manage stock transfers between stores',
      },
      {
        page_id: 54,
        page_name: 'Stock Report',
        slug: 'stock-report',
        is_report: true,
        is_action: false,
        description: 'View stock reports with filters',
      },
      {
        page_id: 55,
        page_name: 'Stock Transfer Detail',
        slug: 'stock-transfer-detail',
        is_report: true,
        is_action: false,
        description: 'View detailed stock transfer reports',
      },
    ];

    // Create pages
    logger.info('Creating inventory pages...');
    for (const pageData of inventoryPages) {
      const existingPage = await pageRepository.findOne({
        where: { page_id: pageData.page_id },
      });

      if (!existingPage) {
        const page = pageRepository.create(pageData);
        await pageRepository.save(page);
        logger.info(`Created page: ${pageData.page_name} (${pageData.slug})`);
      } else {
        logger.info(`Page already exists: ${pageData.page_name} (${pageData.slug})`);
      }
    }

    // Get Admin role
    const adminRole = await roleRepository.findOne({
      where: { role_name: 'Admin / IT Cell' },
    });

    if (!adminRole) {
      logger.warn('Admin role not found. Please create it first.');
      return;
    }

    // Assign permissions to Admin role
    logger.info('Assigning permissions to Admin role...');
    for (const pageData of inventoryPages) {
      const page = await pageRepository.findOne({
        where: { page_id: pageData.page_id },
      });

      if (page) {
        const existingRoleDetail = await roleDetailRepository.findOne({
          where: {
            role_id: adminRole.role_id,
            page_id: page.page_id,
          },
        });

        if (!existingRoleDetail) {
          const roleDetail = roleDetailRepository.create({
            role_id: adminRole.role_id,
            page_id: page.page_id,
            show: true,
            create: true,
            edit: true,
            delete: true,
          });
          await roleDetailRepository.save(roleDetail);
          logger.info(`Assigned permissions for ${pageData.page_name} to Admin role`);
        } else {
          logger.info(`Permissions already exist for ${pageData.page_name}`);
        }
      }
    }

    logger.info('Inventory pages seeding completed successfully');
  } catch (error) {
    logger.error('Error seeding inventory pages', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  } finally {
    await AppDataSource.destroy();
    logger.info('TypeORM DataSource closed');
  }
}

// Run if executed directly
if (require.main === module) {
  seedInventoryPages()
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
