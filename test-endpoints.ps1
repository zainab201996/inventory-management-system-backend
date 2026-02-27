# PowerShell Script to Test API Endpoints
# Make sure server is running: npm run dev

$baseUrl = "http://localhost:7076"

Write-Host "=== Testing Inventory Management API ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1. Testing Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -Method GET -UseBasicParsing
    Write-Host "✅ Health Check: SUCCESS" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health Check: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Login
Write-Host "2. Testing Login..." -ForegroundColor Yellow
try {
    $loginBody = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
    $responseData = $response.Content | ConvertFrom-Json
    
    if ($responseData.success) {
        Write-Host "✅ Login: SUCCESS" -ForegroundColor Green
        
        # Handle both access_token and accessToken formats
        $token = $responseData.data.access_token
        if (-not $token) { $token = $responseData.data.accessToken }
        
        if ($token) {
            $tokenPreview = if ($token.Length -gt 50) { 
                $token.Substring(0, 50) + "..." 
            } else { 
                $token 
            }
            Write-Host "Access Token: $tokenPreview" -ForegroundColor Gray
            
            # Save token for next requests
            $script:accessToken = $token
        } else {
            Write-Host "⚠️  No access token found in response" -ForegroundColor Yellow
            Write-Host "Response: $($response.Content)" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ Login: FAILED - $($responseData.message)" -ForegroundColor Red
        Write-Host "Response: $($response.Content)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Login: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Get All Users (requires auth)
if ($script:accessToken) {
    Write-Host "3. Testing Get All Users..." -ForegroundColor Yellow
    try {
        $headers = @{
            "Authorization" = "Bearer $($script:accessToken)"
        }
        $response = Invoke-WebRequest -Uri "$baseUrl/api/users?page=1&limit=10" -Method GET -Headers $headers -UseBasicParsing
        $responseData = $response.Content | ConvertFrom-Json
        
        if ($responseData.success) {
            Write-Host "✅ Get Users: SUCCESS" -ForegroundColor Green
            Write-Host "Total Users: $($responseData.data.pagination.total)" -ForegroundColor Gray
        } else {
            Write-Host "❌ Get Users: FAILED - $($responseData.message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Get Users: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 4: Get All Stores
if ($script:accessToken) {
    Write-Host "4. Testing Get All Stores..." -ForegroundColor Yellow
    try {
        $headers = @{
            "Authorization" = "Bearer $($script:accessToken)"
        }
        $response = Invoke-WebRequest -Uri "$baseUrl/api/stores?page=1&limit=10" -Method GET -Headers $headers -UseBasicParsing
        $responseData = $response.Content | ConvertFrom-Json
        
        if ($responseData.success) {
            Write-Host "✅ Get Stores: SUCCESS" -ForegroundColor Green
            Write-Host "Total Stores: $($responseData.data.pagination.total)" -ForegroundColor Gray
        } else {
            Write-Host "❌ Get Stores: FAILED - $($responseData.message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Get Stores: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 5: Create Store
if ($script:accessToken) {
    Write-Host "5. Testing Create Store..." -ForegroundColor Yellow
    try {
        $storeBody = @{
            store_code = "TEST-STORE-001"
            store_name = "Test Warehouse"
        } | ConvertTo-Json

        $headers = @{
            "Authorization" = "Bearer $($script:accessToken)"
            "Content-Type" = "application/json"
        }
        $response = Invoke-WebRequest -Uri "$baseUrl/api/stores" -Method POST -Body $storeBody -Headers $headers -UseBasicParsing
        $responseData = $response.Content | ConvertFrom-Json
        
        if ($responseData.success) {
            Write-Host "✅ Create Store: SUCCESS" -ForegroundColor Green
            Write-Host "Store ID: $($responseData.data.id), Code: $($responseData.data.store_code)" -ForegroundColor Gray
        } else {
            Write-Host "❌ Create Store: FAILED - $($responseData.message)" -ForegroundColor Red
        }
    } catch {
        $errorResponse = $_.Exception.Response
        if ($errorResponse) {
            $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "❌ Create Store: FAILED - $responseBody" -ForegroundColor Red
        } else {
            Write-Host "❌ Create Store: FAILED - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    Write-Host ""
}

Write-Host "=== Testing Complete ===" -ForegroundColor Cyan
