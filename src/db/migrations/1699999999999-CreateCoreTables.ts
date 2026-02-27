import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateCoreTables1699999999999 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create roles table
    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          {
            name: 'role_id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'role_name',
            type: 'varchar',
            length: '100',
            isUnique: true,
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

    // Create pages table
    await queryRunner.createTable(
      new Table({
        name: 'pages',
        columns: [
          {
            name: 'page_id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'page_name',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '1000',
            isNullable: true,
          },
          {
            name: 'is_report',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_action',
            type: 'boolean',
            default: false,
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

    // Create users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'username',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'password_hash',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'sap_code',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'p_num',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'full_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create role_details table
    await queryRunner.createTable(
      new Table({
        name: 'role_details',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'role_id',
            type: 'int',
          },
          {
            name: 'page_id',
            type: 'int',
          },
          {
            name: 'show',
            type: 'boolean',
            default: false,
          },
          {
            name: 'create',
            type: 'boolean',
            default: false,
          },
          {
            name: 'edit',
            type: 'boolean',
            default: false,
          },
          {
            name: 'delete',
            type: 'boolean',
            default: false,
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

    // Add foreign keys for role_details
    await queryRunner.createForeignKey(
      'role_details',
      new TableForeignKey({
        columnNames: ['role_id'],
        referencedColumnNames: ['role_id'],
        referencedTableName: 'roles',
        onDelete: 'RESTRICT',
      })
    );

    await queryRunner.createForeignKey(
      'role_details',
      new TableForeignKey({
        columnNames: ['page_id'],
        referencedColumnNames: ['page_id'],
        referencedTableName: 'pages',
        onDelete: 'RESTRICT',
      })
    );

    // Add unique constraint for role_details
    await queryRunner.createIndex(
      'role_details',
      new TableIndex({
        columnNames: ['role_id', 'page_id'],
        isUnique: true,
      })
    );

    // Create user_details table
    await queryRunner.createTable(
      new Table({
        name: 'user_details',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'user_id',
            type: 'int',
          },
          {
            name: 'role_id',
            type: 'int',
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

    // Add foreign keys for user_details
    await queryRunner.createForeignKey(
      'user_details',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'RESTRICT',
      })
    );

    await queryRunner.createForeignKey(
      'user_details',
      new TableForeignKey({
        columnNames: ['role_id'],
        referencedColumnNames: ['role_id'],
        referencedTableName: 'roles',
        onDelete: 'RESTRICT',
      })
    );

    // Add unique constraint for user_details
    await queryRunner.createIndex(
      'user_details',
      new TableIndex({
        columnNames: ['user_id', 'role_id'],
        isUnique: true,
      })
    );

    // Create audit_trail table (needed for audit logging)
    await queryRunner.createTable(
      new Table({
        name: 'audit_trail',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'page_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'userid',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'is_action',
            type: 'boolean',
            default: false,
          },
        ],
      }),
      true
    );

    // Add foreign key for audit_trail (optional, can be nullable)
    await queryRunner.createForeignKey(
      'audit_trail',
      new TableForeignKey({
        columnNames: ['page_id'],
        referencedColumnNames: ['page_id'],
        referencedTableName: 'pages',
        onDelete: 'SET NULL',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('audit_trail');
    await queryRunner.dropTable('user_details');
    await queryRunner.dropTable('role_details');
    await queryRunner.dropTable('users');
    await queryRunner.dropTable('pages');
    await queryRunner.dropTable('roles');
  }
}
