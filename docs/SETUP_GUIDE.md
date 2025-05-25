# Complete Setup Guide

This guide will walk you through setting up the Movie Recommendation App from scratch.

## Prerequisites

- Node.js 18+ and npm
- Git
- A Supabase account
- A TMDB API account
- An Anthropic API account

## Step 1: Clone and Setup

```bash
git clone <your-repo-url>
cd movie-recommendation-app
npm install
```

## Step 2: Environment Configuration

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Movie Database API Keys
TMDB_API_KEY=your_tmdb_api_key_here

# AI API Keys  
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional AI Providers
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

## Step 3: API Key Setup

### 1. **Supabase Setup:**
- Go to [Supabase](https://supabase.com)
- Create a new project
- Go to Settings > API
- Copy the Project URL and anon public key
- Copy the service role key (keep this secret!)

### 2. **TMDB API Key:**
- Go to [The Movie Database (TMDB)](https://www.themoviedb.org/)
- Create a free account
- Go to Settings > API
- Request an API key
- Copy the API key (v3 auth)

### 3. **Anthropic API Key:**
- Go to [Anthropic Console](https://console.anthropic.com)
- Sign up and verify your account
- Go to API Keys section
- Create a new API key
- Copy the key

## Step 4: Database Setup

Run the database migrations to create the required tables:

```bash
npm run db:migrate
```

This will create the following tables:
- `movies` - Movie data
- `user_profiles` - User information and preferences
- `ratings` - User movie ratings
- `watchlist_items` - User watchlists
- `chat_sessions` - AI chat conversations

## Step 5: Seed Initial Data (Optional)

```bash
npm run db:seed
```

This will populate your database with some sample movies using the TMDB API.

## Step 6: Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

## Step 7: Test the Setup

Visit [http://localhost:3000/api/test-seed](http://localhost:3000/api/test-seed) to verify:
- ✅ Supabase connection
- ✅ TMDB API access
- ✅ Basic app functionality

## Troubleshooting

### Common Issues:

1. **"TMDB API key not configured"**
   - Verify your TMDB_API_KEY is correctly set in `.env.local`
   - Make sure you're using the v3 API key, not v4

2. **"Supabase connection failed"**
   - Check your Supabase URL and keys
   - Ensure your Supabase project is active
   - Verify RLS policies are set correctly

3. **AI chat not working**
   - Verify your ANTHROPIC_API_KEY is set
   - Check you have sufficient API credits

4. **Movies not loading**
   - Test your TMDB API key manually
   - Check network connectivity
   - Verify database tables were created correctly

### Environment Variables Checklist:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `TMDB_API_KEY`
- [ ] `ANTHROPIC_API_KEY`

### Optional but Recommended:

- [ ] `GROQ_API_KEY` - For additional AI model options
- [ ] `OPENAI_API_KEY` - For OpenAI models

## Production Deployment

For production deployment, make sure to:

1. Set all environment variables in your hosting platform
2. Update Supabase RLS policies for production
3. Configure proper CORS settings
4. Set up monitoring and logging
5. Test the production environment thoroughly

Your movie recommendation app should now be fully functional! 🎬 