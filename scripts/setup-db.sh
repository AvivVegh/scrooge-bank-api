#!/bin/bash

echo "🚀 Setting up NestJS database..."

# Run migrations
echo "🔄 Running database migrations..."
npm run migration:run

echo "🎉 Database setup complete!"
echo ""
