-- Inventory Management System - Seed Pages
-- Run this script to add inventory pages to the database
-- Usage: psql -U your_user -d your_database -f seed-inventory-pages.sql
-- Note: This script requires the pages table to exist (run init-database.sql first)

-- ============================================
-- INVENTORY PAGES
-- ============================================

-- Insert Inventory Pages
INSERT INTO pages (page_id, page_name, slug, is_report, is_action, description)
VALUES
  (50, 'Stores', 'stores', false, false, 'Manage store locations'),
  (51, 'Items', 'items', false, false, 'Manage product items'),
  (52, 'Rates', 'rates', false, false, 'Manage item pricing/rates'),
  (53, 'Store Transfer Notes', 'store-transfer-notes', false, false, 'Manage stock transfers between stores'),
  (54, 'Stock Report', 'stock-report', true, false, 'View stock reports with filters'),
  (55, 'Stock Transfer Detail', 'stock-transfer-detail', true, false, 'View detailed stock transfer reports')
ON CONFLICT (page_id) DO NOTHING;

-- ============================================
-- ASSIGN PERMISSIONS TO ADMIN ROLE
-- ============================================

-- Assign all permissions (show, create, edit, delete) to Admin role for inventory pages
INSERT INTO role_details (role_id, page_id, show, "create", edit, "delete")
SELECT 
  r.role_id,
  p.page_id,
  true, true, true, true
FROM roles r
CROSS JOIN pages p
WHERE r.role_name = 'Admin / IT Cell'
  AND p.page_id IN (50, 51, 52, 53, 54, 55)
ON CONFLICT (role_id, page_id) DO NOTHING;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify pages were created
SELECT page_id, page_name, slug, is_report, is_action 
FROM pages 
WHERE page_id IN (50, 51, 52, 53, 54, 55)
ORDER BY page_id;

-- Verify permissions were assigned
SELECT 
  r.role_name,
  p.page_name,
  rd.show,
  rd."create",
  rd.edit,
  rd."delete"
FROM role_details rd
INNER JOIN roles r ON rd.role_id = r.role_id
INNER JOIN pages p ON rd.page_id = p.page_id
WHERE p.page_id IN (50, 51, 52, 53, 54, 55)
ORDER BY p.page_id;
