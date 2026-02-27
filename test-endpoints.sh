#!/bin/bash
# Bash Script to Test API Endpoints
# Make sure server is running: npm run dev

BASE_URL="http://localhost:7076"

echo "=== Testing Inventory Management API ==="
echo ""

# Test 1: Health Check
echo "1. Testing Health Check..."
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
    echo "✅ Health Check: SUCCESS"
    echo "Response: $body"
else
    echo "❌ Health Check: FAILED (HTTP $http_code)"
fi
echo ""

# Test 2: Login
echo "2. Testing Login..."
login_response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}')
http_code=$(echo "$login_response" | tail -n1)
body=$(echo "$login_response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
    echo "✅ Login: SUCCESS"
    ACCESS_TOKEN=$(echo "$body" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    echo "Access Token: ${ACCESS_TOKEN:0:50}..."
else
    echo "❌ Login: FAILED (HTTP $http_code)"
    echo "Response: $body"
    exit 1
fi
echo ""

# Test 3: Get All Users
if [ -n "$ACCESS_TOKEN" ]; then
    echo "3. Testing Get All Users..."
    response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/users?page=1&limit=10" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        echo "✅ Get Users: SUCCESS"
        total=$(echo "$body" | grep -o '"total":[0-9]*' | cut -d':' -f2)
        echo "Total Users: $total"
    else
        echo "❌ Get Users: FAILED (HTTP $http_code)"
    fi
    echo ""
fi

# Test 4: Get All Stores
if [ -n "$ACCESS_TOKEN" ]; then
    echo "4. Testing Get All Stores..."
    response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/stores?page=1&limit=10" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        echo "✅ Get Stores: SUCCESS"
        total=$(echo "$body" | grep -o '"total":[0-9]*' | cut -d':' -f2)
        echo "Total Stores: $total"
    else
        echo "❌ Get Stores: FAILED (HTTP $http_code)"
    fi
    echo ""
fi

# Test 5: Create Store
if [ -n "$ACCESS_TOKEN" ]; then
    echo "5. Testing Create Store..."
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/stores" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"store_code":"TEST-STORE-001","store_name":"Test Warehouse"}')
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 201 ]; then
        echo "✅ Create Store: SUCCESS"
        echo "Response: $body"
    else
        echo "❌ Create Store: FAILED (HTTP $http_code)"
        echo "Response: $body"
    fi
    echo ""
fi

echo "=== Testing Complete ==="
