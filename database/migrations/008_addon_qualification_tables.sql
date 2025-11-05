-- Pre-approved add-on SKU relationships
CREATE TABLE IF NOT EXISTS addon_skus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
    addon_sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
    is_auto_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (parent_sku_id, addon_sku_id)
);

-- Vendor tenant qualifications (cross-tenant vendor management)
CREATE TABLE IF NOT EXISTS vendor_tenant_qualifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    qualified_at TIMESTAMP,
    qualified_by UUID REFERENCES users(id),
    disqualified_at TIMESTAMP,
    disqualified_by UUID REFERENCES users(id),
    disqualification_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (vendor_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_addon_skus_parent ON addon_skus(parent_sku_id);
CREATE INDEX IF NOT EXISTS idx_addon_skus_addon ON addon_skus(addon_sku_id);
CREATE INDEX IF NOT EXISTS idx_vendor_qualifications_vendor ON vendor_tenant_qualifications(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_qualifications_tenant ON vendor_tenant_qualifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendor_qualifications_status ON vendor_tenant_qualifications(status);
