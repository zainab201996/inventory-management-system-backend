# Quick API Reference

## 🔐 Authentication

### Login
```bash
POST /api/auth/login
{
  "username": "admin",
  "password": "admin123"
}
```

### Use Token
Add to all requests:
```
Authorization: Bearer <access_token>
```

---

## 👥 User Management

### Create User
```bash
POST /api/users
Authorization: Bearer <token>
{
  "username": "john.doe",
  "password": "SecurePass123!",
  "role_ids": [1],
  "email": "john@example.com",
  "full_name": "John Doe"
}
```

### Get All Users
```bash
GET /api/users?page=1&limit=10&search=
```

### Get User by ID
```bash
GET /api/users/:id
```

### Update User
```bash
PUT /api/users/:id
{
  "email": "newemail@example.com",
  "full_name": "Updated Name"
}
```

---

## 🏪 Stores

### Create Store
```bash
POST /api/stores
{
  "store_code": "STORE-001",
  "store_name": "Main Warehouse"
}
```

### Get All Stores
```bash
GET /api/stores?page=1&limit=10&all=false
```

---

## 📦 Items

### Create Item
```bash
POST /api/items
{
  "item_code": "ITEM-001",
  "item_name": "Laptop Dell XPS 15",
  "item_category": "Electronics",
  "opening_stocks": [
    {"store_id": 1, "opening_qty": 20}
  ]
}
```

### Get Item with Opening Stocks
```bash
GET /api/items/:id?include_opening_stocks=true
```

---

## 💰 Rates

### Create Rate
```bash
POST /api/rates
{
  "item_id": 1,
  "rate": 1500.00,
  "effective_date": "2024-01-15"
}
```

### Get Current Rate
```bash
GET /api/rates/current/:item_id
```

---

## 📄 Store Transfer Notes

### Create Transfer Note
```bash
POST /api/store-transfer-notes
{
  "v_no": "STN-001",
  "date": "2024-01-15",
  "from_store_id": 1,
  "to_store_id": 2,
  "details": [
    {
      "item_id": 1,
      "item_code": "ITEM-001",
      "item_name": "Laptop",
      "qty": 10
    }
  ]
}
```

---

## 📊 Complete Endpoint List

| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/auth/login` | POST | ❌ |
| `/api/auth/refresh` | POST | ❌ |
| `/api/users` | POST, GET | ✅ |
| `/api/users/:id` | GET, PUT, DELETE | ✅ |
| `/api/users/password` | PUT | ✅ |
| `/api/stores` | POST, GET | ✅ |
| `/api/stores/:id` | GET, PUT, DELETE | ✅ |
| `/api/items` | POST, GET | ✅ |
| `/api/items/:id` | GET, PUT, DELETE | ✅ |
| `/api/rates` | POST, GET | ✅ |
| `/api/rates/current/:item_id` | GET | ✅ |
| `/api/rates/:id` | GET, PUT, DELETE | ✅ |
| `/api/store-transfer-notes` | POST, GET | ✅ |
| `/api/store-transfer-notes/:id` | GET, PUT, DELETE | ✅ |

---

## 📥 Postman Collection

Import: `postman/Inventory-Management-API.postman_collection.json`

Includes:
- ✅ All endpoints pre-configured
- ✅ Auto-save tokens
- ✅ Example requests
- ✅ Variables management

---

## 🔗 Full Documentation

- `API_ENDPOINTS_GUIDE.md` - Complete guide
- `INVENTORY_API_DOCUMENTATION.md` - Detailed docs
- `postman/README.md` - Postman setup
