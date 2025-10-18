#!/bin/bash

# Frontend Setup Script for Vendor Ecosystem Platform
# This script creates a React + TypeScript + Vite project with Auth0

echo "🚀 Setting up Vendor Ecosystem Frontend..."
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "   Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Create frontend directory
echo "📁 Creating frontend project..."
npm create vite@latest frontend -- --template react-ts

cd frontend

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "📦 Installing additional packages..."
# Core dependencies
npm install react-router-dom@6
npm install @auth0/auth0-react
npm install axios
npm install @tanstack/react-query
npm install @tanstack/react-query-devtools

# UI dependencies
npm install -D tailwindcss postcss autoprefixer
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react

# Dev dependencies
npm install -D @types/node

echo ""
echo "⚙️  Initializing Tailwind CSS..."
npx tailwindcss init -p

echo ""
echo "✅ Frontend setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Configure Auth0 settings in frontend/.env"
echo "   2. Update tailwind.config.js"
echo "   3. Set up project structure"
echo ""
echo "🎨 To start development server:"
echo "   cd frontend"
echo "   npm run dev"
