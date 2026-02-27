-- PD Server Database Seed Data Script
-- Run this script to insert initial/seed data into the database
-- Usage: psql -U your_user -d pd_db -f seed-database.sql
-- Note: This script requires tables to be created first (run init-database.sql)

-- ============================================
-- SEED DATA: Insert initial data
-- ============================================

-- Insert Roles
INSERT INTO roles (role_name) VALUES
    ('Admin / IT Cell')
ON CONFLICT (role_name) DO NOTHING;

-- Insert Departments (must exist before users; admin user uses department_id = 1)
INSERT INTO departments (name, description) VALUES
    ('IT / Admin', 'Information Technology and Administration')
ON CONFLICT (name) DO NOTHING;

-- INSERT INTO pages
-- (page_id, page_name, slug, is_report, is_action, description)
-- values(17, 'Audit Trail', 'audit-trail', true,  false, 'To view user actions audit log')
-- on conflict (page_id) do nothing;

INSERT INTO pages
(page_id, page_name, slug, is_report, is_action)
VALUES
(6,  'Business Plans',                  'business-plans',                  false, false),
(7,  'Project Types',                   'project-types',                   false, false),
(8,  'Users',                           'users',                           false, false),
(9,  'Roles',                           'roles',                           false, false),
(11, 'Circles',                         'circles',                         false, false),
(12, 'Divisions',                       'divisions',                       false, false),
(13, 'Sub Divisions',                   'sub-divisions',                   false, false),
(14, 'Departments',                     'departments',                     false, false),
(15, 'Delay Reasons',                   'delay-reasons',                   false, false),
(16, 'Steps',                           'steps',                           false, false),
(17, 'Audit Trail',                     'audit-trail',                     true,  false),
(19, 'Projects Report',                 'projects-report',                 true,  false),
(20, 'Project Issues',                  'project-issues',                  false, false),
(21, 'Issues',                          'issues',                          false, false),
(22, 'Open Project Issue',              'project-issue-open',              false, true),
(23, 'Project Wise Issues',             'project-issues-report',           true,  false),
(24, 'Project Status Snapshot Report',  'projects-status-snapshot-report', true,  false),
(25, 'Progress By Project Type Report', 'progress-by-project-type-report', true,  false),
(26, 'KPIs Report',                     'kpis-report',                     true,  false),
(27, 'Project Initiation',              'business-plan-start',             false, true),
(28, 'Update Progress Start',           'business-plan-detail-start',      false, true),
(29, 'Update Progress Complete',        'business-plan-detail-complete',   false, true),
(31, 'Complete Issue Resolution',       'project-issue-complete',          false, true),
(32, 'Projects Summary Report',         'projects-summary-report',         true,  false),
(47, 'Business Plan Cancellation',      'business-plan-cancel',             false, true),
(33, 'Progress By Department Report',   'progress-by-department-report',   true,  false),
(34, 'Funding Sources',                 'funding-sources',                 false, false),
(35, 'Settings',                        'settings',                        false, false),
(36, 'Quarter Wise Projects',           'quarter-wise-projects-report',    true,  false),
(37, 'Materials',                       'materials',                       false, false),
(38, 'Dashboard',                       'dashboard',                       true,  false),
(39, 'Funding Source Mix Report',       'funding-source-mix-report',       true,  false),
(40, 'Material Allocation',             'bpd-material-allocate',           false, true),
(41, 'Materials Report',                'materials-report',                true,  false),
(42, 'Issues By Cause',                 'issues-by-cause-report',          true,  false),
(43, 'Issues Detail Report',            'issues-detail-report',            true,  false),
(44, 'Issues Categories',               'issues-categories',               false, false),
(45, 'BPD Material Use',                'bpd-material-use',               false, true),
(46, 'Users Report',                    'users-report',                    true,  false);


-- Assign permissions to Admin role (all permissions on all pages)
-- Note: This uses a subquery to get role_id and page_id dynamically
INSERT INTO role_details (role_id, page_id, show, "create", edit, "delete")
SELECT 
    r.role_id,
    p.page_id,
    true, true, true, true
FROM roles r
CROSS JOIN pages p
WHERE r.role_name = 'Admin / IT Cell'
ON CONFLICT (role_id, page_id) DO NOTHING;

-- Insert Users
-- Password hash for 'admin123' (generated with bcrypt, cost factor 10)
-- To generate a new hash for a different password, use:
--   node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('admin123', 10).then(console.log)"
INSERT INTO users (username, password_hash, is_active, department_id, sap_code) VALUES
    ('admin', '$2a$10$hD11oU5mf/sGlvIptSA49e.m2x6AJ2kRwLRGrkQeLUwDc5wYlbrKK', 
     true, 1, 1001)
ON CONFLICT (username) DO NOTHING;

-- Assign Admin role to users
INSERT INTO user_details (user_id, role_id)
SELECT u.id, r.role_id
FROM users u
CROSS JOIN roles r
WHERE u.username IN ('admin', 'user1')
  AND r.role_name = 'Admin / IT Cell'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Link users to departments (admin user -> IT / Admin department, dept_id = 1)
INSERT INTO users_dep (user_id, dept_id)
SELECT u.id, 1
FROM users u
WHERE u.username = 'admin'
ON CONFLICT (user_id, dept_id) DO NOTHING;

