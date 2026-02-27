# Stock Validation for Store Transfer Notes

## Overview

Store Transfer Notes now include **automatic stock validation** to prevent transferring more items than are available in the source store.

## How It Works

### Stock Calculation Formula

Current Stock = **Opening Stock** + **SUM(IN movements)** - **SUM(OUT movements)**

Where:
- **Opening Stock**: Initial quantity set when item is created
- **IN movements**: `TRANSFER_IN`, `IN` type movements
- **OUT movements**: `TRANSFER_OUT`, `OUT` type movements

### Validation Logic

Before creating or updating a Store Transfer Note:

1. **For each item in the transfer details:**
   - Calculate current available stock in the source store
   - Check if available stock >= transfer quantity
   - If insufficient, reject the transfer with detailed error message

2. **Validation happens BEFORE any database changes:**
   - All validations are checked first
   - If any item fails, the entire transfer is rejected
   - Transaction is rolled back (no partial transfers)

3. **Error messages include:**
   - Item code and name
   - Available quantity
   - Required quantity
   - Clear indication of shortage

## Example Scenarios

### ✅ Valid Transfer

**Initial State:**
- Item A: 10 qty in Store 1, 20 qty in Store 2

**Transfer Request:**
- From Store 1 to Store 2
- Item A: 8 qty

**Result:** ✅ **SUCCESS** - Store 1 has 10, transferring 8 is valid

### ❌ Invalid Transfer

**Initial State:**
- Item A: 10 qty in Store 1, 20 qty in Store 2

**Transfer Request:**
- From Store 1 to Store 2
- Item A: 15 qty

**Result:** ❌ **REJECTED** - Error: "Item A (Item Name): Insufficient stock. Available: 10.00, Required: 15.00"

### Multiple Items Validation

**Transfer Request:**
- Item A: 5 qty (Store 1 has 10) ✅
- Item B: 25 qty (Store 1 has 20) ❌

**Result:** ❌ **REJECTED** - Only Item B error is shown, but entire transfer is rejected

## API Behavior

### Create Transfer Note

```http
POST /api/store-transfer-notes
```

**Request:**
```json
{
  "v_no": "STN-001",
  "from_store_id": 1,
  "to_store_id": 2,
  "details": [
    {
      "item_id": 1,
      "item_code": "ITEM-001",
      "item_name": "Laptop",
      "qty": 15
    }
  ]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Store transfer note created successfully",
  "data": { ... }
}
```

**Validation Error Response (400):**
```json
{
  "success": false,
  "message": "Stock validation failed:\nItem ITEM-001 (Laptop): Insufficient stock. Available: 10.00, Required: 15.00",
  "error": "Stock validation failed:\nItem ITEM-001 (Laptop): Insufficient stock. Available: 10.00, Required: 15.00"
}
```

### Update Transfer Note

Same validation applies when updating a transfer note. If new quantities exceed available stock, the update is rejected.

## Stock Calculation Details

### Movement Types

- **OPENING_STOCK**: Initial stock (counted in opening_qty, not in movements)
- **TRANSFER_IN**: Stock received from another store
- **TRANSFER_OUT**: Stock sent to another store
- **IN**: Other incoming stock (future use)
- **OUT**: Other outgoing stock (future use)

### Example Calculation

**Item X in Store 1:**
- Opening Stock: 50
- Transfer IN: +20 (from Store 2)
- Transfer OUT: -15 (to Store 3)
- Transfer OUT: -10 (to Store 3)

**Current Stock = 50 + 20 - 15 - 10 = 45**

## Implementation Details

### StockCalculator Utility

Located in: `src/utils/stock-calculator.ts`

**Methods:**
- `getCurrentStock(itemId, storeId)` - Calculate current stock
- `validateStockAvailability(itemId, storeId, requiredQty)` - Validate and return result
- `getCurrentStockBatch(items)` - Batch calculation for multiple items

### Integration Points

1. **StoreTransferNoteModel.createTransferNote()**
   - Validates all items before creating transfer
   - Rolls back transaction if validation fails

2. **StoreTransferNoteModel.updateTransferNote()**
   - Validates new quantities before updating
   - Rolls back transaction if validation fails

3. **Error Handling**
   - Validation errors are caught and returned as 400 Bad Request
   - Detailed error messages help users understand the issue

## Best Practices

1. **Always check stock before creating transfer** - The API does this automatically
2. **Handle validation errors gracefully** - Show clear messages to users
3. **Consider concurrent transfers** - Database transactions ensure consistency
4. **Monitor stock levels** - Use stock reports to track availability

## Future Enhancements

Potential improvements:
- Real-time stock availability endpoint
- Stock reservation system (hold stock during transfer creation)
- Batch stock validation API
- Stock alerts when levels are low

## Testing

To test stock validation:

1. **Create item with opening stock:**
   ```json
   POST /api/items
   {
     "item_code": "TEST-001",
     "item_name": "Test Item",
     "opening_stocks": [
       {"store_id": 1, "opening_qty": 10}
     ]
   }
   ```

2. **Try valid transfer:**
   ```json
   POST /api/store-transfer-notes
   {
     "from_store_id": 1,
     "to_store_id": 2,
     "details": [{"item_id": 1, "qty": 5}]
   }
   ```
   ✅ Should succeed

3. **Try invalid transfer:**
   ```json
   POST /api/store-transfer-notes
   {
     "from_store_id": 1,
     "to_store_id": 2,
     "details": [{"item_id": 1, "qty": 15}]
   }
   ```
   ❌ Should fail with validation error
