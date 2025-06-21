# CineAI Refactor Plan

## Comprehensive Architecture & Code Quality Improvement Plan

_Compiled from analysis by O3, Gemini, and Claude_

After every implementation can you summarize what you did
Ask me anything you feel need clarification
And review and think before implementing
Tell me if any action needs to be taken.

---

## Executive Summary

This plan combines insights from three different AI analyses to create a systematic approach to improving the CineAI codebase. The plan is organized into phases, with each phase containing specific tasks and measurable outcomes.

**Timeline**: 2-3 weeks total
**Priority**: Address architectural issues first, then optimize performance and add advanced features

---

Remove Groq and set AI to use claude sonnet 3.7 from the latest docs

## Phase 1: Foundation & Stability (Days 1-5)

_Stop the bleeding, fix core architectural issues_

### 1.1 Type Safety Foundation

**Priority: CRITICAL** | **Effort: 4 hours** | **Source: All three analyses**

#### Tasks:

- [ ] **Generate Supabase Types**
  ```bash
  supabase gen types typescript --local > src/types/supabase.ts
  ```
- [ ] **Create Typed Client Helper**
  - Create `src/lib/typed-supabase.ts`
  - Export typed client with proper return types
  - Replace all `any` types in API responses
- [ ] **Update All API Routes**
  - Replace manual type definitions with generated types
  - Update `src/lib/supabase/types.ts` to extend generated types
  - Fix type mismatches in API responses
- [ ] **Re-enable strict type-checking on test suite**
  - Current workaround excludes `src/__tests__/**` from `tsconfig.json` to unblock CI.
  - Remove the exclusion after fixing generics in `smart-recommender-v2.test.ts`, cookie helpers, and matcher typings.
  - Goal: zero TS errors **with** tests included.

#### Success Criteria:

- [ ] Zero `any` types in API responses
- [ ] All Supabase queries use generated types
- [ ] TypeScript errors reduced by 80%

---

### 1.2 Split ChatInterface.tsx (Architectural Fix)

**Priority: HIGH** | **Effort: 6 hours** | **Source: Claude analysis**

#### Current Problem:

`ChatInterface.tsx` is 768 lines doing 3 different jobs, making it untestable and unreliable.

#### Tasks:

- [ ] **Create Component Architecture**

  ```
  src/components/chat/
  ├── ChatInterface.tsx (orchestrator, ~100 lines)
  ├── StreamingChatView.tsx (UI only, ~100 lines)
  ├── ChatSession.tsx (data persistence, ~75 lines)
  ├── PreferenceExtractor.tsx (business logic, ~50 lines)
  └── hooks/
      ├── useStreamingChat.ts
      ├── useChatSession.ts
      └── usePreferenceExtraction.ts
  ```

- [ ] **Extract State Management**

  - Move streaming logic to `useStreamingChat.ts`
  - Move session persistence to `useChatSession.ts`
  - Move preference extraction to `usePreferenceExtraction.ts`

- [ ] **Add Error Boundaries**
  - Create `ChatErrorBoundary.tsx`
  - Wrap each major chat component
  - Add graceful fallbacks for errors

#### Success Criteria:

- [ ] `ChatInterface.tsx` under 150 lines
- [ ] Each component has single responsibility
- [ ] All chat components have error boundaries
- [ ] Chat functionality works identically to before

---

### 1.3 API Route Consolidation

**Priority: HIGH** | **Effort: 6 hours** | **Source: O3 analysis**

#### Current Problem:

40+ API routes with duplicated error handling, auth checks, and Supabase initialization.

#### Tasks:

- [ ] **Create API Factory Pattern**

  ```typescript
  // src/lib/api/factory.ts
  export function withAuth<T>(handler: AuthenticatedHandler<T>)
  export function withError<T>(handler: ErrorSafeHandler<T>)
  export function withSupabase<T>(handler: SupabaseHandler<T>)

  // Compose: withAuth(withError(withSupabase(myHandler)))
  ```

- [ ] **Refactor 5 Routes First** (proof of concept)

  - `api/watchlist/route.ts`
  - `api/watchlist/[id]/route.ts`
  - `api/user/profile/route.ts`
  - `api/user/preferences/route.ts`
  - `api/movies/route.ts`

