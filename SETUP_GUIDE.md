# Movie App Setup Guide

This guide will help you fix the current issues and set up your environment properly before committing.

## Current Issues

Based on the logs, we need to fix:

1. ❌ **Cookie sync warnings** - Next.js 15 requires awaiting `cookies()` calls
2. ❌ **Invalid Supabase API key errors** - Environment variables not configured
3. ❌ **Missing database tables** - `chat_sessions` table doesn't exist
4. ❌ **Deprecated Groq model** - Already fixed in code

## Step 1: Environment Variables Setup

Create a `.env.local` file in your project root with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# API Keys
OMDB_API_KEY=your_omdb_api_key
GROQ_API_KEY=your_groq_api_key

# App Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development
```

### How to get these values:

1. **Supabase URLs and Keys:**
   - Go to your Supabase project dashboard
   - Navigate to Settings > API
   - Copy the Project URL and anon/public key
   - Copy the service_role/secret key (keep this secure!)

2. **OMDB API Key:**
   - Go to [OMDb API](http://www.omdbapi.com/apikey.aspx)
   - Register for a free API key

3. **Groq API Key:**
   - Go to [Groq Console](https://console.groq.com/)
   - Create an account and generate an API key

## Step 2: Database Setup

Run the following SQL in your Supabase SQL Editor:

```sql
-- Create the chat_sessions table for CineAI
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  preferences_extracted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);

-- Enable Row Level Security
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy so users can only access their own chat sessions
CREATE POLICY "Users can manage own chat sessions" ON chat_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_sessions_updated_at 
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Step 3: Test the Setup

After setting up the environment variables and database:

1. **Restart your development server:**
   ```bash
   npm run dev
   ```

2. **Test the database connection:**
   Visit `http://localhost:3000/api/test-db` to verify the connection

3. **Check for errors:**
   - No more cookie sync warnings
   - No more "Invalid API key" errors
   - AI chat should work if Groq API key is valid

## Step 4: Verify Features

Test these key features:

- ✅ **Dashboard loads** without database errors
- ✅ **Movie recommendations** load properly
- ✅ **AI chat** works without cookie warnings
- ✅ **Authentication** flows work correctly

## Troubleshooting

### If you still see cookie warnings:
The Next.js 15 cookie sync warnings are currently expected but don't break functionality. They'll be fully resolved when Next.js updates their auth helpers.

### If database errors persist:
1. Verify your Supabase URL and keys are correct
2. Check that the database tables exist
3. Ensure RLS policies are properly configured

### If AI chat fails:
1. Verify your Groq API key is valid
2. Check that the Groq model `llama3-8b-8192` is available

## Ready to Commit

Once all tests pass and no critical errors appear in the logs, you're ready to commit your progress!

```bash
git add .
git commit -m "feat: Complete movie dashboard with AI chat, watchlist, and recommendations

- Add comprehensive movie details page with trailers and ratings
- Implement AI-powered movie preference collection
- Create full-featured watchlist management
- Add similar movie recommendations
- Set up proper authentication and user profiles
- Fix database schema and API configurations"
```

## Next Steps

After committing, consider:

1. **Deploy to production** - Set up environment variables in your hosting platform
2. **Add movie data** - Use the seed script to populate your database
3. **User testing** - Test the full user journey from onboarding to movie discovery
4. **Performance optimization** - Add caching and optimize API calls 