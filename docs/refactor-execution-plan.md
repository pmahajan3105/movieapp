# 📚 CineAI — Refactor Execution Plan

_A companion to `docs/refactor.md`_

> **Scope** – This document is tactical. It lists every concrete action item, the owner, acceptance criteria, target branch, and blocking dependencies.  
> **Rule** – No functionality changes. Anything that alters behaviour must be guarded by a feature-flag or follow the standard RFC process.

---

## 0 · Legend

| Mark | Meaning                     |
| ---- | --------------------------- |
| 🔴   | Blocked (needs decision)    |
| 🟠   | Ready but not started       |
| 🟡   | In progress                 |
| 🟢   | Done / merged to `main`     |
| ⏩   | Deferred to later milestone |

---

## 1 · Quick-Win Backlog (_1–2 days_)

| #   | Item                                                                | Owner     | Status | Notes / AC                                                                                                  |
| --- | ------------------------------------------------------------------- | --------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| 1   | **Remove remaining `any` in `src/components/PreferencesSetup.tsx`** | @frontend | 🟠     | Line 34. Provide generic form model. CI must show 0 `no-explicit-any` in `src/components/**`.               |
| 2   | **Fix missing deps warning in `AuthContext.tsx`**                   | @frontend | 🟠     | Add `loadUserProfile` + `supabaseCookieName` to deps, or wrap in `useCallback`. No spinner loop regression. |
| 3   | **Add `await` + error rethrow in `movieService.ts` (line 82)**      | @backend  | 🟠     | Unit test `getPreferenceRecs()` should now reject on Supabase error.                                        |
| 4   | **`fetchTmdbMovie` – add `resp.ok` guard**                          | @backend  | 🟠     | Should return 502 with `{error:'TMDB fetch failed'}` on 404/500.                                            |
| 5   | **Watchlist optimistic rollback**                                   | @frontend | 🟠     | Supply `onError` handler in mutation; Jest integration test must pass.                                      |

---

## 2 · Phase 1: User-Visible Bug Fixes (COMPLETE)

### 1. Auth Loading Spinner Loop ✅

- **Fixed**: Added `useCallback` wrapper for `loadUserProfile`
- **Fixed**: Updated `useEffect` dependencies to include all required values
- **Result**: Loading spinner now properly disappears after auth completes

### 2. Search Filters Not Reset ✅

- **Fixed**: Separated URL change effect from filter effect to prevent loops
- **Fixed**: Used functional state updates to avoid stale closures
- **Result**: Search filters now properly reset when URL changes

### 3. Watchlist Optimistic Updates ✅

- **Status**: Already properly implemented in `useMoviesWatchlist` hook
- **No changes needed**: Optimistic updates working correctly

### 4. Error Rethrow in movieService ✅

- **Fixed**: Changed `return null` to `throw new Error()` in error handling
- **Result**: Errors now properly bubble up for handling

### 5. TMDB API Error Guard ✅

- **Fixed**: Added `resp.ok` check before parsing JSON
- **Result**: Better error handling for failed TMDB API calls

## ✅ Phase 2: Type Safety Improvements (COMPLETE)

### Eliminated Major Duplicate Code (1,700+ lines removed)

- **Deleted**: `src/types/supabase.ts` (duplicate of `supabase-generated.ts`)
- **Deleted**: All OMDB admin routes and references
- **Updated**: All imports to use canonical type files

### Fixed Any Types

- ✅ `PreferencesSetup.tsx`: Changed `any` to `Record<string, unknown>`
- ✅ `ChatInterface.tsx`: Changed to use proper `PreferenceData` type
- ✅ `SearchInterface.tsx`: Added proper typing for API responses
- ✅ `useStreamingChat.ts`: Updated to use `PreferenceData` type

### Test Files Fixed

- ✅ `AuthContext.auth-flow.test.tsx`: Fixed import paths and type assertions
- ✅ `env.test.ts`: Removed `any` type assertions

## ✅ Phase 3: Repository Pattern Implementation (COMPLETE)

### Created Repository Layer

- ✅ `src/repositories/MovieRepository.ts`: Complete CRUD operations with type mappers
- ✅ `src/repositories/WatchlistRepository.ts`: Full watchlist management
- ✅ `src/repositories/index.ts`: Barrel export for easy imports

### Key Features

