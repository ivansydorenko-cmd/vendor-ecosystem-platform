#!/bin/bash

echo "🚀 Setting up Vendor Ecosystem Frontend..."
echo ""

if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

echo "📁 Creating frontend project..."
npm create vite@latest frontend -- --template react-ts

cd frontend

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "📦 Installing additional packages..."
npm install react-router-dom@6 @auth0/auth0-react axios @tanstack/react-query @tanstack/react-query-devtools
npm install -D tailwindcss@latest postcss@latest autoprefixer@latest @tailwindcss/postcss
npm install class-variance-authority clsx tailwind-merge lucide-react
npm install -D @types/node

echo ""
echo "✅ Frontend setup complete!"
