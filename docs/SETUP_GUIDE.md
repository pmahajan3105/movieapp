# CineAI Movie Recommendation App - Setup Guide

This is the **single source of truth** for setting up the CineAI Movie Recommendation App from scratch.

## Prerequisites

- Node.js 18+ and npm
- Git
- A Supabase account (required for authentication)
- A TMDB API account (optional but recommended for rich movie data)
- An Anthropic API account (required for AI recommendations)

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd movie
npm install
```

### 2. Environment Configuration

Create a `.env.local` file in the root directory:

```bash
cp env.example .env.local
```

Edit `.env.local` with your actual values:

```bash
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Site URL for OAuth redirects
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Movie Database API (OPTIONAL)
TMDB_API_KEY=your_tmdb_api_key_here

# AI API (REQUIRED for recommendations)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Environment
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=development

# AI Model Configuration (optional - sensible defaults provided)
AI_DEFAULT_MODEL=claude-3-7-sonnet-20250219
AI_CHAT_MODEL=claude-3-7-sonnet-20250219
AI_FAST_MODEL=claude-3-5-haiku-20241022

# Development flags
DEVELOPMENT_LOGGING=true
```

### 3. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

## Detailed API Setup

### Supabase Setup (Required)

Supabase provides authentication, database, and real-time features.

1. **Create Account & Project:**

   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for project initialization (2-3 minutes)

2. **Get API Keys:**

   - Go to Settings > API
   - Copy the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy the **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy the **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

3. **Database Setup:**

   ```bash
   # Run migrations to create required tables
   npm run db:migrate
   ```

   This creates:

   - `movies` - Movie data and metadata
   - `user_profiles` - User information and preferences
   - `ratings` - User movie ratings
   - `watchlist_items` - User watchlists
   - `chat_sessions` - AI chat conversations

### TMDB API Setup (Optional)

TMDB provides rich movie data, posters, and metadata.

1. **Create Account:**

   - Go to [themoviedb.org](https://www.themoviedb.org/)
   - Create a free account

2. **Request API Key:**
   - Go to Settings > API
   - Request an API key (v3 auth)
   - Copy the key → `TMDB_API_KEY`

**Note:** Without TMDB, the app uses a basic movie database. With TMDB, you get posters, detailed metadata, and search features.

### Anthropic API Setup (Required)

Anthropic Claude powers the AI recommendation engine.

1. **Create Account:**

   - Go to [console.anthropic.com](https://console.anthropic.com)
   - Sign up and verify your account

2. **Get API Key:**
   - Go to API Keys section
   - Create a new API key
   - Copy the key → `ANTHROPIC_API_KEY`

**Note:** You'll need API credits for recommendations to work. The app uses efficient models to minimize costs.

## Database Setup & Seeding

### Run Migrations

```bash
npm run db:migrate
```

### Seed Sample Data (Optional)

```bash
npm run db:seed
```

This populates your database with sample movies using the TMDB API (if configured).

## Testing the Setup

### 1. Basic Functionality Test

Visit [http://localhost:3000/api/test-seed](http://localhost:3000/api/test-seed) to verify:

- ✅ Supabase connection
- ✅ TMDB API access (if configured)
- ✅ Database tables created
- ✅ Basic app functionality

### 2. Authentication Test

1. Go to the login page
2. Try magic link authentication
3. Complete user onboarding
4. Access the dashboard

### 3. AI Features Test

1. Navigate to the movies page
2. Try the AI chat feature
3. Get personalized recommendations

## What Works Without Full Setup

- **Landing page** - Works without any API keys
- **Basic navigation** - UI components load correctly
- **Static movie data** - Limited functionality without TMDB

## What Requires Setup

- **Authentication** - Requires Supabase configuration
- **User profiles & watchlists** - Requires Supabase database
- **AI recommendations** - Requires Anthropic API key
- **Rich movie data** - Requires TMDB API key

## Development Tools

### Supabase CLI (for type generation)

```bash
# macOS (recommended)
brew install supabase/tap/supabase

# Other platforms – see https://github.com/supabase/cli#install

# Generate TypeScript types when schema changes:
npm run generate:types
```

This writes `src/types/supabase-generated.ts` for compile-time type safety.

### Environment Variables Checklist

**Required for Basic Functionality:**

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `ANTHROPIC_API_KEY`

**Optional but Recommended:**

- [ ] `TMDB_API_KEY` - For rich movie data and posters
- [ ] `GROQ_API_KEY` - For additional AI model options
- [ ] `OPENAI_API_KEY` - For OpenAI models

## Troubleshooting

### Common Issues

**"TMDB API key not configured"**

- Verify your `TMDB_API_KEY` is correctly set in `.env.local`
- Make sure you're using the v3 API key, not v4
- Restart the development server after changing environment variables

**"Supabase connection failed"**

- Check your Supabase URL and keys in `.env.local`
- Ensure your Supabase project is active (not paused)
- Verify database migrations have been run
- Check Supabase dashboard for any service issues

**"AI chat not working"**

- Verify your `ANTHROPIC_API_KEY` is set correctly
- Check you have sufficient API credits in your Anthropic account
- Try refreshing the page and testing again

**"Movies not loading"**

- Test your TMDB API key manually at: `https://api.themoviedb.org/3/movie/popular?api_key=YOUR_KEY`
- Check network connectivity
- Verify database tables were created correctly with `npm run db:migrate`

**"Authentication redirect issues"**

- Ensure `NEXT_PUBLIC_SITE_URL` matches your development URL
- Check Supabase project settings for allowed redirect URLs
- Add `http://localhost:3000` to your Supabase auth settings

### Getting Help

1. Check the [GitHub Issues](your-repo-url/issues) for known problems
2. Review Supabase project logs in the dashboard
3. Check browser console for client-side errors
4. Verify all environment variables are properly set

## Production Deployment

For production deployment:

1. **Environment Variables:**

   - Set all required environment variables in your hosting platform
   - Use production URLs for `NEXT_PUBLIC_SITE_URL`
   - Use production Supabase project

2. **Database:**

   - Run migrations on production database
   - Configure Row Level Security (RLS) policies
   - Set up database backups

3. **Security:**

   - Never commit real API keys to version control
   - Use environment-specific API keys
   - Configure proper CORS settings

4. **Monitoring:**
   - Set up error tracking (Sentry, LogRocket, etc.)
   - Monitor API usage and costs
   - Set up uptime monitoring

Your CineAI app should now be fully functional! 🎬✨
