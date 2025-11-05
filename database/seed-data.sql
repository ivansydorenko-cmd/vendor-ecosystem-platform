-- ============================================
-- Vendor Ecosystem Platform - Essential Seed Data (Fixed for actual schema)
-- ============================================

BEGIN;

-- ============================================
-- 1. ADDITIONAL TENANTS
-- ============================================
INSERT INTO tenants (id, name, domain, status, vendor_qualification_mode, created_at, updated_at) VALUES
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'HomeServices Pro', 'homeservices.com', 'active', 'manual', NOW(), NOW()),
('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Property Management LLC', 'propmgmt.com', 'active', 'auto', NOW(), NOW()),
('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'City Facility Services', 'cityfacility.gov', 'active', 'manual', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. USERS (Client-side users only)
-- ============================================
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, status, created_at, updated_at) VALUES
-- HomeServices Pro users
('e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'sarah.johnson@homeservices.com', '$2a$10$dummyhash', 'Sarah', 'Johnson', '+14155551001', 'active', NOW(), NOW()),
('f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c', 'mike.chen@homeservices.com', '$2a$10$dummyhash', 'Mike', 'Chen', '+14155551002', 'active', NOW(), NOW()),
-- Property Management users
('a7b8c9d0-e1f2-0a1b-4c5d-6e7f8a9b0c1d', 'david.martinez@propmgmt.com', '$2a$10$dummyhash', 'David', 'Martinez', '+13105552001', 'active', NOW(), NOW()),
('b8c9d0e1-f2a3-1b2c-5d6e-7f8a9b0c1d2e', 'lisa.wong@propmgmt.com', '$2a$10$dummyhash', 'Lisa', 'Wong', '+13105552002', 'active', NOW(), NOW()),
-- City Facility users
('c9d0e1f2-a3b4-2c3d-6e7f-8a9b0c1d2e3f', 'robert.brown@cityfacility.gov', '$2a$10$dummyhash', 'Robert', 'Brown', '+14155553001', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. USER ROLES
-- ============================================
INSERT INTO user_roles (id, user_id, tenant_id, role, status, created_at) VALUES
('92a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c', 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'admin', 'active', NOW()),
('93a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c', 'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'work_requestor', 'active', NOW()),
('94a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c', 'a7b8c9d0-e1f2-0a1b-4c5d-6e7f8a9b0c1d', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'admin', 'active', NOW()),
('95a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c', 'b8c9d0e1-f2a3-1b2c-5d6e-7f8a9b0c1d2e', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'work_requestor', 'active', NOW()),
('96a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c', 'c9d0e1f2-a3b4-2c3d-6e7f-8a9b0c1d2e3f', 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'admin', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. VENDORS (using correct column names)
-- ============================================
INSERT INTO vendors (id, company_name, business_email, business_phone, business_address, website, registration_status, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111111', 'Ace Plumbing Services', 'owner@aceplumbing.com', '+14155555001', '123 Main St, San Francisco, CA 94102', 'www.aceplumbing.com', 'approved', NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', 'Spark Electric Co', 'dispatch@sparkelectric.com', '+14155555002', '456 Electric Ave, San Francisco, CA 94103', 'www.sparkelectric.com', 'approved', NOW(), NOW()),
('33333333-3333-3333-3333-333333333333', 'Cool HVAC Solutions', 'admin@coolhvac.com', '+15105555003', '789 Climate Rd, Oakland, CA 94601', 'www.coolhvac.com', 'approved', NOW(), NOW()),
('44444444-4444-4444-4444-444444444444', 'Green Lawn Care', 'office@greenlawn.com', '+16505555004', '321 Garden Ln, Palo Alto, CA 94301', 'www.greenlawn.com', 'approved', NOW(), NOW()),
('55555555-5555-5555-5555-555555555555', 'Fix-It-All Maintenance', 'contact@fixitall.com', '+14085555005', '654 Repair Blvd, San Jose, CA 95110', 'www.fixitall.com', 'approved', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. VENDOR SERVICE AREAS
-- ============================================
INSERT INTO vendor_service_areas_zipcodes (id, vendor_id, zipcode, created_at) VALUES
-- Ace Plumbing
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '94102', NOW()),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '94103', NOW()),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '94104', NOW()),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '94105', NOW()),
-- Spark Electric
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '94102', NOW()),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '94103', NOW()),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '94104', NOW()),
-- Cool HVAC
(gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '94601', NOW()),
(gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '94602', NOW()),
(gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '94603', NOW()),
-- Green Lawn
(gen_random_uuid(), '44444444-4444-4444-4444-444444444444', '94301', NOW()),
(gen_random_uuid(), '44444444-4444-4444-4444-444444444444', '94303', NOW()),
-- Fix-It-All
(gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '95110', NOW()),
(gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '95111', NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. VENDOR CAPABILITIES
-- ============================================
INSERT INTO vendor_capabilities (id, vendor_id, category_id, created_at) VALUES
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '634173ac-5fb1-4129-8cdb-723f4255d163', NOW()),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'b8c109e2-c6ab-4aaf-857e-524815b48c2e', NOW()),
(gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '2250f423-5f39-4234-9183-eeea0eb09b80', NOW()),
(gen_random_uuid(), '44444444-4444-4444-4444-444444444444', 'e83d647e-cc75-450a-bdc3-17b9402b5ab9', NOW()),
(gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '98fd79ec-9525-4ae1-8860-cb5b96e21285', NOW()),
(gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '634173ac-5fb1-4129-8cdb-723f4255d163', NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. VENDOR QUALIFICATIONS
-- ============================================
INSERT INTO vendor_tenant_qualifications (id, vendor_id, tenant_id, status, qualified_at, qualified_by, notes, created_at, updated_at) VALUES
-- HomeServices Pro
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'qualified', NOW(), 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'Excellent track record', NOW(), NOW()),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'qualified', NOW(), 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'Licensed electrician', NOW(), NOW()),
(gen_random_uuid(), '55555555-5555-5555-5555-555555555555', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'pending', NULL, NULL, NULL, NOW(), NOW()),
-- Property Management LLC
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'qualified', NOW(), 'a7b8c9d0-e1f2-0a1b-4c5d-6e7f8a9b0c1d', 'Auto-approved', NOW(), NOW()),
(gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'qualified', NOW(), 'a7b8c9d0-e1f2-0a1b-4c5d-6e7f8a9b0c1d', 'Auto-approved', NOW(), NOW()),
-- City Facility Services
(gen_random_uuid(), '44444444-4444-4444-4444-444444444444', 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'qualified', NOW(), 'c9d0e1f2-a3b4-2c3d-6e7f-8a9b0c1d2e3f', 'Landscaping contract', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. ADDITIONAL SKUs
-- ============================================
INSERT INTO skus (id, tenant_id, category_id, sku_code, name, description, current_price, estimated_duration_minutes, status, is_addon_allowed, created_at) VALUES
-- HomeServices Pro SKUs
(gen_random_uuid(), 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '634173ac-5fb1-4129-8cdb-723f4255d163', 'HSP-PLUMB-001', 'Drain Cleaning', 'Professional drain cleaning service', 150.00, 90, 'active', true, NOW()),
(gen_random_uuid(), 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'b8c109e2-c6ab-4aaf-857e-524815b48c2e', 'HSP-ELEC-001', 'Outlet Installation', 'Install new electrical outlet', 95.00, 45, 'active', true, NOW()),
(gen_random_uuid(), 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '2250f423-5f39-4234-9183-eeea0eb09b80', 'HSP-HVAC-001', 'AC Maintenance', 'Annual AC system checkup', 175.00, 120, 'active', false, NOW()),
-- Property Management LLC SKUs
(gen_random_uuid(), 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', '634173ac-5fb1-4129-8cdb-723f4255d163', 'PM-PLUMB-001', 'Toilet Repair', 'Fix running or leaking toilet', 110.00, 60, 'active', true, NOW()),
(gen_random_uuid(), 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', '2250f423-5f39-4234-9183-eeea0eb09b80', 'PM-HVAC-001', 'Heater Service', 'Heating system repair', 200.00, 120, 'active', true, NOW()),
-- City Facility Services SKUs
(gen_random_uuid(), 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'e83d647e-cc75-450a-bdc3-17b9402b5ab9', 'CITY-LAND-001', 'Lawn Mowing', 'Municipal lawn mowing service', 120.00, 90, 'active', false, NOW())
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Tenants' as entity, COUNT(*) as total FROM tenants
UNION ALL
SELECT 'Users', COUNT(*) FROM users
UNION ALL
SELECT 'Vendors', COUNT(*) FROM vendors
UNION ALL  
SELECT 'SKUs', COUNT(*) FROM skus
UNION ALL
SELECT 'Vendor Service Areas', COUNT(*) FROM vendor_service_areas_zipcodes
UNION ALL
SELECT 'Vendor Capabilities', COUNT(*) FROM vendor_capabilities
UNION ALL
SELECT 'Qualifications', COUNT(*) FROM vendor_tenant_qualifications;

SELECT '✅ Seed data completed successfully!' as status;
