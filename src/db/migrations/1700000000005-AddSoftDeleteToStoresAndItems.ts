import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeleteToStoresAndItems1700000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stores
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE items
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE items
      DROP COLUMN IF EXISTS deleted_at,
      DROP COLUMN IF EXISTS is_deleted;
    `);

    await queryRunner.query(`
      ALTER TABLE stores
      DROP COLUMN IF EXISTS deleted_at,
      DROP COLUMN IF EXISTS is_deleted;
    `);
  }
}

