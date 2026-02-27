-- PD Server Database Schema Script
-- Run this script to create all database tables
-- Usage: psql -U your_user -d pd_db -f init-database.sql
-- Note: This script only creates tables. Run seed-database.sql to insert initial data.

-- ============================================
-- SCHEMA: Create all tables (ordered by dependencies)
-- ============================================

-- Enable UUID extension if needed
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- LEVEL 1: Tables with no dependencies
-- ============================================

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pages Table
CREATE TABLE IF NOT EXISTS pages (
    page_id SERIAL PRIMARY KEY,
    page_name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(1000),
    is_report BOOLEAN DEFAULT false,
    is_action BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Types Table
CREATE TABLE IF NOT EXISTS project_types (
    ptype_id SERIAL PRIMARY KEY,
    ptype_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Steps Table
CREATE TABLE IF NOT EXISTS steps (
    s_id SERIAL PRIMARY KEY,
    s_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    year_start VARCHAR(10) NOT NULL DEFAULT '07-01',
    year_end VARCHAR(10) NOT NULL DEFAULT '06-30',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- LEVEL 2: Tables depending on Level 1
-- ============================================

-- Role Details Table (depends on roles, pages)
CREATE TABLE IF NOT EXISTS role_details (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    page_id INTEGER NOT NULL REFERENCES pages(page_id) ON DELETE RESTRICT,
    show BOOLEAN DEFAULT false,
    "create" BOOLEAN DEFAULT false,
    edit BOOLEAN DEFAULT false,
    "delete" BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, page_id)
);

-- Project Types Detail Table (depends on project_types, steps)
CREATE TABLE IF NOT EXISTS project_types_detail (
    id SERIAL PRIMARY KEY,
    ptype_id INTEGER NOT NULL REFERENCES project_types(ptype_id) ON DELETE RESTRICT,
    s_id INTEGER NOT NULL REFERENCES steps(s_id) ON DELETE RESTRICT,
    weightage DECIMAL(10, 2) DEFAULT 0,
    t_days INTEGER DEFAULT 0,
    est_cost DECIMAL(15, 2) DEFAULT 0,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ptype_id, s_id)
);

-- ============================================
-- LEVEL 3: Base reference tables (no FK dependencies, but will have updated_by FK added later)
-- ============================================

-- Departments Table (needed by users, business_plans)
CREATE TABLE IF NOT EXISTS departments (
    dept_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    updated_by INTEGER
);

-- Circles Table (needed by divisions, users)
CREATE TABLE IF NOT EXISTS circles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    updated_by INTEGER
);

-- Funding Sources Table (needed by business_plans)
CREATE TABLE IF NOT EXISTS funding_sources (
    fs_id SERIAL PRIMARY KEY,
    fs_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    updated_by INTEGER
);

-- Materials Table
CREATE TABLE IF NOT EXISTS materials (
    m_id SERIAL PRIMARY KEY,
    m_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    updated_by INTEGER
);

-- Delay Reasons Table (needed by bpd_delays)
CREATE TABLE IF NOT EXISTS delay_reasons (
    d_id SERIAL PRIMARY KEY,
    d_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    updated_by INTEGER
);

-- Issues Categories Table
CREATE TABLE IF NOT EXISTS issues_c (
    issue_c_id SERIAL PRIMARY KEY,
    issue_c_name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    updated_by INTEGER
);

-- Issues Table (needed by project_issues)
CREATE TABLE IF NOT EXISTS issues (
    issue_id SERIAL PRIMARY KEY,
    issue_name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    issue_category_id INTEGER REFERENCES issues_c(issue_c_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    updated_by INTEGER
);

-- Steps: add department_id (steps created at Level 1; departments exist at Level 3)
ALTER TABLE steps ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(dept_id) ON DELETE RESTRICT;
UPDATE steps SET department_id = 1 WHERE department_id IS NULL;
ALTER TABLE steps ALTER COLUMN department_id SET NOT NULL;

-- Project types: add department_id (project_types created at Level 1; departments exist at Level 3)
ALTER TABLE project_types ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(dept_id) ON DELETE RESTRICT;
UPDATE project_types SET department_id = 1 WHERE department_id IS NULL;
ALTER TABLE project_types ALTER COLUMN department_id SET NOT NULL;

-- Issues: add department_id (issues created at Level 3)
ALTER TABLE issues ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(dept_id) ON DELETE RESTRICT;
UPDATE issues SET department_id = 1 WHERE department_id IS NULL;
ALTER TABLE issues ALTER COLUMN department_id SET NOT NULL;

-- ============================================
-- LEVEL 4: Tables depending on Level 3
-- ============================================

-- Divisions Table (depends on circles)
CREATE TABLE IF NOT EXISTS divisions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    circle_id INTEGER NOT NULL REFERENCES circles(id) ON DELETE RESTRICT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    updated_by INTEGER,
    UNIQUE(name, circle_id)
);