INSERT INTO user_details (user_id, role_id)
SELECT u.id, r.role_id
FROM users u
CROSS JOIN roles r
WHERE u.username = 'bappisoft'
  AND r.role_name = 'Admin / IT Cell'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Insert Settings
INSERT INTO settings (year_start, year_end)
VALUES ('07-01', '06-30')
ON CONFLICT DO NOTHING;

-- ============================================
-- Profile hierarchy (for business plans: sub_division sd_id)
-- ============================================
INSERT INTO circles (name, description) VALUES
    ('Default Circle', 'Seed circle for business plans')
ON CONFLICT (name) DO NOTHING;

INSERT INTO divisions (name, circle_id, description) VALUES
    ('Default Division', (SELECT id FROM circles WHERE name = 'Default Circle' LIMIT 1), 'Seed division')
ON CONFLICT (name, circle_id) DO NOTHING;

INSERT INTO sub_divisions (name, division_id, description) VALUES
    ('Default Sub Division', (SELECT id FROM divisions WHERE name = 'Default Division' LIMIT 1), 'Seed sub division')
ON CONFLICT (name, division_id) DO NOTHING;

-- ============================================
-- Project type and steps (for business plans)
-- ============================================
INSERT INTO project_types (ptype_name, department_id) VALUES
    ('Seed Project Type', 1)
ON CONFLICT (ptype_name) DO NOTHING;

INSERT INTO steps (s_name, department_id) VALUES
    ('Planning', 1),
    ('Execution', 1),
    ('Review', 1)
ON CONFLICT (s_name) DO NOTHING;

INSERT INTO project_types_detail (ptype_id, s_id, weightage, t_days, est_cost, "order") VALUES
    (1, (SELECT s_id FROM steps WHERE s_name = 'Planning' AND department_id = 1 LIMIT 1), 20, 5, 1000, 1),
    (1, (SELECT s_id FROM steps WHERE s_name = 'Execution' AND department_id = 1 LIMIT 1), 50, 10, 5000, 2),
    (1, (SELECT s_id FROM steps WHERE s_name = 'Review' AND department_id = 1 LIMIT 1), 30, 3, 500, 3)
ON CONFLICT (ptype_id, s_id) DO NOTHING;

INSERT INTO funding_sources (fs_name, description) VALUES
    ('Internal', 'Internal funding source')
ON CONFLICT (fs_name) DO NOTHING;

-- ============================================
-- Business plans: one per status (0=planned, 1=started, 2=completed, 3=cancelled) with progress data
-- ============================================
INSERT INTO business_plans (ptype_id, dept_id, sd_id, fs_id, proj_name, start_date, completion_date, tar_date, status)
SELECT 1, 1, sd.id, fs.fs_id, v.proj_name, v.start_date, v.completion_date, v.tar_date, v.status
FROM sub_divisions sd
CROSS JOIN funding_sources fs
CROSS JOIN (VALUES
    ('Seed Plan – Planned', NULL::DATE, NULL::DATE, CURRENT_DATE + 30, 0),
    ('Seed Plan – Started', CURRENT_DATE - 5, NULL::DATE, CURRENT_DATE + 25, 1),
    ('Seed Plan – Completed', CURRENT_DATE - 20, CURRENT_DATE - 2, CURRENT_DATE - 2, 2),
    ('Seed Plan – Cancelled', CURRENT_DATE - 10, NULL::DATE, CURRENT_DATE + 20, 3)
) AS v(proj_name, start_date, completion_date, tar_date, status)
WHERE sd.name = 'Default Sub Division' AND fs.fs_name = 'Internal'
  AND NOT EXISTS (SELECT 1 FROM business_plans WHERE proj_name = v.proj_name);

-- Business plan details (progress): one row per step per plan
INSERT INTO business_plans_detail (proj_id, s_id, weightage, t_days, est_cost, "order", status, started_at, completed_at)
SELECT bp.proj_id, pt.s_id, pt.weightage, pt.t_days, pt.est_cost, pt."order",
  CASE bp.status
    WHEN 0 THEN 0
    WHEN 1 THEN CASE pt."order" WHEN 1 THEN 2 WHEN 2 THEN 1 ELSE 0 END
    WHEN 2 THEN 2
    WHEN 3 THEN CASE pt."order" WHEN 1 THEN 1 ELSE 0 END
  END,
  CASE WHEN bp.status IN (1,2,3) AND pt."order" = 1 THEN CURRENT_DATE - 5 WHEN bp.status IN (1,2) AND pt."order" = 2 THEN CURRENT_DATE - 2 WHEN bp.status = 3 AND pt."order" = 1 THEN CURRENT_DATE - 10 ELSE NULL END,
  CASE WHEN bp.status = 2 THEN CURRENT_DATE - 2 WHEN bp.status = 1 AND pt."order" = 1 THEN CURRENT_DATE - 3 ELSE NULL END
FROM business_plans bp
CROSS JOIN project_types_detail pt
WHERE bp.ptype_id = pt.ptype_id AND pt.ptype_id = 1
  AND bp.proj_name LIKE 'Seed Plan – %'
ON CONFLICT (proj_id, s_id) DO NOTHING;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Database seeding completed successfully!';
    RAISE NOTICE 'Default admin credentials: username=admin, password=admin123';
    RAISE NOTICE 'Note: You may need to update the password hash for admin user if the default does not work.';
END $$;

