# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# CineAI Development Guide

*Simple guidelines for working on this personal movie recommendation app*

## 🎯 Project Overview

**Stack**: Next.js 15, TypeScript, Supabase, Tailwind CSS v4, daisyUI
**Purpose**: AI-powered movie recommendations with hyper-personalized engine and voice chat
**Approach**: Keep it simple, ship features, clean up as you go
**Modes**: Supports both cloud (Supabase) and frictionless local mode (no sign-up required)

## 🚨 Critical: CONTEXT FIRST - NO GUESSWORK

**Before writing ANY code:**
- List files in the target directory to understand structure
- Read existing files to detect patterns (style, structure, logic)
- Identify environment variables, config files, and dependencies
- Ask necessary clarifying questions - challenge vague requirements
- Think about edge cases, inputs, outputs, and constraints

**When making changes:**
- Don't patch - design for maintainability
- Consider all components (frontend, backend, DB, user experience)
- Think through ALL consequences of your changes
- If you break something, fix it across the entire project
- One file per response - don't split file outputs

## 🛠️ Development Principles

### Do This ✅
- **Write the minimum code required** - solve the problem, don't over-engineer
- **Keep components focused** - if it's getting >200 lines, consider splitting
- **Add types instead of `any`** - when you touch a file, fix obvious type issues
- **Test complex business logic** - custom hooks, API routes with important logic
- **Use existing patterns** - follow what's already working in the codebase

### Don't Do This ❌
- **Don't create enterprise architecture** - this isn't a team project
- **Don't add complex abstractions** - YAGNI (You Aren't Gonna Need It)
- **Don't test everything** - skip simple presentational components
- **Don't premature optimize** - make it work first, optimize when needed
- **Don't break existing functionality** - run tests before big changes

## 🏗️ Code Organization

### Project Structure
```
src/
├── app/                    # Next.js 15 App Router (server/client components)
│   ├── api/               # API routes (recommendations, chat, user, etc.)
│   ├── auth/              # Auth pages (login, signup)
│   ├── dashboard/         # Dashboard pages (account, insights, movie details)
│   └── (other routes)/    # Search, watchlist, onboarding
├── components/
│   ├── ai/                # AI-related components (ChatInterface, PreferenceEditor)
│   ├── dashboard/         # Dashboard sections (AILearningDashboard, HyperPersonalizedSection)
│   ├── movies/            # Movie display (MovieCard, HyperPersonalizedMovieCard)
│   ├── auth/              # Auth UI (LocalWelcomeScreen for frictionless mode)
│   ├── chat/              # Chat interface with voice support
│   ├── search/            # Search interface and filters
│   └── ui/                # Reusable UI components (OfflineIndicator, etc.)
├── hooks/                 # Custom React hooks (useAISettings, useMoviesWatchlist)
├── lib/
│   ├── ai/                # AI engines (hyper-personalized-engine, models)
│   ├── services/          # Services (user-memory-service, tmdb-cache)
│   ├── supabase/          # Database client and utilities
│   └── utils/             # Utilities (api-response, rate-limiter, local-storage-manager)
├── contexts/              # React contexts (AuthContext)
├── types/                 # TypeScript definitions
└── __tests__/             # Test files organized by type
```

### When to Split Components
- **> 200 lines**: Probably doing too much
- **Multiple concerns**: Authentication + data fetching + display
- **Hard to understand**: If you can't quickly see what it does

### API Routes Pattern
```typescript
// Use consistent API response format
import { APIResponse, APIErrorHandler } from '@/lib/utils/api-response'

export async function GET(request: Request) {
  try {
    // Your logic here
    return APIResponse.success({ data }, {
      cached: false,
      metadata: { count: data.length }
    })
  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/your-endpoint',
      method: 'GET'
    })
  }
}
```

## 🧪 Testing Strategy

### What to Test
- **API routes with business logic** (recommendations, user preferences)
- **Custom hooks** (`useMovieActions`, `useAISettings`)
- **Complex components** (forms with validation, state management)

### What NOT to Test
- Simple UI components that just display data
- Third-party library wrappers
- Basic CRUD without business logic

### Test Example
```typescript
// Focus on behavior, not implementation
describe('useMovieActions', () => {
  it('should add movie to watchlist', async () => {
    // Test the important business logic
  })
})
```

