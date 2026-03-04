import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCurrencyToSettings1700000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure settings table exists (for databases created only via migrations)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        year_start VARCHAR(10) NOT NULL DEFAULT '07-01',
        year_end VARCHAR(10) NOT NULL DEFAULT '06-30',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(10) DEFAULT 'Rs';
    `);
    await queryRunner.query(`
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS currency_code VARCHAR(5) DEFAULT 'PKR';
    `);
    await queryRunner.query(`
      UPDATE settings SET currency_symbol = COALESCE(currency_symbol, 'Rs'), currency_code = COALESCE(currency_code, 'PKR');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE settings
      DROP COLUMN IF EXISTS currency_symbol,
      DROP COLUMN IF EXISTS currency_code;
    `);
  }
}
