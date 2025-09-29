#!/bin/bash
echo "🚀 Starting Vendor Ecosystem Platform..."
echo ""

docker-compose down 2>/dev/null

echo "🐳 Starting services..."
docker-compose up -d

echo "⏳ Waiting for database to be ready..."
sleep 15

MAX_TRIES=30
TRIES=0
until docker-compose exec -T postgres pg_isready -U vendor_user &>/dev/null; do
    TRIES=$((TRIES+1))
    if [ $TRIES -eq $MAX_TRIES ]; then
        echo "❌ Database failed to start"
        docker-compose logs postgres
        exit 1
    fi
    echo "  Waiting... ($TRIES/$MAX_TRIES)"
    sleep 2
done

echo "✅ Database is ready!"
echo ""
echo "📊 Running migrations..."
docker-compose exec -T postgres psql -U vendor_user -d vendor_platform_dev < database/migrations/001_initial_schema.sql 2>/dev/null || echo "  Migrations may already be applied"

echo ""
echo "=========================================="
echo "✅ Platform is ready!"
echo "=========================================="
echo ""
echo "📍 API URL: http://localhost:3000/api/v1"
echo "🏥 Health check: http://localhost:3000/health"
echo ""
echo "Test it: open http://localhost:3000/health"
echo ""
echo "📋 Useful commands:"
echo "  View logs: docker-compose logs -f backend"
echo "  Stop platform: docker-compose down"
echo ""
