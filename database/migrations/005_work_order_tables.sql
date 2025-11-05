-- Work orders
CREATE TABLE IF NOT EXISTS work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    sku_id UUID NOT NULL REFERENCES skus(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    address TEXT NOT NULL,
    zipcode VARCHAR(10) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    preferred_date DATE NOT NULL,
    preferred_time_start TIME NOT NULL,
    preferred_time_end TIME,
    vendor_selection_method VARCHAR(50) DEFAULT 'auto_notify',
    assigned_vendor_id UUID REFERENCES vendors(id),
    assigned_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'created',
    completed_at TIMESTAMP,
    completion_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Work order line items (original SKU + add-ons)
CREATE TABLE IF NOT EXISTS work_order_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES skus(id),
    quantity DECIMAL(8,2) DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    is_addon BOOLEAN DEFAULT FALSE,
    addon_reason TEXT,
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendor responses to work orders
CREATE TABLE IF NOT EXISTS work_order_vendor_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    response VARCHAR(50) DEFAULT 'notified',
    response_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    UNIQUE (work_order_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_work_orders_tenant_status ON work_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_vendor_status ON work_orders(assigned_vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_zipcode ON work_orders(zipcode);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON work_orders(created_at);
