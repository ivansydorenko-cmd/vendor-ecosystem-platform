-- Service categories
CREATE TABLE IF NOT EXISTS service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SKUs
CREATE TABLE IF NOT EXISTS skus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    category_id UUID NOT NULL REFERENCES service_categories(id),
    sku_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    current_price DECIMAL(10,2) NOT NULL,
    estimated_duration_minutes INT,
    status VARCHAR(20) DEFAULT 'active',
    is_addon_allowed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, sku_code)
);

-- SKU price history
CREATE TABLE IF NOT EXISTS sku_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sku_price_history_sku_date ON sku_price_history(sku_id, effective_date);

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    business_phone VARCHAR(20),
    business_email VARCHAR(255),
    website VARCHAR(255),
    business_address TEXT,
    registration_status VARCHAR(50) DEFAULT 'registered',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial service categories
INSERT INTO service_categories (name, description) VALUES
('Plumbing', 'Plumbing repairs and installations'),
('Electrical', 'Electrical work and repairs'),
('HVAC', 'Heating, ventilation, and air conditioning'),
('Landscaping', 'Lawn care and landscaping services'),
('General Maintenance', 'General building maintenance and repairs'),
('Cleaning', 'Cleaning and janitorial services'),
('IT Services', 'Information technology support and services')
ON CONFLICT (name) DO NOTHING;
