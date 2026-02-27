# Postman Collection - Inventory Management API

## 📥 Import Instructions

1. Open Postman
2. Click **Import** button (top left)
3. Select `Inventory-Management-API.postman_collection.json`
4. Collection will be imported with all endpoints pre-configured

## 🔧 Setup

### 1. Configure Base URL

The collection uses a variable `{{base_url}}` which defaults to:
```
http://localhost:7076
```

To change it:
1. Click on the collection name
2. Go to **Variables** tab
3. Update `base_url` value

### 2. Login First

**Important:** Most endpoints require authentication. Start by:

1. Open **Authentication** → **Login**
2. Click **Send**
3. The response will automatically save `access_token` to collection variables
4. All other requests will use this token automatically

### 3. Collection Variables

The collection automatically manages these variables:
- `{{access_token}}` - JWT token (auto-saved from login)
- `{{refresh_token}}` - Refresh token (auto-saved from login)
- `{{user_id}}` - Last created user ID (auto-saved)
- `{{store_id}}` - Last created store ID (auto-saved)
- `{{item_id}}` - Last created item ID (auto-saved)
- `{{rate_id}}` - Last created rate ID (auto-saved)
- `{{transfer_note_id}}` - Last created transfer note ID (auto-saved)

## 📋 Endpoint Groups

### 🔐 Authentication
- Login
- Refresh Token
- Logout

### 👥 Users
- Create User
- Get All Users
- Get User by ID
- Get User Access Details
- Update User
- Update Password
- Delete User

### 🏪 Stores
- Create Store
- Get All Stores
- Get Store by ID
- Update Store
- Delete Store

### 📦 Items
- Create Item (with opening stock)
- Get All Items
- Get Item by ID
- Update Item
- Delete Item

### 💰 Rates
- Create Rate
- Get All Rates
- Get Current Rate for Item
- Get Rate by ID
- Update Rate
- Delete Rate

### 📄 Store Transfer Notes
- Create Transfer Note
- Get All Transfer Notes
- Get Transfer Note by ID
- Update Transfer Note
- Delete Transfer Note

## 🚀 Quick Start

1. **Import Collection**
2. **Login** → `Authentication/Login`
3. **Create Store** → `Stores/Create Store`
4. **Create Item** → `Items/Create Item`
5. **Create Rate** → `Rates/Create Rate`
6. **Transfer Stock** → `Store Transfer Notes/Create Transfer Note`

## 💡 Tips

- All requests use Bearer token authentication automatically
- IDs are auto-saved when you create resources
- Update requests use saved IDs from variables
- Check **Tests** tab to see auto-save scripts

## 🔄 Token Refresh

If token expires:
1. Use `Authentication/Refresh Token`
2. New token will be auto-saved
3. Continue using endpoints

## 📝 Example Workflow

1. **Login** → Get token
2. **Create Store** → Store ID saved to `{{store_id}}`
3. **Create Item** → Item ID saved to `{{item_id}}`
4. **Create Rate** → Rate ID saved to `{{rate_id}}`
5. **Create Transfer Note** → Uses saved IDs

## 🐛 Troubleshooting

### "401 Unauthorized"
- Token expired → Use Refresh Token endpoint
- Not logged in → Login first

### "403 Forbidden"
- User doesn't have permission → Check role permissions

### Variables not updating
- Check **Tests** tab in request
- Manually update variables in collection settings

## 📚 More Info

See `API_ENDPOINTS_GUIDE.md` for detailed documentation.