## 🎨 Styling Guidelines

### Use DaisyUI + Tailwind CSS v4
```typescript
// Good - semantic, readable
<button className="btn btn-primary">
  Save Movie
</button>

// Avoid - too specific, hard to maintain
<button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium">
```

### Responsive Design
```typescript
// Use responsive prefixes
<div className="flex flex-col lg:flex-row">
  <div className="w-full lg:w-1/3">
```

**Note**: We're using Tailwind CSS v4 with @tailwindcss/postcss plugin

## 🔄 AI Integration

### Current AI Features ✅
- **F-1 Hyper-Personalized Engine** - Advanced behavioral learning and recommendations
- **Multi-Provider Support** - OpenAI GPT-5-mini (primary), Claude 4.5 Sonnet (fallback)
- **Voice Chat** - Browser-native Web Speech API (no external service needed)
- **Unified Memory System** - Tracks seen movies, preferences, and behavioral signals
- **Streaming Responses** - Real-time AI chat with streaming support
- **Model Validation** - Runtime AI model validation with graceful fallbacks
- **Rate Limiting** - Built-in protection against API abuse

### Voice Chat Implementation
Located in `src/components/chat/ChatInterface.tsx`:
- **Web Speech Recognition** - Browser-native speech-to-text (no API calls)
- **Speech Synthesis** - Browser-native text-to-speech for AI responses
- **Privacy First** - All processing happens in browser, no audio leaves device
- **Browser Support** - Chromium-based browsers and Safari 17+
- **Seamless Integration** - Works alongside text chat and recommendations

### AI Model Configuration
```typescript
// Located in: src/lib/ai/models.ts
import { getBestModelForTask, DEFAULT_MODEL } from '@/lib/ai/models'

// Primary: GPT-5-mini (92% of GPT-5, 60% lower cost, 400K context)
// Fallback: Claude 4.5 Sonnet (complex analysis, structured outputs)
const model = getBestModelForTask('recommendations')
```

### Adding New AI Features
1. **Choose the right model** - Use `getBestModelForTask()` helper
2. **Add error handling** - AI calls can fail, implement fallbacks
3. **Consider rate limits** - Use the built-in rate limiter
4. **Test with real data** - AI responses vary

```typescript
// Good pattern for AI calls with memory integration
import { UserMemoryService } from '@/lib/services/user-memory-service'

const memory = await UserMemoryService.getUserMemory(userId)
const unseenMovies = await UserMemoryService.filterUnseenMovies(userId, candidates)

// Use memory in AI prompts for context-aware recommendations
```

## 🗃️ Database (Supabase)

### Current Tables
- `users` (auth.users) - User authentication
- `profiles` - User profiles and preferences
- `movies` - Movie database with TMDB integration
- `ratings` - User ratings (1-5 stars)
- `watchlist` - User saved movies
- `user_behavior_signals` - Real-time learning data
- `chat_sessions` - AI conversation history
- `user_movie_interactions` - Interaction tracking
- `user_memory` - Aggregated user context for AI

### Adding New Features
1. **Check existing tables first** - might already have what you need
2. **Create migration** - place in `supabase/migrations/`
3. **Update TypeScript types** - run `npm run db:types`
4. **Test locally** - use local Supabase instance or cloud

### Important Indexes
- Memory system has optimized indexes for performance (see `20250111000001_add_memory_indexes.sql`)
- Always add indexes for frequently queried columns

### Migration Notes
- Recent migrations have been optimized (check `supabase/migrations/202501*.sql`)
- Use `npm run db:migrate` to apply migrations
- Some migrations have multiple versions (e.g., `20250111000000` through `20250111000005`) - use the latest
- Scripts in `scripts/` directory help with migration management

## 🚀 Deployment & Environment

### Environment Variables
```bash
# Required - Database
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Required - AI Services
OPENAI_API_KEY=           # Primary AI provider (GPT-5-mini)
ANTHROPIC_API_KEY=        # Fallback AI provider (Claude)
TMDB_API_KEY=             # Movie database

# Optional - Features
SINGLE_USER_MODE=true     # Skip auth for personal use
ENABLE_RATE_LIMITING=true # API rate limiting
NEXT_PUBLIC_LOCAL_MODE=true  # Enable frictionless local mode (no sign-up)
```

