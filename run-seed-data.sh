#!/bin/bash

# Seed Data Runner for Vendor Ecosystem Platform
# This script runs the seed data SQL file

echo "🌱 Starting seed data process..."
echo ""

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running or you don't have permission"
    exit 1
fi

# Check if database container is running
if ! docker ps | grep -q vendor_platform_db; then
    echo "❌ Error: Database container is not running"
    echo "   Run: docker-compose up -d"
    exit 1
fi

# Check if seed file exists
if [ ! -f "database/seed-data.sql" ]; then
    echo "❌ Error: database/seed-data.sql not found"
    echo "   Please create the file first"
    exit 1
fi

echo "📊 Database container found"
echo "📄 Seed file found"
echo ""
echo "⏳ Running seed data script..."
echo ""

# Run the seed script
docker exec -i vendor_platform_db psql -U vendor_user -d vendor_platform_dev < database/seed-data.sql

# Check if it was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Seed data inserted successfully!"
    echo ""
    echo "📈 Summary:"
    echo "   - 5 Tenants"
    echo "   - 13 Users (admins, requestors, vendors)"
    echo "   - 5 Vendors with capabilities"
    echo "   - 12+ SKUs across categories"
    echo "   - 9 Work orders (various states)"
    echo "   - Vendor documents & qualifications"
    echo "   - 2 Invoices & feedback entries"
    echo ""
    echo "🧪 Test the data:"
    echo "   docker exec -it vendor_platform_db psql -U vendor_user -d vendor_platform_dev"
    echo "   Then run: SELECT * FROM tenants;"
else
    echo ""
    echo "❌ Error: Seed data insertion failed"
    echo "   Check the error messages above"
    exit 1
fi
