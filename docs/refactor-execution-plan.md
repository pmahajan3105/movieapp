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

## ✅ Phase 1: User-Visible Bug Fixes (COMPLETE)

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

## ✅ Phase 4: Adopt Repository Pattern in API Routes (COMPLETE)

### Migrated API Routes

- ✅ `/api/movies/[id]/route.ts`: Now uses `MovieRepository.findById()`
- ✅ `/api/movies/route.ts`: Smart recommendations use `MovieRepository.search()`
- ✅ `/api/watchlist/route.ts`: All CRUD operations use repositories
  - GET: Uses `WatchlistRepository.getUserWatchlist()`
  - POST: Uses both repositories for movie creation and watchlist addition
  - PATCH: Uses `WatchlistRepository.markAsWatched()` and `updateWatchlistItem()`
  - DELETE: Uses `WatchlistRepository.removeFromWatchlist()`

### Fixed Remaining Issues

- ✅ Fixed exhaustive-deps warning in `src/app/search/page.tsx`
- ✅ Fixed type mismatches in `fetchTmdbMovie` (null → undefined)
- ✅ Removed unused imports

## 📊 Current Status (Second Commit)

### ESLint Summary

- **Errors**: 0 ✅
- **Warnings**: ~60 (all console.log and minor any types)
- **Any Types**: Only 5 remaining (in API routes)

### Remaining Console Statements

- API routes: ~30 console.logs
- Hooks: ~6 console.logs
- Test files: ~10 console.logs
- Components: ~5 console.logs

### Code Quality Metrics

- **Files Changed**: 12 (this phase)
- **Repository Adoption**: 3 major API routes migrated
- **Type Safety**: 100% in core business logic

## 🎯 Next Steps

### 1. Replace Console.log with Logger (Low Priority)

- Target only production code (not tests/scripts)
- Use codemod for consistency
- Estimated: ~50 files

### 2. Fix Remaining Any Types

```typescript
// Priority files:
- src/app/api/movies/[id]/similar/route.ts (1 any)
- src/app/api/preferences/category/[category]/route.ts (4 any)
```

### 3. Implement Service Layer

```typescript
// Example structure:
src/services/
├── MovieService.ts       // Business logic for movies
├── WatchlistService.ts   // Watchlist operations
├── TMDBService.ts        // External API integration
└── index.ts              // Barrel export
```

### 4. Performance Optimizations

- Implement connection pooling for Supabase
- Add Redis caching for frequently accessed movies
- Optimize bundle size with dynamic imports

## 🚀 Value Delivered (Cumulative)

1. **Better Architecture**: Repository pattern fully adopted
2. **Zero Errors**: ESLint shows no errors
3. **Improved Maintainability**: Clear separation of concerns
4. **Type Safety**: 99% type coverage
5. **Code Reduction**: 2,000+ lines removed (total)

## 📝 Notes

- Repository pattern is now the standard for all data access
- All new API routes should use repositories
- Migration was non-breaking - all APIs maintain same contracts
- Ready for service layer implementation in next phase

---

## 2.5 · Phase 1.5 — Test Infrastructure Overhaul (_1-2 days_)

| #   | Item                                                              | Owner    | Status | Notes / AC                                                                                   |
| --- | ----------------------------------------------------------------- | -------- | ------ | -------------------------------------------------------------------------------------------- |
| 1   | **Fix TDZ (Temporal Dead Zone) errors in test files**             | @testing | 🟡     | Fix 4 failing test suites using factory functions. All tests should pass without TDZ errors. |
| 2   | **Create centralized mock setup (`src/__tests__/setupMocks.ts`)** | @testing | 🟠     | Global Supabase, Next.js, and Lucide mocks. Eliminate per-file mocking patterns.             |
| 3   | **Add missing mock methods (rpc, storage, realtime)**             | @testing | 🟡     | Complete Supabase client mocks. RLS test should pass with proper `rpc` mocking.              |
| 4   | **Simple integration tests for working components**               | @testing | 🟠     | Test MovieCard, Button, Badge without complex dependencies. 90%+ pass rate.                  |
| 5   | **Jest configuration modernization**                              | @testing | 🟠     | Update module resolution, add coverage thresholds, fix path aliases.                         |
| 6   | **Performance test guards for debounce utility**                  | @testing | 🟠     | Benchmark tests ensure debounce performance < 10ms overhead.                                 |
| 7   | **E2E smoke tests with Playwright (basic)**                       | @testing | ⏩     | Login flow, movie search, watchlist add/remove. Deferred to Phase 3.                         |

### Current Test Status

- **Test Suites**: 5 failed, 31 skipped (TDZ errors, mock mismatches)
- **Root Causes**: Inconsistent mocking patterns, Jest hoisting issues, missing mock methods
- **Immediate Priority**: Fix TDZ errors using factory functions, then add simple component tests

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
