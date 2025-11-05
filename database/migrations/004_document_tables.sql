-- Document types
CREATE TABLE IF NOT EXISTS document_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT TRUE,
    validity_period_days INT,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenant-specific document requirements
CREATE TABLE IF NOT EXISTS tenant_document_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_type_id UUID NOT NULL REFERENCES document_types(id),
    is_required BOOLEAN DEFAULT TRUE,
    minimum_coverage_amount DECIMAL(12,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, document_type_id)
);

-- Vendor documents
CREATE TABLE IF NOT EXISTS vendor_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    document_type_id UUID NOT NULL REFERENCES document_types(id),
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    expiration_date DATE,
    coverage_amount DECIMAL(12,2),
    status VARCHAR(50) DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document reminders log
CREATE TABLE IF NOT EXISTS document_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_document_id UUID NOT NULL REFERENCES vendor_documents(id) ON DELETE CASCADE,
    reminder_type VARCHAR(20) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vendor_documents_expiration ON vendor_documents(expiration_date, status);

-- Seed common document types
INSERT INTO document_types (name, description, category, validity_period_days, is_required) VALUES
('General Liability Insurance', 'General liability insurance certificate', 'insurance', 365, true),
('Business License', 'Business operation license', 'license', 365, true),
('Electrical License', 'Licensed electrician certification', 'license', 730, false),
('Plumbing License', 'Licensed plumber certification', 'license', 730, false),
('HVAC License', 'HVAC technician certification', 'license', 730, false),
('Background Check', 'Criminal background check results', 'background_check', 365, true),
('Workers Compensation', 'Workers compensation insurance', 'insurance', 365, true)
ON CONFLICT DO NOTHING;