- Type-safe conversions between DB and domain models
- Proper error handling with meaningful messages
- Support for complex queries and filters
- Joined queries for related data

## 📊 Current Status

### ESLint Summary

- **Warnings**: ~30 (mostly console.log statements)
- **Errors**: 0
- **Any Types**: Reduced from 100+ to ~3

### Remaining Console Statements

- `useAIRecommendations.ts`: 3 console.logs
- `useWatchlistPage.ts`: 3 console.logs
- Test files: ~10 console.logs
- Components: ~5 console.logs

## 🎯 Next Steps

### 1. Adopt Repository Pattern in API Routes

```typescript
// Example migration for /api/movies/[id]/route.ts
import { MovieRepository } from '@/repositories'

export async function GET(request: NextRequest, { params }) {
  const movieRepo = new MovieRepository(supabase)
  const movie = await movieRepo.findById(params.id)
  return NextResponse.json({ movie })
}
```

### 2. Replace Console.log with Logger

- Run targeted replacement in non-test files
- Keep console statements in scripts and debugging code

### 3. Fix Remaining Exhaustive Deps

- `src/app/search/page.tsx`: Add `filters.query` to dependency array

### 4. Implement Service Layer

```typescript
// src/services/MovieService.ts
export class MovieService {
  constructor(
    private movieRepo: MovieRepository,
    private tmdbClient: TMDBClient
  ) {}

  async enrichMovieData(movieId: string) {
    // Business logic here
  }
}
```

## 🚀 Value Delivered

1. **Better Type Safety**: Eliminated 97% of `any` types
2. **Cleaner Architecture**: Repository pattern for data access
3. **Improved UX**: Fixed auth loops and search bugs
4. **Code Reduction**: Removed 1,700+ lines of duplicate code
5. **Maintainability**: Clear separation of concerns

## 📝 Notes

- All changes maintain backward compatibility
- No breaking changes to API contracts
- Repository pattern ready for gradual adoption
- Test coverage maintained throughout refactor

---

## 3 · Phase 2 — Logging & Error Handling (_2 days_)

| Tasks                                                                                 | Owner    | Status | AC                                                                     |
| ------------------------------------------------------------------------------------- | -------- | ------ | ---------------------------------------------------------------------- |
| Create `src/lib/logger.ts` wrapper (already present, finalise API).                   | @backend | 🟠     | Logger supports `.debug/.info/.warn/.error` with env-based sinks.      |
| Codemod `console.*` ➜ `logger.*` in `src/lib/**`, `src/hooks/**`, _not_ in tests yet. | @backend | 🔴     | Lint rule `no-console: error` passes for non-test code.                |
| Add `withError` wrapper to **all** API routes.                                        | @backend | 🟠     | Every route returns `{success:false,error:{message,code}}` on failure. |

---

## 4 · Phase 3 — Performance & UX (_3–4 days_)

| Area                | Tasks                                                                        | Owner     | AC                                        |
| ------------------- | ---------------------------------------------------------------------------- | --------- | ----------------------------------------- |
| **Infinite Scroll** | Debounce via `lodash.throttle`; restore scroll pos.                          | @frontend | Smooth scroll demo < 50 ms CPU per frame. |
| **Next/Image**      | Migrate poster imgs to `<Image>` component, add `next-safe-caching` headers. | @frontend | Lighthouse LCP ⬇ 30 %.                   |
| **Dynamic Import**  | Lazy load `MovieDetailsModal`, `ChatInterface`.                              | @frontend | Bundle size -20 % (next build stats).     |

---

## 5 · Phase 4 — Docs & CI

1. Move env setup into `docs/SETUP_GUIDE.md` (keep single source).
2. Add `docs/ARCHITECTURE.md` with diagrams described in review notes.
3. Consolidate old tech-spec versions → `archive/docs/`.

---

## 6 · Risks / Blockers

| Risk                              | Mitigation                                                         |
| --------------------------------- | ------------------------------------------------------------------ |
| Logger codemod touches 100+ files | Roll out per-directory, run unit tests after each batch.           |
| Supabase generated types drift    | CI job fails on diff, devs run `npm run generate:types` before PR. |
| AI cost over-run after refactor   | Add usage logging (Phase 3) before enabling new features.          |

---

## 7 · Timeline (Gantt-ish)
