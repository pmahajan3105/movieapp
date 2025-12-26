# CineAI Personal Mode Architecture

*A simplified, local-first architecture for personal use on a single device*

## Overview

This document describes the personal-use architecture for CineAI - optimized for a single user running the app on their laptop without the complexity of cloud services or authentication.

## Design Principles

1. **Zero Cloud Dependencies** - No Supabase, no cloud database, no accounts
2. **Single User** - No authentication needed, it's your laptop
3. **Local Data** - All data stored in SQLite on your machine
4. **Privacy First** - Your movie preferences never leave your device
5. **Simple Setup** - First-run wizard, minimal configuration
6. **AI Optional** - Works great without AI keys, better with them

---

## Architecture Comparison

### Before (Cloud Mode)
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│  Next.js    │────▶│  Supabase   │
│             │     │  API Routes │     │  (Cloud DB) │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  TMDB API   │
                    │  OpenAI API │
                    └─────────────┘
```

### After (Personal Mode)
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│  Next.js    │────▶│   SQLite    │
│             │     │  API Routes │     │  (Local DB) │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  TMDB API   │
                    │  OpenAI API │ (optional)
                    └─────────────┘
```

---

## Data Storage

### Location
```
~/.cineai/
├── cineai.db           # SQLite database (all user data)
├── config.json         # API keys and settings
└── backups/            # Automatic backups
    ├── cineai-2025-01-01.db
    └── cineai-2025-01-08.db
```

### SQLite Schema

```sql
-- User profile (single user, no auth)
CREATE TABLE user_profile (
  id INTEGER PRIMARY KEY DEFAULT 1,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  preferences JSON DEFAULT '{}'
);

-- Movies (cached from TMDB)
CREATE TABLE movies (
  id TEXT PRIMARY KEY,  -- UUID
  tmdb_id INTEGER UNIQUE,
  imdb_id TEXT,
  title TEXT NOT NULL,
  year INTEGER,
  genre JSON,           -- ["Action", "Drama"]
  director JSON,        -- ["Christopher Nolan"]
  cast JSON,            -- ["Leonardo DiCaprio", ...]
  plot TEXT,
  poster_url TEXT,
  backdrop_url TEXT,
  rating REAL,          -- TMDB rating
  runtime INTEGER,
  popularity REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User ratings
CREATE TABLE ratings (
  id TEXT PRIMARY KEY,
  movie_id TEXT NOT NULL REFERENCES movies(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  interested BOOLEAN DEFAULT TRUE,
  rated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(movie_id)
);

-- Watchlist
CREATE TABLE watchlist (
  id TEXT PRIMARY KEY,
  movie_id TEXT NOT NULL REFERENCES movies(id),
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  watched BOOLEAN DEFAULT FALSE,
  watched_at DATETIME,
  notes TEXT,
  UNIQUE(movie_id)
);

-- User interactions (for learning preferences)
CREATE TABLE user_interactions (
  id TEXT PRIMARY KEY,
  movie_id TEXT REFERENCES movies(id),
  interaction_type TEXT NOT NULL,  -- 'view', 'click', 'skip', 'search'
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chat sessions (for AI conversations)
CREATE TABLE chat_sessions (
  id TEXT PRIMARY KEY,
  messages JSON DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_movies_tmdb_id ON movies(tmdb_id);
CREATE INDEX idx_movies_title ON movies(title);
CREATE INDEX idx_ratings_movie_id ON ratings(movie_id);
CREATE INDEX idx_watchlist_movie_id ON watchlist(movie_id);
CREATE INDEX idx_interactions_created ON user_interactions(created_at);
```

### Config File Format

```json
{
  "version": "1.0.0",
  "setup_completed": true,
  "user": {
    "name": "John"
  },
  "api_keys": {
    "tmdb": "your-tmdb-key-here",
    "openai": "sk-...",
    "anthropic": "sk-ant-..."
  },
  "preferences": {
    "theme": "dark",
    "default_recommendation_count": 10,
    "quality_threshold": 7.0,
    "include_adult": false
  },
  "backup": {
    "enabled": true,
    "frequency_days": 7,
    "last_backup": "2025-01-01T00:00:00Z"
  }
}
```

---

## User Journey

### First Run (New User)

```
1. User runs: npm start
2. App detects no ~/.cineai/config.json exists
3. Browser opens to /setup (first-run wizard)
4. Wizard collects:
   - Name
   - TMDB API key (or use default)
   - Optional: OpenAI/Anthropic key
5. App creates:
   - ~/.cineai/ directory
   - config.json with settings
   - cineai.db with schema
6. Redirects to dashboard
7. Shows "Rate some movies to get started" prompt
```

### Returning User

```
1. User runs: npm start
2. App detects ~/.cineai/config.json exists
3. Browser opens to / (dashboard)
4. App loads user profile from SQLite
5. Shows personalized recommendations
```

### Rating Movies

```
1. User searches for a movie
2. App fetches from TMDB API
3. App caches movie in local SQLite
4. User rates movie (1-5 stars or like/dislike)
5. Rating saved to SQLite
6. Recommendations update based on new rating
```