- [ ] **Create Standard Response Format**
  ```typescript
  interface ApiResponse<T> {
    success: boolean
    data?: T
    error?: { message: string; code: string }
    meta?: { timestamp: string; requestId: string }
  }
  ```

#### Success Criteria:

- [ ] 5 routes converted to use factory pattern
- [ ] Reduced code duplication by 70% in converted routes
- [ ] Consistent error handling across all routes
- [ ] All routes return standardized response format

---

### 1.4 Environment Configuration

**Priority: MEDIUM** | **Effort: 2 hours** | **Source: Claude analysis**

#### Tasks:

- [ ] **Create Environment Config**

  ```typescript
  // src/lib/env-config.ts
  export const config = {
    isDev: process.env.NODE_ENV === 'development',
    isProd: process.env.NODE_ENV === 'production',
    supabase: {
      /* typed supabase config */
    },
    ai: {
      /* AI service configs */
    },
    logging: { level: isDev ? 'debug' : 'error' },
  }
  ```

- [ ] **Replace Raw process.env Usage**
  - Audit all `process.env.X` usage
  - Replace with typed config getters
  - Add validation for required environment variables

#### Success Criteria:

- [ ] No raw `process.env` usage in components
- [ ] All environment variables validated at startup
- [ ] Different configurations for dev/prod

---

### 1.5 Add CI Pipeline

**Priority: HIGH** | **Effort: 1 hour** | **Source: O3 & Gemini analysis**

#### Tasks:

- [ ] **Create GitHub Action**

  ```yaml
  # .github/workflows/ci.yml
  name: CI
  on: [push, pull_request]
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
        - run: npm ci --frozen-lockfile
        - run: npm run lint
        - run: npm run type-check
        - run: npm test
  ```

- [ ] **Fix Test Suite**
  - Ensure all tests pass locally
  - Fix any failing tests
  - Add test for new API factory pattern

#### Success Criteria:

- [ ] CI pipeline runs on every PR
- [ ] All tests pass in CI
- [ ] Linting and type-checking enforced

---

## Phase 2: Performance & User Experience (Days 6-10)

_Make the app fast and responsive_

### 2.1 Optimize Data Fetching

**Priority: HIGH** | **Effort: 4 hours** | **Source: All analyses**

#### Tasks:

- [ ] **Unify Data Fetching Pattern**

  - **Server Components**: Direct Supabase queries only
  - **Client Components**: React Query + API routes only
  - **Never mix both** in the same component

- [ ] **Fix Movies Page Infinite Scroll**

  - Increase limit from 16 to 18 (already done, verify)
  - Add debouncing to scroll handler
  - Implement proper `staleTime` in React Query
  - Add scroll position restoration

- [ ] **Add Loading States**
  - Replace skeleton screens with proper loading indicators
  - Add optimistic updates for watchlist actions
  - Implement progressive loading for movie grids

#### Success Criteria:

- [ ] No double data fetching (server + client)
- [ ] Infinite scroll loads smoothly
- [ ] Loading states improve perceived performance

---

### 2.2 Implement Optimistic UI Updates

**Priority: MEDIUM** | **Effort: 4 hours** | **Source: Gemini analysis**

#### Tasks:

- [ ] **Watchlist Optimistic Updates**

  ```typescript
  const addToWatchlistMutation = useMutation({
    mutationFn: addToWatchlist,
    onMutate: async movieId => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['watchlist'])

      // Snapshot previous value
      const previousWatchlist = queryClient.getQueryData(['watchlist'])

      // Optimistically update
      queryClient.setQueryData(['watchlist'], old => [...old, movieId])

      return { previousWatchlist }
    },
    onError: (err, movieId, context) => {
      // Rollback on error
      queryClient.setQueryData(['watchlist'], context.previousWatchlist)
      toast.error('Failed to add to watchlist')
    },
  })
  ```

- [ ] **Movie Rating Optimistic Updates**
  - Immediately update star ratings
  - Show loading state on movie cards
  - Rollback on error with user feedback

#### Success Criteria:

- [ ] Watchlist actions feel instant
- [ ] Rating changes appear immediately
- [ ] Errors gracefully rollback with user feedback

---

### 2.3 Performance Optimizations

**Priority: MEDIUM** | **Effort: 3 hours** | **Source: O3 analysis**

#### Tasks:

