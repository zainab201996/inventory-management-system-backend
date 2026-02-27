import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryPages1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add inventory pages
    await queryRunner.query(`
      INSERT INTO pages (page_id, page_name, slug, is_report, is_action, description)
      VALUES
        (50, 'Stores', 'stores', false, false, 'Manage store locations'),
        (51, 'Items', 'items', false, false, 'Manage product items'),
        (52, 'Rates', 'rates', false, false, 'Manage item pricing/rates'),
        (53, 'Store Transfer Notes', 'store-transfer-notes', false, false, 'Manage stock transfers between stores'),
        (54, 'Stock Report', 'stock-report', true, false, 'View stock reports with filters'),
        (55, 'Stock Transfer Detail', 'stock-transfer-detail', true, false, 'View detailed stock transfer reports')
      ON CONFLICT (page_id) DO NOTHING;
    `);

    // Assign all permissions to Admin role for inventory pages
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
      ON CONFLICT (role_id, page_id) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove role details for inventory pages
    await queryRunner.query(`
      DELETE FROM role_details 
      WHERE page_id IN (50, 51, 52, 53, 54, 55);
    `);

    // Remove inventory pages
    await queryRunner.query(`
      DELETE FROM pages 
      WHERE page_id IN (50, 51, 52, 53, 54, 55);
    `);
  }
}
