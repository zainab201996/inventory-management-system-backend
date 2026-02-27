# Inventory Management System - Setup Guide

## Prerequisites

1. **Database must be initialized** - Run `init-database.sql` first to create all core tables (users, roles, pages, etc.)

## Setup Steps

### Step 1: Initialize Database (if not done already)

If your database doesn't have the core tables yet, run:

```bash
psql -U your_user -d your_database -f init-database.sql
```

This creates all core tables including `pages`, `roles`, `users`, etc.

### Step 2: Add Inventory Pages

You have two options:

#### Option A: Using SQL Script (Recommended)
```bash
psql -U your_user -d your_database -f seed-inventory-pages.sql
```

#### Option B: Using npm script (after database is initialized)
```bash
npm run seed:inventory-pages
```

This will:
- Create 6 inventory pages:
  - Stores (page_id: 50)
  - Items (page_id: 51)
  - Rates (page_id: 52)
  - Store Transfer Notes (page_id: 53)
  - Stock Report (page_id: 54) - Report page
  - Stock Transfer Detail (page_id: 55) - Report page
- Assign full permissions (show, create, edit, delete) to Admin role

### Step 3: Verify Setup

Check that pages were created:
```sql
SELECT page_id, page_name, slug, is_report, is_action 
FROM pages 
WHERE page_id IN (50, 51, 52, 53, 54, 55)
ORDER BY page_id;
```

Check that permissions were assigned:
```sql
SELECT 
  r.role_name,
  p.page_name,
  rd.show,
  rd."create",
  rd.edit,
  rd."delete"
FROM role_details rd
INNER JOIN roles r ON rd.role_id = r.role_id
INNER JOIN pages p ON rd.page_id = p.page_id
WHERE p.page_id IN (50, 51, 52, 53, 54, 55)
ORDER BY p.page_id;
```

### Step 4: Test API Endpoints

Once pages are added, you can test the inventory endpoints:

1. **Login** to get JWT token:
   ```bash
   POST /api/auth/login
   {
     "username": "admin",
     "password": "admin123"
   }
   ```

2. **Create a Store**:
   ```bash
   POST /api/stores
   Authorization: Bearer <token>
   {
     "store_code": "STORE-001",
     "store_name": "Main Warehouse"
   }
   ```

3. **Create an Item**:
   ```bash
   POST /api/items
   Authorization: Bearer <token>
   {
     "item_code": "ITEM-001",
     "item_name": "Laptop Dell XPS 15",
     "item_category": "Electronics",
     "opening_stocks": [
       {
         "store_id": 1,
         "opening_qty": 20
       }
     ]
   }
   ```

4. **Create a Rate**:
   ```bash
   POST /api/rates
   Authorization: Bearer <token>
   {
     "item_id": 1,
     "rate": 1500.00
   }
   ```

5. **Create a Transfer Note**:
   ```bash
   POST /api/store-transfer-notes
   Authorization: Bearer <token>
   {
     "v_no": "STN-001",
     "date": "2024-01-15",
     "from_store_id": 1,
     "to_store_id": 2,
     "details": [
       {
         "item_id": 1,
         "item_code": "ITEM-001",
         "item_name": "Laptop Dell XPS 15",
         "qty": 10
       }
     ]
   }
   ```

## Pages Created

| Page ID | Page Name | Slug | Type | Description |
|---------|-----------|------|------|-------------|
| 50 | Stores | stores | Profile | Manage store locations |
| 51 | Items | items | Profile | Manage product items |
| 52 | Rates | rates | Profile | Manage item pricing/rates |
| 53 | Store Transfer Notes | store-transfer-notes | Transaction | Manage stock transfers |
| 54 | Stock Report | stock-report | Report | View stock reports |
| 55 | Stock Transfer Detail | stock-transfer-detail | Report | View transfer details |

## Permission Configuration

By default, the Admin role gets full permissions (show, create, edit, delete) on all inventory pages.

To assign permissions to other roles, use the role-details API or update the `role_details` table directly.

## Troubleshooting

### Error: "relation pages does not exist"
- **Solution**: Run `init-database.sql` first to create core tables

### Error: "Permission denied"
- **Solution**: Make sure you're logged in and your role has permissions for the inventory pages

### Error: "Page not found in route permissions"
- **Solution**: Make sure pages were created successfully and slugs match route-permissions.ts

## Next Steps

After setup:
1. ✅ Test all CRUD endpoints
2. ✅ Configure permissions for other roles as needed
3. ⏳ Implement stock report endpoints (can be added later)
4. ⏳ Implement stock transfer detail report (can be added later)
