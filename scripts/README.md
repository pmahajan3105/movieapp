# CineAI Scripts

Utility scripts for managing the CineAI application.

## Migration Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `run-migrations.js` | Runs all migrations in order | **Primary choice** - use for fresh setup |
| `apply-migrations.js` | Direct SQL execution via REST API | Fallback if CLI doesn't work |
| `run-migration.js` | Runs single combined migration | When using COMBINED_MIGRATION.sql |

### Usage

```bash
# Primary - run all migrations
node scripts/run-migrations.js

# Alternative - direct SQL execution
node scripts/apply-migrations.js
```

**Note**: All migration scripts require:
- `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
- `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

## Data Management Scripts

| Script | Purpose | Command |
|--------|---------|---------|
| `sync-new-movies.js` | Sync movies from TMDB | `npm run sync:movies` |
| `backup-data.js` | Backup user data | `npm run backup` |
| `add-popular-movies.js` | Add popular movies to database | Manual run |
| `add-more-movies.js` | Add additional movies | Manual run |

## Utility Scripts

| Script | Purpose | Command |
|--------|---------|---------|
| `validate-setup.js` | Validate environment setup | `npm run setup` |
| `check-db-status.js` | Check database connection | Manual run |
| `check-backend-status.js` | Check backend services | Manual run |
| `database-manager.js` | Database management utilities | Manual run |
| `test-local-mode.js` | Test local mode functionality | Manual run |

## Shell Scripts

| Script | Purpose |
|--------|---------|
| `setup-cloud.sh` | Interactive cloud setup |
| `setup-local.sh` | Interactive local setup |
| `migrate-cloud.sh` | Run migrations on cloud |
| `run-migration.sh` | Shell wrapper for migration |
| `run-optimized-migration.sh` | Optimized migration runner |

## Quick Reference

```bash
# Setup & validation
npm run setup              # Validate environment

# Database
npm run db:migrate         # Apply migrations via Supabase CLI
npm run db:types           # Generate TypeScript types

# Data
npm run sync:movies        # Sync movies from TMDB
npm run backup             # Backup user data

# Health
npm run health             # Check API health
```