### Frictionless Local Mode
Set `NEXT_PUBLIC_LOCAL_MODE=true` to enable:
- No authentication required - just enter your name
- Data stored in browser localStorage
- Perfect for personal use and self-hosting
- See `src/components/auth/LocalWelcomeScreen.tsx` for implementation
- Uses `src/lib/utils/local-*.ts` utilities for data management

### Local Development
```bash
# Quick Start
npm run dev          # Start Next.js app
npm run dev:clean    # Clean .next and start with turbo
npm run build        # Build for production

# Testing - Run specific test suites
npm run test                  # Run all tests
npm run test:watch            # Watch mode testing
npm run test:api              # Test API routes only
npm run test:components       # Test React components only
npm run test:hooks            # Test custom hooks only
npm run test:lib              # Test utility functions only
npm run test:integration      # Integration tests only
npm run test:coverage         # Generate coverage report
npm run coverage:open         # Open coverage report in browser

# Code Quality
npm run type-check   # TypeScript validation (run before commits)
npm run lint         # ESLint checking
npm run lint:fix     # Auto-fix lint issues
npm run format       # Format with Prettier
npm run format:check # Check formatting

# Database
npm run db:types     # Generate TypeScript types from Supabase
npm run db:migrate   # Apply migrations
npm run generate:types  # Alternative type generation (linked schema)

# Self-hosting utilities
npm run setup        # Validate setup
npm run sync:movies  # Sync TMDB movies
npm run backup       # Backup data
npm run health       # Check system health (curl localhost:3000/api/health)
```

## 🐛 Debugging Tips

### Common Issues
1. **Supabase auth errors** - Check RLS policies
2. **AI API limits** - Add proper error handling and retries
3. **Type errors** - Use TypeScript strict mode, fix incrementally
4. **Performance** - Use React DevTools Profiler for slow components

### Debugging Tools
- **React DevTools** - Component state and props
- **Network tab** - API calls and responses
- **Supabase Dashboard** - Database queries and auth
- **Console logs** - But clean them up afterwards

## 📦 Dependencies

### Core Stack (Keep)
- `next` (v15.3.3) - React framework with App Router
- `react` (v19.0.0) - React 19 with improved hooks and compiler
- `typescript` (v5.5.4) - Type safety
- `tailwindcss` (v4.0.0) + `daisyui` (v5.0.37) - Styling with latest Tailwind v4
- `@supabase/supabase-js` (v2.49.8) - Database and auth
- `@tanstack/react-query` (v5.80.7) - Data fetching and caching
- `husky` (v9.1.7) - Git hooks for pre-commit checks

### AI Libraries
- `@anthropic-ai/sdk` - Claude API (fallback)
- `openai` - OpenAI GPT-5-mini (primary)

### Key Utilities
- `zod` - Runtime type validation
- `framer-motion` - Animations
- `react-hook-form` - Form management
- `react-hot-toast` / `sonner` - Toast notifications
- `lucide-react` - Icon library

### When Adding New Dependencies
1. **Check if really needed** - can you solve it with existing tools?
2. **Consider bundle size** - will it slow down the app?
3. **Check maintenance** - is it actively maintained?
4. **Start small** - add one dependency at a time
5. **Security check** - run `npm audit` after adding

## 🏛️ Architecture Patterns

### API Response Pattern
All API routes use standardized response format:
```typescript
// Success: { success: true, data, cached?, metadata? }
// Error: { success: false, error: { code, message, details? } }
```
See `src/lib/utils/api-response.ts` for implementation.

### Memory-Aware Recommendations
The system tracks what users have seen to avoid repetition:
1. `UserMemoryService.getUserMemory(userId)` - Get unified context
2. `UserMemoryService.filterUnseenMovies(userId, candidates)` - Remove seen
3. `UserMemoryService.applyNoveltyPenalties(userId, movies)` - Penalize similar recent movies

### Dual Mode Architecture
- **Cloud Mode**: Full Supabase backend with RLS policies
- **Local Mode**: Browser localStorage with local utilities (`src/lib/utils/local-*.ts`)
- Components check `NEXT_PUBLIC_LOCAL_MODE` and adapt accordingly

