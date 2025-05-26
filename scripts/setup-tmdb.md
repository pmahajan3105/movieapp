# 🎬 Setting up TMDB API Key

## Quick Setup

1. **Get TMDB API Key:**
   - Go to [The Movie Database (TMDB)](https://www.themoviedb.org/settings/api)
   - Create a free account
   - Request an API key (takes a few minutes)
   - Copy your API key

2. **Add to Environment:**
   ```bash
   # Add this line to your .env.local file:
   TMDB_API_KEY=your_actual_api_key_here
   ```

3. **Restart Development Server:**
   ```bash
   npm run dev
   ```

## For Testing (Temporary)

```bash
# Set for current session only:
export TMDB_API_KEY="your_api_key_here"
npm run dev
```

## What This Enables

✅ **Real-time Movie Discovery**: Access to 1M+ movies from TMDB database  
✅ **AI-Powered Recommendations**: LLM can recommend ANY movie, not just our local database  
✅ **Rich Movie Data**: Posters, cast, crew, ratings, release dates  
✅ **International Cinema**: Movies from all countries and languages  
✅ **Latest Releases**: Up-to-date movie information  

## Free Tier Limits

- **1,000 requests per day** (more than enough for development)
- **40 requests per 10 seconds**
- No cost - completely free for personal/development use

The TMDB API key is required for the new AI recommendation system to work properly. 