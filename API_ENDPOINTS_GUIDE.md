# API Endpoints Guide - Inventory Management System

## Base URL
```
http://localhost:7076
```

## Authentication

All endpoints (except `/api/auth/*` and `/health`) require JWT Bearer token authentication.

### Login Flow

1. **Login** → Get `access_token` and `refresh_token`
2. **Use `access_token`** → Include in `Authorization: Bearer <token>` header
3. **Refresh Token** → Use `refresh_token` to get new `access_token` when expired

---

## 📋 Complete Endpoint List

### 🔐 Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | Login with username/password | ❌ No |
| POST | `/api/auth/refresh` | Refresh access token | ❌ No |
| POST | `/api/auth/logout` | Logout current user | ✅ Yes |

### 👥 Users (`/api/users`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/users` | Create new user | ✅ Yes |
| GET | `/api/users` | Get all users (paginated) | ✅ Yes |
| GET | `/api/users/:id` | Get user by ID | ✅ Yes |
| GET | `/api/users/:id/access` | Get user's roles & permissions | ✅ Yes |
| PUT | `/api/users/:id` | Update user | ✅ Yes |
| PUT | `/api/users/password` | Update current user's password | ✅ Yes |
| DELETE | `/api/users/:id` | Delete user | ✅ Yes |

### 🏪 Stores (`/api/stores`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/stores` | Create store | ✅ Yes |
| GET | `/api/stores` | Get all stores (paginated) | ✅ Yes |
| GET | `/api/stores/:id` | Get store by ID | ✅ Yes |
| PUT | `/api/stores/:id` | Update store | ✅ Yes |
| DELETE | `/api/stores/:id` | Delete store | ✅ Yes |

### 📦 Items (`/api/items`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/items` | Create item (with opening stock) | ✅ Yes |
| GET | `/api/items` | Get all items (paginated) | ✅ Yes |
| GET | `/api/items/:id` | Get item by ID | ✅ Yes |
| PUT | `/api/items/:id` | Update item | ✅ Yes |
| DELETE | `/api/items/:id` | Delete item | ✅ Yes |

### 💰 Rates (`/api/rates`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/rates` | Create rate | ✅ Yes |
| GET | `/api/rates` | Get all rates (paginated) | ✅ Yes |
| GET | `/api/rates/current/:item_id` | Get current rate for item | ✅ Yes |
| GET | `/api/rates/:id` | Get rate by ID | ✅ Yes |
| PUT | `/api/rates/:id` | Update rate | ✅ Yes |
| DELETE | `/api/rates/:id` | Delete rate | ✅ Yes |

### 📄 Store Transfer Notes (`/api/store-transfer-notes`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/store-transfer-notes` | Create transfer note | ✅ Yes |
| GET | `/api/store-transfer-notes` | Get all transfer notes (paginated) | ✅ Yes |
| GET | `/api/store-transfer-notes/:id` | Get transfer note by ID | ✅ Yes |
| PUT | `/api/store-transfer-notes/:id` | Update transfer note | ✅ Yes |
| DELETE | `/api/store-transfer-notes/:id` | Delete transfer note | ✅ Yes |

### 🔧 Other Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check | ❌ No |
| GET | `/api/roles` | Get all roles | ✅ Yes |
| GET | `/api/pages` | Get all pages | ✅ Yes |

---

## 📝 Request Examples

### 1. Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "email": null,
      "full_name": null
    }
  }
}
```

### 2. Create User

```http
POST /api/users
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "username": "john.doe",
  "password": "SecurePass123!",
  "email": "john.doe@example.com",
  "full_name": "John Doe",
  "sap_code": 2001,
  "p_num": "+1234567890",
  "role_ids": [1]
}
```

**Required Fields:**
- `username` (string, unique)
- `password` (string)
- `role_ids` (array of numbers, at least one role)

**Optional Fields:**
- `email` (string)
- `full_name` (string)
- `sap_code` (number)
- `p_num` (string)

### 3. Create Store

```http
POST /api/stores
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "store_code": "STORE-001",
  "store_name": "Main Warehouse"
}
```

### 4. Create Item with Opening Stock

```http
POST /api/items
Authorization: Bearer <access_token>
Content-Type: application/json

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

### 5. Create Rate

```http
POST /api/rates
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "item_id": 1,
  "rate": 1500.00,
  "effective_date": "2024-01-15"
}
```

### 6. Create Store Transfer Note

```http
POST /api/store-transfer-notes
Authorization: Bearer <access_token>
Content-Type: application/json

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
    }
  ]
}
```

---

## 🔍 Query Parameters

### Pagination (for GET /list endpoints)

- `page` (number, default: 1) - Page number
- `limit` (number, default: 10) - Items per page
- `sort_by` (string) - Field to sort by
- `sort_order` (string: "asc" | "desc", default: "desc")
- `all` (boolean: "true" | "false") - Get all without pagination

### Filters

**Users:**
- `search` (string) - Search by username, email, full_name

**Rates:**
- `item_id` (number) - Filter by item ID

**Store Transfer Notes:**
- `from_store_id` (number) - Filter by source store
- `to_store_id` (number) - Filter by destination store

**Items:**
- `include_opening_stocks` (boolean: "true" | "false") - Include opening stock details

---

## 📤 Response Format

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

### Error Response

```json
{
  "success": false,
  "message": "Error message",
  "error": "Error message"
}
```

---

## 🚀 Quick Start Workflow

1. **Login**
   ```bash
   POST /api/auth/login
   ```

2. **Create Store**
   ```bash
   POST /api/stores
   ```

3. **Create Item**
   ```bash
   POST /api/items
   ```

4. **Create Rate**
   ```bash
   POST /api/rates
   ```

5. **Transfer Stock**
   ```bash
   POST /api/store-transfer-notes
   ```

---

## 📚 Postman Collection

Import the Postman collection from:
```
postman/Inventory-Management-API.postman_collection.json
```

The collection includes:
- ✅ All endpoints pre-configured
- ✅ Auto-save tokens from login
- ✅ Variables for IDs (user_id, store_id, etc.)
- ✅ Example request bodies
- ✅ Environment variables

---

## 🔐 Permissions

All endpoints require appropriate page permissions:
- **Users**: `users` page permissions
- **Stores**: `stores` page permissions
- **Items**: `items` page permissions
- **Rates**: `rates` page permissions
- **Store Transfer Notes**: `store-transfer-notes` page permissions

Admin role has full permissions by default.

---

## ⚠️ Common Errors

### 401 Unauthorized
- Token missing or expired
- **Solution**: Login again or refresh token

### 403 Forbidden
- User doesn't have permission for the page
- **Solution**: Assign permissions via role-details

### 400 Validation Error
- Missing required fields or invalid data
- **Solution**: Check request body format

### 404 Not Found
- Resource doesn't exist
- **Solution**: Check ID is correct

---

## 📖 More Documentation

- `INVENTORY_API_DOCUMENTATION.md` - Detailed API documentation
- `QUICK_START.md` - Quick start guide
- `MIGRATION_GUIDE.md` - Database migration guide