-- ============================================
-- LEVEL 5: Tables depending on Level 4
-- ============================================

-- Sub Divisions Table (depends on divisions)
CREATE TABLE IF NOT EXISTS sub_divisions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    division_id INTEGER NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    updated_by INTEGER,
    UNIQUE(name, division_id)
);

-- ============================================
-- LEVEL 6: Tables depending on Level 3, 4, 5
-- ============================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    department_id INTEGER REFERENCES departments(dept_id) ON DELETE RESTRICT,
    sap_code INTEGER,
    email VARCHAR(255),
    p_num VARCHAR(100),
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- LEVEL 7: Add foreign key constraints for updated_by columns (now that users table exists)
-- ============================================

DO $$
BEGIN
    -- Add foreign key constraints for updated_by columns
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'departments_updated_by_fkey'
    ) THEN
        ALTER TABLE departments 
            ADD CONSTRAINT departments_updated_by_fkey 
            FOREIGN KEY (updated_by) REFERENCES users(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'circles_updated_by_fkey'
    ) THEN
        ALTER TABLE circles 
            ADD CONSTRAINT circles_updated_by_fkey 
            FOREIGN KEY (updated_by) REFERENCES users(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'funding_sources_updated_by_fkey'
    ) THEN
        ALTER TABLE funding_sources 
            ADD CONSTRAINT funding_sources_updated_by_fkey 
            FOREIGN KEY (updated_by) REFERENCES users(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'materials_updated_by_fkey'
    ) THEN
        ALTER TABLE materials 
            ADD CONSTRAINT materials_updated_by_fkey 
            FOREIGN KEY (updated_by) REFERENCES users(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'delay_reasons_updated_by_fkey'
    ) THEN
        ALTER TABLE delay_reasons 
            ADD CONSTRAINT delay_reasons_updated_by_fkey 
            FOREIGN KEY (updated_by) REFERENCES users(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'issues_updated_by_fkey'
    ) THEN
        ALTER TABLE issues 
            ADD CONSTRAINT issues_updated_by_fkey 
            FOREIGN KEY (updated_by) REFERENCES users(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'divisions_updated_by_fkey'
    ) THEN
        ALTER TABLE divisions 
            ADD CONSTRAINT divisions_updated_by_fkey 
            FOREIGN KEY (updated_by) REFERENCES users(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sub_divisions_updated_by_fkey'
    ) THEN
        ALTER TABLE sub_divisions 
            ADD CONSTRAINT sub_divisions_updated_by_fkey 
            FOREIGN KEY (updated_by) REFERENCES users(id);
    END IF;
END $$;

-- ============================================
-- LEVEL 8: Tables depending on Level 1, 2, 5, 6
-- ============================================

-- User Details Table (depends on users, roles)
CREATE TABLE IF NOT EXISTS user_details (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id)
);

-- Users Sub Divisions Table (depends on users, sub_divisions)
CREATE TABLE IF NOT EXISTS users_sd (
    usd_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    sd_id INTEGER NOT NULL REFERENCES sub_divisions(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, sd_id)
);

-- Users Departments Table (depends on users, departments) – many-to-many user–department
CREATE TABLE IF NOT EXISTS users_dep (
    ud_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    dept_id INTEGER NOT NULL REFERENCES departments(dept_id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, dept_id)
);

