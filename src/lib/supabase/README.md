# 🎬 CineAI Supabase Configuration

Complete Supabase client configuration with authentication, database helpers, and Row Level Security for the CineAI movie recommendation app.

## 📋 Table of Contents

- [Features](#features)
- [Setup](#setup)
- [Database Schema](#database-schema)
- [Client Usage](#client-usage)
- [Authentication](#authentication)
- [Database Operations](#database-operations)
- [Row Level Security](#row-level-security)
- [Examples](#examples)

## ✨ Features

### ✅ **Complete Type Safety**
- Full TypeScript support with generated database types
- Strongly typed CRUD operations
- Type-safe query builders

### ✅ **Authentication System**
- Email + OTP authentication (no passwords)
- Session management
- Auth state listeners
- User profile creation triggers

### ✅ **Database Helpers**
- **User Profiles**: Preference management, onboarding tracking
- **Movies**: OMDb integration, search, upserts
- **Swipes**: Like/dislike/watchlist actions with history
- **Watchlist**: Personal movie tracking with ratings and notes
- **Recommendations**: AI-generated recommendation queue management

### ✅ **Row Level Security**
- User data isolation
- Secure multi-user access
- Policy helpers and setup functions

### ✅ **Performance Optimized**
- Proper database indexing
- Query optimization
- Caching-friendly structure

## 🚀 Setup

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### 2. Environment Variables

Create `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional: for development
NEXT_PUBLIC_SUPABASE_DEBUG=true
```

### 3. Database Setup

Run the SQL schema from `config.ts` in your Supabase SQL editor to create:
- Tables with proper relationships
- Row Level Security policies
- Indexes for performance
- Triggers for automatic user profile creation

## 🗄️ Database Schema

### Core Tables

```sql
-- User profiles with preferences
user_profiles (id, email, preferences, onboarding_completed, created_at, updated_at)

-- Movie metadata from OMDb
movies (id, omdb_id, title, year, genre[], plot, poster_url, imdb_rating, runtime, director, actors[], language, country, awards, box_office, created_at, updated_at)

-- User swipe actions
swipes (id, user_id, movie_id, action, swiped_at)

-- Personal watchlist
watchlist (id, user_id, movie_id, watched, rating, notes, added_at, watched_at)

-- AI recommendation queue
recommendation_queue (id, user_id, movie_id, batch_id, position, confidence_score, ai_reason, created_at, consumed_at)
```

### Key Features
- **UUID primary keys** for security
- **JSONB preferences** for flexible user data
- **Array types** for genres and actors
- **Enum types** for swipe actions
- **Proper foreign key relationships**
- **Automatic timestamps** with triggers

## 💻 Client Usage

### Import the Client

```typescript
import { auth, db, utils, rls } from '@/lib/supabase/client'
import type { UserProfile, Movie, WatchlistItem } from '@/lib/supabase/types'
```

### Singleton Pattern

```typescript
// Client component
import { supabase } from '@/lib/supabase/client'

// Server component
import { createServerClient } from '@/lib/supabase/client'
const supabase = createServerClient()

// Server action
import { createActionClient } from '@/lib/supabase/client'
const supabase = createActionClient()
```

## 🔐 Authentication

### Sign In with OTP

```typescript
// Send OTP
await auth.signInWithOtp('user@example.com')

// Verify OTP
await auth.verifyOtp('user@example.com', '123456')

// Check auth status
const isAuthenticated = await utils.isAuthenticated()
const userId = await utils.getCurrentUserId()
```

### Auth State Listener

```typescript
const unsubscribe = auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // Redirect to dashboard
  } else if (event === 'SIGNED_OUT') {
    // Redirect to login
  }
})

// Cleanup
unsubscribe()
```

## 📊 Database Operations

### User Profiles

```typescript
// Get current user profile
const profile = await db.userProfiles.getCurrent()

// Update preferences (completes onboarding)
const updated = await db.userProfiles.updatePreferences({
  favorite_movies: ['Interstellar', 'The Matrix'],
  preferred_genres: ['sci-fi', 'thriller'],
  themes: ['time travel', 'technology'],
  avoid_genres: ['horror'],
  preferred_eras: ['2000s', '2010s'],
  mood_preferences: {
    default: 'thought-provoking',
    weekend: 'light-hearted'
  }
})
```

### Movies

```typescript
// Add movie from OMDb data
const movie = await db.movies.upsert({
  omdb_id: 'tt0816692',
  title: 'Interstellar',
  year: 2014,
  genre: ['Adventure', 'Drama', 'Sci-Fi'],
  plot: 'A team of explorers travel through a wormhole...',
  poster_url: 'https://...',
  imdb_rating: 8.6,
  runtime: 169,
  director: 'Christopher Nolan',
  actors: ['Matthew McConaughey', 'Anne Hathaway'],
  language: 'English',
  country: 'USA'
})

// Search movies
const results = await db.movies.searchByTitle('interstellar')
```

### Swipes

```typescript
// Record swipe action
const swipe = await db.swipes.create({
  movie_id: 'movie-uuid',
  action: 'like' // 'like' | 'dislike' | 'watchlist'
})

// Check if already swiped
const existingSwipe = await db.swipes.checkSwipe('movie-uuid')

// Get swipe history
const history = await db.swipes.getHistory(50)
```

### Watchlist

```typescript
// Get watchlist
const watchlist = await db.watchlist.get()

// Add to watchlist
const item = await db.watchlist.add('movie-uuid')

// Mark as watched with rating
const watched = await db.watchlist.markWatched(
  'movie-uuid',
  5, // rating 1-5
  'Amazing cinematography!'
)

// Remove from watchlist
await db.watchlist.remove('movie-uuid')
```

### Recommendations

```typescript
// Get recommendation queue
const queue = await db.recommendations.getQueue(20)

// Add AI-generated batch
const recommendations = await db.recommendations.addBatch([
  {
    movie_id: 'movie-1-uuid',
    batch_id: 'batch-uuid',
    position: 1,
    confidence_score: 0.95,
    ai_reason: 'Based on your love for sci-fi and high ratings'
  }
  // ... more recommendations
])

// Mark as consumed (swiped on)
await db.recommendations.markConsumed('recommendation-uuid')

// Clear old consumed recommendations
await db.recommendations.clearConsumed()
```

## 🔒 Row Level Security

### Automatic Setup

```typescript
// Enable RLS on all user tables
await rls.enableAllTables()

// Get RLS policies SQL for manual setup
const policiesSQL = await rls.createPolicies()
console.log(policiesSQL)
```

### Security Features

- **User Isolation**: Users can only access their own data
- **Movie Sharing**: Movies are readable by all authenticated users
- **Automatic Policies**: Policies are applied automatically
- **Secure by Default**: All user tables protected by RLS

## 🎯 Error Handling

```typescript
try {
  const profile = await db.userProfiles.getCurrent()
} catch (error) {
  const message = utils.handleError(error)
  console.error('Friendly error:', message)
  
  // Specific error codes:
  // PGRST116: No data found
  // 23505: Duplicate record
  // 23503: Foreign key violation
}
```

## 📁 File Structure

```
src/lib/supabase/
├── client.ts      # Main client with all helpers
├── types.ts       # TypeScript database types
├── config.ts      # Configuration and SQL schema
├── examples.ts    # Usage examples and workflows
└── README.md      # This documentation
```

## 🔥 Next Steps

1. **Create Supabase Project**: Set up your Supabase project
2. **Run Database Schema**: Execute the SQL from `config.ts`
3. **Configure Environment**: Add your Supabase keys to `.env.local`
4. **Start Building**: Use the `db` helpers in your components
5. **Add AI Integration**: Connect the recommendation system to Groq/Gemma

## 💡 Pro Tips

- **Use TypeScript**: All functions are fully typed for great DX
- **Leverage RLS**: Database security is handled automatically
- **Batch Operations**: Use `addBatch` for bulk recommendations
- **Error Handling**: Always use `utils.handleError()` for user-friendly messages
- **Performance**: Queries are optimized with proper indexes
- **Caching**: Structure is TanStack Query friendly

---

**Ready to build an amazing movie recommendation app!** 🎬✨ 