#!/bin/bash

echo "🎬 Movie App Setup Script"
echo "=========================="

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "✅ .env.local file already exists"
else
    echo "📝 Creating .env.local from template..."
    cp env.example .env.local
    echo "🔧 Please edit .env.local with your actual API keys and Supabase configuration"
    echo "   Refer to SETUP_GUIDE.md for detailed instructions"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if database setup is needed
echo "🗄️  Database Setup Required:"
echo "   1. Go to your Supabase project dashboard"
echo "   2. Navigate to SQL Editor"
echo "   3. Run the SQL from database_setup.sql"
echo "   4. Or copy the SQL from SETUP_GUIDE.md"

echo ""
echo "🚀 Next Steps:"
echo "   1. Edit .env.local with your API keys"
echo "   2. Run the database setup SQL in Supabase"
echo "   3. Start the development server: npm run dev"
echo "   4. Test the setup by visiting /api/test-db"
echo ""
echo "📖 For detailed instructions, see SETUP_GUIDE.md" 