### Server vs Client Components
- **Server Components** (default): Database queries, AI calls, initial data fetch
- **Client Components** (`'use client'`): Interactive UI, React hooks, browser APIs
- Use Server Components by default; only add `'use client'` when needed

## 🎯 Current Status

### ✅ What's Working Well
- **F-1 Hyper-Personalized Engine** - Advanced behavioral learning (v2.0)
- **Multi-Provider AI** - OpenAI primary, Claude fallback with auto-switching
- **Voice Chat** - Browser-native Web Speech API integration
- **Unified Memory System** - Tracks seen movies, preferences, behavioral signals
- **Self-Hosting Tools** - Setup scripts, backup, health checks, movie sync
- **API Health Monitoring** - Comprehensive health endpoint with diagnostics
- **Rate Limiting** - Built-in API protection
- **Model Validation** - Runtime validation with graceful fallbacks
- **Comprehensive Testing** - Memory integration, services, API routes
- **CI Pipeline** - Automated linting, type-checking, tests (warnings allowed)

### 🔄 Recent Major Changes (from git log)
- ✅ **Frictionless Local User Mode** - Beautiful welcome screen, no sign-up required
- ✅ **React Hook Dependency Warnings** - Batch-fixed across entire codebase
- ✅ **Image Tag Migrations** - Updated to Next.js Image component
- ✅ **Tailwind CSS v4** - Migrated to latest version with @tailwindcss/postcss
- ✅ **Fallback Recommendation Engine** - Fixed decorator, type export, null/undefined issues
- ✅ **Enhanced Synthesis Service** - Improved error handling, removed costController
- ✅ **Claude API Updates** - Updated to latest Anthropic SDK patterns
- ✅ **Unified Memory System** - Novelty tracking and seen movie management
- ✅ **Husky Git Hooks** - Pre-commit checks initialized

### 🔄 Areas for Simple Improvements
- Add basic error boundaries (when you hit errors)
- Replace `any` types when you see them (ongoing cleanup)
- Add tests for new complex features
- Clean up console.logs and TODOs
- Consider adding more E2E tests for critical flows

### 🚫 Don't Worry About
- Perfect test coverage (90%+ is great)
- Complex performance optimization (already well-optimized)
- Enterprise monitoring (we have basics covered)
- Formal documentation (we have practical docs)
- Advanced security audits (basics are solid)

## 🛠️ Key Utilities & Services

### API Response Handling
```typescript
// Located in: src/lib/utils/api-response.ts
import { APIResponse, APIErrorHandler } from '@/lib/utils/api-response'

// Success response
return APIResponse.success(data, { cached: true })

// Error handling
return APIErrorHandler.handle(error, { endpoint: '/api/...' })
```

### Rate Limiting
```typescript
// Located in: src/lib/utils/rate-limiter.ts
import { rateLimiter } from '@/lib/utils/rate-limiter'

const isAllowed = await rateLimiter.checkLimit(userId, 'ai-chat', 10) // 10 req/min
if (!isAllowed) {
  return APIResponse.error('RATE_LIMITED', 'Too many requests', 429)
}
```

### User Memory Service
```typescript
// Located in: src/lib/services/user-memory-service.ts
import { UserMemoryService } from '@/lib/services/user-memory-service'

// Get unified user context
const memory = await UserMemoryService.getUserMemory(userId)
// { seenMovieIds, genrePreferences, recentInteractions, qualityThreshold, ... }

// Filter unseen movies
const unseenMovies = await UserMemoryService.filterUnseenMovies(userId, candidates)

// Apply novelty penalties (reduce scores for recently seen similar movies)
const scoredMovies = await UserMemoryService.applyNoveltyPenalties(userId, movies)
```

### Single User Mode
```typescript
// Located in: src/lib/utils/single-user-mode.ts
import { getSingleUserId, isSingleUserMode } from '@/lib/utils/single-user-mode'

// For personal use - skip auth
if (isSingleUserMode()) {
  const userId = getSingleUserId() // Returns default user
}
```

