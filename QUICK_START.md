# Quick Start Guide - Inventory Management System

## 🚀 Setup Instructions

### 1. Initialize Database (First Time Only)

If you haven't initialized the database yet, run:

```bash
psql -U postgres -d postgres -f init-database.sql
```

This creates all core tables (users, roles, pages, etc.)

### 2. Run Inventory Migration

Create inventory tables:

```bash
npm run migration:run
```

### 3. Add Inventory Pages

Add inventory pages to the database:

**Option A: Using SQL (Recommended)**
```bash
psql -U postgres -d postgres -f seed-inventory-pages.sql
```

**Option B: Using npm script**
```bash
npm run seed:inventory-pages
```

### 4. Start Server

```bash
npm run dev
```

Server will start on `http://localhost:7076` (or PORT from env)

### 5. Test API

**Login:**
```bash
POST http://localhost:7076/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Create Store:**
```bash
POST http://localhost:7076/api/stores
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "store_code": "STORE-001",
  "store_name": "Main Warehouse"
}
```

## 📋 Available Endpoints

### Stores
- `POST /api/stores` - Create store
- `GET /api/stores` - List stores (paginated)
- `GET /api/stores/:id` - Get store by ID
- `PUT /api/stores/:id` - Update store
- `DELETE /api/stores/:id` - Delete store

### Items
- `POST /api/items` - Create item (with opening stock)
- `GET /api/items` - List items (paginated)
- `GET /api/items/:id?include_opening_stocks=true` - Get item with opening stocks
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

### Rates
- `POST /api/rates` - Create rate
- `GET /api/rates` - List rates (filterable by item_id)
- `GET /api/rates/current/:item_id` - Get current rate for item
- `GET /api/rates/:id` - Get rate by ID
- `PUT /api/rates/:id` - Update rate
- `DELETE /api/rates/:id` - Delete rate

### Store Transfer Notes
- `POST /api/store-transfer-notes` - Create transfer note
- `GET /api/store-transfer-notes` - List transfer notes (filterable by stores)
- `GET /api/store-transfer-notes/:id` - Get transfer note with details
- `PUT /api/store-transfer-notes/:id` - Update transfer note
- `DELETE /api/store-transfer-notes/:id` - Delete transfer note

## 📝 Notes

- All endpoints require JWT authentication (except `/api/auth/*`)
- All endpoints require appropriate page permissions
- Admin role has full permissions by default
- Stock movements are automatically tracked
- See `INVENTORY_API_DOCUMENTATION.md` for detailed API docs
