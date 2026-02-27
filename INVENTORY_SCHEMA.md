# Inventory Management System - TypeORM Schema Design

## Overview
This document describes the complete database schema for the Inventory Management System using TypeORM entities. The schema follows the existing boilerplate conventions (snake_case naming, timestamps, etc.).

---

## Schema Structure

### 1. **Stores** (Profile)
**Purpose**: Physical locations/warehouses where inventory is stored

**Table**: `stores`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-increment ID |
| `store_code` | VARCHAR(50) | UNIQUE, NOT NULL | Unique store identifier |
| `store_name` | VARCHAR(100) | NOT NULL | Store name |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | | Last update timestamp |
| `updated_by` | INTEGER | FK → users(id) | User who last updated |

**Relationships**:
- One-to-Many: `opening_stocks` (stores can have multiple opening stock entries)
- One-to-Many: `store_transfer_notes` (as `from_store` and `to_store`)
- One-to-Many: `stock_movements` (movements per store)

**Why needed**: 
- Tracks multiple physical locations
- Enables multi-store inventory management
- Required for store transfers

---

### 2. **Items** (Profile)
**Purpose**: Product master data - all items in the inventory system

**Table**: `items`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-increment ID |
| `item_code` | VARCHAR(50) | UNIQUE, NOT NULL | Unique item identifier |
| `item_name` | VARCHAR(200) | NOT NULL | Item name |
| `item_category` | VARCHAR(100) | NULLABLE | Item category for grouping |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | | Last update timestamp |
| `updated_by` | INTEGER | FK → users(id) | User who last updated |

**Relationships**:
- One-to-Many: `opening_stocks` (items can have opening stock in multiple stores)
- One-to-Many: `rates` (price history per item)
- One-to-Many: `store_transfer_note_details` (items in transfer notes)
- One-to-Many: `stock_movements` (all stock movements for this item)

**Why needed**:
- Central catalog of all products
- Referenced by rates, stock, and transfers
- Enables item categorization and reporting

---

### 3. **Rates** (Profile - Detail Table for Items)
**Purpose**: Price history for items - tracks rate changes over time

**Table**: `rates`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-increment ID |
| `item_id` | INTEGER | FK → items(id), NOT NULL | Reference to item |
| `rate` | DECIMAL(10,2) | NOT NULL | Price/rate value |
| `effective_date` | TIMESTAMP | DEFAULT NOW() | When this rate becomes effective |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | | Last update timestamp |

**Unique Constraint**: `(item_id, effective_date)` - One rate per item per date

**Relationships**:
- Many-to-One: `items` (each rate belongs to one item)

**Why needed**:
- Maintains price history for reporting
- Allows rate changes over time
- Enables cost calculations at different time periods
- Required for valuation reports

---

### 4. **Opening Stock** (Detail Table for Items Profile)
**Purpose**: Initial stock quantities per item per store

**Table**: `opening_stocks`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-increment ID |
| `item_id` | INTEGER | FK → items(id), NOT NULL | Reference to item |
| `store_id` | INTEGER | FK → stores(id), NOT NULL | Reference to store |
| `opening_qty` | DECIMAL(10,2) | NOT NULL | Initial quantity |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | | Last update timestamp |

**Unique Constraint**: `(item_id, store_id)` - One opening stock entry per item per store

**Relationships**:
- Many-to-One: `items` (each opening stock belongs to one item)
- Many-to-One: `stores` (each opening stock belongs to one store)

**Why needed**:
- Sets initial inventory levels when system starts
- Supports multiple stores per item (e.g., Item X has 20 in Store A, 30 in Store B)
- Starting point for stock calculations
- Required for accurate stock reports

---

### 5. **Store Transfer Notes** (Transaction Master)
**Purpose**: Document header for transferring stock between stores