-- Project Type Step Detail Table (PTS Detail) (depends on project_types_detail, steps)
CREATE TABLE IF NOT EXISTS pts_detail (
    ptsd_id SERIAL PRIMARY KEY,
    ptd_id INTEGER NOT NULL REFERENCES project_types_detail(id) ON DELETE RESTRICT,
    step_id INTEGER NOT NULL REFERENCES steps(s_id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- LEVEL 9: Tables depending on Level 1, 3, 5
-- ============================================

-- Business Plans Table (depends on project_types, departments, sub_divisions, funding_sources)
CREATE TABLE IF NOT EXISTS business_plans (
    proj_id SERIAL PRIMARY KEY,
    ptype_id INTEGER NOT NULL REFERENCES project_types(ptype_id) ON DELETE RESTRICT,
    dept_id INTEGER NOT NULL REFERENCES departments(dept_id) ON DELETE RESTRICT,
    sd_id INTEGER NOT NULL REFERENCES sub_divisions(id) ON DELETE RESTRICT,
    fs_id INTEGER REFERENCES funding_sources(fs_id) ON DELETE SET NULL,
    proj_name VARCHAR(200) NOT NULL,
    start_date DATE,
    completion_date DATE,
    tar_date DATE NOT NULL,
    status INTEGER DEFAULT 0,
    cancellation_date DATE,
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- business_plans: cancellation fields (for existing DBs)
ALTER TABLE business_plans ADD COLUMN IF NOT EXISTS cancellation_date DATE;
ALTER TABLE business_plans ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- ============================================
-- LEVEL 10: Tables depending on Level 9, 1
-- ============================================

-- Business Plans Detail Table (depends on business_plans, steps)
CREATE TABLE IF NOT EXISTS business_plans_detail (
    bpd_id SERIAL PRIMARY KEY,
    proj_id INTEGER NOT NULL REFERENCES business_plans(proj_id) ON DELETE RESTRICT,
    s_id INTEGER NOT NULL REFERENCES steps(s_id) ON DELETE RESTRICT,
    weightage DECIMAL(10, 2) DEFAULT 0,
    t_days INTEGER DEFAULT 0,
    est_cost DECIMAL(15, 2) DEFAULT 0,
    act_cost DECIMAL(15, 2),
    "order" INTEGER DEFAULT 0,
    status INTEGER DEFAULT 0,
    remarks_1 TEXT,
    remarks_2 TEXT,
    started_at DATE,
    completed_at DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proj_id, s_id)
);

-- ============================================
-- LEVEL 11: Tables depending on Level 10, 3, 6
-- ============================================

-- BPD Delays Table (depends on business_plans_detail, delay_reasons, users)
CREATE TABLE IF NOT EXISTS bpd_delays (
    bpdd_id SERIAL PRIMARY KEY,
    bpd_id INTEGER NOT NULL REFERENCES business_plans_detail(bpd_id) ON DELETE RESTRICT,
    delay_id INTEGER NOT NULL REFERENCES delay_reasons(d_id) ON DELETE RESTRICT,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- BPD Materials Table (depends on business_plans_detail, materials)
CREATE TABLE IF NOT EXISTS bpd_materials (
    bpdm_id SERIAL PRIMARY KEY,
    bpd_id INTEGER NOT NULL REFERENCES business_plans_detail(bpd_id) ON DELETE RESTRICT,
    m_id INTEGER NOT NULL REFERENCES materials(m_id) ON DELETE RESTRICT,
    r_qty DECIMAL(15, 2) DEFAULT 0,
    req_remarks TEXT,
    alloc_qty DECIMAL(15, 2),
    alloc_remarks TEXT,
    status INTEGER DEFAULT 0,
    act_qty DECIMAL(15, 2),
    act_remarks TEXT
);

-- Project Issues Table (depends on issues, business_plans, steps, users)
CREATE TABLE IF NOT EXISTS project_issues (
    pi_id SERIAL PRIMARY KEY,
    issue_id INTEGER NOT NULL REFERENCES issues(issue_id) ON DELETE RESTRICT,
    proj_id INTEGER NOT NULL REFERENCES business_plans(proj_id) ON DELETE RESTRICT,
    s_id INTEGER REFERENCES steps(s_id) ON DELETE SET NULL,
    status INTEGER DEFAULT 0 NOT NULL,
    description TEXT,
    remarks_1 TEXT,
    remarks_2 TEXT,
    remarks_3 TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- project_issues.s_id (if table existed before this column was added)
ALTER TABLE project_issues ADD COLUMN IF NOT EXISTS s_id INTEGER REFERENCES steps(s_id) ON DELETE SET NULL;

-- Audit Trail Table (depends on pages, users)
CREATE TABLE IF NOT EXISTS audit_trail (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('create', 'edit', 'delete')),
    page_id INTEGER NOT NULL REFERENCES pages(page_id) ON DELETE RESTRICT,
    userid INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_action BOOLEAN NOT NULL DEFAULT false,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES: Create indexes for better performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_divisions_circle_id ON divisions(circle_id);
CREATE INDEX IF NOT EXISTS idx_sub_divisions_division_id ON sub_divisions(division_id);
CREATE INDEX IF NOT EXISTS idx_circles_updated_by ON circles(updated_by);
CREATE INDEX IF NOT EXISTS idx_departments_updated_by ON departments(updated_by);
CREATE INDEX IF NOT EXISTS idx_divisions_updated_by ON divisions(updated_by);
CREATE INDEX IF NOT EXISTS idx_sub_divisions_updated_by ON sub_divisions(updated_by);
CREATE INDEX IF NOT EXISTS idx_delay_reasons_updated_by ON delay_reasons(updated_by);
CREATE INDEX IF NOT EXISTS idx_pages_page_name ON pages(page_name);
CREATE INDEX IF NOT EXISTS idx_role_details_role_id ON role_details(role_id);
CREATE INDEX IF NOT EXISTS idx_role_details_page_id ON role_details(page_id);
CREATE INDEX IF NOT EXISTS idx_user_details_user_id ON user_details(user_id);
CREATE INDEX IF NOT EXISTS idx_user_details_role_id ON user_details(role_id);
CREATE INDEX IF NOT EXISTS idx_users_sd_user_id ON users_sd(user_id);
CREATE INDEX IF NOT EXISTS idx_users_sd_sd_id ON users_sd(sd_id);
CREATE INDEX IF NOT EXISTS idx_users_dep_user_id ON users_dep(user_id);
CREATE INDEX IF NOT EXISTS idx_users_dep_dept_id ON users_dep(dept_id);
CREATE INDEX IF NOT EXISTS idx_project_types_ptype_name ON project_types(ptype_name);
CREATE INDEX IF NOT EXISTS idx_project_types_department_id ON project_types(department_id);
CREATE INDEX IF NOT EXISTS idx_delay_reasons_d_name ON delay_reasons(d_name);
CREATE INDEX IF NOT EXISTS idx_steps_s_name ON steps(s_name);
CREATE INDEX IF NOT EXISTS idx_steps_department_id ON steps(department_id);
CREATE INDEX IF NOT EXISTS idx_project_types_detail_ptype_id ON project_types_detail(ptype_id);
CREATE INDEX IF NOT EXISTS idx_project_types_detail_s_id ON project_types_detail(s_id);
CREATE INDEX IF NOT EXISTS idx_pts_detail_ptd_id ON pts_detail(ptd_id);
CREATE INDEX IF NOT EXISTS idx_pts_detail_step_id ON pts_detail(step_id);
CREATE INDEX IF NOT EXISTS idx_business_plans_ptype_id ON business_plans(ptype_id);
CREATE INDEX IF NOT EXISTS idx_business_plans_dept_id ON business_plans(dept_id);
CREATE INDEX IF NOT EXISTS idx_business_plans_sd_id ON business_plans(sd_id);
CREATE INDEX IF NOT EXISTS idx_business_plans_fs_id ON business_plans(fs_id);
CREATE INDEX IF NOT EXISTS idx_business_plans_detail_proj_id ON business_plans_detail(proj_id);
CREATE INDEX IF NOT EXISTS idx_business_plans_detail_s_id ON business_plans_detail(s_id);
CREATE INDEX IF NOT EXISTS idx_bpd_delays_bpd_id ON bpd_delays(bpd_id);
CREATE INDEX IF NOT EXISTS idx_bpd_delays_delay_id ON bpd_delays(delay_id);
CREATE INDEX IF NOT EXISTS idx_bpd_delays_created_by ON bpd_delays(created_by);
CREATE INDEX IF NOT EXISTS idx_bpd_materials_bpd_id ON bpd_materials(bpd_id);
CREATE INDEX IF NOT EXISTS idx_bpd_materials_m_id ON bpd_materials(m_id);
CREATE INDEX IF NOT EXISTS idx_issues_updated_by ON issues(updated_by);
CREATE INDEX IF NOT EXISTS idx_issues_issue_name ON issues(issue_name);
CREATE INDEX IF NOT EXISTS idx_issues_department_id ON issues(department_id);
CREATE INDEX IF NOT EXISTS idx_project_issues_issue_id ON project_issues(issue_id);
CREATE INDEX IF NOT EXISTS idx_project_issues_proj_id ON project_issues(proj_id);
CREATE INDEX IF NOT EXISTS idx_project_issues_s_id ON project_issues(s_id);
CREATE INDEX IF NOT EXISTS idx_project_issues_updated_by ON project_issues(updated_by);
CREATE INDEX IF NOT EXISTS idx_audit_trail_page_id ON audit_trail(page_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_userid ON audit_trail(userid);
CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_trail_event_type ON audit_trail(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_is_action ON audit_trail(is_action);

-- ============================================
-- FUNCTIONS: Create functions
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- TRIGGERS: Create triggers for automatic updated_at
-- ============================================

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_circles_updated_at BEFORE UPDATE ON circles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_divisions_updated_at BEFORE UPDATE ON divisions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sub_divisions_updated_at BEFORE UPDATE ON sub_divisions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_types_updated_at BEFORE UPDATE ON project_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delay_reasons_updated_at BEFORE UPDATE ON delay_reasons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_steps_updated_at BEFORE UPDATE ON steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_types_detail_updated_at BEFORE UPDATE ON project_types_detail
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pts_detail_updated_at BEFORE UPDATE ON pts_detail
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_plans_detail_updated_at BEFORE UPDATE ON business_plans_detail
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_issues_updated_at BEFORE UPDATE ON project_issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Database schema created successfully!';
    RAISE NOTICE 'All tables, indexes, functions, and triggers have been created.';
    RAISE NOTICE 'Next step: Run seed-database.sql to insert initial data.';
END $$;
