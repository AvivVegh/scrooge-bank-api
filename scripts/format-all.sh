#!/bin/bash

echo "🔧 Formatting all TypeScript files..."

# Format TypeScript files
npm run format

# Fix ESLint issues
npm run lint

echo "✅ Formatting complete!"
echo "📝 You can also run 'npm run format:fix' to format and lint in one command."
