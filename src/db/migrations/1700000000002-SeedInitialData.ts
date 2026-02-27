import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcryptjs';

/**
 * Migration: Seed Initial Data
 * This migration seeds initial data including admin role, admin user, and basic pages.
 * Run this after core tables and inventory tables are created.
 */
export class SeedInitialData1700000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert Admin role
    await queryRunner.query(`
      INSERT INTO roles (role_name)
      VALUES ('Admin / IT Cell')
      ON CONFLICT (role_name) DO NOTHING;
    `);

    // Insert basic pages (if not already inserted)
    await queryRunner.query(`
      INSERT INTO pages (page_id, page_name, slug, is_report, is_action, description)
      VALUES
        (8, 'Users', 'users', false, false, 'Manage users'),
        (9, 'Roles', 'roles', false, false, 'Manage roles'),
        (17, 'Audit Trail', 'audit-trail', true, false, 'View user actions audit log')
      ON CONFLICT (page_id) DO NOTHING;
    `);

    // Assign permissions to Admin role for basic pages
    await queryRunner.query(`
      INSERT INTO role_details (role_id, page_id, show, "create", edit, "delete")
      SELECT 
        r.role_id,
        p.page_id,
        true, true, true, true
      FROM roles r
      CROSS JOIN pages p
      WHERE r.role_name = 'Admin / IT Cell'
        AND p.page_id IN (8, 9, 17)
      ON CONFLICT (role_id, page_id) DO NOTHING;
    `);

    // Insert admin user (password: admin123)
    // Password hash for 'admin123' (bcrypt, cost factor 10)
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    await queryRunner.query(`
      INSERT INTO users (username, password_hash, is_active, sap_code)
      VALUES ($1, $2, true, 1001)
      ON CONFLICT (username) DO NOTHING;
    `, ['admin', passwordHash]);

    // Assign Admin role to admin user
    await queryRunner.query(`
      INSERT INTO user_details (user_id, role_id)
      SELECT u.id, r.role_id
      FROM users u
      CROSS JOIN roles r
      WHERE u.username = 'admin'
        AND r.role_name = 'Admin / IT Cell'
      ON CONFLICT (user_id, role_id) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove admin user
    await queryRunner.query(`
      DELETE FROM user_details WHERE user_id IN (SELECT id FROM users WHERE username = 'admin');
      DELETE FROM users WHERE username = 'admin';
    `);

    // Remove basic pages (keep inventory pages)
    await queryRunner.query(`
      DELETE FROM role_details WHERE page_id IN (8, 9, 17);
      DELETE FROM pages WHERE page_id IN (8, 9, 17);
    `);

    // Remove Admin role
    await queryRunner.query(`
      DELETE FROM roles WHERE role_name = 'Admin / IT Cell';
    `);
  }
}
