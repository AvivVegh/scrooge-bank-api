#!/bin/bash

echo "🚀 Setting up NestJS database..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start PostgreSQL and Redis
echo "📦 Starting database services..."
docker-compose -f docker-compose.yml up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker-compose -f docker-compose.yml exec -T postgres pg_isready -U postgres; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done

echo "✅ PostgreSQL is ready!"

# Run migrations
echo "🔄 Running database migrations..."
npm run migration:run

echo "🎉 Database setup complete!"
echo ""
echo "📊 Database services:"
echo "   - PostgreSQL: localhost:5432"
echo "   - Redis: localhost:6379"
echo ""
echo "🔑 Sample users created:"
echo "   - admin@example.com / admin123"
echo "   - user@example.com / user123"
echo ""
echo "🚀 Start the application:"
echo "   npm run start:dev"
