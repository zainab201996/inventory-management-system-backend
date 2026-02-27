import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Fix Inventory Permissions
 * This migration ensures Admin role has permissions for inventory pages.
 * It's safe to run multiple times (uses ON CONFLICT).
 */
export class FixInventoryPermissions1700000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Assign all permissions to Admin role for inventory pages
    // This will work even if permissions were already assigned (ON CONFLICT)
    await queryRunner.query(`
      INSERT INTO role_details (role_id, page_id, show, "create", edit, "delete")
      SELECT 
        r.role_id,
        p.page_id,
        true, true, true, true
      FROM roles r
      CROSS JOIN pages p
      WHERE r.role_name = 'Admin / IT Cell'
        AND p.page_id IN (50, 51, 52, 53, 54, 55)
      ON CONFLICT (role_id, page_id) DO UPDATE
      SET show = true, "create" = true, edit = true, "delete" = true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove permissions (optional - usually don't revert seed data)
    await queryRunner.query(`
      DELETE FROM role_details 
      WHERE page_id IN (50, 51, 52, 53, 54, 55)
        AND role_id IN (SELECT role_id FROM roles WHERE role_name = 'Admin / IT Cell');
    `);
  }
}