- [ ] **Implement Next.js Image Optimization**

  ```typescript
  // Replace img tags with Next.js Image
  <Image
    src={movie.poster_url || '/placeholder-movie.jpg'}
    alt={movie.title}
    width={300}
    height={450}
    placeholder="blur"
    blurDataURL="data:image/jpeg;base64,..."
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  />
  ```

- [ ] **Add Dynamic Imports for Heavy Components**

  ```typescript
  const ChatInterface = dynamic(() => import('@/components/chat/ChatInterface'), {
    ssr: false,
    loading: () => <ChatSkeleton />
  })
  ```

- [ ] **Optimize Middleware**
  ```typescript
  // middleware.ts - Add route matcher
  export const config = {
    matcher: ['/dashboard/:path*', '/api/auth/:path*'],
  }
  ```

#### Success Criteria:

- [ ] Images load 50% faster
- [ ] Bundle size reduced by 20%
- [ ] Middleware only runs on necessary routes

---

### 2.4 Enhanced Error Handling

**Priority: MEDIUM** | **Effort: 3 hours** | **Source: O3 & Claude analysis**

#### Tasks:

- [ ] **Create Centralized Logger**

  ```typescript
  // src/lib/logger.ts
  export const logger = {
    dev: (msg: string, data?: any) => isDev && console.log(msg, data),
    error: (msg: string, error?: Error) => {
      if (isProd) {
        // Send to Vercel Analytics or Logflare
      } else {
        console.error(msg, error)
      }
    },
  }
  ```

- [ ] **Replace All console.log**

  - Audit codebase for raw console.log usage
  - Replace with appropriate logger methods
  - Add structured logging for AI operations

- [ ] **Improve API Error Responses**
  - Return Supabase error details in development
  - Generic messages in production
  - Add error codes for client handling

#### Success Criteria:

- [ ] No raw console.log in production
- [ ] Structured error logging in place
- [ ] Better error messages for users

---

## Phase 3: Advanced Features & Scalability (Days 11-15)

_Prepare for growth and add sophisticated features_

### 3.1 AI Cost & Performance Monitoring

**Priority: MEDIUM** | **Effort: 4 hours** | **Source: Gemini analysis**

#### Tasks:

