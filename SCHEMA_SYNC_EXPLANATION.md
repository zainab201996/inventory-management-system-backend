# Why TypeORM Schema Sync/Migrations Work Now

## The Problem

Previously, TypeORM migrations weren't creating the `pages` table because:
1. Only inventory tables had migrations
2. Core tables (pages, roles, users) were expected to be created via raw SQL (`init-database.sql`)
3. TypeORM didn't know about core tables

## The Solution

Now **ALL tables are managed via TypeORM migrations**:

### Migration Order

1. **1699999999999-CreateCoreTables.ts** ✅
   - Creates: `roles`, `pages`, `users`, `role_details`, `user_details`, `audit_trail`
   - These are the foundation tables

2. **1700000000000-CreateInventoryTables.ts** ✅
   - Creates: All 7 inventory tables
   - Depends on core tables (foreign keys to `users`, `stores`)

3. **1700000000001-AddInventoryPages.ts** ✅
   - Adds inventory pages to `pages` table
   - Assigns permissions to Admin role

4. **1700000000002-SeedInitialData.ts** ✅
   - Seeds admin user, basic pages, roles
   - Sets up initial data

## How It Works Now

### Option 1: Migrations (Recommended for Production)

```bash
npm run migration:run
```

This will:
- ✅ Create all core tables if they don't exist
- ✅ Create all inventory tables
- ✅ Add pages and permissions
- ✅ Seed initial data

**Migrations are idempotent** - they check if tables exist before creating them.

### Option 2: Schema Sync (Development Only)

```bash
npm run schema:sync
```

This will:
- ✅ Compare TypeORM entities with database
- ✅ Create/update tables to match entities
- ⚠️ **WARNING**: Can drop columns/tables in some cases
- ⚠️ **Never use in production!**

## Why Migrations Are Better

1. **Version Control**: Track schema changes in git
2. **Rollback**: Can revert migrations
3. **Production Safe**: No accidental data loss
4. **Team Collaboration**: Everyone runs same migrations
5. **History**: See what changed and when

## Fresh Database Setup

To start completely fresh:

```bash
# 1. Drop all tables (if needed)
npm run schema:drop

# 2. Run all migrations (creates everything)
npm run migration:run
```

This will create:
- ✅ All core tables
- ✅ All inventory tables  
- ✅ All pages
- ✅ Admin user and permissions
- ✅ Initial seed data

## Verification

Check that everything was created:

```bash
npm run verify:setup
```

Or manually:

```sql
-- Check core tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('pages', 'roles', 'users', 'role_details', 'user_details');

-- Check inventory tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('stores', 'items', 'rates', 'opening_stocks', 
                   'store_transfer_notes', 'store_transfer_note_details', 'stock_movements');

-- Check pages
SELECT page_id, page_name, slug FROM pages ORDER BY page_id;
```

## No More Raw SQL Needed!

- ❌ ~~`init-database.sql`~~ → ✅ Use migrations
- ❌ ~~`seed-database.sql`~~ → ✅ Use migration 1700000000002
- ❌ ~~Manual SQL scripts~~ → ✅ All in TypeORM migrations

Everything is now managed via TypeORM! 🎉
