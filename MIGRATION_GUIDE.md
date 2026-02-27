# TypeORM Migration Guide

## Overview

All database tables are now managed via TypeORM migrations. No raw SQL scripts needed!

## Migration Order

Migrations run in timestamp order:

1. **1699999999999-CreateCoreTables.ts** - Creates core tables (roles, pages, users, role_details, user_details, audit_trail)
2. **1700000000000-CreateInventoryTables.ts** - Creates inventory tables (stores, items, rates, etc.)
3. **1700000000001-AddInventoryPages.ts** - Adds inventory pages to pages table
4. **1700000000002-SeedInitialData.ts** - Seeds initial data (admin user, roles, basic pages)

## Running Migrations

### Run All Pending Migrations
```bash
npm run migration:run
```

This will:
- Create all core tables
- Create all inventory tables
- Add inventory pages
- Seed initial data (admin user, etc.)

### Check Migration Status
```bash
npm run migration:show
```

### Revert Last Migration
```bash
npm run migration:revert
```

### Generate New Migration (Auto)
```bash
npm run migration:generate MigrationName
```

This compares entities with database and generates migration automatically.

### Create Empty Migration (Manual)
```bash
npm run migration:create MigrationName
```

## Schema Sync (Development Only)

⚠️ **Warning**: Schema sync directly modifies database. Use migrations in production!

```bash
# Sync schema (creates/updates tables to match entities)
npm run schema:sync

# Drop all tables (DANGEROUS!)
npm run schema:drop
```

## Fresh Start

To start fresh with a clean database:

```bash
# 1. Drop all tables (if needed)
npm run schema:drop

# 2. Run all migrations
npm run migration:run
```

## Migration Files Location

All migrations are in: `src/db/migrations/`

## What Gets Created

### Core Tables (Migration 1)
- `roles` - User roles
- `pages` - Permission pages
- `users` - User accounts
- `role_details` - Role-page permissions
- `user_details` - User-role assignments
- `audit_trail` - Audit logging

### Inventory Tables (Migration 2)
- `stores` - Store locations
- `items` - Product master data
- `rates` - Price history
- `opening_stocks` - Initial stock per item per store
- `store_transfer_notes` - Transfer document master
- `store_transfer_note_details` - Transfer document details
- `stock_movements` - Complete movement history

### Pages (Migration 3)
- Stores (page_id: 50)
- Items (page_id: 51)
- Rates (page_id: 52)
- Store Transfer Notes (page_id: 53)
- Stock Report (page_id: 54)
- Stock Transfer Detail (page_id: 55)

### Initial Data (Migration 4)
- Admin role: "Admin / IT Cell"
- Admin user: username="admin", password="admin123"
- Basic pages: Users, Roles, Audit Trail
- Full permissions for Admin role

## Troubleshooting

### "Migration already executed"
If a migration was partially executed, you may need to manually fix the database or revert:
```bash
npm run migration:revert
npm run migration:run
```

### "Table already exists"
If tables exist from previous SQL scripts:
1. Option A: Drop tables and run migrations fresh
2. Option B: Mark migrations as executed (not recommended)

### "Foreign key constraint fails"
Make sure migrations run in order. Core tables must exist before inventory tables.

## Best Practices

1. ✅ Always use migrations in production
2. ✅ Never edit executed migrations
3. ✅ Test migrations on development database first
4. ✅ Use migration:generate to auto-create migrations from entity changes
5. ✅ Keep migrations small and focused
6. ✅ Document complex migrations

## Example: Adding a New Table

1. Create entity: `src/entities/inventory/NewTable.ts`
2. Add entity to `src/config/data-source.ts`
3. Generate migration: `npm run migration:generate AddNewTable`
4. Review generated migration
5. Run migration: `npm run migration:run`

## No More Raw SQL!

All database schema is now managed via TypeORM migrations. The old `init-database.sql` and `seed-database.sql` files are no longer needed for schema creation.