- [ ] **Create AI Usage Tracking**

  ```sql
  CREATE TABLE ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    model_name TEXT NOT NULL,
    feature_area TEXT NOT NULL, -- 'chat', 'recommendations', etc.
    input_tokens INTEGER,
    output_tokens INTEGER,
    latency_ms INTEGER,
    cost_usd DECIMAL(10,6),
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

- [ ] **Create AI Service Wrapper**

  ```typescript
  // src/lib/ai/monitored-client.ts
  export async function callAI(params: AICallParams) {
    const startTime = Date.now()
    try {
      const result = await makeAICall(params)
      await logAIUsage({
        model: params.model,
        tokens: result.tokens,
        latency: Date.now() - startTime,
        cost: calculateCost(result.tokens),
      })
      return result
    } catch (error) {
      await logAIError(error)
      throw error
    }
  }
  ```

- [ ] **Create Usage Dashboard**
  - Add AI usage stats to admin panel
  - Show cost per user, per feature
  - Add usage alerts for high costs

#### Success Criteria:

- [ ] All AI calls are logged and costed
- [ ] Dashboard shows AI usage metrics
- [ ] Alerts for unusual AI usage patterns

---

### 3.2 Database Optimizations

**Priority: MEDIUM** | **Effort: 3 hours** | **Source: Gemini analysis**

#### Tasks:

- [ ] **Review and Lock Down RLS Policies**

  ```sql
  -- Audit all tables for missing RLS
  SELECT schemaname, tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public' AND rowsecurity = false;

  -- Lock down public tables
  ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
  ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
  ```

- [ ] **Add Database Indexes**

  ```sql
  -- Common query patterns
  CREATE INDEX idx_movies_tmdb_id ON movies(tmdb_id);
  CREATE INDEX idx_ratings_user_movie ON ratings(user_id, movie_id);
  CREATE INDEX idx_watchlist_user_created ON watchlist_items(user_id, created_at);
  ```

- [ ] **Optimize Common Queries**
  - Analyze slow queries in dashboard
  - Add pagination to expensive operations
  - Implement query result caching where appropriate

#### Success Criteria:

- [ ] All tables have proper RLS policies
- [ ] Common queries run under 100ms
- [ ] Database indexes optimize frequent operations

---

### 3.3 Background Job System (Optional)

**Priority: LOW** | **Effort: 6 hours** | **Source: Gemini analysis**

#### Tasks:

- [ ] **Evaluate Job Queue Options**

  - Research Inngest, Bull/Redis, or Supabase Edge Functions
  - Choose based on complexity and cost
  - Start with simple implementation

- [ ] **Move Heavy AI Operations to Background**

  ```typescript
  // Instead of:
  const preferences = await extractPreferences(chatHistory) // 30s operation

  // Do:
  await enqueueJob('extract-preferences', { userId, chatSessionId })
  return { status: 'processing', jobId: '...' }
  ```

- [ ] **Add Job Status Tracking**
  - Create jobs table in Supabase
  - Add real-time updates for job progress
  - Show progress indicators in UI

#### Success Criteria:

- [ ] Heavy operations don't timeout API routes
- [ ] Users get real-time updates on job progress
- [ ] System is more resilient to failures

---

## Phase 4: Testing & Documentation (Days 16-21)

_Ensure quality and maintainability_

### 4.1 Enhanced Testing

**Priority: HIGH** | **Effort: 6 hours** | **Source: All analyses**

#### Tasks:

- [ ] **Add Component Tests for Refactored Code**

  - Test new chat components in isolation
  - Test API factory pattern
  - Test optimistic updates

- [ ] **Add End-to-End Smoke Tests**

  ```typescript
  // e2e/smoke.spec.ts
  test('user can log in and see movies', async ({ page }) => {
    await page.goto('/auth/login')
    await login(page, 'test@example.com')
    await page.waitForURL('/dashboard')
    await expect(page.locator('[data-testid="movie-grid"]')).toBeVisible()
  })
  ```

- [ ] **Add Integration Tests**
  - Test auth flow end-to-end
  - Test preference extraction workflow
  - Test watchlist operations

#### Success Criteria:

- [ ] 80% test coverage on critical paths
- [ ] E2E tests catch major regressions
- [ ] Tests run in under 2 minutes

---

### 4.2 Documentation Updates

**Priority: MEDIUM** | **Effort: 3 hours** | **Source: O3 analysis**

#### Tasks:

- [ ] **Update README.md**

  - Update to Next.js 14 App Router
  - Document new architecture patterns
  - Add troubleshooting section

- [ ] **Create Architecture Documentation**

  ```markdown
  # docs/ARCHITECTURE.md

  ## Data Flow Patterns

  ## Component Architecture

  ## API Design Principles

  ## Type Safety Guidelines
  ```

- [ ] **Consolidate Fix Documentation**
  - Roll existing fix summaries into CHANGELOG.md
  - Reference commit SHAs for traceability
  - Document current system state

#### Success Criteria:

- [ ] New developers can set up project in 10 minutes
- [ ] Architecture decisions are documented
- [ ] Change history is clear and searchable

---

## Implementation Strategy

### Week 1: Foundation (Phase 1)

**Goal**: Fix core architectural issues that cause instability

**Daily Plan**:

- **Day 1**: Generate Supabase types, update API responses
- **Day 2**: Split ChatInterface.tsx into focused components
- **Day 3**: Create API factory pattern, refactor 5 routes
- **Day 4**: Add CI pipeline, environment configuration
- **Day 5**: Testing and stabilization

### Week 2: Performance (Phase 2)

**Goal**: Make the app fast and responsive

**Daily Plan**:

- **Day 6-7**: Unify data fetching, fix infinite scroll
- **Day 8**: Implement optimistic UI updates
- **Day 9**: Performance optimizations (images, dynamic imports)
- **Day 10**: Enhanced error handling and logging

Make sure all type errors are fixed and test coverage is there

---

## Risk Mitigation

### High-Risk Changes

1. **ChatInterface.tsx Split**: Risk of breaking chat functionality
   - **Mitigation**: Implement behind feature flag, test thoroughly
2. **API Route Refactor**: Risk of breaking existing integrations
   - **Mitigation**: Refactor incrementally, maintain backward compatibility
3. **Data Fetching Changes**: Risk of performance regressions
   - **Mitigation**: A/B test changes, monitor performance metrics

### Rollback Plans

- Each phase should be deployable independently
- Keep feature flags for major changes
- Maintain comprehensive test suite to catch regressions
- Document rollback procedures for each major change

---

Remember to create
