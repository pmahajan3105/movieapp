# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# CineAI Development Guide

*Simple guidelines for working on this personal movie recommendation app*

## Project Overview

**Stack**: Next.js 15, TypeScript, SQLite (better-sqlite3), Tailwind CSS v4, daisyUI
**Purpose**: AI-powered movie recommendations with hyper-personalized engine and voice chat
**Architecture**: Local-first, single-user, privacy-focused (all data stays on your machine)
**Data Location**: `~/.cineai/` (SQLite database + config.json)

## Quick Start

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
# Visit http://localhost:3000/setup to configure
```

## Architecture Overview

### Local-First Design
- **No cloud database** - All data stored locally in SQLite
- **No authentication required** - Single user mode by default
- **Privacy-focused** - Your movie preferences never leave your machine
- **TMDB for movie data** - Fetched on-demand and cached locally

### Data Storage
```
~/.cineai/
├── cineai.db       # SQLite database (movies, ratings, watchlist, sessions)
└── config.json     # User config (name, API keys, preferences)
```

### Key Services
```typescript
// LocalStorageService - All database operations
import { LocalStorageService } from '@/lib/db'

LocalStorageService.getMovies({ query, limit })
LocalStorageService.upsertRating(movieId, { rating, interested })
LocalStorageService.getWatchlist()
LocalStorageService.getChatSession(sessionId)

// ConfigService - Configuration management
import { ConfigService } from '@/lib/config/config-service'