**Table**: `store_transfer_notes`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-increment ID |
| `v_no` | VARCHAR(50) | UNIQUE, NOT NULL | Voucher/document number |
| `date` | TIMESTAMP | DEFAULT NOW() | Transfer date |
| `ref_no` | VARCHAR(100) | NULLABLE | Reference number (open text) |
| `from_store_id` | INTEGER | FK → stores(id), NOT NULL | Source store |
| `to_store_id` | INTEGER | FK → stores(id), NOT NULL | Destination store |
| `order_no` | VARCHAR(100) | NULLABLE | Order number (open text) |
| `created_by` | INTEGER | FK → users(id), NULLABLE | User who created |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | | Last update timestamp |

**Relationships**:
- Many-to-One: `stores` (as `from_store` - source store)
- Many-to-One: `stores` (as `to_store` - destination store)
- One-to-Many: `store_transfer_note_details` (detail lines)

**Why needed**:
- Documents stock transfers between stores
- Provides audit trail with voucher numbers
- Enables tracking of stock movements
- Master record for transfer transaction

---

### 6. **Store Transfer Note Details** (Transaction Detail)
**Purpose**: Line items in a store transfer - which items and quantities

**Table**: `store_transfer_note_details`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-increment ID |
| `store_transfer_note_id` | INTEGER | FK → store_transfer_notes(id), NOT NULL | Reference to master |
| `item_id` | INTEGER | FK → items(id), NOT NULL | Reference to item |
| `item_code` | VARCHAR(50) | NOT NULL | Item code (denormalized for reporting) |
| `item_name` | VARCHAR(200) | NOT NULL | Item name (denormalized for reporting) |
| `qty` | DECIMAL(10,2) | NOT NULL | Quantity transferred |
| `ref` | VARCHAR(100) | NULLABLE | Reference text (open text) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Relationships**:
- Many-to-One: `store_transfer_notes` (each detail belongs to one transfer note)
- Many-to-One: `items` (each detail references one item)

**Why needed**:
- Allows multiple items per transfer
- Stores item details at time of transfer (denormalized for historical accuracy)
- Enables item-level tracking in transfers
- Required for detailed transfer reports

---

### 7. **Stock Movements** (Transaction History/Audit Trail)
**Purpose**: Complete history of all stock changes - tracks every movement

**Table**: `stock_movements`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-increment ID |
| `item_id` | INTEGER | FK → items(id), NOT NULL | Reference to item |
| `store_id` | INTEGER | FK → stores(id), NOT NULL | Reference to store |
| `movement_type` | VARCHAR(20) | NOT NULL | Type: 'IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'OPENING_STOCK' |
| `qty` | DECIMAL(10,2) | NOT NULL | Quantity moved |
| `reference_type` | VARCHAR(50) | NOT NULL | Source: 'OPENING_STOCK', 'TRANSFER_NOTE' |
| `reference_id` | INTEGER | NULLABLE | ID of source record |
| `v_no` | VARCHAR(50) | NULLABLE | Voucher number (for transfers) |
| `date` | TIMESTAMP | DEFAULT NOW() | Movement date |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Indexes**:
- `(item_id, store_id)` - For stock calculations
- `(date)` - For date-based reports

**Relationships**:
- Many-to-One: `items` (each movement is for one item)
- Many-to-One: `stores` (each movement is in one store)

**Why needed**:
- Complete audit trail of all stock changes
- Enables calculation of current stock: SUM(IN) - SUM(OUT)
- Supports historical reporting
- Tracks source of each movement (opening stock vs transfer)
- Required for stock register and movement reports

---

## Entity Relationships Diagram

