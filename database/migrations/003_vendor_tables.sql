-- Vendor service areas (radius-based)
CREATE TABLE IF NOT EXISTS vendor_service_areas_radius (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    center_address TEXT NOT NULL,
    center_latitude DECIMAL(10, 8),
    center_longitude DECIMAL(11, 8),
    radius_miles INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendor service areas (zip code-based)
CREATE TABLE IF NOT EXISTS vendor_service_areas_zipcodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    zipcode VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (vendor_id, zipcode)
);

-- Vendor capabilities
CREATE TABLE IF NOT EXISTS vendor_capabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES service_categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (vendor_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_service_areas_zipcode ON vendor_service_areas_zipcodes(zipcode);
