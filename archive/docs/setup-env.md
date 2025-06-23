# Environment Setup Guide

## Required Environment Variables

To run CineAI properly, you need to create a `.env.local` file in the root directory with the following variables:

### 1. Create `.env.local` file:

```bash
cp env.example .env.local
```

### 2. Required Variables for Basic Functionality:

#### Supabase (Required for Authentication)

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

**To get Supabase credentials:**

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings > API
4. Copy the URL and anon key

#### Movie Database API (Optional but Recommended)

```
TMDB_API_KEY=your_tmdb_api_key_here
```

**To get TMDB API key:**

1. Go to [themoviedb.org](https://www.themoviedb.org/)
2. Create an account
3. Go to Settings > API
4. Request an API key

#### AI API (Required for Recommendations)

```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

**To get Anthropic API key:**

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account
3. Go to API Keys
4. Create a new key

### 3. Start the Development Server:

```bash
npm run dev
```

## Current Issue

Without these environment variables:

- ✅ Landing page works
- ❌ Authentication doesn't work
- ❌ Navigation shows incorrectly
- ❌ Dashboard features are unavailable

## Quick Test (Without Environment Setup)

If you want to test the basic UI without setting up APIs:

1. The landing page at `/` should work
2. Test pages are temporarily disabled for security
3. Authentication will show an error until Supabase is configured

## Next Steps

1. Set up the environment variables above
2. Restart the development server
3. Test the login flow
4. Navigate to the dashboard once authenticated