### Model Validation
```typescript
// Located in: src/lib/utils/model-validation.ts
import { validateAIModel } from '@/lib/utils/model-validation'

const validatedModel = validateAIModel('gpt-5-mini', 'openai')
// Returns valid model or fallback with warning
```

### TMDB Cache
```typescript
// Located in: src/lib/services/tmdb-cache.ts
import { TMDBCache } from '@/lib/services/tmdb-cache'

// Cache TMDB API calls (reduces API usage)
const movie = await TMDBCache.getMovie(movieId) // Auto-cached for 24h
```

## 🏠 Self-Hosting Features

### Setup Scripts
The project includes automated setup scripts for both cloud and local deployment:

```bash
# Cloud setup (recommended - no Docker required)
./scripts/setup-cloud.sh    # macOS/Linux
./scripts/setup-cloud.bat   # Windows

# Local setup (complete privacy with Docker)
./scripts/setup-local.sh    # macOS/Linux
./scripts/setup-local.bat   # Windows

# Validation
npm run setup  # Validates environment and setup
```

### Utility Scripts
```bash
# Sync movies from TMDB
npm run sync:movies
# - Fetches trending and popular movies
# - Respects TMDB rate limits (40 req/10s)
# - Prevents duplicates with upsert logic

# Backup user data
npm run backup
# - Exports all user data (ratings, watchlist, preferences)
# - Creates timestamped backup files
# - Use for migrations or local backups

# Health check
npm run health
# - Checks API connectivity
# - Validates database connection
# - Verifies AI service keys
# - Measures response time
```

### Documentation
New comprehensive docs added in `docs/`:
- `LOCAL_SETUP.md` - Complete local setup guide
- `CLOUD_SETUP.md` - Cloud deployment guide
- `TROUBLESHOOTING.md` - Common issues and fixes
- `SELF_HOSTING.md` - Self-hosting best practices
- `API_DOCUMENTATION.md` - Complete API reference
- `ARCHITECTURE.md` - System architecture overview

---

## 💡 Final Thoughts

**This is a personal project** - focus on:
- Building cool features (hyper-personalization, voice chat, etc.)
- Learning new things (Next.js 15, React 19, AI integration)
- Solving real problems (great movie recommendations!)
- Having fun with AI and modern web tech
- Self-hosting and complete data ownership

**Don't get caught up in**:
- Perfect architecture (simple is better)
- 100% test coverage (90%+ is excellent)
- Enterprise best practices (we're practical, not corporate)
- Over-engineering solutions (YAGNI principle)
- Premature optimization (make it work, then optimize)

**When in doubt**: Keep it simple, make it work, ship it! 🚀

---

## 📚 Additional Resources

- **README.md** - Main project overview and quick start
- **docs/API_DOCUMENTATION.md** - Complete API reference with examples
- **docs/ARCHITECTURE.md** - System architecture and design decisions
- **docs/LOCAL_SETUP.md** - Step-by-step local setup guide
- **docs/CLOUD_SETUP.md** - Cloud deployment guide (Vercel + Supabase)
- **docs/TROUBLESHOOTING.md** - Common issues and solutions
- **docs/SELF_HOSTING.md** - Self-hosting best practices

---

## 🔍 Quick Reference

### Most Common Commands
```bash
npm run dev              # Start dev server
npm run test:watch       # Test while developing
npm run type-check       # Check types before commit
npm run lint:fix         # Fix linting issues
```

### Most Common Patterns
```typescript
// API Routes: src/app/api/**/route.ts
import { APIResponse } from '@/lib/utils/api-response'

// Memory-aware recommendations
import { UserMemoryService } from '@/lib/services/user-memory-service'

// Model selection
import { getBestModelForTask } from '@/lib/ai/models'

// Rate limiting
import { rateLimiter } from '@/lib/utils/rate-limiter'
```

### Key Files to Know
- `src/lib/ai/hyper-personalized-engine.ts` - F-1 recommendation engine
- `src/lib/services/user-memory-service.ts` - Memory management
- `src/components/chat/ChatInterface.tsx` - Voice + text chat
- `src/app/api/recommendations/hyper-personalized/route.ts` - Main API
- `src/lib/utils/api-response.ts` - Standardized responses

---

*Last updated: December 2025 - Keep this guide updated when you learn something useful or change major patterns.*