### Getting Recommendations

```
Without AI keys:
1. App uses rule-based recommendation engine
2. Scores movies based on:
   - Genre preferences (from ratings)
   - Director/actor preferences
   - Quality threshold
   - Popularity weighting
3. Returns top N movies

With AI keys:
1. App enriches prompts with user context
2. AI generates personalized recommendations
3. Results scored and filtered
4. Returns top N movies with explanations
```

---

## API Routes Changes

### Routes to Modify

| Route | Current (Supabase) | New (SQLite) |
|-------|-------------------|--------------|
| `/api/movies` | Supabase query | SQLite query |
| `/api/ratings` | Supabase + auth | SQLite (no auth) |
| `/api/watchlist` | Supabase + auth | SQLite (no auth) |
| `/api/user/profile` | Supabase + auth | SQLite (no auth) |
| `/api/ai/recommend` | Supabase for context | SQLite for context |
| `/api/ai/chat` | Supabase sessions | SQLite sessions |

### Routes to Remove

- `/api/auth/*` - No authentication needed
- `/api/user/preferences` - Merged into profile
- All analytics routes - Not needed for personal use

### New Routes

| Route | Purpose |
|-------|---------|
| `/api/setup` | First-run wizard API |
| `/api/config` | Get/update configuration |
| `/api/backup` | Trigger manual backup |
| `/api/export` | Export all data as JSON |
| `/api/import` | Import data from JSON |

---

## Services Architecture

### New Services

```typescript
// src/lib/db/sqlite-client.ts
// SQLite database connection and query helpers

// src/lib/db/local-storage-service.ts
// Unified data access layer (replaces Supabase calls)

// src/lib/config/config-service.ts
// Read/write ~/.cineai/config.json

// src/lib/backup/backup-service.ts
// Automatic and manual backups
```

### Service Layer Pattern

```typescript
// All data access goes through LocalStorageService
import { db } from '@/lib/db/sqlite-client'

class LocalStorageService {
  // Movies
  async getMovies(filters?: MovieFilters): Promise<Movie[]>
  async getMovieById(id: string): Promise<Movie | null>
  async upsertMovie(movie: Movie): Promise<Movie>

  // Ratings
  async getRatings(): Promise<Rating[]>
  async upsertRating(movieId: string, rating: number): Promise<Rating>
  async deleteRating(movieId: string): Promise<void>

  // Watchlist
  async getWatchlist(): Promise<WatchlistItem[]>
  async addToWatchlist(movieId: string): Promise<WatchlistItem>
  async removeFromWatchlist(movieId: string): Promise<void>
  async markWatched(movieId: string): Promise<void>

  // User
  async getUserProfile(): Promise<UserProfile>
  async updateUserProfile(data: Partial<UserProfile>): Promise<UserProfile>

  // Interactions (for learning)
  async recordInteraction(type: string, movieId: string, metadata?: object): Promise<void>
  async getRecentInteractions(days: number): Promise<Interaction[]>
}
```

---

## Configuration Management

### Environment Variables (Minimal)

```bash
# .env.local (optional overrides)
PORT=3000                    # Default: 3000
CINEAI_DATA_DIR=~/.cineai   # Default: ~/.cineai
```

### Runtime Configuration

All other configuration stored in `~/.cineai/config.json`:
- API keys (TMDB, OpenAI, Anthropic)
- User preferences
- Backup settings

### API Key Priority

```
1. config.json (user-provided)
2. Environment variable (for Docker/advanced users)
3. Built-in default (TMDB only, rate-limited)
```

---

## Recommendation Engine

### Without AI (Rule-Based)

The app works fully without AI keys using smart rule-based recommendations:

```typescript
interface RecommendationFactors {
  genreAffinity: number      // Based on rated movies' genres
  directorPreference: number // Based on rated movies' directors
  actorPreference: number    // Based on rated movies' actors
  qualityScore: number       // TMDB rating vs user threshold
  popularityScore: number    // Balanced for discovery
  recencyBonus: number       // Slight boost for newer movies
  diversityPenalty: number   // Avoid too-similar recommendations
}

// Scoring formula
score = (
  genreAffinity * 0.35 +
  directorPreference * 0.15 +
  actorPreference * 0.10 +
  qualityScore * 0.20 +
  popularityScore * 0.10 +
  recencyBonus * 0.05 +
  diversityPenalty * 0.05
)
```

### With AI (Enhanced)

When AI keys are provided:
- Natural language search ("movies like Inception but more emotional")
- Contextual recommendations ("something light for Friday night")
- Detailed explanations for why movies are recommended
- Conversational preference learning

---

## Setup Wizard Flow

### Page 1: Welcome
```
Welcome to CineAI! 🎬

Your personal AI-powered movie recommendation engine.
All your data stays on this device.

[Let's Get Started →]
```

### Page 2: Your Name
```
What should I call you?

[_______________]

This is just for personalization - no account needed!

[← Back]  [Continue →]
```

### Page 3: Movie Database
```
Movie Information

CineAI uses TMDB (The Movie Database) for movie info,
posters, and ratings.

○ Use built-in access (recommended)
  Works for personal use, may have rate limits

○ Use my own TMDB API key
  Get one free at themoviedb.org
  [_______________]

[← Back]  [Continue →]
```