ConfigService.getConfig()
ConfigService.getApiKeys()
ConfigService.isSetupCompleted()
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── setup/           # Setup wizard API
│   │   ├── movies/          # Movie CRUD + search
│   │   ├── ratings/         # User ratings
│   │   ├── watchlist/       # Watchlist management
│   │   ├── ai/chat/         # AI chat with local sessions
│   │   └── user/profile/    # User profile
│   ├── setup/               # Setup wizard page
│   ├── dashboard/           # Main dashboard
│   └── ...
├── components/
│   ├── ai/                  # AI components
│   ├── dashboard/           # Dashboard sections
│   ├── movies/              # Movie cards
│   ├── auth/                # LocalUserGate, etc.
│   └── ui/                  # Reusable UI
├── lib/
│   ├── db/                  # SQLite infrastructure
│   │   ├── schema.ts        # Database schema
│   │   ├── sqlite-client.ts # Connection management
│   │   ├── local-storage-service.ts # Data access layer
│   │   └── index.ts         # Exports
│   ├── config/              # Configuration
│   │   └── config-service.ts # ~/.cineai/config.json management
│   ├── ai/                  # AI engines and models
│   ├── services/            # Business services
│   └── utils/               # Utilities
├── contexts/
│   └── AuthContext.tsx      # Simplified local auth
└── hooks/                   # React hooks
```

## Database Schema

The SQLite database (`~/.cineai/cineai.db`) contains:

| Table | Purpose |
|-------|---------|
| `user_profile` | Single user's name and preferences |
| `movies` | Cached movie data from TMDB |
| `ratings` | User's movie ratings (1-5 stars, interested flag) |
| `watchlist` | Movies to watch, watched status |
| `user_interactions` | Behavioral signals for AI learning |
| `chat_sessions` | AI conversation history |
| `schema_version` | Migration tracking |

## API Routes

All API routes use LocalStorageService instead of cloud database:

```typescript
// Pattern for API routes
import { NextResponse } from 'next/server'
import { LocalStorageService } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(): Promise<NextResponse> {
  try {
    const data = LocalStorageService.getSomething()
    return NextResponse.json({ success: true, data, source: 'local' })
  } catch (error) {
    logger.error('API error', { error })
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
```

### Key Endpoints
- `GET/POST /api/setup` - Check/complete setup
- `GET/POST /api/movies` - Browse/add movies
- `GET /api/movies/refresh` - Refresh movie from TMDB
- `GET /api/movies/[id]/providers` - Streaming availability (where to watch)
- `GET/POST/DELETE /api/ratings` - Manage ratings
- `GET/POST/DELETE/PATCH /api/watchlist` - Manage watchlist
- `POST /api/ai/chat` - AI chat with local sessions
- `GET/POST /api/ai/recommend` - AI recommendations with local scoring
- `GET/POST/PATCH /api/user/profile` - User profile
- `GET/POST /api/user/interactions` - Behavioral signals
- `GET/POST /api/backup` - Export/import user data
- `GET /api/onboarding/movies` - Curated movies for taste onboarding
- `GET/POST /api/onboarding/complete` - Check/complete taste onboarding
- `GET /api/auth/status` - Returns setup status (no auth needed)
- `GET /api/health` - System health check

## Setup Flow

1. User visits app → AuthContext checks `/api/setup`
2. If setup not completed → redirected to `/setup`
3. Setup wizard (3 steps):
   - Enter your name
   - Configure API keys (TMDB required, OpenAI/Anthropic optional)
   - Review and complete
4. Data stored in `~/.cineai/`
5. Redirected to taste onboarding (`/onboarding/taste`)
6. Rate 10+ movies to bootstrap recommendations
7. User redirected to dashboard

## Development Principles

### Do This
- **Use LocalStorageService** for all data operations
- **Use ConfigService** for user configuration
- **Keep it simple** - this is a personal app
- **Cache TMDB data** - save API calls by storing movies locally

### Don't Do This
- **Don't add Supabase imports** - we're local-first now
- **Don't over-engineer** - single user, single machine
- **Don't add authentication complexity** - no users to manage

## AI Integration

### API Keys
Stored in `~/.cineai/config.json` with secure file permissions (0o600):
- **TMDB** - Required for movie data
- **OpenAI** - Optional, for AI chat
- **Anthropic** - Optional, fallback for AI chat

### Chat Sessions
```typescript
// Sessions stored in SQLite
const sessionId = LocalStorageService.createChatSession()
const session = LocalStorageService.getChatSession(sessionId)
LocalStorageService.updateChatSession(sessionId, { messages })
```

### User Context for AI
```typescript
// Get user preferences for AI prompts
const profile = LocalStorageService.getUserProfile()
const genrePrefs = LocalStorageService.getGenrePreferences()
const stats = LocalStorageService.getStats()
```

## Common Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run type-check   # TypeScript validation
npm run lint         # ESLint
npm run lint:fix     # Auto-fix lint issues
npm run test         # Run tests
npm run test:watch   # Watch mode
```

## Environment Variables

For local development, API keys can be set via:
1. Setup wizard (stored in `~/.cineai/config.json`)
2. Environment variables (fallback)

```bash
# Optional - ConfigService checks config.json first
TMDB_API_KEY=           # Movie database
OPENAI_API_KEY=         # AI chat (optional)
ANTHROPIC_API_KEY=      # AI chat fallback (optional)
```

## Styling

Using Tailwind CSS v4 + DaisyUI:

```typescript
// Good - semantic classes
<button className="btn btn-primary">Save</button>

// Good - responsive
<div className="flex flex-col lg:flex-row">
```

## Testing

```bash
npm run test                 # All tests
npm run test:watch           # Watch mode
npm run test:components      # Component tests
npm run test:api             # API tests
```

## Key Files to Know

| File | Purpose |
|------|---------|
| `src/lib/db/local-storage-service.ts` | All database operations |
| `src/lib/config/config-service.ts` | Config file management |
| `src/contexts/AuthContext.tsx` | Setup status checking |
| `src/app/setup/page.tsx` | Setup wizard UI |
| `src/app/api/setup/route.ts` | Setup API |
| `src/lib/ai/models.ts` | AI model selection |

## Troubleshooting

### Database not found
The database is created automatically on first access at `~/.cineai/cineai.db`.

### API keys not working
Check `~/.cineai/config.json` or set environment variables.

### TMDB images not loading
Ensure TMDB API key is configured in setup or environment.

### AI chat not working
At least one of OpenAI or Anthropic API key must be configured.

## Current Status

**Completed Migration (December 2025)**:
- SQLite infrastructure with better-sqlite3
- LocalStorageService for all data operations
- ConfigService for `~/.cineai/config.json`
- Setup wizard at `/setup`
- All API routes migrated to local-first
- Auth routes simplified (no authentication needed)
- AI recommendations with local scoring engine

**New Features (December 2025)**:
- **Export/Backup** - Download all data as JSON, import from backup (Settings > Data tab)
- **Streaming Availability** - See where to watch movies (Netflix, Prime, etc.) via TMDB
- **Taste Onboarding** - Rate 10+ movies on first use to bootstrap recommendations

**What's Working**:
- Movie browsing and search (TMDB + local cache)
- Ratings and watchlist management
- AI chat with conversation history
- AI recommendations based on local preferences
- User profile and preferences
- Genre preference tracking
- Streaming provider info (where to watch)
- Data export/import for backup

---

## Summary

**This is a local-first personal app**:
- All data in `~/.cineai/`
- No cloud dependencies for core features
- TMDB API for movie data (cached locally)
- Optional AI features with your own API keys
- Simple, private, yours

**When in doubt**: Keep it simple, keep it local!

---

*Last updated: December 2025*
