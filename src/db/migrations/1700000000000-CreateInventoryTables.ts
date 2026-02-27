import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * Migration: Create Inventory Tables
 * This migration creates all inventory-related tables.
 * Prerequisites: Core tables (users, roles, pages) must exist (created by CreateCoreTables migration)
 */
export class CreateInventoryTables1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create stores table
    await queryRunner.createTable(
      new Table({
        name: 'stores',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'store_code',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'store_name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'integer',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create items table
    await queryRunner.createTable(
      new Table({
        name: 'items',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'item_code',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'item_name',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'item_category',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'integer',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create rates table
    await queryRunner.createTable(
      new Table({
        name: 'rates',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'item_id',
            type: 'int',
          },
          {
            name: 'rate',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'effective_date',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Add foreign key and unique constraint for rates
    await queryRunner.createForeignKey(
      'rates',
      new TableForeignKey({
        columnNames: ['item_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'items',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createIndex(
      'rates',
      new TableIndex({
        columnNames: ['item_id', 'effective_date'],
        isUnique: true,
      })
    );

    // Create opening_stocks table
    await queryRunner.createTable(
      new Table({
        name: 'opening_stocks',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'item_id',
            type: 'int',
          },
          {
            name: 'store_id',
            type: 'int',
          },
          {
            name: 'opening_qty',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Add foreign keys and unique constraint for opening_stocks
    await queryRunner.createForeignKey(
      'opening_stocks',
      new TableForeignKey({
        columnNames: ['item_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'items',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'opening_stocks',
      new TableForeignKey({
        columnNames: ['store_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'stores',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createIndex(
      'opening_stocks',
      new TableIndex({
        columnNames: ['item_id', 'store_id'],
        isUnique: true,
      })
    );

    // Create store_transfer_notes table
    await queryRunner.createTable(
      new Table({
        name: 'store_transfer_notes',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'v_no',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'date',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'ref_no',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'from_store_id',
            type: 'int',
          },
          {
            name: 'to_store_id',
            type: 'int',
          },
          {
            name: 'order_no',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Add foreign keys for store_transfer_notes
    await queryRunner.createForeignKey(
      'store_transfer_notes',
      new TableForeignKey({
        columnNames: ['from_store_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'stores',
      })
    );

    await queryRunner.createForeignKey(
      'store_transfer_notes',
      new TableForeignKey({
        columnNames: ['to_store_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'stores',
      })
    );

    // Create store_transfer_note_details table
    await queryRunner.createTable(
      new Table({
        name: 'store_transfer_note_details',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'store_transfer_note_id',
            type: 'int',
          },
          {
            name: 'item_id',
            type: 'int',
          },
          {
            name: 'item_code',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'item_name',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'qty',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'ref',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Add foreign keys for store_transfer_note_details
    await queryRunner.createForeignKey(
      'store_transfer_note_details',
      new TableForeignKey({
        columnNames: ['store_transfer_note_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'store_transfer_notes',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'store_transfer_note_details',
      new TableForeignKey({
        columnNames: ['item_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'items',
      })
    );

    // Create stock_movements table
    await queryRunner.createTable(
      new Table({
        name: 'stock_movements',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'item_id',
            type: 'int',
          },
          {
            name: 'store_id',
            type: 'int',
          },
          {
            name: 'movement_type',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'qty',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'reference_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'reference_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'v_no',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'date',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Add foreign keys and indexes for stock_movements
    await queryRunner.createForeignKey(
      'stock_movements',
      new TableForeignKey({
        columnNames: ['item_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'items',
      })
    );

    await queryRunner.createForeignKey(
      'stock_movements',
      new TableForeignKey({
        columnNames: ['store_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'stores',
      })
    );

    await queryRunner.createIndex(
      'stock_movements',
      new TableIndex({
        columnNames: ['item_id', 'store_id'],
      })
    );

    await queryRunner.createIndex(
      'stock_movements',
      new TableIndex({
        columnNames: ['date'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('stock_movements');
    await queryRunner.dropTable('store_transfer_note_details');
    await queryRunner.dropTable('store_transfer_notes');
    await queryRunner.dropTable('opening_stocks');
    await queryRunner.dropTable('rates');
    await queryRunner.dropTable('items');
    await queryRunner.dropTable('stores');
  }
}