### Page 4: AI Features (Optional)
```
AI-Powered Recommendations (Optional)

Add an AI key for smarter recommendations and
natural language search.

□ Skip for now - use smart rule-based recommendations
  (Works great! You can add AI later in settings)

□ OpenAI API Key
  [_______________]

□ Anthropic API Key
  [_______________]

[← Back]  [Finish Setup →]
```

### Page 5: Complete
```
You're all set, {name}! 🎉

Start by rating a few movies you've seen.
The more you rate, the better recommendations get.

[Start Rating Movies →]
```

---

## Backup & Data Portability

### Automatic Backups

```typescript
// Runs on app startup if last backup > 7 days
async function autoBackup() {
  const config = await getConfig()
  const lastBackup = new Date(config.backup.last_backup)
  const daysSince = (Date.now() - lastBackup.getTime()) / (1000 * 60 * 60 * 24)

  if (daysSince >= config.backup.frequency_days) {
    await createBackup()
  }
}
```

### Manual Export

```json
// GET /api/export returns:
{
  "version": "1.0.0",
  "exported_at": "2025-01-01T00:00:00Z",
  "user": {
    "name": "John",
    "preferences": {}
  },
  "ratings": [
    { "movie_id": "...", "tmdb_id": 123, "title": "...", "rating": 5, "rated_at": "..." }
  ],
  "watchlist": [
    { "movie_id": "...", "tmdb_id": 456, "title": "...", "added_at": "...", "watched": false }
  ]
}
```

### Import

```typescript
// POST /api/import
// Merges imported data with existing (doesn't overwrite)
// Handles conflicts by keeping newer data
```

---

## Migration from Cloud Mode

For users who have existing data in Supabase:

```bash
# Export from Supabase
npm run export:cloud

# Creates: ~/cineai-cloud-export.json

# Import to local
npm run import:local ~/cineai-cloud-export.json
```

---

## Security Considerations

### API Keys

- Stored in `~/.cineai/config.json` (user's home directory)
- File permissions: 600 (owner read/write only)
- Never sent to any server except the intended API

### Local Data

- SQLite database is unencrypted (standard for local apps)
- If encryption needed, use SQLCipher (future enhancement)
- All data stays on local machine

### Network Requests

Only outbound requests to:
- `api.themoviedb.org` - Movie data
- `api.openai.com` - AI features (if configured)
- `api.anthropic.com` - AI features (if configured)

No telemetry, no analytics, no tracking.

---

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create SQLite client (`src/lib/db/sqlite-client.ts`)
- [ ] Create LocalStorageService
- [ ] Create ConfigService
- [ ] Set up database initialization

### Phase 2: Migrate API Routes
- [ ] `/api/movies` - SQLite queries
- [ ] `/api/ratings` - SQLite, no auth
- [ ] `/api/watchlist` - SQLite, no auth
- [ ] `/api/user/profile` - SQLite, no auth
- [ ] `/api/ai/recommend` - Use LocalStorageService
- [ ] `/api/ai/chat` - Use LocalStorageService

### Phase 3: Setup Wizard
- [ ] Create `/setup` page
- [ ] Create `/api/setup` endpoint
- [ ] First-run detection
- [ ] Config file creation

### Phase 4: Remove Cloud Dependencies
- [ ] Remove Supabase client imports
- [ ] Remove auth middleware
- [ ] Remove Supabase environment variables
- [ ] Update documentation

### Phase 5: Polish
- [ ] Settings page for updating API keys
- [ ] Backup/restore functionality
- [ ] Export/import feature
- [ ] Update README

---

## File Structure (After Migration)

```
src/
├── app/
│   ├── setup/              # First-run wizard
│   │   └── page.tsx
│   ├── api/
│   │   ├── setup/          # Setup API
│   │   ├── config/         # Config API
│   │   ├── movies/         # Movie queries
│   │   ├── ratings/        # User ratings
│   │   ├── watchlist/      # User watchlist
│   │   ├── ai/             # AI features
│   │   ├── backup/         # Backup API
│   │   └── export/         # Export/import
│   └── ...
├── lib/
│   ├── db/
│   │   ├── sqlite-client.ts
│   │   ├── schema.ts
│   │   └── local-storage-service.ts
│   ├── config/
│   │   └── config-service.ts
│   ├── backup/
│   │   └── backup-service.ts
│   └── ai/                 # Existing AI services
└── ...
```

---

## Summary

This architecture transforms CineAI from a cloud-dependent app to a truly personal, local-first application:

| Aspect | Cloud Mode | Personal Mode |
|--------|------------|---------------|
| Setup time | 15-30 minutes | 2 minutes |
| Accounts needed | Supabase + API keys | Just API keys (optional) |
| Data location | Cloud | Your laptop |
| Internet required | Always | Only for TMDB/AI |
| Privacy | Data in cloud | 100% local |
| Complexity | High | Low |

The result is a simpler, more private, and easier-to-use personal movie recommendation engine.
