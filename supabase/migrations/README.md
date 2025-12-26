# CineAI Database Migrations

## Overview

This directory contains the consolidated database schema for CineAI.

## Migration Files

| File | Description |
|------|-------------|
| `001_core_schema.sql` | Core tables: user_profiles, movies, ratings, watchlist |
| `002_ai_features.sql` | AI tables: chat_sessions, user_behavior_signals, user_interactions |
| `003_indexes_and_rls.sql` | Performance indexes and Row Level Security policies |

## Schema Summary

### Core Tables

```
user_profiles       - User accounts and preferences
movies              - Movie database (TMDB source)
ratings             - User 1-5 star ratings
watchlist           - User watchlist and watch history
```

### AI Tables

```
chat_sessions           - AI chat conversation history
user_behavior_signals   - Real-time learning signals (F-1 Engine)
user_interactions       - Detailed interaction tracking with temporal data
```

## Running Migrations

### Fresh Install

```bash
# Using Supabase CLI
supabase db reset

# Or manually in order
psql -f migrations/001_core_schema.sql
psql -f migrations/002_ai_features.sql
psql -f migrations/003_indexes_and_rls.sql
```

### Existing Database

If you have an existing database, the migrations use `IF NOT EXISTS` and `DROP ... IF EXISTS` patterns to be idempotent.

## Archive

Old migration files (36 files from iterative development) are preserved in `archive/` for reference. These should not be run on new installations.

## Key Features

- **UUID primary keys** for all tables
- **Row Level Security** on all tables
- **Automatic timestamps** via triggers
- **Auto profile creation** on user signup
- **Optimized indexes** for common query patterns
- **GIN indexes** for array/JSON searches

## Maintenance Functions

```sql
-- Clean up old behavior signals (90 days)
SELECT cleanup_old_behavior_signals();

-- Clean up old interactions (180 days)
SELECT cleanup_old_interactions();

-- Get user preferences for AI context
SELECT get_user_preferences_summary('user-uuid-here');
```