```
┌─────────────┐
│   Stores    │
│─────────────│
│ id (PK)     │◄─────┐
│ store_code  │      │
│ store_name  │      │
└─────────────┘      │
                     │
┌─────────────┐      │      ┌──────────────────────┐
│   Items      │      │      │  Opening Stocks      │
│─────────────│      │      │──────────────────────│
│ id (PK)     │◄─────┼──────│ id (PK)              │
│ item_code   │      │      │ item_id (FK)         │
│ item_name   │      │      │ store_id (FK)        │
│ category    │      │      │ opening_qty          │
└─────────────┘      │      └──────────────────────┘
     │               │
     │               │
     │               │      ┌──────────────────────┐
     │               │      │  Store Transfer Notes │
     │               │      │──────────────────────│
     │               │      │ id (PK)              │
     │               │      │ v_no (UNIQUE)        │
     │               │      │ from_store_id (FK)   │──┐
     │               │      │ to_store_id (FK)     │──┤
     │               │      │ date                 │  │
     │               │      └──────────────────────┘  │
     │               │              │                 │
     │               │              │                 │
     │               │              ▼                 │
     │               │      ┌──────────────────────┐ │
     │               │      │ Transfer Note Details │ │
     │               │      │──────────────────────│ │
     │               │      │ id (PK)              │ │
     │               │      │ transfer_note_id (FK)│ │
     │               │      │ item_id (FK)         │─┘
     │               │      │ qty                 │
     │               │      └──────────────────────┘
     │               │
     │               │      ┌──────────────────────┐
     │               │      │  Stock Movements     │
     │               │      │──────────────────────│
     │               │      │ id (PK)              │
     │               │      │ item_id (FK)         │─┐
     │               │      │ store_id (FK)        │─┤
     │               │      │ movement_type        │ │
     │               │      │ qty                  │ │
     │               │      │ reference_type       │ │
     │               │      │ date                 │ │
     │               │      └──────────────────────┘ │
     │               │                                │
     │               └────────────────────────────────┘
     │
     │               ┌──────────────────────┐
     │               │  Rates               │
     │               │──────────────────────│
     │               │ id (PK)              │
     │               │ item_id (FK)         │─┘
     │               │ rate                 │
     │               │ effective_date       │
     │               └──────────────────────┘
```

---

## Data Flow Example

### Scenario: Transfer 10 units of Item X from Store A to Store B

1. **Create Store Transfer Note** (Master):
   - Insert into `store_transfer_notes`: v_no='STN-001', from_store_id=1, to_store_id=2

2. **Create Transfer Details**:
   - Insert into `store_transfer_note_details`: item_id=X, qty=10, store_transfer_note_id=STN-001

3. **Create Stock Movements** (Automatic):
   - **OUT Movement**: item_id=X, store_id=1 (Store A), movement_type='TRANSFER_OUT', qty=10
   - **IN Movement**: item_id=X, store_id=2 (Store B), movement_type='TRANSFER_IN', qty=10

4. **Calculate Current Stock**:
   - Store A: Opening Stock + SUM(IN movements) - SUM(OUT movements) - 10
   - Store B: Opening Stock + SUM(IN movements) - SUM(OUT movements) + 10

---

## Key Design Decisions

1. **Denormalization in Transfer Details**: 
   - `item_code` and `item_name` stored in details table
   - **Reason**: Preserves historical data even if item name changes later

2. **Stock Movements Table**:
   - Separate table for all movements (not calculated on-the-fly)
   - **Reason**: Better performance, complete audit trail, supports complex queries

3. **Opening Stock as Separate Table**:
   - Not just initial entry in movements
   - **Reason**: Allows easy updates, clear separation of initial vs. transactional data

4. **Rates with Effective Date**:
   - Multiple rates per item with dates
   - **Reason**: Price history, time-based reporting, cost calculations

5. **Movement Types**:
   - Explicit types: IN, OUT, TRANSFER_IN, TRANSFER_OUT, OPENING_STOCK
   - **Reason**: Clear categorization, easier reporting, supports future expansion

---

## Indexes for Performance

1. `stock_movements(item_id, store_id)` - For stock calculations
2. `stock_movements(date)` - For date-based reports
3. `rates(item_id, effective_date)` - For current rate lookups
4. `opening_stocks(item_id, store_id)` - Already unique, but ensures fast lookups
5. `store_transfer_notes(v_no)` - Already unique, for voucher lookups

---

## Next Steps

1. Create TypeORM entities for each table
2. Set up relationships between entities
3. Create migrations
4. Implement models using TypeORM repositories
5. Add seed data for testing
