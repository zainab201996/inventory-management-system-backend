# Inventory Management System - API Documentation

## Base URL
All endpoints are prefixed with `/api`

## Authentication
All endpoints (except `/api/auth/*`) require authentication via JWT token:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints Overview

### 1. Stores API (`/api/stores`)

**Profile Management** - Manage store locations

#### Create Store
- **POST** `/api/stores`
- **Body:**
  ```json
  {
    "store_code": "STORE-001",
    "store_name": "Main Warehouse"
  }
  ```
- **Response:** Created store object

#### Get All Stores
- **GET** `/api/stores`
- **Query Parameters:**
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 10)
  - `sort_by` (optional): Sort field (default: created_at)
  - `sort_order` (optional): 'asc' or 'desc' (default: desc)
  - `all` (optional): 'true' to get all without pagination
- **Response:** Paginated list of stores

#### Get Store by ID
- **GET** `/api/stores/:id`
- **Response:** Store object

#### Update Store
- **PUT** `/api/stores/:id`
- **Body:**
  ```json
  {
    "store_code": "STORE-001-UPDATED",
    "store_name": "Updated Warehouse Name"
  }
  ```
- **Response:** Updated store object

#### Delete Store
- **DELETE** `/api/stores/:id`
- **Response:** Success message

---

### 2. Items API (`/api/items`)

**Profile Management** - Manage product items with opening stock

#### Create Item
- **POST** `/api/items`
- **Body:**
  ```json
  {
    "item_code": "ITEM-001",
    "item_name": "Laptop Dell XPS 15",
    "item_category": "Electronics",
    "opening_stocks": [
      {
        "store_id": 1,
        "opening_qty": 20
      },
      {
        "store_id": 2,
        "opening_qty": 30
      }
    ]
  }
  ```
- **Response:** Created item object
- **Note:** Opening stocks are optional. If provided, stock movements are automatically created.

#### Get All Items
- **GET** `/api/items`
- **Query Parameters:**
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 10)
  - `sort_by` (optional): Sort field (default: created_at)
  - `sort_order` (optional): 'asc' or 'desc' (default: desc)
  - `all` (optional): 'true' to get all without pagination
- **Response:** Paginated list of items

#### Get Item by ID
- **GET** `/api/items/:id`
- **Query Parameters:**
  - `include_opening_stocks` (optional): 'true' to include opening stock details
- **Response:** Item object (with or without opening stocks)

#### Update Item
- **PUT** `/api/items/:id`
- **Body:**
  ```json
  {
    "item_name": "Updated Item Name",
    "item_category": "Updated Category",
    "opening_stocks": [
      {
        "store_id": 1,
        "opening_qty": 25
      }
    ]
  }
  ```
- **Response:** Updated item object
- **Note:** If `opening_stocks` is provided, existing opening stocks are replaced.

#### Delete Item
- **DELETE** `/api/items/:id`
- **Response:** Success message

---

### 3. Rates API (`/api/rates`)

**Profile Management** - Manage item pricing/rates

#### Create Rate
- **POST** `/api/rates`
- **Body:**
  ```json
  {
    "item_id": 1,
    "rate": 1500.00,
    "effective_date": "2024-01-15" // Optional, defaults to current date
  }
  ```
- **Response:** Created rate object
- **Note:** Multiple rates per item are allowed (price history)

#### Get All Rates
- **GET** `/api/rates`
- **Query Parameters:**
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 10)
  - `sort_by` (optional): Sort field (default: effective_date)
  - `sort_order` (optional): 'asc' or 'desc' (default: desc)
  - `item_id` (optional): Filter by item ID
  - `all` (optional): 'true' to get all without pagination
- **Response:** Paginated list of rates (includes item relation)

#### Get Current Rate for Item
- **GET** `/api/rates/current/:item_id`
- **Response:** Most recent rate for the item

#### Get Rate by ID
- **GET** `/api/rates/:id`
- **Response:** Rate object (includes item relation)

#### Update Rate
- **PUT** `/api/rates/:id`
- **Body:**
  ```json
  {
    "rate": 1600.00,
    "effective_date": "2024-02-01"
  }
  ```
- **Response:** Updated rate object

#### Delete Rate
- **DELETE** `/api/rates/:id`
- **Response:** Success message

---

### 4. Store Transfer Notes API (`/api/store-transfer-notes`)

