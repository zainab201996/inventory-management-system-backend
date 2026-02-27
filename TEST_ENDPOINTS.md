# Testing API Endpoints

## Quick Test Commands

### 1. Health Check (No Auth Required)
```powershell
# PowerShell
Invoke-WebRequest -Uri http://localhost:7076/health -Method GET

# Or use browser
# Visit: http://localhost:7076/health
```

### 2. Login
```powershell
# PowerShell
$body = @{username='admin';password='admin123'} | ConvertTo-Json
Invoke-WebRequest -Uri http://localhost:7076/api/auth/login -Method POST -Body $body -ContentType 'application/json'
```

### 3. Test with Script

**PowerShell (Windows):**
```powershell
.\test-endpoints.ps1
```

**Bash (Linux/Mac/Git Bash):**
```bash
chmod +x test-endpoints.sh
./test-endpoints.sh
```

## Manual Testing

### Using PowerShell

1. **Login and Save Token:**
```powershell
$loginBody = @{username='admin';password='admin123'} | ConvertTo-Json
$response = Invoke-WebRequest -Uri http://localhost:7076/api/auth/login -Method POST -Body $loginBody -ContentType 'application/json'
$data = $response.Content | ConvertFrom-Json
$token = $data.data.access_token
```

2. **Test Create User:**
```powershell
$userBody = @{
    username='test.user'
    password='Test123!'
    role_ids=@(1)
    email='test@example.com'
    full_name='Test User'
} | ConvertTo-Json

$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}

Invoke-WebRequest -Uri http://localhost:7076/api/users -Method POST -Body $userBody -Headers $headers
```

3. **Test Get Users:**
```powershell
$headers = @{'Authorization' = "Bearer $token"}
Invoke-WebRequest -Uri http://localhost:7076/api/users -Method GET -Headers $headers
```

### Using cURL (if available)

```bash
# Login
curl -X POST http://localhost:7076/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Create User (replace TOKEN with actual token)
curl -X POST http://localhost:7076/api/users \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"test.user","password":"Test123!","role_ids":[1]}'
```

### Using Postman

1. Import collection: `postman/Inventory-Management-API.postman_collection.json`
2. Run **Login** request
3. Token is auto-saved
4. Test any other endpoint

### Using Browser

1. Open browser console (F12)
2. Test login:
```javascript
fetch('http://localhost:7076/api/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({username: 'admin', password: 'admin123'})
})
.then(r => r.json())
.then(console.log)
```

## Expected Responses

### Health Check
```json
{
  "success": true,
  "message": "Inventory Management Server is running",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "uptime": 123.45
}
```

### Login Success
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin"
    }
  }
}
```

## Troubleshooting

### "Unable to connect"
- Server not running → Start with `npm run dev`
- Wrong port → Check `env` file for `PORT=7076`
- Firewall blocking → Check Windows Firewall

### "401 Unauthorized"
- Token expired → Login again
- Missing token → Include `Authorization: Bearer <token>` header

### "403 Forbidden"
- No permission → Check user role permissions

### "404 Not Found"
- Wrong URL → Check endpoint path
- Server not running → Start server

## Quick Test Checklist

- [ ] Server running (`npm run dev`)
- [ ] Health check works (`/health`)
- [ ] Login works (`/api/auth/login`)
- [ ] Get users works (`/api/users`)
- [ ] Create store works (`/api/stores`)
- [ ] Create item works (`/api/items`)