**Transaction Management** - Master-detail transaction for stock transfers

#### Create Store Transfer Note
- **POST** `/api/store-transfer-notes`
- **Body:**
  ```json
  {
    "v_no": "STN-001",
    "date": "2024-01-15",
    "ref_no": "REF-123",
    "from_store_id": 1,
    "to_store_id": 2,
    "order_no": "ORD-456",
    "details": [
      {
        "item_id": 1,
        "item_code": "ITEM-001",
        "item_name": "Laptop Dell XPS 15",
        "qty": 10,
        "ref": "Detail reference"
      },
      {
        "item_id": 2,
        "item_code": "ITEM-002",
        "item_name": "Mouse Logitech",
        "qty": 5,
        "ref": null
      }
    ]
  }
  ```
- **Response:** Created transfer note with relations (stores, details, items)
- **Note:** 
  - Automatically creates stock movements (OUT from source, IN to destination)
  - `created_by` is automatically set from authenticated user
  - `v_no` must be unique

#### Get All Transfer Notes
- **GET** `/api/store-transfer-notes`
- **Query Parameters:**
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 10)
  - `sort_by` (optional): Sort field (default: date)
  - `sort_order` (optional): 'asc' or 'desc' (default: desc)
  - `from_store_id` (optional): Filter by source store
  - `to_store_id` (optional): Filter by destination store
  - `all` (optional): 'true' to get all without pagination
- **Response:** Paginated list of transfer notes (includes store relations)

#### Get Transfer Note by ID
- **GET** `/api/store-transfer-notes/:id`
- **Response:** Transfer note with all relations (stores, details with items)

#### Update Transfer Note
- **PUT** `/api/store-transfer-notes/:id`
- **Body:**
  ```json
  {
    "ref_no": "Updated Ref",
    "details": [
      {
        "item_id": 1,
        "item_code": "ITEM-001",
        "item_name": "Laptop Dell XPS 15",
        "qty": 15
      }
    ]
  }
  ```
- **Response:** Updated transfer note
- **Note:** 
  - If `details` is provided, existing details and related stock movements are replaced
  - Stock movements are automatically updated

#### Delete Transfer Note
- **DELETE** `/api/store-transfer-notes/:id`
- **Response:** Success message
- **Note:** Deletes transfer note, details (CASCADE), and related stock movements

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Resource retrieved successfully",
  "data": {
    // Resource data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": "Error message"
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Resources retrieved successfully",
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "total_pages": 10
    }
  }
}
```

## Permission Requirements

All endpoints require appropriate page permissions:
- **Stores**: `stores` page permissions (show, create, edit, delete)
- **Items**: `items` page permissions (show, create, edit, delete)
- **Rates**: `rates` page permissions (show, create, edit, delete)
- **Store Transfer Notes**: `store-transfer-notes` page permissions (show, create, edit, delete)

## Audit Trail

All create, update, and delete operations are automatically logged to the audit trail.

## Stock Movement Tracking

Stock movements are automatically created for:
- **Opening Stock**: When items are created/updated with opening stocks
- **Store Transfers**: When transfer notes are created (OUT from source, IN to destination)

Stock movements can be queried directly from the `stock_movements` table for reporting purposes.

## Example Usage

### Complete Flow: Create Item with Opening Stock and Transfer

1. **Create Store**
   ```bash
   POST /api/stores
   {
     "store_code": "STORE-A",
     "store_name": "Store A"
   }
   ```

2. **Create Item with Opening Stock**
   ```bash
   POST /api/items
   {
     "item_code": "ITEM-001",
     "item_name": "Product X",
     "opening_stocks": [
       {"store_id": 1, "opening_qty": 50}
     ]
   }
   ```

3. **Create Rate**
   ```bash
   POST /api/rates
   {
     "item_id": 1,
     "rate": 1000.00
   }
   ```

4. **Transfer Stock**
   ```bash
   POST /api/store-transfer-notes
   {
     "v_no": "STN-001",
     "from_store_id": 1,
     "to_store_id": 2,
     "details": [
       {
         "item_id": 1,
         "item_code": "ITEM-001",
         "item_name": "Product X",
         "qty": 10
       }
     ]
   }
   ```

This will automatically:
- Create OUT movement (10 qty) from Store 1
- Create IN movement (10 qty) to Store 2
- Update stock balances accordingly
